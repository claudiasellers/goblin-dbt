"""Do the Opposite's clinical content, read from the schema files it lives in (schema/opposite-action-data.cypher,
schema/opposite-action-flow.cypher), without a database: those files stay the one editable source of the knowledge
(each DBT parent's acknowledgment, fit statements, default steps and body cues; each urge's graduated opposites and
cues; which words the skill works on and where the others go; the route table). opposite_action.py turns it into the
skill's options and transitions, and each option keeps a PRESENTS edge back to the node it shows (build.py).

What is read:
  parents   EmotionRegulationContent: label, acknowledgment (the validation line), fitsTheFactsWhen, fitsFactsGuidance,
            bodyOpposite, defaultOppositeSmall / Medium / Bigger, somaticCues
  urges     (EmotionRegulationContent)-[:HAS_ACTION_URGE]->(ActionUrge) by `order`: small, medium, bigger,
            somaticCues, somaticReplace (behaviour urges have no HAS_ACTION_URGE and are not read)
  words     every Emotion with oppositeActionApplicable set: applicable, its parent (HAS_REGULATION_CONTENT), the
            alternative skill
  flow      OppositeActionFlow's contentJson: routes, choices, copy (the copy is not reused: the skill has its own)
"""
import importlib.util
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
# By path, not on sys.path: scripts/recommendations has its own build.py, which would shadow scripts/skills/build.py.
_spec = importlib.util.spec_from_file_location("schema_graph", os.path.join(ROOT, "scripts/recommendations/schema_graph.py"))
_sg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sg)

FILES = None  # the whole load order: later files override earlier properties (the flow file rewrites whyItWorks)
_CACHE = {}


def content():
    if "c" in _CACHE:
        return _CACHE["c"]
    g = _sg.load(FILES)
    oa = [u for u in g.unsupported if u[0].startswith("opposite-action")]
    assert not oa, f"the replay skipped Do the Opposite statements: {[(u[0], u[1], u[2]) for u in oa]}"
    parents = {}
    for n in g.find("EmotionRegulationContent"):
        p = n.props
        parents[p["dbtParent"]] = {
            "label": p.get("label") or p["dbtParent"],
            "acknowledgment": p.get("acknowledgment") or "",
            "fitsWhen": list(p.get("fitsTheFactsWhen") or []),
            "fitsGuidance": p.get("fitsFactsGuidance") or "",
            "bodyOpposite": p.get("bodyOpposite") or "",
            "defaults": {s: p.get(f"defaultOpposite{s.capitalize()}") or "" for s in ("small", "medium", "bigger")},
            "cues": list(p.get("somaticCues") or []),
            "urges": [],
        }
    for r in g.rels("HAS_ACTION_URGE", "EmotionRegulationContent", "ActionUrge"):
        u = r.end.props
        parents[r.start.props["dbtParent"]]["urges"].append({
            "id": u["id"], "label": u["label"], "order": u.get("order", 99),
            "small": u.get("small") or "", "medium": u.get("medium") or "", "bigger": u.get("bigger") or "",
            "cues": list(u.get("somaticCues") or []), "replace": bool(u.get("somaticReplace")),
        })
    for p in parents.values():
        p["urges"].sort(key=lambda u: (u["order"], u["id"]))
    parent_of = {r.start.props["id"]: r.end.props["dbtParent"]
                 for r in g.rels("HAS_REGULATION_CONTENT", "Emotion", "EmotionRegulationContent")}
    words = {}
    for n in g.find("Emotion"):
        e = n.props
        if "oppositeActionApplicable" not in e:
            continue
        words[e["id"]] = {"applicable": e["oppositeActionApplicable"] is True, "parent": parent_of.get(e["id"]),
                          "alt": e.get("oaAlternativeSkill")}
    flow = next(n.props for n in g.find("OppositeActionFlow"))
    _CACHE["c"] = {"parents": parents, "words": words, "flow": json.loads(flow["contentJson"])}
    return _CACHE["c"]


if __name__ == "__main__":
    c = content()
    for pid, p in sorted(c["parents"].items()):
        print(pid, len(p["urges"]), len(p["fitsWhen"]), len(p["cues"]), [u["id"] for u in p["urges"]])
    print(len(c["words"]), "words;", sum(w["applicable"] for w in c["words"].values()), "applicable")
    print(sorted({w["alt"] for w in c["words"].values() if w["alt"]}))
    print(c["flow"]["routes"])
