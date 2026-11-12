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
import dear_man_debrief  # noqa: E402
import pros_cons  # noqa: E402
import first_body  # noqa: E402
import ride_it_out  # noqa: E402
import let_it_be  # noqa: E402
import mind_job  # noqa: E402
import say_no  # noqa: E402
import dear_man_one  # noqa: E402
import held  # noqa: E402
import thoughts_passing  # noqa: E402
import dear_man_prep  # noqa: E402
import opposite_action  # noqa: E402

# The shape the player and getSkillContent agree on (functions/src/skills/index.ts SKILLS_VERSION).
CONTENT_VERSION = "skills-v1"
SKILLS = [check_the_facts.SKILL, alternate_rebellion.SKILL, er_troubleshoot.SKILL, *fast.SKILLS, nightmare_rescript.SKILL, problem_solve.SKILL,
          ending_relationships.SKILL, cope_ahead.SKILL, hold_to_wait.SKILL, dear_man_debrief.SKILL, pros_cons.SKILL, first_body.SKILL,
          ride_it_out.SKILL, let_it_be.SKILL, mind_job.SKILL, say_no.SKILL, dear_man_one.SKILL, held.SKILL, thoughts_passing.SKILL, dear_man_prep.SKILL,
          opposite_action.SKILL]

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
    # DEAR MAN's debrief: who showed up? (src/lib/debriefWho.ts; parts on, a kept part, the lines shipped, else it moves
    # on at once). Reports the named form's answer; the general form is the tag row, which writes its own tag.
    "debriefWho": {"ids": ["yes", "a_bit", "no", "skip", "general", "not_shown"]},
    # DT-10's card (plan C3b, DT-owned): the card from this run, read once (`read`, seconds open); and the kept card
    # for this run's pull, replayed inside Hold to wait (reports nothing; its slot's record says it showed).
    "prosConsCard": {"ids": ["read"], "measures": ["durationSec"]},
    "prosConsReplay": {},
    # DT-01's body modes (plan C3b, DT-owned; src/components/skillPlayer/BodyEmbeds.tsx): each reports done, partly or
    # skipped and the seconds it ran (the breath pacer also `dizzy`: its stop rule); measurements, never ratings.
    "doseTimer": {"ids": ["done", "partly", "skipped"], "measures": ["durationSec"]},
    "bodyCard": {"ids": ["done", "partly", "skipped"], "measures": ["durationSec"]},
    "breathPacer": {"ids": ["done", "partly", "skipped", "dizzy"], "measures": ["durationSec"]},
    "squeezeRelease": {"ids": ["done", "partly", "skipped"], "measures": ["durationSec", "doneCount"]},
    "orientFind": {"ids": ["done", "partly", "skipped"], "measures": ["doneCount"]},
    # DT-05's wave (plan C3b `urgeWave`, DT-owned; src/lib/urgeWave.ts): the checks answered in order (categorical,
    # plan C1 rule 2), then how the ride ended; and its trace at the close, read once.
    "urgeWave": {"ids": ["still_here", "fading", "gone", "bigger", "ended_gone", "ended_bigger", "ended_not_now",
                         "ended_left", "ended_long"], "measures": ["durationSec", "doneCount"]},
    "waveTrace": {"ids": ["read"]},
    # DT-06's lid (plan C3b `lidShelf`, DT-owned; src/components/skillPlayer/LidShelf.tsx): put it in, hold the lid
    # shut. `shut` when the hold finished, `partly` after a release, `skipped` when the way past came first.
    "lidShelf": {"ids": ["shut", "partly", "skipped"], "measures": ["durationSec"]},
    # IE-B3's message card (plan C3b `messageComposer`, IE-owned): the picks as one message, with the FAST strip (an
    # extra sorry, over-explaining) and the line to repeat; Copy and Open messages, never a send. Reports what was done.
    "messageComposer": {"ids": ["copied", "opened", "dropped_sorry"]},
    # ER-03's doors (#48, src/components/tools/oppositeAction/OppositeActionStart.tsx): up to three grid words, loudest
    # first. `emotions`: its ids are grid word ids (the machine keeps only words on the grid, at most this many).
    "doorPicker": {"emotions": 3},
    # Do the Opposite's step card (a slot): each feeling's chosen step, read from the run's labels. Reports nothing.
    "oaSteps": {},
    # IE-B4's pocket card (plan C3b `pocketCard`, IE-01 Mode C): the plan on three cards (say it, stay steady, if they
    # push back), read through one at a time, no input. Reports whether every card was seen and whether it was copied.
    "pocketCard": {"ids": ["seen_all", "copied"]},
}
# What each embed takes from the skill (embeds.ts EMBED_PROPS; the contract test keeps the two equal). build.py
# checks every step's props: `copy` is a key in the skill's copy (the player shows its text), `int` a whole number
# in [min, max], `enum` one of its values, `field` a field id of the skill, `id` a plain id. Undeclared props fail.
EMBED_PROPS = {
    # `as: heading`: the screen's question (a slot under `$title`, for a step whose question is parts copy).
    "partsLine": {"promptId": {"type": "id"}, "as": {"type": "enum", "values": ["line", "heading"], "optional": True}},
    "partLater": {},
    "debriefWho": {},
    "doorPicker": {},
    "oaSteps": {},
    # The card's three cards each list their fields' picks in order; `fill` / `detail`: a pick of `fill` with a
    # [blank] reads `detail`'s words in its place (DEAR MAN's asks).
    "pocketCard": {
        "say": {"type": "fields"}, "steady": {"type": "fields"}, "push": {"type": "fields"},
        "fill": {"type": "field", "optional": True}, "detail": {"type": "field", "optional": True},
        "sayLabel": {"type": "copy"}, "steadyLabel": {"type": "copy"}, "pushLabel": {"type": "copy"},
        "prevLabel": {"type": "copy"}, "nextCardLabel": {"type": "copy"},
        "copyLabel": {"type": "copy"}, "copiedLabel": {"type": "copy"}, "selectedLabel": {"type": "copy"},
        "next": {"type": "copy"},
        # The quiet way on before the last card (`next` once every card is in view).
        "skipLabel": {"type": "copy", "optional": True},
        # `joinField`'s picks join into one sentence after `joinLead` ("I felt hurt and unheard.").
        "joinField": {"type": "field", "optional": True}, "joinLead": {"type": "copy", "optional": True},
        # Up to two fields whose lines carry a small label ("I won't accept").
        "labelAField": {"type": "field", "optional": True}, "labelA": {"type": "copy", "optional": True},
        "labelBField": {"type": "field", "optional": True}, "labelB": {"type": "copy", "optional": True},
        # Fixed lines at the end of the steady card (only when it has the person's own picks).
        "steadyNoteA": {"type": "copy", "optional": True}, "steadyNoteB": {"type": "copy", "optional": True},
    },
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
        "wayOn": {"type": "enum", "values": ["from_start"], "optional": True},
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
        # The way on before the line is copied (Recover's *I don't need to say anything*); `next` once it is.
        "skipLabel": {"type": "copy", "optional": True},
    },
    "messageComposer": {
        "field": {"type": "field"},
        # The message's parts in the order they're said (One message: fact, felt, give, ask, why); without it, the
        # fixed order opener, field, reason, alt (Say no).
        "parts": {"type": "fields", "optional": True},
        "opener": {"type": "field", "optional": True},
        "reason": {"type": "field", "optional": True},
        "alt": {"type": "field", "optional": True},
        "repeatLabel": {"type": "copy", "optional": True},
        "sorryLine": {"type": "copy", "optional": True},
        "dropSorry": {"type": "copy", "optional": True},
        "explainLine": {"type": "copy", "optional": True},
        "copyLabel": {"type": "copy"},
        "copiedLabel": {"type": "copy"},
        "selectedLabel": {"type": "copy"},
        "openLabel": {"type": "copy", "optional": True},
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
    "prosConsCard": {
        "reasonsField": {"type": "field"},
        "moreField": {"type": "field"},
        "proField": {"type": "field"},
        "reasonsLabel": {"type": "copy"},
        "proLabel": {"type": "copy"},
        "fallback": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "prosConsReplay": {
        "pullField": {"type": "field"},
        "fromSkill": {"type": "id"},
        "title": {"type": "copy"},
        "reasonsLabel": {"type": "copy"},
        "proLabel": {"type": "copy"},
        "fallback": {"type": "copy"},
        "noProFor": {"type": "id"},
        "noteFor": {"type": "id"},
        "note": {"type": "copy"},
    },
    "doseTimer": {
        "art": {"type": "enum", "values": ["cold", "none"], "optional": True},
        "seconds": {"type": "int", "min": 5, "max": 300},
        "leadIn": {"type": "int", "min": 0, "max": 5, "optional": True},
        "step1": {"type": "copy", "optional": True},
        "step2": {"type": "copy", "optional": True},
        "step3": {"type": "copy", "optional": True},
        "caution": {"type": "copy", "optional": True},
        "start": {"type": "copy"},
        "running": {"type": "copy"},
        "lead": {"type": "copy", "optional": True},
        "done": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "bodyCard": {
        "kind": {"type": "enum", "values": ["hand_heart", "wake", "strong", "still", "press", "willing"]},
        "cue": {"type": "copy", "optional": True},
        "seconds": {"type": "int", "min": 5, "max": 300},
        "step1": {"type": "copy", "optional": True},
        "step2": {"type": "copy", "optional": True},
        "step3": {"type": "copy", "optional": True},
        "caution": {"type": "copy", "optional": True},
        "start": {"type": "copy"},
        "running": {"type": "copy"},
        "done": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "breathPacer": {
        "seconds": {"type": "int", "min": 30, "max": 300},
        "inSec": {"type": "int", "min": 2, "max": 6},
        "outSec": {"type": "int", "min": 3, "max": 10},
        "step1": {"type": "copy", "optional": True},
        "step2": {"type": "copy", "optional": True},
        "step3": {"type": "copy", "optional": True},
        "caution": {"type": "copy", "optional": True},
        "start": {"type": "copy"},
        "inLabel": {"type": "copy"},
        "outLabel": {"type": "copy"},
        "dizzy": {"type": "copy"},
        "done": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "squeezeRelease": {
        "rounds": {"type": "int", "min": 1, "max": 5},
        "squeezeSec": {"type": "int", "min": 3, "max": 8},
        "step1": {"type": "copy", "optional": True},
        "step2": {"type": "copy", "optional": True},
        "step3": {"type": "copy", "optional": True},
        "caution": {"type": "copy", "optional": True},
        "start": {"type": "copy"},
        "squeezeLabel": {"type": "copy"},
        "dropLabel": {"type": "copy"},
        "done": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "orientFind": {
        "variant": {"type": "enum", "values": ["find", "listen"]},
        "count": {"type": "int", "min": 1, "max": 5},
        "here": {"type": "copy"},
        "task": {"type": "copy"},
        "foundLabel": {"type": "copy"},
        "done": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "urgeWave": {
        "checkSec": {"type": "int", "min": 20, "max": 180},
        "maxChecks": {"type": "int", "min": 1, "max": 10},
        "checkTitle": {"type": "copy"},
        "riding": {"type": "copy"},
        "still_here": {"type": "copy"},
        "fading": {"type": "copy"},
        "gone": {"type": "copy"},
        "bigger": {"type": "copy"},
        "notNow": {"type": "copy", "optional": True},
        "next": {"type": "copy"},
        "continueFrom": {"type": "field", "optional": True},
    },
    "waveTrace": {
        "rideField": {"type": "field"},
        "againField": {"type": "field", "optional": True},
        "downLine": {"type": "copy"},
        "riseLine": {"type": "copy", "optional": True},
        "heldLine": {"type": "copy"},
        "next": {"type": "copy"},
    },
    "lidShelf": {
        "containerField": {"type": "field"},
        "put": {"type": "copy"},
        "hold": {"type": "copy"},
        "holding": {"type": "copy"},
        "hint": {"type": "copy"},
        "holdSec": {"type": "int", "min": 1, "max": 10},
        "done": {"type": "copy"},
        "next": {"type": "copy"},
        "skip": {"type": "copy"},
    },
}
# Shared tables the graph supplies to every skill (never written here).
GRAPH_TABLES = ("parentOf", "fitsWhen")
