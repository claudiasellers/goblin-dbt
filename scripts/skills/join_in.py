"""Join in (MF-10 participate; DBT Mindfulness Handouts 4, 4c, Linehan 2015), as a skill on the runtime.

The editable source. The flow is PRD MF-10 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): self-conscious
watching of yourself, and blank states where observing fails because nothing registers. Participate asks for full
engagement, which needs no words; its endpoint is doing a thing without narrating it. The design note is
docs/design/join-in.md (what part 1 defers, the somatic rhythm engine among it, and where it departs from the PRD).

Steps:
  pick      *Pick something to throw yourself into.* move to a song · sing or hum along · tap a rhythm · a game with
            someone · a chore with music · something of my own (no words asked). A blank frame (Notice what's here's
            blank branch, Doing mind's drifting) says the beat is a bit faster. Not offered (PRD capacity branching) to
            a carried flooded reading (DT first) or a carried anger word (arousal-raising activity doesn't bring anger
            down: Kjærvik & Bushman 2024): the title says so (*This one turns things up.*), *Bring it down first* is
            the one chip, and the next card (`gate_end`, no rep) offers *My body first* (First, the body) and
            *Something slower: listen for a minute* (Notice what's here). Never a pick that turns things up for those
            two. No entry carries the check-in's words yet, so *I'm wound up or angry right now* is a seventh chip
            that goes to the same card.
  play      the `beatPulse` embed for the three on-phone picks: a pulse at a steady tempo, a big tap target to tap along
            (optional, never counted on screen), sound off until the person turns it on (MF rule 8), the one
            instruction: *Throw yourself in. When you catch yourself watching yourself, drop back in.* A minute at an
            easy tempo; a carried stirred reading gets a moderate one (`play_calm`); a blank frame gets short rounds
            at a quicker one with a settle between (`play_blank`, `settle`, `play_blank2`: the somatic dose cap; *Move on*
            before the second round counts the first).
  away      the off-phone picks: the same instruction, *Put the phone down. Come back when you're done.*, *I'm back*.
  with      *How much were you in it?* in it · half in · watching myself, all answered plainly (*Watching yourself is
            the thing you practise dropping.*).
  end       *Next time, with someone?* (optional chips) books `join_in_social`, which reopens the run at *Did you get to
            join in at something with someone?* (yes is an off-phone rep).

*Talk to someone now* (safety.open) is on every screen. Close kind `none`: *How much were you in it?* is the close, in
the flow (`noClose`). A completed visit is a `participate` rep (the PracticeSkill's `defaultFor`; it joins the Practice
home's MF sequence at order 7). *Move on* before the beat starts is no practice: `skip_end`, not complete, no rep.
"""

ID = "join_in"
TOOL_ID = "join-in"
CONCEPT = "dbt_participate"
VERSION = "ji-v1"
OWN_MAX = 40

COPY = {
    "pick_title": "Pick something to throw yourself into.",
    "pick_line": "Move in whatever way your body can. Sitting is fine.",
    "pick_blank_line": "The beat runs a little quicker today, in short rounds. Sitting is fine.",
    "anger_title": "This one turns things up.",
    "anger_line": "Today's a day to bring things down first.",
    "flooded_title": "Your body's loud right now.",
    "flooded_line": "This one turns things up. Settle your body first, or try something slower.",
    "wound_title": "Then bring it down first.",
    "body_first": "My body first",
    "listen_instead": "Something slower: listen for a minute",
    "gate_end_title": "Not now is fine.",
    "gate_end_line": "Join in will be here on a calmer day.",
    "play_task": "Throw yourself in. When you catch yourself watching yourself, drop back in.",
    "play_task_song": "Move to the beat, or to a song of your own.",
    "play_task_hum": "Hum or sing along to the beat. Any tune, any words.",
    "play_task_tap": "Tap along, on the circle, a table or your knees.",
    "beat_start": "Start",
    "beat_tap": "Tap along",
    "beat_running": "Watching yourself? Drop back in.",
    "beat_sound": "Sound",
    "beat_done": "That's the round.",
    "beat_skip": "Move on",
    "settle_title": "Let it settle for a moment.",
    "settle_q": "Another round?",
    "away_title": "Throw yourself in.",
    "away_line": "When you catch yourself watching yourself, drop back in.",
    "away_hint": "Put the phone down. Come back when you're done.",
    "with_title": "How much were you in it?",
    "with_in": "That's participating. No watching needed.",
    "with_half": "Half in counts. Dropping back in is the practice.",
    "with_watching": "Watching yourself is the thing you practise dropping. Noticing it is the start.",
    "end_title": "You joined in.",
    "social_q": "Join in at something with someone soon? I'll ask how it went.",
    "social_title": "Did you get to join in at something with someone?",
    "social_yes_line": "That's participating, off the phone and with people. It goes wherever you do.",
    "social_sort_line": "Some of it counts. Dropping back in is the practice.",
    "social_not_line": "Not yet is fine. It'll be there next time.",
    "skip_title": "Not this time.",
    "skip_line": "It'll be here when you want it.",
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
STIRRED = {"eq": ["$ctx.band", "stirred"]}
BLANK = {"eq": ["$ctx.frame", "blank"]}
# The angry family's high-energy words (scripts/emotions/content.py; the ones that signal reactive_aggression, plus
# frustrated and annoyed): a carried one keeps Join in from turning things up.
ANGER_WORDS = ["angry", "mad", "aggressive", "furious", "provoked", "hostile", "infuriated", "indignant", "bitter",
               "resentful", "frustrated", "annoyed"]
ANGER = {"any": [{"has": ["$carried", w]} for w in ANGER_WORDS]}
GATED = {"any": [FLOODED, ANGER]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
LINKS = [SAFETY_LINK]

# The PRD's picks, in its order. `beat`: played with the phone's beat; the rest are done with the phone down.
THINGS = [
    ("song", "Move to a song", True),
    ("hum", "Sing or hum along", True),
    ("tap", "Tap a rhythm", True),
    ("game", "A game with someone", False),
    ("chore", "A chore with music", False),
    ("own", "Something of my own", False),
]
BEAT = [v for v, _, beat in THINGS if beat]
SETTLE = [("again", "Another round"), ("enough", "That's enough")]
WITH = [("in", "In it"), ("half", "Half in"), ("watching", "Watching myself")]
WHEN = [("tomorrow", "Tomorrow"), ("few_days", "In a few days")]
SOCIAL = [("yes", "Yes"), ("sort_of", "Sort of"), ("not_yet", "Not yet")]

# The beat screen's title: the pick's own way in (the instruction itself is the embed's task line).
TASK = [{"when": EQ("thing", "song"), "key": "play_task_song"}, {"when": EQ("thing", "hum"), "key": "play_task_hum"},
        {"when": ALWAYS, "key": "play_task_tap"}]


def ask(step_id, title, hint, fid, lst, nxt, *, links=None, label=None, lines=None, where=None, extra=None):
    opts = {"list": lst}
    if where:
        opts["where"] = where
    f = {"id": fid, "options": opts, "max": 1, "required": True, "links": (links or []) + LINKS}
    if label:
        f["label"] = label
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt, **(extra or {})}
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


def beat(step_id, bpm, seconds, nxt, *, skip_to="skip_end"):
    return {"id": step_id, "kind": "embed", "embed": "beatPulse", "answerAs": step_id, "title": TASK, "links": LINKS,
            "props": {"bpm": bpm, "seconds": seconds, "task": "play_task", "start": "beat_start", "tap": "beat_tap",
                      "running": "beat_running", "sound": "beat_sound",
                      "done": "beat_done", "next": "next", "skip": "beat_skip"},
            # skip_to=None: a skip goes the same way as a finished round (one NEXT edge per target).
            "next": [*([{"when": EQ(step_id, "skipped"), "to": skip_to}] if skip_to else []), *nxt]}


# Which beat: a blank frame's short quick rounds, a stirred reading's moderate tempo, or the easy minute.
TO_BEAT = [{"when": BLANK, "to": "play_blank"}, {"when": STIRRED, "to": "play_calm"}, {"to": "play"}]

STEPS = [
    ask("pick", [{"when": ANGER, "key": "anger_title"}, {"when": FLOODED, "key": "flooded_title"},
                 {"when": ALWAYS, "key": "pick_title"}],
        None, "thing", "thing",
        [{"when": {"in": [a("thing"), ["not_now", "wound_up"]]}, "to": "gate_end"},
         *[{"when": {"all": [{"in": [a("thing"), BEAT]}, *([t["when"]] if "when" in t else [])]}, "to": t["to"]} for t in TO_BEAT],
         {"to": "away"}],
        # Not offered flooded or angry: *Bring it down first* is the one chip, and the body and a slower practice are
        # the next card's offers (left from a card that logs no rep). Otherwise the six picks, and *I'm wound up or
        # angry right now* last: no entry carries the check-in's words yet, so the person can say so here.
        where={"any": [{"all": [{"eq": ["$opt.gate", True]}, GATED]}, {"all": [{"eq": ["$opt.gate", False]}, {"not": GATED}]}]},
        lines=[{"when": ANGER, "key": "anger_line"}, {"when": FLOODED, "key": "flooded_line"},
               {"when": BLANK, "key": "pick_blank_line"}, {"when": ALWAYS, "key": "pick_line"}]),
    handoff("gate_end", [{"when": EQ("thing", "wound_up"), "key": "wound_title"}, {"when": ALWAYS, "key": "gate_end_title"}],
            [{"when": ALWAYS, "key": "gate_end_line"}],
            [{"exit": "cool_down", "when": ALWAYS}, {"exit": "listen", "when": ALWAYS}], complete=False),
]
STEPS += [
    beat("play", 100, 60, [{"to": "with"}]),
    beat("play_calm", 84, 60, [{"to": "with"}]),
    # Blank (PRD: 15–30 s doses with a settle between, following the somatic dose cap).
    beat("play_blank", 112, 25, [{"to": "settle"}]),
    ask("settle", "settle_title", None, "settle", "settle",
        [{"when": EQ("settle", "again"), "to": "play_blank2"}, {"to": "with"}], label="settle_q"),
    # A first round was done: *Move on* here is *That's enough*, never *Not this time*.
    beat("play_blank2", 112, 25, [{"to": "with"}], skip_to=None),
    {"id": "away", "kind": "ask", "title": "away_title", "hint": "away_hint",
     "lines": [{"when": ALWAYS, "key": "away_line"}],
     "fields": [{"id": "away", "options": {"list": "back"}, "max": 1, "required": True, "links": LINKS}],
     "next": [{"to": "with"}]},
    ask("with", "with_title", None, "with", "with", [{"to": "end"}]),
    handoff("end", "end_title", [{"when": EQ("with", "in"), "key": "with_in"}, {"when": EQ("with", "half"), "key": "with_half"},
                                 {"when": ALWAYS, "key": "with_watching"}], [],
            extra={"fields": [{"id": "when", "label": "social_q", "max": 1, "options": {"list": "when"}}],
                   "followUp": {"type": "join_in_social", "whenFrom": "when"}}),
    # Reopened from the join_in_social card (R9): a run that reached `end`.
    ask("social", "social_title", None, "social", "social", [{"to": "social_end"}],
        extra={"reopens": {"after": "end"}, "clears": ["social"]}),
    handoff("social_end", None, [{"when": EQ("social", "yes"), "key": "social_yes_line"},
                                 {"when": EQ("social", "sort_of"), "key": "social_sort_line"},
                                 {"when": ALWAYS, "key": "social_not_line"}], []),
    # *Move on* before the beat started: no praise, nothing asked, no rep.
    handoff("skip_end", "skip_title", [{"when": ALWAYS, "key": "skip_line"}], [], complete=False),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down", "label": "body_first"},                          # DT-01 (flooded, anger)
    {"id": "listen", "toolId": "notice-and-name", "query": {"frame": "listen"}, "label": "listen_instead"},  # MF-01, slower
    {"id": "safety_open", "toolId": None, "safety": True},                                      # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("thing", v, label, {"gate": False, "beat": b}, "ParticipateActivity") for v, label, b in THINGS]
    out += [("thing", "wound_up", "I'm wound up or angry right now", {"gate": False, "beat": False}, None)]
    out += [("thing", "not_now", "Bring it down first", {"gate": True}, None)]
    out += [("settle", v, label, {}, None) for v, label in SETTLE]
    out += [("with", v, label, {}, None) for v, label in WITH]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("social", v, label, {}, None) for v, label in SOCIAL]
    out += [("back", "back", "I'm back", {}, None)]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "pick", "ownMax": OWN_MAX,
    # band: a carried flooded or stirred reading (C6.2); frame: blank (Notice what's here's blank branch, Doing mind's
    # drifting); carried words: an anger word keeps it from turning things up.
    "accepts": ["band", "frame"],
    "copy": COPY, "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
