"""Unpack a judgment (MF-03; nonjudgmentally: DBT Mindfulness Handouts 5, 5a, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD MF-03 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): a judgment
("I'm pathetic", "I shouldn't feel this", "they're selfish", "this shouldn't be happening") is often the only word a
person has for a state. It is received as said, seen as a judgment, and unpacked into what happened, what it cost,
what I feel and what I wanted, then put back together as a plain description. Unpacking, not disputing: nothing asks
whether the judgment is true or offers a better thought (the 2026-09-24 decision to park cognitive CBT; KB 5.5).

- **What it's about**: me · a feeling I'm having · someone else · how things are. *It's more than a judgment. I'm
  thinking about hurting myself* is on the first screen as a chip and on every screen after as a link (CORE's route).
- **The judgment**: the PRD's chips for that target, or their own words.
- **See it as a judgment**: the judgment on screen as said, a witness line for its target, then *Set it down and look under it*
  or *It feels like a fact*. With shame or guilt (the chip's hint, or a carried shame or guilt word), *It feels like a
  fact* goes to Check the Facts: a feeling that fits asks for action, not unpacking.
- **Unpack** (each pile optional): what happened as a camera would see it, what it cost, what I feel (grid words as
  guesses, led by the target), what I wanted. *They threatened me, scared me or hurt me* is a danger route, never a pile to unpack.
- **Rebuild**: the picks as a first-person description (`describeCard`). *That's closer · Not quite · I'll keep the
  judgment for now*. Not quite changes one pile; keeping it is a full answer (*You noticed it as a judgment. That's the
  skill.*).
- **Close**: optional twenty seconds of willing hands (DT's `bodyCard`), then the end card: What matters to me when
  something mattered, Recover when the judgment was about someone else.

A carried flooded reading: no unpacking (*A judgment can wait.*, the body first, straight from the first screen). A carried stirred
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
    "about_title": "What's the judgment about?",
    "about_hint": "A judgment is a verdict in a few words, like “I'm too much” or “they don't care”.",
    "judge_title": "What's the judgment?",
    "judge_hint": "Pick the closest, or put it in your words.",
    "judge_own": "In my own words",
    # Never a carried flooded reading's unpacking (PRD: flooded → one line and DT's route).
    "set_down_title": "A judgment can wait.",
    "set_down_line": "Your body's loud right now. Body first, then come back to it if you want.",
    # Self-harm: someone to talk to first, no unpacking (voice.md S9).
    "harm_title": "Thank you for saying it.",
    "harm_line": "That's more than a judgment. Someone to talk to comes first.",
    # See it as a judgment: the judgment as said, then a witness line for its target, held before anything else.
    "see_title": "“{judge}”",
    "witness_me": "That's a heavy thing to be carrying.",
    "witness_feeling": "A feeling, and a verdict about it too. That's a lot at once.",
    "witness_them": "Something they did got to you. Setting the verdict down isn't agreeing with what they did.",
    "witness_should": "Something isn't the way you hoped or needed. That's hard.",
    "see_hint": "That's a judgment, a verdict in a few words. Minds make them all the time. You can set it down for a few minutes and look at what's under it.",
    # It feels like a fact, with shame or guilt: Check the Facts (a justified emotion needs action, not unpacking).
    "facts_title": "It feels like a fact.",
    "facts_line": "Shame or guilt can fit what happened, and then it asks for something to be done. Checking the facts looks at the feeling, not at whether the verdict is true.",
    "facts_hint": "Either is fine.",
    "facts_go_title": "Check the Facts, then.",
    "facts_go_line": "It looks at the feeling and what happened. Nothing in it decides whether you're a bad person.",
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
    "sit_hint": "It isn't truer or better, only described.",
    "fix_title": "Which part would you change?",
    # Keep the judgment for now: a full answer (PRD: "That's okay. You noticed it; that's the skill.").
    "kept_title": "That's okay.",
    "kept_line": "You noticed it as a judgment. That's the skill.",
    # Nothing picked in any pile: still a rep.
    "noticed_title": "You noticed it as a judgment.",
    "noticed_line": "That's the skill, even without taking it apart today.",
    # Willing hands, optional (DT-owned bodyCard).
    "hands_q_title": "To finish, twenty seconds with your hands open?",
    "hands_q_hint": "Willing hands: palms up, letting this moment be what it is. It doesn't mean what happened was okay. Optional.",
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
    "end_them": "What you wanted still counts, whatever they did. Next time, noticing the judgment is the practice.",
    "end_want": "What you wanted is still there, without the verdict. Next time, noticing the judgment is the practice.",
    "end_line": "When it shows up again, noticing it as a judgment is the practice.",
    # Links on every screen.
    "safety_chip": "It's more than a judgment. I'm thinking about hurting myself or not being here",
    # After the first screen the link is shorter (it wraps at 360px otherwise).
    "safety_link": "Thoughts of hurting myself or not being here",
    # A heavy carried word (worthless, despair…): the end cards say it plainly (as Let it be a wave does).
    "heavy_line": "Heavy feelings can come with thoughts of not being here. If they do, talk to someone now.",
    "back_to_room": "Back to the room",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}
# A heavy carried word: each end card keeps its own line and adds heavy_line (handoffLine shows one line only).
COPY.update({f"{k}_heavy": f"{COPY[k]} {COPY['heavy_line']}"
             for k in ("kept_line", "noticed_line", "end_them", "end_want", "end_line")})


def a(field):
    return f"$a.{field}"


def EQ(field, v):
    return {"eq": [a(field), v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
STIRRED = {"eq": ["$ctx.band", "stirred"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_link", "when": ALWAYS}
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
    # A danger from a person is a route from the first screen too, so a flooded reading (set down at once) has it.
    ("danger", "Someone threatened me, scared me or hurt me", {"danger": "other"}),
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
                     "inferior", "insecure", "insignificant", "weak", "exposed"]
# Heavy words the self-worth routing row brings here: the end cards carry heavy_line.
HEAVY_WORDS = ["worthless", "despair", "helpless", "powerless"]
SEE = [
    ("down", "Set it down and look under it", {}),
    ("fact", "It feels like a fact", {}),
    # A danger from a person is caught here too, so the short (stirred) path, which skips what happened, has it.
    ("threat", "They threatened me, scared me or hurt me", {"t": ["them"], "danger": "other"}),
    # Every target: a verdict about me, a feeling or how things are can be someone's words taken in, or ongoing harm.
    ("threat_any", "Someone threatened me, scared me or hurt me", {"t": ["me", "feeling", "should"], "danger": "other"}),
]
FACTS = [
    ("check", "Check the facts on the feeling", {}),
    ("under", "Look at what's under it anyway", {}),
]
PICK = [
    ("feel", "What I feel", {}),
    ("want", "What I wanted", {}),
]
# What happened, the way a camera would see it (PRD: facts per judgment type). `t`: the targets it's offered for.
HAPPENED = [
    ("didnt_go", "I didn't go.", {"t": ["me"]}),
    ("late", "I was late.", {"t": ["me"]}),
    ("not_done", "I didn't get something done.", {"t": ["me"]}),
    ("forgot_thing", "I forgot something.", {"t": ["me"]}),
    ("stayed_in", "I stayed in bed.", {"t": ["me"]}),
    ("raised", "I raised my voice.", {"t": ["me", "feeling"]}),
    ("cried", "I cried.", {"t": ["feeling"]}),
    ("strong", "The feeling came on strong.", {"t": ["feeling"]}),
    ("stayed", "The feeling has stayed a while.", {"t": ["feeling"]}),
    ("showed", "Someone saw how I felt.", {"t": ["feeling"]}),
    ("asked", "I asked for help.", {"t": ["feeling"]}),
    ("no_reply", "They didn't reply.", {"t": ["them"]}),
    ("cancelled", "They cancelled.", {"t": ["them"]}),
    ("said_harsh", "They said something harsh to me.", {"t": ["them"]}),
    ("forgot", "They forgot something that mattered to me.", {"t": ["them"]}),
    ("didnt_help", "They didn't help when I asked.", {"t": ["them"]}),
    # A danger from a person (PRD risks: never a softening move; plan C6): its own route, not a pile.
    ("threat", "They threatened me, scared me or hurt me.", {"t": ["them"], "danger": "other"}),
    ("fell_through", "A plan fell through.", {"t": ["should"]}),
    ("taken", "Something was taken away.", {"t": ["should"]}),
    ("treated_differently", "I was treated differently from others.", {"t": ["should"]}),
    ("lost", "I lost something that mattered.", {"t": ["should"]}),
    ("counted_on", "Something I counted on didn't happen.", {"t": ["should"]}),
    ("keeps_happening", "It keeps happening.", {"t": ["should"]}),
    ("threat_any", "Someone threatened me, scared me or hurt me.", {"t": ["me", "feeling", "should"], "danger": "other"}),
]
# What it cost or could cost (PRD consequence chips).
ALL = ["me", "feeling", "them", "should"]
COST = [
    # What the event cost the person (Linehan: describe the consequences), never only their own reactions.
    ("on_my_own", "I had to sort it out on my own.", {"t": ["them", "should"]}),
    ("went_without", "I went without something I needed.", {"t": ["them", "should"]}),
    ("plans_changed", "My plans changed because of it.", {"t": ["them", "should"]}),
    ("missed_out", "I missed out on something.", {"t": ["me", "feeling", "should"]}),
    ("snapped", "I snapped at someone.", {"t": ["me", "feeling"]}),
    ("didnt_talk", "We didn't talk.", {"t": ALL}),
    ("pulled_away", "I pulled away from people.", {"t": ["me", "feeling"]}),
    ("lost_sleep", "I lost sleep over it.", {"t": ALL}),
    ("stuck", "I've been stuck on it.", {"t": ["me", "feeling"]}),
    ("gave_up", "I gave up on something.", {"t": ["me", "should"]}),
]
# What I feel: grid words as guesses (the check-in's own words; the session's emotion ids). A carried word first.
FEEL_CHIPS = ["ashamed", "embarrassed", "guilty", "sad", "hurt", "lonely", "angry", "frustrated", "disappointed",
              "anxious"]
# What I wanted / what matters (PRD preference and value chips; *to be safe* among them, first for someone else).
WANT = [
    # Boundaries, right after safety (firstFrom) for someone else (PRD risks: safety and boundaries lead that pile).
    ("stop", "For it to stop", {"t": ["them"]}),
    ("distance", "To have some distance", {"t": ["them"]}),
    ("respected", "To be respected", {"t": ["me", "feeling", "them"]}),
    ("do_well", "To do well", {"t": ["me", "should"]}),
    ("close", "To be close to someone", {"t": ["feeling", "should"]}),
    ("safe", "To be safe", {"t": ["me", "feeling", "them", "should"]}),
    ("show_up", "To be someone who shows up", {"t": ["me"]}),
    ("understood", "To be understood", {"t": ["me", "feeling", "them"]}),
    ("fair", "To be treated fairly", {"t": ["them", "should"]}),
    ("say", "To have a say in what happens", {"t": ["should"]}),
    ("cared_for", "To be cared for", {"t": ["me", "feeling"]}),
    ("rest", "To rest", {"t": ["me", "feeling", "should"]}),
]
WANT_FIRST = {"me": "show_up", "feeling": "understood", "them": "safe", "should": "fair"}
# What I feel, led by what the judgment is about: a verdict about someone else or about how things are is more often
# anger, hurt or disappointment than shame.
FEEL_OF = {
    "me": FEEL_CHIPS,
    "feeling": FEEL_CHIPS,
    "them": ["angry", "hurt", "frustrated", "disappointed", "sad", "lonely", "anxious", "embarrassed"],
    "should": ["disappointed", "sad", "frustrated", "angry", "hurt", "anxious", "lonely"],
}
SIT = [
    ("closer", "That's closer", {}),
    ("not_quite", "Not quite", {"once": True}),  # one change a visit: no loop over the card
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

# A carried shame or guilt word counts only for a verdict about me or a feeling, or one in the person's own words.
JUSTIFIED = {"all": [EQ("see", "fact"),
                     {"not": {"eq": ["$ctx.frame", "after_facts"]}},  # Do the Opposite's facts said it doesn't fit
                     {"any": [{"some": ["judge", {"in": ["$opt.hint", ["shame", "guilt"]]}]},
                              {"all": [{"any": [{"in": [a("about"), ["me", "feeling"]]}, {"own": "judge"}]},
                                       {"any": [{"has": ["$carried", w]} for w in SHAME_GUILT_WORDS]}]}]}]}
HEAVY = {"any": [{"has": ["$carried", w]} for w in HEAVY_WORDS]}
HEAVY_OFFER = {"exit": "safety_open", "when": HEAVY}
SEE_THREAT = {"in": [a("see"), ["threat", "threat_any"]]}
HAPPENED_THREAT = {"any": [{"has": [a("happened") + ".ids", t]} for t in ("threat", "threat_any")]}


def heavy(key):
    """An end card's own line, with heavy_line after it when a heavy word was carried (only one line shows)."""
    return [{"when": HEAVY, "key": f"{key}_heavy"}, {"when": ALWAYS, "key": key}]
AFTER_SEE = [{"when": STIRRED, "to": "pick"}, {"to": "happened"}]
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
    """After a pile: back to the rebuild when the person is changing one pile (Not quite); a change that emptied the
    last pile is still a rep (noticed), never an empty card."""
    return [{"when": {"all": [FIXING, ANY_PILE]}, "to": "rebuild"}, {"when": FIXING, "to": "noticed"}] + nxt


STEPS = [
    {**ask("about", "about_title", "about_hint", "about", "about",
           [{"when": EQ("about", "harm"), "to": "harm"}, {"when": EQ("about", "danger"), "to": "danger"},
            {"when": FLOODED, "to": "set_down"}, {"to": "judge"}], links=[]),
     "crisis": [{"variant": "crisis", "when": EQ("about", "harm")},
                {"variant": "other_person", "when": EQ("about", "danger")}]},
    {**handoff("harm", "harm_title", [{"when": ALWAYS, "key": "harm_line"}], [{"exit": "safety_open", "when": ALWAYS}],
               complete=False, links=[]),
     "crisis": [{"variant": "crisis", "when": ALWAYS}]},
    ask("judge", "judge_title", "judge_hint", "judge", {"list": "judge", "where": {"has": ["$opt.t", a("about")]}},
        [{"to": "see"}], own="judge_own"),
    handoff("set_down", "set_down_title", [{"when": ALWAYS, "key": "set_down_line"}],
            [{"exit": "cool_down", "when": ALWAYS}], complete=False),
    {**ask("see", "see_title", "see_hint", "see",
           {"list": "see", "where": {"any": [{"not": {"set": "$opt.t"}}, {"has": ["$opt.t", a("about")]}]}},
           [{"when": SEE_THREAT, "to": "danger"}, {"when": JUSTIFIED, "to": "facts"}] + AFTER_SEE,
           links=PILE_LINKS, title_slots={"judge": {"labelOf": "judge"}},
           lines=[{"when": EQ("about", t), "key": f"witness_{t}"} for t in ("me", "feeling", "them", "should")]),
     "crisis": [{"variant": "other_person", "when": SEE_THREAT}]},
    ask("facts", "facts_title", "facts_hint", "facts", "facts",
        [{"when": EQ("facts", "check"), "to": "facts_go"}] + AFTER_SEE,
        links=PILE_LINKS, lines=[{"when": ALWAYS, "key": "facts_line"}]),
    handoff("facts_go", "facts_go_title", [{"when": ALWAYS, "key": "facts_go_line"}],
            [{"exit": "check_the_facts", "when": ALWAYS}], complete=False),
    ask("pick", "pick_title", "pick_hint", "pick", "pick",
        [{"when": EQ("pick", "want"), "to": "want"}, {"to": "feel"}], links=PILE_LINKS),
    {**ask("happened", "happened_title", "happened_hint", "happened",
        {"list": "happened", "where": {"has": ["$opt.t", a("about")]}},
        [{"when": HAPPENED_THREAT, "to": "danger"}] + pile_next([{"to": "cost"}]),
        required=False, own="happened_own", links=PILE_LINKS, max_picks=2,
        lines=[{"when": EQ("see", "fact"), "key": "happened_fact"}]),
     "crisis": [{"variant": "other_person", "when": HAPPENED_THREAT}]},
    handoff("danger", "danger_title", [{"when": ALWAYS, "key": "danger_line"}],
            [{"exit": "ending", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}], complete=False,
            crisis=[{"variant": "other_person", "when": ALWAYS}], links=[]),
    ask("cost", "cost_title", "cost_hint", "cost", {"list": "cost", "where": {"has": ["$opt.t", a("about")]}},
        pile_next([{"to": "feel"}]),
        required=False, own="cost_own", links=PILE_LINKS, max_picks=2),
    ask("feel", "feel_title", "feel_hint", "feel",
        {"emotions": FEEL_CHIPS, "emotionsFrom": "$d.feelFirst", "carriedFirst": True, "moreKey": "feel_more"},
        [{"when": {"all": [{"any": [FIXING, STIRRED]}, ANY_PILE]}, "to": "rebuild"},
         {"when": {"any": [FIXING, STIRRED]}, "to": "noticed"}, {"to": "want"}],
        required=False, links=PILE_LINKS, max_picks=2, extra={"emotion": True}),
    ask("want", "want_title", "want_hint", "want",
        {"list": "want", "where": {"has": ["$opt.t", a("about")]}, "firstFrom": "$d.wantFirst"},
        TO_REBUILD, required=False, own="want_own", links=PILE_LINKS,
        lines=[{"when": EQ("about", "them"), "key": "want_them"}]),
    {"id": "rebuild", "kind": "embed", "embed": "describeCard", "answerAs": "rebuild", "title": "rebuild_title",
     "props": {"happened": "happened", "cost": "cost", "feel": "feel", "want": "want", "feelLead": "feel_lead",
               "wantLead": "want_lead", "next": "next", "empty": "rebuild_empty"},
     "links": PILE_LINKS, "next": [{"to": "sit"}]},
    ask("sit", "sit_title", "sit_hint", "sit",
        {"list": "sit", "where": {"any": [{"not": FIXING}, {"not": {"eq": ["$opt.once", True]}}]}},
        [{"when": EQ("sit", "not_quite"), "to": "fix"}, {"when": EQ("sit", "keep"), "to": "kept"},
         {"when": STIRRED, "to": "end"}, {"to": "hands_q"}], links=PILE_LINKS),
    ask("fix", "fix_title", None, "fix", {"list": "fix", "where": {"any": [{"not": STIRRED}, {"eq": ["$opt.short", True]}]}},
        [{"when": EQ("fix", f), "to": f} for f, _, _ in FIX[:-1]] + [{"to": "want"}], links=PILE_LINKS),
    handoff("kept", "kept_title", heavy("kept_line"), [HEAVY_OFFER]),
    handoff("noticed", "noticed_title", heavy("noticed_line"), [HEAVY_OFFER]),
    ask("hands_q", "hands_q_title", "hands_q_hint", "hands_q", "hands",
        [{"when": EQ("hands_q", "yes"), "to": "hands"}, {"to": "end"}]),
    {"id": "hands", "kind": "embed", "embed": "bodyCard", "answerAs": "hands", "title": "hands_title", "links": LINKS,
     "props": {"kind": "willing", "seconds": 20, "step1": "hands_step1", "step2": "hands_step2", "step3": "hands_step3",
               "caution": "hands_caution", "start": "hands_start", "running": "hands_running", "done": "hands_done",
               "next": "next"},
     "next": [{"to": "end"}]},
    handoff("end", "end_title",
            [{"when": {"all": [HEAVY, EQ("about", "them"), {"set": a("want")}]}, "key": "end_them_heavy"},
             {"when": {"all": [HEAVY, {"set": a("want")}]}, "key": "end_want_heavy"},
             {"when": HEAVY, "key": "end_line_heavy"},
             {"when": {"all": [EQ("about", "them"), {"set": a("want")}]}, "key": "end_them"},
             {"when": {"set": a("want")}, "key": "end_want"},
             {"when": ALWAYS, "key": "end_line"}],
            [HEAVY_OFFER, {"exit": "values", "when": {"set": a("want")}}, {"exit": "recover", "when": EQ("about", "them")}]),
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
    for lst, rows in (("about", ABOUT), ("judge", JUDGMENTS), ("see", SEE), ("facts", FACTS), ("pick", PICK), ("happened", HAPPENED),
                      ("cost", COST), ("want", WANT), ("sit", SIT), ("fix", FIX), ("hands", HANDS)):
        out += [(lst, v, label, props, None) for v, label, props in rows]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "about", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded sets it down, stirred gets one pile.
    # frame `after_facts`: Do the Opposite's facts already said it doesn't fit, so no second trip to Check the Facts.
    "accepts": ["band", "frame"],
    "copy": COPY,
    "tables": {"wantFirstOf": WANT_FIRST, "feelOf": FEEL_OF},
    "derive": [{"name": "wantFirst", "from": a("about"), "table": "wantFirstOf"},
               {"name": "feelFirst", "from": a("about"), "table": "feelOf"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"],
    # The judgment chips are the person's verdicts, quoted as said (PRD MF-03 step 1): the voice check skips their words.
    "voiceQuotes": ["judge"],
}
