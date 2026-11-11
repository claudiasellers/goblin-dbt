"""Hold to wait (DT-02, STOP rebuilt; DBT DT Handout 4, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD DT-02 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md" §5;
copy in /mnt/project-files/handoffs/prds/): name what's pulling, hold the urge with the hand (S), take one step
back (T), notice the body and the facts (O), pick what matters and one next move (P), then the two-part close
(*Did you act on it?*, then the pull now). It replaces the old Pause page under the same tool id (`pause`, named
"Hold to wait", D6). docs/design/hold-to-wait.md lists what this batch defers and why, and where it departs from
the PRD.

Safety (plan C6):
- **Hurt myself goes to safety.open first** (C6.5, D5): the chip sits on the first row; on Next the resources open
  over the skill before anything else (`safetyFirst`), and when the person comes back to it, one plain question
  asks whether they're safe right now, with the resources on the screen. From then on the crisis banner stays
  on every screen. Not sure or no: straight to someone to talk to, nothing offered in its place (S9), no close
  question. Safe for now: the skill goes on, with no phone-down step, and ends on its own card with no "did you act
  on it?".
- **Nothing locks.** The hold has a way past after the first try; putting the phone down starts a wait with
  *I'm back* always there. *This is too much right now* sits under every screen (the player).
- **No band asked** (C6.2): a carried flooded reading takes the short path (hold, step back, then the body first,
  with a come-back on Today); otherwise the standard path.
- Every move is a step to take, never food, drink, shopping or scrolling (C6.7).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "hold_to_wait"
TOOL_ID = "pause"
CONCEPT = "dbt_stop"
VERSION = "hw-v1"
OWN_MAX = 90  # one line: the pull in their words

COPY = {
    # Screen 1: what's pulling (PRD step 1). Hurt myself is on the first row (D5): hiding it signals shame.
    "pull_title": "What's pulling at you?",
    "pull_hint": "Pick the closest. There's no wrong answer here.",
    "pull_own": "Say it your way",
    # Hurt myself (C6.5): after the resources, one plain question (CORE-01 owns the wording; this is its interim).
    "safe_title": "Thank you for saying it. Right now, are you safe from acting on it?",
    "safe_hint": "You can answer honestly. Whatever you say, the support stays on the screen.",
    # Screen 2: S, stop. The witness line, then the hand gets a job (PRD step 2).
    "hold_title": "That's a strong pull. It makes sense it's this strong.",
    "hold_title_flooded": "Your body's loud. Hold here for a moment.",
    "hold_label": "Hold here",
    "hold_running": "Your hand has a job now",
    "hold_hint": "Press and hold the circle. Letting go early still counts.",
    "hold_done": "Held.",
    # Screen 3: T, take a step back (PRD step 3).
    "back_title": "Now take one step back.",
    "back_hint": "Pick one and do it. The screen waits.",
    # The wait (the phone down for ten minutes): never locks; *I'm back* is always there.
    "wait_title": "Phone down. The pull can wait with it.",
    "wait_waiting": "Put the phone face down and come back when you're ready. This screen will still be here.",
    "wait_short": "Waiting",
    "wait_done": "That's the wait. Come back to it when you're ready.",
    "wait_done_short": "Done",
    "wait_back": "I'm back",
    # Screen 4: O, observe (PRD step 4). One tap each, nothing typed, skippable.
    "observe_title": "What do you notice?",
    "observe_hint": "One tap each, or skip it.",
    "body_q": "In your body",
    "fact_q": "What set it off",
    # Screen 5: P, proceed mindfully (PRD step 5).
    "proceed_title": "What matters most right now?",
    "move_q": "One next move",
    # The end card.
    "next_line": "You gave the pull some room. What you do next is yours.",
    "next_later": "Saving it for later is a choice. The message will still be there when you're steadier.",
    "next_tell": "Saying it to someone safe first can take some of the push out of it.",
    "next_phone": "Out of reach is easier than out of mind. That counts.",
    "next_look": "Once, later, at a time you pick. Until then it can wait.",
    "next_step_out": "Step out, and come back when the ten minutes are up.",
    "next_not_now": "Not now is a whole answer. It can come back later and ask again.",
    # The flooded short path: the body first, the rest later (PRD capacity branching).
    "settle_line": "Your body's loud. Settle it first. The rest can wait, and Today will ask you about it later.",
    # Hurt myself, safe for now: the end card, with no "did you act on it?".
    "next_hurt": "You gave it some room. If it comes back, your support is right here.",
    "next_hurt_flooded": "Your body's loud. Settle it first. If the pull comes back, your support is right here.",
    # Not safe or not sure: someone to talk to, first.
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
UNSAFE = {"in": [a("safe"), ["unsure", "no"]]}
PHONE_DOWN = {"eq": [a("step_back"), "phone_down"]}
MOVE = lambda m: {"eq": [a("move"), m]}  # noqa: E731
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
# The crisis banner stays on every screen once hurt myself is picked (PRD step 1: "resources stay in a quiet bar
# for the whole session"; the player shows it above an embed or card, below a question's choices so a tapped chip
# never moves); plan C6.4: the danger options declare it on their own steps.
CRISIS = [{"variant": "crisis", "when": {"any": [HURT, UNSAFE]}}]

# PRD step 1's chips, in its order, with hurt myself on the first row (D5). `urge`: the ActionUrge id the
# session records (spine `urgeIds`; the behaviour urges in schema/opposite-action-data.cypher). Use, drink, binge and buy are one chip and
# one urge id until DT-09's substance scope is decided (D14).
PULLS = [
    ("send", "Send or say something", {"urge": "send"}),
    ("check", "Check their page, or my phone", {"urge": "check"}),
    ("hurt", "Hurt myself", {"urge": "self_harm", "danger": "self"}),
    ("hit", "Hit, throw or slam", {"urge": "hit"}),
    ("leave", "Leave, run or disappear", {"urge": "leave"}),
    ("use", "Use, drink, binge or buy", {"urge": "use"}),
]
SAFE = [
    ("safe", "Yes, I'm safe for now", {}),
    ("unsure", "I'm not sure", {"danger": "self"}),
    ("no", "No", {"danger": "self"}),
]
# PRD step 3. The last one starts the wait and a come-back on Today.
# `calm`: the two shown with a flooded reading (T8: two choices at most). `phone`: never after hurt myself, since it
# would take the support out of reach.
STEP_BACK = [
    ("sit", "Sit down", {"calm": True}),
    ("room", "Leave the room", {}),
    ("outside", "Step outside", {}),
    ("lap", "Hands in my lap", {"calm": True}),
    ("phone_down", "Put the phone down for ten minutes", {"phone": True}),
]
BACK_WHERE = {"any": [
    {"all": [FLOODED, {"eq": ["$opt.calm", True]}]},
    {"all": [{"not": FLOODED}, {"not": {"all": [HURT, {"eq": ["$opt.phone", True]}]}}]},
]}
# PRD step 4 (MF-01's card, as plain chips until it's built).
BODY = [
    ("hot", "Hot"), ("tight", "Tight"), ("shaky", "Shaky"), ("heavy", "Heavy"), ("buzzing", "Buzzing"),
    ("cant_tell", "Can't tell"),
]
FACTS = [
    ("someone", "Someone said or did something"),
    ("saw", "Something I saw"),
    ("thought", "A thought"),
    ("nothing", "Nothing I can point to"),
]
# PRD step 5: IE's three priorities, plus DT's own.
GOALS = [
    ("tonight", "Get through this without making it worse"),
    ("want", "Get what I want"),
    ("relationship", "Keep the relationship"),
    ("self_respect", "Keep my self-respect"),
]
# PRD step 5's urge-specific moves (ProceedOption, FOR_URGE → ActionUrge). `urges`: which pulls offer it (`other`:
# own words, so no pull to match). `exit`: the move hands on to that tool on the end card; a move without one is
# the person's own step, with its own line. Moves into tools not built yet (the kit, Held, Give your mind a job)
# wait as planned exits and aren't offered as chips until their tools ship.
MOVES = [
    ("later", "Save it, and look again when I'm steadier", ["send"], None),
    ("tell", "Tell it to someone safe first", ["send"], None),
    ("ask", "Plan how to ask for it, later", ["send"], "dear_man"),
    ("phone_room", "Put the phone in another room", ["check"], None),
    ("look_once", "Look once, later, at a time I pick", ["check"], None),
    ("cool", "Cool my body down first", ["hit", "use", "hurt", "other"], "cool_down"),
    ("boundary", "Say one line to hold my ground", ["leave"], "fast"),
    ("step_out", "Step out for ten minutes, then come back", ["leave"], None),
    ("ride", "Ride it out", ["use", "other"], "urge_surfing"),
    ("not_now", "Tell it: not now", ["use"], None),
    ("rebel", "Rebel, without the wreckage", ["hit", "leave"], "alternate_rebellion"),
    ("call", "Call or text someone", ["hurt"], "safety_open"),
]
URGES = ["send", "check", "hurt", "hit", "leave", "use"]
# A move shows when it's for the pull picked; with their own words (no pull chip), the `other` moves.
MOVE_WHERE = {"any": [
    *[{"all": [{"eq": [a("pull"), u]}, {"eq": [f"$opt.{u}", True]}]} for u in URGES],
    {"all": [{"not": {"in": [a("pull"), URGES]}}, {"eq": ["$opt.other", True]}]},
]}
MOVE_LINES = {"later": "next_later", "tell": "next_tell", "phone_room": "next_phone", "look_once": "next_look",
              "step_out": "next_step_out", "not_now": "next_not_now"}

HOLD_PROPS = {"variant": "press", "seconds": 90, "maxSeconds": 900, "label": "hold_label", "runningLabel": "hold_running",
              "hint": "hold_hint", "doneLabel": "hold_done", "next": "next"}

STEPS = [
    {
        "id": "pull", "kind": "ask", "title": "pull_title", "hint": "pull_hint", "crisis": CRISIS,
        "fields": [{"id": "pull", "options": {"list": "pull"}, "max": 1, "required": True,
                    "own": {"hint": "pull_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"when": HURT, "to": "safe"}, {"to": "hold"}],
    },
    {
        # Hurt myself (C6.5): the resources open over this screen as it arrives, before anything else; coming back
        # to it, the one question, with the banner on the screen.
        "id": "safe", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "crisis": CRISIS,
        "safetyFirst": ALWAYS,
        "fields": [{"id": "safe", "options": {"list": "safe"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        # Not sure or no: someone to talk to, straight away (S9: nothing offered in place of crisis support).
        "next": [{"when": UNSAFE, "to": "reach"}, {"to": "hold"}],
    },
    {
        "id": "hold", "kind": "embed", "embed": "holdRing", "answerAs": "hold", "crisis": CRISIS,
        "title": [{"when": FLOODED, "key": "hold_title_flooded"}, {"key": "hold_title"}],
        "props": HOLD_PROPS, "links": [SAFETY_LINK],
        "next": [{"to": "step_back"}],
    },
    {
        "id": "step_back", "kind": "ask", "title": "back_title", "hint": "back_hint", "crisis": CRISIS,
        "fields": [{"id": "step_back", "options": {"list": "step_back", "where": BACK_WHERE}, "max": 1, "required": True,
                    "links": [SAFETY_LINK]}],
        # The come-back on Today (R5): after the phone's been down, or after the short path's body-first card.
        "followUp": {"type": "hold_come_back", "when": {"any": [PHONE_DOWN, FLOODED]}},
        "next": [{"when": PHONE_DOWN, "to": "wait"}, {"when": {"all": [FLOODED, HURT]}, "to": "hurt_end"},
                 {"when": FLOODED, "to": "settle"}, {"to": "observe"}],
    },
    {
        "id": "wait", "kind": "embed", "embed": "waitLock", "answerAs": "wait", "title": "wait_title", "crisis": CRISIS,
        "props": {"minutes": 10, "waiting": "wait_waiting", "waitingShort": "wait_short", "done": "wait_done",
                  "doneShort": "wait_done_short", "next": "wait_back"},
        "links": [SAFETY_LINK],
        "next": [{"when": FLOODED, "to": "settle"}, {"to": "observe"}],
    },
    {
        "id": "observe", "kind": "ask", "title": "observe_title", "hint": "observe_hint", "crisis": CRISIS,
        "fields": [
            {"id": "body", "label": "body_q", "options": {"list": "body"}, "max": 3},
            {"id": "fact", "label": "fact_q", "options": {"list": "fact"}, "max": 1, "links": [SAFETY_LINK]},
        ],
        "next": [{"to": "proceed"}],
    },
    {
        "id": "proceed", "kind": "ask", "title": "proceed_title", "crisis": CRISIS,
        "fields": [
            {"id": "goal", "options": {"list": "goal"}, "max": 1},
            {"id": "move", "label": "move_q", "options": {"list": "move", "where": MOVE_WHERE}, "max": 1,
             "links": [SAFETY_LINK]},
        ],
        "next": [{"when": HURT, "to": "hurt_end"}, {"to": "next"}],
    },
    {
        "id": "next", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [*[{"when": MOVE(m), "key": k} for m, k in MOVE_LINES.items()], {"when": ALWAYS, "key": "next_line"}],
        "offers": [
            *[{"exit": x, "when": MOVE(m)} for m, _, _, x in MOVES if x],
            # Planned (not shown until built): the kit and Held for hurt myself, Give your mind a job for checking.
            {"exit": "crisis_kit", "when": {"eq": [a("pull"), "use"]}},
            {"exit": "mind_job", "when": {"eq": [a("pull"), "check"]}},
        ],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # The flooded short path's end (PRD: S and T only, then the body first; O and P wait for the come-back).
        "id": "settle", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "settle_line"}],
        "offers": [{"exit": "cool_down", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Hurt myself, safe for now: its own end card, with no "did you act on it?" (a yes there would get only
        # "Noted."); the banner stays, and the move's tool is the offer.
        "id": "hurt_end", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": FLOODED, "key": "next_hurt_flooded"}, {"when": ALWAYS, "key": "next_hurt"}],
        "offers": [
            {"exit": "cool_down", "when": {"any": [MOVE("cool"), FLOODED]}},
            {"exit": "safety_open", "when": MOVE("call")},
            # Planned (not shown until built): the kit and Held.
            {"exit": "crisis_kit", "when": ALWAYS},
            {"exit": "held", "when": ALWAYS},
        ],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Not safe or not sure: someone to talk to first, and no "did you act on it?" (it would land wrong here).
        # The banner on the card is the way to them; the card adds no second button that competes with it.
        "id": "reach", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "reach_line"}],
        "offers": [{"exit": "crisis_kit", "when": ALWAYS}],
        "done": "done",
    },
]

EXITS = [
    {"id": "dear_man", "toolId": "dear-man"},                           # IE: plan the ask for later
    {"id": "cool_down", "toolId": "cool-down"},                         # DT-01 First, the body
    {"id": "fast", "toolId": "fast"},                                   # IE-05 one line to hold your ground
    {"id": "urge_surfing", "toolId": "urge-surfing"},                   # DT-05 Ride it out
    {"id": "alternate_rebellion", "toolId": "alternate-rebellion"},     # DT-11 (the *blow it up* chip)
    {"id": "crisis_kit", "toolId": "crisis-kit", "planned": True},      # DT-03 My crisis kit (safety batch)
    {"id": "held", "toolId": "soothe", "planned": True},                # DT-07 Held (hand on heart)
    {"id": "mind_job", "toolId": "mind-job", "planned": True},          # DT-06 park it, look once
    {"id": "safety_open", "toolId": None, "safety": True},              # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("pull", v, label, props, None) for v, label, props in PULLS]
    out += [("safe", v, label, props, None) for v, label, props in SAFE]
    out += [("step_back", v, label, props, "StepBackOption") for v, label, props in STEP_BACK]
    out += [("body", v, label, {}, None) for v, label in BODY]
    out += [("fact", v, label, {}, None) for v, label in FACTS]
    out += [("goal", v, label, {}, None) for v, label in GOALS]
    urge_of = {v: props["urge"] for v, _, props in PULLS}
    out += [("move", v, label, {**{u: True for u in urges}, "forUrges": [urge_of[u] for u in urges if u in urge_of],
                                **({"handsOn": x} if x else {})}, "ProceedOption")
            for v, label, urges, x in MOVES]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "pull", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (plan C6.2); nothing else steers it yet.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
