"""Print a --content-only-shaped export of the schema files, replayed without a database (schema_graph.py),
so tests can run scripts/content-snapshot/build.mjs's buildSkills over exactly what the load writes.

  python3 scripts/skills/replay_export.py > /tmp/export.json
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "recommendations"))
from schema_graph import load  # noqa: E402

g = load()
ids = {id(n): f"n{i}" for i, n in enumerate(g.nodes)}
print(json.dumps({
    "scope": "content-only",
    "exportedAt": "1970-01-01T00:00:00Z",
    "nodes": [{"elementId": ids[id(n)], "labels": sorted(n.labels), "props": n.props} for n in g.nodes],
    "relationships": [{"elementId": f"r{i}", "type": r.type, "start": ids[id(r.start)], "end": ids[id(r.end)], "props": r.props}
                      for i, r in enumerate(g.relationships)],
}, ensure_ascii=False))
