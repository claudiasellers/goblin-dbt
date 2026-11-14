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
target, the inline entry for Recover; FAST's Let go runs it inline since IE-B4) and where it departs from the PRD.

Safety (plan C6):
- **Never acceptance of ongoing harm.** A person- or harm-related thing asks once: *Is anyone still hurting you, or could this happen to you again?*
  Anything but no opens the `other_person` crisis slot for the rest of the run, says *Accepting that it happened isn't
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
    "checked_title": "Some things can change and some can't. Have you looked at which this is?",
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
    # The willingness entry (DT Handout 13; `?enterAt=willingness`, the Tools intent *I keep digging in against
    # something*): willingness is doing what the moment needs, so it skips the changeability check and the statement.
    "what_title_willing": "It makes sense to dig in when something matters. What are you pushing against?",
    # Inline (R8, inside FAST's Let go): the way back out, named apart from the safety screen's *Back to where I was*.
    "inline_back": "Leave this for now",
    # The danger check (PRD step 2), once, for person- or harm-related things.
    "still_title": "Is anyone still hurting you, or could this happen to you again?",
    "still_hint": "Letting it be is never about staying somewhere you're being hurt.",
    "still_line_title": "Accepting that it happened isn't accepting you have to stay in it.",
    "still_line_hint": "If you're not safe, the support is on this screen. If it's someone close to you, Ending a relationship that's hurting you can help you think it through.",
    "still_stop_line": "Stopping here is okay. The support stays here for you.",
    "still_ending": "Ending a relationship that's hurting you",
    # Step 3: notice the fight, willing or willful, what letting it be seems to threaten.
    "fight_title": "How does the fight with it show up?",
    "fight_hint": "Pick up to four.",
    "willing_title": "Right now, are you willing to let it be, or digging in against it?",
    "willing_hint": "Digging in makes sense. It's how we protect what matters.",
    "threat_title": "What feels like it would happen if you let this be?",
    "threat_hint": "Pick the closest.",
    "threat_they_win": "That makes sense. Letting it be isn't saying they were right. It's choosing where your energy goes.",
    "threat_my_fault": "That fear makes sense. Accepting that it happened isn't taking the blame. Causes aren't the same as fault.",
    "threat_never_change": "That fear makes sense. Accepting what's true now leaves room for what can still change.",
    "threat_alone": "Of course that's scary. You can let this be and still reach for people.",
    "threat_lose_myself": "That makes sense. Letting it be doesn't take away what you care about. That stays yours.",
    "threat_other": "That fear makes sense. Letting it be is something you do, and you can do it a little at a time.",
    "threat_line_hint": "Accepting isn't approving. It isn't giving up on what can change.",
    # Step 4: the body (willing hands, DT Handout 14).
    "hands_title": "Willing hands. Let your body practise letting it be.",
    "hands_step1": "Sit or stand, arms loose by your sides or in your lap.",
    "hands_step2": "Turn your palms up, or rest them however feels safe. Let your fingers relax.",
    "hands_step3": "Breathe however you breathe. Let your hands stay open.",
    # Half-smile offered, never required (PRD open question 1; masking histories).
    "hands_caution": "If it feels right, let your face soften too. You don't have to smile.",
    "hands_start": "Start",
    "hands_running": "Hands open",
    "hands_done": "That's it. Your hands did it.",
    # Step 5: one acceptance statement.
    "statement_title": "Pick the words that fit, or write your own.",
    "statement_hint": "Accepting isn't approving. It isn't giving up on what can change. One line is enough.",
    "statement_own": "In my words",
    "card_title": "Read it once, slowly.",
    "card_next": "Next",
    "card_copy": "Copy",
    "card_copied": "Copied",
    "card_selected": "The line is selected, ready to copy.",
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
    # Then the cue and the turning-the-mind reminder (DT-04 part 2; DT Handout 12: turn it again, and again).
    "cue_title": "When does the fight with it tend to come back?",
    "cue_hint": "Knowing when helps you catch it. Skipping is fine.",
    "remind_title": "Want a reminder to turn your mind, around then?",
    "remind_hint": "It takes about a minute. The reminder never says what it's about.",
    # Turning the mind (the fork, then their statement, then willing hands for ten seconds).
    "turn_title": "Turn your mind toward letting it be.",
    "turn_hint": "Each turn leaves a footprint. The mind turns back, and you turn it again.",
    "turn_turn": "Turn toward letting it be",
    "turn_again": "Turn it again",
    "turn_turned": "Turned. If it drifts back, turn it again.",
    "turn_fight": "The fight",
    "turn_let": "Letting it be",
    "turn_sr": "Tap to turn the figure toward the path of letting it be. Each turn leaves a footprint.",
    "turn_done": "That's enough turns for now",
    "turn_skip": "Go on without turning",
    "turn_card_title": "Your words, once more.",
    "turn_hands_title": "Willing hands, for a few breaths.",
    # A reminder reopened the run (`turn_mind`): the fight may be back.
    "back_title": "The fight with it might be back. Turn your mind for a minute?",
    "back_hint": "You've turned it before. Every turn counts.",
    "back_title_still": "The fight with what already happened might be back. Turn your mind for a minute?",
    "remind_again_title": "Want another reminder?",
    "turn_end_line": "You turned your mind. When it drifts back, you can turn it again.",
    "rest_line": "Then let it rest. Let it be is here whenever the fight comes back.",
    # The end card.
    "end_need": "Your need is still real. It can be met somewhere else.",
    "end_boundary": "One line to hold your ground, for the next time.",
    "end_small": "Pick one small thing that matters to you, and do it today.",
    "end_body": "Look after your body tonight: rest, water, being gentle with yourself.",
    "end_nothing": "Doing nothing more today is okay. Letting it be was enough.",
    "end_louder": "The fight's loud right now. That happens with hard things. You can come back to this anytime.",
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
WILLINGNESS = {"eq": ["$ctx.enterAt", "willingness"]}  # the willingness entry: what → willing → hands → still in my hands
TURN = {"eq": ["$ctx.enterAt", "turn"]}  # the turning-the-mind entry: what → (still) → the fork → the statement → hands
REMIND_CHIPS = ["tonight", "tomorrow", "few_days"]  # turn_mind's window chips
STILL = {"in": [a("still"), ["yes", "sometimes", "unsure"]]}  # anything uncertain is the safety branch
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
    ("no", "No, I'm safe from it now", {}),
    ("yes", "Yes", {"danger": "other"}),
    ("sometimes", "Sometimes", {"danger": "other"}),
    ("unsure", "I'm not sure", {"danger": "other"}),
]
STILL_GO = [("go_on", "Go on, for what's already happened"), ("stop", "Stop here for now")]
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
    ("who_they_are", "They are who they are right now. I can't make them change.", ["wont_change"], "person"),
    ("need_real", "I may not get this from them. My need is still real.", ["wont_give"], "person"),
    # Still happening: never a line that reads as accepting more of it (Gate 3).
    ("wasnt_okay", "It happened, and it wasn't okay.", [], "still"),
    ("not_more", "Accepting what happened isn't agreeing to more of it.", [], "still"),
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
# When the fight comes back (PRD step 8). A time cue puts that reminder chip first.
CUES = [
    ("night", "At night"),
    ("page", "When I see their page"),
    ("alone", "When I'm alone"),
    ("mentioned", "When it's mentioned"),
    ("dont_know", "I don't know"),
]
REMIND = [
    ("tonight", "Tonight"),
    ("tomorrow", "Tomorrow"),
    ("few_days", "In a few days"),
]  # skipping is no reminder
TURN_BACK = [
    ("now", "Turn it now"),
    ("not_now", "Not now"),
    ("rest", "It's quieter. Let it rest"),
]

PER_CAT = {"any": [
    *[{"all": [{"eq": [a("what"), c]}, {"eq": [f"$opt.{c}", True]}]} for c in CATS],
    {"all": [OWN_WHAT, {"eq": ["$opt.own", True]}]},
]}
# Category-matched, minus the person lines while it's still happening; plus the still lines then.
STATEMENT_WHERE = {"any": [
    {"all": [STILL, {"eq": ["$opt.still", True]}]},
    {"all": [PER_CAT, {"not": {"all": [STILL, {"eq": ["$opt.person", True]}]}}]},
]}
THREAT_LINES = [{"when": {"eq": [a("threat"), v]}, "key": f"threat_{v}"} for v, _ in THREAT]


def ask(step_id, title, hint, field, lst, nxt, *, max_=1, required=True, own=None, links=(), where=None, extra=None,
        field_extra=None):
    f = {"id": field, "options": {"list": lst, **({"where": where} if where else {}), **(field_extra or {})}, "max": max_,
         "required": required, "links": [*links, SAFETY_LINK]}
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


def fork(step_id, nxt):
    """Turning the mind (Handout 12): the fork, each turn a footprint on the letting-it-be path (`turnFork`)."""
    return {"id": step_id, "kind": "embed", "embed": "turnFork", "answerAs": step_id, "title": "turn_title",
            "hint": "turn_hint", "crisis": CRISIS, "links": [SAFETY_LINK],
            "props": {"turn": "turn_turn", "again": "turn_again", "turnedLine": "turn_turned", "fightLabel": "turn_fight",
                      "letLabel": "turn_let", "hint": "turn_sr", "done": "turn_done", "skip": "turn_skip"},
            "next": nxt}


def line_card(step_id, to):
    """Their statement on paper, once more (the turn's second beat)."""
    return {"id": step_id, "kind": "embed", "embed": "boundaryLine", "title": "turn_card_title", "crisis": CRISIS,
            "links": [SAFETY_LINK], "props": {"field": "statement", "shape": "line", "next": "card_next",
                                            "copyLabel": "card_copy", "copiedLabel": "card_copied", "selectedLabel": "card_selected"},
            "next": [{"to": to}]}


AFTER_STATEMENT = [{"when": SHORT, "to": "hands_still"}, {"to": "grief"}]

STEPS = [
    ask("checked", "checked_title", "checked_hint", "checked", "checked",
        [{"when": {"eq": [a("checked"), "unsure"]}, "to": "check_first"}, {"when": FLOODED, "to": "heads_up"},
         {"to": "what"}]),
    ask("check_first", "check_first_title", "check_first_hint", "check_first", "check_first",
        [{"when": FLOODED, "to": "heads_up"}, {"to": "what"}],
        links=[{"exit": "problem_solve", "label": "check_first_ps", "when": ALWAYS}]),
    ask("heads_up", "heads_up_title", "heads_up_hint", "heads_up", "heads_up",
        [{"when": {"eq": [a("heads_up"), "body"]}, "to": "settle"},
         # The willingness and turn entries ask what it's about first, so a flooded reading meets the heads-up after it.
         {"when": {"all": [{"any": [WILLINGNESS, TURN]}, {"set": a("what")}, ASK_STILL]}, "to": "still"},
         {"when": {"all": [WILLINGNESS, {"set": a("what")}]}, "to": "willing"},
         {"when": {"all": [TURN, {"set": a("what")}]}, "to": "turn"}, {"to": "what"}]),
    ask("what", [{"when": WILLINGNESS, "key": "what_title_willing"}, {"key": "what_title"}], "what_hint", "what", "what",
        [{"when": {"all": [{"any": [WILLINGNESS, TURN]}, FLOODED, {"not": {"set": a("heads_up")}}]}, "to": "heads_up"},
         {"when": ASK_STILL, "to": "still"}, {"when": WILLINGNESS, "to": "willing"}, {"when": TURN, "to": "turn"},
         {"when": SHORT, "to": "hands"}, {"to": "fight"}], own="what_own"),
    ask("still", "still_title", "still_hint", "still", "still",
        [{"when": STILL, "to": "still_line"}, {"when": WILLINGNESS, "to": "willing"}, {"when": TURN, "to": "turn"},
         {"when": SHORT, "to": "hands"}, {"to": "fight"}]),
    # Still happening: the line, the support on the screen (the crisis slot), Ending in its careful frame, and the
    # way on for what's already happened only.
    ask("still_line", "still_line_title", "still_line_hint", "still_go", "still_go",
        [{"when": {"eq": [a("still_go"), "stop"]}, "to": "still_stop"}, {"when": WILLINGNESS, "to": "willing"},
         {"when": TURN, "to": "turn"},
         {"when": SHORT, "to": "hands"}, {"to": "fight"}],
        links=[{"exit": "ending", "label": "still_ending", "when": ALWAYS}]),
    ask("fight", "fight_title", "fight_hint", "fight", "fight", [{"to": "willing"}], max_=4),
    ask("willing", "willing_title", "willing_hint", "willing", "willing",
        [{"when": {"eq": [a("willing"), "willful"]}, "to": "threat"}, {"to": "hands"}]),
    ask("threat", "threat_title", "threat_hint", "threat", "threat", [{"to": "threat_line"}]),
    # Each threat met with its own line, then the one distinction (PRD step 3). Whether it landed is optional: Next
    # goes on either way.
    ask("threat_line", THREAT_LINES, "threat_line_hint", "landed", "landed", [{"to": "hands"}], required=False),
    card("hands", "hands_title", "willing", 45, "hands", [{"when": WILLINGNESS, "to": "hands_still"}, {"to": "statement"}]),
    ask("statement", "statement_title", "statement_hint", "statement", "statement",
        [{"when": TURN, "to": "turn_card"}, {"to": "statement_card"}], own="statement_own", where=STATEMENT_WHERE),
    {
        # The statement on paper, read once (copyable: it's theirs to keep).
        "id": "statement_card", "kind": "embed", "embed": "boundaryLine", "title": "card_title", "crisis": CRISIS,
        "links": [SAFETY_LINK], "props": {"field": "statement", "shape": "line", "next": "card_next",
                                        "copyLabel": "card_copy", "copiedLabel": "card_copied", "selectedLabel": "card_selected"},
        "next": AFTER_STATEMENT,
    },
    ask("grief", "grief_title", "grief_hint", "grief", "grief",
        [{"when": {"eq": [a("grief"), "heart"]}, "to": "heart"}, {"when": {"eq": [a("grief"), "much"]}, "to": "too_much"},
         {"to": "hands_still"}]),
    card("heart", "heart_title", "hand_heart", 30, "heart", [{"to": "hands_still"}]),
    ask("hands_still", "hands_still_title", "hands_still_hint", "hands_still", "hands_still", [{"to": "close"}]),
    ask("close", "close_title", None, "close", "tvn", [{"when": {"eq": [a("close"), "worse"]}, "to": "end"}, {"to": "cue"}]),
    # When the fight comes back, and a reminder to turn the mind then (PRD step 8; Handout 12). Both skippable.
    ask("cue", "cue_title", "cue_hint", "cue", "cue", [{"to": "remind"}], required=False),
    ask("remind", "remind_title", "remind_hint", "remind", "remind", [{"to": "end"}], required=False,
        extra={"followUp": {"type": "turn_mind", "whenFrom": "remind", "when": {"in": [a("remind"), REMIND_CHIPS]}}},
        field_extra={"firstFrom": "$d.cueChip"}),
    # Turning the mind (the `turn` entry, from Problem Solve or a Tools card): the fork, the statement, the hands.
    fork("turn", [{"when": {"set": a("statement")}, "to": "turn_card"}, {"to": "statement"}]),
    line_card("turn_card", "turn_hands"),
    card("turn_hands", "turn_hands_title", "willing", 10, "hands", [{"to": "close"}]),
    # A reminder reopened the run: the fork again, their statement if they had one, the hands, another reminder.
    ask("turn_back", [{"when": STILL, "key": "back_title_still"}, {"key": "back_title"}], "back_hint", "turn_back", "turn_back",
        [{"when": {"eq": [a("turn_back"), "rest"]}, "to": "rest_end"},
         {"when": {"eq": [a("turn_back"), "not_now"]}, "to": "remind_again"}, {"to": "turn_again"}],
        extra={"reopens": {"after": "remind", "again": ["remind_again"]}, "clears": ["turn_back", "remind_again"]}),
    fork("turn_again", [{"when": {"set": a("statement")}, "to": "turn_card_again"}, {"to": "turn_hands_again"}]),
    line_card("turn_card_again", "turn_hands_again"),
    card("turn_hands_again", "turn_hands_title", "willing", 10, "hands", [{"to": "remind_again"}]),
    ask("remind_again", "remind_again_title", "remind_hint", "remind_again", "remind", [{"to": "turn_end"}], required=False,
        extra={"followUp": {"type": "turn_mind", "whenFrom": "remind_again", "when": {"in": [a("remind_again"), REMIND_CHIPS]}}}),
    {
        "id": "end", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [
            {"when": {"eq": [a("close"), "worse"]}, "key": "end_louder"},
            *[{"when": {"eq": [a("hands_still"), v]}, "key": f"end_{v}"} for v, _ in HANDS_STILL],
            {"when": ALWAYS, "key": "end_line"},
        ],
        "offers": [
            {"exit": "cool_down", "when": {"eq": [a("close"), "worse"]}},
            {"exit": "recover", "when": {"eq": [a("hands_still"), "need"]}},
            {"exit": "fast", "when": {"eq": [a("hands_still"), "boundary"]}},
            {"exit": "good_things", "when": {"eq": [a("hands_still"), "small"]}},
            {"exit": "please_skill", "when": {"eq": [a("hands_still"), "body"]}},
            # The willful threat (PRD DT-04 step 3) as a thought to watch, not argue with (DT-08).
            # Not after Louder: the body first (First, the body above).
            {"exit": "thoughts", "when": {"all": [{"set": a("threat")}, {"not": {"eq": [a("close"), "worse"]}}]}},
        ],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # A reopened turn: the close is asked as the visit closes (the spine's then-vs-now on the fight).
        "id": "turn_end", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "turn_end_line"}], "offers": [], "done": "done", "links": [SAFETY_LINK],
    },
    {
        "id": "rest_end", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "rest_line"}], "offers": [], "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Grief flooding (PRD step 6): the body first, no close.
        "id": "too_much", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "too_much_line"}],
        "offers": [{"exit": "cool_down", "when": ALWAYS}, {"exit": "soothe", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Still happening, and they stop here: the support stays, no close.
        "id": "still_stop", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "still_stop_line"}],
        "offers": [{"exit": "ending", "when": ALWAYS}],
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
    {"id": "thoughts", "toolId": "thoughts-passing"},                    # DT-08: the threat as a thought
    {"id": "ending", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # IE-08, still happening
    {"id": "recover", "toolId": "recovering-from-invalidation"},         # meet the need somewhere else (WMP)
    {"id": "fast", "toolId": "fast"},                                    # IE-05 a line to hold your ground
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body
    {"id": "good_things", "toolId": "good-things"},                      # ER-04 Good things
    {"id": "please_skill", "toolId": "please-skill"},                    # ER-07 Running low
    {"id": "soothe", "toolId": "soothe"},                                # DT-07 Held (grief)
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
    out += [("statement", v, label, {**{c: True for c in cats}, **{f: True for f in flag}}, "AcceptanceStatement")
            for v, label, cats, *flag in STATEMENTS]
    out += [("grief", v, label, {}, None) for v, label in GRIEF]
    out += [("hands_still", v, label, {}, "StillInMyHands") for v, label in HANDS_STILL]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    out += [("cue", v, label, {}, None) for v, label in CUES]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("turn_back", v, label, {}, None) for v, label in TURN_BACK]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "checked", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first, stirred the short path.
    "accepts": ["band", "enterAt"],
    # Page entries: the willingness entry (the Tools intent, DT Handout 13) starts at what it's about.
    "entries": {"willingness": "what", "turn": "what"},
    "copy": COPY, "tables": {"cueChip": {"night": "tonight"}},
    "derive": [{"name": "cueChip", "from": a("cue"), "table": "cueChip"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
    # R8, IE-B4: FAST's Let go runs it inline after a no, from *what can't change* (the no already says it can't,
    # for now), so the danger check still comes first for anything about a person. A hand-off gives back at once, so
    # its card is the host's to show: the ends and flags tell the host which (the crisis slot when anything but *no*
    # was said to the danger check, the body when grief was too much or the fight got louder).
    "inline": {
        "enterAt": ["what"],
        "returns": ["close"],
        "thenVsNowFrom": "close",
        "ends": {"still_stop": "stopped", "too_much": "body", "settle": "body", "end": "finished"},
        "flags": [{"id": "unsafe", "when": STILL}, {"id": "body", "when": {"eq": [a("close"), "worse"]}}],
    },
}
