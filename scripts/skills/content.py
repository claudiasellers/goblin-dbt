"""Every skill on the runtime (docs/design/skill-runtime.md). The single editable source: one module per
skill, listed here. build.py turns them into schema/skills.cypher; fixture.py into the payload
getSkillContent serves (tests/fixtures/skills-content.json = src/data/content/skills.json).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_the_facts  # noqa: E402

# The shape the player and getSkillContent agree on (functions/src/skills/index.ts SKILLS_VERSION).
CONTENT_VERSION = "skills-v1"
SKILLS = [check_the_facts.SKILL]

STEP_KINDS = ("ask", "handoff", "embed")
# Embeds the player has registered (src/components/skillPlayer/embeds.ts EMBEDS), each with what it may report
# (EMBED_OUTPUTS there: ids, ownText, measures, danger); tests/skill-contracts.test.mjs keeps the two equal.
EMBEDS = {
    "partsLine": {},
    "holdRing": {"ids": ["held", "partly", "skipped"], "measures": ["durationSec", "doneCount", "earlyCount"]},
    "witness": {"ids": ["yes", "sort_of", "no", "none_fit", "own", "skip", "seen"]},
}
# What each embed takes from the skill (embeds.ts EMBED_PROPS; the contract test keeps the two equal). build.py
# checks every step's props: `copy` is a key in the skill's copy (the player shows its text), `int` a whole number
# in [min, max], `enum` one of its values, `field` a field id of the skill, `id` a plain id. Undeclared props fail.
EMBED_PROPS = {
    "partsLine": {"promptId": {"type": "id"}},
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
}
# Shared tables the graph supplies to every skill (never written here).
GRAPH_TABLES = ("parentOf", "fitsWhen")
