"""Rewrite the nightmare (DBT ER Handout 20a, the nightmare protocol; imagery rehearsal) as a skill on the runtime.

PRD ER-15 (`PRD – Emotion Regulation.md` §5; docs/design/dbt-modules-plan.md §2.3, batch ER-B6; design and every
departure in docs/design/nightmare-rescript.md). Unparked by Claudia on 10 Nov 2026 (D14): built now, on the existing
crisis banner and the player's *This is too much right now* (P2), without a clinician in the loop. So:

- **Not for replays.** The first question asks whether the nightmare replays something that really happened. Yes
  or partly → a card that says a clinician is the right place for that one, and what can help tonight instead. No
  rescripting of a real event, ever (PRD gating; Index safety row "no solo rescripting of replays").
- **Nothing asks what happens in it.** The person picks where it starts, then what changes *before* the bad part,
  then how it ends now. They author the new version; the app never writes an ending for them and never asks them
  to recount the old one (the plan's ER-B6 gate: "no field asks what happened").
- **Stop is always there.** The player's *This is too much right now* sits under every screen (P2). The
  read-through has its own *Stop*, which goes to a card that settles and orients (5-4-3-2-1), never back into the
  dream. *It started to feel like a memory* after a read-through goes to the clinician card; *I'm not feeling safe*
  opens the crisis banner and puts someone to talk to first.
- **Someone to talk to on every screen.** Every ask step's first field carries the quiet *Talk to someone now*
  link (own words are never read, so they can't raise the banner themselves); the clinician and stop cards offer it.
- **Rehearsal by reminder.** The keep step's chips schedule `nightmare_rehearse`, a Today card that reopens this
  run at the read-through (R9 resume). That visit skips the questions and ends on a card with its own reminder chip
  (R5 on a hand-off), so the person sets each next read-through, one at a time, for as long as they want.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "nightmare_rescript"
TOOL_ID = "nightmare-rescript"
CONCEPT = "dbt_nightmare_protocol"
VERSION = "nr-v1"
# Own words: one short line each (where it starts, what changes, how it ends). Kept to one breath, like the
# witness lines and Cope Ahead's moves, and so the worst-case record stays under the 4 KB contract.
OWN_MAX = 90
SETTING_OWN_MAX = 60

COPY = {
    # Screen 1: the replay gate (PRD gating), and the plain clinician line for everyone (ER-B6 gate).
    "replay_title": "Is this nightmare a replay of something that really happened?",
    "replay_title_flooded": "This is one for a calmer moment. Is the nightmare a replay of something that really happened?",
    "replay_hint": "This works on a nightmare that keeps coming back. It's best done in the daytime, with your eyes open. You can stop at any point.",
    "replay_note": "When nightmares follow something that happened to you, a clinician can help with that.",
    "settle_first": "Settle first",
    # The clinician card (replay yes / partly, or a read-through that started to feel like a memory).
    "clinician": "Nightmares that replay something real are best worked on with a clinician, who can go at your pace. For tonight, settling your body and the room around you can help.",
    "clinician_memory": "That's a good place to stop. When it feels like a memory, it's one to work on with a clinician, at your pace. For now, come back to the room around you.",
    # Settle (absorb first): a grounding hold, not slow breathing (direction-safe, C6.3).
    "settle_title": "Before you start, settle for a moment.",
    "settle_title_unsure": "Before you start, settle for a moment. If it starts to feel like a memory, you can stop there.",
    "settle_label": "Hold",
    "settle_hint": "Hold the circle and notice your feet on the floor.",
    "settle_done": "That's enough.",
    # Screen 3: where it starts. Not what happens.
    "start_title": "Where does it start?",
    "start_hint": "Pick one that keeps coming back, not the worst one. You don't need to say what happens.",
    "start_own": "Say it your way",
    # Screen 4: the change, before the bad part.
    "turn_title": "Before it turns bad, what changes?",
    "turn_hint": "Anything can change. It's your dream.",
    "turn_own": "Say it your way",
    # Screen 5: the new ending, theirs to write.
    "ending_title": "How does it end now?",
    "ending_own": "Write your ending",
    # Screen 6: the new version on the paper, and the read-through (the rich moment).
    "rehearse_title": "Your new version",
    "card_start": "It starts",
    "card_turn": "Then",
    "card_end": "It ends",
    "card_fallback": "Your version",
    "read_start": "Read it through",
    "read_running": "Picture it, start to finish, eyes open. Stop any time.",
    "read_stop": "Stop",
    "read_done": "Done",
    "read_skip": "I'd rather stop here",
    # Screen 7: after the first read-through.
    "after_title": "How was that?",
    # Screen 8: settle again (PRD step 6).
    "settle_again_title": "Settle again before you go on.",
    # Screen 9: keep and the reminder.
    "plan_title": "Keep this new version?",
    "plan_hint": "Reading it through once a day, for a while, is what helps the new version take hold.",
    "remind_q": "Want a reminder to read it through?",
    "plan_primary": "Next",
    # The end of a first visit.
    "close": "You changed how it goes. Each read-through is practice for the new version.",
    "close_kept": "It's in Me. Each read-through is practice for the new version.",
    # The end of a read-through visit (from the Today reminder).
    "again": "That's one more read-through.",
    "again_q": "Want a reminder for the next one?",
    # Stopped (the read-through's Stop, or not feeling safe after it).
    "stopped": "Stopping is part of this. You can come back on another day, or leave it here.",
    "stopped_unsafe": "Thank you for stopping. Someone to talk to is right here.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
REPLAY = {"in": [a("replay"), ["yes", "partly"]]}
UNSURE = {"eq": [a("replay"), "unsure"]}
UNSAFE = {"eq": [a("after"), "unsafe"]}
MEMORY = {"eq": [a("after"), "memory"]}
KEPT = {"eq": [a("keepit"), "yes"]}
# A run reopened from the Today reminder (R9: `?run=<session>&at=rehearse&enterAt=rehearse`): it skips the
# questions after the read-through and ends on the *again* card. Resume reads back only the answers up to the
# read-through, so nothing after it (the last reminder picked, how it went last time) is ever pre-filled.
RESUMED = {"eq": ["$ctx.enterAt", "rehearse"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
CRISIS = [{"variant": "crisis", "when": UNSAFE}]

REPLAY_OPTS = [
    ("yes", "Yes, it replays something that happened"),
    ("partly", "Partly"),
    ("no", "No, it's its own thing"),
    ("unsure", "I'm not sure"),
]
# Where it starts (PRD "setting"). Places only: never who, never what happens.
SETTINGS = [
    ("home", "Somewhere like home"),
    ("outside", "Outside"),
    ("work", "Somewhere like school or work"),
    ("travelling", "Travelling somewhere"),
    ("unknown", "Somewhere I don't know"),
]
# RescriptChange (PRD step 4): the change, before the bad part. First person, present.
CHANGES = [
    ("bigger", "I get bigger and stronger"),
    ("ally", "Someone on my side arrives"),
    ("door", "A door appears, and I go through it"),
    ("silly", "It turns silly"),
    ("stop", "I say stop, and it stops"),
    ("leave", "I can leave, and I do"),
]
# How it ends now. Starters only: the own-words box is open, so writing their own ending is the first invitation.
ENDINGS = [
    ("safe", "I end up somewhere safe"),
    ("trusted", "I'm with someone I trust"),
    ("fades", "It fades out quietly"),
    ("calm", "I wake up calm"),
]
AFTER = [
    ("all_right", "That was all right"),
    ("stirred", "It stirred me up"),
    ("memory", "It started to feel like a memory"),
    # Plan C6.4: an option that can carry danger declares it, and its step the crisis slot.
    ("unsafe", "I'm not feeling safe", {"danger": "self"}),
]
KEEP = [("yes", "Keep it in Me"), ("no", "Not this time")]
# The nightmare_rehearse window chips (scripts/practice-spine/content.py): no dates.
REMIND = [("tonight", "Tonight, before bed"), ("tomorrow", "Tomorrow, in the day")]

SETTLE_PROPS = {"variant": "settle", "seconds": 5, "holds": 3, "label": "settle_label", "hint": "settle_hint",
                "doneLabel": "settle_done", "next": "next"}

STEPS = [
    {
        "id": "replay", "kind": "ask",
        "title": [{"when": FLOODED, "key": "replay_title_flooded"}, {"key": "replay_title"}],
        "hint": "replay_hint", "note": "replay_note",
        "fields": [{
            "id": "replay", "options": {"list": "replay"}, "max": 1, "required": True,
            # A carried flooded band (C6.2, only from a host): a quiet way to settle first; going on stays the default.
            # Grounding, not cold or slow breathing (C6.3).
            "links": [{"exit": "five_senses", "label": "settle_first", "when": FLOODED}, SAFETY_LINK],
        }],
        "crisis": CRISIS,
        "next": [{"when": REPLAY, "to": "clinician"}, {"to": "settle"}],
    },
    {
        "id": "clinician", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": MEMORY, "key": "clinician_memory"}, {"when": ALWAYS, "key": "clinician"}],
        "offers": [{"exit": "five_senses", "when": ALWAYS}, {"exit": "sleep_reset", "when": ALWAYS},
                   {"exit": "safety_open", "when": ALWAYS}],
        "done": "done",
    },
    {
        "id": "settle", "kind": "embed", "embed": "holdRing", "answerAs": "settle", "crisis": CRISIS,
        "title": [{"when": UNSURE, "key": "settle_title_unsure"}, {"key": "settle_title"}],
        "props": SETTLE_PROPS,
        "next": [{"to": "start"}],
    },
    {
        "id": "start", "kind": "ask", "title": "start_title", "hint": "start_hint", "crisis": CRISIS,
        "fields": [{"id": "setting", "options": {"list": "setting"}, "max": 1, "required": True,
                    "own": {"hint": "start_own", "countsAsPick": True, "max": SETTING_OWN_MAX}, "links": [SAFETY_LINK]}],
        "next": [{"to": "turn"}],
    },
    {
        "id": "turn", "kind": "ask", "title": "turn_title", "hint": "turn_hint", "crisis": CRISIS,
        "fields": [{"id": "turn", "options": {"list": "turn"}, "max": 1, "required": True,
                    "own": {"hint": "turn_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "ending"}],
    },
    {
        "id": "ending", "kind": "ask", "title": "ending_title", "crisis": CRISIS,
        "fields": [{"id": "ending", "options": {"list": "ending"}, "max": 1, "required": True,
                    "own": {"hint": "ending_own", "countsAsPick": True, "open": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "rehearse"}],
    },
    {
        # The rich moment: the new version on the square paper, then one read-through with Stop always there.
        "id": "rehearse", "kind": "embed", "embed": "rescriptCard", "answerAs": "read", "title": "rehearse_title",
        "crisis": CRISIS,
        "props": {"startField": "setting", "turnField": "turn", "endField": "ending", "seconds": 60,
                  "startLabel": "card_start", "turnLabel": "card_turn", "endLabel": "card_end", "fallback": "card_fallback",
                  "readLabel": "read_start", "runningLabel": "read_running", "stopLabel": "read_stop",
                  "doneLabel": "read_done", "skipLabel": "read_skip"},
        "next": [{"when": {"eq": [a("read"), "stopped"]}, "to": "stopped"},
                 {"when": RESUMED, "to": "again"}, {"to": "after"}],
    },
    {
        "id": "after", "kind": "ask", "title": "after_title", "crisis": CRISIS,
        "fields": [{"id": "after", "options": {"list": "after"}, "max": 1, "required": True,
                    "links": [{"exit": "safety_open", "label": "safety_open", "when": {"not": UNSAFE}}]}],
        "next": [{"when": UNSAFE, "to": "stopped"}, {"when": MEMORY, "to": "clinician"}, {"to": "settle_again"}],
    },
    {
        "id": "settle_again", "kind": "embed", "embed": "holdRing", "answerAs": "settle_again", "crisis": CRISIS,
        "title": "settle_again_title", "props": SETTLE_PROPS,
        "next": [{"to": "plan"}],
    },
    {
        # Keep (R4) on the chip *Keep it in Me*: that tap is the yes (C2.2); *Not this time* keeps nothing. The
        # reminder chips (R5) schedule the first read-through; each read-through visit sets the next.
        "id": "plan", "kind": "ask", "title": "plan_title", "hint": "plan_hint", "crisis": CRISIS,
        "fields": [
            {"id": "keepit", "options": {"list": "keepit"}, "max": 1, "required": True, "links": [SAFETY_LINK]},
            {"id": "remind", "label": "remind_q", "options": {"list": "remind"}, "max": 1},
        ],
        "keep": {"kind": "nightmare_script", "many": True, "from": ["setting", "turn", "ending"], "when": KEPT},
        "followUp": {"type": "nightmare_rehearse", "whenFrom": "remind"},
        "primary": "plan_primary",
        "next": [{"to": "close"}],
    },
    {
        "id": "close", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [{"when": KEPT, "key": "close_kept"}, {"when": ALWAYS, "key": "close"}],
        "offers": [], "done": "done",
    },
    {
        # A read-through visit's end, with its own reminder chip (R5 on a hand-off): the next one, if they want it.
        "id": "again", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "again"}],
        "fields": [{"id": "again_remind", "label": "again_q", "max": 1, "options": {"list": "remind"}}],
        "followUp": {"type": "nightmare_rehearse", "whenFrom": "again_remind"},
        "offers": [], "done": "done",
    },
    {
        # Stop: grounding and someone to talk to, never back into the dream; no close question.
        "id": "stopped", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": UNSAFE, "key": "stopped_unsafe"}, {"when": ALWAYS, "key": "stopped"}],
        "offers": [{"exit": "safety_open", "when": UNSAFE}, {"exit": "five_senses", "when": ALWAYS},
                   {"exit": "safety_open", "when": {"not": UNSAFE}}],
        "done": "done",
    },
]

EXITS = [
    {"id": "five_senses", "toolId": "five-senses"},                       # orienting (DT-01's orient entry)
    {"id": "sleep_reset", "toolId": "sleep-reset", "planned": True},      # ER-13 Sleep reset (ER-B5)
    {"id": "safety_open", "toolId": None, "safety": True},                # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("replay", v, label, {}, None) for v, label in REPLAY_OPTS]
    out += [("setting", v, label, {}, None) for v, label in SETTINGS]
    out += [("turn", v, label, {}, "RescriptChange") for v, label in CHANGES]
    out += [("ending", v, label, {}, None) for v, label in ENDINGS]
    out += [("after", o[0], o[1], (o[2] if len(o) > 2 else {}), None) for o in AFTER]
    out += [("keepit", v, label, {}, None) for v, label in KEEP]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "replay", "ownMax": OWN_MAX,
    "accepts": ["band", "enterAt"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
