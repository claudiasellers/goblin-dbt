"""Let it be a wave (ER-08, part 1; mindfulness of current emotion: DBT ER Handout 22, Linehan 2015) as a skill on
the runtime.

The editable source. The flow is PRD ER-08 (/mnt/project-files/handoffs/prds/prd-emotion-regulation.md): the feeling
fits, can't be fixed, and the person is fighting it (ashamed of being angry, afraid of the fear, shoving the sadness
away), or it's a good feeling they can't let themselves have. The person becomes the container that receives the
feeling without blocking or amplifying it; the wave gives it a beginning, a crest and an end. About two minutes;
steady or stirred.

Steps:
  feel      *What's the feeling?* carried words first, any word behind *More words*. A word for being blank or far
            away (numb, empty, apathetic, indifferent) never gets the wave (PRD: not offered; activate and orient
            first): `blank`, grounding.
  heads_up  a carried flooded reading: the body first, or try it anyway (PRD: flooded → ER-01 first).
  where     *Where do you notice it?* the body's places (the same `BodyRegion` nodes the check-in marks), one,
            or *I can't find it* (a full answer).
  wave      DT-05's `urgeWave` with the feeling's copy, headed by the two errors in words (part 1 has no gestures):
            *Don't push it away. Don't hold on to it.* A soft check every 30 s, *still here · easing · gone · bigger*,
            four at most. No digits or durations. Never asks the person to close their eyes. Savouring: *Let it be as
            big as it is. You don't have to make it last.* (H15: unmindful of worries about it ending).
  bigger    bigger twice: *Something for my body* (First, the body) or *Keep watching it* (`wave2`, from where it
            was). Bigger twice again → the body.
  close     *You're the one noticing it.* (decentring, H22) heads the close asked in the flow (`askFresh: 'thenVsNow'`): *Louder · About the same · A bit quieter · Much
            quieter*. Louder → First, the body. About the same → "It doesn't have to go anywhere…" (PRD step 6).

Savouring mode (pleasant words: the happy family and the pleasant surprises): the same room, warmer; the allow card
says it doesn't have to last, the wave has no bigger branch, and it ends on its own card with Good things (ER-04) to
keep it. No then-vs-now there: a good feeling getting quieter isn't the outcome.

A safety-screen word (scripts/safety/content.py SCREEN_EMOTIONS) that can reach the wave (worthless, despair,
helpless, powerless) gets the line about thoughts of not being here on the where screen and the end card; never a
gate. *Talk to someone now* on every screen.

docs/design/mindfulness-emotions.md lists what part 1 defers (the push / grab gestures and FTF's rooms as the visual,
*a time it was different* from the word collection, the DT containment return, savouring's *keep it*, MF's practice
home and fade) and where it departs from the PRD.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("body_map_content_me", os.path.join(os.path.dirname(HERE), "body-map", "content.py"))
BM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(BM)
_spec = importlib.util.spec_from_file_location("emotions_content_me", os.path.join(os.path.dirname(HERE), "emotions", "content.py"))
EM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(EM)

ID = "mindfulness_emotions"
TOOL_ID = "mindfulness-emotions"
CONCEPT = "dbt_mindfulness_current_emotion"
VERSION = "me-v1"
OWN_MAX = 60

COPY = {
    "feel_title": "What's the feeling?",
    "feel_hint": "Pick the closest word. It doesn't have to be exact.",
    "feel_more": "More words",
    # Blank or far away (PRD: not offered; activate and orient first).
    "blank_title": "Back to the room first.",
    "blank_line": "When a feeling is hard to reach, watching it can wait. Noticing what's around you can help right now.",
    # A word that can mean danger now (Gate 3): asked once, as Let it be does. Acceptance is never for ongoing harm.
    "safe_title": "Is anyone hurting or threatening you right now?",
    "safe_hint": "Letting a feeling be is never about staying somewhere you're being hurt.",
    "unsafe_title": "When someone is hurting you, the feeling is telling you something.",
    "unsafe_line": "Getting safe comes first. The support is on this screen. If it's someone close to you, Ending a relationship that's hurting you can help you think it through.",
    # A carried flooded reading, or a word that means flooding (PRD: ER-01 first, with a heads-up).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "A feeling is easier to watch once your body settles a little. You can still try.",
    "settle_line": "The feeling will keep. Settling your body comes first.",
    "where_title": "Where do you notice it in your body?",
    "where_hint": "Pick the closest. Roughly is fine, and whole body counts.",
    # A safety-screen word: said, never a gate.
    "heavy_line": "Heavy feelings can come with thoughts of not being here. If they do, talk to someone now.",
    # The wave (urgeWave), with the two errors in words (PRD step 3; part 1 has no gestures). No durations.
    "wave_title": "Don't push it away. Don't hold on to it.",
    "riding": "Pushing makes it stick. Holding on makes it bigger. Let it rise and fall where you notice it, with the room still in view.",
    "wave_again_title": "Back to watching it.",
    # Savouring (H15: unmindful of worries about it ending).
    "savour_wave_title": "Let it be as big as it is. You don't have to make it last.",
    "savour_riding": "If a worry about it ending shows up, notice it, and come back to the feeling.",
    "check_title": "How is it now?",
    "still_here": "Still here",
    "fading": "Easing",
    "gone": "Gone",
    "bigger": "Bigger",
    "wave_next": "Stop here",
    "bigger_title": "It's getting bigger.",
    "bigger_hint": "That can happen when you stop pushing a feeling away. You can give your body something, or keep watching.",
    "switch_line": "Let's give your body something first. The feeling will keep.",
    # Bigger: a way out if it turns into a memory (the wave is for the feeling now; Gate 3).
    "memory_line": "When a feeling pulls you into a memory, grounding comes first, not watching. If it happens a lot, someone trained in trauma can help.",
    # Decentring (H22), above the close (asked in the flow).
    "notice_title": "You're the one noticing it.",
    "notice_hint": "There's the feeling, and there's you, watching it.",
    # The wave ended on gone: said in the past.
    "notice_gone_title": "You were the one watching it.",
    "notice_gone": "It came and went, and you stayed with it.",
    "close_title": "How is the feeling now?",
    "louder_line": "Letting a feeling in can make it louder for a bit. That happens.",
    "end_same": "It doesn't have to go anywhere. You let it be here, and that's the skill.",
    "end_quieter": "You let it rise and fall without pushing it away. You can do this again, anywhere.",
    "savour_end": "You let a good feeling be here, without needing it to last. That counts.",
    "good_things_offer": "Keep it in Things I like",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

# One chip per common feeling (carried words first); the full list a tap away.
FEEL_CHIPS = ["sad", "scared", "angry", "ashamed", "guilty", "lonely", "hurt", "happy", "loving"]
# Blank or far away: grounding, never the wave (PRD band and flags). Numb and empty are also safety-screen words.
BLANK_WORDS = ["numb", "empty", "apathetic", "indifferent"]
# Safety-screen words (scripts/safety/content.py SCREEN_EMOTIONS) that can reach the wave.
HEAVY_WORDS = ["worthless", "despair", "helpless", "powerless", "depressed"]
# Words that can mean danger from someone now (Gate 3): one question before anything else.
DANGER_WORDS = ["threatened", "violated", "persecuted", "victimized"]
# Words that mean flooding: the heads-up, as a carried flooded reading gets.
FLOOD_WORDS = ["overwhelmed", "out_of_control"]
# Savouring: the happy family on both pleasant quadrants, and the pleasant surprises. Startled, confused, shocked,
# dismayed, disillusioned and perplexed share the surprised family but aren't good feelings to savour: they get the wave.
# Aroused and powerful get the plain wave: "as big as it is" isn't the line for activation that can run away (Gate 3).
PLEASANT_SURPRISE = ["surprised", "amazed", "excited", "astonished", "awe", "eager", "energetic"]
NOT_SAVOURED = ["aroused", "powerful"]
SAVOUR_WORDS = sorted(({w[0] for w in EM.SQUARE if isinstance(w, tuple) and w[3] == "happy" and w[2].endswith("pleasant")
                        and not w[2].endswith("unpleasant")} | set(PLEASANT_SURPRISE)) - set(NOT_SAVOURED))

BLANK = {"in": [a("feel"), BLANK_WORDS]}
SCREENED_BLANK = {"in": [a("feel"), ["numb", "empty"]]}
DANGER = {"in": [a("feel"), DANGER_WORDS]}
UNSAFE = {"in": [a("safe"), ["yes", "sometimes", "unsure"]]}  # anything uncertain is the safety branch
CRISIS_OTHER = [{"variant": "other_person", "when": UNSAFE}]
LOUD = {"any": [FLOODED, {"in": [a("feel"), FLOOD_WORDS]}]}
HEAVY = {"in": [a("feel"), HEAVY_WORDS]}
SAVOUR = {"in": [a("feel"), SAVOUR_WORDS]}
SAMPLES = ["still_here", "fading", "gone", "bigger"]


def ended(field, how):
    return {"has": [f"$a.{field}.ids", how]}


GONE = {"any": [ended("wave", "ended_gone"), ended("again", "ended_gone")]}
HEADS_UP = [("body", "My body first"), ("try", "Try it anyway")]
SAFE = [("no", "No, I'm safe right now", {}), ("yes", "Yes", {"danger": "other"}), ("sometimes", "Sometimes", {"danger": "other"}),
        ("unsure", "I'm not sure", {"danger": "other"})]
WHERE = [(rid, BM.REGION_NAMES[rid][0]) for rid in BM.REGIONS] + [("cant_find", "I can't find it")]
BIGGER = [("body", "Something for my body"), ("keep", "Keep watching it"), ("memory", "It's pulling me into a memory")]
TVN = [("worse", "Louder"), ("same", "About the same"), ("better", "A bit quieter"), ("much_better", "Much quieter")]


def handoff(sid, title, lines, offers, *, no_close=True, crisis=None, **extra):
    s = {"id": sid, "kind": "handoff", "complete": True, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK], **extra}
    if title:
        s["title"] = title
    if crisis:
        s["crisis"] = crisis
    if no_close:
        s["noClose"] = True
    return s


def wave(step_id, answer_as, title, continue_from=None, riding="riding"):
    props = {"checkSec": 30, "maxChecks": 4, "checkTitle": "check_title", "riding": riding,
             **{s: s for s in SAMPLES}, "next": "wave_next"}
    if continue_from:
        props["continueFrom"] = continue_from
    return {"id": step_id, "kind": "embed", "embed": "urgeWave", "answerAs": answer_as, "title": title,
            "links": [SAFETY_LINK], "props": props}


STEPS = [
    {
        "id": "feel", "kind": "ask", "title": "feel_title", "hint": "feel_hint",
        "fields": [{"id": "feel", "options": {"emotions": FEEL_CHIPS, "carriedFirst": True, "moreKey": "feel_more"},
                    "max": 1, "required": True, "emotion": True, "links": [SAFETY_LINK]}],
        "next": [{"when": BLANK, "to": "blank"}, {"when": DANGER, "to": "safe"}, {"when": LOUD, "to": "heads_up"}, {"to": "where"}],
    },
    {
        "id": "safe", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "crisis": CRISIS_OTHER,
        "fields": [{"id": "safe", "options": {"list": "safe"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": UNSAFE, "to": "unsafe"}, {"when": LOUD, "to": "heads_up"}, {"to": "where"}],
    },
    # Not safe, or not sure: no wave. The support on the screen, Ending in its careful frame, someone to talk to.
    handoff("unsafe", "unsafe_title", [{"when": ALWAYS, "key": "unsafe_line"}],
            [{"exit": "safety_open", "when": ALWAYS}, {"exit": "ending", "when": ALWAYS}], crisis=CRISIS_OTHER),
    # Numb and empty (safety-screen words): someone to talk to as an offer, so not again as the quiet link.
    {**handoff("blank", "blank_title", [{"when": ALWAYS, "key": "blank_line"}],
               [{"exit": "five_senses", "when": ALWAYS}, {"exit": "safety_open", "when": SCREENED_BLANK}]),
     "links": [{**SAFETY_LINK, "when": {"not": SCREENED_BLANK}}]},
    {
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint",
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("heads_up"), "body"]}, "to": "settle"}, {"to": "where"}],
    },
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    {
        "id": "where", "kind": "ask", "title": "where_title", "hint": "where_hint",
        # A safety-screen word: the line, above the hint; never a gate.
        "lines": [{"when": HEAVY, "key": "heavy_line"}],
        "fields": [{"id": "where", "options": {"list": "where"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": SAVOUR, "to": "savour_wave"}, {"to": "wave"}],
    },
    # A safety-screen word getting bigger: no *keep watching*, the body and someone to talk to (Gate 3).
    {**wave("wave", "wave", "wave_title"),
     "next": [{"when": {"all": [ended("wave", "ended_bigger"), HEAVY]}, "to": "switch"},
              {"when": ended("wave", "ended_bigger"), "to": "bigger"}, {"to": "close"}]},
    {
        "id": "bigger", "kind": "ask", "title": "bigger_title", "hint": "bigger_hint",
        "fields": [{"id": "bigger", "options": {"list": "bigger"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("bigger"), "keep"]}, "to": "wave2"}, {"when": {"eq": [a("bigger"), "memory"]}, "to": "memory"},
                 {"to": "switch"}],
    },
    handoff("memory", None, [{"when": ALWAYS, "key": "memory_line"}],
            [{"exit": "five_senses", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}]),
    {**wave("wave2", "again", "wave_again_title", continue_from="wave"),
     "next": [{"when": ended("again", "ended_bigger"), "to": "switch"}, {"to": "close"}]},
    handoff("switch", None, [{"when": HEAVY, "key": "switch_heavy"}, {"when": ALWAYS, "key": "switch_line"}],
            [{"exit": "safety_open", "when": HEAVY}, {"exit": "cool_down", "when": ALWAYS}]),
    {
        # Decentring (PRD step 4), then the close on the same screen: the question is the field's label.
        "id": "close", "kind": "ask",
        "title": [{"when": GONE, "key": "notice_gone_title"}, {"key": "notice_title"}],
        "lines": [{"when": GONE, "key": "notice_gone"}, {"when": ALWAYS, "key": "notice_hint"}],
        "fields": [{"id": "close", "label": "close_title", "options": {"list": "tvn"}, "max": 1, "required": True, "askFresh": "thenVsNow",
                    "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("close"), "worse"]}, "to": "louder"}, {"to": "end"}],
    },
    handoff("louder", None, [{"when": HEAVY, "key": "louder_heavy"}, {"when": ALWAYS, "key": "louder_line"}],
            [{"exit": "safety_open", "when": HEAVY}, {"exit": "cool_down", "when": ALWAYS}], no_close=False),
    handoff("end", None,
            [{"when": {"all": [HEAVY, {"eq": [a("close"), "same"]}]}, "key": "end_same_heavy"},
             {"when": HEAVY, "key": "end_quieter_heavy"},
             {"when": {"eq": [a("close"), "same"]}, "key": "end_same"},
             {"when": ALWAYS, "key": "end_quieter"}],
            [], no_close=False),
    # Savouring: its own end, no then-vs-now (a good feeling easing isn't the outcome); Good things to keep it.
    # Savouring that keeps getting bigger: the body, not "that counts" (Gate 3).
    {**wave("savour_wave", "savour", "savour_wave_title", riding="savour_riding"),
     "next": [{"when": ended("savour", "ended_bigger"), "to": "switch"}, {"to": "savour_end"}]},
    handoff("savour_end", None, [{"when": ALWAYS, "key": "savour_end"}], [{"exit": "good_things", "when": ALWAYS}]),
]
COPY["end_same_heavy"] = f"{COPY['end_same']} {COPY['heavy_line']}"
COPY["end_quieter_heavy"] = f"{COPY['end_quieter']} {COPY['heavy_line']}"
COPY["switch_heavy"] = f"{COPY['switch_line']} {COPY['heavy_line']}"
COPY["louder_heavy"] = f"{COPY['louder_line']} {COPY['heavy_line']}"

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                                       # DT-01 First, the body
    {"id": "five_senses", "toolId": "five-senses"},                                   # orienting: blank or far away
    {"id": "good_things", "toolId": "good-things", "query": {"frame": "savour"}, "label": "good_things_offer"},  # ER-04: keep it
    {"id": "ending", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # IE-08: someone hurting them now
    {"id": "safety_open", "toolId": None, "safety": True},                            # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("safe", v, label, props, None) for v, label, props in SAFE]
    out += [("where", v, label, {}, ("BodyRegion", v) if v != "cant_find" else None) for v, label in WHERE]
    out += [("bigger", v, label, {}, None) for v, label in BIGGER]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "feel", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first, or try anyway.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"],
}
