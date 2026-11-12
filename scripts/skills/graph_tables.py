"""The two shared tables every skill reads, computed from the schema files without a database, exactly as
getSkillContent reads them from the graph (functions/src/skills/index.ts):

  parentOf  Emotion id → its DBT parent, `(:Emotion)-[:HAS_REGULATION_CONTENT]->(:EmotionRegulationContent)`
  fitsWhen  DBT parent → {label, lines}: EmotionRegulationContent.label and .fitsTheFactsWhen, unchanged
  feelingOf       feeling guide → its card (ER-10; functions/src/skills/feelingOf.ts does the same for the callable)
  feelingGuideOf  Emotion id → its guide: through its parent (GUIDES) or IN_GUIDE (happiness words)

schema_graph.py replays most files; the per-emotion HAS_REGULATION_CONTENT rows in
opposite-action-data.cypher use `WITH … WHERE`, which it skips, so they are read here, statement by
statement, with each statement's own WHERE.
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "scripts/recommendations"))
from schema_graph import load, split_statements  # noqa: E402

ROW = re.compile(r'\{id:\s*"([a-z_]+)",\s*applicable:\s*(true|false),\s*parent:\s*(?:"([a-z_]+)"|null)')


def tables():
    g = load()
    emotions = {n.props.get("id") for n in g.find("Emotion")}
    erc = {n.props["dbtParent"]: n.props for n in g.find("EmotionRegulationContent")}
    parent_of = {}
    for r in g.rels("HAS_REGULATION_CONTENT", "Emotion", "EmotionRegulationContent"):
        parent_of[r.start.props["id"]] = r.end.props["dbtParent"]
    src = open(os.path.join(ROOT, "schema/opposite-action-data.cypher"), encoding="utf8").read()
    for stmt in split_statements(src):
        if "HAS_REGULATION_CONTENT" not in stmt or "UNWIND" not in stmt:
            continue
        needs_applicable = "m.applicable = true" in stmt
        for eid, applicable, parent in ROW.findall(stmt):
            if not parent or eid not in emotions or parent not in erc:
                continue
            if needs_applicable and applicable != "true":
                continue
            assert parent_of.get(eid, parent) == parent, (eid, parent_of.get(eid), parent, "one parent per word")
            parent_of[eid] = parent
    fits_when = {p: {"label": n.get("label"), "lines": list(n.get("fitsTheFactsWhen") or [])}
                 for p, n in sorted(erc.items()) if n.get("fitsTheFactsWhen")}
    return dict(sorted(parent_of.items())), fits_when


# functions/src/skills/feelingOf.ts FEELING_CARD_URGES / FEELING_CARD_PLACES (tests pin the shipped table to this).
FEELING_CARD_URGES = 3
FEELING_CARD_PLACES = 3
SHARED_BONUS = 0.1  # functions/src/bodyMap/places.ts


def _places(rows):
    """placesFromFelt (functions/src/bodyMap/places.ts): per (region, sensation) the highest weight, plus a bonus per
    further emotion sharing it, strongest first."""
    agg = {}
    for r in rows:
        key = (r["region"], r["sensationId"])
        cur = agg.get(key)
        if cur:
            cur["weight"] = max(cur["weight"], r["weight"])
            cur["emotions"].add(r["emotionId"])
        else:
            agg[key] = {**r, "emotions": {r["emotionId"]}}
    out = [{**p, "weight": round(min(1, p["weight"] + SHARED_BONUS * max(0, len(p["emotions"]) - 1)) * 1000) / 1000} for p in agg.values()]
    return sorted(out, key=lambda p: (-p["weight"], p["region"], p["sensationId"]))


def feeling_tables(g=None, parent_of=None):
    """feelingOf and feelingGuideOf, as getSkillContent reads them (signed-off FELT_AS only; emotion urges only)."""
    g = g or load()
    if parent_of is None:
        parent_of = tables()[0]
    guides = {n.props["id"]: n.props for n in g.find("FeelingGuide")}
    erc_of = {r.start.props["id"]: r.end for r in g.rels("GUIDES", "FeelingGuide", "EmotionRegulationContent")}
    urges_of = {}
    for r in g.rels("HAS_ACTION_URGE", "EmotionRegulationContent", "ActionUrge"):
        urges_of.setdefault(r.start.props["dbtParent"], []).append(r.end.props)
    map_of = {r.start.props["id"]: r.end for r in g.rels("FELT_LIKE", "FeelingGuide", "BodyMap")}
    groups = {}
    for r in g.rels("GROUPS", "BodyMap", "Emotion"):
        groups.setdefault(r.start.props["id"], set()).add(r.end.props["id"])
    felt = [r for r in g.rels("FELT_AS", "Emotion", "SensationType")
            if r.props.get("status") == "live" and r.end.props.get("padStatus") == "live"]
    region_name = {n.props["id"]: n.props.get("name") for n in g.find("BodyRegion")}
    out = {}
    for gid in sorted(guides):
        p = guides[gid]
        doc = json.loads(p.get("contentJson") or "{}")
        held = set(p.get("urgesHeld") or [])
        erc = erc_of.get(gid)
        seen, urges = set(), []
        for u in sorted(urges_of.get(erc.props["dbtParent"], []) if erc else [], key=lambda u: (u.get("order") or 0, u["id"])):
            if u.get("kind") == "behaviour" or u["id"] in held or u["id"] in seen:
                continue
            seen.add(u["id"])
            urges.append(u["label"])
        m = map_of.get(gid)
        rows = []
        if m is not None and m.props.get("status") == "live":
            em = groups.get(m.props["id"], set())
            rows = [{"emotionId": r.start.props["id"], "region": r.props.get("region"), "sensationId": r.end.props["id"],
                     "label": r.end.props.get("padLabel"), "energy": r.end.props.get("energy"), "weight": r.props.get("weight")}
                    for r in felt if r.start.props["id"] in em]
            rows = [r for r in rows if r["region"] and r["label"] and r["energy"] and isinstance(r["weight"], (int, float))]
        body = [{"region": region_name.get(x["region"]) or x["region"], "label": x["label"]} for x in _places(rows)[:FEELING_CARD_PLACES]]
        out[gid] = {"label": p["label"], "functionLine": doc.get("function", ""), "prompts": doc.get("prompts", []),
                    "urges": urges[:FEELING_CARD_URGES], "body": body, "ladder": list(p.get("ladder") or [])}
    guide_of = {}
    for eid, parent in parent_of.items():
        gid = next((k for k, erc in erc_of.items() if erc.props["dbtParent"] == parent), None)
        if gid:
            guide_of[eid] = gid
    for r in g.rels("IN_GUIDE", "Emotion", "FeelingGuide"):
        guide_of[r.start.props["id"]] = r.end.props["id"]
    return out, dict(sorted(guide_of.items()))


if __name__ == "__main__":
    p, f = tables()
    print(json.dumps({"parentOf": p, "fitsWhen": sorted(f)}, indent=1))
