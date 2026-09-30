"""Write tests/fixtures/capacity-content.json: the payload getCapacityContent returns, built from
content.py without a database. Used by unit tests and the dev harness (dev/capacity.html).

  python3 scripts/capacity/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import (VERSION, FRESH_MINUTES, BAND_INTENSITY, PROBE_DEFAULT, PROBE_RELATIONAL, CANT_TELL,  # noqa: E402
                     HANDOFF, PRIMITIVES, BAND_RULES)
root = os.path.dirname(os.path.dirname(here))

payload = {
    "version": VERSION,
    "freshMinutes": FRESH_MINUTES,
    "bandIntensity": BAND_INTENSITY,
    "probe": {"wordings": {"default": PROBE_DEFAULT, "relational": PROBE_RELATIONAL}, "cantTell": CANT_TELL},
    "handoff": HANDOFF,
    "primitives": [{"id": pid, "component": comp, "direction": d, "bands": bands, "blank": blank, "rank": rank,
                    "conceptId": concept, "copy": copy}
                   for pid, comp, d, bands, blank, rank, concept, copy in sorted(PRIMITIVES, key=lambda p: p[5])],
    "bandRules": [dict({"skillId": s, "band": b, "mode": m}, **({"headsUp": h} if h else {}))
                  for s, _, b, m, h in sorted(BAND_RULES, key=lambda r: (r[0], r[2]))],
}
out = os.path.join(root, 'tests/fixtures/capacity-content.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
