"""Write tests/fixtures/cope-ahead-content.json: the payload getCopeAheadContent returns, built from
content.py without a database (the shipped src/data/content/cope-ahead.json must equal it).

  python3 scripts/cope-ahead/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import HARD_MOMENTS, SITUATIONS, MOVES, BEATS, FLOW, VERSION, OWN_MAX, MOVE_OWN_MAX  # noqa: E402
from build import danger_of  # noqa: E402
root = os.path.dirname(os.path.dirname(here))

payload = {
    "version": VERSION,
    "ownMax": OWN_MAX,
    "moveOwnMax": MOVE_OWN_MAX,
    "when": FLOW["when"],
    "copy": FLOW["copy"],
    "pullIf": FLOW["pullIf"],
    "after": FLOW["after"],
    "situations": [{"id": sid, "label": label, "afterName": after_name, "likelyFeelings": feels, "hardMoments": moments,
                    "dangerMomentIds": danger_of(moments), "order": i}
                   for i, (sid, label, after_name, feels, moments) in enumerate(SITUATIONS)],
    "hardMoments": [{"id": mid, "label": label, "ifText": if_text, "order": i}
                    for i, (mid, label, if_text) in enumerate(HARD_MOMENTS)],
    "moves": [{"id": mid, "kind": kind, "label": label, "line": line, "forPulls": pulls, "general": general,
               "appToolId": tool, "forMoments": for_moments, "order": i}
              for i, (mid, kind, label, line, pulls, general, tool, for_moments) in enumerate(MOVES)],
    "beats": [{"id": bid, "text": text, "order": i + 1} for i, (bid, text) in enumerate(BEATS)],
}
out = os.path.join(root, "tests/fixtures/cope-ahead-content.json")
with open(out, "w") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
