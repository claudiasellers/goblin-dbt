"""First, the body (DT-01, Help me now + TIP rebuilt; DBT DT Handouts 1-3, 6, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD DT-01 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md" §5; copy
in /mnt/project-files/handoffs/prds/): for the moment someone can tap once or twice and can't read. One tap says what
it's like (a wave, a pull to do something, frozen, far away, a mind that won't stop); the body gets one mode, one per
screen; a one-tap *Quieter?* says what comes next: the fork when it's quieter, one swap to a different mode when it
isn't, and after a second *not quieter*, lowering the demand ("You don't have to make this go away") with someone to
talk to on the screen. The tool keeps its id, `cool-down` (D6), named "First, the body"; Circuit Breaker is its cold
mode and keeps that name. docs/design/first-the-body.md lists what this batch defers and where it departs from the PRD.

Safety (plan C6):
- **Cold only after the one-tap self-check** (D4): heart trouble or fainting, an eating disorder or very low weight,
  pregnancy, Raynaud's or a cold allergy, or drinking or using today rules cold out (squeeze and drop instead); *not
  sure* gets a cool cloth, 15 seconds, gently, with a caution line. Never a shower or a bath, never ice water.
- **Direction is never wrong** (C6.3): frozen gets press and wake up, far away gets eyes-open orienting and something
  strong; neither is ever offered a calming mode. The long out-breath is only ever the wave's swap, never the only
  thing on offer, and it has a stop rule (dizzy or tingly → stop, and a different mode).
- **Chest pain or fainting** is on the first screen: the emergency number (the `medical` banner), not a body mode.
- **A pull to do something** goes to Hold to wait, which asks about hurting yourself first (C6.5).
- **Nothing locks**: every mode has its way on from the start; *This is too much right now* is under every screen
  (the player). No band is asked (C6.2).
- No chip is food, drink, shopping or scrolling as a comfort (C6.7).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "first_body"
TOOL_ID = "cool-down"
CONCEPT = "dbt_tipp"
VERSION = "fb-v1"
OWN_MAX = 60  # nothing here asks for words; the cap is the runtime's floor

COPY = {
    # Screen 1: the state tap (PRD step 1). Short labels, nothing to read.
    "state_title": "What's it like right now?",
    "state_hint": "Tap the closest one.",
    # Chest pain or fainting: the emergency number, not a body mode.
    "medical_line": "Sit or lie down. Even if it eases, get it checked today.",
    # A pull to do something: the hand needs a job first (PRD: DT-02, hold first).
    "urge_line": "First, a way to wait it out.",
    # The one-tap self-check before cold (D4; the full medical screen waits for the safety batch).
    "screen_title": "Cold on your face can slow your heart. Is any of this true for you?",
    "screen_hint": "Heart trouble, a slow heart or heart medicine. Fainting. An eating disorder or very low weight. Pregnant. Raynaud's or a cold allergy. Drinking or using today.",
    "cold_near_title": "Is there cold water, or something cold, near you?",
    # Circuit Breaker: cold on the face (TIP, temperature).
    "cold_title": "Circuit Breaker: cold on your face.",
    "cold_step1": "Wet a cloth with cold water, or wrap a cold pack in a cloth.",
    "cold_step2": "Lean forward. Hold it on your forehead, eyes and upper cheeks.",
    "cold_step3": "Breathe out slowly, or hold your breath if that's comfortable.",
    "cold_caution": "Never in a shower or a bath. Cold, not ice-cold.",
    "cold_start": "Tap when it's on",
    "cold_running": "Hold it there",
    "cold_lead": "Ready in",
    "cold_done": "Cold like that can slow your heart for a bit.",
    # Not sure: a cool cloth, short and gentle (PRD: *not sure* warns, it doesn't block).
    "cool_title": "A cool cloth, gently.",
    "cool_step1": "A cool cloth, not ice.",
    "cool_step2": "Lean forward and rest it on your forehead and eyes.",
    "cool_caution": "You weren't sure, so this one is short and gentle. Stop if anything feels wrong.",
    "cool_done": "That's enough cold for now.",

    # Restless or buzzing: the move burst (TIP-I). Claudia, 11 Nov: no medical gate, like any fitness app; a pace line.
    "move_title": "Move fast for a minute.",
    "move_step1": "Stand up and march on the spot, knees high.",
    "move_step2": "Or go up and down the stairs.",
    "move_caution": "Go at your own pace. Slow down or stop if anything hurts.",
    "move_start": "Tap to start",
    "move_running": "Keep going",
    "move_done": "That's a minute. Let your breath settle.",
    # Squeeze and drop (TIP, paired relaxation without the rethinking).
    "squeeze_title": "Squeeze, then let it drop.",
    "squeeze_step1": "Breathe in and squeeze your hands, arms and shoulders.",
    "squeeze_step2": "Breathe out and let it all drop.",
    "squeeze_still1": "Squeeze your hands, arms and shoulders.",
    "squeeze_still2": "Then let it all drop. Breathe however you breathe.",
    "squeeze_start": "Press and hold to squeeze",
    "squeeze_label": "Squeeze",
    "drop_label": "Let it drop",
    "squeeze_done": "That's three.",
    "tight_title": "How does your body feel now?",
    "tight_hint": "Can't tell is a full answer.",
    # The long out-breath (TIP, paced breathing): the wave's swap, never the only thing on offer.
    "exhale_title": "Breathe out longer than you breathe in.",
    "exhale_step1": "A soft breath in through your nose while the circle grows.",
    "exhale_step2": "Out slowly while it shrinks.",
    "exhale_start": "Tap to start",
    "exhale_in": "In",
    "exhale_out": "Out, slowly",
    "exhale_dizzy": "Dizzy or tingly? Stop and breathe normally.",
    "exhale_done": "That's the long breath out.",
    # Frozen or numb: press and push (weight), never calming.
    "press_title": "Press the phone hard between your palms.",
    "press_label": "Press and hold",
    "press_running": "Push",
    "press_hint": "Keep a thumb on the circle while you press. Let go whenever you need to.",
    "press_done": "Three presses.",
    # Frozen's swap: wake up.
    "wake_title": "Wake your hands up.",
    "wake_cue": "Rub your hands together fast until they're warm. Then shake them out.",
    # Far away: orient, eyes open (PRD: the date, the time and where you are on the screen).
    "orient_title": "Eyes open. Look around you.",
    "orient_here": "You're here, and it's",
    "orient_task": "Find three things you can see. Tap for each one.",
    "orient_done": "You're here.",
    # Far away's swap: something strong, outside the body (§f.1 working default).
    "strong_title": "Something strong.",
    "strong_cue": "Hold something cold, or smell something strong. Feet into the floor.",
    # My mind won't stop: give the eyes a job (DT-06 level 0), then listen.
    "find_title": "Give your eyes a job.",
    "find_task": "Find five blue things around you. Tap for each one.",
    "listen_title": "Now give your ears one.",
    "listen_task": "Listen. Tap for each sound you can hear, near or far.",
    "found": "Found one",
    "heard": "Heard one",
    "find_done": "That's all of them.",
    # The shared ring copy.
    "card_start": "Tap to start",
    "card_running": "Keep going",
    "card_done": "That's it.",
    # The close, in the flow (PRD step 4): what comes next depends on it.
    "check_title": "Compared to when you started, it's…",
    "check_title_here": "Compared to when you started, you feel…",
    # Second time not quieter: lower the demand (PRD).
    "lower_title": "You don't have to make this go away. Let's get through the next two minutes.",
    "lower_cue": "Nothing to do. Watch the ring and breathe however you breathe.",
    "lower_cue_here": "Nothing to do. Eyes open, feet on the floor.",
    "lower_running": "Two minutes",
    "lower_done": "You got through two minutes.",
    "someone_line": "If you want someone with you right now, you can call or text one of these.",
    # The fork (PRD step 5), once it's quieter.
    "fork_title": "Can anything be done about this right now?",
    "fork_hint": "Any answer is fine.",
    "end_change": "Then it's worth a look, while you're steadier.",
    "end_accept": "That's a heavy thing to carry. You don't have to solve it right now.",
    "end_park": "Then it can wait. You can come back to it when you choose.",
    "end_through": "You got through it. That's the skill.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
STATE = lambda s: {"eq": [a("state"), s]}  # noqa: E731
HERE = {"in": [a("state"), ["frozen", "far_away"]]}
BETTER = ["better", "much_better"]
BETTER1 = {"any": [{"in": [a("check1"), BETTER]}, {"in": [a("check1_here"), BETTER]}]}
BETTER2 = {"any": [{"in": [a("check2"), BETTER]}, {"in": [a("check2_here"), BETTER]}]}
CHECKED = {"any": [{"set": a("check1")}, {"set": a("check1_here")}]}
FORK = lambda v: {"eq": [a("fork"), v]}  # noqa: E731
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

STATES = [
    ("wave", "A wave", {}),
    ("restless", "Restless or buzzing", {}),
    ("urge", "I want to do something", {}),
    ("frozen", "Frozen or numb", {}),
    ("far_away", "Far away", {}),
    ("loop", "My mind won't stop", {}),
    ("medical", "Chest pain or feeling faint", {"danger": "medical"}),
]
SCREEN = [
    ("some", "Yes, one of these"),
    ("none", "None of these"),
    ("unsure", "Not sure"),
]
COLD_NEAR = [
    ("yes", "Yes"),
    ("no", "No, not right now"),
]
TIGHT = [
    ("tight", "Tight"),
    ("loose", "Loose"),
    ("cant_tell", "Can't tell"),
]
# The spine's then-vs-now, in the state's own words (the ids stay the spine's: practice-spine DIRECTION_LABELS).
TVN_DOWN = [("worse", "Louder"), ("same", "About the same"), ("better", "Quieter"), ("much_better", "Much quieter")]
TVN_HERE = [("worse", "Further away"), ("same", "About the same"), ("better", "A bit more here"), ("much_better", "More here")]
FORKS = [
    ("change", "Yes, something can be done"),
    ("accept", "No, it's how things are"),
    ("park", "Not right now"),
    ("through", "I needed to get through it"),
]

# After a mode: the first check, or the second once the first is answered (the swap's), in the state's wording.
AFTER_MODE = [{"when": {"all": [CHECKED, HERE]}, "to": "check2_here"}, {"when": CHECKED, "to": "check2"},
              {"when": HERE, "to": "check1_here"}, {"to": "check1"}]


def embed(step_id, name, title, props, nxt=None, hint=None):
    s = {"id": step_id, "kind": "embed", "embed": name, "answerAs": step_id, "title": title, "props": props,
         "links": [SAFETY_LINK], "next": nxt or AFTER_MODE}
    if hint:
        s["hint"] = hint
    return s


def card(step_id, title, kind, cue, seconds, nxt=None, done="card_done", running="card_running"):
    return embed(step_id, "bodyCard", title, {"kind": kind, "cue": cue, "seconds": seconds, "start": "card_start",
                                              "running": running, "done": done, "next": "next"}, nxt)


def find(step_id, title, variant, count, task, found):
    return embed(step_id, "orientFind", title, {"variant": variant, "count": count, "here": "orient_here", "task": task,
                                                "foundLabel": found, "done": "find_done" if step_id != "orient" else "orient_done",
                                                "next": "next"})


def check(step_id, field, lst, title, nxt):
    """The close, in the flow: one step per wording (down for a wave or a loop, here for frozen or far away)."""
    return {"id": step_id, "kind": "ask", "title": title,
            "fields": [{"id": field, "options": {"list": lst}, "max": 1, "required": True, "askFresh": "thenVsNow",
                        "links": [SAFETY_LINK]}],
            "next": nxt}



STEPS = [
    {
        "id": "state", "kind": "ask", "title": "state_title", "hint": "state_hint",
        "crisis": [{"variant": "medical", "when": STATE("medical")}],
        "fields": [{"id": "state", "options": {"list": "state"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": STATE("medical"), "to": "medical"}, {"when": STATE("urge"), "to": "urge"},
                 {"when": STATE("frozen"), "to": "press"}, {"when": STATE("far_away"), "to": "orient"},
                 {"when": STATE("loop"), "to": "find"}, {"when": STATE("restless"), "to": "move"}, {"to": "screen"}],
    },
    {
        # The emergency number on the card; no body mode, no close question.
        "id": "medical", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "medical", "when": ALWAYS}],
        "lines": [{"when": ALWAYS, "key": "medical_line"}],
        "offers": [], "done": "done",
    },
    {
        # A pull to do something: Hold to wait first (it asks about hurting yourself before anything else).
        "id": "urge", "kind": "handoff", "complete": True, "noClose": True,
        "lines": [{"when": ALWAYS, "key": "urge_line"}],
        "offers": [{"exit": "pause", "when": ALWAYS}],
        "links": [SAFETY_LINK],
    },
    {
        # The one-tap self-check (D4) before any cold.
        "id": "screen", "kind": "ask", "title": "screen_title", "hint": "screen_hint",
        "fields": [{"id": "screen", "options": {"list": "screen"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("screen"), "some"]}, "to": "squeeze"}, {"to": "cold_near"}],
    },
    {
        "id": "cold_near", "kind": "ask", "title": "cold_near_title",
        "fields": [{"id": "cold_near", "options": {"list": "cold_near"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("cold_near"), "no"]}, "to": "squeeze"},
                 {"when": {"eq": [a("screen"), "unsure"]}, "to": "cool"}, {"to": "cold"}],
    },
    embed("cold", "doseTimer", "cold_title", {
        "art": "cold", "seconds": 30, "leadIn": 3, "step1": "cold_step1", "step2": "cold_step2", "step3": "cold_step3",
        "caution": "cold_caution", "start": "cold_start", "running": "cold_running", "lead": "cold_lead",
        "done": "cold_done", "next": "next"}),
    embed("cool", "doseTimer", "cool_title", {
        "art": "cold", "seconds": 15, "leadIn": 3, "step1": "cool_step1", "step2": "cool_step2", "caution": "cool_caution",
        "start": "cold_start", "running": "cold_running", "lead": "cold_lead", "done": "cool_done", "next": "next"}),
    # Restless or buzzing: a minute of fast marching. Its swap is the long out-breath (check1's default).
    embed("move", "doseTimer", "move_title", {
        "seconds": 60, "leadIn": 3, "step1": "move_step1", "step2": "move_step2", "caution": "move_caution",
        "start": "move_start", "running": "move_running", "lead": "cold_lead", "done": "move_done", "next": "next"}),
    embed("squeeze", "squeezeRelease", "squeeze_title", {
        "rounds": 3, "squeezeSec": 5, "step1": "squeeze_step1", "step2": "squeeze_step2", "start": "squeeze_start",
        "squeezeLabel": "squeeze_label", "dropLabel": "drop_label", "done": "squeeze_done", "next": "next"},
        [{"to": "tight"}]),
    {
        # The contrast (PRD: tight, loose, can't tell; the alexithymia drill). Nothing hangs on it.
        "id": "tight", "kind": "ask", "title": "tight_title", "hint": "tight_hint",
        "fields": [{"id": "tight", "options": {"list": "tight"}, "max": 1, "links": [SAFETY_LINK]}],
        "next": AFTER_MODE,
    },
    # The wave's swap. Dizzy or tingly switches modality: squeeze and drop, if it hasn't run yet.
    embed("exhale", "breathPacer", "exhale_title", {
        "seconds": 90, "inSec": 4, "outSec": 7, "step1": "exhale_step1", "step2": "exhale_step2", "start": "exhale_start",
        "inLabel": "exhale_in", "outLabel": "exhale_out", "dizzy": "exhale_dizzy", "done": "exhale_done", "next": "next"},
        [{"when": {"all": [{"eq": [a("exhale"), "dizzy"]}, {"not": {"set": a("squeeze")}}]}, "to": "squeeze_still"}, *AFTER_MODE]),
    # After dizziness, squeeze and drop without pacing the breath again.
    embed("squeeze_still", "squeezeRelease", "squeeze_title", {
        "rounds": 3, "squeezeSec": 5, "step1": "squeeze_still1", "step2": "squeeze_still2", "start": "squeeze_start",
        "squeezeLabel": "squeeze_label", "dropLabel": "drop_label", "done": "squeeze_done", "next": "next"}),
    embed("press", "holdRing", "press_title", {
        "variant": "press", "seconds": 10, "holds": 3, "label": "press_label", "runningLabel": "press_running",
        "hint": "press_hint", "doneLabel": "press_done", "next": "next", "wayOn": "from_start"}, hint="press_hint"),
    card("wake", "wake_title", "wake", "wake_cue", 30),
    find("orient", "orient_title", "find", 3, "orient_task", "found"),
    card("strong", "strong_title", "strong", "strong_cue", 30),
    find("find", "find_title", "find", 5, "find_task", "found"),
    find("listen", "listen_title", "listen", 3, "listen_task", "heard"),
    # The close, in the flow: quieter goes to the fork; otherwise one swap, to a different mode.
    check("check1", "check1", "tvn_down", "check_title",
          [{"when": BETTER1, "to": "fork"}, {"when": STATE("loop"), "to": "listen"}, {"to": "exhale"}]),
    check("check1_here", "check1_here", "tvn_here", "check_title_here",
          [{"when": BETTER1, "to": "fork"}, {"when": STATE("frozen"), "to": "wake"}, {"to": "strong"}]),
    check("check2", "check2", "tvn_down", "check_title", [{"when": BETTER2, "to": "fork"}, {"to": "lower"}]),
    check("check2_here", "check2_here", "tvn_here", "check_title_here", [{"when": BETTER2, "to": "fork"}, {"to": "lower_here"}]),
    # Second time not quieter: lower the demand. A plain ring, nothing to do, then someone to talk to on the screen.
    card("lower", "lower_title", "still", "lower_cue", 120, [{"to": "someone"}], done="lower_done", running="lower_running"),
    # Frozen or far away: nothing passive (C6.3). Eyes open, feet down.
    card("lower_here", "lower_title", "still", "lower_cue_here", 120, [{"to": "someone"}], done="lower_done", running="lower_running"),
    {
        "id": "someone", "kind": "handoff", "complete": True,
        "crisis": [{"variant": "crisis", "when": ALWAYS}],
        "lines": [{"when": ALWAYS, "key": "someone_line"}],
        "offers": [{"exit": "crisis_kit", "when": ALWAYS}],
        "done": "done",
    },
    {
        "id": "fork", "kind": "ask", "title": "fork_title", "hint": "fork_hint",
        "fields": [{"id": "fork", "options": {"list": "fork"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"to": "end"}],
    },
    {
        "id": "end", "kind": "handoff", "complete": True,
        "lines": [{"when": FORK("change"), "key": "end_change"}, {"when": FORK("accept"), "key": "end_accept"},
                  {"when": FORK("park"), "key": "end_park"}, {"when": ALWAYS, "key": "end_through"}],
        "offers": [
            *[{"exit": x, "when": FORK("change")} for x in ("problem_solve", "dear_man", "opposite_action")],
            {"exit": "let_it_be", "when": FORK("accept")},
            {"exit": "mind_job", "when": FORK("park")},
        ],
        "done": "done", "links": [SAFETY_LINK],
    },
]

EXITS = [
    {"id": "pause", "toolId": "pause"},                                  # DT-02 Hold to wait (a pull to do something)
    {"id": "problem_solve", "toolId": "problem-solve"},                  # the fork: something can be done
    {"id": "dear_man", "toolId": "dear-man"},
    {"id": "opposite_action", "toolId": "opposite-action"},
    {"id": "let_it_be", "toolId": "let-it-be"},         # DT-04 (DT-B4): it's how things are
    {"id": "mind_job", "toolId": "mind-job", "planned": True},           # DT-06 (DT-B3): not right now, with a return
    {"id": "crisis_kit", "toolId": "crisis-kit", "planned": True},       # DT-03 the kit's people (safety batch)
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    # Part 2 adds CrisisState nodes (PRD DT-01) and points these options at them with PRESENTS, as Problem Solve does.
    out = [("state", v, label, props, None) for v, label, props in STATES]
    out += [("screen", v, label, {}, None) for v, label in SCREEN]
    out += [("cold_near", v, label, {}, None) for v, label in COLD_NEAR]
    out += [("tight", v, label, {}, None) for v, label in TIGHT]
    out += [("tvn_down", v, label, {}, None) for v, label in TVN_DOWN]
    out += [("tvn_here", v, label, {}, None) for v, label in TVN_HERE]
    out += [("fork", v, label, {}, None) for v, label in FORKS]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "state", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2); nothing steers on it yet (Help me now's flooded entry is the next PR).
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
