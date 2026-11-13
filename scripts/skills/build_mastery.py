"""Build mastery, the "I can" ladder (ER-11; DBT ER Handout 19, building mastery; the mastery half of behavioural
activation). Spec: docs/design/build-mastery.md.

Steps:
  start      *Get one thing done.* (*Something small enough to finish. Done beats done well.*) *Which part of life?*
             my body, home, making something, learning, work or study, caring for someone or something, admin, or own
             words.
  heads_up   a carried flooded reading: *Your body's loud right now.* The body first or *Try it anyway* (also before
             going back to the ladder from the card).
  rung       *Pick one that's a stretch you can manage today.* (*Pick the next one up.* / *Pick a smaller one.* on the
             way back.) That area's three rungs, easier to harder (an area in their own words gets three general ones),
             or own words. Body, caring and admin each get a note (what the body can do today; caring that's wearing
             them out or someone who hurts them; a letter that could bring bad news).
  when       later today · tomorrow · in a few days; *Want me to ask how it went?* books `mastery_step`.
  set        "Your step: {rung}." (an own-words area: "Your step for {area}: {rung}."). Done beats done well.
  back       the `mastery_step` card reopens the run here (R9): *Earlier you picked: {rung}.* *How did it go?*
  back_done  done: *You did it.*; partly: *Part of it counts.* Keep it on the I can list (`i_can`, not offered for a
             ladder step already there), then the same again, the next one up (done only) or a smaller one (partly
             only), or enough for now.
  back_not   not yet: a real answer. A smaller one (at the bottom rung, smaller in their own words), the same again,
             *Something keeps getting in the way* (Problem Solve), or not now.

Risks (PRD): failure → shame (sized to succeed; no streaks or counts; *not yet* copy); perfectionism (*done beats done
well*). Flooded: not the moment (a heads-up, never a lock).

Departures from the PRD (docs/design/build-mastery.md lists them with the batch that picks each up): the person picks
the next rung or a smaller one each time; part 2's auto-adjust only changes the card's title when the same rung went
the same way on the last card (`$prev`: the previous round's record, which the reopened run reads back anyway; no
chip is pre-picked and nothing is counted); the I can list is kept on a yes, not a view over reps; no
`SkillPractice` rep, weekly *rung up?* card, morning slot or fade.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "build_mastery"
TOOL_ID = "build-mastery"
CONCEPT = "dbt_build_mastery"
VERSION = "bm-v1"
OWN_MAX = 60  # an area or a step in a few words

COPY = {
    "start_title": "Get one thing done.",
    "start_hint": "Something small enough to finish. Done beats done well.",
    "area_label": "Which part of life?",
    "area_own": "Something else",
    # A carried flooded reading: this wants a steadier moment (PRD: flooded → not offered; here a heads-up, no lock).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "This works better once it settles a little.",
    "settle_line": "This will keep. First, the body.",
    "rung_title": "Pick one that's a stretch you can manage today.",
    "rung_up_title": "Pick the next one up.",
    "rung_down_title": "Pick a smaller one.",
    "rung_hint": "They go from easier to harder. Go by what you can do today. Smaller is still mastery.",
    # Area notes (clinical gate): what the body can do today; caring that's wearing them out or someone who hurts them;
    # a letter that could bring bad news.
    "note_body": "Go by what your body can do today.",
    "note_caring": "If caring is already wearing you out, another area may suit today better. If someone there hurts you, this isn't the step.",
    "note_admin": "If something could bring bad news, pick a time with someone around.",
    "rung_own": "My own step",
    "when_title": "When could you do it?",
    "remind_label": "Want me to ask how it went?",
    "set_title": "Your step: {rung}.",
    "set_title_own": "Your step for {area}: {rung}.",
    "set_line": "Done beats done well. Doing part of it counts.",
    "set_remind": "I'll ask how it went. Done beats done well.",
    # The mastery_step card reopens the run here.
    "back_title": "Earlier you picked: {rung}.",
    "back_title_own": "Earlier you picked: {rung}, for {area}.",
    "happened_label": "How did it go?",
    "done_title": "You did it.",
    # PRD auto-adjust: the same rung again after the last card went the same way (the last round read as `$prev`).
    # Done again offers the next one up; not yet again, a smaller one. Offered, never pushed; nothing is counted
    # (no streaks or counts: Gates 2-3), and not yet keeps its validation.
    "done_twice_title": "Done again. The next one up is there if you want it.",
    "done_twice_top_title": "Done again. That counts.",
    "not_twice_title": "Not yet is a real answer. A smaller one may fit better right now.",
    "partly_title": "Part of it counts.",
    "done_hint": "That counts. It's evidence you can do things that feel hard.",
    "ican_label": "Keep this on your \u201cI can\u201d list in Me?",
    "then_label": "What next? No rush.",
    "not_title": "Not yet is a real answer.",
    "not_hint": "Smaller is still mastery. If it keeps not happening, the step may be too big or life too full right now. Neither is a failing.",
    "stuck_title": "Something keeps getting in the way.",
    "stuck_line": "Problem Solve can help find a way round it, or a smaller way in.",
    "keep_primary": "Next",
    "end_kept": "It's on your \u201cI can\u201d list in Me.",
    "end_done": "That's done for now. Come back any time for another.",
    "end_line": "It'll keep. Come back to it any time.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

AREAS = [("body", "My body"), ("home", "Home"), ("making", "Making something"), ("learning", "Learning"),
         ("work", "Work or study"), ("caring", "Caring for someone or something"), ("admin", "Admin and paperwork")]
# Three rungs per area (PRD: MasteryStep easy / medium / harder), each sized to finish today. Nothing names what
# wasn't done; a harder rung is still small.
RUNGS = {
    # Competence, not fitness (clinical gate: nothing that feeds compulsive exercise or fails a body in pain).
    "body": ["Stretch or move gently for two minutes", "Have a shower or get properly dressed",
             "Move in a way that suits my body for ten minutes"],
    # Time-boxed tops can always be finished (no all-or-nothing).
    "home": ["Clear one surface", "Do one load of washing", "Tidy one room for twenty minutes"],
    "making": ["Sketch, write or play for five minutes", "Finish one small thing I've started",
               "Make one small thing from start to end"],
    "learning": ["Read one page about something new", "Watch one short lesson",
                 "Practise a new skill for twenty minutes"],
    "work": ["Open the file I need", "Do the first small part of one task", "Work for twenty-five minutes on one thing"],
    # No more load for someone worn out, and only someone safe.
    "caring": ["Do one small caring thing (a plant, a pet, a person)", "Send one kind message to someone safe",
               "Plan one thing with someone safe"],
    "admin": ["Open one letter", "Reply to one email", "Sort one pile"],
}
# An area in their own words gets three general rungs (own words stay the escape hatch).
OWN_RUNGS = ["Spend five minutes on it", "Do the first small part of it", "Spend twenty minutes on it"]
RUNG_OPTIONS = [(f"{area}_{i + 1}", label, area, i + 1) for area, labels in RUNGS.items() for i, label in enumerate(labels)]
RUNG_OPTIONS += [(f"own_{i + 1}", label, "own", i + 1) for i, label in enumerate(OWN_RUNGS)]

HEADS_UP = [("settle", "Look after the next few minutes first"), ("try", "Try it anyway")]
WHEN = [("today", "Later today"), ("tomorrow", "Tomorrow"), ("few_days", "In a few days")]
REMIND = [("yes", "Yes, ask me"), ("no", "No thanks")]
HAPPENED = [("done", "Done"), ("partly", "Partly"), ("not_yet", "Not yet")]
ICAN = [("yes", "Yes, add it"), ("no", "Not now")]
# After a done or partly: up (never past the harder rung), the same again, or enough for now.
# After a done: the same again first (no rush to go up), then up (never past the top). After a partly: the same, or a
# smaller one (never below the bottom); never up.
THEN = [("same", "The same one again", {}), ("up", "Try the next one up", {"up": True}),
        ("smaller", "Try a smaller one", {"down": True}), ("rest", "That's enough for now", {})]
# Not yet: a smaller one (at the bottom rung, smaller in their own words), the same again, what's in the way, not now.
AGAIN = [("smaller", "Pick a smaller one", {"down": True}), ("smaller_own", "Make it smaller my own way", {"bottom": True}),
         ("same", "Try the same one again", {}), ("stuck", "Something keeps getting in the way", {}), ("not_now", "Not now", {})]

OWN_AREA = {"not": {"set": a("area") + ".ids"}}
FOR_AREA = {"any": [{"eq": ["$opt.area", a("area")]}, {"all": [{"eq": ["$opt.area", "own"]}, OWN_AREA]}]}
# The rung picked, by its place on the ladder (own words: no place, so up and down both stay).
AT_TOP = {"some": ["rung", {"eq": ["$opt.rung", 3]}]}
AT_BOTTOM = {"some": ["rung", {"eq": ["$opt.rung", 1]}]}
DONE = {"eq": [a("happened"), "done"]}
PARTLY = {"eq": [a("happened"), "partly"]}
DONE_OR_PARTLY = {"any": [DONE, PARTLY]}
THEN_WHERE = {"all": [{"not": {"all": [{"eq": ["$opt.up", True]}, {"any": [AT_TOP, PARTLY]}]}},
                      {"not": {"all": [{"eq": ["$opt.down", True]}, {"any": [AT_BOTTOM, DONE]}]}}]}
AGAIN_WHERE = {"all": [{"not": {"all": [{"eq": ["$opt.down", True]}, AT_BOTTOM]}},
                       {"not": {"all": [{"eq": ["$opt.bottom", True]}, {"not": AT_BOTTOM}]}}]}
KEPT = {"eq": [a("ican"), "yes"]}
# The last round (`$prev`: a reopened run's answers before its back step cleared them) went the same way, at the same
# rung: *The same one again* / *Try the same one again* is the only way back to the same rung.
DONE_TWICE = {"all": [DONE, {"eq": ["$prev.happened", "done"]}, {"eq": ["$prev.then", "same"]}]}
NOT_TWICE = {"all": [{"eq": [a("happened"), "not_yet"]}, {"eq": ["$prev.happened", "not_yet"]}, {"eq": ["$prev.again", "same"]}]}
# A ladder step already on the I can list isn't offered for keeping twice (an own-words step always is).
NOT_ON_LIST = {"not": {"has": ["$p.iCanRungs.ids", a("rung")]}}
# Back to the ladder: a carried flooded reading gets the heads-up first, as on a first visit.
TO_LADDER = [{"when": FLOODED, "to": "heads_up"}, {"to": "rung"}]


def ask(sid, title, hint, fields, nxt, **extra):
    # *Talk to someone now* on every screen: an ask step's links live on a field, the last, so they sit below the form.
    fields = [*fields[:-1], {**fields[-1], "links": [SAFETY_LINK]}]
    s = {"id": sid, "kind": "ask", "title": title, "fields": fields, "next": nxt, **extra}
    if hint:
        s["hint"] = hint
    return s


def field(fid, lst, *, mx=1, required=True, own=None, where=None, **extra):
    opts = {"list": lst, **({"where": where} if where else {})}
    f = {"id": fid, "options": opts, "max": mx, "required": required, **extra}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True, "max": OWN_MAX}
    return f


def note(area):
    # An area's note: a label only, shown when that area was picked (no options of its own).
    return field(f"note_{area}", "rung", required=False, where={"any": []}, label=f"note_{area}",
                 showWhen={"eq": [a("area"), area]})


def handoff(sid, title, lines, offers, *, no_close=False, **extra):
    s = {"id": sid, "kind": "handoff", "complete": True, "title": title, "lines": lines, "offers": offers,
         "done": "done", "next": [], "links": [SAFETY_LINK], **extra}
    if no_close:
        s["noClose"] = True
    return s


STEPS = [
    ask("start", "start_title", "start_hint", [field("area", "area", own="area_own", label="area_label")],
        [{"when": FLOODED, "to": "heads_up"}, {"to": "rung"}]),
    ask("heads_up", "heads_up_title", "heads_up_hint", [field("heads_up", "heads_up")],
        [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, {"to": "rung"}]),
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}],
            no_close=True),
    # A rung picked again (up, smaller or the same) starts fresh: last time's rung, when and reminder don't stand in.
    ask("rung", [{"when": {"eq": [a("then"), "up"]}, "key": "rung_up_title"},
                 {"when": {"any": [{"eq": [a("then"), "smaller"]}, {"eq": [a("again"), "smaller"]}]}, "key": "rung_down_title"},
                 {"key": "rung_title"}], "rung_hint",
        [note("body"), note("caring"), note("admin"), field("rung", "rung", own="rung_own", where=FOR_AREA)],
        [{"to": "when"}], clears=["rung", "when", "remind"]),
    ask("when", "when_title", None,
        [field("when", "when"), field("remind", "remind", required=False, label="remind_label")],
        [{"to": "set"}],
        clears=["when", "remind"],
        followUp={"type": "mastery_step", "whenFrom": "when", "when": {"eq": [a("remind"), "yes"]}}),
    handoff("set", [{"when": OWN_AREA, "key": "set_title_own"}, {"key": "set_title"}], [{"when": {"eq": [a("remind"), "yes"]}, "key": "set_remind"}, {"when": ALWAYS, "key": "set_line"}],
            [], titleSlots={"rung": {"labelOf": "rung"}, "area": {"labelOf": "area"}}),
    # --- The mastery_step card reopens the run here (R9), on a run that reached `when` ---
    ask("back", [{"when": OWN_AREA, "key": "back_title_own"}, {"key": "back_title"}], None, [field("happened", "happened", label="happened_label")],
        [{"when": DONE_OR_PARTLY, "to": "back_done"}, {"to": "back_not"}],
        reopens={"after": "when"}, clears=["happened", "ican", "then", "again"],
        titleSlots={"rung": {"labelOf": "rung"}, "area": {"labelOf": "area"}}),
    # Done or partly: the I can list on a yes (R4 keep, the rung's id or own words), then what next.
    ask("back_done", [{"when": {"all": [DONE_TWICE, AT_TOP]}, "key": "done_twice_top_title"},
                      {"when": DONE_TWICE, "key": "done_twice_title"},
                      {"when": {"eq": [a("happened"), "partly"]}, "key": "partly_title"}, {"key": "done_title"}],
        "done_hint",
        [field("ican", "ican", label="ican_label", required=False, showWhen=NOT_ON_LIST),
         field("then", "then", where=THEN_WHERE, label="then_label")],
        [*[{**t, "when": {"all": [{"any": [{"eq": [a("then"), "up"]}, {"eq": [a("then"), "smaller"]}]}, *([t["when"]] if "when" in t else [])]}}
           for t in TO_LADDER],
         {"when": {"eq": [a("then"), "same"]}, "to": "when"}, {"to": "back_end"}],
        # The yes is the *Yes, add it* chip (as Good things' *Add it*); the button goes on. The typed area comes along,
        # so a general step ("Spend five minutes on it") still says what it was.
        keep={"kind": "i_can", "many": True, "when": KEPT, "from": ["area", "rung"]}, primary="keep_primary"),
    ask("back_not", [{"when": NOT_TWICE, "key": "not_twice_title"}, {"key": "not_title"}], "not_hint", [field("again", "again", where=AGAIN_WHERE)],
        [*[{**t, "when": {"all": [{"any": [{"eq": [a("again"), "smaller"]}, {"eq": [a("again"), "smaller_own"]}]}, *([t["when"]] if "when" in t else [])]}}
           for t in TO_LADDER],
         {"when": {"eq": [a("again"), "same"]}, "to": "when"}, {"when": {"eq": [a("again"), "stuck"]}, "to": "back_stuck"},
         {"to": "back_end"}]),
    handoff("back_stuck", "stuck_title", [{"when": ALWAYS, "key": "stuck_line"}], [{"exit": "problem_solve", "when": ALWAYS}],
            no_close=True),
    handoff("back_end", None, [{"when": KEPT, "key": "end_kept"}, {"when": DONE_OR_PARTLY, "key": "end_done"},
                               {"when": ALWAYS, "key": "end_line"}], [], no_close=True),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},             # DT-01 First, the body (flooded)
    {"id": "problem_solve", "toolId": "problem-solve"},     # ER-12: something keeps getting in the way
    {"id": "safety_open", "toolId": None, "safety": True},  # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("area", v, label, {}, None) for v, label in AREAS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("rung", v, label, {"area": area, "rung": n}, None) for v, label, area, n in RUNG_OPTIONS]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("happened", v, label, {}, None) for v, label in HAPPENED]
    out += [("ican", v, label, {}, None) for v, label in ICAN]
    out += [("then", v, label, props, None) for v, label, props in THEN]
    out += [("again", v, label, props, None) for v, label, props in AGAIN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "start", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
