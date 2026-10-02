"""Write tests/fixtures/body-map-content.json: everything getBodyMapContent can serve, built from
content.py without a database, drafts included (each item carries its `status`). Used by tests and
the local harness. The callable itself serves only "live".

  python3 scripts/body-map/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import VERSION, SIGNED_OFF, REGIONS, PAD_WORDS, FELT, MAPS  # noqa: E402
from places import felt_status, places_for  # noqa: E402
root = os.path.dirname(os.path.dirname(here))

words = {w[0]: w for w in PAD_WORDS}
live = lambda key: "live" if key in SIGNED_OFF else "draft"  # noqa: E731


def map_places(mid):
    live_keys = {(r, s) for r, s, _, _ in places_for(mid)}
    return [{"region": r, "sensationId": s, "label": words[s][1], "energy": words[s][4], "weight": w, "emotionIds": who,
             "status": "live" if (r, s) in live_keys else "draft"}
            for r, s, w, who in places_for(mid, ("live", "draft"))]


payload = {
    "version": VERSION,
    "regions": REGIONS,
    "padWords": [{"id": wid, "label": label, "zones": zones, "regions": regions or [], "energy": energy,
                  "status": live("word:" + wid)}
                 for wid, label, zones, regions, energy in PAD_WORDS],
    "felt": [{"emotionId": e, "region": r, "sensationId": s, "weight": w, "origin": o, "status": felt_status(e, r, s, o)}
             for e, rows in FELT.items() for r, s, w, o in rows],
    "maps": [{"id": mid, "label": label, "groups": groups, "wordIds": grid_words, "status": live("map:" + mid),
              "places": map_places(mid)}
             for mid, (label, groups, grid_words) in MAPS.items()],
}
out = os.path.join(root, 'tests/fixtures/body-map-content.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
