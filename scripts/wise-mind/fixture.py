"""Write tests/fixtures/wise-mind-content.json: the payload getWiseMindContent returns, built from
content.py without a database (the shipped src/data/content/wise-mind.json must equal it).

  python3 scripts/wise-mind/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import QUESTIONS, VOICES, PRACTICES, ANSWERS, FLOW, VERSION, OWN_MAX  # noqa: E402
from build import voice_id  # noqa: E402
root = os.path.dirname(os.path.dirname(here))

payload = {
    "version": VERSION,
    "ownMax": OWN_MAX,
    "copy": FLOW["copy"],
    "questions": [{
        "id": qid, "label": label, "order": i, "defaultPracticeId": practice,
        "voices": {mind: [{"id": voice_id(qid, mind, k), "label": v} for k, v in enumerate(VOICES[qid][mind])]
                   for mind in ("emotion", "reason")},
    } for i, (qid, label, practice) in enumerate(QUESTIONS)],
    "practices": [{"id": pid, "name": name, "sub": sub, "kind": kind, "lines": lines, "breaths": breaths,
                   "seconds": seconds, "order": i}
                  for i, (pid, name, sub, kind, lines, breaths, seconds) in enumerate(PRACTICES)],
    "answers": [{"id": aid, "label": label, "order": i, "nextToolIds": nxt, "kind": kind}
                for i, (aid, label, nxt, kind) in enumerate(ANSWERS)],
}
out = os.path.join(root, "tests/fixtures/wise-mind-content.json")
with open(out, "w") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
