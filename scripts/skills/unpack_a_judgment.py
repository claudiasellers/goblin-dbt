"""Unpack a judgment (MF-03; nonjudgmentally: DBT Mindfulness Handouts 5, 5a, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD MF-03 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): a judgment
("I'm pathetic", "I shouldn't feel this", "they're selfish", "this shouldn't be happening") is often the only word a
person has for a state. It is received as said, seen as a judgment, and unpacked into what happened, what it cost,
what I feel and what I wanted, then put back together as a plain description. Unpacking, not disputing: nothing asks
whether the judgment is true or offers a better thought (the 2026-09-24 decision to park cognitive CBT; KB 5.5).

- **Who it's about**: me · a feeling I'm having · someone else · how things are. *It's more than a judgment. I'm
  thinking about hurting myself* is on the first screen as a chip and on every screen after as a link (CORE's route).
- **The judgment**: the PRD's chips for that target, or their own words.
- **See it as a judgment**: the judgment on screen as said, a witness line for its target, then *Set it down for now*
  or *It feels like a fact*. With shame or guilt (the chip's hint, or a carried shame or guilt word), *It feels like a
  fact* goes to Check the Facts: a feeling that fits asks for action, not unpacking.
- **Unpack** (each pile optional): what happened as a camera would see it, what it cost, what I feel (grid words as
  guesses), what I wanted. *They threatened me or hurt me* is a danger route, never a pile to unpack.
- **Rebuild**: the picks as a first-person description (`describeCard`). *That's closer · Not quite · I'll keep the
  judgment for now*. Not quite changes one pile; keeping it is a full answer (*You noticed it as a judgment. That's the
  skill.*).
- **Close**: optional twenty seconds of willing hands (DT's `bodyCard`), then the end card: What matters to me when
  something mattered, Recover when the judgment was about someone else.

A carried flooded reading: no unpacking (*That's a judgment. It can wait.*, the body first). A carried stirred
reading: the judgment, seeing it, and one pile (what I feel or what I wanted). docs/design/unpack-a-judgment.md lists
what part 1 defers (the shelf object, caught-one, fade levels, the embedded card for hosts, the kept value's next-day
act) and where it departs from the PRD.

Safety (plan C6): the self-harm chip on the first screen and as a link on every screen after; *Back to the room* (Five
senses) on every unpacking screen; one judgment a visit, no *unpack another*.
"""

ID = "unpack_a_judgment"
TOOL_ID = "unpack-a-judgment"
CONCEPT = "dbt_nonjudgmental"
VERSION = "uj-v1"
OWN_MAX = 60  # a judgment, a fact or a feeling in a few words

COPY = {
    "about_title": "Who's the judgment about?",
    "about_hint": "A judgment is a verdict in a few words, like “I'm pathetic” or “they're selfish”.",
    "judge_title": "What's the judgment?",
    "judge_hint": "Pick the closest, or put it in your words.",
    "judge_own": "In my own words",
    # Never a carried flooded reading's unpacking (PRD: flooded → one line and DT's route).
    "set_down_title": "That's a judgment. It can wait.",
    "set_down_line": "Your body's loud right now. Body first, then come back to it if you want.",
    # Self-harm: someone to talk to first, no unpacking (voice.md S9).
    "harm_title": "Thank you for saying it.",
    "harm_line": "That's more than a judgment. Someone to talk to comes first.",
    # See it as a judgment: the judgment as said, then a witness line for its target, held before anything else.
    "see_title": "“{judge}”",
    "witness_me": "That's a heavy thing to be carrying.",
    "witness_feeling": "Being hard on yourself for a feeling adds a second weight to the first.",
    "witness_them": "Something they did got to you. That counts.",
    "witness_should": "Something isn't the way you hoped or needed. That's hard.",
    "see_hint": "That's a judgment, a verdict in a few words. You can set it down for a few minutes and look at what's under it.",
    # It feels like a fact, with shame or guilt: Check the Facts (a justified emotion needs action, not unpacking).
    "facts_title": "When it feels like a fact, the facts come first.",
    "facts_line": "If the feeling fits what happened, it asks for something to be done. Checking the facts sorts out which it is.",
    # A carried stirred reading: one pile.
    "pick_title": "Which would help most to look at?",
    "pick_hint": "One for now. The rest can wait.",
    # The piles. Each is optional.
    "happened_title": "What happened, the way a camera would see it?",
    "happened_hint": "Only what could be filmed. Up to two, or skip.",
    "happened_fact": "It can feel like a fact. Start with what a camera would catch.",
    "happened_own": "Something else",
    "cost_title": "What did it cost, or what could it cost?",
    "cost_hint": "Up to two, or skip.",
    "cost_own": "Something else",
    "feel_title": "What might you be feeling, under the judgment?",
    "feel_hint": "A guess is fine. Up to two, or skip.",
    "feel_more": "Something else",
    "want_title": "What did you want, or what matters to you here?",
    "want_hint": "One is plenty, or skip.",
    "want_them": "Not judging isn't agreeing. What you wanted still matters.",
    "want_own": "In my own words",
    # A danger from a person is never a pile to unpack.
    "danger_title": "That's about your safety, not a judgment to unpack.",
    "danger_line": "Your read of danger is the one that counts here.",
    # Rebuild.
    "rebuild_title": "Here's what you found.",
    "feel_lead": "I feel",
    "want_lead": "I wanted",
    "rebuild_empty": "Go on",
    "sit_title": "How does that sit, next to the judgment?",
    "sit_hint": "It isn't truer or better. It's described.",
    "fix_title": "Which part would you change?",
    # Keep the judgment for now: a full answer (PRD: "That's okay. You noticed it; that's the skill.").
    "kept_title": "That's okay.",
    "kept_line": "You noticed it as a judgment. That's the skill.",
    # Nothing picked in any pile: still a rep.
    "noticed_title": "You noticed it as a judgment.",
    "noticed_line": "That's the skill, even without taking it apart today.",
    # Willing hands, optional (DT-owned bodyCard).
    "hands_q_title": "To finish, twenty seconds with your hands open?",
    "hands_q_hint": "Willing hands: palms up, letting it be for a moment. Optional.",
    "hands_title": "Willing hands.",
    "hands_step1": "Arms loose by your sides or in your lap.",
    "hands_step2": "Turn your palms up, or rest them however feels safe.",
    "hands_step3": "Let your fingers relax. Breathe however you breathe.",
    "hands_caution": "If it feels right, let your face soften too. You don't have to smile.",
    "hands_start": "Start",
    "hands_running": "Hands open",
    "hands_done": "That's it.",
    # The end card.
    "end_title": "You took it apart instead of carrying it whole.",
    "end_them": "Not judging isn't agreeing. What you wanted still matters.",
    "end_want": "What you wanted is still there, without the verdict.",
    "end_line": "When it shows up again, noticing it as a judgment is the practice.",
    # Links on every screen.
    "safety_chip": "It's more than a judgment. I'm thinking about hurting myself",
    "back_to_room": "Back to the room",
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
SAFETY_LINK = {"exit": "safety_open", "label": "safety_chip", "when": ALWAYS}
ROOM_LINK = {"exit": "five_senses", "label": "back_to_room", "when": ALWAYS}
LINKS = [SAFETY_LINK]
PILE_LINKS = [ROOM_LINK, SAFETY_LINK]

# JudgmentTarget (PRD MF-03 step 1). `harm` is the always-visible chip, a route, not a target.
ABOUT = [
    ("me", "Me", {}),
    ("feeling", "A feeling I'm having", {}),
    ("them", "Someone else", {}),
    ("should", "How things are", {}),
    ("harm", COPY["safety_chip"], {"danger": "self"}),
]
# JudgmentChip (PRD MF-03 step 1, in its order). `t`: the target it's listed under. `hint`: the emotion family it
# often stands for (PRD HINTS_EMOTION), read only by the justified route: shame or guilt + *It feels like a fact* →
# Check the Facts. Never a session emotion (the person didn't pick it).
JUDGMENTS = [
    ("too_much", "I'm too much", {"t": ["me"], "hint": "shame"}),
    ("pathetic", "I'm pathetic", {"t": ["me"], "hint": "shame"}),
    ("ruin", "I ruin everything", {"t": ["me"], "hint": "guilt"}),
    ("lazy", "I'm lazy", {"t": ["me"], "hint": "shame"}),
    ("wrong_with_me", "Something's wrong with me", {"t": ["me"], "hint": "shame"}),
    ("shouldnt_feel", "I shouldn't feel this", {"t": ["feeling"], "hint": "shame"}),
    ("overreacting", "I'm overreacting", {"t": ["feeling"], "hint": "shame"}),
    ("dramatic", "I'm being dramatic", {"t": ["feeling"], "hint": "shame"}),
    ("selfish", "They're selfish", {"t": ["them"], "hint": "anger"}),
    ("dont_care", "They don't care", {"t": ["them"], "hint": "sadness"}),
    ("on_purpose", "They're doing it on purpose", {"t": ["them"], "hint": "anger"}),
    ("shouldnt_happen", "This shouldn't be happening", {"t": ["should"], "hint": "none"}),
    ("not_fair", "It's not fair", {"t": ["should"], "hint": "anger"}),
]
# Carried words that make *It feels like a fact* the justified route even for own words.
SHAME_GUILT_WORDS = ["ashamed", "embarrassed", "guilty", "remorseful", "humiliated", "worthless", "inadequate",
                     "inferior", "insecure"]
SEE = [
    ("down", "Set it down for now", {}),
    ("fact", "It feels like a fact", {}),
]
PICK = [
    ("feel", "What I feel", {}),
    ("want", "What I wanted", {}),
]
# What happened, the way a camera would see it (PRD: facts per judgment type). `t`: the targets it's offered for.
HAPPENED = [
    ("didnt_go", "I didn't go.", {"t": ["me", "feeling"]}),
    ("said_it", "I said something I wish I hadn't.", {"t": ["me"]}),
    ("not_done", "I didn't get something done.", {"t": ["me"]}),
    ("mistake", "I made a mistake.", {"t": ["me"]}),
    ("stayed_in", "I stayed in bed.", {"t": ["me"]}),
    ("asked", "I asked for help.", {"t": ["me", "feeling"]}),
    ("cried", "I cried.", {"t": ["feeling", "me"]}),
    ("strong", "The feeling came on strong.", {"t": ["feeling"]}),
    ("stayed", "The feeling has stayed a while.", {"t": ["feeling"]}),
    ("showed", "Someone saw how I felt.", {"t": ["feeling"]}),
    ("raised", "I raised my voice.", {"t": ["feeling", "me"]}),
    ("no_reply", "They didn't reply.", {"t": ["them"]}),
    ("cancelled", "They cancelled.", {"t": ["them"]}),
    ("said_hurtful", "They said something that hurt.", {"t": ["them"]}),
    ("forgot", "They forgot something that mattered to me.", {"t": ["them"]}),
    ("didnt_help", "They didn't help when I asked.", {"t": ["them"]}),
    # A danger from a person (PRD risks: never a softening move; plan C6): its own route, not a pile.
    ("threat", "They threatened me or hurt me.", {"t": ["them"], "danger": "other"}),
    ("fell_through", "A plan fell through.", {"t": ["should"]}),
    ("taken", "Something was taken away.", {"t": ["should"]}),
    ("treated_differently", "I was treated differently from others.", {"t": ["should"]}),
    ("lost", "I lost something that mattered.", {"t": ["should"]}),
    ("counted_on", "Something I counted on didn't happen.", {"t": ["should", "them"]}),
    ("keeps_happening", "It keeps happening.", {"t": ["should"]}),
]
# What it cost or could cost (PRD consequence chips).
COST = [
    ("missed_out", "I missed out on something.", {}),
    ("snapped", "I snapped at someone.", {}),
    ("didnt_talk", "We didn't talk.", {}),
    ("pulled_away", "I pulled away from people.", {}),
    ("lost_sleep", "I lost sleep over it.", {}),
    ("stuck", "I've been stuck on it.", {}),
    ("gave_up", "I gave up on something.", {}),
]
# What I feel: grid words as guesses (the check-in's own words; the session's emotion ids). A carried word first.
FEEL_CHIPS = ["ashamed", "embarrassed", "guilty", "sad", "hurt", "lonely", "angry", "frustrated", "disappointed",
              "anxious"]
# What I wanted / what matters (PRD preference and value chips; *to be safe* among them, first for someone else).
WANT = [
    ("respected", "To be respected", {}),
    ("do_well", "To do well", {}),
    ("close", "To be close to someone", {}),
    ("safe", "To be safe", {}),
    ("show_up", "To be someone who shows up", {}),
    ("understood", "To be understood", {}),
    ("fair", "To be treated fairly", {}),
    ("say", "To have a say in what happens", {}),
    ("cared_for", "To be cared for", {}),
    ("rest", "To rest", {}),
]
WANT_FIRST = {"me": "show_up", "feeling": "understood", "them": "safe", "should": "fair"}
SIT = [
    ("closer", "That's closer", {}),
    ("not_quite", "Not quite", {}),
    ("keep", "I'll keep the judgment for now", {}),
]
# Not quite: change one pile. `short`: the piles a carried stirred reading sees.
FIX = [
    ("happened", "What happened", {}),
    ("cost", "What it cost", {}),
    ("feel", "What I feel", {"short": True}),
    ("want", "What I wanted", {"short": True}),
]
HANDS = [
    ("yes", "Try it", {}),
    ("no", "Not now", {}),
]

JUSTIFIED = {"all": [EQ("see", "fact"),
                     {"any": [{"some": ["judge", {"in": ["$opt.hint", ["shame", "guilt"]]}]},
                              *[{"has": ["$carried", w]} for w in SHAME_GUILT_WORDS]]}]}
ANY_PILE = {"any": [{"set": a(f)} for f in ("happened", "cost", "feel", "want")]}
FIXING = {"set": a("fix")}
TO_REBUILD = [{"when": ANY_PILE, "to": "rebuild"}, {"to": "noticed"}]


def ask(step_id, title, hint, field, lst, nxt, *, required=True, own=None, links=None, max_picks=1, extra=None,
        lines=None, title_slots=None):
    f = {"id": field, "options": {"list": lst} if isinstance(lst, str) else lst, "max": max_picks,
         "required": required, "links": LINKS if links is None else links, **(extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "fields": [f], "next": nxt}
    if hint:
        s["hint"] = hint
    if lines:
        s["lines"] = lines
    if title_slots:
        s["titleSlots"] = title_slots
    return s


def handoff(step_id, title, lines, offers, *, complete=True, crisis=None, links=None):
    s = {"id": step_id, "kind": "handoff", "complete": complete, "title": title, "lines": lines, "offers": offers,
         "done": "done", "links": links if links is not None else LINKS, "noClose": True}
    if crisis:
        s["crisis"] = crisis
    return s


def pile_next(nxt):
    """After a pile: back to the rebuild when the person is changing one pile (Not quite)."""
    return [{"when": FIXING, "to": "rebuild"}] + nxt


STEPS = [
    {**ask("about", "about_title", "about_hint", "about", "about",
           [{"when": EQ("about", "harm"), "to": "harm"}, {"to": "judge"}], links=[]),
     "crisis": [{"variant": "crisis", "when": EQ("about", "harm")}]},
    {**handoff("harm", "harm_title", [{"when": ALWAYS, "key": "harm_line"}], [{"exit": "safety_open", "when": ALWAYS}],
               complete=False, links=[]),
     "crisis": [{"variant": "crisis", "when": ALWAYS}]},
    ask("judge", "judge_title", "judge_hint", "judge", {"list": "judge", "where": {"has": ["$opt.t", a("about")]}},
        [{"when": FLOODED, "to": "set_down"}, {"to": "see"}], own="judge_own"),
    handoff("set_down", "set_down_title", [{"when": ALWAYS, "key": "set_down_line"}],
            [{"exit": "cool_down", "when": ALWAYS}], complete=False),
    ask("see", "see_title", "see_hint", "see", "see",
        [{"when": JUSTIFIED, "to": "facts"}, {"when": STIRRED, "to": "pick"}, {"to": "happened"}],
        links=PILE_LINKS, title_slots={"judge": {"labelOf": "judge"}},
        lines=[{"when": EQ("about", t), "key": f"witness_{t}"} for t in ("me", "feeling", "them", "should")]),
    handoff("facts", "facts_title", [{"when": ALWAYS, "key": "facts_line"}],
            [{"exit": "check_the_facts", "when": ALWAYS}], complete=False),
    ask("pick", "pick_title", "pick_hint", "pick", "pick",
        [{"when": EQ("pick", "want"), "to": "want"}, {"to": "feel"}], links=PILE_LINKS),
    {**ask("happened", "happened_title", "happened_hint", "happened",
        {"list": "happened", "where": {"has": ["$opt.t", a("about")]}},
        [{"when": {"has": [a("happened") + ".ids", "threat"]}, "to": "danger"}] + pile_next([{"to": "cost"}]),
        required=False, own="happened_own", links=PILE_LINKS, max_picks=2,
        lines=[{"when": EQ("see", "fact"), "key": "happened_fact"}]),
     "crisis": [{"variant": "other_person", "when": {"has": [a("happened") + ".ids", "threat"]}}]},
    handoff("danger", "danger_title", [{"when": ALWAYS, "key": "danger_line"}],
            [{"exit": "ending", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}], complete=False,
            crisis=[{"variant": "other_person", "when": ALWAYS}]),
    ask("cost", "cost_title", "cost_hint", "cost", "cost", pile_next([{"to": "feel"}]),
        required=False, own="cost_own", links=PILE_LINKS, max_picks=2),
    ask("feel", "feel_title", "feel_hint", "feel", {"emotions": FEEL_CHIPS, "carriedFirst": True, "moreKey": "feel_more"},
        [{"when": {"any": [FIXING, {"all": [STIRRED, ANY_PILE]}]}, "to": "rebuild"}, {"when": STIRRED, "to": "noticed"},
         {"to": "want"}],
        required=False, links=PILE_LINKS, max_picks=2, extra={"emotion": True}),
    ask("want", "want_title", "want_hint", "want", {"list": "want", "firstFrom": "$d.wantFirst"},
        TO_REBUILD, required=False, own="want_own", links=PILE_LINKS,
        lines=[{"when": EQ("about", "them"), "key": "want_them"}]),
    {"id": "rebuild", "kind": "embed", "embed": "describeCard", "answerAs": "rebuild", "title": "rebuild_title",
     "props": {"happened": "happened", "cost": "cost", "feel": "feel", "want": "want", "feelLead": "feel_lead",
               "wantLead": "want_lead", "next": "next", "empty": "rebuild_empty"},
     "links": LINKS, "next": [{"to": "sit"}]},
    ask("sit", "sit_title", "sit_hint", "sit", "sit",
        [{"when": EQ("sit", "not_quite"), "to": "fix"}, {"when": EQ("sit", "keep"), "to": "kept"},
         {"when": STIRRED, "to": "end"}, {"to": "hands_q"}]),
    ask("fix", "fix_title", None, "fix", {"list": "fix", "where": {"any": [{"not": STIRRED}, {"eq": ["$opt.short", True]}]}},
        [{"when": EQ("fix", f), "to": f} for f, _, _ in FIX[:-1]] + [{"to": "want"}]),
    handoff("kept", "kept_title", [{"when": ALWAYS, "key": "kept_line"}], []),
    handoff("noticed", "noticed_title", [{"when": ALWAYS, "key": "noticed_line"}], []),
    ask("hands_q", "hands_q_title", "hands_q_hint", "hands_q", "hands",
        [{"when": EQ("hands_q", "yes"), "to": "hands"}, {"to": "end"}]),
    {"id": "hands", "kind": "embed", "embed": "bodyCard", "answerAs": "hands", "title": "hands_title", "links": LINKS,
     "props": {"kind": "willing", "seconds": 20, "step1": "hands_step1", "step2": "hands_step2", "step3": "hands_step3",
               "caution": "hands_caution", "start": "hands_start", "running": "hands_running", "done": "hands_done",
               "next": "next"},
     "next": [{"to": "end"}]},
    handoff("end", "end_title",
            [{"when": {"all": [EQ("about", "them"), {"set": a("want")}]}, "key": "end_them"},
             {"when": {"set": a("want")}, "key": "end_want"},
             {"when": ALWAYS, "key": "end_line"}],
            [{"exit": "values", "when": {"set": a("want")}}, {"exit": "recover", "when": EQ("about", "them")}]),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                            # DT-01: flooded, body first
    {"id": "check_the_facts", "toolId": "check-the-facts"},                # ER-02: the justified branch
    {"id": "five_senses", "toolId": "five-senses"},                        # Back to the room (PRD: shame spiral)
    {"id": "values", "toolId": "values-clarification"},                    # ER-09: a kept value (part 2: the next-day act)
    {"id": "recover", "toolId": "recovering-from-invalidation"},           # WMP: hurt by someone
    {"id": "ending", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # IE-08: danger from a person
    {"id": "safety_open", "toolId": None, "safety": True},                 # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = []
    for lst, rows in (("about", ABOUT), ("judge", JUDGMENTS), ("see", SEE), ("pick", PICK), ("happened", HAPPENED),
                      ("cost", COST), ("want", WANT), ("sit", SIT), ("fix", FIX), ("hands", HANDS)):
        out += [(lst, v, label, props, None) for v, label, props in rows]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "about", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded sets it down, stirred gets one pile.
    "accepts": ["band"],
    "copy": COPY,
    "tables": {"wantFirstOf": WANT_FIRST},
    "derive": [{"name": "wantFirst", "from": a("about"), "table": "wantFirstOf"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"],
    # The judgment chips are the person's verdicts, quoted as said (PRD MF-03 step 1): the voice check skips their words.
    "voiceQuotes": ["judge"],
}
