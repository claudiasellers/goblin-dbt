"""Notice it, name it (MF-01; observe and describe: DBT Mindfulness Handouts 4, 4a, 4b, Linehan 2015) as a skill on
the runtime.

The editable source. The flow is PRD MF-01 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): "I can't tell
what's going on in me", "my head is loud". The person gets something to do with their attention that yields a word
or two they believe, without being asked for an emotion they can't find. One to three minutes, eyes open, outside-in.
The design note is docs/design/notice-and-name.md; it lists what part 1 defers (fade levels, the my-words shelf,
the Inside tier's silhouette, the Listen sound dots) and where it departs from the PRD.

Steps:
  way       *Pick a way to notice.* Look · Listen · Touch · Feet on the floor · Inside the body (the Inside tier is
            hidden on a carried flooded reading and in the `far` frame: PRD gate table, never inward then). One is
            listed first by the frame a host passes (`listen` for watchful results, `far` after feeling far away,
            `blank` for shut-down states: Feet first, the fast press). A carried flooded reading gets the heads-up as
            the title and Look or Listen only, with *My body first* (First, the body) as a quiet link.
  look_what *Find three things that are…* blue · round · soft · old (neutral finds; the PRD's graduation to pleasant
            finds is part 2).
  look      `orientFind`: three finds, today's date and the time on screen (the DISSOC rule, kept for everyone).
  listen    `pebbleBowl` (a minute): a pebble each time a new sound arrives.
  touch     `pebbleBowl` (45 s): hold something, warm or cool, smooth or rough; a pebble each time you come back.
  contact   `squeezeRelease`: press your feet down, then let go, three rounds (no breath words).
  inside_where  *Start where you touch the chair or the floor. Then a little further in.* the body's places (the
            same `BodyRegion` nodes the check-in marks), or *Nothing stands out* (a full answer).
  inside    `pebbleBowl` (30 s) on that place.
  name      *What was it like?* up to two quality words for that way of noticing, offered as guesses (Inside: the
            check-in's sensation words, the same `SensationType` nodes), *My own word*, or *No words today* (a full
            answer). Skipped on a carried flooded reading (PRD: no words, or one).
  else      *What else showed up while you did this?* a thought · a feeling · a body sensation · an urge · nothing
            much. Optional (PRD: describe as Linehan frames it, a thought labelled as a thought).
  close     the close, asked in the flow (`askFresh: 'thenVsNow'`, orienting): *Further away · About the same · A bit
            more here · More here*. Further away → back to the room (`orientFind`), then a plain line about what
            feeling far away can mean, eyes-open ways next time, and someone to talk to.
  end       *Wandering is the practice.* A feeling that showed up → Find the feeling; a thought → Thoughts passing
            through. Optional: *Try one without the app?* (the `offphone_rep` card, tomorrow), which reopens the run
            at *Did you notice something without the app?* (`offphone`): yes is an off-phone rep (runRep).

Every completed visit logs an observe and a describe rep (PracticeSkill `observe`, `describe`, defaultFor
`notice-and-name`; scripts/practice-spine/content.py). Nothing here asks the person to close their eyes, follow their
breath or scan the room for danger.
"""

import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("body_map_content_nn", os.path.join(os.path.dirname(HERE), "body-map", "content.py"))
BM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(BM)

ID = "notice_and_name"
TOOL_ID = "notice-and-name"
CONCEPT = "dbt_observe"
VERSION = "nn-v1"
OWN_MAX = 40  # a word or two

COPY = {
    "way_title": "Pick a way to notice.",
    "way_hint": "Eyes open, a minute or so. Your mind will wander. Coming back is the practice.",
    # A carried flooded reading (PRD gate table: nothing standalone; a heads-up, the body first, then Look or Listen).
    "way_title_flooded": "Your body's loud right now.",
    "way_hint_flooded": "Noticing works better once your body settles. You can look or listen for a minute, or start with your body.",
    "body_first": "My body first",
    # Look.
    "look_what_title": "Find three things that are…",
    "look_what_hint": "Pick one. Any shade, any size.",
    "look_title": "Find three things that are {what}.",
    "here": "You're here, and it's",
    "look_task": "Tap each one as you find it.",
    "found": "Found one",
    "found_done": "That's three.",
    # Listen, Touch, Inside (the pebble bowl).
    "listen_title": "Listen.",
    "listen_task": "Each time a new sound arrives, tap. Near or far, loud or soft.",
    "listen_tap": "A new sound",
    "touch_title": "Hold something near you.",
    "touch_task": "Is it warm or cool? Smooth or rough? When your mind wanders, tap, and come back to it.",
    "inside_title": "Stay with your {place} for a little while.",
    "inside_title_none": "Stay with where you touch the chair or the floor.",
    "inside_task": "Notice what's there, without changing it. When your mind wanders, tap, and come back.",
    "came_back": "Came back",
    "bowl_start": "Start",
    "bowl_running": "A pebble for each time.",
    "bowl_dropped": "A pebble in the bowl.",
    "bowl_done": "That's the time.",
    # Feet on the floor.
    "contact_title": "Feet on the floor.",
    "contact_step1": "Hold the circle and press your feet down into the floor.",
    "contact_step2": "Let go, and notice the difference.",
    "contact_start": "Hold to press",
    "contact_press": "Pressing",
    "contact_drop": "Let go",
    "contact_done": "That's three.",
    # Inside.
    "inside_where_title": "Start where you touch the chair or the floor. Then a little further in.",
    "inside_where_hint": "Where is something most noticeable right now? Roughly is fine.",
    # Name it.
    "name_title": "What was it like?",
    "name_hint": "Pick up to two. A guess is fine, and so is no words.",
    "name_own": "My own word",
    # What else showed up.
    "else_title": "What else showed up while you did this?",
    "else_hint": "Tap any. Noticing them is part of it.",
    # The close (in the flow), worded for noticing.
    "close_title": "Compared to when you started, you feel…",
    # Further away: back to the room, then a plain line (PRD runtime rules 3 and 5).
    "room_title": "Back to the room.",
    "room_task": "Find three things you can see.",
    "far_line": "Feeling further away can happen when you notice. It isn't a failure. Looking and listening, eyes open, tend to suit better for now.",
    "far_heavy_line": "If feeling far away comes with thoughts of hurting yourself, or happens a lot, talk to someone.",
    # The end.
    "end_line": "Wandering is the practice. Each time you came back, that was the skill.",
    "end_flooded_line": "You noticed something while your body was loud. That counts.",
    "end_feeling_line": "A feeling showed up. If you want a word for it, Find the feeling can help.",
    "end_thought_line": "A thought showed up. Watching it as a thought is its own practice.",
    "offphone_q": "Try one without the app? Next time you're waiting for the kettle or a bus, notice three sounds. I'll ask how it went.",
    # The off-phone check (reopened from the offphone_rep card).
    "offphone_title": "Did you get to notice something without the app?",
    "offphone_yes_line": "That's the practice moving off the phone, which is where it's meant to live.",
    "offphone_sort_line": "A few seconds of noticing is still noticing. Next time, try for three sounds.",
    "offphone_not_line": "Not yet is fine. It'll be there next time you're waiting.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
NOT_FLOODED = {"not": FLOODED}
FAR = {"eq": ["$ctx.frame", "far"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

# Ways to notice (ObserveChannel): outside in. `inward` ones are never offered flooded or far away; `calm` ones are the
# two a carried flooded reading may still pick (PRD gate table: Look or Listen only).
WAYS = [
    ("look", "Look", {"calm": True}),
    ("listen", "Listen", {"calm": True}),
    ("touch", "Touch", {}),
    ("contact", "Feet on the floor", {}),
    ("inside", "Inside the body", {"inward": True}),
]
# Neutral finds (LookPrompt, graduation stage neutral; PRD: qualities, never "scan the room" or "check for exits").
LOOK_FOR = [("blue", "blue"), ("round", "round"), ("soft", "soft"), ("old", "old")]
# The places, as Let it be a wave asks them (BodyRegion), and a full answer for nothing in particular.
INSIDE_WHERE = [(rid, BM.REGION_NAMES[rid][0]) for rid in BM.REGIONS] + [("none", "Nothing stands out")]
# Quality words per way of noticing (DescribeWord), offered as guesses; contrasting pairs sit side by side.
WORDS = {
    "look": [("bright", "Bright"), ("dull", "Dull"), ("still", "Still"), ("moving", "Moving"), ("near", "Near"), ("far", "Far"),
             ("sharp", "Sharp"), ("blurry", "Blurry")],
    "listen": [("near", "Near"), ("far", "Far"), ("steady", "Steady"), ("coming_going", "Coming and going"), ("high", "High"),
               ("low", "Low"), ("loud", "Loud"), ("quiet", "Quiet")],
    "touch": [("warm", "Warm"), ("cool", "Cool"), ("smooth", "Smooth"), ("rough", "Rough"), ("soft", "Soft"), ("hard", "Hard"),
              ("heavy", "Heavy"), ("light", "Light")],
    "contact": [("solid", "Solid"), ("pressing", "Pressing"), ("heavy", "Heavy"), ("light", "Light"), ("warm", "Warm"),
                ("cool", "Cool"), ("tingly", "Tingly"), ("steady", "Steady")],
}
# Inside: the check-in's sensation words (SensationType), neutral ones from every side of the square.
INSIDE_WORDS = ["tension", "loose", "heaviness", "lightness", "warmth", "cold_sensation", "tingly", "buzzing", "pressure",
                "settled", "numbness_sensation", "achy"]
NO_WORDS = ("no_words", "No words today")
ELSE = [("thought", "A thought"), ("feeling", "A feeling"), ("body", "A body sensation"), ("urge", "An urge"),
        ("nothing", "Nothing much")]
TVN = [("worse", "Further away"), ("same", "About the same"), ("better", "A bit more here"), ("much_better", "More here")]
# The offphone_rep card's window chips (scripts/practice-spine/content.py). Optional: none, nothing scheduled.
WHEN = [("morning", "Tomorrow morning"), ("evening", "Tomorrow evening")]
OFFPHONE = [("yes", "Yes"), ("sort_of", "Sort of"), ("not_yet", "Not yet")]

# The way a host's frame lists first (never selected).
FIRST_WAY = {"listen": "listen", "far": "look", "blank": "contact"}


def ask(step_id, title, hint, field, lst, nxt, *, required=True, own=None, links=None, max_=1, extra=None, step_extra=None):
    f = {"id": field, "options": {"list": lst}, "max": max_, "required": required, **({"links": links} if links else {}),
         **(extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt, **(step_extra or {})}
    if hint:
        s["hint"] = hint
    return s


def bowl(step_id, title, task, tap, seconds, *, title_slots=None):
    s = {"id": step_id, "kind": "embed", "embed": "pebbleBowl", "answerAs": step_id, "title": title,
         "props": {"seconds": seconds, "task": task, "start": "bowl_start", "tapLabel": tap, "running": "bowl_running",
                   "dropped": "bowl_dropped", "done": "bowl_done", "next": "next"},
         "next": [{"when": FLOODED, "to": "close"}, {"to": "name"}]}
    if title_slots:
        s["titleSlots"] = title_slots
    return s


STEPS = [
    ask("way", [{"when": FLOODED, "key": "way_title_flooded"}, {"when": ALWAYS, "key": "way_title"}],
        None, "way", "way",
        [{"when": {"eq": [a("way"), v]}, "to": v if v not in ("look", "inside") else f"{v}_{'what' if v == 'look' else 'where'}"}
         for v, _, _ in WAYS],
        links=[{"exit": "cool_down", "label": "body_first", "when": FLOODED}],
        extra={"options": {"list": "way", "firstFrom": "$d.firstWay",
                           "where": {"all": [{"not": {"all": [{"eq": ["$opt.inward", True]}, {"any": [FLOODED, FAR]}]}},
                                             {"not": {"all": [FLOODED, {"not": {"eq": ["$opt.calm", True]}}]}}]}}},
        step_extra={"lines": [{"when": FLOODED, "key": "way_hint_flooded"}, {"when": NOT_FLOODED, "key": "way_hint"}]}),
    ask("look_what", "look_what_title", "look_what_hint", "what", "look_for", [{"to": "look"}]),
    {"id": "look", "kind": "embed", "embed": "orientFind", "answerAs": "look", "title": "look_title",
     "titleSlots": {"what": {"labelOf": "what"}},
     "props": {"variant": "find", "count": 3, "here": "here", "task": "look_task", "foundLabel": "found",
               "done": "found_done", "next": "next"},
     "next": [{"when": FLOODED, "to": "close"}, {"to": "name"}]},
    bowl("listen", "listen_title", "listen_task", "listen_tap", 60),
    bowl("touch", "touch_title", "touch_task", "came_back", 45),
    {"id": "contact", "kind": "embed", "embed": "squeezeRelease", "answerAs": "contact", "title": "contact_title",
     "props": {"rounds": 3, "squeezeSec": 5, "step1": "contact_step1", "step2": "contact_step2", "start": "contact_start",
               "squeezeLabel": "contact_press", "dropLabel": "contact_drop", "done": "contact_done", "next": "next"},
     "next": [{"when": FLOODED, "to": "close"}, {"to": "name"}]},
    ask("inside_where", "inside_where_title", "inside_where_hint", "place", "inside_where", [{"to": "inside"}]),
    bowl("inside", [{"when": {"eq": [a("place"), "none"]}, "key": "inside_title_none"}, {"when": ALWAYS, "key": "inside_title"}],
         "inside_task", "came_back", 30, title_slots={"place": {"labelOf": "place"}}),
    ask("name", "name_title", "name_hint", "name", "words", [{"to": "else"}], own="name_own", max_=2,
        extra={"options": {"list": "words", "where": {"any": [{"eq": ["$opt.channel", a("way")]}, {"eq": ["$opt.channel", "any"]}]}}}),
    ask("else", "else_title", "else_hint", "else", "else", [{"to": "close"}], required=False, max_=5),
    ask("close", "close_title", None, "close", "tvn",
        [{"when": {"eq": [a("close"), "worse"]}, "to": "room"}, {"to": "end"}], extra={"askFresh": "thenVsNow"}),
    {"id": "room", "kind": "embed", "embed": "orientFind", "answerAs": "room", "title": "room_title",
     "props": {"variant": "find", "count": 3, "here": "here", "task": "room_task", "foundLabel": "found",
               "done": "found_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "far"}]},
    {"id": "far", "kind": "handoff", "complete": True,
     "lines": [{"when": ALWAYS, "key": "far_line"}, {"when": ALWAYS, "key": "far_heavy_line"}],
     "offers": [], "done": "done", "links": [SAFETY_LINK]},
    {"id": "end", "kind": "handoff", "complete": True,
     "lines": [{"when": FLOODED, "key": "end_flooded_line"},
               {"when": {"has": [a("else.ids"), "feeling"]}, "key": "end_feeling_line"},
               {"when": {"has": [a("else.ids"), "thought"]}, "key": "end_thought_line"},
               {"when": ALWAYS, "key": "end_line"}],
     "offers": [{"exit": "find_the_feeling", "when": {"all": [NOT_FLOODED, {"has": [a("else.ids"), "feeling"]}]}},
                {"exit": "thoughts_passing", "when": {"all": [NOT_FLOODED, {"has": [a("else.ids"), "thought"]}]}}],
     "done": "done",
     # The reminder chips (R5 on a hand-off): optional; leaving with one picked schedules offphone_rep.
     "fields": [{"id": "when", "label": "offphone_q", "max": 1, "options": {"list": "when"}}],
     "followUp": {"type": "offphone_rep", "whenFrom": "when"}},
    # Reopened from the offphone_rep card (R9): only a run that reached the end card.
    ask("offphone", "offphone_title", None, "offphone", "offphone", [{"to": "offphone_end"}],
        step_extra={"reopens": {"after": "end"}, "clears": ["offphone"]}),
    {"id": "offphone_end", "kind": "handoff", "complete": True, "noClose": True,
     "lines": [{"when": {"eq": [a("offphone"), "yes"]}, "key": "offphone_yes_line"},
               {"when": {"eq": [a("offphone"), "sort_of"]}, "key": "offphone_sort_line"},
               {"when": ALWAYS, "key": "offphone_not_line"}],
     "offers": [], "done": "done"},
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body (a carried flooded reading)
    {"id": "find_the_feeling", "toolId": "find-the-feeling"},            # ER: a feeling showed up, a word for it
    {"id": "thoughts_passing", "toolId": "thoughts-passing"},            # DT-08: a thought showed up
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("way", v, label, props, "ObserveChannel") for v, label, props in WAYS]
    out += [("look_for", v, label, {}, "LookPrompt") for v, label in LOOK_FOR]
    out += [("inside_where", v, label, {}, ("BodyRegion", v) if v != "none" else None) for v, label in INSIDE_WHERE]
    seen = set()
    for ch, words in WORDS.items():
        for v, label in words:
            # One option per word; a word two ways share is listed once per way (its own id), so a filter keeps it.
            oid = f"{ch}_{v}"
            assert oid not in seen
            seen.add(oid)
            out.append(("words", oid, label, {"channel": ch}, "DescribeWord"))
    labels = {w[0]: w[1] for w in BM.PAD_WORDS}
    out += [("words", f"inside_{sid}", labels[sid], {"channel": "inside"}, ("SensationType", sid)) for sid in INSIDE_WORDS]
    out += [("words", NO_WORDS[0], NO_WORDS[1], {"channel": "any"}, None)]
    out += [("else", v, label, {}, "MentalEventType") for v, label in ELSE]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("offphone", v, label, {}, None) for v, label in OFFPHONE]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "way", "ownMax": OWN_MAX,
    # band: a carried flooded reading (C6.2); frame: listen (watchful results), far (after feeling far away), blank.
    "accepts": ["band", "frame"],
    "copy": COPY, "tables": {"firstWayOf": FIRST_WAY},
    "derive": [{"name": "firstWay", "from": "$ctx.frame", "table": "firstWayOf"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
