"""What matters to me (ER-09; values and priorities, DBT ER Handouts 18 (values and priorities list) and 17 (building
a life worth living: values → goals → action steps)). Spec: docs/design/values.md.

Steps:
  start      *What matters to you?* (*There are no right answers.*) First time: straight to the sort. With values
             kept (`$p.values`): *Take a small step for one of them* or *Sort them again*.
  heads_up   a carried flooded reading: values work wants a steadier moment; the body first or *Try it anyway*.
  sort       *Which of these sound like you?* ~24 value cards in plain words (paraphrasing H18's themes), as many as
             fit, or own words. Nothing picked is a full answer: *not sure yet* (`not_sure`).
  keep       *If you could only keep three for now*: up to three from the sort (or own words). *Not sure yet* is
             complete: the sort is kept either way (`values`, one per person, re-sorting replaces it).
  one        one kept value to take a step for (this visit's three), or `one_kept` (the ones kept before).
  step       one small step this week for that value (2–3 per value, sized to succeed), or own words.
  when       when (*tomorrow · in a few days · sometime this week*); *Want me to ask how it went?* books `value_step`.
  set        "Your step: {step}." and the direction line (a direction, not a rule).
  back       the `value_step` card reopens the run here (R9): *Earlier you picked: {step}.* *Did it happen?*
  back_yes   yes / partly: *That was {focus} in action.*
  back_hurt  it happened, and it hurt: it took something; how it landed isn't all on you (Recover, the body).
  back_no    not this time: a real answer; a smaller step for the same value, or not now.

Risks (PRD): values as "shoulds" (copy frames directions, never rules; nothing says *you haven't acted on…*);
conflicting values (*Two can pull different ways. Both can matter.*); identity diffusion (*not sure yet* is a full
answer, and the sort is kept).

Departures from the PRD (docs/design/values.md lists them with the batch that picks each up): a chip sort, not the
`pileSort` embed's three piles (that's me · sometimes · not now); goal and step are one chip (`ValueGoal` and
`ValueStep` merged); no catches after the fact; no monthly *still yours?* Today card (Me revisits the item after 30
days, and the start screen offers *Sort them again*).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "values"
TOOL_ID = "values-clarification"
CONCEPT = "dbt_values_priorities"
VERSION = "vc-v1"
OWN_MAX = 60  # a value or a step in a few words

COPY = {
    "start_title": "What matters to you?",
    "start_hint": "There are no right answers, and they can change. A few minutes is enough.",
    "start_back_title": "Your values are here.",
    # A carried flooded reading: values work wants a steadier moment (PRD: `steady`).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "This works better once it settles a little.",
    "settle_line": "This will keep. Look after the next few minutes first.",
    "sort_title": "Which of these sound like you?",
    "sort_hint": "Pick as many as fit. If you're not sure, pick none. That's a full answer.",
    "sort_own": "Add your own",
    "keep_title": "If you could only keep three for now, which?",
    # Conflicting values (PRD risks) and identity diffusion: *not sure yet* is complete.
    "keep_hint": "Two can pull different ways. Both can matter. Not sure yet? Save with none picked.",
    "keep_own": "In my words",
    "keep_primary": "Save",
    "not_sure_title": "Not sure yet is fine.",
    "not_sure_line": "What matters can take a while to find. Come back any time.",
    "sorted_line": "Your sort is in Me. You can pick three another time.",
    "one_title": "Which one do you want to take a small step for?",
    "one_hint": "One is enough for this week.",
    "focus_own": "One in my words",
    "step_title": "One small step this week.",
    "step_hint": "Small enough that you'd likely do it, and safe to do. If it means facing someone who hurts you, that's not the step.",
    "step_own": "My own step",
    "when_title": "When could you do it?",
    "remind_label": "Want me to ask how it went?",
    "set_title": "Your step: {step}.",
    "set_line": "It's a direction, not a rule. Doing part of it counts.",
    "set_remind": "I'll ask how it went. Doing part of it counts.",
    # The value_step card reopens the run here.
    "back_title": "Earlier you picked: {step}.",
    "happened_label": "Did it happen?",
    "back_yes_title": "That was {focus} in action.",
    "back_yes_line": "Steps like that are what a value looks like from the outside.",
    "back_yes_title_own": "That was something that matters to you, in action.",
    # It happened and went badly (a rejection, a put-down): the step still counts; how it landed isn't all on them.
    "back_hurt_title": "That took something, and it hurt.",
    "back_hurt_line": "Doing it still counts. How it landed isn't all on you.",
    "back_no_title": "Not this time is a real answer.",
    "back_no_hint": "Values are directions, not rules. A smaller step still counts.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
    # A kept value with nothing to call it (R3): gone or set aside since the visit.
    "profile_unnamed": "something that matters to you",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
HAS_VALUES = {"set": "$p.values"}

# First time: one way in. With values kept: a step for one, or sort again (`back`).
STARTS = [
    ("begin", "Let's look", {}),
    ("step", "Take a small step for one of them", {"back": True}),
    ("sort", "Sort them again", {"back": True}),
]
HEADS_UP = [("settle", "Look after the next few minutes first"), ("try", "Try it anyway")]
# The value cards (paraphrasing H18's themes in plain words; no verbatim list), each with 2–3 small steps for this
# week, sized to succeed: the PRD's ValueGoal and ValueStep as one chip.
VALUES = [
    ("belonging", "Belonging somewhere", ["Go somewhere I feel part of things", "Say yes to one invitation",
                                          "Message a group I'm part of"]),
    ("count_on", "Being someone people can count on", ["Do one thing I said I'd do", "Check in on someone who relies on me",
                                                        "Say no to one thing I can't keep"]),
    ("fairness", "Fairness", ["Speak up once when something's unfair, if it's safe to", "Hear out someone I disagree with",
                              "Share something out fairly at home"]),
    ("making", "Making things", ["Make something small, for ten minutes", "Fix one thing that's broken",
                                 "Cook something simple"]),
    ("learning", "Learning", ["Spend ten minutes on something new", "Ask someone how they do something",
                              "Try one new thing once"]),
    ("health", "Looking after my body", ["Go to bed a little earlier one night", "Take a short walk",
                                         "Book a check-up I've been putting off"]),
    ("fun", "Fun and play", ["Do one thing only because it's fun", "Play a game", "Put on music and move"]),
    ("independence", "Being independent", ["Do one thing on my own that I'd usually ask for help with",
                                           "Make one small decision without checking with anyone",
                                           "Plan an hour that's all mine"]),
    ("honesty", "Honesty", ["Say one true thing I've been holding back, to someone safe", "Tell someone safe how I really am",
                            "Put right one small untruth"]),
    ("caring", "Caring for others", ["Do one kind thing for someone", "Ask someone how they're really doing",
                                     "Help with one small task"]),
    ("calm", "Calm and peace", ["Take five quiet minutes", "Clear one small space",
                                "Leave my phone in another room for a while"]),
    ("adventure", "Adventure and new things", ["Go somewhere I haven't been", "Take a different route",
                                               "Try something I've never done"]),
    ("meaning", "Meaning, or something bigger than me", ["Spend a few minutes somewhere quiet or sacred to me",
                                     "Read something that matters to me", "Give some time to a cause"]),
    ("achievement", "Getting things done", ["Finish one small thing I've started", "Do the first step of something bigger",
                                            "Call one thing done at good enough"]),
    ("beauty", "Beauty and nature", ["Spend time outside, looking", "Put something I find beautiful where I'll see it",
                                     "Notice one beautiful thing and stay with it"]),
    ("family", "Family, or the people who feel like family", ["Spend time with someone who feels like family",
                                                              "Do one thing from a family tradition I like",
                                                              "Message someone in my family, if that feels safe"]),
    ("friendship", "Friendship", ["Reach out to a friend", "See a friend in person",
                                  "Be a bit more honest with a friend"]),
    ("standing_up", "Standing up for myself", ["Say what I need to someone safe, once, plainly", "Say no to one small thing",
                                               "Ask for one thing I want"]),
    ("kindness", "Kindness", ["Do one kind thing no one will see", "Say something kind to someone",
                              "Go easy on myself about one mistake"]),
    ("respect", "Respect", ["Listen without interrupting, once", "Keep one boundary that matters to me",
                            "Thank someone properly"]),
    ("community", "Community", ["Help a neighbour with something small", "Go to one local event",
                                "Give an hour to something local"]),
    ("self_respect", "Self-respect", ["Keep one promise to myself", "Do one thing I'd be proud of",
                                      "Step away from one conversation that puts me down"]),
    ("love", "Love and closeness", ["Tell someone safe that I love them", "Spend unhurried time with someone close",
                                    "Do something thoughtful for someone I love"]),
    ("work", "Work that matters to me", ["Spend twenty minutes on work that matters to me", "Ask for feedback once",
                                         "Learn one small thing for my work"]),
]
STEPS_FOR = [(f"{v}_{i + 1}", label, v) for v, _, steps in VALUES for i, label in enumerate(steps)]
# A value in their own words gets curated steps too (own words stay the escape hatch).
OWN_STEPS = [("own_1", "Spend ten minutes on it", "own"), ("own_2", "Tell someone safe it matters to me", "own"),
             ("own_3", "Notice one moment it shows up this week", "own")]
# The value_step card's chips: when = the chip id.
WHEN = [("tomorrow", "Tomorrow"), ("few_days", "In a few days"), ("this_week", "Sometime this week")]
REMIND = [("yes", "Yes, ask me"), ("no", "No thanks")]
HAPPENED = [("yes", "Yes"), ("partly", "Partly"), ("hurt", "It happened, and it hurt"), ("no", "Not this time")]
AGAIN = [("smaller", "Pick a smaller one"), ("not_now", "Not now")]

KEPT = {"set": a("kept")}
# This visit's three, from the sort (a value can only be kept if it was sorted in).
IN_SORT = {"has": [a("mine") + ".ids", "$opt.value"]}
IN_KEPT = {"has": [a("kept") + ".ids", "$opt.value"]}
# The focus: this visit's pick, or one kept before. A step chip belongs to its value; a value in their own words
# (typed here, kept in their words this visit, or kept before as `own`) gets the general ones.
OWN_FOCUS = {"any": [{"all": [{"not": {"set": a("focus") + ".ids"}}, {"not": {"set": a("focus_kept") + ".ids"}}]},
                     {"eq": [a("focus_kept"), "own"]}]}
FOR_FOCUS = {"any": [{"eq": ["$opt.value_id", a("focus")]}, {"eq": ["$opt.value_id", a("focus_kept")]},
                     {"all": [{"eq": ["$opt.value_id", "own"]}, OWN_FOCUS]}]}


def ask(sid, title, hint, fields, nxt, **extra):
    # *Talk to someone now* on every screen: an ask step's links live on a field, the last, so they sit below the form.
    fields = [*fields[:-1], {**fields[-1], "links": [SAFETY_LINK]}]
    s = {"id": sid, "kind": "ask", "title": title, "fields": fields, "next": nxt, **extra}
    if hint:
        s["hint"] = hint
    return s


def field(fid, lst, *, mx=1, required=True, own=None, where=None, profile=None, **extra):
    opts = {"list": lst, **({"where": where} if where else {}), **({"profile": profile} if profile else {})}
    f = {"id": fid, "options": opts, "max": mx, "required": required, **extra}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True, "max": OWN_MAX}
    return f


def handoff(sid, title, lines, offers, *, no_close=False, **extra):
    s = {"id": sid, "kind": "handoff", "complete": True, "title": title, "lines": lines, "offers": offers,
         "done": "done", "next": [], "links": [SAFETY_LINK], **extra}
    if no_close:
        s["noClose"] = True
    return s


TO_SORT = [{"when": FLOODED, "to": "heads_up"}, {"when": {"eq": [a("start"), "step"]}, "to": "one_kept"}, {"to": "sort"}]

STEPS = [
    # First time: the start screen is the question itself, and Next goes to the sort.
    ask("start", [{"when": HAS_VALUES, "key": "start_back_title"}, {"key": "start_title"}], "start_hint",
        [field("start", "start", where={"any": [{"all": [HAS_VALUES, {"eq": ["$opt.back", True]}]},
                                                 {"all": [{"not": HAS_VALUES}, {"not": {"eq": ["$opt.back", True]}}]}]})],
        TO_SORT),
    ask("heads_up", "heads_up_title", "heads_up_hint", [field("heads_up", "heads_up")],
        [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, {"when": {"eq": [a("start"), "step"]}, "to": "one_kept"},
         {"to": "sort"}]),
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}],
            no_close=True),
    ask("sort", "sort_title", "sort_hint", [field("mine", "value", mx=len(VALUES) + 1, required=False, own="sort_own")],
        [{"when": {"set": a("mine")}, "to": "keep"}, {"to": "not_sure"}]),
    handoff("not_sure", "not_sure_title", [{"when": ALWAYS, "key": "not_sure_line"}], [], no_close=True),
    # Keep (R4) on *Keep these*: the sort and up to three. *Not sure yet* (none picked) keeps the sort.
    ask("keep", "keep_title", "keep_hint", [field("kept", "value", mx=3, required=False, own="keep_own", where=IN_SORT)],
        # Kept only in their own words: that's the value, straight to its step.
        [{"when": {"set": a("kept") + ".ids"}, "to": "one"}, {"when": KEPT, "to": "step"}, {"to": "sorted"}],
        keep={"kind": "values", "many": False, "from": ["mine", "kept"]}, primary="keep_primary"),
    handoff("sorted", "not_sure_title", [{"when": ALWAYS, "key": "sorted_line"}], [], no_close=True),
    ask("one", "one_title", "one_hint", [field("focus", "value", where=IN_KEPT, own="focus_own")], [{"to": "step"}]),
    ask("one_kept", "one_title", "one_hint", [field("focus_kept", "value", where={"any": []}, profile="values")],
        [{"to": "step"}]),
    ask("step", "step_title", "step_hint", [field("step", "step", own="step_own", where=FOR_FOCUS)], [{"to": "when"}]),
    ask("when", "when_title", None,
        [field("when", "when"), field("remind", "remind", required=False, label="remind_label")],
        [{"to": "set"}],
        followUp={"type": "value_step", "whenFrom": "when", "when": {"eq": [a("remind"), "yes"]}}),
    handoff("set", "set_title", [{"when": {"eq": [a("remind"), "yes"]}, "key": "set_remind"}, {"when": ALWAYS, "key": "set_line"}],
            [], titleSlots={"step": {"labelOf": "step"}}),
    # --- The value_step card reopens the run here (R9), on a run that reached `when` ---
    ask("back", "back_title", None, [field("happened", "happened", label="happened_label")],
        [{"when": {"eq": [a("happened"), "no"]}, "to": "back_no"}, {"when": {"eq": [a("happened"), "hurt"]}, "to": "back_hurt"},
         {"to": "back_yes"}],
        reopens={"after": "when"}, clears=["happened", "again"], titleSlots={"step": {"labelOf": "step"}}),
    handoff("back_yes", [{"when": {"set": a("focus")}, "key": "back_yes_title"},
                         {"when": {"set": a("focus_kept")}, "key": "back_yes_title_kept"}, {"key": "back_yes_title_own"}],
            [{"when": ALWAYS, "key": "back_yes_line"}], [], no_close=True,
            titleSlots={"focus": {"labelOf": "focus"}, "focus_kept": {"labelOf": "focus_kept"}}),
    handoff("back_hurt", "back_hurt_title", [{"when": ALWAYS, "key": "back_hurt_line"}],
            [{"exit": "recover", "when": ALWAYS}, {"exit": "cool_down", "when": ALWAYS}], no_close=True),
    ask("back_no", "back_no_title", "back_no_hint", [field("again", "again")],
        [{"when": {"eq": [a("again"), "smaller"]}, "to": "step"}, {"to": "back_end"}]),
    handoff("back_end", None, [{"when": ALWAYS, "key": "back_end_line"}], [], no_close=True),
]
COPY["back_yes_title_kept"] = "That was {focus_kept} in action."
COPY["back_end_line"] = "It'll keep. Come back to it any time."

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                  # DT-01 First, the body (flooded; it hurt)
    {"id": "recover", "toolId": "recovering-from-invalidation"},  # Recover (WMP-02): the step went badly
    {"id": "safety_open", "toolId": None, "safety": True},       # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("start", v, label, props, None) for v, label, props in STARTS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("value", v, label, {}, None) for v, label, _ in VALUES]
    out += [("step", v, label, {"value_id": val}, None) for v, label, val in STEPS_FOR + OWN_STEPS]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("happened", v, label, {}, None) for v, label in HAPPENED]
    out += [("again", v, label, {}, None) for v, label in AGAIN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "start", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
