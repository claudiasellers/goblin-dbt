"""Ride it out (DT-05; urge surfing, MBRP; DBT DT Handout 21 adaptive denial, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD DT-05 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): an urge that won't settle, when the person isn't about to act this second (that's
Hold to wait) but needs to get through the next stretch. The urge is an object on the screen, watched, not fought
(`urgeWave`): every so often a soft check (*still here · fading · gone · bigger*) and the object answers. No digits,
no countdown, nothing promises how long it lasts. *Tell it: not now* (adaptive denial, H21) is on the screen the whole
time: something else instead, and a five-minute round. *Bigger* twice changes the modality (the body, or Hold to
wait). The close draws the wave as a shape without axes (`waveTrace`), then the two-part close (R7: *Did you act on
it?*, then-vs-now). docs/design/ride-it-out.md lists what this batch defers and where it departs from the PRD.

Safety (plan C6):
- **Hurt myself goes to safety.open first** (C6.5, as in Hold to wait and the PRD's risk line: "DT-05 entered
  directly with a self-harm urge applies the same step"): the resources open over the next screen, then one plain
  question; not sure or no ends on someone to talk to, with nothing to ride. Safe for now rides with the crisis banner
  on every screen and ends on its own card, with no *did you act on it?*.
- **Flooded first gets the body** (PRD capacity branching): a carried flooded reading gets a heads-up and a choice,
  the body or Hold to wait first, or ride now. Nothing locks; *This is too much right now* sits under every screen.
- **No durations** (PRD: "promised durations (banned)"). The wave never shows a number, and no line says how long an
  urge lasts or that it will pass. The only clock is the five-minute *not now* round the person starts.
- No swap is food, drink, shopping or scrolling (C6.7): the PRD's *a mint · a cold fizzy drink · something sour* are
  left out, since *Use, drink, binge or buy* is one of the pulls.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

from hold_to_wait import PULLS, SAFE

ID = "ride_it_out"
TOOL_ID = "urge-surfing"
CONCEPT = "urge_surfing"
VERSION = "ro-v1"
OWN_MAX = 90  # one line: the pull in their words

COPY = {
    "pull_title": "What's the urge?",
    "pull_hint": "Pick the closest. There's no wrong answer here.",
    "pull_own": "Say it your way",
    # Hurt myself (C6.5): after the resources, the same plain question as Hold to wait (CORE-01 owns the wording).
    "safe_title": "Thank you for saying it. Right now, are you safe from acting on it?",
    "safe_hint": "You can answer honestly. Whatever you say, the support stays on the screen.",
    # A carried flooded reading (PRD: flooded → DT-01 press or DT-02 hold first, then ride).
    "heads_up_title": "Your body's loud right now. It can help to settle it first.",
    "heads_up_hint": "You can settle your body first, or ride it now.",
    "settle_line": "Settle first. Ride it out is here when you're ready.",
    # Hurt myself with a flooded reading: no ride, the body first (as Hold to wait's `next_hurt_flooded`).
    "settle_hurt": "Your body's loud. Settle it first. If the pull comes back, your support is right here.",
    # Hurt myself and getting bigger: ask again before anything else (S9, C6.5).
    "safe_again_title": "It's getting stronger. Right now, are you still safe from acting on it?",
    # The ride (urgeWave). PRD step 2's opening line, word for word: no durations.
    "ride_title": "Urges rise and fall. The job is not to act while it's high.",
    # Leave can be how someone gets safe (Gate 3, as DT-10's leave note): said before the ride asks them not to.
    "ride_title_leave": "Urges rise and fall. If you need to get away to be safe, go. This is for when you don't.",
    "ride_again_title": "Back to watching it.",
    "riding": "Watch it. You don't have to do anything with it.",
    "check_title": "How is it now?",
    "still_here": "Still here",
    "fading": "Fading",
    "gone": "Gone",
    "bigger": "Bigger",
    "not_now": "Tell it: not now",
    "ride_next": "Stop here",
    # Bigger twice (PRD step 3): change the modality.
    "bigger_title": "It's getting bigger. Want to try something else for a bit?",
    "bigger_hint": "When it keeps growing, changing what you're doing can help.",
    # Not now (PRD step 4, H21).
    "not_now_title": "Tell it: not now. Want something else instead?",
    "not_now_hint": "Pick one, or five minutes with nothing else.",
    "round_title": "Not now. Five minutes.",
    "round_walk": "Not now. A walk for five minutes, even round the room.",
    "round_wash": "Not now. Cool water on your hands, then five minutes.",
    "round_call": "Not now. Call or text someone safe for five minutes.",
    "round_cold": "Not now. Hold something cool for five minutes.",
    "round_squeeze": "Not now. Squeeze a pillow or a ball for five minutes.",
    "round_phone": "Not now. Phone in another room for five minutes.",
    "round_hands": "Not now. Give your hands a job for five minutes.",
    "round_start": "Start five minutes",
    "round_running": "Not now",
    "round_lead": "Get ready",
    "round_done": "That's five minutes.",
    "round_next": "Next",
    "after_round_title": "How is it now?",
    "after_round_hint": "Any answer is fine.",
    # The close's picture (waveTrace): the wave as a shape without axes.
    "shape_title": "Here's the wave you rode.",
    "shape_down": "It came down.",
    # Only when the trace went up before it came down (Gate 3, T7: say what was seen).
    "shape_rise": "It rose, crested and came down.",
    "shape_held": "You rode it as far as it went today.",
    "shape_next": "Next",
    # The switch (bigger twice): the body or Hold to wait, offered.
    "switch_line": "Let's change what you're doing. Your body first, or a way to wait.",
    "switch_line_hurt": "Let's change what you're doing. Something for your body first. Your support is still here.",
    # The end card.
    "end_gone": "You watched it come down.",
    "end_passed": "You told it not now, and it eased.",
    "end_line": "You stayed with it. That's the skill.",
    # Hurt myself, safe for now: its own end card, with no "did you act on it?".
    "hurt_end_line": "You stayed with it. The support is still here if it comes back.",
    "reach_line": "Please reach out to someone now, using the support on this screen. You don't have to hold this alone.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
HURT = {"eq": [a("pull"), "hurt"]}
UNSAFE = {"any": [{"in": [a("safe"), ["unsure", "no"]]}, {"in": [a("safe_again"), ["unsure", "no"]]}]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
CRISIS = [{"variant": "crisis", "when": {"any": [HURT, UNSAFE]}}]
URGES = ["send", "check", "hurt", "hit", "leave", "use"]
OWN_PULL = {"not": {"in": [a("pull"), URGES]}}
# A use or check pull that keeps coming back as a habit: a plan made in calm (DT-09).
HABIT_OFFER = {"exit": "habit_plan", "when": {"in": [a("pull"), ["use", "check"]]}}

SAMPLES = ["still_here", "fading", "gone", "bigger"]


def ended(field, how):
    return {"has": [f"$a.{field}.ids", how]}


def sampled(field):
    """The ride has at least one check answered (so its wave has a shape to draw)."""
    return {"any": [ended(field, s) for s in SAMPLES]}


# T8: two choices at most on a flooded reading. The settle card offers Hold to wait beside the body.
HEADS_UP = [
    ("body", "My body first"),
    ("now", "Ride it now"),
]
BIGGER = [
    ("body", "Something for my body"),
    ("hold", "A way to wait"),
    ("keep", "Keep riding it"),
]
# Not now's swaps (H21 adaptive denial: something else instead), per pull; `other` for own words. Never food, drink,
# shopping or scrolling (C6.7). Each has its own round title (`round_<id>`).
EVERY = [*URGES, "other"]
SWAPS = [
    ("walk", "A walk, even round the room", EVERY),
    # Cool, not cold, and hands only: cold on the face is First, the body's, after its self-check (D4). No cold or
    # squeeze for hurt myself (Gate 3: a sensation substitute keeps the pattern going) or use (bingeing is in it).
    ("wash", "Cool water on my hands", EVERY),
    ("call", "Call or text someone safe", ["check", "hurt", "hit", "leave", "use", "other"]),  # not send: texting is the pull
    ("cold", "Hold something cool", ["hit"]),
    ("squeeze", "Squeeze a pillow or a ball", ["hit"]),
    ("phone", "Put the phone in another room", ["send", "check"]),
    ("hands", "Give my hands a job", ["send", "check", "use", "other"]),
    ("just_wait", "Five minutes, nothing else", EVERY),
]
AFTER_ROUND = [
    ("passed", "Gone or fading"),
    ("again", "Five more minutes"),
    ("still", "Still here"),
]
PER_PULL = {"any": [
    *[{"all": [{"eq": [a("pull"), u]}, {"eq": [f"$opt.{u}", True]}]} for u in URGES],
    {"all": [OWN_PULL, {"eq": ["$opt.other", True]}]},
]}
ROUND_TITLE = [*[{"when": {"eq": [a("swap"), v]}, "key": f"round_{v}"} for v, _, _ in SWAPS if v != "just_wait"],
               {"key": "round_title"}]


def wave(step_id, answer_as, title, not_now, nxt, leave_title=None):
    props = {"checkSec": 75, "maxChecks": 10, "checkTitle": "check_title", "riding": "riding",
             **{s: s for s in SAMPLES}, "next": "ride_next"}
    if not_now:
        props["notNow"] = "not_now"
    else:
        props["continueFrom"] = "ride"  # the second ride's object starts where the first left it
    if leave_title:
        title = [{"when": {"eq": [a("pull"), "leave"]}, "key": leave_title}, {"key": title}]
    return {"id": step_id, "kind": "embed", "embed": "urgeWave", "answerAs": answer_as, "title": title,
            "crisis": CRISIS, "links": [SAFETY_LINK], "props": props, "next": nxt}


def to_end():
    """Where a ride goes once it's over: hurt myself to its own card, else the end card."""
    return [{"when": HURT, "to": "hurt_end"}, {"to": "end"}]


def round_step(step_id, nxt):
    return {"id": step_id, "kind": "embed", "embed": "doseTimer", "title": ROUND_TITLE, "crisis": CRISIS,
            "links": [SAFETY_LINK],
            "props": {"art": "none", "seconds": 300, "leadIn": 3, "start": "round_start", "running": "round_running",
                      "lead": "round_lead", "done": "round_done", "next": "round_next"},
            "next": nxt}


def after_round(step_id, again_to):
    return {"id": step_id, "kind": "ask", "title": "after_round_title", "hint": "after_round_hint", "crisis": CRISIS,
            "fields": [{"id": step_id, "options": {"list": "after_round"}, "max": 1, "required": True,
                        "links": [SAFETY_LINK]}],
            "next": [{"when": {"all": [{"eq": [a(step_id), "passed"]}, HURT]}, "to": "hurt_end"},
                     # It passed: the wave that came before the round is drawn first (PRD step 5), if there was one.
                     {"when": {"all": [{"eq": [a(step_id), "passed"]}, sampled("ride")]}, "to": "shape"},
                     {"when": {"eq": [a(step_id), "passed"]}, "to": "passed"},
                     {"when": {"eq": [a(step_id), "again"]}, "to": again_to},
                     {"to": "ride2"}]}


STEPS = [
    {
        "id": "pull", "kind": "ask", "title": "pull_title", "hint": "pull_hint", "crisis": CRISIS,
        "fields": [{"id": "pull", "options": {"list": "pull"}, "max": 1, "required": True,
                    "own": {"hint": "pull_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"when": HURT, "to": "safe"}, {"when": FLOODED, "to": "heads_up"}, {"to": "ride"}],
    },
    {
        # Hurt myself (C6.5): the resources open over this screen as it arrives, before anything else.
        "id": "safe", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "crisis": CRISIS,
        "safetyFirst": ALWAYS,
        "fields": [{"id": "safe", "options": {"list": "safe"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        # Hurt myself with a flooded reading: the body first, no ride (as Hold to wait).
        "next": [{"when": UNSAFE, "to": "reach"}, {"when": FLOODED, "to": "settle"}, {"to": "ride"}],
    },
    {
        # Hurt myself and bigger twice: are you still safe?, with the resources opened again, before anything else.
        "id": "safe_again", "kind": "ask", "title": "safe_again_title", "hint": "safe_hint", "crisis": CRISIS,
        "safetyFirst": ALWAYS,
        "fields": [{"id": "safe_again", "options": {"list": "safe"}, "max": 1, "required": True,
                    "links": [SAFETY_LINK]}],
        "next": [{"when": UNSAFE, "to": "reach"}, {"to": "switch"}],
    },
    {
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint", "crisis": CRISIS,
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True,
                    "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("heads_up"), "body"]}, "to": "settle"}, {"to": "ride"}],
    },
    wave("ride", "ride", "ride_title", True, [
        # Hurt myself getting bigger: are you still safe? first, never a choice of exercises (S9).
        {"when": {"all": [ended("ride", "ended_bigger"), HURT]}, "to": "safe_again"},
        {"when": ended("ride", "ended_bigger"), "to": "bigger"},
        {"when": ended("ride", "ended_not_now"), "to": "not_now"},
        {"when": sampled("ride"), "to": "shape"},
        *to_end(),
    ], leave_title="ride_title_leave"),
    {
        # Bigger twice in a row (PRD step 3): change the modality, or keep riding. Never reached after hurt myself.
        "id": "bigger", "kind": "ask", "title": "bigger_title", "hint": "bigger_hint", "crisis": CRISIS,
        "fields": [{"id": "bigger", "options": {"list": "bigger"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("bigger"), "keep"]}, "to": "ride2"}, {"to": "switch"}],
    },
    {
        "id": "not_now", "kind": "ask", "title": "not_now_title", "hint": "not_now_hint", "crisis": CRISIS,
        "fields": [{"id": "swap", "options": {"list": "swap", "where": PER_PULL}, "max": 1, "required": True,
                    "links": [SAFETY_LINK]}],
        "next": [{"to": "round"}],
    },
    round_step("round", [{"to": "after_round"}]),
    after_round("after_round", "round2"),
    # A renewed round (PRD: "a 5-minute *not now* round that can be renewed"), once; after it, the wave again.
    round_step("round2", [{"to": "after_round2"}]),
    {
        "id": "after_round2", "kind": "ask", "title": "after_round_title", "hint": "after_round_hint", "crisis": CRISIS,
        "fields": [{"id": "after_round2", "options": {"list": "after_round", "where": {"not": {"eq": ["$opt.again", True]}}},
                    "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"all": [{"eq": [a("after_round2"), "passed"]}, HURT]}, "to": "hurt_end"},
                 {"when": {"all": [{"eq": [a("after_round2"), "passed"]}, sampled("ride")]}, "to": "shape"},
                 {"when": {"eq": [a("after_round2"), "passed"]}, "to": "passed"}, {"to": "ride2"}],
    },
    # The second ride: no *not now* button (a round was had, or *keep riding* was picked); bigger twice again goes to
    # the switch, whatever was picked before.
    wave("ride2", "again", "ride_again_title", False, [
        {"when": {"all": [ended("again", "ended_bigger"), HURT]}, "to": "safe_again"},
        {"when": ended("again", "ended_bigger"), "to": "switch"},
        {"when": {"any": [sampled("ride"), sampled("again")]}, "to": "shape"},
        *to_end(),
    ]),
    {
        # The close's picture (PRD step 5): the wave as a shape without axes, and its line.
        "id": "shape", "kind": "embed", "embed": "waveTrace", "answerAs": "shape", "title": "shape_title",
        "crisis": CRISIS, "links": [SAFETY_LINK],
        "props": {"rideField": "ride", "againField": "again", "downLine": "shape_down", "riseLine": "shape_rise",
                  "heldLine": "shape_held",
                  "next": "shape_next"},
        "next": [{"when": HURT, "to": "hurt_end"},
                 {"when": {"any": [{"eq": [a("after_round"), "passed"]}, {"eq": [a("after_round2"), "passed"]}]}, "to": "passed"},
                 {"to": "end"}],
    },
    {
        # Not now worked: the round passed. Straight to the end card (the wave has nothing new to draw).
        "id": "passed", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "end_passed"}],
        "offers": [{"exit": "pros_cons", "when": ALWAYS}, HABIT_OFFER],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        "id": "end", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [
            {"when": {"any": [ended("ride", "ended_gone"), ended("again", "ended_gone")]}, "key": "end_gone"},
            {"when": ALWAYS, "key": "end_line"},
        ],
        # A pull that keeps coming back: make it a card, for next time (DT-10), or a habit plan (DT-09).
        "offers": [{"exit": "pros_cons", "when": ALWAYS}, HABIT_OFFER],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Bigger twice: the body (DT-01) or Hold to wait (DT-02), the modality changed. Hurt myself: the body only, as
        # Hold to wait's own hurt path ends there.
        "id": "switch", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "noClose": True,
        "lines": [{"when": HURT, "key": "switch_line_hurt"}, {"when": ALWAYS, "key": "switch_line"}],
        "offers": [{"exit": "cool_down", "when": ALWAYS},
                   {"exit": "pause", "when": {"not": HURT}}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        "id": "settle", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": HURT, "key": "settle_hurt"}, {"when": ALWAYS, "key": "settle_line"}],
        # The body first (PRD: DT-01 press or DT-02 hold first); Hold to wait beside it, never after hurt myself.
        "offers": [{"exit": "cool_down", "when": ALWAYS}, {"exit": "pause", "when": {"not": HURT}}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Hurt myself, safe for now: its own end card, with no "did you act on it?" (as in Hold to wait).
        "id": "hurt_end", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "hurt_end_line"}],
        "offers": [{"exit": "safety_open", "when": ALWAYS}, {"exit": "cool_down", "when": ALWAYS}, {"exit": "crisis_kit", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Not safe or not sure: someone to talk to first (S9), nothing to ride.
        "id": "reach", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "reach_line"}],
        # People first, then the kit (DT-03): coping sits beside help, never before it (CORE-01's rule).
        "offers": [{"exit": "safety_open", "when": ALWAYS}, {"exit": "crisis_kit", "when": ALWAYS}],
        "done": "done",
    },
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body (bigger twice, flooded)
    {"id": "pause", "toolId": "pause"},                                  # DT-02 Hold to wait (bigger twice, flooded)
    {"id": "pros_cons", "toolId": "pros-cons"},                          # DT-10 a card for a pull that keeps coming back
    {"id": "habit_plan", "toolId": "habit-plan"},                        # DT-09 When it's a habit (use, check)
    {"id": "crisis_kit", "toolId": "crisis-kit", "query": {"frame": "crisis"}},       # DT-03 My crisis kit, opened from a crisis route (the banner on every card)
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("pull", v, label, props, None) for v, label, props in PULLS]
    out += [("safe", v, label, props, None) for v, label, props in SAFE]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("bigger", v, label, {}, None) for v, label in BIGGER]
    out += [("swap", v, label, {u: True for u in pulls}, None) for v, label, pulls in SWAPS]
    out += [("after_round", v, label, {"again": v == "again"}, None) for v, label in AFTER_ROUND]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "pull", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2). A host's pull (`urgeId`, Hold to wait's *Ride it out*) waits for
    # the hosts batch, as DT-10's does.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
