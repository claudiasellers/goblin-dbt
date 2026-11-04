"""The two shared tables every skill reads, computed from the schema files without a database, exactly as
getSkillContent reads them from the graph (functions/src/skills/index.ts):

  parentOf  Emotion id → its DBT parent, `(:Emotion)-[:HAS_REGULATION_CONTENT]->(:EmotionRegulationContent)`
  fitsWhen  DBT parent → {label, lines}: EmotionRegulationContent.label and .fitsTheFactsWhen, unchanged

schema_graph.py replays most files; the per-emotion HAS_REGULATION_CONTENT rows in
opposite-action-data.cypher use `WITH … WHERE`, which it skips, so they are read here, statement by
statement, with each statement's own WHERE.
"""
import os, re, sys
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


if __name__ == "__main__":
    import json
    p, f = tables()
    print(json.dumps({"parentOf": p, "fitsWhen": sorted(f)}, indent=1))
