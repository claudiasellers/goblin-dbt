"""Build mastery, the "I can" ladder (ER-11; DBT ER Handout 19, building mastery; the mastery half of behavioural
activation). Spec: docs/design/build-mastery.md.

Steps:
  start      *Get one thing done.* (*Small enough to finish. Done beats done well.*) Which part of life: body, home,
             making something, learning, work or study, caring for someone, admin, or own words.
  heads_up   a carried flooded reading: this wants a steadier moment; the body first or *Try it anyway*.
  rung       *Pick one that's a stretch you can manage today.* That area's three rungs (easy, medium, harder; an area in their
             own words gets three general ones), or own words. *Smaller is still mastery.*
  when       later today · tomorrow · in a few days; *Want me to ask how it went?* books `mastery_step`.
  set        "Your step: {rung}." Done beats done well; doing part of it counts.
  back       the `mastery_step` card reopens the run here (R9): *Earlier you picked: {rung}.* *How did it go?*
  back_done  done / partly: *You did it.* or *Part of it counts.* Add it to the I can list (`i_can`), then the next
             rung up, the same one again, or that's enough for now.
  back_not   not yet: a real answer. A smaller one (*smaller is still mastery*), the same one again, or not now.

Risks (PRD): failure → shame (sized to succeed; no streaks or counts; *not yet* copy); perfectionism (*done beats done
well*). Flooded: not the moment (a heads-up, never a lock).

Departures from the PRD (docs/design/build-mastery.md lists them with the batch that picks each up): the person picks
the next rung or a smaller one each time (no automatic *done twice → up*, which reads past visits); the I can list is
kept on a yes, not a view over reps; no `SkillPractice` rep, weekly *rung up?* card, morning slot or fade.

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
    "settle_line": "This will keep. Look after the next few minutes first.",
    "rung_title": "Pick one that's a stretch you can manage today.",
    "rung_hint": "They go from easier to harder. Smaller is still mastery.",
    "rung_own": "My own step",
    "when_title": "When could you do it?",
    "remind_label": "Want me to ask how it went?",
    "set_title": "Your step: {rung}.",
    "set_line": "Done beats done well. Doing part of it counts.",
    "set_remind": "I'll ask how it went. Doing part of it counts.",
    # The mastery_step card reopens the run here.
    "back_title": "Earlier you picked: {rung}.",
    "happened_label": "How did it go?",
    "done_title": "You did it.",
    "partly_title": "Part of it counts.",
    "done_hint": "That's evidence you can do hard things.",
    "ican_label": "Add it to your I can list?",
    "then_label": "What next?",
    "not_title": "Not yet is a real answer.",
    "not_hint": "Smaller is still mastery.",
    "keep_primary": "Next",
    "end_kept": "It's on your I can list in Me.",
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
         ("work", "Work or study"), ("caring", "Caring for someone"), ("admin", "Admin and paperwork")]
# Three rungs per area (PRD: MasteryStep easy / medium / harder), each sized to finish today. Nothing names what
# wasn't done; a harder rung is still small.
RUNGS = {
    "body": ["Stretch for two minutes", "Walk around the block", "Do twenty minutes of something active"],
    "home": ["Clear one surface", "Do one load of washing", "Tidy one whole room"],
    "making": ["Sketch, write or play for five minutes", "Finish one small thing I've started",
               "Make something new from start to end"],
    "learning": ["Read one page about something new", "Watch one short lesson",
                 "Practise a new skill for twenty minutes"],
    "work": ["Open the file I need", "Do the first small part of one task", "Work for twenty-five minutes on one thing"],
    "caring": ["Send one kind message", "Do one small thing for someone I look after",
               "Plan one thing with or for someone"],
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
THEN = [("up", "Try the next one up", {"up": True}), ("same", "The same one again", {}), ("rest", "That's enough for now", {})]
AGAIN = [("smaller", "Pick a smaller one", {"down": True}), ("same", "Try the same one again", {}), ("not_now", "Not now", {})]

OWN_AREA = {"not": {"set": a("area") + ".ids"}}
FOR_AREA = {"any": [{"eq": ["$opt.area", a("area")]}, {"all": [{"eq": ["$opt.area", "own"]}, OWN_AREA]}]}
# The rung picked, by its place on the ladder (own words: no place, so up and down both stay).
AT_TOP = {"some": ["rung", {"eq": ["$opt.rung", 3]}]}
AT_BOTTOM = {"some": ["rung", {"eq": ["$opt.rung", 1]}]}
THEN_WHERE = {"not": {"all": [{"eq": ["$opt.up", True]}, AT_TOP]}}
AGAIN_WHERE = {"not": {"all": [{"eq": ["$opt.down", True]}, AT_BOTTOM]}}
DONE_OR_PARTLY = {"any": [{"eq": [a("happened"), "done"]}, {"eq": [a("happened"), "partly"]}]}
KEPT = {"eq": [a("ican"), "yes"]}


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
    ask("rung", "rung_title", "rung_hint", [field("rung", "rung", own="rung_own", where=FOR_AREA)], [{"to": "when"}],
        clears=["rung", "when", "remind"]),
    ask("when", "when_title", None,
        [field("when", "when"), field("remind", "remind", required=False, label="remind_label")],
        [{"to": "set"}],
        clears=["when", "remind"],
        followUp={"type": "mastery_step", "whenFrom": "when", "when": {"eq": [a("remind"), "yes"]}}),
    handoff("set", "set_title", [{"when": {"eq": [a("remind"), "yes"]}, "key": "set_remind"}, {"when": ALWAYS, "key": "set_line"}],
            [], titleSlots={"rung": {"labelOf": "rung"}}),
    # --- The mastery_step card reopens the run here (R9), on a run that reached `when` ---
    ask("back", "back_title", None, [field("happened", "happened", label="happened_label")],
        [{"when": DONE_OR_PARTLY, "to": "back_done"}, {"to": "back_not"}],
        reopens={"after": "when"}, clears=["happened", "ican", "then", "again"], titleSlots={"rung": {"labelOf": "rung"}}),
    # Done or partly: the I can list on a yes (R4 keep, the rung's id or own words), then what next.
    ask("back_done", [{"when": {"eq": [a("happened"), "partly"]}, "key": "partly_title"}, {"key": "done_title"}],
        "done_hint",
        [field("ican", "ican", label="ican_label"), field("then", "then", where=THEN_WHERE, label="then_label")],
        [{"when": {"eq": [a("then"), "up"]}, "to": "rung"}, {"when": {"eq": [a("then"), "same"]}, "to": "when"},
         {"to": "back_end"}],
        # The yes is the *Yes, add it* chip (as Good things' *Add it*); the button goes on.
        keep={"kind": "i_can", "many": True, "when": KEPT, "from": ["rung"]}, primary="keep_primary"),
    ask("back_not", "not_title", "not_hint", [field("again", "again", where=AGAIN_WHERE)],
        [{"when": {"eq": [a("again"), "smaller"]}, "to": "rung"}, {"when": {"eq": [a("again"), "same"]}, "to": "when"},
         {"to": "back_end"}]),
    handoff("back_end", None, [{"when": KEPT, "key": "end_kept"}, {"when": ALWAYS, "key": "end_line"}], [], no_close=True),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},             # DT-01 First, the body (flooded)
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
