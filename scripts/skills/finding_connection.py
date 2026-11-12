"""Find your people (IE-09; building relationships, DBT IE Handouts 10–11 (finding and keeping friends: proximity,
similarity, conversation, joining in); the liking gap, Boothby et al. 2018) as a skill on the runtime. Part 1 of
IE-09. Spec: docs/design/find-your-people.md.

The moment (PRD IE-09): "I don't have anyone to ask." "Everyone would say no." Loneliness turned into one small
experiment with a prediction and an outcome, done off the phone.

Steps:
  start      *Where do you want to start?* (one tap): being around people · finding people like me · starting or
             keeping a conversation going · keeping a friendship going · joining something.
  heads_up   a carried flooded reading: reaching out lands better once the body settles (PRD: not offered while
             flooded). First, the body, or try anyway (the smallest steps only).
  step       one small step for that area, smallest first (four or five per area, three sizes). A stirred or flooded
             reading sees the smallest only (PRD band rule). Own words are the escape hatch.
  predict    *How do you think it'll go?* well · mixed · badly · no one will respond; and, optional, *How much do
             you think they'll like you?* not much · some · a lot (the liking gap's own question).
  picture    *Picture doing it, for a few seconds.* A 15 s timed `holdRing`: where you are, the first thing you do or
             say, doing it anyway if it feels awkward (a rehearsal, H11; no breath instruction).
  when       today · this evening · tomorrow · in a few days · this week; *Want me to ask how it went?* books
             `reach_out_outcome` at that time.
  set        "Your step: {step}." Doing it is the experiment; how it goes is information, not a verdict.
  back       the `reach_out_outcome` card reopens the run here (R9): *Earlier you picked: {step}.* *Did you do it?*
             I did it · not yet · I decided not to.
  went       *How did it go?* (the same scale as the prediction) and, optional, *How much did they seem to like you?*
             (the same scale, plus *can't tell*).
  gap        the gap in one flat sentence: better than you predicted, about what you predicted, or worse ("One try is
             information, not a verdict about you"; Recover offered when it went badly), and the liking line when they
             seemed to like you more than you guessed. No reply: says little about you.
  again      not yet: a new time, a smaller step, or leave it for now (a real answer).
  not_doing  decided not to: a real answer, the step stays here.

Risks (PRD): a real rejection confirms the belief (*information, not a verdict*; Recover offered on *badly*);
reassurance-seeking disguised as connection (every step is an outward action, never *ask if they still like me*,
test-pinned); co-rumination (no *vent to a friend* step); social anxiety at clinical levels (the smallest tier first,
no pressure, *I decided not to* is complete).

Departures from the PRD (docs/design/find-your-people.md lists them with the batch that picks each up): no
psychoeducation after three experiments (it needs a count of the person's own outcomes, a server read); no *add them
to your people* (IE-03's picker on the outcome, part 2); no fade (tiers advancing after two experiments, the
user-chosen step after eight); no interest chips from the person's values; the steps are this skill's options, not
`ConnectionStep` nodes; no `ADDRESSES` edges on the concept (the legacy ranker would start counting it: the word row
routes it instead).

Safety (plan C6): *Talk to someone now* on every screen.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "finding_connection"
TOOL_ID = "finding-connection"
CONCEPT = "dbt_building_relationships"
VERSION = "fc-v1"
OWN_MAX = 60  # a step in a few words

COPY = {
    "start_title": "Where do you want to start?",
    "start_hint": "Feeling cut off from people is common, and it can shift in small steps. Pick the one that feels most possible.",
    # A carried flooded reading (PRD: not offered while flooded).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "Reaching out lands better once it settles a little.",
    "settle_line": "This will keep. Look after the next few minutes first.",
    "step_title": "Pick one small step.",
    "step_hint": "Smallest first. A small one done counts for more than a big one planned.",
    "step_low": "The smallest ones for now. Bigger ones are here on a steadier day.",
    "step_own": "Something else",
    "predict_title": "Before you do it: how do you think it'll go?",
    "predict_hint": "A guess is enough. You'll check it afterwards.",
    "liking_label": "If you talk to someone, how much do you think they'll like you?",
    "picture_title": "Picture doing it, for a few seconds.",
    "picture_label": "Start",
    "picture_running": "Picturing it",
    "picture_hint": "Where you are, the first thing you do or say, and you doing it anyway if it feels awkward.",
    "picture_done": "Pictured. That's a rehearsal.",
    "when_title": "When will you do it?",
    "remind_label": "Want me to ask how it went?",
    "set_title": "Your step: {step}.",
    "set_remind": "I'll ask how it went. Doing it is the experiment; how it goes is information, not a verdict about you.",
    "set_line": "Doing it is the experiment. How it goes is information, not a verdict about you.",
    # The reach_out_outcome card reopens the run here.
    "back_title": "Earlier you picked: {step}.",
    "happened_label": "Did you do it?",
    "went_title": "How did it go?",
    "liked_label": "How much did they seem to like you?",
    # The gap: the title compares the outcome with the guess, the line says what it means (one line shows).
    "gap_title": "You did it.",
    "gap_better_title": "It went better than you predicted.",
    "gap_same_title": "It went about how you predicted.",
    "gap_worse_title": "It went worse than you predicted.",
    "gap_no_answer_title": "No response yet.",
    "gap_better": "That gap is worth noticing.",
    "gap_worse": "One try is information, not a verdict about you.",
    "gap_no_answer": "People miss messages, get busy, forget. It says little about you.",
    # The liking gap (Boothby et al. 2018), shown only when the person's own answers show it.
    "gap_liked": "They seemed to like you more than you guessed. Most people guess low on that.",
    "gap_line": "Each try tells you a bit more about how people actually respond.",
    "again_title": "Not yet is fine.",
    "again_hint": "The step is still here.",
    "not_doing_title": "That's a real answer.",
    "not_doing_line": "Deciding not to is allowed. Your step is here when you want it.",
    "leave_line": "It'll keep. Come back to it any time.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
# PRD band rule: stirred sees the smallest tier only; a flooded reading that tries anyway too.
LOW = {"in": ["$ctx.band", ["stirred", "flooded"]]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

# Where to start (H10–11: proximity, similarity, conversation, keeping friends, joining).
AREAS = [
    ("around", "Being around people"),
    ("like_me", "Finding people like me"),
    ("talk", "Starting or keeping a conversation going"),
    ("friend", "Keeping a friendship going"),
    ("join", "Joining something"),
]
HEADS_UP = [("settle", "Look after the next few minutes first"), ("try", "Try a small one anyway")]
# The steps, smallest first (paraphrasing H10–11's range). Tier 1 is `small`: what a stirred reading sees. Every one is
# an outward action: no *ask if they still like me* (reassurance-seeking), no *vent to someone* (co-rumination).
STEP_LIST = [
    ("around_cafe", "Sit somewhere with people around for ten minutes: a café, a library, a park", "around", 1),
    ("around_hello", "Say hello to one person you see anyway", "around", 1),
    ("around_twice", "Go to the same place at the same time twice this week", "around", 2),
    ("around_together", "Go somewhere people do a thing together, and stay twenty minutes", "around", 3),
    ("like_read", "Look up one group or class for something you like", "like_me", 1),
    ("like_reply", "Reply to one post in a group for something you're into", "like_me", 1),
    ("like_online", "Go to one online meetup for something you like. Camera off is fine", "like_me", 2),
    ("like_go", "Go once to a group or class for something you like", "like_me", 3),
    ("talk_reply", "Reply to one message", "talk", 1),
    ("talk_question", "Ask one question back in a conversation", "talk", 1),
    ("talk_extra", "Say one extra sentence to someone you see anyway", "talk", 2),
    ("talk_true", "Tell someone one small true thing about your day", "talk", 2),
    ("talk_start", "Start a conversation with someone you half-know", "talk", 3),
    ("friend_thought", "Send someone a message that says you thought of them", "friend", 1),
    ("friend_owe", "Reply to someone you owe a message", "friend", 1),
    ("friend_follow", "Ask someone how something they told you about went", "friend", 2),
    ("friend_invite", "Invite someone to something low-key", "friend", 3),
    ("join_find", "Find one thing that meets regularly, near you or online", "join", 1),
    ("join_sign", "Sign up for one thing", "join", 2),
    ("join_help", "Offer to help once with something local", "join", 2),
    ("join_go", "Go once, and stay to the end", "join", 3),
]
FOR_AREA = {"eq": ["$opt.area", a("area")]}
SMALL_IF_LOW = {"any": [{"not": LOW}, {"eq": ["$opt.small", True]}]}
# The prediction and the outcome share a scale, so the gap is one comparison.
HOW = [("well", "Well"), ("mixed", "Mixed"), ("badly", "Badly"), ("no_answer", "No one will respond")]
WENT = [("well", "Well"), ("mixed", "Mixed"), ("badly", "Badly"), ("no_answer", "No one responded")]
LIKING = [("not_much", "Not much"), ("some", "Some"), ("a_lot", "A lot")]
LIKED = [*LIKING, ("cant_tell", "Can't tell")]
# The reach_out_outcome card's chips: when = the chip id.
WHEN = [("today", "Later today"), ("evening", "This evening"), ("tomorrow", "Tomorrow"), ("few_days", "In a few days"),
        ("this_week", "Sometime this week")]
REMIND = [("yes", "Yes, ask me"), ("no", "No thanks")]
HAPPENED = [("did", "I did it"), ("not_yet", "Not yet"), ("decided_not", "I decided not to")]
AGAIN = [("new_time", "Pick a new time"), ("smaller", "Pick a smaller step"), ("leave", "Leave it for now")]

RANK = {"badly": 1, "mixed": 2, "well": 3}
LIKE_RANK = {"not_much": 1, "some": 2, "a_lot": 3}


def pairs(f1, f2, ok):
    """The answer to f1 and the answer to f2 make a pair `ok` accepts (both from the given scales)."""
    return {"any": [{"all": [{"eq": [a(f1), x]}, {"eq": [a(f2), y]}]} for x, y in ok]}


SCALE = list(RANK) + ["no_answer"]
BETTER = pairs("predict", "went", [(p, w) for p in SCALE for w in RANK if p == "no_answer" or (p in RANK and RANK[w] > RANK[p])])
WORSE = pairs("predict", "went", [(p, w) for p in RANK for w in RANK if RANK[w] < RANK[p]])
SAME = pairs("predict", "went", [(p, p) for p in RANK])
NO_ANSWER = {"eq": [a("went"), "no_answer"]}
LIKED_MORE = pairs("liking", "liked", [(p, w) for p in LIKE_RANK for w in LIKE_RANK if LIKE_RANK[w] > LIKE_RANK[p]])


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
    ask("start", "start_title", "start_hint", [field("area", "area")],
        [{"when": FLOODED, "to": "heads_up"}, {"to": "step"}]),
    ask("heads_up", "heads_up_title", "heads_up_hint", [field("heads_up", "heads_up")],
        [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, {"to": "step"}]),
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}],
            no_close=True),
    ask("step", "step_title", "step_hint",
        [field("step", "step", own="step_own", where={"all": [FOR_AREA, SMALL_IF_LOW]})], [{"to": "predict"}],
        lines=[{"when": LOW, "key": "step_low"}]),
    ask("predict", "predict_title", "predict_hint",
        [field("predict", "how"), field("liking", "liking", required=False, label="liking_label")], [{"to": "picture"}]),
    # A short rehearsal in the mind's eye (H11's practice; the same move as Cope Ahead's): a timed hold, no breath cue.
    {"id": "picture", "kind": "embed", "embed": "holdRing", "answerAs": "picture", "title": "picture_title",
     "props": {"variant": "timed", "seconds": 15, "label": "picture_label", "runningLabel": "picture_running",
               "hint": "picture_hint", "doneLabel": "picture_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "when"}]},
    ask("when", "when_title", None,
        [field("when", "when"), field("remind", "remind", required=False, label="remind_label")],
        [{"to": "set"}],
        followUp={"type": "reach_out_outcome", "whenFrom": "when", "when": {"eq": [a("remind"), "yes"]}}),
    handoff("set", "set_title", [{"when": {"eq": [a("remind"), "yes"]}, "key": "set_remind"}, {"when": ALWAYS, "key": "set_line"}],
            [], titleSlots={"step": {"labelOf": "step"}}),
    # --- The reach_out_outcome card reopens the run here (R9), on a run that reached `when` ---
    ask("back", "back_title", None, [field("happened", "happened", label="happened_label")],
        [{"when": {"eq": [a("happened"), "not_yet"]}, "to": "again"},
         {"when": {"eq": [a("happened"), "decided_not"]}, "to": "not_doing"}, {"to": "went"}],
        reopens={"after": "when"}, clears=["happened", "went", "liked", "again"], titleSlots={"step": {"labelOf": "step"}}),
    ask("went", "went_title", None,
        [field("went", "went"), field("liked", "liked", required=False, label="liked_label")], [{"to": "gap"}]),
    handoff("gap", [{"when": NO_ANSWER, "key": "gap_no_answer_title"}, {"when": BETTER, "key": "gap_better_title"},
                    {"when": SAME, "key": "gap_same_title"}, {"when": WORSE, "key": "gap_worse_title"}, {"key": "gap_title"}], [
        # One line shows, the first that holds: worse keeps "not a verdict" whatever else is true.
        {"when": NO_ANSWER, "key": "gap_no_answer"},
        {"when": WORSE, "key": "gap_worse"},
        {"when": LIKED_MORE, "key": "gap_liked"},
        {"when": BETTER, "key": "gap_better"},
        {"when": ALWAYS, "key": "gap_line"},
    ], [{"exit": "recover", "when": {"eq": [a("went"), "badly"]}}], no_close=True),
    ask("again", "again_title", "again_hint", [field("again", "again")],
        [{"when": {"eq": [a("again"), "new_time"]}, "to": "when"}, {"when": {"eq": [a("again"), "smaller"]}, "to": "step"},
         {"to": "leave"}]),
    handoff("leave", "again_title", [{"when": ALWAYS, "key": "leave_line"}], [], no_close=True),
    handoff("not_doing", "not_doing_title", [{"when": ALWAYS, "key": "not_doing_line"}], [], no_close=True),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                   # DT-01 First, the body (flooded)
    {"id": "recover", "toolId": "recovering-from-invalidation"},  # Recover (WMP-02): it went badly
    {"id": "safety_open", "toolId": None, "safety": True},        # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("area", v, label, {}, None) for v, label in AREAS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("step", v, label, {"area": area, "tier": tier, **({"small": True} if tier == 1 else {})}, None)
            for v, label, area, tier in STEP_LIST]
    out += [("how", v, label, {}, None) for v, label in HOW]
    out += [("went", v, label, {}, None) for v, label in WENT]
    out += [("liking", v, label, {}, None) for v, label in LIKING]
    out += [("liked", v, label, {}, None) for v, label in LIKED]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("happened", v, label, {}, None) for v, label in HAPPENED]
    out += [("again", v, label, {}, None) for v, label in AGAIN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "start", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first, stirred the smallest steps.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
