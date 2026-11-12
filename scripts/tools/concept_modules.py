"""Every TherapyConcept that names an app tool (appToolId), with its modality and DBT module, replayed from
schema/*.cypher without a database (scripts/recommendations/schema_graph.py), and each Skill's concept.
Prints JSON for tests/tool-modules.test.mjs, which checks them against src/data/tools.ts.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts/recommendations"))
from schema_graph import load  # noqa: E402

g = load()
concepts = [
    {k: n.props.get(k) for k in ("id", "appToolId", "modality", "module")}
    for n in g.nodes if "TherapyConcept" in n.labels and n.props.get("appToolId")
]
skills = [
    {"id": r.end.props["id"], "toolId": r.end.props.get("toolId"), "concept": r.start.props["id"]}
    for r in g.relationships if r.type == "HAS_SKILL"
]
print(json.dumps({"concepts": sorted(concepts, key=lambda c: c["id"]), "skills": sorted(skills, key=lambda s: s["id"])}, indent=1))
