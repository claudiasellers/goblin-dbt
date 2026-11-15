"""One thing (MF-05; one-mindfully: DBT Mindfulness Handouts 5, 5c, Linehan 2015), with MF-09's mode card, as a skill on
the runtime.

The editable source. The flow is PRD MF-05 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): attention split
and looping, "I can't get out of my head". One ordinary activity, chosen, done with the whole of your attention for a
bounded time; wandering and coming back is the practice. The design note is docs/design/one-thing.md (what part 1
defers and where it departs from the PRD).

Steps:
  outside   the rumination variant's entry (`?enterAt=outside&frame=ruminate`: the rumination result's card, the Tools
            intent *Get out of my head*): *First, a minute outside your head.* Look or Listen (MF-01's eyes-open
            channels). A carried flooded reading (here and on `thing`) gets *Your body's loud right now.* as the title
            and *My body first* (First, the body) as a link (PRD: DT first); it can still go on.
  look / listen   `orientFind` (five things you can see) / `pebbleBowl` (a minute of sounds).
  mode      MF-09's mode card: *Is your mind trying to fix a feeling like a task?* yes · maybe · no.
  mode_why  yes or maybe: *That's doing mind. Feelings don't get solved like tasks. One minute of being mind?*
            One thing, or not now (straight to the loop close). No: one thing, or not now.
  thing     the start: *Pick one thing to do with your whole attention.* wash my hands · make a drink · brush my teeth · walk
            somewhere · eat a few bites · shower · listen to one song · wash up · something else (own words). Blank
            (`?frame=blank`) lists the movement ones first. *Eat a few bites* is never listed when the person left food
            out of Running low in Me (`pleaseRows`; the PRD's eating exclusion, until CORE's intake flag exists).
  length    one minute · one song · until it's done.
  how       with the phone (the pebble bowl: a big *Came back* target, the screen quiet) or without it.
  do_*      with the phone: `pebbleBowl` for 60 s / about a song / up to five minutes, titled with the activity's one
            instruction ("Temperature of the water. Then the soap."). Never locked; *Move on* is always there.
  away      without the phone: the one instruction, *Put the phone down. Come back when you're done.*, then *I'm back*.
  with      *How much were you with it?* mostly with it · in and out · mostly elsewhere, all answered the same way
            (*In and out is the practice.*).
  loop      the rumination variant only, the close asked in the flow (`askFresh: 'thenVsNow'`): *The loop in your head
            now?* louder · about the same · quieter · much quieter. Louder → First, the body or Give your mind a job.
  end       *Same thing tomorrow?* (optional chips) books `one_thing_again` (tomorrow morning or evening), which reopens
            the run at *Did you do {thing} with your whole attention?*: yes is an off-phone rep (runRep). Plain entries
            leave without the close card (`noClose`: the with-it answer is the close).

Every completed visit logs a `one_thing` rep (PracticeSkill `one_thing`, defaultFor `one-thing`; it joins the Practice
home's MF sequence at order 4). Open-ended writing is never offered here (it can raise distress in high ruminators).
"""

ID = "one_thing"
TOOL_ID = "one-thing"
CONCEPT = "dbt_one_mindfully"
VERSION = "ot-v1"
OWN_MAX = 40  # a few words for the activity

COPY = {
    "flooded_title": "Your body's loud right now.",
    "flooded_hint": "This works better once your body settles. You can start with your body, or try it anyway.",
    "body_first": "My body first",
    # The rumination variant: a minute outside your head first (PRD MF-05: MF-01 Look or Listen).
    "outside_title": "First, a minute outside your head.",
    "outside_hint": "Eyes open. Pick one.",
    "look_title": "Find five things you can see.",
    "here": "You're here, and it's",
    "look_task": "Tap each one as you find it. Any size, any colour.",
    "found": "Found one",
    "found_done": "That's five.",
    "listen_title": "Let sounds come to you.",
    "listen_task": "Near or far, loud or soft. When your mind wanders, tap, and come back to listening.",
    "came_back": "Came back",
    "bowl_start": "Start",
    "bowl_running": "A pebble for each time.",
    "bowl_dropped": "A pebble in the bowl.",
    "bowl_done": "That's the time.",
    "bowl_skip": "Move on",
    # MF-09's mode card.
    "mode_title": "Is your mind trying to fix a feeling like a task?",
    "mode_hint": "Going over it, working it out, trying to make it stop.",
    "mode_yes_title": "That's doing mind. Feelings don't get solved like tasks.",
    "mode_yes_line": "Both minds are useful. Right now, a minute of being mind might help: one thing, done fully.",
    "mode_no_title": "Then one thing, done fully, can still give your head a rest.",
    "one_thing_go": "One thing",
    "not_now": "Not now",
    # One thing.
    "thing_title": "Pick one thing to do with your whole attention.",
    "thing_hint": "Something ordinary you could do now or soon.",
    "thing_own": "Something else",
    "length_title": "For how long?",
    "how_title": "With the phone, or without it?",
    "how_hint": "Without it is the goal. With it, the screen stays quiet and you tap each time you come back.",
    "do_task": "When your mind wanders, tap, and come back to it.",
    "away_hint": "Put the phone down. Come back when you're done.",
    "back": "I'm back",
    # The one instruction per activity (PRD: one, at the start; nothing else on screen).
    "ins_hands": "The temperature of the water. Then the soap.",
    "ins_drink": "The weight of the cup. The sound as it pours.",
    "ins_teeth": "The taste. The feel of each tooth.",
    "ins_walk": "Your feet meeting the ground, one step and the next.",
    "ins_eat": "Three bites. The taste, the texture, the swallow.",
    "ins_shower": "Where the water lands. How warm it is.",
    "ins_song": "One sound in the song. Then the next one.",
    "ins_washup": "The warm water. One thing at a time.",
    "ins_own": "{thing}. All of your attention on it.",
    # The close.
    "with_title": "How much were you with it?",
    "with_line": "In and out is the practice. Each time you came back, that was it.",
    "loop_title": "The loop in your head now?",
    "louder_title": "It got louder. That happens.",
    "louder_line": "When your head is this loud, something for the body or a job for your mind can help first.",
    "end_title": "One thing, done fully. That's the skill.",
    "end_quieter_line": "The loop quietened a bit. One thing at a time is a way out of it you can use anywhere.",
    "again_q": "Same thing tomorrow? I'll ask how it went.",
    "end_short_title": "A minute outside your head. That counts.",
    "end_quieter_short": "The loop quietened a bit. Looking or listening is a way out of it you can use anywhere.",
    # The off-phone check (reopened from the one_thing_again card).
    "again_title": "Did you get to do {thing} with your whole attention?",
    "again_yes_line": "That's one-mindfulness off the phone. It goes wherever you do.",
    "again_sort_line": "Some of it counts. Coming back is the practice.",
    "again_not_line": "Not yet is fine. It'll be there next time.",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
RUMINATE = {"eq": ["$ctx.frame", "ruminate"]}

THINGS = [
    # (id, label, props): `move` ones lead on a blank entry (PRD: movement first); `food` is never listed when the person
    # left food out of Running low in Me.
    ("hands", "Wash my hands", {}),
    ("drink", "Make a drink", {}),
    ("teeth", "Brush my teeth", {}),
    ("walk", "Walk somewhere", {"move": True}),
    ("eat", "Eat a few bites", {"food": True}),
    ("shower", "Have a shower", {}),
    ("song", "Listen to one song", {}),
    ("washup", "Wash up", {"move": True}),
]
INSTRUCTION = {v: f"ins_{v}" for v, _, _ in THINGS}
LENGTHS = [("minute", "One minute"), ("song", "One song"), ("done", "Until it's done")]
BOWL_SECONDS = {"minute": 60, "song": 210, "done": 300}
HOW = [("phone", "With the phone"), ("away", "Without the phone")]
OUTSIDE = [("look", "Look"), ("listen", "Listen")]
MODE = [("yes", "Yes"), ("maybe", "Maybe"), ("no", "No")]
GO = [("go", "One thing"), ("not_now", "Not now")]
WITH = [("with", "Mostly with it"), ("in_out", "In and out"), ("elsewhere", "Mostly elsewhere")]
LOOP = [("worse", "Louder"), ("same", "About the same"), ("better", "Quieter"), ("much_better", "Much quieter")]
WHEN = [("morning", "Tomorrow morning"), ("evening", "Tomorrow evening")]
AGAIN = [("yes", "Yes"), ("sort_of", "Sort of"), ("not_yet", "Not yet")]
FIRST_THING = {"blank": "walk"}

# The activity's instruction as the title of the doing step (the person's own activity: their words in the slot).
INSTRUCTION_TITLE = ([{"when": {"own": "thing"}, "key": "ins_own"}]
                     + [{"when": {"eq": [a("thing"), v]}, "key": k} for v, k in INSTRUCTION.items()])
THING_SLOT = {"thing": {"labelOf": "thing"}}


def ask(step_id, title, hint, field, lst, nxt, *, required=True, own=None, links=None, max_=1, extra=None, step_extra=None):
    f = {"id": field, "options": {"list": lst}, "max": max_, "required": required, **({"links": links} if links else {}),
         **(extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt, **(step_extra or {})}
    if hint:
        s["hint"] = hint
    return s


def bowl(step_id, title, task, seconds, nxt, *, title_slots=None):
    s = {"id": step_id, "kind": "embed", "embed": "pebbleBowl", "answerAs": step_id, "title": title,
         "props": {"seconds": seconds, "task": task, "start": "bowl_start", "tapLabel": "came_back", "running": "bowl_running",
                   "dropped": "bowl_dropped", "done": "bowl_done", "next": "next", "skip": "bowl_skip"},
         "next": nxt}
    if title_slots:
        s["titleSlots"] = title_slots
    return s


AFTER_OUTSIDE = [{"to": "mode"}]
DO_NEXT = [{"to": "with"}]

STEPS = [
    # The rumination variant's entry (`?enterAt=outside&frame=ruminate`). A carried flooded reading: the heads-up as the
    # title, the body first as a link, Look or Listen anyway.
    ask("outside", [{"when": FLOODED, "key": "flooded_title"}, {"when": ALWAYS, "key": "outside_title"}], None, "outside", "outside",
        [{"when": {"eq": [a("outside"), "look"]}, "to": "look"}, {"to": "listen"}],
        links=[{"exit": "cool_down", "label": "body_first", "when": FLOODED}],
        step_extra={"lines": [{"when": FLOODED, "key": "flooded_hint"}, {"when": ALWAYS, "key": "outside_hint"}]}),
    {"id": "look", "kind": "embed", "embed": "orientFind", "answerAs": "look", "title": "look_title",
     "props": {"variant": "find", "count": 5, "here": "here", "task": "look_task", "foundLabel": "found",
               "done": "found_done", "next": "next"},
     "next": AFTER_OUTSIDE},
    bowl("listen", "listen_title", "listen_task", 60, AFTER_OUTSIDE),
    ask("mode", "mode_title", "mode_hint", "mode", "mode",
        [{"when": {"eq": [a("mode"), "no"]}, "to": "mode_no"}, {"to": "mode_yes"}]),
    ask("mode_yes", "mode_yes_title", None, "go", "go",
        [{"when": {"eq": [a("go"), "not_now"]}, "to": "loop"}, {"to": "thing"}],
        step_extra={"lines": [{"when": ALWAYS, "key": "mode_yes_line"}]}),
    ask("mode_no", "mode_no_title", None, "go_no", "go",
        [{"when": {"eq": [a("go_no"), "not_now"]}, "to": "loop"}, {"to": "thing"}]),
    # The start. A carried flooded reading: the heads-up as the title and the body first as a link (PRD: DT first).
    ask("thing", [{"when": FLOODED, "key": "flooded_title"}, {"when": ALWAYS, "key": "thing_title"}], None, "thing", "thing",
        [{"to": "length"}], own="thing_own",
        links=[{"exit": "cool_down", "label": "body_first", "when": FLOODED}],
        step_extra={"lines": [{"when": FLOODED, "key": "flooded_hint"}, {"when": ALWAYS, "key": "thing_hint"}]},
        extra={"options": {"list": "thing", "firstFrom": "$d.firstThing",
                           "where": {"not": {"all": [{"eq": ["$opt.food", True]}, {"has": ["$p.pleaseRows", "food"]}]}}}}),
    ask("length", "length_title", None, "length", "length", [{"to": "how"}]),
    ask("how", "how_title", "how_hint", "how", "how",
        [{"when": {"eq": [a("how"), "away"]}, "to": "away"}]
        + [{"when": {"eq": [a("length"), ln]}, "to": f"do_{ln}"} for ln, _ in LENGTHS]),
    *[bowl(f"do_{ln}", INSTRUCTION_TITLE, "do_task", BOWL_SECONDS[ln], DO_NEXT, title_slots=THING_SLOT) for ln, _ in LENGTHS],
    {"id": "away", "kind": "ask", "title": INSTRUCTION_TITLE, "titleSlots": THING_SLOT, "hint": "away_hint",
     "fields": [{"id": "away", "options": {"list": "back"}, "max": 1, "required": True}], "next": DO_NEXT},
    ask("with", "with_title", None, "with", "with",
        [{"when": RUMINATE, "to": "loop"}, {"to": "end"}]),
    # The rumination variant's close, asked in the flow (orienting is MF-01's; this one is the loop, regulation down).
    ask("loop", "loop_title", None, "loop", "loop",
        [{"when": {"eq": [a("loop"), "worse"]}, "to": "louder"}, {"when": {"set": a("thing")}, "to": "end_loop"}, {"to": "end_short"}],
        extra={"askFresh": "thenVsNow"}),
    {"id": "louder", "kind": "handoff", "complete": True, "title": "louder_title",
     "lines": [{"when": ALWAYS, "key": "louder_line"}],
     "offers": [{"exit": "cool_down", "when": ALWAYS}, {"exit": "mind_job", "when": ALWAYS}], "done": "done"},
    # The ends. A plain entry asks no close card (the with-it answer is the close); the rumination end has had its own.
    {"id": "end", "kind": "handoff", "complete": True, "noClose": True, "title": "end_title",
     "lines": [{"when": ALWAYS, "key": "with_line"}], "offers": [], "done": "done",
     "fields": [{"id": "when", "label": "again_q", "max": 1, "options": {"list": "when"}}],
     "followUp": {"type": "one_thing_again", "whenFrom": "when"}},
    {"id": "end_loop", "kind": "handoff", "complete": True, "title": "end_title",
     "lines": [{"when": {"in": [a("loop"), ["better", "much_better"]]}, "key": "end_quieter_line"}],
     "offers": [], "done": "done",
     "fields": [{"id": "when", "label": "again_q", "max": 1, "options": {"list": "when"}}],
     "followUp": {"type": "one_thing_again", "whenFrom": "when"}},
    # The rumination variant without one thing (*Not now* after the mode card): the minute outside your head was it.
    {"id": "end_short", "kind": "handoff", "complete": True, "title": "end_short_title",
     "lines": [{"when": {"in": [a("loop"), ["better", "much_better"]]}, "key": "end_quieter_short"}],
     "offers": [], "done": "done"},
    # Reopened from the one_thing_again card (R9): only a run that reached an end card with a thing picked.
    ask("again", "again_title", None, "again", "again", [{"to": "again_end"}],
        step_extra={"reopens": {"after": "end"}, "clears": ["again"], "titleSlots": THING_SLOT}),
    {"id": "again_end", "kind": "handoff", "complete": True, "noClose": True,
     "lines": [{"when": {"eq": [a("again"), "yes"]}, "key": "again_yes_line"},
               {"when": {"eq": [a("again"), "sort_of"]}, "key": "again_sort_line"},
               {"when": ALWAYS, "key": "again_not_line"}],
     "offers": [], "done": "done"},
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},     # DT-01 First, the body (flooded, or the loop got louder)
    {"id": "mind_job", "toolId": "mind-job"},       # DT-06 Give your mind a job (the loop got louder; PRD: stirred → DT-06)
    {"id": "done", "done": True},
]


def options():
    out = [("thing", v, label, props, "OneThingActivity") for v, label, props in THINGS]
    out += [("length", v, label, {}, None) for v, label in LENGTHS]
    out += [("how", v, label, {}, None) for v, label in HOW]
    out += [("outside", v, label, {}, "ObserveChannel") for v, label in OUTSIDE]
    out += [("mode", v, label, {}, None) for v, label in MODE]
    out += [("go", v, label, {}, None) for v, label in GO]
    out += [("with", v, label, {}, None) for v, label in WITH]
    out += [("loop", v, label, {}, None) for v, label in LOOP]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("again", v, label, {}, None) for v, label in AGAIN]
    out += [("back", "back", "I'm back", {}, None)]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "thing", "ownMax": OWN_MAX,
    # band: a carried flooded reading (C6.2); frame: ruminate (the rumination result's card, the intent), blank;
    # enterAt: `outside` starts the rumination variant (with frame=ruminate).
    "accepts": ["band", "frame", "enterAt"],
    "entries": {"outside": "outside"},
    "copy": COPY, "tables": {"firstThingOf": FIRST_THING},
    "derive": [{"name": "firstThing", "from": "$ctx.frame", "table": "firstThingOf"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
