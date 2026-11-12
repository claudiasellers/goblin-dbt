"""Give your mind a job (DT-06; ACCEPTS with a return, the attention ladder, the lid: DBT DT Handout 7, Linehan 2015)
as a skill on the runtime.

The editable source. The flow is PRD DT-06 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): the loop won't stop, or the feeling is too much to deal with now and nothing can be
done tonight. Distraction helps, but without a return it becomes avoidance, so every way in here has one:

- **A job for your mind** (the attention ladder, levels 0-2): eyes-open find tasks (five blue things, the farthest
  sound…), warmer ones (something you like the look of, something soft…), then good ones (something you chose or made,
  something that reminds you of someone who likes you…, with a few seconds of staying with it). After each, *too much ·
  about right · could do more*: too much goes a level cooler, more a level warmer, and the person can stop whenever.
  Levels are never shown as numbers; the tasks just get warmer. A carried flooded reading gets the body first, or the
  coolest tasks only. Then the return, straight away: *Back. Is it louder, the same, quieter?* (the close, asked in the
  flow) and the fork: can anything be done about it?
- **A break from it for a while** (ACCEPTS' other families, one tap): move, hands busy, one small kind act, a different
  feeling on purpose, something cold in the hand. Never food, shopping, alcohol or scrolling. *When do you want to come
  back to it?* books the return (`mind_job_back`), which reopens the run at the same check and fork (`resumeAt`).
- **The lid** (put it away, with a return): pick a jar, a tin or a box; put it in and hold the lid shut (the `lidShelf`
  embed); an optional label; *When will you open it again?* books the reopen (`lid_reopen`). Reopened (`reopens`):
  *It's still on the shelf. Open it for five minutes?* → name it → something can be done (Problem Solve), not as big as
  it felt (Check the Facts), can't be changed (Let it be), or gone. *Not yet* puts it back once more, with a new time.
  Nothing on the shelf is ever thrown away unopened.

docs/design/mind-job.md lists what this batch defers (the ladder remembered between visits as `AttentionLadderState`,
level 3 into ER-04's directory, the re-park heads-up, comparisons with their own past, the worry time and therapist
reopen times, the Stage rooms) and where it departs from the PRD.

Safety (plan C6): *Talk to someone now* on every screen; nothing passive for a loop (every task is eyes open and
outward); no comparisons with other people; the lid always books a reopen.
"""

ID = "mind_job"
TOOL_ID = "mind-job"
CONCEPT = "dbt_accepts"
VERSION = "mj-v1"
OWN_MAX = 40  # an activity, or a label, in their words (short: the record keeps every own-words field)

COPY = {
    "what_title": "What would help right now?",
    "what_hint": "Each one comes back to it, at a time you pick.",
    # A carried flooded reading (PRD: DT-01 first, then level-0 find tasks only).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "You can settle your body first, or try a short find task.",
    "settle_line": "Body first. Your mind's job is here when you're ready.",
    # The ladder (levels 0-2; never shown as numbers).
    "warmth_title": "What kind of job?",
    "warmth_hint": "Some days the warmer ones are harder. Any is fine.",
    "task_find_title": "Something to find. Pick one.",
    "task_like_title": "Something you like. Pick one.",
    "task_good_title": "Something good. Pick one.",
    "do_title": "Eyes open.",
    "here": "You're here, and it's",
    "found": "Found one",
    "found_sound": "Heard it",
    "found_one": "Got it",
    "find_done": "That's it.",
    "t_blue": "Find five blue things around you. Tap for each one.",
    "t_sound": "Listen for the farthest sound you can hear.",
    "t_round": "Find three round things.",
    "t_edges": "Find four things with straight edges.",
    "t_look": "Find one thing you like the look of.",
    "t_soft": "Find something soft. Touch it if you can.",
    "t_hum": "Listen for a sound you don't mind.",
    "t_made": "Find something you chose or made.",
    "t_liked": "Find something that reminds you of someone who likes you.",
    "t_ahead": "Think of something you're looking forward to, even something small.",
    "stay_title": "Stay with it for a few seconds.",
    "stay_step1": "Let your eyes rest on it, or keep it in mind.",
    "stay_step2": "Notice one thing you like about it.",
    "stay_start": "Start",
    "stay_running": "Staying with it",
    "stay_done": "That's it.",
    "how_title": "How was that?",
    "how_hint": "Too much goes cooler. More goes warmer.",
    # The return (in the flow, or from the return card), then the fork.
    "back_title": "Back. Is it louder, the same, quieter?",
    "fork_title": "Can anything be done about it right now?",
    "louder_line": "Still loud. Let's look after your body first.",
    "end_change": "Then let's look at what can be done.",
    "end_cant": "Then the fight with it can ease. Let it be can help.",
    "end_gone": "Your mind did a job, and it's quieter. That's the skill.",
    "end_later": "Then put it away for later, with a time to come back.",
    # A break (ACCEPTS' other families).
    "break_title": "What could you do for a while?",
    "break_hint": "Something that takes your hands or your attention.",
    "break_own": "Something else",
    "break_when_title": "When do you want to come back to it?",
    "break_when_hint": "I'll ask how it is then.",
    "break_line": "Go do it. When you're back, I'll ask how it is.",
    # The lid.
    "lid_pick_title": "Put it in something. Pick one.",
    "lid_pick_hint": "It stays on the shelf until you open it.",
    "lid_title": "Put it in, then hold the lid shut.",
    "lid_put": "Put it in",
    "lid_hold": "Hold the lid shut",
    "lid_holding": "Holding",
    "lid_hold_hint": "Press and hold until the lid is shut.",
    "lid_done": "It's shut, and on the shelf.",
    "lid_label_title": "Want to give it a label?",
    "lid_label_hint": "Skipping is fine.",
    "lid_label_own": "In my words",
    "lid_when_title": "When will you open it again?",
    "lid_when_hint": "It'll keep until then.",
    "lid_line": "It's on the shelf. It'll keep until you open it.",
    # The reopen (from the lid_reopen card).
    "reopen_title": "It's still on the shelf. Open it for five minutes?",
    "reopen_hint": "You can put it back.",
    "opened_title": "Take the lid off. What's in there?",
    "opened_hint": "Pick the closest.",
    "reopen_fork_title": "Can anything be done about it?",
    "repark_title": "When will you open it?",
    "repark_hint": "It's okay to wait. It'll keep.",
    "reopen_change": "Then let's look at what can be done.",
    "reopen_facts": "Checking the facts can show how big it is now.",
    "reopen_cant": "Then the fight with it can ease. Let it be can help.",
    "reopen_gone": "Then it can go. You opened it, and that's enough.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

WHAT = [
    ("loop", "My mind won't stop"),
    ("break", "A break from it for a while"),
    ("lid", "Put it away until later"),
]
HEADS_UP = [
    ("body", "My body first"),
    ("find", "A short find task"),
]
WARMTH = [
    ("find", "Something to find"),
    ("like", "Something I like"),
    ("good", "Something good"),
]
# AttentionTask: (value, label, level, variant, count, task copy, found copy). Level 0 neutral, 1 pleasant-neutral,
# 2 positive (with a few seconds of staying with it). Every one is eyes open and outward (C6.3: nothing passive for a
# loop).
TASKS = [
    ("blue", "Five blue things", "find", "find", 5, "t_blue", "found"),
    ("sound", "The farthest sound", "find", "listen", 1, "t_sound", "found_sound"),
    ("round", "Three round things", "find", "find", 3, "t_round", "found"),
    ("edges", "Four things with straight edges", "find", "find", 4, "t_edges", "found"),
    ("look", "One thing I like the look of", "like", "find", 1, "t_look", "found"),
    ("soft", "Something soft", "like", "find", 1, "t_soft", "found"),
    ("hum", "A sound I don't mind", "like", "listen", 1, "t_hum", "found_sound"),
    ("made", "Something I chose or made", "good", "find", 1, "t_made", "found"),
    ("liked", "Something that reminds me of someone who likes me", "good", "find", 1, "t_liked", "found"),
    ("ahead", "Something I'm looking forward to", "good", "find", 1, "t_ahead", "found_one"),
]
LEVELS = ["find", "like", "good"]
HOW = [
    ("too_much", "Too much"),
    ("right", "About right"),
    ("more", "Could do more"),
    ("enough", "That's enough for now"),
]
TVN = [("worse", "Louder"), ("same", "About the same"), ("better", "Quieter"), ("much_better", "Much quieter")]
FORK = [
    ("change", "Yes, something can be done"),
    ("cant", "No, it can't be changed"),
    ("later", "Not now. Put it away for later"),
    ("gone", "It's gone for now"),
]
# AcceptsOption by family (IMPLEMENTS dbt_accepts). Excluded by design: food, shopping, alcohol, scrolling, anything
# that hurts.
BREAK = [
    ("move", "Move my body", "Activities"),
    ("hands", "Something with my hands", "Activities"),
    ("kind", "One small kind thing for someone", "Contributing"),
    ("feeling", "A different feeling on purpose: music or a show I love", "Emotions"),
    ("cold", "Something cold in my hand", "Sensations"),
]
# The return (ReturnOption): the chips are mind_job_back's window chips.
BREAK_WHEN = [
    ("m5", "5 minutes"),
    ("m15", "15 minutes"),
    ("m30", "30 minutes"),
    ("m60", "When I'm done (about an hour)"),
]
LID = [
    ("jar", "A jar"),
    ("tin", "A tin"),
    ("box", "A box"),
]
LABELS = [
    ("worry", "A worry"),
    ("said", "Something someone said"),
    ("did", "Something I did"),
    ("feeling", "A feeling"),
    ("unnamed", "Nothing to name yet"),
]
# ParkReopenOption: lid_reopen's window chips.
LID_WHEN = [
    ("tonight", "Tonight"),
    ("tomorrow", "Tomorrow"),
    ("few_days", "In a few days"),
]
REOPEN = [
    ("open", "Open it"),
    ("not_yet", "Not yet"),
    ("gone", "It's gone"),
]
REOPEN_FORK = [
    ("change", "Yes, something can be done"),
    ("facts", "It might not be as big as it felt"),
    ("cant", "No, it can't be changed"),
    ("gone", "It's gone now"),
]


def ask(step_id, title, hint, field, lst, nxt, *, required=True, own=None, extra=None, field_extra=None):
    f = {"id": field, "options": {"list": lst}, "max": 1, "required": required, "links": [SAFETY_LINK], **(field_extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt}
    if hint:
        s["hint"] = hint
    return {**s, **(extra or {})}


def handoff(step_id, lines, offers, *, no_close=True, complete=True):
    s = {"id": step_id, "kind": "handoff", "complete": complete, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK]}
    if no_close:
        s["noClose"] = True
    return s


def warmer(level):
    return LEVELS[min(LEVELS.index(level) + 1, len(LEVELS) - 1)]


def cooler(level):
    return LEVELS[max(LEVELS.index(level) - 1, 0)]


def how_step(level):
    """After a task: too much goes a level cooler (the coolest goes to the body), more a level warmer (never while
    flooded), about right another at the same warmth, enough goes back to it."""
    f = f"how_{level}"
    nxt = [{"when": {"eq": [a(f), "enough"]}, "to": "back"}]
    if level == "find":
        nxt.append({"when": {"eq": [a(f), "too_much"]}, "to": "too_much"})
    else:
        nxt.append({"when": {"eq": [a(f), "too_much"]}, "to": f"to_{cooler(level)}"})
    nxt.append({"when": {"all": [{"eq": [a(f), "more"]}, FLOODED]}, "to": "to_find"})
    nxt.append({"when": {"all": [{"eq": [a(f), "more"]}, {"not": FLOODED}]}, "to": f"to_{warmer(level)}"})
    # The conditions are exclusive, so one jump per target: a jump to the default target is dropped (the default
    # catches it) and two jumps to the same target are joined with any.
    default = f"to_{level}"
    grouped: dict = {}
    for j in nxt:
        if j["to"] == default:
            continue
        grouped.setdefault(j["to"], []).append(j["when"])
    jumps = [{"when": ws[0] if len(ws) == 1 else {"any": ws}, "to": to} for to, ws in grouped.items()]
    return ask(f, "how_title", "how_hint", f, "how", [*jumps, {"to": default}])


def task_pick(level):
    f = f"to_{level}"
    return ask(f, f"task_{level}_title", None, f, f"task_{level}",
               [{"when": {"eq": [a(f), v]}, "to": f"do_{v}"} for v, _, lv, *_ in TASKS if lv == level])


def do_step(v, level, variant, count, task, found):
    return {"id": f"do_{v}", "kind": "embed", "embed": "orientFind", "answerAs": f"do_{v}", "title": "do_title",
            "props": {"variant": variant, "count": count, "here": "here", "task": task, "foundLabel": found,
                      "done": "find_done", "next": "next"},
            "links": [SAFETY_LINK], "next": [{"to": "stay" if level == "good" else f"how_{level}"}]}


STEPS = [
    ask("what", "what_title", "what_hint", "what", "what",
        [{"when": {"eq": [a("what"), "lid"]}, "to": "lid_pick"}, {"when": {"eq": [a("what"), "break"]}, "to": "break"},
         {"when": FLOODED, "to": "heads_up"}, {"to": "warmth"}]),
    ask("heads_up", "heads_up_title", "heads_up_hint", "heads_up", "heads_up",
        [{"when": {"eq": [a("heads_up"), "body"]}, "to": "settle"}, {"to": "to_find"}]),
    ask("warmth", "warmth_title", "warmth_hint", "warmth", "warmth",
        [{"when": {"eq": [a("warmth"), lv]}, "to": f"to_{lv}"} for lv in LEVELS]),
    *[task_pick(lv) for lv in LEVELS],
    *[do_step(v, lv, variant, count, task, found) for v, _, lv, variant, count, task, found in TASKS],
    # Level 2: a few seconds of staying with it (savouring, briefly).
    {"id": "stay", "kind": "embed", "embed": "bodyCard", "answerAs": "stay", "title": "stay_title",
     "props": {"kind": "still", "seconds": 10, "step1": "stay_step1", "step2": "stay_step2", "start": "stay_start",
               "running": "stay_running", "done": "stay_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "how_good"}]},
    *[how_step(lv) for lv in LEVELS],
    # The return: the close, asked in the flow (and again from the return card, `resumeAt`), then the fork.
    ask("back", "back_title", None, "back", "tvn",
        [{"when": {"eq": [a("back"), "worse"]}, "to": "louder"}, {"to": "fork"}], field_extra={"askFresh": "thenVsNow"}),
    ask("fork", "fork_title", None, "fork", "fork",
        [{"when": {"eq": [a("fork"), "later"]}, "to": "lid_pick"}, {"to": "end"}]),
    handoff("end", [{"when": {"eq": [a("fork"), v]}, "key": f"end_{v}"} for v in ("change", "cant", "gone")],
            [{"exit": "problem_solve", "when": {"eq": [a("fork"), "change"]}},
             {"exit": "dear_man", "when": {"eq": [a("fork"), "change"]}},
             {"exit": "let_it_be", "when": {"eq": [a("fork"), "cant"]}}]),
    handoff("louder", [{"when": ALWAYS, "key": "louder_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    handoff("too_much", [{"when": ALWAYS, "key": "louder_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    handoff("settle", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    # A break: one family, then the return booked.
    ask("break", "break_title", "break_hint", "break", "break", [{"to": "break_at"}], own="break_own"),
    ask("break_at", "break_when_title", "break_when_hint", "break_at", "break_when", [{"to": "break_ok"}],
        extra={"followUp": {"type": "mind_job_back", "whenFrom": "break_at"}}),
    handoff("break_ok", [{"when": ALWAYS, "key": "break_line"}], []),
    # The lid.
    ask("lid_pick", "lid_pick_title", "lid_pick_hint", "lid_pick", "lid_pick", [{"to": "lid_shut"}]),
    {"id": "lid_shut", "kind": "embed", "embed": "lidShelf", "answerAs": "lid_shut", "title": "lid_title",
     "props": {"containerField": "lid_pick", "put": "lid_put", "hold": "lid_hold", "holding": "lid_holding",
               "hint": "lid_hold_hint", "holdSec": 3, "done": "lid_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "lid_name"}]},
    ask("lid_name", "lid_label_title", "lid_label_hint", "lid_name", "label", [{"to": "lid_when"}], required=False,
        own="lid_label_own"),
    ask("lid_when", "lid_when_title", "lid_when_hint", "lid_when", "lid_when", [{"to": "lid_end"}],
        extra={"followUp": {"type": "lid_reopen", "whenFrom": "lid_when"}}),
    handoff("lid_end", [{"when": ALWAYS, "key": "lid_line"}], []),
    # The reopen: only a run whose path reached lid_when starts here, from the lid_reopen card.
    ask("reopen", "reopen_title", "reopen_hint", "reopen", "reopen",
        [{"when": {"eq": [a("reopen"), "not_yet"]}, "to": "repark"}, {"when": {"eq": [a("reopen"), "gone"]}, "to": "lid_off"},
         {"to": "opened"}],
        extra={"reopens": {"after": "lid_when", "again": ["repark"]}, "clears": ["reopen", "opened", "can_do", "repark"]}),
    ask("opened", "opened_title", "opened_hint", "opened", "label", [{"to": "can_do"}], required=False),
    ask("can_do", "reopen_fork_title", None, "can_do", "reopen_fork", [{"to": "lid_off"}]),
    ask("repark", "repark_title", "repark_hint", "repark", "lid_when", [{"to": "lid_end"}],
        extra={"followUp": {"type": "lid_reopen", "whenFrom": "repark"}}),
    handoff("lid_off",
            [{"when": {"eq": [a("reopen"), "gone"]}, "key": "reopen_gone"},
             *[{"when": {"eq": [a("can_do"), v]}, "key": f"reopen_{v}"} for v in ("change", "facts", "cant", "gone")]],
            [{"exit": "problem_solve", "when": {"eq": [a("can_do"), "change"]}},
             {"exit": "check_the_facts", "when": {"eq": [a("can_do"), "facts"]}},
             {"exit": "let_it_be", "when": {"eq": [a("can_do"), "cant"]}}]),
]

EXITS = [
    {"id": "problem_solve", "toolId": "problem-solve"},                  # ER-12: something can be done
    {"id": "dear_man", "toolId": "dear-man"},                            # IE-01: it's about someone
    {"id": "check_the_facts", "toolId": "check-the-facts"},              # ER-02: not as big as it felt
    {"id": "let_it_be", "toolId": "let-it-be"},                          # DT-04: it can't be changed
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("what", v, label, {}, None) for v, label in WHAT]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("warmth", v, label, {}, None) for v, label in WARMTH]
    for lv in LEVELS:
        out += [(f"task_{lv}", v, label, {"level": lv}, "AttentionTask") for v, label, tl, *_ in TASKS if tl == lv]
    out += [("how", v, label, {}, None) for v, label in HOW]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    out += [("fork", v, label, {}, None) for v, label in FORK]
    out += [("break", v, label, {"family": fam}, "AcceptsOption") for v, label, fam in BREAK]
    out += [("break_when", v, label, {}, "ReturnOption") for v, label in BREAK_WHEN]
    out += [("lid_pick", v, label, {}, None) for v, label in LID]
    out += [("label", v, label, {}, None) for v, label in LABELS]
    out += [("lid_when", v, label, {}, "ParkReopenOption") for v, label in LID_WHEN]
    out += [("reopen", v, label, {}, None) for v, label in REOPEN]
    out += [("reopen_fork", v, label, {}, None) for v, label in REOPEN_FORK]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "what", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first, or the coolest find tasks only.
    "accepts": ["band"],
    # The return card (mind_job_back) reopens a break at its check, though the break's path never reached it.
    "resumeAt": ["back"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
