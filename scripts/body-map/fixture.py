"""Write tests/fixtures/body-map-content.json: everything getBodyMapContent can serve, built from
content.py without a database, drafts included (each item carries its `status`). Used by tests and,
from build step 2, the dev harness (dev/body-map.html). The callable itself serves only "live".

  python3 scripts/body-map/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import VERSION, SIGNED_OFF, REGIONS, PAD_WORDS, MAPS  # noqa: E402
root = os.path.dirname(os.path.dirname(here))

words = {w[0]: w for w in PAD_WORDS}
live = lambda key: "live" if key in SIGNED_OFF else "draft"  # noqa: E731

payload = {
    "version": VERSION,
    "regions": REGIONS,
    "padWords": [{"id": wid, "label": label, "zones": zones, "regions": regions or [], "energy": energy,
                  "status": live("word:" + wid)}
                 for wid, label, zones, regions, energy in PAD_WORDS],
    "maps": [{"id": mid, "label": label, "wordIds": grid_words, "status": live("map:" + mid),
              "places": sorted([{"region": r, "sensationId": w, "label": words[w][1], "energy": words[w][4], "weight": wt}
                                for r, w, wt in places], key=lambda p: (-p["weight"], p["region"]))}
             for mid, (label, places, grid_words) in MAPS.items()],
}
out = os.path.join(root, 'tests/fixtures/body-map-content.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
