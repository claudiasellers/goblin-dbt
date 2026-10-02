"""A body map's places, computed from FELT_AS the way getBodyMapContent does
(functions/src/bodyMap/places.ts; tests check the two agree on the fixture)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import FELT, MAPS, SIGNED_OFF, PAD_WORDS, SHARED_BONUS, BASE  # noqa: E402


def word_status(sid):
    return "live" if f"word:{sid}" in SIGNED_OFF else "draft"

WORDS = {w[0]: w for w in PAD_WORDS}


def felt_status(emotion, region, sensation, origin):
    if origin == BASE:
        return "live"
    return "live" if f"felt:{emotion}:{region}:{sensation}" in SIGNED_OFF else "draft"


def places_for(mid, statuses=("live",)):
    """[(region, sensation, weight, [emotions])], strongest first. `statuses`: which FELT_AS rows count."""
    _, groups, _ = MAPS[mid]
    agg = {}
    for e in groups:
        for region, sid, weight, origin in FELT.get(e, []):
            # As the callable: the row and its sensation word must both count (FELT_AS status, padStatus).
            if felt_status(e, region, sid, origin) not in statuses or word_status(sid) not in statuses:
                continue
            best, who = agg.get((region, sid), (0, []))
            agg[(region, sid)] = (max(best, weight), who + [e])
    out = [(r, s, round(min(1.0, w + SHARED_BONUS * (len(who) - 1)), 3), who) for (r, s), (w, who) in agg.items()]
    return sorted(out, key=lambda p: (-p[2], p[0], p[1]))
