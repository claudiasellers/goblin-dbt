"""Say no (DBT IE Handouts 5 and 8; PRD IE-04, with IE-07's sizeIt in its "no" form) as a skill on the runtime:
`say_no` under the `say-no` tool id (IE-B3; docs/design/say-no.md).

  ask         what are they asking for? (permission first: you're allowed to say no)
  pressure    what happens if you say no? *I'm scared of what they'd do*, or anything sexual or physical, goes to
              *No is enough*: one-line refusals, the other-person resources, no negotiation
  why         what matters most here (IE-07's priorities in their "no" form); it sets the compose screen's lead line
  firm        how firm (IE-07's dime game, the five refusal questions; a counting derive, R10, never a number shown)
  level       the named level, and *does that sit right?* (one step softer or firmer, counted in)
  compose     the warm opener (GIVE), the no (level-matched lines), one reason at most (FAST), something else (N)
  message     the `messageComposer` card: the no as one message, the FAST strip (an extra sorry, over-explaining),
              the line to repeat if they push, Copy and Open messages (the app never sends)
  predict     how will they take it? and how sure? then how they'll say it (message or in person)
  sent        *Want me to ask how it went?* (the `no_outcome` card, which reopens this run at `said`)
  said/held   afterwards: did you say it? did it hold when they pushed? proud? (*I gave in* is met flatly)

A carried flooded reading skips the sizing (PRD IE-07: never sized while flooded) and offers Cool Down first. The page
(src/pages/tools/SayNo.tsx) asks who first (PersonPicker, people.md): someone on the safety route gets the safety
screen and never this skill; *it tends to go badly* comes in as `$ctx.frame = heads_up` (keep it short and written).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)

ID = "say_no"
TOOL_ID = "say-no"
CONCEPT = "dbt_saying_no"
VERSION = "say-no-v1"
OWN_MAX = 140


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def has(field, v):
    return {"has": [a(field) + ".ids", v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
HEADS_UP = {"eq": ["$ctx.frame", "heads_up"]}
# PRD IE-04 step 3, and its open question answered with its recommendation: anything sexual or physical always gets
# *No is enough*, pressure or not; so does *I'm scared of what they'd do*, whatever they asked.
ENOUGH = {"any": [is_("asking", "physical"), has("pressure", "scared")]}
OTHER_PERSON = [{"variant": "other_person", "when": has("pressure", "scared")}]
# No is enough shows them on every screen, whichever way it was reached (sexual or physical can be coercion).
OTHER_PERSON_ENOUGH = [{"variant": "other_person", "when": ENOUGH}]
SIZED = {"set": a("f_cost")}

PICKER_KEYS = [
    "personWhoSayNo", "personNew", "personNameLabel", "personNameHint", "personRoleLabel", "personKeepLine", "personNoNameLine",
    "personSignedOutLine", "personGoOn", "personChanged", "personChangedHint", "safeQuestion", "safeYes", "safeNo",
    "safeUnsure", "riskQuestion", "riskHarm", "riskBadly", "riskUnsaid",
    "safetyRouteSayNoHeading", "safetyRouteBody", "safetyRouteEnding", "safetyRouteBack",
]
PICKER_COPY = {f"picker_{k}": DM.SAFETY_COPY[k] for k in PICKER_KEYS}

# The levels, softest to firmest (IE-07's "no" column; Handout 8). The screen names the level, never a score.
LEVELS = ["yes_part", "gentle", "offer", "firm", "firm_hold"]
LEVEL_LINES = {
    "yes_part": "The facts lean toward yes, or yes to part of it. It's still your call.",
    "gentle": "Say no gently, or say not yet.",
    "offer": "Say no, and offer something else if you want to.",
    "firm": "Say no firmly, and hold it if they push.",
    "firm_hold": "Say no firmly, and don't reconsider.",
}
# Five yes / not sure / no questions, each phrased so *yes* leans toward refusing (Handout 8's factors for saying no:
# capability, values, rights, give and take, long-term goals). *Not sure* counts half; the nudge counts one step.
FACTORS = [
    ("f_cost", "f_cost_q", "Would saying yes cost you something you can't spare, like time, money or energy?"),
    ("f_values", "f_values_q", "Would saying yes go against what matters to you?"),
    ("f_fair", "f_fair_q", "Is it more than they have a right to ask of you?"),
    ("f_given", "f_given_q", "Have you already given a lot in this relationship lately?"),
    ("f_later", "f_later_q", "Would a yes now make things harder later, for you or for them?"),
]
WEIGHTS = {"yes": 1, "not_sure": 0.5, "no": 0, "softer": -1, "right": 0, "firmer": 1}
TABLE = {"-1": "yes_part", "1.5": "gentle", "2.5": "offer", "3.5": "firm", "4.5": "firm_hold"}

COPY = {
    "ask_title": "What are they asking for?",
    "ask_hint": "You're allowed to say no. You don't owe anyone a script.",
    "ask_own": "Something else",
    "cool_down": "Settle my body first",
    "talk_now": "Talk to someone now",
    "pressure_title": "What do you think happens if you say no?",
    "pressure_hint": "Pick any that fit.",
    "enough_title": "No is enough.",
    "enough_hint": "You don't have to explain, or be nice about it. Pick the line you'd use.",
    "enough_card_title": "Your line",
    "why_title": "What matters most to you here?",
    "why_hint": "Pick the one that matters most.",
    "firm_title": "A few questions to size it.",
    "firm_hint": "Yes, no or not sure. There's no right answer.",
    "level_hint": "From what you said.",
    "nudge_label": "Does that sit right?",
    "compose_title": "Put your no together.",
    "compose_title_warm": "Put your no together. A warm line first can help it land.",
    "compose_title_self": "Put your no together. One reason at most, and no extra sorry.",
    "compose_title_heads_up": "Keep it short, written, and about one thing.",
    "compose_title_flooded": "Your body's running hot. Your no can still go, short and plain.",
    "opener_label": "A warm line first (optional)",
    "no_label": "Your no",
    "reason_label": "One reason (optional)",
    "reason_hint": "You don't have to justify it. One reason at most.",
    "alt_label": "Something else you could offer (optional)",
    "own_line": "In my own words",
    "message_title": "Here's your no.",
    "repeat_label": "If they push, say it again:",
    "sorry_line": "There's a sorry in there. You don't owe one for saying no.",
    "drop_sorry": "Take the sorry out",
    "explain_line": "One reason is enough. A long one can sound like it's up for debate.",
    "copy": "Copy",
    "copied": "Copied",
    "selected": "Selected. Copy it from here.",
    "open_messages": "Open messages",
    "next": "Next",
    "done": "Done",
    "predict_title": "How do you think they'll take it?",
    "sure_label": "How sure are you?",
    "how_label": "How will you say it?",
    "again_label": "Want me to ask how it went?",
    # Hand-offs
    "sent_line": "Your no is ready. When you say it is up to you.",
    "sent_line_push": "If they push, say the same line again. You don't need a new reason.",
    "sent_line_in_person": "Saying it out loud a couple of times first can help it come out steady.",
    "enough_line": "Your safety comes first. Somewhere safe, then your line. The people below can help, any time.",
    # Afterwards (the no_outcome card reopens the run here)
    "said_title": "Did you say no?",
    "held_title": "Did it hold when they pushed?",
    "proud_title": "Are you proud of how you handled it?",
    "proud_hint": "However it went.",
    "held_line_proud": "You said no, and it held. That's the skill working.",
    "held_line": "You said no, and it held.",
    "no_push_line": "You said no, and they took it. Not every no gets pushed on.",
    "gave_in_line": "That happens. Your line is still here if you want it again.",
    "gave_in_guilt": "If guilt is what pulled you back, checking the facts can help. Guilt about a fair no often doesn't fit.",
    "not_said_line": "Not this time. Your line is still here when you want it.",
    "partly_line": "A maybe buys time. When you're ready, your no is still here.",
    **{f"level_{k}": v for k, v in LEVEL_LINES.items()},
    **{q: text for _, q, text in FACTORS},
    **PICKER_COPY,
}

ASKING = [
    ("time", "My time"),
    ("money", "Money"),
    ("favour", "A favour"),
    ("listen", "To listen or help, again"),
    ("physical", "Something sexual or physical"),
    ("values", "Something against my values"),
    ("plans", "To change my plans"),
    ("take_back", "To take back a yes I gave"),
]
PRESSURE = [
    ("disappointed", "They'll be disappointed"),
    ("angry", "They'll be angry"),
    ("push", "They'll keep pushing"),
    ("scared", "I'm scared of what they'd do"),
    ("hard", "Nothing much. It's hard anyway"),
]
WHY = [
    ("keep_no", "Keeping my no"),
    ("them_ok", "Them still feeling okay about me"),
    ("me_ok", "Me feeling okay about me"),
]
FACTOR_ANSWERS = [("yes", "Yes"), ("not_sure", "Not sure"), ("no", "No")]
NUDGE = [("right", "That fits"), ("softer", "A bit softer"), ("firmer", "A bit firmer")]
SAFE_LINES = [("safe_no", "No."), ("safe_not_doing", "I'm not doing that."), ("safe_leaving", "I'm leaving now.")]
OPENERS = [
    ("op_matters", "I know this matters to you."),
    ("op_thanks", "Thanks for thinking of me."),
    ("op_care", "I care about you."),
]
# The no, by level (the props say which levels each line fits; any line shows when the sizing was skipped).
NO_LINES = [
    ("no_plain", "No.", ["firm", "firm_hold"]),
    ("no_not_doing", "No, I'm not going to do that.", ["firm", "firm_hold"]),
    ("no_doesnt_work", "That doesn't work for me.", ["offer", "firm", "firm_hold"]),
    ("no_cant", "I can't do that.", ["gentle", "offer", "firm"]),
    ("no_rather_not", "I'd rather not.", ["yes_part", "gentle"]),
    ("no_not_this_time", "Not this time.", ["yes_part", "gentle", "offer"]),
    ("no_not_yet", "Let me think about it, and I'll get back to you.", ["yes_part", "gentle"]),
    ("no_part", "I can do part of it, not all of it.", ["yes_part", "gentle"]),
]
REASONS = [
    ("r_time", "I don't have the time right now."),
    ("r_full", "I've got too much on."),
    ("r_sit", "It doesn't sit right with me."),
    ("r_self", "I need to look after myself right now."),
]
ALTS = [
    ("alt_smaller", "I could do something smaller."),
    ("alt_later", "I could help another time."),
    ("alt_someone", "I could help you find someone else."),
]
PREDICT = [("well", "Fine"), ("mixed", "Mixed"), ("badly", "Badly"), ("push", "They'll keep pushing")]
SURE = [("sure", "Sure"), ("think_so", "Think so"), ("not_sure", "Not sure")]
HOW = [("message", "In a message"), ("in_person", "In person")]
# The no_outcome card's window chips (scripts/practice-spine/content.py no_outcome). No chip: no card.
AGAIN = [("today", "This evening"), ("tomorrow", "Tomorrow"), ("this_week", "In a few days")]
SAID = [("yes", "Yes"), ("partly", "I said maybe"), ("no", "Not yet")]
HELD = [("yes", "Yes"), ("gave_in", "I gave in"), ("no_push", "They didn't push")]
PROUD = [("yes", "Yes"), ("sort_of", "Sort of"), ("no", "No")]

LEVEL_TITLES = [{"key": f"level_{k}", "when": {"eq": ["$d.level", k]}} for k in reversed(LEVELS)]
NO_WHERE = {"any": [{"not": SIZED}, {"has": ["$opt.levels", "$d.final"]}]}
AFTER_FIELDS = ["said", "held", "proud"]

STEPS = [
    {
        "id": "ask", "kind": "ask", "title": "ask_title", "hint": "ask_hint",
        "fields": [{"id": "asking", "options": {"list": "asking"}, "max": 1, "required": True,
                    "own": {"hint": "ask_own", "countsAsPick": True, "max": 60},
                    "links": [{"exit": "cool_down", "label": "cool_down", "when": FLOODED}]}],
        "next": [{"to": "pressure"}],
    },
    {
        "id": "pressure", "kind": "ask", "title": "pressure_title", "hint": "pressure_hint",
        "fields": [{"id": "pressure", "options": {"list": "pressure"}, "max": 3, "swap": True, "required": True}],
        "crisis": OTHER_PERSON,
        "next": [{"when": ENOUGH, "to": "enough"}, {"when": FLOODED, "to": "compose"}, {"to": "why"}],
    },
    # --- No is enough (PRD IE-04 step 3): no sizing, no reasons, no negotiation ---
    {
        "id": "enough", "kind": "ask", "title": "enough_title", "hint": "enough_hint",
        "fields": [{"id": "safe_line", "options": {"list": "safe_line"}, "max": 1, "required": True}],
        "crisis": OTHER_PERSON_ENOUGH,
        "next": [{"to": "safe_card"}],
    },
    {
        "id": "safe_card", "kind": "embed", "embed": "boundaryLine", "title": "enough_card_title", "answerAs": "safe_copied",
        "props": {"field": "safe_line", "shape": "line", "copyLabel": "copy", "copiedLabel": "copied", "selectedLabel": "selected", "next": "next"},
        "crisis": OTHER_PERSON_ENOUGH,
        "next": [{"to": "safe_end"}],
    },
    {
        "id": "safe_end", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "other_person", "when": ALWAYS}],
        "lines": [{"when": None, "key": "enough_line"}],
        "offers": [{"exit": "safety_open", "when": None}, {"exit": "ending_careful", "when": ENOUGH}],
        "done": "done",
    },
    # --- How firm (IE-07, "no" column) ---
    {
        "id": "why", "kind": "ask", "title": "why_title", "hint": "why_hint",
        "fields": [{"id": "why", "options": {"list": "why"}, "max": 1, "required": True}],
        "next": [{"to": "firm"}],
    },
    {
        "id": "firm", "kind": "ask", "title": "firm_title", "hint": "firm_hint",
        "fields": [{"id": f, "label": q, "options": {"list": "factor"}, "max": 1, "required": True} for f, q, _ in FACTORS],
        "next": [{"to": "level"}],
    },
    {
        "id": "level", "kind": "ask", "title": LEVEL_TITLES, "hint": "level_hint",
        "fields": [{"id": "nudge", "label": "nudge_label", "options": {"list": "nudge"}, "max": 1, "required": True}],
        "next": [{"to": "compose"}],
    },
    # --- The message ---
    {
        "id": "compose", "kind": "ask",
        "title": [{"key": "compose_title_flooded", "when": FLOODED}, {"key": "compose_title_heads_up", "when": HEADS_UP},
                  {"key": "compose_title_warm", "when": is_("why", "them_ok")},
                  {"key": "compose_title_self", "when": is_("why", "me_ok")}, {"key": "compose_title"}],
        "fields": [
            {"id": "opener", "label": "opener_label", "options": {"list": "opener"}, "max": 1,
             "own": {"hint": "own_line", "countsAsPick": True, "max": 60}},
            {"id": "no", "label": "no_label", "options": {"list": "no", "where": NO_WHERE}, "max": 1, "required": True,
             "own": {"hint": "own_line", "countsAsPick": True, "max": 90}},
            {"id": "reason", "label": "reason_label", "options": {"list": "reason"}, "max": 1,
             "own": {"hint": "reason_hint", "countsAsPick": True, "max": 90}},
            {"id": "alt", "label": "alt_label", "options": {"list": "alt"}, "max": 1,
             "own": {"hint": "own_line", "countsAsPick": True, "max": 60}},
        ],
        "next": [{"to": "message"}],
    },
    {
        "id": "message", "kind": "embed", "embed": "messageComposer", "title": "message_title", "answerAs": "sent_how",
        "props": {"field": "no", "opener": "opener", "reason": "reason", "alt": "alt", "repeatLabel": "repeat_label",
                  "sorryLine": "sorry_line", "dropSorry": "drop_sorry", "explainLine": "explain_line",
                  "copyLabel": "copy", "copiedLabel": "copied", "selectedLabel": "selected", "openLabel": "open_messages",
                  "next": "next"},
        "next": [{"to": "predict"}],
    },
    {
        "id": "predict", "kind": "ask", "title": "predict_title",
        "fields": [
            {"id": "predict", "options": {"list": "predict"}, "max": 1, "required": True},
            {"id": "sure", "label": "sure_label", "options": {"list": "sure"}, "max": 1},
            {"id": "how", "label": "how_label", "options": {"list": "how"}, "max": 1},
        ],
        "next": [{"to": "sent"}],
    },
    {
        "id": "sent", "kind": "handoff", "complete": True,
        "lines": [{"when": is_("predict", "push"), "key": "sent_line_push"},
                  {"when": is_("how", "in_person"), "key": "sent_line_in_person"},
                  {"when": None, "key": "sent_line"}],
        "fields": [{"id": "again", "label": "again_label", "max": 1, "options": {"list": "again"}}],
        "followUp": {"type": "no_outcome", "whenFrom": "again"},
        "offers": [{"exit": "rehearse", "when": is_("how", "in_person")}],
        "done": "done",
    },
    # --- Afterwards: the no_outcome card reopens the run here (R9) ---
    {
        "id": "said", "kind": "ask", "reopens": {"after": "sent"}, "clears": AFTER_FIELDS, "title": "said_title",
        "fields": [{"id": "said", "options": {"list": "said"}, "max": 1, "required": True}],
        "next": [{"when": is_("said", "no"), "to": "not_said"}, {"when": is_("said", "partly"), "to": "partly"}, {"to": "held"}],
    },
    {
        "id": "held", "kind": "ask", "title": "held_title",
        "fields": [{"id": "held", "options": {"list": "held"}, "max": 1, "required": True}],
        "next": [{"when": is_("held", "gave_in"), "to": "gave_in"}, {"to": "proud"}],
    },
    {
        "id": "proud", "kind": "ask", "title": "proud_title", "hint": "proud_hint",
        "fields": [{"id": "proud", "options": {"list": "proud"}, "max": 1, "required": True}],
        "next": [{"to": "held_end"}],
    },
    {
        "id": "held_end", "kind": "handoff", "complete": True,
        "lines": [{"when": is_("held", "no_push"), "key": "no_push_line"},
                  {"when": is_("proud", "yes"), "key": "held_line_proud"},
                  {"when": None, "key": "held_line"}],
        "offers": [{"exit": "fast", "when": is_("proud", "no")}],
        "done": "done",
    },
    {
        # Accepted flatly (PRD IE-04 step 8), then a rehearsal and, for the guilt that pulls a no back, Check the Facts.
        "id": "gave_in", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "gave_in_line"}, {"when": None, "key": "gave_in_guilt"}],
        "offers": [{"exit": "rehearse", "when": None}, {"exit": "check_the_facts", "when": None}],
        "done": "done",
    },
    {
        "id": "not_said", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "not_said_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "partly", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "partly_line"}],
        "offers": [], "done": "done",
    },
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "fast", "toolId": "fast"},
    {"id": "check_the_facts", "toolId": "check-the-facts"},
    {"id": "rehearse", "toolId": "rehearse", "planned": True},
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    out = [("asking", v, l, {}, None) for v, l in ASKING]
    out += [("pressure", v, l, {"danger": "other"} if v == "scared" else {}, None) for v, l in PRESSURE]
    out += [("why", v, l, {}, None) for v, l in WHY]
    out += [("factor", v, l, {}, None) for v, l in FACTOR_ANSWERS]
    out += [("nudge", v, l, {}, None) for v, l in NUDGE]
    out += [("safe_line", v, l, {}, None) for v, l in SAFE_LINES]
    out += [("opener", v, l, {}, None) for v, l in OPENERS]
    out += [("no", v, l, {"levels": lv}, None) for v, l, lv in NO_LINES]
    out += [("reason", v, l, {}, None) for v, l in REASONS]
    out += [("alt", v, l, {}, None) for v, l in ALTS]
    out += [("predict", v, l, {}, None) for v, l in PREDICT]
    out += [("sure", v, l, {}, None) for v, l in SURE]
    out += [("how", v, l, {}, None) for v, l in HOW]
    out += [("again", v, l, {}, None) for v, l in AGAIN]
    out += [("said", v, l, {}, None) for v, l in SAID]
    out += [("held", v, l, {}, None) for v, l in HELD]
    out += [("proud", v, l, {}, None) for v, l in PROUD]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "ask", "ownMax": OWN_MAX,
    "accepts": ["personId", "frame", "band"], "copy": COPY,
    "tables": {"level": TABLE},
    "derive": [
        {"name": "level", "kind": "count", "fields": [f for f, _, _ in FACTORS], "weights": WEIGHTS, "table": "level"},
        {"name": "final", "kind": "count", "fields": [f for f, _, _ in FACTORS] + ["nudge"], "weights": WEIGHTS, "table": "level"},
    ],
    "steps": STEPS, "exits": EXITS, "options": options(), "emotionFields": [],
}
