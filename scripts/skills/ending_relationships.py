"""Ending a relationship that's hurting you (IE-08; DBT IE Handout 13, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD IE-08 (Claudia's vault, "DBT Module PRDs/PRD – Interpersonal Effectiveness.md";
copy in /mnt/project-files/handoffs/prds/): safety first, always; body first when flooded; what this relationship
is doing to you (destructive, interfering, hard right now, not sure); decide (end it, step back, not yet); if it's
safe, plan the ending (channel, one opening line, the decision said plainly, logistics only, the line on paper,
when, an opt-in check-in); after, the pull back is expected. docs/design/ending-relationships.md lists what this
batch defers and why, and where it departs from the PRD.

Safety (PRD IE-08 "Safety branch", Campbell 2003: separation is the most dangerous time):
- Any answer but *No* to the first question is the safety branch: the other-person resources (911, the National
  Domestic Violence Hotline, call or text, 988 last) on every screen after it, plain lines, and no script for telling
  them, no rehearsal, no Cope Ahead for their reaction, no follow-up. Nothing is locked: the person can still think
  it through and decide.
- Nothing is saved before the safety answer, and nothing at all in the safety branch unless the person picks *Save it
  privately* (persist-nothing, R15: no ToolSession, no compat ToolUsage). A Quick exit sits on every screen.
- Check-ins are opt-in and content-free (practice-spine `ending_*`): nothing on the card or notification says what
  they're for.
- Copy never says the person should leave; *Not yet* is an equal answer.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "ending_relationships"
TOOL_ID = "ending-relationships"
CONCEPT = "dbt_ending_relationships"
VERSION = "ending-v1"
OWN_MAX = 140

COPY = {
    # Screen 1: safety first, always (PRD step 1).
    "safety_title": "Before anything: would ending this, or even talking about it, put you at risk?",
    "safety_title_scared": "Earlier you said you're scared of them. Would ending this, or talking about it, put you at risk?",
    "safety_hint": "For example, they've hurt or threatened you, or you're scared of how they'd react. Whatever you answer, you can still think it through and decide here.",
    # The safety branch (PRD step 1): plain lines, the resources, and how private this is.
    "safe_title": "Your safety comes first.",
    "safe_hint": "Ending things with someone who might hurt you can be the most dangerous time. People who help with this every day can plan it with you, in confidence.",
    "safe_note": "Nothing from here on is saved unless you choose to save it. Calls and texts to these numbers show in your phone's history, so a phone nobody checks can be safer.",
    "safe_done_line": "Whenever you want to come back, this is here. The hotline can help you plan, at your pace.",
    # Flooded, from a carried or host band (PRD step 2): body first, the decision steps still there.
    "steady_title": "Big decisions go better from steady. Everything stays here.",
    "steady_cool": "Cool my body first",
    "steady_pause": "Pause first",
    # What's going on (PRD step 3; IE Handout 13: destructive, interfering).
    "what_title": "What is this relationship doing to you?",
    "what_hint": "Harm can look like put-downs, fear, control, or pressure to act against what you value.",
    "what_wise": "Think it through with Wise mind",
    "what_pros": "Weigh it up",
    # Hard right now (PRD step 3): worth trying to change it first?
    "try_title": "It might be worth trying to change it first. Do you want to?",
    "decide_wise": "Check it with Wise mind first",
    "change_line": "Working on it first is a real choice. If it doesn't change, this is here.",
    "change_line_unsafe": "Changing it safely is worth planning with someone who knows about safety. The hotline can help with that too.",
    # Decide (PRD step 4).
    "decide_title": "What do you want to do?",
    "decide_title_unsure": "It's OK not to know yet. Where are you leaning?",
    "decide_hint": "Not yet is a real answer, and so is staying.",
    # Save privately (R15): the safety branch only.
    "save_title": "Do you want any of this saved?",
    "save_hint": "Nothing has been saved so far. If someone else could open this app, it's safer to leave it unsaved.",
    # The safety branch's end: advocates, never scripts (PRD step 1).
    "advocate_line": "Planning this with someone who does it every day is often the safest way. They can help with when, where and how, at your pace.",
    "advocate_line_not_yet": "Whenever you want to plan anything, the hotline can help, in confidence.",
    # Not yet (PRD step 4): accepted, with an optional check-in in two weeks.
    "not_yet_title": "Do you want a check-in in two weeks?",
    "not_yet_hint": "Check-ins say nothing about what they're for.",
    "not_yet_line": "It stays here for whenever you want to look again.",
    # Plan the ending (PRD step 5): channel, then DEAR MAN for endings, with GIVE and FAST in the lines.
    "channel_title": "How will you tell them?",
    "channel_title_harms": "How will you tell them? If you're worried how they'll react, a message is often safer than in person.",
    "channel_hint": "A message is fine, and often the wisest way.",
    "open_title": "How do you want to start? One line is enough.",
    "decision_title": "Now say what you've decided, plainly.",
    "decision_hint": "No over-explaining, and no apology for deciding. It isn't up for debate.",
    "practical_title": "Anything practical to sort out?",
    "practical_hint": "Only practical things. If there's nothing, go on.",
    "card_title": "Here's what you could say.",
    "when_title": "When are you thinking of doing it?",
    "checkin_title": "Do you want a check-in after you've told them?",
    "checkin_hint": "Check-ins say nothing about what they're for.",
    "ahead_line": "Their reaction can be the hardest part. Planning for it ahead can make it easier to hold your ground.",
    # After (PRD step 6), reopened by the check-in.
    "after_title": "How's it going?",
    "again_label": "Another check-in?",
    "after_line_pull": "The pull back is expected. It doesn't mean the decision was wrong.",
    "after_line_back": "Going back happens a lot. You can look at it again whenever you want.",
    "after_line_not_yet": "It's still your decision, and your timing.",
    "after_line": "Holding steady takes something. People who help can make it lighter.",
    "after_unsafe_line": "Your safety comes first. The time around leaving can be the most dangerous, and the hotline can plan with you now. Nothing from this check-in is saved.",
    "after_low_line": "You don't have to hold this alone. Talking to someone right now can help.",
    "after_help": "I might hurt myself",
    "own_hint": "Say it my way",
    "next": "Next",
    "done": "Done",
}

# The card's words (boundaryLine's props name them; the player resolves them to text).
CARD_COPY = {"card_copy": "Copy", "card_copied": "Copied", "card_selected": "The words are selected, ready to copy."}

SAFETY = [("no", "No"), ("maybe", "Maybe"), ("yes", "Yes"), ("rather_not", "I'd rather not say")]
GO = [("think", "Think it through here"), ("enough", "That's enough for now")]
FIRST = [("anyway", "Keep going anyway")]
# IE Handout 13: a destructive relationship harms you; an interfering one gets in the way of what matters.
WHAT = [
    ("harms", "It harms me", {"category": "destructive"}),
    ("interferes", "It keeps me from things that matter", {"category": "interfering"}),
    ("hard", "It's hard right now, and it isn't bad for me", {"category": "hard_now"}),
    ("unsure", "I'm not sure", {}),
]
TRY = [("try", "Try to change it first"), ("still", "I still want to think about ending it")]
DECIDE = [("end", "End it"), ("step_back", "Step back, with less contact"), ("work_on", "Stay and work on it"),
          ("not_yet", "Not yet")]
SAVE = [("no", "Leave it unsaved"), ("yes", "Save it to my account")]
REVISIT = [("yes", "Yes, in two weeks"), ("no", "No thanks")]
CHANNEL = [("message", "A message"), ("call", "A call"), ("in_person", "In person")]
# DEAR MAN for endings (PRD step 5): Describe in one line; GIVE's kind openings where wanted, never first.
OPEN = [
    ("thinking", "I've been thinking about us for a while."),
    ("not_working", "This relationship isn't working for me any more."),
    ("not_myself", "I don't feel like myself in this relationship."),
    ("honest", "I care about you, and I need to be honest with you."),
]
# Assert: the decision, clearly, with nothing to negotiate (FAST: no over-explaining, no apology for deciding).
DECISION = [
    ("ending", "I've decided to end our relationship.", {"decision": "end"}),
    ("made_up", "I'm ending this. My mind is made up.", {"decision": "end"}),
    ("less_contact", "I need a lot less contact for now.", {"decision": "step_back"}),
    ("space", "I'm stepping back from us. Please give me space.", {"decision": "step_back"}),
]
# Negotiate: logistics only.
PRACTICAL = [
    ("things", "I'll arrange to get my things back."),
    ("no_contact", "Please don't contact me for a while."),
    ("by_message", "Let's sort out anything practical by message."),
]
WHEN = [("today", "Today"), ("this_week", "This week"), ("unsure", "Not sure yet")]
CHECKIN = [("yes", "Yes, check in with me"), ("no", "No thanks")]
AFTER = [
    ("holding", "Holding steady", {}),
    ("pull", "Pulled back toward them", {}),
    ("went_back", "I went back", {}),
    ("not_yet", "I haven't done it yet", {}),
    ("unsafe", "I don't feel safe", {"danger": "other"}),
    ("low", "I'm in a really bad place", {"danger": "self"}),
]
AGAIN = [("this_week", "In a week"), ("month", "In a month")]


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}  # the condition language's true
# Rebel's *someone I'm scared of* opens this with `frame=careful` (a word that says nothing in the address bar):
# the safety branch whatever the answer here (plan D4, C6.6).
CAREFUL = {"eq": ["$ctx.frame", "careful"]}
SAFE = {"all": [{"eq": [a("safety"), "no"]}, {"not": CAREFUL}]}
UNSAFE = {"not": SAFE}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
IS = lambda f, v: {"eq": [a(f), v]}  # noqa: E731
OTHER_PERSON = [{"variant": "other_person", "when": UNSAFE}]
ALWAYS_OTHER_PERSON = [{"variant": "other_person", "when": ALWAYS}]

STEPS = [
    {
        "id": "safety", "kind": "ask", "title": [{"when": CAREFUL, "key": "safety_title_scared"}, {"key": "safety_title"}],
        "hint": "safety_hint",
        "fields": [{"id": "safety", "options": {"list": "safety"}, "max": 1, "required": True}],
        "next": [{"when": UNSAFE, "to": "safe_first"}, {"when": FLOODED, "to": "steady"}, {"to": "what"}],
    },
    {
        "id": "safe_first", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "note": "safe_note",
        "crisis": ALWAYS_OTHER_PERSON,
        "fields": [{"id": "go", "options": {"list": "go"}, "max": 1, "required": True}],
        "next": [{"when": IS("go", "enough"), "to": "safe_done"}, {"when": FLOODED, "to": "steady"}, {"to": "what"}],
    },
    {
        "id": "safe_done", "kind": "handoff", "complete": True, "noClose": True, "crisis": ALWAYS_OTHER_PERSON,
        "lines": [{"when": None, "key": "safe_done_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "steady", "kind": "ask", "title": "steady_title", "crisis": OTHER_PERSON,
        "fields": [{
            "id": "first", "options": {"list": "first"}, "max": 1, "required": True,
            "links": [
                {"exit": "cool_down", "label": "steady_cool", "when": ALWAYS},
                {"exit": "pause", "label": "steady_pause", "when": ALWAYS},
            ],
        }],
        "next": [{"to": "what"}],
    },
    {
        "id": "what", "kind": "ask", "title": "what_title", "hint": "what_hint", "crisis": OTHER_PERSON,
        "fields": [{
            "id": "what", "options": {"list": "what"}, "max": 1, "required": True,
            "links": [
                # Only when safe: Wise mind saves what's written there, and the safety branch promises nothing is.
                {"exit": "wise_mind", "label": "what_wise", "when": {"all": [IS("what", "unsure"), SAFE]}},
                # DT-10 Pros and cons (planned): stay vs end, then back here (Arch #34).
                {"exit": "pros_cons", "label": "what_pros", "when": {"all": [IS("what", "unsure"), SAFE]}},
            ],
        }],
        # H13: repair first when it isn't destructive (hard right now, or interfering). Not in the safety branch:
        # there, an invitation to work on it is the wrong nudge.
        "next": [{"when": {"all": [{"in": [a("what"), ["hard", "interferes"]]}, SAFE]}, "to": "try_first"}, {"to": "decide"}],
    },
    {
        "id": "try_first", "kind": "ask", "title": "try_title", "crisis": OTHER_PERSON,
        "fields": [{"id": "try", "options": {"list": "try"}, "max": 1, "required": True}],
        "next": [{"when": IS("try", "try"), "to": "change"}, {"to": "decide"}],
    },
    {
        # DBT: problem solve before ending when it isn't destructive (Arch #36). Never DEAR MAN with someone it
        # isn't safe to talk to (plan D4, C6.6).
        "id": "change", "kind": "handoff", "complete": True, "crisis": OTHER_PERSON,
        "lines": [{"when": UNSAFE, "key": "change_line_unsafe"}, {"when": None, "key": "change_line"}],
        "offers": [
            {"exit": "dear_man", "when": SAFE},
            {"exit": "give", "when": SAFE},
            {"exit": "problem_solve", "when": SAFE},
        ],
        "done": "done",
    },
    {
        "id": "decide", "kind": "ask",
        "title": [{"when": IS("what", "unsure"), "key": "decide_title_unsure"}, {"key": "decide_title"}],
        "hint": "decide_hint", "crisis": OTHER_PERSON,
        "fields": [{
            "id": "decide", "options": {"list": "decide"}, "max": 1, "required": True,
            # H13 / PRD #12: decide from wise mind, for everyone who is safe (a link: MF-04's embed comes later).
            "links": [{"exit": "wise_mind", "label": "decide_wise", "when": SAFE}],
        }],
        "next": [
            {"when": UNSAFE, "to": "save"},
            {"when": IS("decide", "work_on"), "to": "change"},
            {"when": IS("decide", "not_yet"), "to": "not_yet"},
            {"to": "channel"},
        ],
    },
    {
        # Persist-nothing (R15): the one place the safety branch can choose to keep the visit.
        "id": "save", "kind": "ask", "title": "save_title", "hint": "save_hint", "crisis": ALWAYS_OTHER_PERSON,
        "fields": [{"id": "save", "options": {"list": "save"}, "max": 1, "required": True}],
        "next": [{"to": "advocate"}],
    },
    {
        "id": "advocate", "kind": "handoff", "complete": True, "noClose": True, "crisis": ALWAYS_OTHER_PERSON,
        "lines": [{"when": IS("decide", "not_yet"), "key": "advocate_line_not_yet"}, {"when": None, "key": "advocate_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "not_yet", "kind": "ask", "title": "not_yet_title", "hint": "not_yet_hint",
        "fields": [{"id": "revisit", "options": {"list": "revisit"}, "max": 1, "required": True}],
        "followUp": {"type": "ending_revisit", "when": IS("revisit", "yes")},
        "next": [{"to": "not_yet_done"}],
    },
    {
        "id": "not_yet_done", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "not_yet_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "channel", "kind": "ask",
        "title": [{"when": IS("what", "harms"), "key": "channel_title_harms"}, {"key": "channel_title"}],
        "hint": "channel_hint",
        "fields": [{"id": "channel", "options": {"list": "channel"}, "max": 1, "required": True}],
        "next": [{"to": "open_line"}],
    },
    {
        "id": "open_line", "kind": "ask", "title": "open_title",
        "fields": [{"id": "open_line", "options": {"list": "open_line"}, "max": 1, "required": True,
                    "own": {"hint": "own_hint", "countsAsPick": True}}],
        "next": [{"to": "decision_line"}],
    },
    {
        "id": "decision_line", "kind": "ask", "title": "decision_title", "hint": "decision_hint",
        "fields": [{"id": "decision_line", "options": {"list": "decision_line", "where": {"eq": ["$opt.decision", a("decide")]}},
                    "max": 1, "required": True, "own": {"hint": "own_hint", "countsAsPick": True}}],
        "next": [{"to": "practical"}],
    },
    {
        "id": "practical", "kind": "ask", "title": "practical_title", "hint": "practical_hint",
        "fields": [{"id": "practical", "options": {"list": "practical"}, "max": 2, "swap": True,
                    "own": {"hint": "own_hint", "countsAsPick": True}}],
        "next": [{"to": "card"}],
    },
    {
        # The rich moment: the words on the keepsake paper, copyable, never locked (the boundaryLine embed).
        "id": "card", "kind": "embed", "embed": "boundaryLine", "answerAs": "card_copied", "title": "card_title",
        "props": {"field": "open_line", "field2": "decision_line", "field3": "practical", "shape": "line",
                  "copyLabel": "card_copy", "copiedLabel": "card_copied", "selectedLabel": "card_selected", "next": "next"},
        "next": [{"to": "checkin"}],
    },
    {
        # One question a screen: the check-in first, then when (the when sets the check-in's day).
        "id": "checkin", "kind": "ask", "title": "checkin_title", "hint": "checkin_hint",
        "fields": [{"id": "checkin", "options": {"list": "checkin"}, "max": 1, "required": True}],
        "next": [{"to": "when"}],
    },
    {
        "id": "when", "kind": "ask", "title": "when_title",
        "fields": [{"id": "when", "options": {"list": "when"}, "max": 1, "required": True}],
        "followUp": {"type": "ending_after", "whenFrom": "when", "when": IS("checkin", "yes")},
        "next": [{"to": "ahead"}],
    },
    {
        # PRD step 5: rehearse it (IE-02, planned), then cope ahead for their likely reaction.
        "id": "ahead", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "ahead_line"}],
        "offers": [{"exit": "cope_ahead", "when": None}, {"exit": "rehearse", "when": None}],
        "done": "done",
    },
    {
        # PRD step 6, reopened by the check-in (`resumeAt`): the pull back is expected.
        "id": "after", "kind": "ask", "title": "after_title",
        "crisis": [{"variant": "other_person", "when": IS("after", "unsafe")}, {"variant": "crisis", "when": IS("after", "low")}],
        "fields": [
            {"id": "after", "options": {"list": "after"}, "max": 1, "required": True,
             # A break-up is a common trigger for thoughts of suicide (plan C6.5: self-harm reaches safety.open).
             "links": [{"exit": "safety_open", "label": "after_help", "when": ALWAYS}]},
            {"id": "again", "label": "again_label", "options": {"list": "again"}, "max": 1,
             "showWhen": {"all": [{"set": a("after")}, {"not": {"in": [a("after"), ["unsafe", "low"]]}}]}},
        ],
        "followUp": {"type": "ending_again", "whenFrom": "again", "when": {"not": {"in": [a("after"), ["unsafe", "low"]]}}},
        "next": [{"when": IS("after", "unsafe"), "to": "after_unsafe"}, {"when": IS("after", "low"), "to": "after_low"},
                 {"to": "after_next"}],
    },
    {
        "id": "after_next", "kind": "handoff", "complete": True,
        "lines": [
            {"when": IS("after", "pull"), "key": "after_line_pull"},
            {"when": IS("after", "went_back"), "key": "after_line_back"},
            {"when": IS("after", "not_yet"), "key": "after_line_not_yet"},
            {"when": None, "key": "after_line"},
        ],
        # Opposite action for love that doesn't fit the facts (Arch #35); Find your people (IE-09, planned; #37);
        # Let it be (DT-04, planned) for the grief.
        "offers": [
            {"exit": "opposite_action", "when": IS("after", "pull")},
            {"exit": "finding_connection", "when": {"in": [a("after"), ["holding", "pull"]]}},
            {"exit": "let_it_be", "when": {"in": [a("after"), ["holding", "pull"]]}},
        ],
        "done": "done",
    },
    {
        "id": "after_unsafe", "kind": "handoff", "complete": True, "noClose": True, "crisis": ALWAYS_OTHER_PERSON,
        "lines": [{"when": None, "key": "after_unsafe_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "after_low", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "crisis", "when": ALWAYS}],
        "lines": [{"when": None, "key": "after_low_line"}],
        "offers": [{"exit": "safety_open", "when": None}], "done": "done",
    },
]

EXITS = [
    {"id": "wise_mind", "toolId": "wise-mind"},
    {"id": "pros_cons", "toolId": "pros-cons", "planned": True},
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "pause", "toolId": "pause"},
    {"id": "dear_man", "toolId": "dear-man"},
    {"id": "give", "toolId": "give", "planned": True},
    {"id": "problem_solve", "toolId": "problem-solve"},
    {"id": "cope_ahead", "toolId": "cope-ahead", "query": {"situationId": "conversation"}},
    {"id": "rehearse", "toolId": "rehearse", "planned": True},
    {"id": "opposite_action", "toolId": "opposite-action"},
    {"id": "finding_connection", "toolId": "finding-connection", "planned": True},
    {"id": "let_it_be", "toolId": "let-it-be", "planned": True},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    out = [("safety", v, label, {}, None) for v, label in SAFETY]
    out += [("go", v, label, {}, None) for v, label in GO]
    out += [("first", v, label, {}, None) for v, label in FIRST]
    out += [("what", v, label, props, "RelationshipCategory" if props else None) for v, label, props in WHAT]
    out += [("try", v, label, {}, None) for v, label in TRY]
    out += [("decide", v, label, {}, None) for v, label in DECIDE]
    out += [("save", v, label, {}, None) for v, label in SAVE]
    out += [("revisit", v, label, {}, None) for v, label in REVISIT]
    out += [("channel", v, label, {}, None) for v, label in CHANNEL]
    out += [("open_line", v, label, {}, "EndingScriptLine") for v, label in OPEN]
    out += [("decision_line", v, label, props, "EndingScriptLine") for v, label, props in DECISION]
    out += [("practical", v, label, {}, "EndingScriptLine") for v, label in PRACTICAL]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("checkin", v, label, {}, None) for v, label in CHECKIN]
    out += [("after", v, label, props, None) for v, label, props in AFTER]
    out += [("again", v, label, {}, None) for v, label in AGAIN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "safety", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (plan C6.2), never asked or inferred (D1).
    "accepts": ["band", "frame"],
    "copy": {**COPY, **CARD_COPY}, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
    # R15: nothing is written until the safety answer; in the safety branch, nothing at all unless saved; and a
    # check-in answered *I don't feel safe* saves nothing from that visit.
    "persist": {"after": "safety", "nothingWhen": {"any": [
        {"all": [UNSAFE, {"not": IS("save", "yes")}]},
        IS("after", "unsafe"),
    ]}},
    "quickExit": True,
    "resumeAt": ["after"],
}
