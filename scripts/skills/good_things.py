"""Good things (ER-04; accumulating positive emotions, DBT ER Handouts 15–16; savouring, Bryant & Veroff 2007;
behavioural activation) as a skill on the runtime. Part 1 of ER-04: PRD levels 0 and 1 and the start of the
"things I like" directory.

The editable source. The flow is PRD ER-04 (Claudia's vault, "DBT Module PRDs/PRD – Emotion Regulation.md"; copy
in /mnt/project-files/handoffs/prds/): low energy, nothing sounds good, the sense of self all negative. Neutral
attention graduates into positive attention, then into doing and planning good things, and what was good is kept
in a directory of things I like, built slowly.

  start      where to start: *Find one okay thing around me* (level 0) or *Pick one good thing for today*
             (level 1). From a pleasant check-in (`?frame=savour`, the positive-state result's *Keep this one*)
             the first choice is *Stay with this good moment*.
  heads_up   a carried flooded reading: good things land better once the body settles (PRD: not for flooded).
             First, the body, or try anyway.
  find       level 0: one thing that's even a little okay, eyes open (`orientFind`, one find).
  stay       the savour: three breaths' worth, 15 s (`holdRing`, timed; no breath instruction).
  name       what it was (*a colour · something soft · a sound · a taste · a view · a person · a pet*, or a
             few words), and *Keep it in Things I like* keeps `thing_i_like` (R4); *Not this time* keeps nothing.
  energy     level 1: how much there is to give (*hardly any · a little · some*), which filters the list.
  pick       one good thing: the person's own things I like first (R3, `thingsILike`), then the catalogue for
             that energy, or own words. The hint carries the anhedonia line ("If nothing sounds good, that's
             part of feeling low").
  when       now, this afternoon, this evening or tomorrow; *Ask me how it went?* books `good_thing` at that
             time (now: an hour from now).
  set        "Your good thing: {pick}."
  back       the `good_thing` card reopens the run here (R9): *Did it happen?*
  after      compared to before (*lighter · about the same · heavier*) and where the mind was (*mostly here ·
             partly · somewhere else*: being unmindful of worries, H16).
  keep_more  lighter, and a listed pick that isn't already kept (never own words): *Add it to things you like?*
  after_end  "You did it." Heavier: "That happens sometimes. It isn't a sign you did it wrong." with First, the body
             and Running low; else "Enjoying it comes later. Doing it is the rep." when it wasn't lighter.

Departures from the PRD (docs/design/good-things.md lists them with the batch that picks each up): no graduation
rule (every level is a choice from the start, level 0 first; counting reps needs a server read); level 2 (plan the
week) is three plan steps, a `good_week_<n>` card each reopening `back_w<n>` (no `weekPlanner` embed); level 3 (the directory as a mirror, the monthly card) are part 2; `timesDone` /
`lighterCount` on a kept thing wait for part 2's yes; the catalogue is this skill's options (graph content through
skills.cypher, each with its `energy`), not `PleasantActivity` nodes with `GOOD_FOR` edges; three shown with
*show others* is one short list per energy; `micro-win` stays the low-energy result's guided activity.

Safety (plan C6): *Talk to someone now* on every screen. No food, drink, shopping or scrolling in the catalogue
(impulsive pleasures are out, PRD); no "be grateful", no streaks, nothing negative about what wasn't done.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "good_things"
TOOL_ID = "good-things"
CONCEPT = "dbt_accumulate_positives"
VERSION = "gt-v1"
OWN_MAX = 40  # a thing I like, a good thing to do: a few words

COPY = {
    "start_title": "Where do you want to start?",
    "start_title_savour": "Where do you want to start?",
    "start_hint": "A minute is enough.",
    # A carried flooded reading (PRD: not for flooded; that's DT's distraction).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "Good things land better once it settles a little.",
    "settle_line": "This will keep. Look after the next few minutes first.",
    # Level 0 (PRD: find one okay thing, eyes open).
    "find_title": "Look around.",
    "here": "You're here, and it's",
    "find_task": "Find one thing that's even a little okay: a colour you like, something soft, a sound, a window. Cold water or something sour counts too.",
    "find_found": "Found one",
    "find_done": "That's the one.",
    # The savour (PRD: "Stay with it for three breaths", a 15 s hold, no breath instruction).
    "stay_title": "Stay with it for a few seconds. Notice one thing you like about it.",
    "stay_title_savour": "Stay with what's good for a few seconds. Notice one thing you like about it.",
    "stay_label": "Start",
    "stay_running": "Staying with it",
    "stay_hint": "Let your eyes rest on it, or keep it in mind. Notice one thing you like about it. Let it be as big as it is; it doesn't have to last.",
    "stay_done": "You noticed it. That counts.",
    "name_title": "What was it?",
    "name_hint": "Pick the closest, or name it in a few words.",
    "name_own": "Name it",
    "keepit_label": "Add it to Things I like?",
    "name_end_kept": "It's in Things I like. A list like that grows slowly, one thing at a time.",
    "name_end": "You found one. Noticing it is the practice.",
    # Level 1 (PRD: one good thing today).
    "energy_title": "How much energy have you got right now?",
    "energy_hint": "Any answer works. There's something for each.",
    "pick_title": "Pick one good thing.",
    # The anhedonia line (PRD risks: validation first; no "be grateful").
    "pick_hint": "If nothing sounds good, that's part of feeling low. Pick the one that sounds least bad.",
    "pick_own": "Something else",
    "when_title": "When will you do it?",
    "remind_label": "Want me to ask how it went?",
    "set_title": "Your good thing: {pick}.",
    "set_remind": "I'll ask how it went. Doing it counts, whether or not you enjoy it.",
    "set_line": "Doing it counts, whether or not you enjoy it.",
    # The good_thing card reopens the run here.
    "back_title": "Earlier you picked: {pick}.",
    "happened_label": "Did it happen?",
    "after_title": "Compared to before, how are you?",
    "mind_label": "Was your mind mostly here, or somewhere else?",
    "keep_more_title": "Add it to Things I like?",
    "keep_more_hint": "Things that helped once are worth finding again.",
    "after_end_title": "You gave it a go.",
    "name_end_title": "Found one.",
    "after_kept": "It's in Things I like.",
    "after_lighter": "Something lifted. That's worth noticing.",
    # PRD: *Didn't enjoy it* is data, with this line (reps, not feelings).
    "after_flat": "Enjoying it comes later. Doing it is the rep.",
    # H16: being unmindful of worries.
    "after_mind": "If 'it won't last' or 'I don't deserve this' shows up next time, notice it and come back to what you're doing. That's part of the skill.",
    # Heavier after trying: no blame, and somewhere to go (the body, Running low, someone to talk to).
    "after_heavier": "That happens sometimes. It isn't a sign you did it wrong.",
    "no_title": "That's okay.",
    "no_line": "A smaller one tomorrow still counts.",
    "no_low": "If energy's been low for a while, Running low looks at sleep, food and the body.",
    # Level 2 (PRD: plan good things for the week, one card each, the best ten seconds pictured).
    "week_title_1": "Pick a good thing for this week.",
    "week_title_2": "And another?",
    "week_title_3": "One more?",
    "week_hint": "Your own things are first. Pick something you'd actually do.",
    "day_label": "Which day?",
    "more_label": "Another one?",
    "picture_title": "Pick one of them. Picture the best ten seconds of it.",
    "picture_label": "Start",
    "picture_running": "Picturing it",
    "picture_hint": "Where you are, what you can see and hear, the bit you'd like most.",
    "picture_done": "That's the bit to look forward to.",
    "week_set_title_1": "Your good thing this week: {wk1}.",
    "week_set_title_2": "Your good things this week: {wk1}, and {wk2}.",
    "week_set_title_3": "Your good things this week: {wk1}, {wk2}, and {wk3}.",
    "week_set_line": "I'll check in on each day, in the evening. Doing it counts, whether or not you enjoy it.",
    "back_w_title": "Your good thing for today: {pick}.",
    "keep_primary": "Next",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
    # A kept thing with nothing to call it (R3), or one set aside since the visit (the back card's title).
    "profile_unnamed": "something you like",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAVOUR = {"eq": ["$ctx.frame", "savour"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
KEPT = {"eq": [a("keepit"), "keep"]}
LIGHTER = {"eq": [a("compared"), "lighter"]}
HEAVIER = {"eq": [a("compared"), "heavier"]}
# A pick from Things I like, or a catalogue thing kept before, is already kept: never offered again.
FROM_KEPT = {"any": [{"has": ["$p.thingsILike.ids", a("pick")]}, {"has": ["$p.thingsILikePicks.ids", a("pick")]}]}
# A catalogue thing already kept shows once, as the person's own (first), not again in the catalogue.
NOT_KEPT = {"not": {"has": ["$p.thingsILikePicks.ids", "$opt.value"]}}
KEPT_MORE = {"any": [{"eq": [a(f), "keep"]} for f in ("keep_more", "km1", "km2", "km3")]}

# Where to start. `savour` only from a pleasant check-in (`frames`), first.
STARTS = [
    ("savour", "Stay with this good moment", {"savour": True}),
    ("find", "Find one okay thing around me", {}),
    ("one", "Pick one good thing for today", {}),
    ("week", "Plan a few for this week", {}),
]
HEADS_UP = [("settle", "Look after the next few minutes first"), ("try", "Try it anyway")]
# What it was (PRD level 0's chip labels), read in Things I like as the item's name when there are no own words.
KINDS = [
    ("moment", "A moment, or how I felt", {"savour": True}),
    ("colour", "A colour"),
    ("texture", "Something soft or comfortable"),
    ("sound", "A sound"),
    ("taste", "A taste or smell"),
    ("view", "A view"),
    ("person", "A person"),
    ("pet", "An animal"),
]
KEEPIT = [("keep", "Keep it"), ("not_now", "Not this time")]
ENERGY = [("none", "Hardly any"), ("little", "A little"), ("some", "Some")]
# The catalogue (paraphrasing H16's range, no verbatim list; PRD: no impulsive pleasures). `energy` is the least
# it takes: hardly any (sitting or lying down), a little (getting up), some (going out, or someone else).
ACTIVITIES = [
    ("song", "Put on a song you like", "none"),
    ("sun", "Sit by a window, or in a patch of sun", "none"),
    ("photos", "Look at a photo of a place or a day you liked", "none"),
    ("laugh", "Watch one clip that's made you laugh before", "none"),
    ("scent", "Smell something you like: soap, coffee, a candle", "none"),
    ("curious", "Read about something you're curious about, for ten minutes", "little"),
    ("warm", "A warm shower or bath", "little"),
    ("animal", "Spend a few minutes with an animal", "little"),
    ("message", "Send a message to someone you like", "little"),
    ("outside", "Step outside for five minutes", "little"),
    ("make", "Make something for ten minutes", "little"),
    ("read", "Read a few pages of something you enjoy", "little"),
    ("plant", "Water a plant, or stand in a garden", "little"),
    ("walk", "A short walk somewhere you like", "some"),
    ("dance", "Dance to one song", "some"),
    ("see", "Call or see someone you're easy with", "some"),
    ("place", "Go somewhere you like being: a park, a library, a bench", "some"),
]
# Hardly any shows the none ones; a little adds a little; some shows them all.
ENERGY_OK = {"none": ["none"], "little": ["none", "little"], "some": ["none", "little", "some"]}
FITS_ENERGY = {"any": [{"all": [{"eq": [a("energy"), e]}, {"in": ["$opt.energy", ok]}]} for e, ok in ENERGY_OK.items()]}
# The good_thing card's chips: when = the chip id (now → an hour from now).
WHEN = [("hour", "Now"), ("afternoon", "This afternoon"), ("evening", "This evening"), ("tomorrow", "Tomorrow")]
REMIND = [("yes", "Yes, ask me"), ("no", "No thanks")]
HAPPENED = [("yes", "Yes"), ("partly", "Partly"), ("no", "Not today")]
COMPARED = [("lighter", "Lighter"), ("same", "About the same"), ("heavier", "Heavier")]
MIND = [("here", "Mostly here"), ("partly", "Partly"), ("elsewhere", "Somewhere else")]
KEEP_MORE = [("keep", "Add it"), ("not_now", "Not this time")]
# Level 2: the good_week_<n> cards' chips, the evening of that day.
DAYS = [("tomorrow", "Tomorrow"), ("day_after", "The day after"), ("few_days", "In a few days"), ("this_week", "Later this week")]
MORE = [("more", "Add another"), ("enough", "That's enough for now")]
SLOTS = (1, 2, 3)
# Every review answer, cleared by each card's step: a reopened run is one round, about one good thing.
REVIEW = ["happened", "compared", "mind", "keep_more", *[f"hap{n}" for n in SLOTS], *[f"km{n}" for n in SLOTS]]


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


# What it was: *A moment, or how I felt* only when staying with a good moment.
FROM_SAVOUR = {"any": [{"not": {"eq": ["$opt.savour", True]}}, {"eq": [a("start"), "savour"]}]}

BY_START = [{"when": {"eq": [a("start"), "savour"]}, "to": "stay"}, {"when": {"eq": [a("start"), "find"]}, "to": "find"},
            {"when": {"eq": [a("start"), "week"]}, "to": "week_1"}, {"to": "energy"}]


def kept_already(f):
    """A pick from Things I like, or a catalogue thing kept before."""
    return {"any": [{"has": ["$p.thingsILike.ids", a(f)]}, {"has": ["$p.thingsILikePicks.ids", a(f)]}]}


def week_step(n):
    # One good thing and its day; the step books that day's card (always: the card is the plan). Never one picked
    # in an earlier slot.
    earlier = [{"not": {"has": [f"$a.wk{m}.ids", "$opt.value"]}} for m in SLOTS if m < n]
    fields = [field(f"wk{n}", "activity", own="pick_own", where={"all": [NOT_KEPT, *earlier]}, profile="thingsILike"),
              field(f"day{n}", "day", label="day_label")]
    if n < 3:
        fields.append(field(f"more{n}", "more", label="more_label"))
    nxt = [{"when": {"eq": [a(f"more{n}"), "more"]}, "to": f"week_{n + 1}"}] if n < 3 else []
    return ask(f"week_{n}", f"week_title_{n}", "week_hint" if n == 1 else None, fields, [*nxt, {"to": "picture"}],
               followUp={"type": f"good_week_{n}", "whenFrom": f"day{n}"})


def back_week(n):
    # The good_week_<n> card reopens the run here (R9), on a run that planned slot n.
    return ask(f"back_w{n}", "back_w_title", None, [field(f"hap{n}", "happened", label="happened_label")],
               [{"when": {"eq": [a(f"hap{n}"), "no"]}, "to": "not_today"}, {"to": "after"}],
               reopens={"after": f"week_{n}"}, clears=REVIEW, titleSlots={"pick": {"labelOf": f"wk{n}"}})


def keep_more_week(n):
    return ask(f"keep_more_w{n}", "keep_more_title", "keep_more_hint", [field(f"km{n}", "keep_more")], [{"to": "after_end"}],
               keep={"kind": "thing_i_like", "many": True, "when": {"eq": [a(f"km{n}"), "keep"]}, "from": [f"wk{n}"]},
               primary="keep_primary")

STEPS = [
    ask("start", [{"when": SAVOUR, "key": "start_title_savour"}, {"key": "start_title"}], "start_hint",
        [field("start", "start", where={"any": [{"not": {"eq": ["$opt.savour", True]}}, SAVOUR]})],
        [{"when": FLOODED, "to": "heads_up"}, *BY_START]),
    ask("heads_up", "heads_up_title", "heads_up_hint", [field("heads_up", "heads_up")],
        [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, *BY_START]),
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}],
            no_close=True),
    # --- Level 0: find one okay thing, then stay with it ---
    {"id": "find", "kind": "embed", "embed": "orientFind", "answerAs": "find", "title": "find_title",
     "props": {"variant": "find", "count": 1, "here": "here", "task": "find_task", "foundLabel": "find_found",
               "done": "find_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "stay"}]},
    {"id": "stay", "kind": "embed", "embed": "holdRing", "answerAs": "stay",
     "title": [{"when": {"eq": [a("start"), "savour"]}, "key": "stay_title_savour"}, {"key": "stay_title"}],
     "props": {"variant": "timed", "seconds": 15, "label": "stay_label", "runningLabel": "stay_running",
               "hint": "stay_hint", "doneLabel": "stay_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "name"}]},
    # Keep (R4) on *Keep it*: that tap is the yes (C2.2).
    ask("name", "name_title", "name_hint",
        [field("kind", "kind", own="name_own", where=FROM_SAVOUR),
         field("keepit", "keepit", label="keepit_label")],
        [{"to": "name_end"}],
        keep={"kind": "thing_i_like", "many": True, "when": KEPT, "from": ["kind"]}, primary="keep_primary"),
    handoff("name_end", "name_end_title", [{"when": KEPT, "key": "name_end_kept"}, {"when": ALWAYS, "key": "name_end"}], []),
    # --- Level 1: one good thing today ---
    ask("energy", "energy_title", "energy_hint", [field("energy", "energy")], [{"to": "pick"}]),
    ask("pick", "pick_title", "pick_hint",
        [field("pick", "activity", own="pick_own", where={"all": [FITS_ENERGY, NOT_KEPT]}, profile="thingsILike")], [{"to": "when"}]),
    ask("when", "when_title", None,
        [field("when", "when"), field("remind", "remind", required=False, label="remind_label")],
        [{"to": "set"}],
        followUp={"type": "good_thing", "whenFrom": "when", "when": {"eq": [a("remind"), "yes"]}}),
    handoff("set", "set_title", [{"when": {"eq": [a("remind"), "yes"]}, "key": "set_remind"}, {"when": ALWAYS, "key": "set_line"}],
            [], titleSlots={"pick": {"labelOf": "pick"}}),
    # --- Level 2: plan the week, up to three good things, a card each ---
    *[week_step(n) for n in SLOTS],
    {"id": "picture", "kind": "embed", "embed": "holdRing", "answerAs": "picture", "title": "picture_title",
     "props": {"variant": "timed", "seconds": 10, "label": "picture_label", "runningLabel": "picture_running",
               "hint": "picture_hint", "doneLabel": "picture_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "week_set"}]},
    handoff("week_set", [{"when": {"set": a("wk3")}, "key": "week_set_title_3"}, {"when": {"set": a("wk2")}, "key": "week_set_title_2"},
                         {"key": "week_set_title_1"}],
            [{"when": ALWAYS, "key": "week_set_line"}], [],
            titleSlots={f"wk{n}": {"labelOf": f"wk{n}"} for n in SLOTS}),
    *[back_week(n) for n in SLOTS],
    *[keep_more_week(n) for n in SLOTS],
    # --- The good_thing card reopens the run here (R9), on a run that reached `when` ---
    ask("back", "back_title", None, [field("happened", "happened", label="happened_label")],
        [{"when": {"eq": [a("happened"), "no"]}, "to": "not_today"}, {"to": "after"}],
        reopens={"after": "when"}, clears=REVIEW,
        titleSlots={"pick": {"labelOf": "pick"}}),
    ask("after", "after_title", None,
        [field("compared", "compared"), field("mind", "mind", required=False, label="mind_label")],
        # Not for own words until CORE's target behaviours can check them (an own pick could be anything).
        [{"when": {"all": [LIGHTER, {"set": a("happened")}, {"set": a("pick") + ".ids"}, {"not": FROM_KEPT}]}, "to": "keep_more"},
         # The week's: the card's slot is the one whose answer is set (each card's step clears the others').
         *[{"when": {"all": [LIGHTER, {"set": a(f"hap{n}")}, {"set": a(f"wk{n}") + ".ids"}, {"not": kept_already(f"wk{n}")}]},
            "to": f"keep_more_w{n}"} for n in SLOTS],
         {"to": "after_end"}]),
    ask("keep_more", "keep_more_title", "keep_more_hint", [field("keep_more", "keep_more")], [{"to": "after_end"}],
        keep={"kind": "thing_i_like", "many": True, "when": KEPT_MORE, "from": ["pick"]}, primary="keep_primary"),
    handoff("after_end", "after_end_title", [
        {"when": KEPT_MORE, "key": "after_kept"},
        {"when": HEAVIER, "key": "after_heavier"},
        {"when": {"eq": [a("mind"), "elsewhere"]}, "key": "after_mind"},
        {"when": LIGHTER, "key": "after_lighter"},
        {"when": ALWAYS, "key": "after_flat"},
    ], [{"exit": "cool_down", "when": HEAVIER}, {"exit": "please_skill", "when": HEAVIER}], no_close=True),
    handoff("not_today", "no_title", [{"when": ALWAYS, "key": "no_line"}, {"when": ALWAYS, "key": "no_low"}], [{"exit": "please_skill", "when": ALWAYS}],
            no_close=True),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                  # DT-01 First, the body (flooded)
    {"id": "please_skill", "toolId": "please-skill"},            # ER-07 Running low (not today: the body may be part of it)
    {"id": "safety_open", "toolId": None, "safety": True},       # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("start", v, label, props, None) for v, label, props in STARTS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("kind", k[0], k[1], k[2] if len(k) > 2 else {}, None) for k in KINDS]
    out += [("keepit", v, label, {}, None) for v, label in KEEPIT]
    out += [("energy", v, label, {}, None) for v, label in ENERGY]
    out += [("activity", v, label, {"energy": e}, None) for v, label, e in ACTIVITIES]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("happened", v, label, {}, None) for v, label in HAPPENED]
    out += [("compared", v, label, {}, None) for v, label in COMPARED]
    out += [("mind", v, label, {}, None) for v, label in MIND]
    out += [("keep_more", v, label, {}, None) for v, label in KEEP_MORE]
    out += [("day", v, label, {}, None) for v, label in DAYS]
    out += [("more", v, label, {}, None) for v, label in MORE]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "start", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first. frame: `savour` from a pleasant check-in.
    "accepts": ["band", "frame"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
