"""Write tests/fixtures/micro-steps-content.json: the payload src/data/content/micro-steps.json carries, built from
content.py without a database (scripts/content-snapshot/build.mjs makes the same from the graph; a test checks the
shipped file equals this).

  python3 scripts/micro-steps/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import build  # noqa: E402,F401  (runs the content checks)
from content import VERSION, SETS  # noqa: E402
root = os.path.dirname(os.path.dirname(here))

payload = {"version": VERSION, "sets": {sid: [
    {"id": i, "text": text, "subtext": sub, "modality": modality, "requiresEnvironment": env}
    for i, text, sub, modality, env in SETS[sid]] for sid in sorted(SETS)}}
out = os.path.join(root, "tests/fixtures/micro-steps-content.json")
with open(out, "w") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
