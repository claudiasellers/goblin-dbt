"""Thoughts passing through (DT-08; mindfulness of current thoughts: DBT DT Handout 15, Linehan 2015) as a skill on
the runtime.

The editable source. The flow is PRD DT-08 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): a thought is being treated as a fact or a command ("I'm too much", "they hate me",
"I have to text"). The thought is received without argument, becomes an event with a start and an end, and stepping
back from it (decentring) becomes a habit. About two minutes; steady or stirred.

- **Catch it**: chips (DEAR MAN debrief's `ThoughtPattern`s, which the options present, plus a few general ones) or a
  few words of their own.
- **File it**: a judgement · a prediction · a memory · an ought-to · about them · about me. Two more are routes, not
  kinds: *a memory that feels like it's happening now* (intrusive trauma memory → orient first, and a line about
  someone trained in it), *it doesn't feel like my own thought* (a line about a doctor or care team) and *about hurting
  myself or not being here* (the crisis banner and someone to talk to, no exercise: voice.md S9).
- **One way to hold it further off**: *Put words in front of it* (I'm having the thought that…) (the thought on paper, then with the frame in
  front), *slow it down*, *set it on a leaf*, *watch it on a screen*. Silly voices are left out for everyone (the PRD
  excludes them for shame; a thought here is often about the self).
- **Back to the room**: three things you can see (`orientFind`), eyes open.
- **The close, asked in the flow**: *Louder · About as loud · A bit further away · Much further away*
  (`askFresh: 'thenVsNow'`). Louder → the body first. About as loud → that still counts, and Check the Facts for a
  kind of thought that rests on something.

A carried flooded reading gets a heads-up first: the body, or try it anyway (PRD: flooded → DT-01 with a heads-up).
docs/design/thoughts-passing.md lists what part 1 defers (the stretching words and the drifting leaf as embeds, MF's
practice home and fade, CORE's chain links, the `clinical_referral_psychosis` content node) and where it departs from
the PRD.

Safety (plan C6): *Talk to someone now* on every screen; nothing
argues with the thought or asks the person to close their eyes.
"""

import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content_tp", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)

ID = "thoughts_passing"
TOOL_ID = "thoughts-passing"
CONCEPT = "dbt_mindfulness_current_thoughts"
VERSION = "tp-v2"
OWN_MAX = 60  # the thought in a few words (the record keeps every own-words field)

COPY = {
    "catch_title": "What's the thought?",
    "catch_hint": "Pick the closest, or put it in a few words.",
    "catch_own": "In my own words",
    # A carried flooded reading (PRD: DT-01 first, with a heads-up).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "Thoughts are easier to watch once your body settles. You can still try.",
    "settle_line": "The thought will keep, and it's easier to watch from steadier ground.",
    # File it.
    "file_title": "What kind of thought is it?",
    "file_hint": "Naming the kind can give a little distance.",
    # A handoff card shows its first matching line, so each is one line.
    "replay_line": "A memory that feels like it's happening now needs grounding first, not watching. If it happens a lot, someone trained in trauma can help.",
    "not_mine_line": "Thoughts that don't feel like your own are worth talking through with a doctor, or your care team if you have one. For now, something steady around you can help.",
    # A thought about hurting themselves or not being here gets no exercise: someone to talk to (voice.md S9).
    "harm_line": "That's a heavy thought to carry. Someone to talk to comes first.",
    # One way to hold it further off.
    "move_title": "Pick one way to hold it a little further off.",
    "move_hint": "Nothing to argue with. Only a little distance.",
    "having_title": "Here's the thought. In a moment, say it to yourself with a few words in front.",
    "having_next": "Next",
    "frame_title": "Say the thought to yourself, with a few words in front.",
    "frame_step1": "Say \u201cI'm having the thought that\u201d, then the thought.",
    "frame_step2": "Once more: \u201cI notice I'm having the thought that\u201d, then the thought.",
    "frame_step3": "Notice any change in how close it feels.",
    "slow_title": "Slow it right down.",
    "slow_step1": "Your thought arrives one word at a time.",
    "slow_step2": "Say each word in your head as it comes, with a long gap.",
    "slow_step3": "Notice it's made of words.",
    "leaf_title": "Set it on a leaf.",
    "leaf_step1": "Your thought is on a leaf, on a stream.",
    "leaf_step2": "Let it float at its own pace, and watch.",
    "leaf_step3": "If it stays or comes back, that's okay. Put it on the next leaf.",
    "screen_title": "Watch it on a screen.",
    "screen_step1": "Picture the thought as words on a screen across the room.",
    "screen_step2": "Let them sit there, like subtitles.",
    "screen_step3": "Let them stay or scroll off, in their own time.",
    "start": "Start",
    "running_frame": "Saying it",
    "running_slow": "Slowly",
    "running_leaf": "Floating",
    "leaf_another": "Another leaf",
    "running_screen": "Watching",
    "move_done": "That's it.",
    # Back to the room.
    "room_title": "Back to the room.",
    "here": "You're here, and it's",
    "found": "Found one",
    "find_done": "That's it.",
    "room_task": "Find three things you can see.",
    # The close (in the flow).
    "close_title": "How is the thought now?",
    "louder_line": "Watching a thought can make it louder for a bit. That happens.",
    "end_same": "It's still loud, and you noticed it as a thought. That's the skill, even when it doesn't shift.",
    "end_same_facts": "It's still loud, and you noticed it as a thought. That's the skill. If you want to look at what it rests on, checking the facts can help.",
    "end_further": "You held it as a thought, something passing through. You can do this again, anywhere.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

# DEAR MAN debrief's ThoughtPatterns that read outside an ask (not *I don't deserve to ask* or *They never listen*),
# then a few general ones.
SHARED = ["thought_too_much", "thought_my_fault", "thought_cant_handle", "thought_wrong", "thought_will_leave"]
OWN_THOUGHTS = [
    ("hate_me", "They hate me"),
    ("have_to", "I have to do something right now"),
    ("mess_up", "I'm going to mess this up"),
    ("never_change", "Nothing will ever change"),
]
HEADS_UP = [
    ("body", "My body first"),
    ("try", "Try it anyway"),
]
FILE = [
    ("judgement", "A judgement"),
    ("prediction", "A prediction"),
    ("ought", "An 'ought to' or a 'have to'"),
    ("about_me", "About me"),
    ("about_them", "About them"),
    ("memory", "A memory"),
    # Routes, not kinds.
    ("replay", "A memory that feels like it's happening now"),
    ("not_mine", "It doesn't feel like my own thought"),
    ("harm", "About hurting myself or not being here"),
]
# DefusionMove (DT Handout 15's ways of observing thoughts). Silly voices are left out (the PRD's shame exclusion).
MOVES = [
    ("having", "Put words in front of it"),
    ("slow", "Slow it down"),
    ("leaf", "Set it on a leaf"),
    ("screen", "Watch it on a screen"),
]
TVN = [("worse", "Louder"), ("same", "About as loud"), ("better", "A bit further away"), ("much_better", "Much further away")]
FACTS_KINDS = ["judgement", "prediction", "about_them", "about_me", "ought"]


def ask(step_id, title, hint, field, lst, nxt, *, required=True, own=None, links=None, field_extra=None):
    f = {"id": field, "options": {"list": lst}, "max": 1, "required": required, "links": links or [SAFETY_LINK],
         **(field_extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt}
    if hint:
        s["hint"] = hint
    return s


def handoff(step_id, lines, offers, *, no_close=True):
    s = {"id": step_id, "kind": "handoff", "complete": True, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK]}
    if no_close:
        s["noClose"] = True
    return s


def timer(step_id, prefix, seconds):
    return {"id": step_id, "kind": "embed", "embed": "doseTimer", "answerAs": step_id, "title": f"{prefix}_title",
            "props": {"seconds": seconds, "step1": f"{prefix}_step1", "step2": f"{prefix}_step2", "step3": f"{prefix}_step3",
                      "start": "start", "running": f"running_{prefix}", "done": "move_done", "next": "next"},
            "links": [SAFETY_LINK], "next": [{"to": "room"}]}


def drift(variant, seconds):
    """Slow it down and the leaf with the thought's own words on screen (`thoughtDrift`, part 2): the caught thought."""
    step = timer(variant, variant, seconds)
    step["embed"] = "thoughtDrift"
    step["props"] = {"variant": variant, "field": "catch", **{k: v for k, v in step["props"].items()},
                     **({"another": "leaf_another"} if variant == "leaf" else {})}
    return step


STEPS = [
    ask("catch", "catch_title", "catch_hint", "catch", "catch",
        [{"when": FLOODED, "to": "heads_up"}, {"to": "file"}], own="catch_own"),
    ask("heads_up", "heads_up_title", "heads_up_hint", "heads_up", "heads_up",
        [{"when": {"eq": [a("heads_up"), "body"]}, "to": "settle"}, {"to": "file"}]),
    handoff("settle", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    ask("file", "file_title", "file_hint", "file", "file",
        [{"when": {"eq": [a("file"), "harm"]}, "to": "harm"},
         {"when": {"eq": [a("file"), "replay"]}, "to": "replay"}, {"when": {"eq": [a("file"), "not_mine"]}, "to": "not_mine"},
         {"to": "move"}]),
    # Routes, not kinds: no watching, no close.
    handoff("replay", [{"when": ALWAYS, "key": "replay_line"}],
            [{"exit": "five_senses", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}]),
    handoff("not_mine", [{"when": ALWAYS, "key": "not_mine_line"}],
            [{"exit": "five_senses", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}]),
    {**handoff("harm", [{"when": ALWAYS, "key": "harm_line"}], [{"exit": "safety_open", "when": ALWAYS}]),
     "crisis": [{"variant": "crisis", "when": ALWAYS}]},
    ask("move", "move_title", "move_hint", "move", "move",
        [{"when": {"eq": [a("move"), v]}, "to": v} for v, _ in MOVES[1:]] + [{"to": "having"}]),
    # I'm having the thought that…: the thought on paper (their words or the chip), then with the frame in front.
    {"id": "having", "kind": "embed", "embed": "boundaryLine", "answerAs": "having", "title": "having_title",
     # A list card: the thought on paper, no Copy (nothing to send).
     "props": {"field": "catch", "shape": "list", "next": "having_next"},
     "links": [SAFETY_LINK], "next": [{"to": "frame"}]},
    timer("frame", "frame", 20),
    drift("slow", 30),
    drift("leaf", 45),
    timer("screen", "screen", 45),
    # Back to the room (MF's rule: every practice ends outward, eyes open).
    {"id": "room", "kind": "embed", "embed": "orientFind", "answerAs": "room", "title": "room_title",
     "props": {"variant": "find", "count": 3, "here": "here", "task": "room_task", "foundLabel": "found",
               "done": "find_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "close"}]},
    ask("close", "close_title", None, "close", "tvn",
        [{"when": {"eq": [a("close"), "worse"]}, "to": "louder"}, {"to": "end"}], field_extra={"askFresh": "thenVsNow"}),
    handoff("louder", [{"when": ALWAYS, "key": "louder_line"}], [{"exit": "cool_down", "when": ALWAYS}], no_close=False),
    handoff("end",
            [{"when": {"all": [{"eq": [a("close"), "same"]}, {"in": [a("file"), FACTS_KINDS]}]}, "key": "end_same_facts"},
             {"when": {"eq": [a("close"), "same"]}, "key": "end_same"},
             {"when": {"in": [a("close"), ["better", "much_better"]]}, "key": "end_further"}],
            [{"exit": "check_the_facts", "when": {"all": [{"eq": [a("close"), "same"]}, {"in": [a("file"), FACTS_KINDS]}]}}],
            no_close=False),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body
    {"id": "five_senses", "toolId": "five-senses"},                      # grounding (a replay, a thought not their own)
    {"id": "check_the_facts", "toolId": "check-the-facts"},              # ER-02: it might not be true
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def _dm_label(tid):
    n = next(n for n in DM.THOUGHT_PATTERNS if n["id"] == tid)
    return n["label"]


def options():
    out = [("catch", tid, _dm_label(tid), {}, ("ThoughtPattern", tid)) for tid in SHARED]
    out += [("catch", v, label, {}, None) for v, label in OWN_THOUGHTS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("file", v, label, {}, None) for v, label in FILE]
    out += [("move", v, label, {}, "DefusionMove") for v, label in MOVES]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "catch", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first, or try anyway.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
