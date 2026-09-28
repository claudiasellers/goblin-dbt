"""Write tests/fixtures/find-the-feeling-content.json: the payload getFindTheFeelingContent returns,
built from content.py without a database. Used by unit tests and the dev harness.

  python3 scripts/find-the-feeling/fixture.py
"""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import FAMILIES, URGES, APP_TOOL_IDS, ADDRESSES, FLOW  # noqa: E402
root = os.path.dirname(os.path.dirname(here))

# appToolId for every concept: this file's own plus schema/app-tool-ids.cypher.
app = dict(APP_TOOL_IDS)
for c, t in re.findall(r'\{c: "([a-z_]+)", t: "([a-z-]+)"\}', open(os.path.join(root, 'schema/app-tool-ids.cypher')).read()):
    app[c] = t
# Which concepts ADDRESS which emotions (only the two migrations this tool depends on).
addresses = {'dbt_find_the_feeling': ADDRESSES}
ir = open(os.path.join(root, 'schema/invalidation-recovery.cypher')).read()
m = re.search(r'UNWIND (\[[^\]]*\]) AS eid\nMATCH \(t:TherapyConcept \{id: \'dbt_recovering_from_invalidation\'\}\)', ir)
if m:
    addresses['dbt_recovering_from_invalidation'] = json.loads(m.group(1))

SHAPE = ["sharp", "heat", "weight", "buzz", "clench"]
families = []
for fi, (fid, label, words) in enumerate(FAMILIES):
    families.append({"id": fid, "label": label, "order": fi, "words": [
        {"emotionId": eid, "name": eid.replace("_", " ").capitalize(), "shape": [float(shape.get(d, 0)) for d in SHAPE],
         "sound": [float(x) for x in sound], "offer": wi,
         "addressedBy": sorted(app[c] for c, es in addresses.items() if eid in es and c in app)}
        for wi, (eid, shape, sound) in enumerate(words)]})
urges = [{"id": uid, "label": label, "sub": sub, "order": i,
          "routes": [app[c] for c, _ in sorted(routes, key=lambda r: r[1]) if c in app]}
         for i, (uid, label, sub, routes) in enumerate(URGES)]
payload = {"version": FLOW["version"], "flow": FLOW, "families": families, "urges": urges,
           "floodedBlankRoutes": FLOW["gates"]["floodedBlankRoutes"]}
out = os.path.join(root, 'tests/fixtures/find-the-feeling-content.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
print(out)
