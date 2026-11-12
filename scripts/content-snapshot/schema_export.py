"""The schema files, replayed in memory, written as a content-only graph export.

build.mjs reads `node scripts/graph-export.mjs --content-only` exports of the live graph. This writes the
same shape from schema/*.cypher (scripts/recommendations/schema_graph.py, LOAD_ORDER), so a snapshot
can be built, or checked, without Aura:

  python3 scripts/content-snapshot/schema_export.py > /tmp/schema-replay.json
  node scripts/content-snapshot/build.mjs --from /tmp/schema-replay.json --only opposite-action-picker.json

The replay skips statements it can't read (schema_graph lists them), so only build a snapshot this way
when its builder reads nothing a skipped statement writes. tests/content-snapshot.test.mjs uses it as the
drift guard for opposite-action-picker.json; the shipped file itself is rebuilt from Aura by every graph
load (refresh.mjs).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'recommendations'))
import schema_graph  # noqa: E402


def export(g):
    ids = {id(n): f'n{i}' for i, n in enumerate(g.nodes)}
    return {
        'scope': 'content-only',
        'exportedAt': '1970-01-01T00:00:00.000Z',
        'nodes': [{'elementId': ids[id(n)], 'labels': sorted(n.labels), 'props': n.props} for n in g.nodes],
        'relationships': [
            {'elementId': f'r{r.seq}', 'type': r.type, 'start': ids[id(r.start)], 'end': ids[id(r.end)], 'props': r.props}
            for r in g.relationships
        ],
    }


if __name__ == '__main__':
    json.dump(export(schema_graph.load()), sys.stdout)
