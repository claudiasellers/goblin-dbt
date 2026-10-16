"""Write tests/fixtures/parts-content.json: what a future getPartsContent would return, built from
content.py without a database, drafts included (each item carries its `reviewStatus`). Used by the tests
and the dev harness (dev/parts.html). The review tables (EXPRESSES / HELD and friends) stay out: they are
for review and trail counting, not for a client.

  python3 scripts/parts/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import (VERSION, review_status, MOVES, HURTS, OFTEN_GUARDS, PROMPTS, OPTIONS, PAIRS, KEEPSAKE,  # noqa: E402
                     TRAIL_RULES, CONTEXTS, POLICY, PENDING)
from build import all_options  # noqa: E402  (importing build runs its checks: no fixture from content that fails the build)
root = os.path.dirname(os.path.dirname(here))


def status(item_id):
    out = {"reviewStatus": review_status(item_id)}
    if item_id in PENDING:
        out["pending"] = PENDING[item_id]
    return out


moves = [dict({k: m[k] for k in ("id", "label", "unblendPhrase", "trailPhrase", "nameHint", "kind", "safetyLine")},
              order=i, **status(m["id"]))
         for i, m in enumerate(MOVES) if m["offerable"]]

prompts, at = {}, {}
for pid, flow, step, copy in PROMPTS:
    prompts[pid] = dict(flow=flow, step=step, order=at.get(flow, 0), copy=copy, **status(pid))
    at[flow] = at.get(flow, 0) + 1

# flow → step → options in order; `moves: []` means offered for any move.
options = {}
for o in all_options():
    step = options.setdefault(o["flow"], {}).setdefault(o["step"], [])
    step.append(dict(id=o["id"], label=o["label"], kind=o["kind"], flag=o["flag"], selfLike=o["selfLike"], branch=o["branch"],
                     order=len(step), moves=list(o["moves"] or []),
                     sameAs=[{"label": label, "id": target} for label, target in o["sameAs"]], **status(o["id"])))

hurts = [dict({k: h[k] for k in ("id", "label", "hurtPhrase", "feltPhrase", "namedAs")}, order=i,
              guardedBy=[{"moveId": m, "rank": hs.index(h["id"])} for m, hs in OFTEN_GUARDS.items() if h["id"] in hs],
              **status(h["id"]))
         for i, h in enumerate(HURTS)]

chip = lambda pair: [{"id": cid, "label": label} for cid, label in pair]  # noqa: E731
pairs = [dict(id=p["id"], a=p["a"], b=p["b"], bothWant=chip(p["bothWant"]), worryA=chip(p["worryA"]), worryB=chip(p["worryB"]),
              **status(p["id"]))
         for p in PAIRS]

payload = {
    "version": VERSION,
    "moves": moves,
    "prompts": prompts,
    "options": options,
    "hurts": hurts,
    "pairs": pairs,
    "keepsake": [dict(id=kid, copy=copy, **status(kid)) for kid, copy in KEEPSAKE],
    "trailRules": [dict(r, **status(r["id"])) for r in TRAIL_RULES],
    "contexts": [dict(id=cid, key=key, value=value, phrase=phrase, **status(cid)) for cid, key, value, phrase in CONTEXTS],
    "policy": dict(POLICY, **status(POLICY["id"])),
    "pending": PENDING,
}
out = os.path.join(root, "tests/fixtures/parts-content.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(out)
