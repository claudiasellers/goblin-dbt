"""Write tests/fixtures/parts-content.json: what a future getPartsContent would return, built from
content.py without a database, drafts included (each item carries its `reviewStatus`). Used by the tests
and the dev harness (dev/parts.html). The review tables (HELD and friends) stay out: they are for review
and trail counting, not for a client. EXPRESSES is in (source id → move, reviewed by the source id): the
in-the-moment unblend line reads it once an edge is signed off and its move ships.

  python3 scripts/parts/fixture.py
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import (VERSION, review_status, MOVES, EXPRESSES, HURTS, OFTEN_GUARDS, CAN_TOUCH, PROMPTS, PROMPT_KINDS, OPTIONS,  # noqa: E402
                     PAIRS, KEEPSAKE, TRAIL_RULES, CONTEXTS, POLICY, PENDING)
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
    prompts[pid] = dict(flow=flow, step=step, order=at.get(flow, 0), copy=copy,
                        **({"copyKind": PROMPT_KINDS[pid]} if pid in PROMPT_KINDS else {}), **status(pid))
    at[flow] = at.get(flow, 0) + 1

# flow → step → options in order; `moves: []` means offered for any move.
options = {}
for o in all_options():
    step = options.setdefault(o["flow"], {}).setdefault(o["step"], [])
    step.append(dict(id=o["id"], label=o["label"], kind=o["kind"], flag=o["flag"], selfLike=o["selfLike"], branch=o["branch"],
                     order=len(step), moves=list(o["moves"] or []),
                     sameAs=[{"label": label, "id": target} for label, target in o["sameAs"]], **status(o["id"])))

hurts = [dict({k: h[k] for k in ("id", "label", "hurtPhrase", "feltPhrase", "matters", "namedAs")}, order=i,
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
    # Recover's "what happened" (InvalidationEvent id) → the hurts it can touch, in order: pre-orders the
    # angry card's chips in Recover (src/lib/angryPart.ts orderHurts). Reviewed by the event id, like the edge.
    "canTouch": {ev: dict(hurts=hurts, **status(ev)) for ev, hurts in CAN_TOUCH.items()},
    # The module ids each move is expressed by, per source label, every edge (moves never offered too:
    # the projection drops an edge whose move doesn't ship). Reviewed by the source id, like the edge.
    "expresses": {label: {src: dict(moveId=move, **status(src)) for src, (move, _why) in table.items()}
                  for label, table in EXPRESSES.items()},
    "pairs": pairs,
    "keepsake": [dict(id=kid, copy=copy, **status(kid)) for kid, copy in KEEPSAKE],
    "trailRules": [dict(r, **status(r["id"])) for r in TRAIL_RULES],
    "contexts": [dict(id=cid, key=key, value=value, phrase=phrase, **status(cid)) for cid, key, value, phrase in CONTEXTS],
    "policy": dict(POLICY, **status(POLICY["id"])),
    "pending": PENDING,
}
out = os.path.join(root, "tests/fixtures/parts-content.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
# Written whole, then moved into place: the freshness test runs this while other test files read the fixture, and
# an in-place rewrite let a reader see it empty (the merge lane, 15 Nov).
tmp = f"{out}.{os.getpid()}.tmp"
with open(tmp, "w") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write("\n")
os.replace(tmp, out)
print(out)
