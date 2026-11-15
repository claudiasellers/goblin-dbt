"""What works here (MF-08; effectively: DBT Mindfulness Handout 5, the third how skill, Linehan 2015), as a skill on the
runtime.

The editable source. The flow is PRD MF-08 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): being right and
getting what matters pull apart (escalating a fight, refusing a workable deal because it's unfair, envy that freezes
action). Validate first, then what you want out of it, being right and what works side by side, one move that works
from how things actually are, and what to set down for now. The design note is docs/design/what-works.md.

Steps:
  goal      *What do you most want out of this?* stay connected · protect a boundary · make progress · put it right ·
            keep my self-respect (OA's five goals; self-respect is always there: never "give in") · something else (own
            words) · *Someone threatened me, scared me or hurt me* (→ `unsafe`). Its line is the validation line
            (principle 5): a host's grievance (Problem Solve's blocked-goal fight: *Maybe they are in the wrong. That's
            real.*; its unfair-advantage envy: *It isn't fair. That's real.*), kept on every reading.
  heads_up  a carried flooded reading, after the goal: *Your body's loud right now.* my body first · try it anyway (PRD:
            DT first, never a lock).
  unsafe    the `other_person` crisis slot, someone to talk to, Ending a relationship in its careful frame; no moves
            (PRD risk: never used to talk someone out of a legitimate boundary). Also from the move screen (*They might
            hurt me if I do anything*) and the card (*It went badly, and I don't feel safe*). No rep, no close.
  want      *What are you after here? Tap any.* Two piles on one screen: *Being right* (they admit it · they feel what I
            felt · everyone sees it was unfair · I win this one · they pay for it) and *Getting what matters* (it gets
            sorted · we can still work together · I get what I need · things go better from here · I can live with how I
            handled it). Both can matter; none is required.
  piles     the two piles on paper (`twoColumns`). Skipped when either pile is empty (nothing to weigh).
  pull      *Right now, which matters more?* what works · being right about this one · can't tell (the PRD's fade
            question). Being right is accepted without rescue: sometimes it is the goal. Its moves are the goal's own and
            self-respect's, never the host's de-escalation steps.
  move      *Given how things actually are, one move that works.* The host's solution direction's steps first (Problem
            Solve's *Decide if this fight is worth it*, *Play the hand you have*: options PRESENT their SolutionDirection),
            then three for the goal (general ones for a goal in own words), or own words.
  set_down  *What could you set down, for now?* being right · getting even · how unfair the start was (*For now. Nothing
            is given up for good.*), optional. Skipped after *being right about this one*, unless *They pay for it* was
            picked (getting even is offered to set down, and the end card keeps self-respect apart from it).
  end       *What works here: {move}.*, a line by what was set down or chosen, the goal's next tool (Keep it warm or
            DEAR MAN, FAST or Say no, Problem Solve or Build mastery), and *Want me to ask how it went?* (optional chips)
            booking `effective_move`, which reopens the run at `back`: *How did it go? You planned: {move}*. *Not yet*
            can book it again.

*Talk to someone now* (safety.open) is on every screen. Close kind `none`. Every completed visit logs an `effectively`
rep (PracticeSkill `effectively`, defaultFor `effectiveness`; the Practice home's MF sequence at order 6); the card's
visit logs one only when the move was done (`OFF_PHONE_SKILLS`).
"""

ID = "effectively"
TOOL_ID = "effectiveness"
CONCEPT = "dbt_effectively"
VERSION = "eff-v1"
OWN_MAX = 60

COPY = {
    "flooded_title": "Your body's loud right now.",
    "flooded_hint": "Working out what works is easier once it settles.",
    "body_first": "My body first",
    # Validation first (PRD principle 5): the host's grievance, said plainly, before any question.
    "valid_fight": "Maybe they are in the wrong. That's real.",
    "valid_unfair": "It isn't fair. That's real.",
    "valid_plain": "Being right and getting what matters can pull apart.",
    "goal_title": "What do you most want out of this?",
    "goal_hint": "One for now.",
    "goal_own": "Something else",
    "unsafe_title": "Your safety comes first.",
    "unsafe_line": "When someone might hurt you, what works is staying safe. Nothing here asks you to give ground to them.",
    "want_title": "What are you after here? Tap any.",
    "want_hint": "Both can matter.",
    "right_label": "Being right",
    "works_label": "Getting what matters",
    "piles_title": "Here's what you're after.",
    "piles_hint": "Both are real. They don't always fit together.",
    "pull_title": "Right now, which matters more?",
    "move_title": "Pick one move that works from where things stand.",
    "move_title_right": "Then one move that keeps your self-respect, from where things stand.",
    "move_own": "My own move",
    "set_title": "What could you set down, for now?",
    "set_hint": "Nothing is given up for good.",
    "end_title": "What works here: {move}",
    "end_set_line": "The rest can wait. Setting it down for now isn't giving in.",
    "end_right_line": "Sometimes being right is the point. You know which this one is.",
    "end_even_line": "Self-respect can be the point. Getting even tends to cost you more than it costs them.",
    "end_unsure_line": "Not knowing is fine. You have one move either way.",
    "end_line": "Right, or what works? Asking it is the skill.",
    "remind_q": "Want me to ask how it went?",
    "back_title": "How did it go? You planned: {move}",
    "back_helped": "It helped. Worth remembering next time.",
    "back_didnt": "It was worth trying. What works can change, and you can look again.",
    "back_not_yet": "It'll keep. The move is still there.",
    "back_again_set": "The card will come back then.",
    "back_again_none": "It'll be here when you're ready.",
    "remind_again": "Ask me again?",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
FIGHT = {"eq": ["$d.grievance", "fight"]}
UNFAIR = {"eq": ["$d.grievance", "unfair"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

GOALS = [
    ("connected", "Stay connected with them"),
    ("boundary", "Protect a boundary"),
    ("progress", "Make progress on it"),
    ("repair", "Put right what went wrong"),
    ("respect", "Keep my self-respect"),
]
# Being right and getting what matters: two piles, one screen (PRD MF-08 step 3).
RIGHT = [
    ("admit", "They admit they were wrong"),
    ("feel", "They feel what I felt"),
    ("seen", "Everyone sees it was unfair"),
    ("win", "I win this one"),
    ("pay", "They pay for it"),
]
WORKS = [
    ("sorted", "It gets sorted out"),
    ("together", "We can still work together"),
    ("need", "I get what I need from this"),
    ("better", "Things go better from here"),
    ("handled", "I can live with how I handled it"),
]
PULL = [("works", "Getting what matters"), ("right", "Being right about this one"), ("unsure", "I can't tell")]
SET_DOWN = [("right", "Being right"), ("even", "Getting even"), ("start", "How unfair the start was")]
# The host's solution direction's steps (Problem Solve: anger-blocked-redirect, envy-unfair-effective), re-voiced.
HOST_MOVES = [
    ("fight_ask", "Ask myself what's the best I'd really get by pushing", "fight", "anger-blocked-redirect"),
    ("fight_hold", "Put this fight on hold for a week", "fight", "anger-blocked-redirect"),
    ("fight_let", "Put the energy where it can move something", "fight", "anger-blocked-redirect"),
    ("unfair_have", "Name what I do have: time, skills, people", "unfair", "envy-unfair-effective"),
    ("unfair_plan", "Make a plan from where I actually start", "unfair", "envy-unfair-effective"),
    ("unfair_own", "Put my energy into my own path", "unfair", "envy-unfair-effective"),
]
GOAL_MOVES = [
    ("conn_one", "Say the one thing that matters most, and leave the rest", "connected"),
    ("conn_break", "Take a break, then come back to it", "connected"),
    ("conn_ask", "Ask what they need from this", "connected"),
    ("bound_once", "Say the limit once, plainly", "boundary"),
    ("bound_step", "Step away from it for now", "boundary"),
    ("bound_plan", "Decide what I'll do if it's crossed", "boundary"),
    ("prog_step", "Find the one step that's still in my hands", "progress"),
    ("prog_who", "Take it to someone who can change it", "progress"),
    ("prog_where", "Work from where I am today", "progress"),
    ("rep_own", "Own my part, without the rest", "repair"),
    ("rep_ask", "Ask what would help put it right", "repair"),
    ("rep_show", "Do one thing that shows I mean it", "repair"),
    ("resp_proud", "Say it once, in a way I'd be proud of", "respect"),
    ("resp_leave", "Leave it there, without getting even", "respect"),
    ("resp_hold", "Hold to what I think is right, calmly", "respect"),
    # A goal in own words: three that fit most things.
    ("any_step", "Find the one step that's still in my hands", "any"),
    ("any_pause", "Wait a day before I act on it", "any"),
    ("any_ask", "Ask for the one thing I most need", "any"),
]
REMIND = [("tomorrow", "Tomorrow"), ("few_days", "In a few days")]
BACK = [("helped", "I did it, and it helped"), ("didnt", "I did it, and it didn't help"), ("not_yet", "Not yet")]
UNSAFE_MOVE = ("unsafe", "They might hurt me if I do anything")
UNSAFE_BACK = ("unsafe", "It went badly, and I don't feel safe")
# A host's frame → the grievance it carries (Problem Solve passes its problem type; `fight` / `unfair` are the plain
# names another host can send).
# Problem Solve sends the solution direction picked (its exit's frame is `$a.solutions`, so a piled-up problem's focus
# carries too); the problem types stay for older links.
GRIEVANCE = {"anger-blocked-redirect": "fight", "envy-unfair-effective": "unfair", "anger-blocked-goal": "fight",
             "envy-unfair-advantage": "unfair", "fight": "fight", "unfair": "unfair"}

PULL_RIGHT = {"eq": [a("pull"), "right"]}
UNSAFE_PICK = lambda f: {"eq": [a(f), "unsafe"]}  # noqa: E731
# Being right about this one gets the goal's own moves and self-respect's, never the host's de-escalation steps (PRD:
# accepted without rescue).
MOVE_WHERE = {"any": [
    {"eq": ["$opt.value", "unsafe"]},
    {"all": [{"not": PULL_RIGHT}, {"eq": ["$opt.grievance", "$d.grievance"]}]},
    {"eq": ["$opt.goal", a("goal")]},
    {"all": [{"own": "goal"}, {"eq": ["$opt.goal", "any"]}]},
    {"all": [PULL_RIGHT, {"eq": ["$opt.goal", "respect"]}]},
]}
GETTING_EVEN = {"all": [PULL_RIGHT, {"has": [a("right") + ".ids", "pay"]}]}
SLOT_MOVE = {"move": {"labelOf": "move"}}


def ask(step_id, title, hint, fields, nxt, *, lines=None, extra=None):
    s = {"id": step_id, "kind": "ask", "title": title, "fields": fields, "next": nxt, **(extra or {})}
    # One quiet *Talk to someone now* per screen, on its first field.
    s["fields"][0]["links"] = s["fields"][0].get("links", []) + [SAFETY_LINK]
    if hint:
        s["hint"] = hint
    if lines:
        s["lines"] = lines
    return s


def field(fid, lst, *, mx=1, required=True, own=None, label=None, where=None, links=None):
    f = {"id": fid, "options": {"list": lst}, "max": mx, "required": required}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    if label:
        f["label"] = label
    if where:
        f["options"]["where"] = where
    if links:
        f["links"] = links
    return f


def handoff(step_id, title, lines, offers, *, complete=True, extra=None):
    s = {"id": step_id, "kind": "handoff", "complete": complete, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK], **(extra or {})}
    if title:
        s["title"] = title
    return s


GOAL_IS = lambda *gs: {"in": [a("goal"), list(gs)]}  # noqa: E731
BOTH_PILES = {"all": [{"set": a("right")}, {"set": a("works")}]}

STEPS = [
    # The validation line on every reading (principle 5); a carried flooded reading gets its heads-up after.
    ask("goal", "goal_title", "goal_hint", [field("goal", "goal", own="goal_own")],
        [{"when": UNSAFE_PICK("goal"), "to": "unsafe"}, {"when": FLOODED, "to": "heads_up"}, {"to": "want"}],
        lines=[{"when": FIGHT, "key": "valid_fight"}, {"when": UNFAIR, "key": "valid_unfair"},
               {"when": ALWAYS, "key": "valid_plain"}],
        extra={"crisis": [{"variant": "other_person", "when": UNSAFE_PICK("goal")}]}),
    ask("heads_up", "flooded_title", None, [field("heads_up", "heads_up")],
        [{"when": {"eq": [a("heads_up"), "body"]}, "to": "body_first"}, {"to": "want"}],
        lines=[{"when": ALWAYS, "key": "flooded_hint"}]),
    handoff("body_first", "flooded_title", [{"when": ALWAYS, "key": "flooded_hint"}],
            [{"exit": "cool_down", "when": ALWAYS}], complete=False, extra={"noClose": True}),
    handoff("unsafe", "unsafe_title", [{"when": ALWAYS, "key": "unsafe_line"}],
            [{"exit": "safety_open", "when": ALWAYS}, {"exit": "ending_careful", "when": ALWAYS}],
            complete=False, extra={"noClose": True, "crisis": [{"variant": "other_person", "when": ALWAYS}]}),
    ask("want", "want_title", "want_hint",
        [field("right", "right", mx=len(RIGHT), required=False, label="right_label"),
         field("works", "works", mx=len(WORKS), required=False, label="works_label")],
        [{"when": BOTH_PILES, "to": "piles"}, {"to": "pull"}]),
    {"id": "piles", "kind": "embed", "embed": "twoColumns", "answerAs": "piles_read", "title": "piles_title",
     "hint": "piles_hint", "props": {"left": "right", "right": "works", "leftLabel": "right_label",
                                     "rightLabel": "works_label", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "pull"}]},
    ask("pull", "pull_title", None, [field("pull", "pull")], [{"to": "move"}]),
    ask("move", [{"when": PULL_RIGHT, "key": "move_title_right"}, {"when": ALWAYS, "key": "move_title"}],
        None, [field("move", "move", own="move_own", where=MOVE_WHERE)],
        [{"when": UNSAFE_PICK("move"), "to": "unsafe"}, {"when": {"all": [PULL_RIGHT, {"not": GETTING_EVEN}]}, "to": "end"},
         {"to": "set_down"}],
        extra={"crisis": [{"variant": "other_person", "when": UNSAFE_PICK("move")}]}),
    ask("set_down", "set_title", "set_hint", [field("set_down", "set_down", mx=len(SET_DOWN), required=False)],
        [{"to": "end"}]),
    handoff("end", "end_title",
            [{"when": GETTING_EVEN, "key": "end_even_line"},
             {"when": PULL_RIGHT, "key": "end_right_line"},
             {"when": {"set": a("set_down")}, "key": "end_set_line"},
             {"when": {"eq": [a("pull"), "unsure"]}, "key": "end_unsure_line"},
             {"when": ALWAYS, "key": "end_line"}],
            [{"exit": "give", "when": GOAL_IS("connected", "repair")},
             {"exit": "dear_man", "when": GOAL_IS("connected", "repair", "boundary")},
             {"exit": "fast", "when": {"any": [GOAL_IS("respect", "boundary"), GETTING_EVEN]}},
             {"exit": "say_no", "when": GOAL_IS("boundary")},
             {"exit": "problem_solve", "when": {"any": [GOAL_IS("progress"), {"own": "goal"}]}},
             {"exit": "build_mastery", "when": GOAL_IS("progress")}],
            extra={"noClose": True, "titleSlots": SLOT_MOVE,
                   "fields": [{"id": "remind", "label": "remind_q", "max": 1, "options": {"list": "remind"}}],
                   "followUp": {"type": "effective_move", "whenFrom": "remind"}}),
    # Reopened from the effective_move card (R9): a run that reached `end`.
    ask("back", "back_title", None, [field("back", "back")],
        [{"when": UNSAFE_PICK("back"), "to": "unsafe"}, {"when": {"eq": [a("back"), "not_yet"]}, "to": "again"},
         {"to": "back_end"}],
        extra={"reopens": {"after": "end", "again": ["again"]}, "clears": ["back", "again"], "titleSlots": SLOT_MOVE,
               "crisis": [{"variant": "other_person", "when": UNSAFE_PICK("back")}]}),
    # Not yet: the move is still there, and the card can come again (optional chips).
    ask("again", "back_not_yet", None, [field("again", "remind", required=False, label="remind_again")],
        [{"to": "back_end"}], extra={"followUp": {"type": "effective_move", "whenFrom": "again"}}),
    handoff("back_end", None, [{"when": {"eq": [a("back"), "helped"]}, "key": "back_helped"},
                               {"when": {"eq": [a("back"), "didnt"]}, "key": "back_didnt"},
                               {"when": {"set": a("again")}, "key": "back_again_set"},
                               {"when": ALWAYS, "key": "back_again_none"}],
            [{"exit": "problem_solve", "when": {"eq": [a("back"), "didnt"]}}], extra={"noClose": True}),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                      # DT-01 First, the body (a carried flooded reading)
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # IE-08, scared of them
    {"id": "give", "toolId": "give"},                                # IE-06 Keep it warm (connected, put it right)
    {"id": "dear_man", "toolId": "dear-man"},                        # IE-01 DEAR MAN's prep
    {"id": "fast", "toolId": "fast"},                                # IE FAST (self-respect, a boundary)
    {"id": "say_no", "toolId": "say-no"},                            # IE-04 Say no (a boundary)
    {"id": "problem_solve", "toolId": "problem-solve"},              # ER-12 (progress, own words, didn't help)
    {"id": "build_mastery", "toolId": "build-mastery"},              # ER-11 (progress)
    {"id": "safety_open", "toolId": None, "safety": True},           # safety.open (R6): on every screen
    {"id": "done", "done": True},
]


def options():
    out = [("goal", v, label, {}, None) for v, label in GOALS]
    out += [("goal", "unsafe", "Someone threatened me, scared me or hurt me", {"danger": "other"}, None)]
    out += [("heads_up", "body", "My body first", {}, None), ("heads_up", "go", "Try it anyway", {}, None)]
    out += [("right", v, label, {"pile": "right"}, "EffectivenessStatement") for v, label in RIGHT]
    out += [("works", v, label, {"pile": "effective"}, "EffectivenessStatement") for v, label in WORKS]
    out += [("pull", v, label, {}, None) for v, label in PULL]
    # Both props on every move, so an unset grievance or an own-words goal never matches a missing one.
    out += [("move", v, label, {"grievance": g, "goal": "host"}, ("SolutionDirection", sd)) for v, label, g, sd in HOST_MOVES]
    out += [("move", v, label, {"goal": g, "grievance": "none"}, None) for v, label, g in GOAL_MOVES]
    out += [("move", UNSAFE_MOVE[0], UNSAFE_MOVE[1], {"goal": "none", "grievance": "none", "danger": "other"}, None)]
    out += [("set_down", v, label, {}, None) for v, label in SET_DOWN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("back", v, label, {}, None) for v, label in BACK]
    out += [("back", UNSAFE_BACK[0], UNSAFE_BACK[1], {"danger": "other"}, None)]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "goal", "ownMax": OWN_MAX,
    # band: a carried flooded reading (C6.2); frame: the host's grievance (Problem Solve passes its problem type).
    "accepts": ["band", "frame"],
    "copy": COPY, "tables": {"grievanceOf": GRIEVANCE},
    "derive": [{"name": "grievance", "from": "$ctx.frame", "table": "grievanceOf"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
