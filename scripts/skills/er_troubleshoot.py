"""It isn't working (DBT ER Handout 24, troubleshooting emotion regulation skills) as a skill on the runtime.

PRD ER-14 (`PRD – Emotion Regulation.md` §5; docs/design/dbt-modules-plan.md §2.3, batch ER-B1). For "I did the
skill and it didn't help": a validation line, then Handout 24's checks one tap each, and the first *yes* gets
its fix (the "first yes wins" transitions). "Didn't do it" is CORE-11's (missing links), not this.

Departures from the PRD, all listed in docs/design/er-troubleshoot.md:
- The checks stop at the first yes. The PRD lets the rest be answered after the fix; a hand-off can't go back
  into the checks without a runtime change, and one fix at a time is the point of the skill.
- No follow-up and no "last three times it was the body" read-back yet: the follow-up action is F2 (R5), and
  the read-back is an aggregate over past runs, which a live flow never reads (data layers). Reflect can show it.
- The record is `ToolSession.ext.run` (plan C1, D2), not a `SkillPractice` rep with its own fields.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "er_troubleshoot"
TOOL_ID = "er-troubleshoot"
CONCEPT = "dbt_troubleshooting"
VERSION = "et-v1-1"
OWN_MAX = 140

COPY = {
    # The validation line (absorb), before any question.
    "validate": "When a skill doesn't help, that's information. It isn't proof you can't do this.",
    "settle_first": "Things feel loud right now. You could ground yourself first.",
    # 1 · Biological vulnerability (H24: check your body; PLEASE).
    "body_title": "Could your body be turning the volume up?",
    "body_note": "Like running on little sleep, feeling ill, not eating regularly, or something you took.",
    "fix_body": "When your body is running low, feelings can get louder and skills have less to work with. Looking after one of those counts as a skill too.",
    # 2 · The right skill (H24: did the feeling fit the facts?).
    "fit_title": "Did the feeling fit the facts?",
    "fit_hint": "Some skills are for feelings that fit what happened, some for feelings that are bigger than it.",
    "fix_fit": "When a feeling fits, the move is usually the situation, or making room for the feeling.",
    "fix_fit_unsure": "Checking the facts first can show which kind of skill fits.",
    # 3 · All the way (H24: did you practise it fully?).
    "way_title": "Did you do it all the way, or partly, while still protecting yourself?",
    "way_hint": "Like going to the party, then staying in the kitchen.",
    "fix_way": "That makes sense: protecting yourself is what the feeling pushes for. A smaller step, done all the way, can help more than a big one done partly.",
    # 4 · Reinforcers (H24: is something around you rewarding the emotional behaviour?).
    "env_title": "Is something around you rewarding the old way?",
    "env_hint": "Feelings tend to stick around when they get us something.",
    "fix_env": "Then the old way is doing a job for you, and the skill is up against it. You could look for another way to get what the old way gets you.",
    # 5 · Willingness (H24: moodiness; willing or willful).
    "will_title": "Were you willing, or was part of you not up for it that day?",
    "fix_will": "That's human. Willingness comes and goes. Making room for the part that isn't up for it can come first.",
    # 6 · Overload (H24: emotional overload).
    "much_title": "Was there too much going on at once?",
    "fix_much": "When a lot is going on, one skill can get buried. Picking one thing to start with can help.",
    # 7 · Myths (H24: emotion myths; ER Handout 3).
    "belief_title": "Is a belief getting in the way?",
    "belief_hint": "Beliefs about feelings can make a skill feel pointless before it starts.",
    "safety_open": "Talk to someone now",
    "fix_belief": "Beliefs like that can feel like facts. They're beliefs, and you can look at them.",
    "fix_belief_heavy": "That sounds heavy to carry. After trying this much, it makes sense to feel it. You don't have to hold it alone.",
    # Nothing stood out.
    "none": "Nothing stood out this time. That's information too. Skills can take a few goes, and that isn't on you.",
    # v1.1 (F2's follow-up on a hand-off): a nudge to try again, on the cards whose move is another go.
    "again_q": "Want a nudge to try it again?",
    "own_hint": "Say it your way",
    "next": "Next",
    "done": "Done",
}

# Each check: (step id, field id, title, hint or None, note or None (an example, under the chips), [(value, label, props)], yes values).
# A *yes* value is one that sends the run to the check's fix; anything else goes on to the next check.
NOT_SURE = "Not sure"
CHECKS = [
    ("body", "body", "body_title", "validate", "body_note",
     [("body_yes", "Maybe, yes", {}), ("body_no", "I don't think so", {}), ("body_unsure", NOT_SURE, {})],
     ["body_yes"]),
    ("fit", "fit", "fit_title", "fit_hint", None,
     [("fit_yes", "Yes, it fit", {}), ("fit_no", "No, it was bigger than the facts", {}), ("fit_unsure", "I'm not sure", {})],
     ["fit_yes", "fit_unsure"]),
    ("way", "way", "way_title", "way_hint", None,
     [("way_all", "All the way", {}), ("way_part", "Partly", {}), ("way_unsure", NOT_SURE, {})],
     ["way_part"]),
    ("env", "env", "env_title", "env_hint", None,
     [("env_back_off", "People back off when I get angry", {}), ("env_get_out", "I get out of things when I go quiet", {}),
      ("env_step_in", "Someone steps in when I'm struggling", {}), ("env_no", "Nothing like that", {}), ("env_unsure", NOT_SURE, {})],
     ["env_back_off", "env_get_out", "env_step_in"]),
    ("will", "will", "will_title", None, None,
     [("will_yes", "I was willing", {}), ("will_not", "Part of me wasn't up for it", {}), ("will_unsure", NOT_SURE, {})],
     ["will_not"]),
    ("much", "much", "much_title", None, None,
     [("much_yes", "Yes, a lot at once", {}), ("much_no", "Not really", {}), ("much_unsure", NOT_SURE, {})],
     ["much_yes"]),
    ("belief", "belief", "belief_title", "belief_hint", None,
     [("myth_failing", "Having this feeling means I'm failing", {}),
      ("myth_past_it", "I'm meant to be past this by now", {}),
      ("myth_true", "If I feel it this strongly, it must be true", {}),
      # Hopelessness: the crisis slot shows while it's picked (plan C6.4).
      ("myth_nothing", "Nothing will ever help me", {"danger": "self"}),
      ("myth_no", "Nothing like that", {}), ("myth_unsure", NOT_SURE, {})],
     ["myth_failing", "myth_past_it", "myth_true", "myth_nothing"]),
]

HOPELESS = {"eq": ["$a.belief", "myth_nothing"]}
ALWAYS = {"all": []}  # a condition that always holds (offers and lines take one)


def _yes(field, values, own=False):
    c = {"in": [f"$a.{field}", values]}
    return {"any": [c, {"own": field}]} if own else c


def steps():
    out = []
    for i, (sid, fid, title, hint, note, _opts, yes) in enumerate(CHECKS):
        nxt = CHECKS[i + 1][0] if i + 1 < len(CHECKS) else "none"
        field = {"id": fid, "options": {"list": fid}, "max": 1, "required": True}
        step = {"id": sid, "kind": "ask", "title": title}
        if hint:
            step["hint"] = hint
        if note:
            step["note"] = note
        if sid == "body":
            # A carried flooded band (C6.2: only from a host): a quiet way to settle first; going on is the default.
            # Grounding, not cold or slow breathing: direction-safe for any state, and no medical screen needed (C6.3, C6.7).
            field["links"] = [{"exit": "five_senses", "label": "settle_first", "when": {"eq": ["$ctx.band", "flooded"]}}]
        if sid == "fit":
            transitions = [{"when": {"eq": ["$a.fit", "fit_yes"]}, "to": "fix_fit"},
                           {"when": {"eq": ["$a.fit", "fit_unsure"]}, "to": "fix_fit_unsure"}]
        elif sid == "belief":
            field["own"] = {"hint": "own_hint", "countsAsPick": True}
            # Someone to talk to is always one quiet tap away here: own words aren't read, so they can't raise the slot.
            # While Nothing will ever help me is picked, the banner above carries the same lines instead.
            field["links"] = [{"exit": "safety_open", "label": "safety_open", "when": {"not": HOPELESS}}]
            step["crisis"] = [{"variant": "crisis", "when": HOPELESS}]
            transitions = [{"when": _yes(fid, yes, own=True), "to": "fix_belief"}]
        else:
            transitions = [{"when": _yes(fid, yes), "to": f"fix_{sid}"}]
        step["fields"] = [field]
        step["next"] = transitions + [{"to": nxt}]
        out.append(step)

    def fix(sid, line, offers, again=False, **extra):
        lines = line if isinstance(line, list) else [{"when": ALWAYS, "key": line}]
        step = {"id": sid, "kind": "handoff", "complete": True, "lines": lines,
                "offers": [{"exit": x, "when": ALWAYS} for x in offers], "done": "done", **extra}
        if again:
            # The reminder chips (R5 on a hand-off): optional; leaving the card with one picked schedules try_again.
            step["fields"] = [{"id": f"again_{sid}", "label": "again_q", "max": 1, "options": {"list": "again"}}]
            step["followUp"] = {"type": "try_again", "whenFrom": f"again_{sid}"}
        return step

    out += [
        fix("fix_body", "fix_body", ["please"]),
        fix("fix_fit", "fix_fit", ["problem_solve", "mindfulness_emotions", "let_it_be"]),
        fix("fix_fit_unsure", "fix_fit_unsure", ["check_the_facts"]),
        # The PRD's move is the line itself: the skill that didn't help is the one to retry, smaller and whole.
        fix("fix_way", "fix_way", [], again=True),
        fix("fix_env", "fix_env", ["problem_solve"]),
        fix("fix_will", "fix_will", ["let_it_be"], again=True),
        fix("fix_much", "fix_much", ["problem_solve", "five_senses"], again=True),
        {**fix("fix_belief", [{"when": HOPELESS, "key": "fix_belief_heavy"}, {"when": ALWAYS, "key": "fix_belief"}],
               ["emotion_guide"], crisis=[{"variant": "crisis", "when": HOPELESS}]),
         # Hopelessness: someone to talk to, and Done; no myth cards and no reappraisal (voice.md S9, crisis speech).
         "offers": [{"exit": "safety_open", "when": HOPELESS}, {"exit": "emotion_guide", "when": {"not": HOPELESS}}]},
        fix("none", "none", ["missing_links"]),
    ]
    return out


EXITS = [
    {"id": "please", "toolId": "please-skill", "planned": True},             # ER-07 Running low (ER-B4)
    {"id": "problem_solve", "toolId": "problem-solve"},
    {"id": "check_the_facts", "toolId": "check-the-facts"},
    {"id": "let_it_be", "toolId": "let-it-be"},             # DT-04 willingness (DT-B4)
    {"id": "mindfulness_emotions", "toolId": "mindfulness-emotions", "planned": True},  # ER-08 the wave (ER-B5)
    {"id": "five_senses", "toolId": "five-senses"},                          # orienting (DT-01's orient entry)
    {"id": "emotion_guide", "toolId": "emotion-guide", "planned": True},     # ER-10 myth cards (ER-B5)
    {"id": "missing_links", "toolId": "missing-links", "planned": True},     # CORE-11 (outside the lanes)
    {"id": "safety_open", "safety": True},                                   # safety.open (R6)
    {"id": "done", "done": True},
]


# The try_again follow-up's window chips (scripts/practice-spine/content.py). Kept vague: no dates.
AGAIN = [("today", "Tonight"), ("tomorrow", "Tomorrow"), ("this_week", "Later this week")]


def options():
    out = [(fid, v, label, props, None) for _s, fid, _t, _h, _l, opts, _y in CHECKS for v, label, props in opts]
    return out + [("again", v, label, {}, None) for v, label in AGAIN]


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "body", "ownMax": OWN_MAX,
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": steps(), "exits": EXITS, "options": options(),
    "emotionFields": [],
}
