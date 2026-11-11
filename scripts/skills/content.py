"""Every skill on the runtime (docs/design/skill-runtime.md). The single editable source: one module per
skill, listed here. build.py turns them into schema/skills.cypher; fixture.py into the payload
getSkillContent serves (tests/fixtures/skills-content.json = src/data/content/skills.json).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_the_facts  # noqa: E402
import alternate_rebellion  # noqa: E402
import er_troubleshoot  # noqa: E402
import fast  # noqa: E402
import nightmare_rescript  # noqa: E402
import problem_solve  # noqa: E402
import ending_relationships  # noqa: E402
import cope_ahead  # noqa: E402
import hold_to_wait  # noqa: E402

# The shape the player and getSkillContent agree on (functions/src/skills/index.ts SKILLS_VERSION).
CONTENT_VERSION = "skills-v1"
SKILLS = [check_the_facts.SKILL, alternate_rebellion.SKILL, er_troubleshoot.SKILL, *fast.SKILLS, nightmare_rescript.SKILL, problem_solve.SKILL,
          ending_relationships.SKILL, cope_ahead.SKILL, hold_to_wait.SKILL]

STEP_KINDS = ("ask", "handoff", "embed")
# Embeds the player has registered (src/components/skillPlayer/embeds.ts EMBEDS), each with what it may report
# (EMBED_OUTPUTS there: ids, ownText, measures, danger); tests/skill-contracts.test.mjs keeps the two equal.
EMBEDS = {
    "partsLine": {},
    "holdRing": {"ids": ["held", "partly", "skipped"], "measures": ["durationSec", "doneCount", "earlyCount"]},
    "witness": {"ids": ["yes", "sort_of", "no", "none_fit", "own", "skip", "seen"]},
    "rebellionCard": {"ids": ["now", "today", "week"]},
    # IE-05's boundary line card (plan C3b, IE-owned): the picked line on paper, copyable; reports whether it was copied.
    "boundaryLine": {"ids": ["copied"]},
    "rescriptCard": {"ids": ["read", "stopped"], "measures": ["durationSec"]},
    # DT-02's wait (plan C3b, DT-owned): a timestamp wait with a come-back; never locks. `waited` when the ring ran
    # out, `back_early` when *I'm back* came first.
    "waitLock": {"ids": ["waited", "back_early"], "measures": ["durationSec"]},
    # Problem Solve's "the part that doesn't want change" (parts on; docs/design/parts.md): a quiet yes that queues a
    # PartCandidate. Reports nothing; its slot's record says it showed.
    "partLater": {},
    # Cope Ahead (ER-B2): the plan line as it's built, the rehearsal (whole screen), the keepsake paper, the part's anchor.
    "planSentence": {},
    "rehearsal": {"ids": ["done"]},
    "keepCard": {},
    "partAnchor": {},
}
# What each embed takes from the skill (embeds.ts EMBED_PROPS; the contract test keeps the two equal). build.py
# checks every step's props: `copy` is a key in the skill's copy (the player shows its text), `int` a whole number
# in [min, max], `enum` one of its values, `field` a field id of the skill, `id` a plain id. Undeclared props fail.
EMBED_PROPS = {
    # `as: heading`: the screen's question (a slot under `$title`, for a step whose question is parts copy).
    "partsLine": {"promptId": {"type": "id"}, "as": {"type": "enum", "values": ["line", "heading"], "optional": True}},
    "partLater": {},
    "holdRing": {
        "variant": {"type": "enum", "values": ["press", "timed", "settle"]},
        "seconds": {"type": "int", "min": 1, "max": 900},
        "holds": {"type": "int", "min": 1, "max": 10, "optional": True},
        "growthPct": {"type": "int", "min": 100, "max": 300, "optional": True},
        "maxSeconds": {"type": "int", "min": 1, "max": 900, "optional": True},
        "label": {"type": "copy"},
        "runningLabel": {"type": "copy", "optional": True},
        "hint": {"type": "copy"},
        "doneLabel": {"type": "copy", "optional": True},
        "next": {"type": "copy"},
    },
    "witness": {
        "moment": {"type": "id"},
        "wordsFrom": {"type": "field", "optional": True},
        "emotionsFrom": {"type": "field", "optional": True},
        "next": {"type": "copy", "optional": True},
    },
    "rebellionCard": {
        "squeezeField": {"type": "field"},
        "functionField": {"type": "field"},
        "pickField": {"type": "field"},
        "against": {"type": "copy"},
        "for": {"type": "copy"},
        "fallback": {"type": "copy"},
        "whenLabel": {"type": "copy"},
        "now": {"type": "copy"},
        "today": {"type": "copy"},
        "week": {"type": "copy"},
    },
    "boundaryLine": {
        "field": {"type": "field"},
        "field2": {"type": "field", "optional": True},
        "field3": {"type": "field", "optional": True},
        "shape": {"type": "enum", "values": ["line", "list"]},
        "copyLabel": {"type": "copy", "optional": True},
        "copiedLabel": {"type": "copy", "optional": True},
        "selectedLabel": {"type": "copy", "optional": True},
        "next": {"type": "copy"},
    },
    "rescriptCard": {
        "startField": {"type": "field"},
        "turnField": {"type": "field"},
        "endField": {"type": "field"},
        "seconds": {"type": "int", "min": 10, "max": 300},
        "startLabel": {"type": "copy"},
        "turnLabel": {"type": "copy"},
        "endLabel": {"type": "copy"},
        "fallback": {"type": "copy"},
        "readLabel": {"type": "copy"},
        "runningLabel": {"type": "copy"},
        "stopLabel": {"type": "copy"},
        "doneLabel": {"type": "copy"},
        "skipLabel": {"type": "copy"},
    },
    "planSentence": {
        "momentField": {"type": "field"},
        "movesField": {"type": "field"},
        "forpullField": {"type": "field", "optional": True},
        "pullField": {"type": "field"},
    },
    "rehearsal": {
        "momentField": {"type": "field"},
        "movesField": {"type": "field"},
        "forpullField": {"type": "field", "optional": True},
        "pullField": {"type": "field"},
        "pass": {"type": "int", "min": 1, "max": 2},
        "changeField": {"type": "field", "optional": True},
        "changedMovesField": {"type": "field", "optional": True},
    },
    "keepCard": {
        "momentField": {"type": "field"},
        "movesField": {"type": "field"},
        "forpullField": {"type": "field", "optional": True},
        "pullField": {"type": "field"},
        "partField": {"type": "field", "optional": True},
    },
    "partAnchor": {"partField": {"type": "field"}},
    "waitLock": {
        "minutes": {"type": "int", "min": 1, "max": 60},
        "waiting": {"type": "copy"},
        "waitingShort": {"type": "copy"},
        "done": {"type": "copy"},
        "doneShort": {"type": "copy"},
        "next": {"type": "copy"},
    },
}
# Shared tables the graph supplies to every skill (never written here).
GRAPH_TABLES = ("parentOf", "fitsWhen")
