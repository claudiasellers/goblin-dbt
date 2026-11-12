"""Know this feeling, the myth cards (ER-10 part 4; DBT ER Handout 3, myths about emotions; H24's belief check).
Spec: docs/design/emotion-guide.md (*The myth cards*). The second skill under the `emotion-guide` tool, opened by
`?frame=myths` (It isn't working's *A belief in the way?*, the Tools page's own intent); `emotionGuideSkillFor`
(src/lib/emotionGuide.ts) picks it.

Steps:
  myth      *Which belief about feelings sounds most like yours?* one of H3's myths in plain words (with H24's three
            from It isn't working, same ids), or own words.
  heads_up  after the pick, a carried flooded reading only: the body first or *Look anyway* (never a lock).
  look      *A belief can feel like a fact.* that belief's other side (H3's challenge, paraphrased), then *How does
            that sit with you?* some of it fits · not yet · not sure. All three are answers.
  end       one small way to test it this week, and by belief: Check the Facts (it must be true), Know this feeling
            (what a feeling is for, what sets it off), Let it be (past this by now), DEAR MAN (big reactions are the
            only way), Hold to wait (out of control), Recover (wrong to feel it). Own words: someone to talk to.

Hopelessness (*Nothing will ever help me*) is not a myth card: It isn't working sends it to someone to talk to, and
this list never offers it. *Talk to someone now* on every screen. No close, no keep, no follow-up.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "emotion_myths"
TOOL_ID = "emotion-guide"
CONCEPT = "dbt_model_of_emotions"
VERSION = "em-v1"
OWN_MAX = 100

# (id, the belief as people say it, its other side (H3's challenge), one small way to test it, where it goes next)
# The first four are H24's (It isn't working's belief chips, same ids) minus hopelessness; the rest are H3's.
MYTHS = [
    ("myth_failing", "Having this feeling means I'm failing",
     "Feelings aren't grades. Having one says you're human, not that you're failing.",
     "This week, notice the feeling and the effort you're making, side by side.", "emotion_guide"),
    ("myth_past_it", "I'm meant to be past this by now",
     "Feelings don't run on a schedule. Some take longer, and that isn't a fault.",
     "This week, try saying to yourself: it's still here, and that makes sense.", "let_it_be"),
    ("myth_true", "If I feel it this strongly, it must be true",
     "A strong feeling shows how much something matters. Sometimes it fits the facts, sometimes it doesn't. "
     "Strength alone can't tell you which.",
     "Next time it's strong, ask: what are the facts, apart from the feeling?", "check_the_facts"),
    ("myth_right_way", "There's a right way to feel about everything",
     "People feel different things about the same moment. There isn't one correct feeling to have.",
     "Next time a feeling seems wrong, try naming it without grading it.", "emotion_guide"),
    ("myth_weak", "Letting people see I'm upset makes me weak",
     "Showing a feeling takes nerve. It also lets people know what you need.",
     "This week, if there's someone safe, try letting them see one small feeling. If there isn't, try naming it to "
     "yourself.", None),
    ("myth_bad", "Painful feelings are bad for me",
     "Painful feelings are part of being human. They're signals, and they rise and fall.",
     "Next time one shows up, try asking what it's telling you.", "emotion_guide"),
    ("myth_out_of_control", "Being emotional means being out of control",
     "You can feel something strongly and still choose what you do.",
     "This week, notice one time you felt a lot and still chose what to do.", "pause"),
    ("myth_no_reason", "Some of my feelings make no sense",
     "Every feeling comes from somewhere, even when the reason isn't clear yet.",
     "When one seems to come from nowhere, try asking what happened right before.", "emotion_guide"),
    ("myth_ignore", "Painful feelings are best ignored",
     "Ignored feelings tend to come back louder. Noticing one is often what lets it settle.",
     "Today, try noticing one feeling for a few breaths. You can stop whenever you want.", None),
    ("myth_approval", "If others don't approve of how I feel, I'm wrong to feel it",
     "Your feelings are yours. Other people's approval doesn't decide whether you're allowed to have them.",
     "Next time, try telling yourself: it makes sense that I feel this.", "recover"),
    ("myth_big", "Big reactions are the only way to get things to change",
     "Big reactions can get attention fast, and often cost a lot after. There are steadier ways to be heard.",
     "This week, try saying what you need in one clear sentence, once.", "dear_man"),
]
MYTH_IDS = [m[0] for m in MYTHS]

COPY = {
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "Looking at a belief works better once it settles a little.",
    "settle_line": "Body first. This will be here when you're ready.",
    "myth_title": "Which belief about feelings sounds most like yours?",
    "myth_hint": "Pick the closest. You can put it your own way too.",
    "own_hint": "In your own words",
    "look_title": "A belief can feel like a fact.",
    # One line per screen (handoffLine shows the first that holds), so own words' safety sentence is part of look_own.
    "look_own": "A belief like this often makes sense given where it came from. You can look at whether it still fits. "
                "If it's about hurting yourself or not wanting to be here, talk to someone now.",
    "sits_label": "How does that sit with you?",
    "end_title_some": "Some of it fits. That's worth noticing.",
    "end_title_not_yet": "Not yet is fine.",
    "end_title_unsure": "You don't have to decide now.",
    "end_own": "This week, notice one time the belief shows up, and what you were feeling right then.",
    "offer_guide": "What a feeling is for",
    "safety_open": "Talk to someone now",
    "done": "Done",
    **{f"look_{k}": counter for k, _l, counter, _t, _x in MYTHS},
    **{f"try_{k}": tried for k, _l, _c, tried, _x in MYTHS},
    # Not yet: its line and the belief's test as one (one line per screen).
    **{f"try_not_yet_{k}": "A belief that's been around a while takes more than one look. " + tried for k, _l, _c, tried, _x in MYTHS},
}

ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
ONWARD = ("check_the_facts", "emotion_guide", "let_it_be", "dear_man", "pause", "recover")
HEADS_UP = [("settle", "Settle my body first"), ("try", "Look anyway")]
SITS = [("some", "Some of it fits"), ("not_yet", "Not yet"), ("unsure", "Not sure")]


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def going(exit_id):
    return {"in": [a("myth"), [k for k, *_r, x in MYTHS if x == exit_id]]}


def handoff(sid, title, lines, offers, **extra):
    return {"id": sid, "kind": "handoff", "complete": True, "noClose": True, "title": title, "lines": lines,
            "offers": offers, "done": "done", "next": [], "links": [SAFETY_LINK], **extra}


STEPS = [
    {
        "id": "myth", "kind": "ask", "title": "myth_title", "hint": "myth_hint",
        "fields": [{"id": "myth", "options": {"list": "myth"}, "max": 1, "required": True, "links": [SAFETY_LINK],
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": OWN_MAX}}],
        "next": [{"when": FLOODED, "to": "heads_up"}, {"to": "look"}],
    },
    {
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint",
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": is_("heads_up", "settle"), "to": "settle"}, {"to": "look"}],
    },
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    {
        "id": "look", "kind": "ask", "title": "look_title",
        # Own words aren't read, so they can't raise the crisis slot: look_own names the way to someone to talk to.
        "lines": [{"key": f"look_{k}", "when": is_("myth", k)} for k in MYTH_IDS] + [{"key": "look_own", "when": {"own": "myth"}}],
        "fields": [{"id": "sits", "label": "sits_label", "options": {"list": "sits"}, "max": 1, "required": True,
                    "links": [SAFETY_LINK]}],
        "next": [{"to": "end"}],
    },
    handoff("end", [{"when": is_("sits", k), "key": f"end_title_{k}"} for k, _ in SITS[:-1]] + [{"key": "end_title_unsure"}],
            [{"key": f"try_not_yet_{k}", "when": {"all": [is_("myth", k), is_("sits", "not_yet")]}} for k in MYTH_IDS]
            + [{"key": f"try_{k}", "when": is_("myth", k)} for k in MYTH_IDS] + [{"key": "end_own", "when": {"own": "myth"}}],
            [{"exit": x, "when": going(x)} for x in ONWARD] + [{"exit": "safety_open", "when": {"own": "myth"}}]),
]

EXITS = [
    {"id": "check_the_facts", "toolId": "check-the-facts"},       # ER-02: it must be true → what are the facts?
    {"id": "emotion_guide", "toolId": "emotion-guide", "label": "offer_guide"},  # part 1: what a feeling is for, what sets it off
    {"id": "pause", "toolId": "pause"},                           # DT-02 Hold to wait: feel a lot, still choose
    {"id": "recover", "toolId": "recovering-from-invalidation"},        # Recover: wrong to feel it, after being told so
    {"id": "let_it_be", "toolId": "let-it-be"},                   # DT-04: meant to be past this
    {"id": "dear_man", "toolId": "dear-man"},                     # IE-01: a steadier way to be heard
    {"id": "cool_down", "toolId": "cool-down"},                   # DT-01 First, the body (flooded)
    {"id": "safety_open", "toolId": None, "safety": True},        # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    return ([("myth", k, label, {}, None) for k, label, *_r in MYTHS]
            + [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
            + [("sits", v, label, {}, None) for v, label in SITS])


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "myth", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
