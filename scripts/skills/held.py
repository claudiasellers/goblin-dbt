"""Held (DT-07 part 1; self-soothe with the five senses, hand on heart: DBT DT Handouts 8 and 8a, Linehan 2015) as a
skill on the runtime.

The editable source. The flow is PRD DT-07 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): raw, depleted, ashamed, alone, or the end of a bad night. Being met with kindness is
itself information ("this deserves care"), and the person's own hand, words and things take over from the app's.

- **Pick how to be held**: a hand on the heart (with touch-free ways first-class: a warm mug, something soft, hands on
  the thighs), something warm (warm, not hot), something for one sense (calming, or waking up a bit for a low, flat day:
  the PRD's *activating* soothing), or kind words (borrowed or their own, read once on paper, then a hand on the heart
  while they land).
- **A minute**: every hold is 60 s (the PRD's 60-120, its flooded 60), on a timer the person can stop.
- ***I don't deserve this*** is a chip on the first screen: "You don't have to deserve it. Try thirty seconds, as an
  experiment." *Not today* is a real answer and ends gently, with no close.
- **The close, asked in the flow**: *much warmer · a bit warmer · about the same · stirred up* (`askFresh: 'thenVsNow'`).
  *Stirred up* is compassion backdraft: "That happens." → only the hand and the breath (30 s), or press something
  (First, the body), or stop. Stirred up twice in a row → lighter things only, and a line about talking it through.
- **Outward**: "Someone you could call or text?", always offered, never pushed.

A carried flooded reading keeps the first screen to the hand on the heart, warmth and *I don't deserve this* (PRD:
hand on heart or warmth only). docs/design/held.md lists what part 1 defers (the outside-in body scan `body-scan`,
the Held hands visual, voice memos (D13: text only), the soothe list kept in the crisis kit, the night variant and the
calm-day follow-up) and where it departs from the PRD.

Safety (plan C6): *Talk to someone now* on every screen; no food, alcohol or shopping among the soothers; nothing
here asks the person to close their eyes.
"""

ID = "held"
TOOL_ID = "soothe"
CONCEPT = "dbt_self_soothe"
VERSION = "held-v1"
OWN_MAX = 72  # kind words in their own voice (one line; the record keeps every own-words field)

COPY = {
    "pick_title": "This deserves some care. How would you like to be looked after for a minute?",
    "pick_hint": "Pick one. You can stop whenever you like.",
    # I don't deserve this (PRD step 2).
    "deserve_title": "You don't have to deserve it.",
    "deserve_hint": "Try thirty seconds, as an experiment.",
    "deserve_card_title": "Thirty seconds.",
    "deserve_step1": "A hand on your chest, or something warm.",
    "deserve_step2": "Nothing to feel or get right.",
    "deserve_step3": "Notice being looked after, for a moment.",
    "not_today_line": "That's okay. It's here for another time.",
    # A hand on the heart, and its touch-free ways (PRD: always offered).
    "where_title": "Where would your hands like to rest?",
    "where_hint": "If touch doesn't feel right, hold something instead.",
    "hold_title": "Stay here for a minute.",
    "chest_step1": "One hand on your chest, over your heart.",
    "chest_step2": "Notice any warmth from your hand.",
    "chest_step3": "Let your breath move under it, slowly.",
    "mug_step1": "Wrap both hands around the mug.",
    "mug_step2": "Notice the warmth in your palms.",
    "mug_step3": "Let your shoulders drop a little.",
    "soft_step1": "Hold it close, wherever feels right.",
    "soft_step2": "Notice how soft it is under your fingers.",
    "soft_step3": "Let it take some of the weight.",
    "thighs_step1": "Rest both hands flat on your thighs.",
    "thighs_step2": "Notice the weight of your hands.",
    "thighs_step3": "Let your breath slow down under them.",
    "start": "Start",
    "running": "Holding",
    "hold_done": "That's a minute.",
    # Something warm.
    "warm_title": "What's warm nearby?",
    "warm_hint": "Warm, not hot.",
    "warm_card_title": "Let the warmth in for a minute.",
    "warm_step1": "Bring it close, wherever it feels good.",
    "warm_step2": "Notice where the warmth reaches.",
    "warm_step3": "Let more warmth in on each breath out.",
    "warm_running": "Warming",
    # Something for one sense.
    "way_title": "What would help more right now?",
    "way_hint": "Some days settling helps. Some days waking up a bit helps.",
    "sense_title": "Pick one thing.",
    "sense_hint": "Whatever's close to hand.",
    "sense_own": "Something else that's kind to me",
    "sense_card_title": "Give it a minute of your attention.",
    "sense_step1": "Give it all your attention.",
    "sense_step2": "Notice one small new thing about it.",
    "sense_step3": "When your mind wanders, come back to it.",
    "sense_running": "With it",
    # Kind words (part 1: text only, D13).
    "words_title": "What would you like to hear?",
    "words_hint": "Pick one, or say it the way someone who cares about you would.",
    "words_own": "In my own words",
    "words_card_title": "Read it slowly, as if it's meant for you.",
    "words_card_next": "Next",
    "words_copy": "Copy",
    "words_copied": "Copied",
    "words_selected": "The words are selected, ready to copy.",
    "land_title": "Let it land.",
    "land_step1": "A hand on your chest, or something warm.",
    "land_step2": "Say the words to yourself once more, slowly.",
    "land_step3": "Let them stay a while.",
    # The close (in the flow), then backdraft.
    "close_title": "How is it now?",
    "stirred_title": "That happens. Kindness can stir things up.",
    "stirred_hint": "Any of these is fine.",
    "light_title": "Only your breath.",
    "light_step1": "Let your hands rest wherever they like.",
    "light_step2": "Breathe out longer than you breathe in.",
    "light_step3": "Stop whenever you like.",
    "light_running": "Breathing",
    "light_done": "That's it.",
    "again_title": "And now?",
    "lighter_line": "Kindness can be hard to take in right now. That's common, and it can change.",
    "talk_line": "Talking it through with someone can help: a friend, or someone who's trained to listen.",
    "press_line": "First, the body has ways to press, cool down or move.",
    "stop_line": "You stopped when it got to be too much. That's looking after yourself too.",
    # Outward (PRD step 4: always offered, never pushed).
    "reach_title": "Is there someone you could call or text?",
    "reach_hint": "Only if you'd like to.",
    "end_warmer": "You looked after yourself for a minute. You can do that again, with or without the app.",
    "end_same": "Sometimes it doesn't shift much. You still gave yourself a minute of care.",
    "end_easier": "It eased. You stayed with it, gently.",
    "end_reach": "Even a short message counts. You could tell them it's been a hard day.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}


# A carried flooded reading keeps the choices short (T8): only the options marked `calm`.
def FLOODED_ONLY(flag):
    return {"any": [{"not": FLOODED}, {"eq": [f"$opt.{flag}", True]}]}


SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
# Opened from Hold to wait's *Hurt myself, safe for now* (its *A hand on my heart* move): the crisis banner stays on
# every screen (plan C6.5: a DT hold runs alongside resources, never instead of them).
AFTER_HURT = {"eq": ["$ctx.frame", "hurt"]}
CRISIS = [{"variant": "crisis", "when": AFTER_HURT}]

PICK = [
    ("heart", "A hand on my heart", True),
    ("warm", "Something warm", True),
    ("sense", "Something for one of my senses", False),
    ("words", "Kind words", False),
    ("deserve", "I don't deserve this", True),
]
DESERVE = [
    ("try", "Try it"),
    ("not_today", "Not today"),
]
# Where the hands rest (PRD: hand on heart, with a warm mug, a soft object and hands on the thighs always offered).
CALM_WHERE = {"chest", "mug"}  # a carried flooded reading: two choices (T8), one of them touch-free
CALM_WARM = {"drink", "blanket"}
WHERE = [
    ("chest", "On my chest, over my heart"),
    ("mug", "Around a warm mug"),
    ("soft", "Holding something soft"),
    ("thighs", "Flat on my thighs"),
]
# Warmth (SootheOption, sense touch, calming). Warm, not hot: the hint says so on screen.
WARM = [
    ("drink", "A warm drink"),
    ("blanket", "A blanket or a jumper"),
    ("water", "Warm water over my hands"),
    ("spot", "A warm spot: sun, a radiator, a pet"),
]
WAY = [
    ("calm", "Settling"),
    ("wake", "Waking up a bit"),
]
# SootheOption per sense, with its direction (Handout 8: vision, hearing, smell, taste, touch). Excluded by design:
# food binges, alcohol, shopping, scrolling (PRD risks: soothers that become addictive).
SENSE = [
    ("look_calm", "Look at something I find beautiful", "sight", "calm"),
    ("listen_calm", "A slow song I love", "hearing", "calm"),
    ("smell_calm", "A smell I like: soap, tea, a candle", "smell", "calm"),
    ("taste_calm", "A sip of something warm, slowly", "taste", "calm"),
    ("touch_calm", "Something soft against my skin", "touch", "calm"),
    ("look_wake", "Look out of a window, far away", "sight", "wake"),
    ("listen_wake", "An upbeat song", "hearing", "wake"),
    ("smell_wake", "A sharp smell: mint, citrus, coffee", "smell", "wake"),
    ("taste_wake", "Something sour, or a cold drink", "taste", "wake"),
    ("touch_wake", "Cold water on my wrists", "touch", "wake"),
]
# Kind words (borrowed, in the house voice; their own is the escape hatch).
WORDS = [
    ("hard", "This is hard, and I'm doing what I can."),
    ("okay", "It's okay to feel this."),
    ("care", "Care is allowed, even now."),
    ("alone", "I'm not the only one who feels like this."),
    ("rest", "I can rest for a minute."),
]
TVN = [("much_better", "Much easier"), ("better", "A bit easier"), ("same", "About the same"), ("worse", "Stirred up")]
STIRRED = [
    ("light", "Only my breath", False),
    ("deserve", "It feels like I don't deserve it", False),
    ("press", "Something for my body instead", True),
    ("talk", "Someone to talk to now", True),
    ("stop", "Stop here", True),
]
AGAIN = [
    ("easier", "A bit easier"),
    ("still", "Still stirred up"),
]
REACH = [
    ("yes", "Yes, someone I could message"),
    ("not_now", "Not right now"),
]


def ask(step_id, title, hint, field, lst, nxt, *, required=True, own=None, extra=None, field_extra=None, where=None):
    f = {"id": field, "options": {"list": lst, **({"where": where} if where else {})}, "max": 1, "required": required,
         "links": [SAFETY_LINK], **(field_extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt}
    if hint:
        s["hint"] = hint
    return {**s, **(extra or {})}


def handoff(step_id, lines, offers, *, no_close=True):
    s = {"id": step_id, "kind": "handoff", "complete": True, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK]}
    if no_close:
        s["noClose"] = True
    return s


def card(step_id, title, embed, kind, seconds, prefix, nxt, *, running="running", done="hold_done"):
    props = {"seconds": seconds, "step1": f"{prefix}_step1", "step2": f"{prefix}_step2", "step3": f"{prefix}_step3",
             "start": "start", "running": running, "done": done, "next": "next"}
    if embed == "bodyCard":
        props["kind"] = kind
    return {"id": step_id, "kind": "embed", "embed": embed, "answerAs": step_id, "title": title, "props": props,
            "links": [SAFETY_LINK], "next": nxt}


TO_CLOSE = [{"to": "close"}]

STEPS = [
    ask("pick", "pick_title", "pick_hint", "pick", "pick",
        [{"when": {"eq": [a("pick"), v]}, "to": to} for v, to in (("warm", "warm"), ("sense", "way"), ("words", "words"), ("deserve", "deserve"))] + [{"to": "where"}],
        where=FLOODED_ONLY("calm")),
    # I don't deserve this: a thirty-second experiment, or not today (a real answer, no close).
    ask("deserve", "deserve_title", "deserve_hint", "deserve", "deserve",
        [{"when": {"eq": [a("deserve"), "not_today"]}, "to": "not_today"}, {"to": "try"}]),
    card("try", "deserve_card_title", "bodyCard", "hand_heart", 30, "deserve", TO_CLOSE),
    handoff("not_today", [{"when": ALWAYS, "key": "not_today_line"}], []),
    # A hand on the heart, or a touch-free way.
    ask("where", "where_title", "where_hint", "where", "where",
        [{"when": {"eq": [a("where"), v]}, "to": f"hold_{v}"} for v, _ in WHERE[1:]] + [{"to": "hold_chest"}],
        where=FLOODED_ONLY("calm")),
    *[card(f"hold_{v}", "hold_title", "bodyCard", "hand_heart", 60, v, TO_CLOSE) for v, _ in WHERE],
    # Something warm.
    ask("warm", "warm_title", "warm_hint", "warm", "warm", [{"to": "warm_hold"}], where=FLOODED_ONLY("calm")),
    card("warm_hold", "warm_card_title", "doseTimer", None, 60, "warm", TO_CLOSE, running="warm_running"),
    # Something for one sense: settling, or waking up a bit (the PRD's activating soothing for a low, flat day).
    ask("way", "way_title", "way_hint", "way", "way", [{"to": "sense_pick"}]),
    ask("sense_pick", "sense_title", "sense_hint", "sense_pick", "sense", [{"to": "sense_hold"}], own="sense_own",
        where={"eq": ["$opt.direction", a("way")]}),
    card("sense_hold", "sense_card_title", "doseTimer", None, 60, "sense", TO_CLOSE, running="sense_running"),
    # Kind words: on paper once, then a hand on the heart while they land.
    ask("words", "words_title", "words_hint", "words", "words", [{"to": "words_card"}], own="words_own"),
    {"id": "words_card", "kind": "embed", "embed": "boundaryLine", "answerAs": "words_card", "title": "words_card_title",
     "props": {"field": "words", "shape": "line", "next": "words_card_next", "copyLabel": "words_copy",
               "copiedLabel": "words_copied", "selectedLabel": "words_selected"},
     "links": [SAFETY_LINK], "next": [{"to": "land"}]},
    card("land", "land_title", "bodyCard", "hand_heart", 60, "land", TO_CLOSE),
    # The close, asked in the flow.
    ask("close", "close_title", None, "close", "tvn",
        [{"when": {"eq": [a("close"), "worse"]}, "to": "stirred"}, {"to": "reach"}],
        field_extra={"askFresh": "thenVsNow"}),
    # Backdraft (PRD step 3): lighter, the body, or stop. Stirred up twice → lighter things only, and someone to talk to.
    # After Hold to wait's *Hurt myself*: no lighter hold, straight to an end card with the banner and someone to talk to.
    ask("stirred", "stirred_title", "stirred_hint", "stirred", "stirred",
        [{"when": {"eq": [a("stirred"), "light"]}, "to": "light"}, {"when": {"eq": [a("stirred"), "deserve"]}, "to": "light_deserve"},
         {"to": "stirred_end"}],
        where={"any": [{"not": AFTER_HURT}, {"eq": ["$opt.afterHurt", True]}]}),
    card("light_deserve", "deserve_title", "bodyCard", "hand_heart", 30, "light", [{"to": "again"}], running="light_running",
         done="light_done"),
    card("light", "light_title", "bodyCard", "hand_heart", 30, "light", [{"to": "again"}], running="light_running",
         done="light_done"),
    ask("again", "again_title", None, "again", "again",
        [{"when": {"eq": [a("again"), "still"]}, "to": "lighter"}, {"to": "reach"}]),
    handoff("lighter", [{"when": ALWAYS, "key": "lighter_line"}, {"when": ALWAYS, "key": "talk_line"}],
            [{"exit": "cool_down", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}], no_close=False),
    handoff("stirred_end",
            [{"when": {"eq": [a("stirred"), "stop"]}, "key": "stop_line"}, {"when": {"eq": [a("stirred"), "press"]}, "key": "press_line"},
             {"when": ALWAYS, "key": "talk_line"}],
            [{"exit": "cool_down", "when": {"eq": [a("stirred"), "press"]}}, {"exit": "safety_open", "when": ALWAYS}], no_close=False),
    # Outward: always offered, never pushed.
    ask("reach", "reach_title", "reach_hint", "reach", "reach", [{"to": "end"}]),
    handoff("end",
            [{"when": {"eq": [a("again"), "easier"]}, "key": "end_easier"},
             {"when": {"all": [{"not": {"set": a("again")}}, {"in": [a("close"), ["better", "much_better"]]}]}, "key": "end_warmer"},
             {"when": {"all": [{"not": {"set": a("again")}}, {"eq": [a("close"), "same"]}]}, "key": "end_same"},
             {"when": {"eq": [a("reach"), "yes"]}, "key": "end_reach"}],
            [], no_close=False),
]

STEPS = [{**s, "crisis": CRISIS} for s in STEPS]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body (press, backdraft)
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("pick", v, label, {"calm": True} if calm else {}, None) for v, label, calm in PICK]
    out += [("deserve", v, label, {}, None) for v, label in DESERVE]
    out += [("where", v, label, {"touch": v == "chest", **({"calm": True} if v in CALM_WHERE else {})}, "SootheOption") for v, label in WHERE]
    out += [("warm", v, label, {"sense": "touch", "direction": "calm", **({"calm": True} if v in CALM_WARM else {})}, "SootheOption") for v, label in WARM]
    out += [("way", v, label, {}, None) for v, label in WAY]
    out += [("sense", v, label, {"sense": s, "direction": d}, "SootheOption") for v, label, s, d in SENSE]
    out += [("words", v, label, {}, None) for v, label in WORDS]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    out += [("stirred", v, label, {"afterHurt": ok}, None) for v, label, ok in STIRRED]
    out += [("again", v, label, {}, None) for v, label in AGAIN]
    out += [("reach", v, label, {}, None) for v, label in REACH]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "pick", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded keeps the first screen to the hand, warmth and the chip.
    "accepts": ["band", "frame", "enterAt"],
    # Page entries: First, the body's *A hand on my heart* and Hold to wait's move open at where the hands rest.
    "entries": {"hand": "where"},
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
