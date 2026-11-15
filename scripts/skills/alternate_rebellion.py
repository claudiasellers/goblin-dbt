"""Rebel without the wreckage (DT-11, alternate rebellion; DBT DT Handout 21, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD DT-11 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md" §5;
copy in /mnt/project-files/handoffs/prds/): honour the squeeze, name what blowing it up would give (the
function), pick a harmless rebellion matched to that function, do it now or later, and route a real squeeze to
a change skill. docs/design/alternate-rebellion.md lists what this batch defers and why, and where it departs
from the PRD.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "alternate_rebellion"
TOOL_ID = "alternate-rebellion"
CONCEPT = "dbt_alternate_rebellion"
VERSION = "ar-v3"
OWN_MAX = 140
OWN_REBELLION_MAX = 90  # a rebellion fits on the card

COPY = {
    # Screen 1: the opening (PRD step 1). The witness embed (F2) takes this screen over once its lines are signed off.
    # One line, so the flooded opening doesn't inherit it as a hint.
    "open_title": "Wanting to rebel usually means something's squeezing you. That's worth listening to.",
    # A carried or host band of flooded (plan C6.2): body first, keep going anyway always there. ≤ 8 words.
    "flooded_title": "Your body's loud. Settle it a little first.",
    "flooded_cool": "Cool my body first",
    "flooded_pause": "Pause first",
    # Screen 2: what's squeezing (PRD step 2).
    "squeeze_title": "What's squeezing you?",
    "squeeze_own": "Something else",
    "safety_open": "If the urge is to hurt yourself",
    # Screen 3: the function (PRD step 3).
    "function_title": "What would blowing it up give you?",
    # Screen 4: pick a rebellion (PRD step 4).
    "pick_title": "Pick one that gives you that, without the wreckage.",
    "pick_title_treatment": "Treatment you didn't pick is a real squeeze. Changing it is a talk with your care team first. Pick a rebellion built not to cost you tomorrow.",
    "pick_title_treatment_scared": "Treatment you didn't pick is a real squeeze. Changing it is a talk with your care team first. Pick one nobody else has to see.",
    # Someone they're scared of (C6.4, C6.6): only rebellions nobody else would notice are offered.
    "pick_title_scared": "Pick one that gives you that, and that nobody else has to see.",
    "pick_own": "My own rebellion",
    "cost_q": "Will this cost you tomorrow?",
    # Own words with someone they're scared of: cost isn't the only risk (C6.4).
    "noticed_q": "Would they notice it?",
    # Own words that can't be undone wait a day (PRD: the 24-hour check on irreversible ones).
    "undo_q": "Could you undo it later?",
    "sleep_title": "That one can't be undone, so it waits a day. A card tomorrow asks if you still want it.",
    "sleep_hint": "Big choices land better after a night's sleep.",
    # The card a day later (rebellion_check), and what follows.
    "still_title": "A day later. Do you still want to do it?",
    "still_hint": "Whatever you pick, it's your call.",
    # Screen 4b: the heads-up on an own rebellion that would cost (PRD step 4).
    "heads_up_title": "That one might cost you tomorrow. Keep it, or pick something lighter?",
    "heads_up_scared_title": "If they'd notice it, it could cost you. Keep it, or pick a quiet one?",
    # Screen 5: the card, then now or later (PRD step 5).
    "card_title": "Here's your rebellion. When will you do it?",
    # Later today or this week: a card to ask how it went (rebellion_after), or none.
    "later_title": "Want a card later, to ask how it went?",
    "later_skip": "No card",
    "back_title": "Your rebellion. Did you do it?",
    "back_hint": "Any answer is fine. It's only to notice.",
    # Screen 6: did it scratch the itch (PRD step 6, the first half; the urge close is the second).
    "itch_title": "Did it scratch the itch?",
    "itch_hint": "Go and do it first. This screen waits.",
    # Screen 7: the real squeeze (PRD step 6).
    "real_title": "And the squeeze itself. Is it something you want to work on?",
    # Hand-off lines (first that holds).
    "next_scared": "You named someone you're scared of. You don't have to work that out alone.",
    "next_change": "When the squeeze can change, working on it is the bigger rebellion.",
    "next_say": "Saying it clearly, and keeping your self-respect, is a rebellion too.",
    "next_cant": "Some squeezes don't move. You still get to choose how much of you they take.",
    "next_not_now": "The rebellion's yours. The squeeze can wait until you're ready.",
    "next_slept": "It's waiting a day. The squeeze can be looked at now, or later.",
    "next_let_go": "Choosing not to, after sleeping on it, is a rebellion too.",
    "own_hint": "Say it your way",
    "next": "Next",
    "done": "Done",
}

# The card's own words (props of the rebellionCard embed): what each line is, and the three ways to go on.
# The card's own words, as copy keys (the embed's props name them; the player resolves them to text).
CARD = {
    "card_against": "Against",
    "card_for": "For",
    "card_fallback": "A rebellion built not to cost you tomorrow.",
    "card_when": "When?",
    "card_now": "Now",
    "card_today": "Later today",
    "card_week": "This week",
}
CARD_PROPS = {
    "squeezeField": "squeeze", "functionField": "function", "pickField": "pick",
    "against": "card_against", "for": "card_for", "fallback": "card_fallback", "whenLabel": "card_when",
    "now": "card_now", "today": "card_today", "week": "card_week",
}

# --- Screen 1, flooded only: one chip; the body skills are the quiet links above it ---
FIRST = [("anyway", "Keep going anyway")]

# --- Screen 2: RebellionSqueeze. (id, label, props). `danger: other` opens the other-person crisis slot (C6.4);
# `treatment` changes screen 4's title (PRD risk: rebellion against treatment is never a menu item). ---
SQUEEZES = [
    # Short labels, ordered so they pack two to a row at 360 wide: the other-person resources sit above them.
    ("rules", "Rules I didn't pick", {}),
    ("told_who", "Told who to be", {}),
    ("controlling", "Someone controlling me", {}),
    ("stuck", "Stuck", {}),
    ("scared", "Someone I'm scared of", {"danger": "other"}),
    ("plan_cage", "My plan feels like a cage", {}),
    ("treatment", "Treatment I didn't pick", {"treatment": True}),
    ("be_fine", "Expected to be fine", {}),
]

# --- Screen 3: RebellionFunction (the function, PRD step 3) ---
FUNCTIONS = [
    ("freedom", "Freedom"),
    ("seen", "Being seen"),
    ("control", "Control back"),
    ("break", "A break"),
    ("prove", "Proving them wrong"),
    ("alive", "Feeling alive"),
]

# --- Screen 4: RebellionOption. (id, label, functions, when, visibility, props). Every one is reversible and
# costs nothing tomorrow (PRD: curated, reversible by default). Plan C6.7: no food, alcohol, shopping or scrolling;
# no amounts. Irreversible ones (the PRD's tattoo, shaved head) wait for the 24-hour check (F2's follow-ups).
# `quiet`: nobody else would notice it, and it keeps the phone and the usual way home. Only quiet ones are offered
# when *Someone I'm scared of* is a squeeze: defiance the feared person can see can raise the risk (C6.4, C6.6).
# `skips`: it drops something, and `exerts`: it's exercise (which eating-disorder treatment often restricts). Neither
# is offered next to *Treatment I didn't pick*, so an appointment or a dose never reads as optional (PRD risk). No
# rebellion is framed as a secret (secrecy from a care team is a relapse marker), and none hides an object. At least three per function either way, at most six (one phone screen); a test pins it.
QUIET = {"quiet": True}
SKIPS = {"skips": True}
EXERTS = {"exerts": True}
REBELLIONS = [
    ("different_route", "Take a different way home, for the change", ["freedom"], "today", "public", {}),
    ("say_no", "Say no to one optional thing today", ["freedom"], "today", "public", SKIPS),
    ("unplanned_hour", "Keep one hour today with no plan at all", ["freedom", "break"], "today", "private", QUIET),
    ("phone_away", "Put your phone in another room for an hour", ["freedom"], "now", "private", {}),
    ("daydream", "Daydream, in detail, the day you'd pick", ["freedom", "alive"], "now", "private", QUIET),
    ("keep_yours", "Keep one thought today that's only yours", ["freedom", "control"], "today", "private", QUIET),
    ("wear_it", "Wear the thing you'd never wear", ["seen", "alive"], "today", "public", {}),
    ("hair", "Style your hair a way nobody expects", ["seen"], "today", "public", {}),
    ("say_true", "Tell someone safe one thing you usually keep quiet", ["seen"], "week", "public", {}),
    ("say_aloud", "Say out loud, alone, what you wish someone heard", ["seen", "prove"], "now", "private", QUIET),
    ("picture_seen", "Picture yourself, in detail, as you'd like to be seen", ["seen"], "now", "private", QUIET),
    ("sing", "Sing along under your breath, or in your head", ["seen", "alive"], "now", "private", QUIET),
    ("rearrange", "Rearrange your room tonight", ["control"], "today", "private", {}),
    ("cancel_plan", "Cancel one optional plan", ["control", "break"], "today", "public", SKIPS),
    ("my_order", "Do today's chores in your own order", ["control"], "today", "private", {}),
    ("choose_ten", "Choose every minute of the next ten", ["control", "break"], "now", "private", QUIET),
    ("decide_tomorrow", "Decide, in your head, one thing about tomorrow that's yours", ["control"], "now", "private", QUIET),
    ("skip_chore", "Skip an optional chore on purpose, guilt-free", ["break"], "today", "private", SKIPS),
    ("do_nothing", "Do nothing for twenty minutes, on purpose", ["break"], "now", "private", QUIET),
    ("write_unsent", "Write what you'd tell them on paper, and keep it unsent", ["prove"], "now", "private", {}),
    ("start_yours", "Start one small thing that's yours", ["prove"], "week", "private", {}),
    ("three_things", "Name three things you've done that nobody saw coming", ["prove"], "now", "private", QUIET),
    ("learn", "Learn one small new thing today, for you", ["prove"], "today", "private", QUIET),
    ("loud_song", "Play the loud song in one earbud, all the way through", ["alive"], "now", "private", QUIET),
    ("shake_out", "Shake it out, quietly, for one song", ["alive"], "now", "private", {**QUIET, **EXERTS}),
    ("walk_fast", "Go outside and walk faster than you need to", ["alive"], "now", "private", EXERTS),
]

COST = [("no", "No"), ("a_little", "A little"), ("yes", "Yes")]
NOTICED = [("no", "No"), ("not_sure", "Not sure"), ("yes", "Yes")]
HEADS_UP = [("lighter", "Pick something lighter"), ("keep", "Keep it anyway")]
UNDO = [("yes", "Yes"), ("not_sure", "Not sure"), ("no", "No")]
SLEEP = [("tomorrow", "Ask me tomorrow"), ("lighter", "Pick one I can undo")]
STILL = [("yes", "Yes, still mine"), ("lighter", "Something I can undo instead"), ("no", "Not any more")]
# rebellion_after's window chips (scripts/practice-spine/content.py), on the card for later today or this week.
REMIND = [("evening", "This evening"), ("tomorrow", "Tomorrow"), ("few_days", "In a few days")]
DID = [("yes", "I did it"), ("a_bit", "Some of it"), ("not_yet", "Not yet"), ("no", "I let it go")]
ITCH = [("yes", "Yes"), ("a_bit", "A bit"), ("no", "No"), ("not_yet", "Not yet")]
REAL = [
    ("change", "It could change, and I want to try"),
    ("say", "Someone I want to say something to"),
    ("cant", "It won't change"),
    ("not_now", "Not right now"),
]


def a(field):
    return f"$a.{field}"


FLOODED = {"eq": ["$ctx.band", "flooded"]}
ALWAYS = {"all": []}  # the condition language's true
SCARED = {"has": [a("squeeze.ids"), "scared"]}
TREATMENT = {"has": [a("squeeze.ids"), "treatment"]}
REAL_IS = lambda v: {"eq": [a("real"), v]}  # noqa: E731
OTHER_PERSON = [{"variant": "other_person", "when": SCARED}]
# An own rebellion that might cost: a yes to the cost question, or, with someone they're scared of, they'd notice it.
NOTICED_RISK = {"all": [SCARED, {"in": [a("noticed"), ["yes", "not_sure"]]}]}
# Own words that can't (or might not) be undone: the 24-hour check before the card.
NO_UNDO = {"in": [a("undo"), ["no", "not_sure"]]}
COSTS = {"any": [{"eq": [a("cost"), "yes"]}, NOTICED_RISK]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
# Screen 4's list: matched to the function; only quiet ones when someone they're scared of is a squeeze; none
# that skip something when treatment is.
PICK_WHERE = {"all": [
    {"has": ["$opt.functions", a("function")]},
    {"any": [{"not": SCARED}, {"eq": ["$opt.quiet", True]}]},
    {"any": [{"not": TREATMENT}, {"all": [{"not": {"eq": ["$opt.skips", True]}}, {"not": {"eq": ["$opt.exerts", True]}}]}]},
]}

STEPS = [
    {
        "id": "open", "kind": "ask",
        "title": [{"when": FLOODED, "key": "flooded_title"}, {"key": "open_title"}],
        "fields": [{
            "id": "first", "options": {"list": "first"}, "max": 1, "required": True, "showWhen": FLOODED,
            "links": [
                {"exit": "cool_down", "label": "flooded_cool", "when": ALWAYS},
                {"exit": "pause", "label": "flooded_pause", "when": ALWAYS},
            ],
        }],
        "next": [{"to": "squeeze"}],
    },
    {
        "id": "squeeze", "kind": "ask", "title": "squeeze_title",
        "fields": [{
            "id": "squeeze", "options": {"list": "squeeze"}, "max": 2, "swap": True, "required": True,
            "own": {"hint": "squeeze_own", "countsAsPick": True},
            "links": [SAFETY_LINK],
        }],
        "crisis": OTHER_PERSON,
        "next": [{"to": "function"}],
    },
    {
        "id": "function", "kind": "ask", "title": "function_title",
        "fields": [{"id": "function", "options": {"list": "function"}, "max": 1, "required": True}],
        "crisis": OTHER_PERSON,
        "next": [{"to": "pick"}],
    },
    {
        "id": "pick", "kind": "ask",
        "title": [{"when": {"all": [TREATMENT, SCARED]}, "key": "pick_title_treatment_scared"},
                  {"when": TREATMENT, "key": "pick_title_treatment"}, {"when": SCARED, "key": "pick_title_scared"},
                  {"key": "pick_title"}],
        "fields": [
            {"id": "pick", "options": {"list": "rebellion", "where": PICK_WHERE},
             "max": 1, "required": True, "own": {"hint": "pick_own", "countsAsPick": True, "max": OWN_REBELLION_MAX},
             "links": [SAFETY_LINK]},
            {"id": "cost", "label": "cost_q", "options": {"list": "cost"}, "max": 1, "required": True,
             "showWhen": {"own": "pick"}},
            {"id": "noticed", "label": "noticed_q", "options": {"list": "noticed"}, "max": 1, "required": True,
             "showWhen": {"all": [{"own": "pick"}, SCARED]}},
            {"id": "undo", "label": "undo_q", "options": {"list": "undo"}, "max": 1, "required": True,
             "showWhen": {"own": "pick"}},
        ],
        "crisis": OTHER_PERSON,
        "next": [{"when": COSTS, "to": "heads_up"}, {"when": NO_UNDO, "to": "sleep_on"}, {"to": "card"}],
    },
    {
        "id": "heads_up", "kind": "ask",
        "title": [{"when": {"all": [NOTICED_RISK, {"not": {"eq": [a("cost"), "yes"]}}]}, "key": "heads_up_scared_title"},
                  {"key": "heads_up_title"}],
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True}],
        "crisis": OTHER_PERSON,
        "next": [{"when": {"eq": [a("heads_up"), "lighter"]}, "to": "pick"}, {"when": NO_UNDO, "to": "sleep_on"}, {"to": "card"}],
    },
    {
        # The 24-hour check (PRD): an own rebellion that can't be undone gets no card today. *Ask me tomorrow* books
        # rebellion_check, a day later; *Pick one I can undo* goes back to the list.
        "id": "sleep_on", "kind": "ask", "title": "sleep_title", "hint": "sleep_hint",
        "fields": [{"id": "sleep", "options": {"list": "sleep"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "crisis": OTHER_PERSON,
        "followUp": {"type": "rebellion_check", "when": {"eq": [a("sleep"), "tomorrow"]}},
        "next": [{"when": {"eq": [a("sleep"), "lighter"]}, "to": "pick"}, {"to": "real"}],
    },
    {
        # The rich moment: the rebellion on the square paper, against the squeeze, for the function; then when.
        "id": "card", "kind": "embed", "embed": "rebellionCard", "answerAs": "when", "title": "card_title",
        "crisis": OTHER_PERSON,
        "props": CARD_PROPS,
        "next": [{"when": {"eq": [a("when"), "now"]}, "to": "itch"}, {"to": "later"}],
    },
    {
        # Later today or this week (DT-11 part 2): an optional card to ask how it went, never a must.
        "id": "later", "kind": "ask", "title": "later_title", "secondary": "later_skip",
        "fields": [{"id": "remind", "options": {"list": "remind"}, "max": 1}],
        "crisis": OTHER_PERSON,
        "followUp": {"type": "rebellion_after", "whenFrom": "remind"},
        "next": [{"to": "real"}],
    },
    {
        "id": "itch", "kind": "ask", "title": "itch_title", "hint": "itch_hint",
        "fields": [{"id": "itch", "options": {"list": "itch"}, "max": 1}],
        "crisis": OTHER_PERSON,
        "next": [{"to": "real"}],
    },
    {
        # The card later (rebellion_after) reopens the run here (R9), asked fresh.
        "id": "back", "kind": "ask", "title": "back_title", "hint": "back_hint",
        "fields": [{"id": "did", "options": {"list": "did"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "crisis": OTHER_PERSON,
        "reopens": {"after": "later"}, "clears": ["did", "itch", "real"],
        "next": [{"when": {"in": [a("did"), ["yes", "a_bit"]]}, "to": "itch"}, {"to": "real"}],
    },
    {
        # The card a day later (rebellion_check): still yes → the card (now or later); something undoable → the list;
        # not any more → the squeeze. The cost and undo answers are asked again.
        "id": "still", "kind": "ask", "title": "still_title", "hint": "still_hint",
        "fields": [{"id": "still", "options": {"list": "still"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "crisis": OTHER_PERSON,
        "reopens": {"after": "sleep_on"}, "clears": ["still", "cost", "noticed", "undo", "heads_up", "when", "remind", "itch", "real"],
        "next": [{"when": {"eq": [a("still"), "yes"]}, "to": "card"}, {"when": {"eq": [a("still"), "lighter"]}, "to": "pick"}, {"to": "real"}],
    },
    {
        "id": "real", "kind": "ask", "title": "real_title",
        "fields": [{"id": "real", "options": {"list": "real"}, "max": 1, "required": True}],
        "crisis": OTHER_PERSON,
        "next": [{"to": "next"}],
    },
    {
        "id": "next", "kind": "handoff", "complete": True, "crisis": OTHER_PERSON,
        "lines": [
            {"when": SCARED, "key": "next_scared"},
            {"when": {"eq": [a("still"), "no"]}, "key": "next_let_go"},
            {"when": {"all": [{"eq": [a("sleep"), "tomorrow"]}, {"not": {"set": a("still")}}]}, "key": "next_slept"},
            {"when": REAL_IS("change"), "key": "next_change"},
            {"when": REAL_IS("say"), "key": "next_say"},
            {"when": REAL_IS("cant"), "key": "next_cant"},
            {"when": REAL_IS("not_now"), "key": "next_not_now"},
        ],
        # PRD step 6: a squeeze that can change → Problem Solve; a person → DEAR MAN, FAST; can't change → Let it
        # be. Never a confrontation plan for someone the person is scared of (decision D4, plan C6.6): that one
        # goes to Ending a relationship (IE-08, which asks about safety first), with the other-person resources shown.
        "offers": [
            {"exit": "ending", "when": SCARED},
            {"exit": "problem_solve", "when": {"all": [REAL_IS("change"), {"not": SCARED}]}},
            {"exit": "dear_man", "when": {"all": [REAL_IS("say"), {"not": SCARED}]}},
            {"exit": "fast", "when": {"all": [REAL_IS("say"), {"not": SCARED}]}},
            # Never radical acceptance of a situation with someone they're scared of.
            {"exit": "let_it_be", "when": {"all": [REAL_IS("cant"), {"not": SCARED}]}},
        ],
        "done": "done",
    },
]

EXITS = [
    {"id": "problem_solve", "toolId": "problem-solve"},
    {"id": "dear_man", "toolId": "dear-man"},
    {"id": "fast", "toolId": "fast"},
    {"id": "let_it_be", "toolId": "let-it-be"},
    {"id": "ending", "toolId": "ending-relationships", "query": {"frame": "careful"}},
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "pause", "toolId": "pause"},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    out = [("first", v, label, {}, None) for v, label in FIRST]
    out += [("squeeze", v, label, props, "RebellionSqueeze") for v, label, props in SQUEEZES]
    out += [("function", v, label, {}, "RebellionFunction") for v, label in FUNCTIONS]
    out += [("rebellion", v, label, {"functions": fns, "when": when, "visibility": vis, "reversible": True, "cost": "none",
                                     **props}, "RebellionOption") for v, label, fns, when, vis, props in REBELLIONS]
    out += [("cost", v, label, {}, None) for v, label in COST]
    out += [("noticed", v, label, {}, None) for v, label in NOTICED]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("undo", v, label, {}, None) for v, label in UNDO]
    out += [("sleep", v, label, {}, None) for v, label in SLEEP]
    out += [("still", v, label, {}, None) for v, label in STILL]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("did", v, label, {}, None) for v, label in DID]
    out += [("itch", v, label, {}, None) for v, label in ITCH]
    out += [("real", v, label, {}, None) for v, label in REAL]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "open", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (plan C6.2); urgeId: DT-02's *blow it all up* chip (DT-B1).
    "accepts": ["band", "urgeId", "returnTo"],
    "copy": {**COPY, **CARD}, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
