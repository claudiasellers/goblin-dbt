"""Let it be (DT-04; radical acceptance, turning the mind, willingness, willing hands: DBT DT Handouts 10-14,
Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD DT-04 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): the problem has been checked and it can't be changed now; what's left is the fight
with it (replaying, "it shouldn't be this way", bitterness, checking for a change, going numb). Validation comes first:
the fight makes sense. Then what there is to accept, a check that it isn't still happening, the fight noticed, willing
or willful (and, if willful, what letting it be seems to threaten, each met with its own line and the one distinction:
accepting isn't approving, and it isn't giving up on what can change), the body (willing hands), one acceptance
statement in their words or ours, room for grief, what's still in their hands, and the close on *the fight with it*.
docs/design/let-it-be.md lists what this batch defers (the turning-the-mind card and its reminders, the acceptance
target, the inline entries for FAST's Let go and Recover) and where it departs from the PRD.

Safety (plan C6):
- **Never acceptance of ongoing harm.** A person- or harm-related thing asks once: *Is this still happening to you?*
  Yes or sometimes opens the `other_person` crisis slot for the rest of the run, says *Accepting that it happened isn't
  accepting you have to stay in it*, offers Ending a relationship that's hurting you (careful frame), and goes on only
  for what already happened.
- **Never the first thing for something changeable.** From the Tools list, the first question is whether it's been
  checked; *not sure* points to Problem Solve first, with *continue anyway*.
- **Flooded: the body first** (a heads-up and DT-01, with *try anyway*; not a safety matter, so nothing locks).
  Stirred gets the short path (the PRD's ★ steps). No band is asked (C6.2).
- **Grief is allowed and has a way out**: *It's a lot right now* goes to First, the body, never back into the flow.
- **The half-smile is never required** (masking histories): one optional line on the willing hands card.
- *Talk to someone now* on every screen; *This is too much right now* under every screen (the player).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "let_it_be"
TOOL_ID = "let-it-be"
CONCEPT = "dbt_radical_acceptance"
VERSION = "lb-v1"
OWN_MAX = 120  # what's to accept, or a statement, in their words

COPY = {
    # From the Tools list (PRD risks: premature acceptance of something changeable).
    "checked_title": "Have you checked whether any of this can change?",
    "checked_hint": "Letting it be is for the part that can't change right now.",
    "check_first_title": "It can help to sort what might change from what can't, first.",
    "check_first_hint": "Problem Solve does that sorting. You can come back here after.",
    "check_first_ps": "Look at it with Problem Solve",
    # A carried flooded reading (PRD: heads-up + DT-01 first, with *try anyway*).
    "heads_up_title": "This works better once your body's quieter.",
    "heads_up_hint": "You can settle your body first, or try it now.",
    "settle_line": "Body first. Let it be is here when you're ready.",
    # Step 1-2: the witness line (the PRD's own words), then what's to accept.
    "what_title": "It makes sense you're fighting this. It matters to you. What is it you can't change?",
    "what_hint": "Pick the closest, or say it your way.",
    "what_own": "Say it my way",
    # The danger check (PRD step 2), once, for person- or harm-related things.
    "still_title": "Is this still happening to you?",
    "still_hint": "Letting it be is never about staying somewhere you're being hurt.",
    "still_line_title": "Accepting that it happened isn't accepting you have to stay in it.",
    "still_line_hint": "If you're not safe, the support is on this screen. Ending a relationship that's hurting you can help you think it through.",
    "still_ending": "Ending a relationship that's hurting you",
    # Step 3: notice the fight, willing or willful, what letting it be seems to threaten.
    "fight_title": "How does the fight with it show up?",
    "fight_hint": "Pick any that fit.",
    "willing_title": "Right now, are you willing to let it be, or digging in against it?",
    "willing_hint": "Digging in makes sense. It's how we protect what matters.",
    "threat_title": "What feels like it would happen if you let this be?",
    "threat_hint": "Pick the closest.",
    "threat_they_win": "Letting it be isn't saying they were right. It's choosing where your energy goes.",
    "threat_my_fault": "Accepting that it happened isn't accepting the blame. Causes aren't the same as fault.",
    "threat_never_change": "Accepting what's true now leaves room for what can still change.",
    "threat_alone": "You can let this be and still reach for people. Letting it be isn't letting go of everyone.",
    "threat_lose_myself": "Letting it be doesn't take away what you care about. That stays yours.",
    "threat_other": "That fear makes sense. Letting it be is something you do, and you can do it a little at a time.",
    "threat_line_hint": "Accepting isn't approving. It isn't giving up on what can change.",
    # Step 4: the body (willing hands, DT Handout 14).
    "hands_title": "Willing hands. Let your body practise letting it be.",
    "hands_step1": "Sit or stand, arms loose by your sides or in your lap.",
    "hands_step2": "Turn your palms up. Let your fingers relax.",
    "hands_step3": "Breathe however you breathe. Let your hands stay open.",
    # Half-smile offered, never required (PRD open question 1; masking histories).
    "hands_caution": "If it feels right, let your face soften too. You don't have to smile.",
    "hands_start": "Start",
    "hands_running": "Hands open",
    "hands_done": "That's it. Your hands did it.",
    # Step 5: one acceptance statement.
    "statement_title": "Pick the words that fit, or write your own.",
    "statement_hint": "One is enough.",
    "statement_own": "In my words",
    "card_title": "Read it once, slowly.",
    "card_next": "Next",
    # Step 6: let grief in.
    "grief_title": "If sadness comes, it's allowed. It isn't going backwards.",
    "grief_hint": "Letting it be can make room for the sad part.",
    "heart_title": "Hand on your heart.",
    "heart_step1": "Rest one hand on your chest, over your heart.",
    "heart_step2": "Feel the warmth of your hand.",
    "heart_step3": "Stay as long as feels okay.",
    "heart_start": "Start",
    "heart_running": "Hand on heart",
    "heart_done": "That's it.",
    "too_much_line": "That's a lot. Let's look after your body first.",
    # Step 7: what's still in my hands.
    "hands_still_title": "What's still in your hands?",
    "hands_still_hint": "One thing is plenty. None is okay too.",
    # Step 8: the close, on the fight with it (then-vs-now, asked in the flow).
    "close_title": "Compared to when you started, the fight with it is…",
    # The end card.
    "end_need": "Your need is still real. It can be met somewhere else.",
    "end_boundary": "One line to hold your ground, for the next time.",
    "end_small": "Pick one small thing that matters to you, and do it today.",
    "end_body": "Look after your body tonight: rest, water, being gentle with yourself.",
    "end_nothing": "Nothing right now is okay. Letting it be was the thing.",
    "end_line": "You let it be, for now. You can come back to this whenever the fight starts again.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
STIRRED = {"eq": ["$ctx.band", "stirred"]}
SHORT = {"any": [STIRRED, {"eq": [a("heads_up"), "anyway"]}]}  # the PRD's ★ path
STILL = {"in": [a("still"), ["yes", "sometimes"]]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
CRISIS = [{"variant": "other_person", "when": STILL}]

# PRD step 2's categories. `ask_still`: person- or harm-related, so the danger check asks once.
WHAT = [
    ("happened", "It happened, and I can't make it not have happened", True),
    ("wont_change", "They won't change", True),
    ("wont_give", "They won't give me this", True),
    ("lost", "I lost something or someone", False),
    ("limit", "A limit: my body, money or time", False),
    ("unfair", "Something unfair", True),
]
CATS = [v for v, _, _ in WHAT]
OWN_WHAT = {"not": {"in": [a("what"), CATS]}}
ASK_STILL = {"any": [{"in": [a("what"), [v for v, _, s in WHAT if s]]}, OWN_WHAT]}
CHECKED = [
    ("yes", "Yes, it can't change right now"),
    ("unsure", "Not sure"),
]
CHECK_FIRST = [("anyway", "Continue anyway")]
HEADS_UP = [
    ("body", "My body first"),
    ("anyway", "Try it now"),
]
STILL_OPTS = [
    ("no", "No, it's in the past", {}),
    ("yes", "Yes", {"danger": "other"}),
    ("sometimes", "Sometimes", {"danger": "other"}),
]
STILL_GO = [("go_on", "Go on, for what's already happened")]
# PRD step 3: non-acceptance signs (NonAcceptanceSign).
FIGHT = [
    ("replay", "Replaying it"),
    ("shouldnt", "\"It shouldn't be this way\""),
    ("bitter", "Bitter"),
    ("checking", "Checking for a change"),
    ("arguing", "Arguing in my head"),
    ("numb", "Going numb"),
    ("cant_tell", "Can't tell"),
]
WILLING = [
    ("willing", "Willing"),
    ("willful", "Digging in"),
    ("unsure", "Not sure"),
]
# WillfulnessThreat, each with its own validating line (`threat_<id>`).
THREAT = [
    ("they_win", "It means they win"),
    ("my_fault", "It means it was my fault"),
    ("never_change", "It means it'll never change"),
    ("alone", "I'll be alone"),
    ("lose_myself", "I'll lose myself"),
    ("other", "Something else"),
]
# AcceptanceStatement FOR_CATEGORY: category-matched first, the three PRD lines for every category.
EVERY = [*CATS, "own"]
STATEMENTS = [
    ("what_happened", "This is what happened.", EVERY),
    ("causes", "It has causes, even ones I hate.", EVERY),
    ("next", "I can't change it. I can change what I do next.", EVERY),
    ("cant_undo", "It happened. I can't make it not have happened.", ["happened"]),
    ("who_they_are", "They are who they are right now. I can't make them change.", ["wont_change"]),
    ("need_real", "I may not get this from them. My need is still real.", ["wont_give"]),
    ("it_mattered", "It hurts because it mattered.", ["lost"]),
    ("limit_now", "This is a limit I'm living with right now.", ["limit"]),
    ("unfair_true", "It isn't fair, and it's still what happened.", ["unfair"]),
]
LANDED = [
    ("helps", "That helps"),
    ("not_really", "Not really"),
]
GRIEF = [
    ("ok", "Okay"),
    ("heart", "Hand on my heart"),
    ("much", "It's a lot right now"),
]
# StillInMyHands ROUTES_TO a tool (PRD step 7).
HANDS_STILL = [
    ("need", "Meet the need somewhere else"),
    ("boundary", "A line to hold my ground"),
    ("small", "One small thing that matters to me"),
    ("body", "Look after my body tonight"),
    ("nothing", "Nothing right now, and that's okay"),
]
TVN = [("worse", "Louder"), ("same", "About the same"), ("better", "Quieter"), ("much_better", "Much quieter")]

PER_CAT = {"any": [
    *[{"all": [{"eq": [a("what"), c]}, {"eq": [f"$opt.{c}", True]}]} for c in CATS],
    {"all": [OWN_WHAT, {"eq": ["$opt.own", True]}]},
]}
THREAT_LINES = [{"when": {"eq": [a("threat"), v]}, "key": f"threat_{v}"} for v, _ in THREAT]


def ask(step_id, title, hint, field, lst, nxt, *, max_=1, required=True, own=None, links=(), where=None, extra=None):
    f = {"id": field, "options": {"list": lst, **({"where": where} if where else {})}, "max": max_, "required": required,
         "links": [*links, SAFETY_LINK]}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    s = {"id": step_id, "kind": "ask", "title": title, "crisis": CRISIS, "fields": [f], "next": nxt}
    if hint:
        s["hint"] = hint
    return {**s, **(extra or {})}


def card(step_id, title, kind, seconds, prefix, nxt):
    return {"id": step_id, "kind": "embed", "embed": "bodyCard", "title": title, "crisis": CRISIS, "links": [SAFETY_LINK],
            "props": {"kind": kind, "seconds": seconds, "step1": f"{prefix}_step1", "step2": f"{prefix}_step2",
                      "step3": f"{prefix}_step3", **({"caution": "hands_caution"} if prefix == "hands" else {}),
                      "start": f"{prefix}_start", "running": f"{prefix}_running", "done": f"{prefix}_done", "next": "next"},
            "next": nxt}


AFTER_STATEMENT = [{"when": SHORT, "to": "hands_still"}, {"to": "grief"}]

STEPS = [
    ask("checked", "checked_title", "checked_hint", "checked", "checked",
        [{"when": {"eq": [a("checked"), "unsure"]}, "to": "check_first"}, {"when": FLOODED, "to": "heads_up"},
         {"to": "what"}]),
    ask("check_first", "check_first_title", "check_first_hint", "check_first", "check_first",
        [{"when": FLOODED, "to": "heads_up"}, {"to": "what"}],
        links=[{"exit": "problem_solve", "label": "check_first_ps", "when": ALWAYS}]),
    ask("heads_up", "heads_up_title", "heads_up_hint", "heads_up", "heads_up",
        [{"when": {"eq": [a("heads_up"), "body"]}, "to": "settle"}, {"to": "what"}]),
    ask("what", "what_title", "what_hint", "what", "what",
        [{"when": ASK_STILL, "to": "still"}, {"when": SHORT, "to": "hands"}, {"to": "fight"}], own="what_own"),
    ask("still", "still_title", "still_hint", "still", "still",
        [{"when": STILL, "to": "still_line"}, {"when": SHORT, "to": "hands"}, {"to": "fight"}]),
    # Still happening: the line, the support on the screen (the crisis slot), Ending in its careful frame, and the
    # way on for what's already happened only.
    ask("still_line", "still_line_title", "still_line_hint", "still_go", "still_go",
        [{"when": SHORT, "to": "hands"}, {"to": "fight"}],
        links=[{"exit": "ending", "label": "still_ending", "when": ALWAYS}]),
    ask("fight", "fight_title", "fight_hint", "fight", "fight", [{"to": "willing"}], max_=4),
    ask("willing", "willing_title", "willing_hint", "willing", "willing",
        [{"when": {"eq": [a("willing"), "willful"]}, "to": "threat"}, {"to": "hands"}]),
    ask("threat", "threat_title", "threat_hint", "threat", "threat", [{"to": "threat_line"}]),
    # Each threat met with its own line, then the one distinction (PRD step 3). Whether it landed is optional: Next
    # goes on either way.
    ask("threat_line", THREAT_LINES, "threat_line_hint", "landed", "landed", [{"to": "hands"}], required=False),
    card("hands", "hands_title", "willing", 45, "hands", [{"to": "statement"}]),
    ask("statement", "statement_title", "statement_hint", "statement", "statement", [{"to": "statement_card"}],
        own="statement_own", where=PER_CAT),
    {
        # The statement on paper, read once (copyable: it's theirs to keep).
        "id": "statement_card", "kind": "embed", "embed": "boundaryLine", "title": "card_title", "crisis": CRISIS,
        "links": [SAFETY_LINK], "props": {"field": "statement", "shape": "line", "next": "card_next"},
        "next": AFTER_STATEMENT,
    },
    ask("grief", "grief_title", "grief_hint", "grief", "grief",
        [{"when": {"eq": [a("grief"), "heart"]}, "to": "heart"}, {"when": {"eq": [a("grief"), "much"]}, "to": "too_much"},
         {"to": "hands_still"}]),
    card("heart", "heart_title", "hand_heart", 30, "heart", [{"to": "hands_still"}]),
    ask("hands_still", "hands_still_title", "hands_still_hint", "hands_still", "hands_still", [{"to": "close"}]),
    ask("close", "close_title", None, "close", "tvn", [{"to": "end"}]),
    {
        "id": "end", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [
            *[{"when": {"eq": [a("hands_still"), v]}, "key": f"end_{v}"} for v, _ in HANDS_STILL],
            {"when": ALWAYS, "key": "end_line"},
        ],
        "offers": [
            {"exit": "recover", "when": {"eq": [a("hands_still"), "need"]}},
            {"exit": "fast", "when": {"eq": [a("hands_still"), "boundary"]}},
            {"exit": "good_things", "when": {"eq": [a("hands_still"), "small"]}},
            {"exit": "please_skill", "when": {"eq": [a("hands_still"), "body"]}},
        ],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Grief flooding (PRD step 6): the body first, no close.
        "id": "too_much", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "too_much_line"}],
        "offers": [{"exit": "cool_down", "when": ALWAYS}, {"exit": "soothe", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        "id": "settle", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "settle_line"}],
        "offers": [{"exit": "cool_down", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
]
# The close is asked in the flow (`askFresh: 'thenVsNow'`, as First, the body): on *the fight with it*.
STEPS[[s["id"] for s in STEPS].index("close")]["fields"][0]["askFresh"] = "thenVsNow"

EXITS = [
    {"id": "problem_solve", "toolId": "problem-solve"},                  # ER-12: check what can change first
    {"id": "ending", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # IE-08, still happening
    {"id": "recover", "toolId": "recovering-from-invalidation"},         # meet the need somewhere else (WMP)
    {"id": "fast", "toolId": "fast"},                                    # IE-05 a line to hold your ground
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body
    {"id": "good_things", "toolId": "good-things", "planned": True},     # ER-04 (ER-B4)
    {"id": "please_skill", "toolId": "please-skill", "planned": True},   # ER-07 Running low (ER-B4)
    {"id": "soothe", "toolId": "soothe", "planned": True},               # DT-07 Held (grief)
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("checked", v, label, {}, None) for v, label in CHECKED]
    out += [("check_first", v, label, {}, None) for v, label in CHECK_FIRST]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("what", v, label, {}, "AcceptanceCategory") for v, label, _ in WHAT]
    out += [("still", v, label, props, None) for v, label, props in STILL_OPTS]
    out += [("still_go", v, label, {}, None) for v, label in STILL_GO]
    out += [("fight", v, label, {}, "NonAcceptanceSign") for v, label in FIGHT]
    out += [("willing", v, label, {}, None) for v, label in WILLING]
    out += [("threat", v, label, {}, "WillfulnessThreat") for v, label in THREAT]
    out += [("landed", v, label, {}, None) for v, label in LANDED]
    out += [("statement", v, label, {c: True for c in cats}, "AcceptanceStatement") for v, label, cats in STATEMENTS]
    out += [("grief", v, label, {}, None) for v, label in GRIEF]
    out += [("hands_still", v, label, {}, "StillInMyHands") for v, label in HANDS_STILL]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "checked", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first, stirred the short path.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
