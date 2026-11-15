"""Doing mind, being mind (MF-09 skillful means; DBT Mindfulness Handout 9, Linehan 2015, read with MBCT's doing and
being modes), as a skill on the runtime.

The editable source. The flow is PRD MF-09 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): rumination is
often doing mode aimed at a feeling, trying to solve it like a task; drifting is the other imbalance, days with no doing
at all. Both modes are needed, and wise mind uses each when it fits. Mostly embedded: One thing's rumination variant
asks the same mode card inside its own run (scripts/skills/one_thing.py), so this skill is the library entry, the
weekly shape and the card a host opens on its own. The design note is docs/design/doing-being.md.

Steps:
  about     the library entry: one screen of MF H9, paraphrased (*Doing mind works things out. Being mind notices and
            lets things be. Both are needed.*), then which: *Is my mind stuck trying to fix something?* (the mode card)
            or *How did this week feel?* (the weekly shape).
  heads_up  a carried flooded reading first (PRD: any band but flooded, DT first): *Your body's loud right now.* My body
            first (First, the body) · go on anyway. Never a lock. Opened straight at the card or the week, the same
            line sits on that screen with *My body first* as a link.
  mode      the mode card (`?enterAt=mode`: Problem Solve's *I've been thinking about it constantly*, the Tools intent):
            *Is your mind trying to fix a feeling like a task?* yes · maybe · no.
  switch    yes or maybe: *That sounds like doing mind* / *That might be doing mind*. *Feelings don't get solved like
            tasks. One minute of being mind?* A minute of listening (the `pebbleBowl`, eyes open) · not now; One thing
            as the swap, a link (the PRD's one pick, one swap). No: *Then there's nothing to switch.* Opened from Problem
            Solve (`frame=problem_solve`), every end of the card offers *Back to Problem Solve*. *Move on* before the
            minute starts is *Not now*, never praised as being mind.
  week      the weekly shape (`?enterAt=week`: the Practice home's *How did this week feel?*): mostly doing · mostly
            being · mixed · drifting.
  cue       mostly doing: one being break a day, at a moment you already have (sit down for a break, make a drink, wash
            your hands, get in the car or on the bus, get into bed, or a few words); *Ask me tomorrow?* books
            `being_break`, which reopens the run at *Did you get to take one?* (yes is an off-phone rep).
  drift     drifting: *One small doing could help.* Join in first (a drifting week is the blank signal the runtime has:
            PRD, the blank drifting branch leads with movement, never a being practice), then Build mastery (one thing
            you can finish).
  being_end mostly being: rest counts; one small doing if something's been waiting (Build mastery, optional).
  mixed_end mixed: *Sounds balanced.* Nothing else.

*Talk to someone now* (safety.open) is on every screen. Close kind `none`: every answer is plain, nothing is scored.
A completed visit is a `skillful_means` rep (the PracticeSkill's `defaultFor`, scripts/practice-spine/content.py): the
mode answer, the minute taken or not, the week's shape and the cue are the run's answers. *Not now* and *Then there's
nothing to switch* complete the visit too (answering the card is the practice: the PRD's rep records the answer and
whether the switch was taken). No open-ended writing beyond a few words for the cue.
"""

ID = "doing_being"
TOOL_ID = "doing-being"
CONCEPT = "dbt_skillful_means"
VERSION = "db-v1"
OWN_MAX = 40  # a few words for the cue

COPY = {
    "about_title": "Doing mind, being mind.",
    "about_line": "Doing mind works things out, plans and fixes. Being mind notices and lets things be. Both are needed, and wise mind uses each one when it fits.",
    "about_q": "Which would help now?",
    "heads_up_title": "Your body's loud right now.",
    "heads_up_line": "This works better once your body settles. Start there, or go on anyway.",
    "body_first_title": "Settle your body first.",
    "body_first_line": "This will keep for a calmer minute.",
    "body_first": "My body first",
    # The mode card (PRD MF-09 step 1, the same words as One thing's).
    "mode_title": "Is your mind trying to fix a feeling like a task?",
    "mode_hint": "Going over it, working it out, trying to make it stop.",
    "switch_yes_title": "That sounds like doing mind. Feelings don't get solved like tasks.",
    "switch_maybe_title": "That might be doing mind. Feelings don't get solved like tasks.",
    "switch_line": "Doing mind is useful. A minute of being mind can give it a rest.",
    "switch_q": "One minute of being mind?",
    "one_thing_link": "One thing, done fully, instead",
    "listen_title": "A minute of being mind.",
    "listen_task": "Listen. Each time you notice a new sound, or catch yourself back in the problem, tap.",
    "bowl_start": "Start",
    "came_back": "A sound",
    "bowl_running": "Eyes open. Quiet is a sound too.",
    "bowl_dropped": "A pebble in the bowl",
    "bowl_done": "That's a minute.",
    "bowl_skip": "Move on",
    "listen_end_title": "That was being mind.",
    "listen_end_line": "Doing mind will still be there when you need it.",
    "not_now_title": "Not now is fine.",
    "not_now_line": "Noticing it was doing mind is already a step outside it.",
    "mode_no_title": "Then there's nothing to switch.",
    "mode_no_line": "Carry on. The question will be here when you want it.",
    "back_ps": "Back to Problem Solve",
    # The weekly shape (PRD MF-09 step 3).
    "week_title": "This week felt…",
    "week_hint": "Doing: working things out, getting things done. Being: noticing, resting. Drifting: not much of either. A rough guess is fine.",
    "cue_title": "One being break a day, then?",
    "cue_line": "A minute of one thing, done fully, at a moment you already have.",
    "cue_q": "When could it go?",
    "cue_own": "My own moment",
    "cue_end_title": "{cue}: your being break.",
    "cue_end_line": "One ordinary thing, with all of your attention, for about a minute. Nothing to fix.",
    "remind_q": "Ask me tomorrow how it went?",
    "back_title": "{cue}: your being break. Did you get to take one?",
    "back_yes_line": "That's being mind, without the phone. It goes wherever you do.",
    "back_sort_line": "Some of it counts. Coming back is the practice.",
    "back_not_line": "Not yet is fine. The moment comes round again.",
    "drift_title": "One small doing could help.",
    "drift_line": "When things feel flat, moving first can make doing easier. Then something you can finish today, however small.",
    "being_end_title": "Rest counts.",
    "being_end_line": "If something's been waiting, one small doing could balance the week.",
    "mixed_end_title": "Sounds balanced.",
    "mixed_end_line": "Some doing, some being. That's the mix wise mind uses.",
    "build_mastery": "One small thing to finish",
    "join_in": "Move to something first",
    "one_thing": "One thing, done fully",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


def EQ(field, v):
    return {"eq": [a(field), v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
# Opened from Problem Solve's *thinking about it constantly* (`frame=problem_solve`): every end of the card offers the
# way back (PRD: *No* goes back to the host with nothing added).
FROM_PS = {"eq": ["$ctx.frame", "problem_solve"]}
BACK_PS = [{"exit": "problem_solve", "when": FROM_PS}]
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
LINKS = [SAFETY_LINK]

ABOUT = [("mode", "Is my mind stuck trying to fix something?"), ("week", "How did this week feel?")]
HEADS_UP = [("body", "My body first"), ("go", "Go on anyway")]
MODE = [("yes", "Yes"), ("maybe", "Maybe"), ("no", "No")]
SWITCH = [("listen", "A minute of listening"), ("not_now", "Not now")]
# The PRD's four shapes, in its order.
WEEK = [("doing", "Mostly doing"), ("being", "Mostly being"), ("mixed", "Mixed"), ("drifting", "Drifting")]
# Moments the person already has (PRD: "when I sit down for lunch"; no eating moment, so Running low's food setting
# never needs reading here).
CUES = [
    ("break", "When I sit down for a break"),
    ("drink", "When I make a drink"),
    ("hands", "When I wash my hands"),
    ("travel", "When I get in the car or on the bus"),
    ("bed", "When I get into bed"),
]
WHEN = [("morning", "Tomorrow morning"), ("evening", "Tomorrow evening")]
BACK = [("yes", "Yes"), ("sort_of", "Sort of"), ("not_yet", "Not yet")]

CUE_SLOT = {"cue": {"labelOf": "cue"}}


def field(fid, lst, *, mx=1, required=True, own=None, label=None, links=None):
    f = {"id": fid, "options": {"list": lst}, "max": mx, "required": required, "links": (links or []) + LINKS}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    if label:
        f["label"] = label
    return f


def ask(step_id, title, hint, fields, nxt, *, lines=None, extra=None):
    s = {"id": step_id, "kind": "ask", "title": title, "fields": fields, "next": nxt, **(extra or {})}
    if hint:
        s["hint"] = hint
    if lines:
        s["lines"] = lines
    return s


def handoff(step_id, title, lines, offers, *, complete=True, extra=None):
    s = {"id": step_id, "kind": "handoff", "complete": complete, "lines": lines, "offers": offers, "done": "done",
         "links": LINKS, "noClose": True, **(extra or {})}
    if title:
        s["title"] = title
    return s


AFTER_HEADS_UP = [{"when": EQ("heads_up", "body"), "to": "body_first"}, {"when": EQ("about", "week"), "to": "week"},
                  {"to": "mode"}]
# Opened straight at the card or the week (a host, the intent, the Practice home): a carried flooded reading gets the
# heads-up as a line and the body first as a link on that screen instead.
FLOODED_HERE = {"all": [FLOODED, {"not": {"set": a("heads_up")}}]}
BODY_LINK = {"exit": "cool_down", "label": "body_first", "when": FLOODED_HERE}
FLOODED_LINE = {"when": FLOODED_HERE, "key": "heads_up_line"}

STEPS = [
    ask("about", "about_title", None, [field("about", "about", label="about_q")],
        [{"when": {"all": [FLOODED, {"not": {"set": a("heads_up")}}]}, "to": "heads_up"},
         {"when": EQ("about", "week"), "to": "week"}, {"to": "mode"}],
        lines=[{"when": ALWAYS, "key": "about_line"}]),
    # A carried flooded reading (PRD: any band but flooded): the body first, or go on. Never a lock.
    ask("heads_up", "heads_up_title", None, [field("heads_up", "heads_up")], AFTER_HEADS_UP,
        lines=[{"when": ALWAYS, "key": "heads_up_line"}]),
    handoff("body_first", "body_first_title", [{"when": ALWAYS, "key": "body_first_line"}],
            [{"exit": "cool_down", "when": ALWAYS}], complete=False),
    # The mode card (PRD step 1).
    ask("mode", "mode_title", "mode_hint", [field("mode", "mode", links=[BODY_LINK])],
        [{"when": EQ("mode", "no"), "to": "mode_no"}, {"to": "switch"}], lines=[FLOODED_LINE]),
    # Yes or maybe (PRD step 2): one pick (a minute of listening here), one swap (One thing, as a link).
    ask("switch", [{"when": EQ("mode", "maybe"), "key": "switch_maybe_title"}, {"when": ALWAYS, "key": "switch_yes_title"}],
        None, [field("switch", "switch", label="switch_q",
                     links=[{"exit": "one_thing", "label": "one_thing_link", "when": ALWAYS}])],
        [{"when": EQ("switch", "not_now"), "to": "not_now"}, {"to": "listen"}],
        lines=[{"when": ALWAYS, "key": "switch_line"}]),
    {"id": "listen", "kind": "embed", "embed": "pebbleBowl", "answerAs": "listen", "title": "listen_title", "links": LINKS,
     "props": {"seconds": 60, "task": "listen_task", "start": "bowl_start", "tapLabel": "came_back", "running": "bowl_running",
               "dropped": "bowl_dropped", "done": "bowl_done", "next": "next", "skip": "bowl_skip"},
     # *Move on* before the minute started: not praised as being mind; *Not now* is the honest card.
     "next": [{"when": EQ("listen", "skipped"), "to": "not_now"}, {"to": "listen_end"}]},
    handoff("listen_end", "listen_end_title", [{"when": ALWAYS, "key": "listen_end_line"}], BACK_PS),
    handoff("not_now", "not_now_title", [{"when": ALWAYS, "key": "not_now_line"}], BACK_PS),
    handoff("mode_no", "mode_no_title", [{"when": ALWAYS, "key": "mode_no_line"}], BACK_PS),
    # The weekly shape (PRD step 3).
    ask("week", "week_title", "week_hint", [field("week", "week", links=[BODY_LINK])],
        [{"when": EQ("week", "doing"), "to": "cue"}, {"when": EQ("week", "being"), "to": "being_end"},
         {"when": EQ("week", "drifting"), "to": "drift"}, {"to": "mixed_end"}], lines=[FLOODED_LINE]),
    ask("cue", "cue_title", None, [field("cue", "cue", label="cue_q", own="cue_own")], [{"to": "cue_end"}],
        lines=[{"when": ALWAYS, "key": "cue_line"}]),
    # The being break as a cue, and its check the next day (PRD follow-up: an off-phone rep).
    handoff("cue_end", "cue_end_title", [{"when": ALWAYS, "key": "cue_end_line"}], [],
            extra={"titleSlots": CUE_SLOT,
                   "fields": [{"id": "remind", "label": "remind_q", "max": 1, "options": {"list": "when"}}],
                   "followUp": {"type": "being_break", "whenFrom": "remind"}}),
    # Reopened from the being_break card (R9): a run that reached `cue_end`.
    ask("back", "back_title", None, [field("back", "back")], [{"to": "back_end"}],
        extra={"reopens": {"after": "cue_end"}, "clears": ["back"], "titleSlots": CUE_SLOT}),
    handoff("back_end", None, [{"when": EQ("back", "yes"), "key": "back_yes_line"},
                               {"when": EQ("back", "sort_of"), "key": "back_sort_line"},
                               {"when": ALWAYS, "key": "back_not_line"}], []),
    # Drifting (PRD): movement first (Join in, its short rounds), then one small doing (Build mastery), never a
    # being practice.
    handoff("drift", "drift_title", [{"when": ALWAYS, "key": "drift_line"}],
            [{"exit": "join_in", "when": ALWAYS}, {"exit": "build_mastery", "when": ALWAYS}]),
    handoff("being_end", "being_end_title", [{"when": ALWAYS, "key": "being_end_line"}],
            [{"exit": "build_mastery", "when": ALWAYS}]),
    handoff("mixed_end", "mixed_end_title", [{"when": ALWAYS, "key": "mixed_end_line"}], []),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down", "label": "body_first"},           # DT-01 First, the body (flooded)
    {"id": "one_thing", "toolId": "one-thing", "label": "one_thing"},            # MF-05, the swap
    {"id": "build_mastery", "toolId": "build-mastery", "label": "build_mastery"},  # ER-11, one small doing
    {"id": "join_in", "toolId": "join-in", "query": {"frame": "blank"}, "label": "join_in"},  # MF-10, drifting leads with it
    {"id": "problem_solve", "toolId": "problem-solve", "label": "back_ps"},     # ER-12, the host, back again
    {"id": "safety_open", "toolId": None, "safety": True},                       # safety.open (R6): on every screen
    {"id": "done", "done": True},
]


def options():
    out = [("about", v, label, {}, None) for v, label in ABOUT]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("mode", v, label, {}, "ModeCardAnswer") for v, label in MODE]
    out += [("switch", v, label, {}, None) for v, label in SWITCH]
    out += [("week", v, label, {}, "WeekShape") for v, label in WEEK]
    out += [("cue", v, label, {}, None) for v, label in CUES]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("back", v, label, {}, None) for v, label in BACK]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "about", "ownMax": OWN_MAX,
    # band: a carried flooded reading (C6.2); frame: `problem_solve` (the card's ends offer the way back); enterAt: `mode`
    # (the card on its own: Problem Solve, the intent) or `week` (the Practice home's weekly shape).
    "accepts": ["band", "frame", "enterAt"],
    "entries": {"mode": "mode", "week": "week"},
    "copy": COPY, "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
