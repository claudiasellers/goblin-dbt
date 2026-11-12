"""Keep your self-respect (FAST, DBT IE Handout 7) as two skills under the one `fast` tool id
(docs/design/fast.md; PRD IE-05; plan IE-B1). The editable source.

  fast_review   the standalone review, for calm time: what happened, one FAST card with its repair move, the
                line kept on paper, a hand-off.
  fast_let_go   the Let go route, for when the answer was no: an acknowledgement, a boundary line (copyable,
                never locked) or nothing, then meeting the need somewhere else.

The page (src/pages/tools/Fast.tsx) opens Let go for `?frame=let_go` or a carried flooded reading (the PRD's
flooded path: the line now, the review another day), and the review otherwise. The inline FAST strip is the
composer's (IE-B3). Saving the line on the person waits on IE-03 and the keep action (IE-B2, F2).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py
"""

TOOL_ID = "fast"
CONCEPT = "dbt_fast"
OWN_MAX = 140
# A line to say or keep is one breath long (Cope Ahead's moves and the witness lines are 90 too).
LINE_MAX = 90

# Words the line card uses (props on its steps; the embed has no copy of its own).
# The boundary line card's words (copy keys in both skills; the player resolves them, EMBED_PROPS).
CARD_COPY = {"card_copy": "Copy", "card_copied": "Copied", "card_selected": "The line is selected, ready to copy."}


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


# ---------------------------------------------------------------------------------------------
# fast_review: the standalone review (PRD IE-05 "Standalone")
# ---------------------------------------------------------------------------------------------

REVIEW_COPY = {
    "what_title": "Looking back, which of these happened?",
    "what_hint": "This happens to a lot of people. Pick the one you'd most like to change.",
    "what_own": "Something else",
    # A: Apologies
    "sorry_title": "Was there something you did that needs a sorry?",
    "sorry_instead_title": "What could take the place of the extra sorries next time?",
    "card_a_title": "One sorry for a real wrong. None for having a need.",
    # S: Stick to values
    "values_title": "Which value do you want to keep next time?",
    "values_hint": "Pick one or two.",
    "card_s_title": "The value you'd keep",
    # T: Truthful
    "truth_title": "What's the true version?",
    "card_t_title": "The true version",
    # F: Fair, to you as well as to them
    "instead_title": "What would you say instead, next time?",
    "card_f_title": "What you'd say instead",
    "own_hint": "Say it my way",
    "next_line": "That's one move to carry into the next conversation.",
    "next_line_wrong": "A sorry for a real wrong is part of keeping your self-respect. Check the Facts can help with whether the guilt fits, and what would repair it.",
    "next_line_unsure": "Not sure about the sorry? Check the Facts can help sort it out.",
    "next": "Next",
    "done": "Done",
    **CARD_COPY,
}

# What happened: one chip per FAST slip, each with its letter (props) so a reader can count them.
WHAT = [
    ("over_sorry", "I said sorry more than I meant", "A"),
    ("went_along", "I went along with something I don't agree with", "S"),
    ("bent_truth", "I made it sound bigger or smaller than it was", "T"),
    ("made_excuse", "I made up a reason instead of saying what was true", "T"),
    ("let_decide", "I let them decide for me", "F"),
    ("dropped_ask", "I dropped what I was asking for", "F"),
]
SORRY = [
    ("real_wrong", "Yes, one thing"),
    ("no_wrong", "No, I was sorry for asking"),
    ("unsure", "I'm not sure"),
]
SORRY_INSTEAD = [
    ("thanks", "Thank you for hearing me out"),
    ("big_ask", "I know this is a big ask"),
    ("matters", "This matters to me"),
    ("what_i_need", "Here's what I need"),
]
# The values to keep. ER-09's value list (Goal{kind: value}) replaces these when it ships (C5: ER owns values).
VALUES = [
    ("honesty", "Honesty"),
    ("fairness", "Fairness"),
    ("keeping_my_word", "Keeping my word"),
    ("standing_up", "Standing up for myself"),
    ("kindness", "Kindness"),
    ("respect", "Respect for both of us"),
    ("my_health", "Looking after my health"),
    ("my_time", "My time"),
]
# The true version: no helplessness, no exaggeration (IE 7 "T").
TRUTH = [
    ("plainly", "It mattered to me, and I can say that plainly"),
    ("some_of_it", "It's hard, and I can do some of it"),
    ("sometimes", "It happens sometimes, not every time"),
    ("need_help", "I can do this part, and I'd like help with that part"),
    ("real_answer", "I don't want to, and that's a real answer"),
]
INSTEAD = [
    ("think_it_over", "I'd like to think it over before I answer"),
    ("heres_what", "Here's what I'd like"),
    ("doesnt_work", "That doesn't work for me"),
    ("together", "Can we decide this together?"),
    ("both_sides", "I can see your side. Here's mine."),
    ("still_want", "I'm still asking for what I asked for"),
]

LETTER_OF = {v: letter for v, _label, letter in WHAT}
OWN_WHAT = {"all": [{"own": "what"}, {"not": {"set": a("what") + ".ids"}}]}  # own words, no chip (`set` on the bare ref counts own words)


# A host's no (?frame=let_go), and not flooded: a flooded entry, frame or not, keeps the line now and the link (DT-04's
# body first, IE-05's nothing long when flooded; an inline run carries no band).
AFTER_NO = {"all": [{"eq": ["$ctx.frame", "let_go"]}, {"not": {"eq": ["$ctx.band", "flooded"]}}]}


def card(step_id, title, field, copyable, next_to="next"):
    props = {"field": field, "shape": "line" if copyable else "list", "next": "next"}
    if copyable:
        props.update({"copyLabel": "card_copy", "copiedLabel": "card_copied", "selectedLabel": "card_selected"})
    return {
        "id": step_id, "kind": "embed", "embed": "boundaryLine", "title": title, "answerAs": f"{step_id}_copied",
        "props": props,
        "next": [{"to": next_to}],
    }


REVIEW_STEPS = [
    {
        "id": "what", "kind": "ask", "title": "what_title", "hint": "what_hint",
        "fields": [{"id": "what", "options": {"list": "what"}, "max": 1, "required": True,
                    "own": {"hint": "what_own", "countsAsPick": True, "max": LINE_MAX}}],
        "next": [
            {"when": is_("what", "over_sorry"), "to": "sorry"},
            {"when": is_("what", "went_along"), "to": "values"},
            {"when": {"in": [a("what"), ["bent_truth", "made_excuse"]]}, "to": "truth"},
            {"to": "instead"},  # let them decide, dropped the ask, or their own words
        ],
    },
    {
        "id": "sorry", "kind": "ask", "title": "sorry_title",
        "fields": [{"id": "sorry", "options": {"list": "sorry"}, "max": 1, "required": True}],
        "next": [{"to": "sorry_instead"}],
    },
    {
        "id": "sorry_instead", "kind": "ask", "title": "sorry_instead_title",
        "fields": [{"id": "sorry_instead", "options": {"list": "sorry_instead"}, "max": 1, "required": True,
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": LINE_MAX}}],
        "next": [{"to": "card_a"}],
    },
    card("card_a", "card_a_title", "sorry_instead", True),
    {
        "id": "values", "kind": "ask", "title": "values_title", "hint": "values_hint",
        "fields": [{"id": "values", "options": {"list": "values"}, "max": 2, "swap": True, "required": True,
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": 40}}],
        "next": [{"to": "card_s"}],
    },
    card("card_s", "card_s_title", "values", False),
    {
        "id": "truth", "kind": "ask", "title": "truth_title",
        "fields": [{"id": "truth", "options": {"list": "truth"}, "max": 1, "required": True,
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": LINE_MAX}}],
        "next": [{"to": "card_t"}],
    },
    card("card_t", "card_t_title", "truth", True),
    {
        "id": "instead", "kind": "ask", "title": "instead_title",
        "fields": [{"id": "instead", "options": {"list": "instead"}, "max": 1, "required": True,
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": LINE_MAX}}],
        "next": [{"to": "card_f"}],
    },
    card("card_f", "card_f_title", "instead", True),
    {
        "id": "next", "kind": "handoff", "complete": True,
        "lines": [
            {"when": is_("sorry", "real_wrong"), "key": "next_line_wrong"},
            {"when": is_("sorry", "unsure"), "key": "next_line_unsure"},
            {"when": None, "key": "next_line"},
        ],
        "offers": [
            # Guilt that fits a real wrong: check it, then repair (the PRD's guard against "never apologise").
            {"exit": "check_the_facts", "when": {"in": [a("sorry"), ["real_wrong", "unsure"]]}},
            {"exit": "rehearse", "when": None},
            {"exit": "dear_man", "when": {"any": [is_("what", "dropped_ask"), is_("what", "let_decide"), OWN_WHAT]}},
        ],
        "done": "done",
    },
]

REVIEW_EXITS = [
    {"id": "check_the_facts", "toolId": "check-the-facts"},
    {"id": "rehearse", "toolId": "rehearse", "planned": True},
    {"id": "dear_man", "toolId": "dear-man"},
    {"id": "done", "done": True},
]


def review_options():
    out = [("what", v, label, {"letter": letter}, None) for v, label, letter in WHAT]
    out += [("sorry", v, label, {}, None) for v, label in SORRY]
    out += [("sorry_instead", v, label, {}, None) for v, label in SORRY_INSTEAD]
    out += [("values", v, label, {}, None) for v, label in VALUES]
    out += [("truth", v, label, {}, None) for v, label in TRUTH]
    out += [("instead", v, label, {}, None) for v, label in INSTEAD]
    return out


REVIEW = {
    "id": "fast_review", "toolId": TOOL_ID, "concept": CONCEPT, "version": "fast-review-v1", "start": "what",
    "ownMax": OWN_MAX, "accepts": ["frame"], "copy": REVIEW_COPY, "tables": {}, "derive": [],
    "steps": REVIEW_STEPS, "exits": REVIEW_EXITS, "options": review_options(), "emotionFields": [],
    # dbt_fast ADDRESSES (Claudia, 10 Nov 2026): the PRD's list less unjustified guilt, which the graph can't tell
    # apart from guilt (one guilt word). Live on load: Find the feeling can offer FAST for these words.
    "addresses": ["cold_shame", "inferior", "insignificant"],
}


# ---------------------------------------------------------------------------------------------
# fast_let_go: the Let go route (PRD IE-05 "Let go route"; IE Arch #30, #31, #37)
# ---------------------------------------------------------------------------------------------

LET_GO_COPY = {
    "line_title": "Do you want a line that says where you stand?",
    "line_hint": "A boundary line says what you'll do. It doesn't argue.",
    "line_none": "I don't need to say anything",
    "own_hint": "Say it my way",
    "card_title": "Your line, to use or not",
    # After a host's no (?frame=let_go): the acknowledgement, and the one acceptance line (IE Arch #31). Not said on a
    # flooded entry with no frame, where no one may have said no.
    "elsewhere_line_no": "You said what you needed, and that counts. It's a no for now. What you needed still matters, and it can be met somewhere else.",
    "elsewhere_line": "What you needed still matters. It can be met somewhere else.",
    "elsewhere_line_none": "Saying nothing is a choice too. What you needed still matters, and it can be met somewhere else.",
    # IE-B4: after a host's no, Let it be (DT-04) inline, here, instead of a link out.
    "room_title": "Do you want to make some room for it here, for a few minutes?",
    "room_hint": "Not to agree with the no, or to give up what you need. Only to stop fighting what can't change today.",
    "room_here": "Yes, here",
    "room_later": "Not now",
    "after_line": "Making room for it is something you can come back to. What you needed still matters.",
    "unsafe_line": "Your safety comes first. You don't have to accept anything that's still hurting you. The support here is there any time.",
    "unsafe_line_made_room": "You made room for what's already happened. You don't have to accept anything that's still hurting you. The support here is there any time.",
    "body_line": "That's a lot to carry. Your body first, then the rest can wait.",
    "next": "Next",
    "done": "Done",
    **CARD_COPY,
}

# Boundary lines (Wound PRD §7.1 BoundaryLine, ≥ 8): each says what the person will do, short and non-attacking,
# usable while flooded. The first is Recover's Let it land line without its last sentence.
BOUNDARY_LINES = [
    ("not_argue", "I've said how this lands. I won't argue about whether my feelings are real."),
    ("not_keep_asking", "I've said what I need. I'm not going to keep asking."),
    ("hear_no", "I hear that it's a no. I'm stepping back from this for now."),
    ("see_differently", "We see this differently. I'm leaving it there."),
    ("not_today", "I'm not going to talk about this any more today."),
    ("another_time", "I'll come back to this another time."),
    ("space", "I'm going to take some space from this."),
    ("another_way", "I'm going to look after this need another way."),
]
# Served on Let go: five lines and the choice to say nothing, second, so the whole screen and its quiet link fit
# one phone screen (flooded is this route's entry). The other three are Python-only drafts (never options in the
# graph) until a host serves them (Recover's Land, IE-B4; Ending, IE-08).
SERVED_LINES = ["not_keep_asking", "none", "hear_no", "not_today", "another_way", "not_argue"]
LINE_LABEL = {**dict(BOUNDARY_LINES), "none": LET_GO_COPY["line_none"]}

LET_GO_STEPS = [
    {
        "id": "line", "kind": "ask", "title": "line_title", "hint": "line_hint",
        "fields": [{"id": "line", "options": {"list": "line"}, "max": 1, "required": True,
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": LINE_MAX}}],
        "next": [{"when": {"all": [is_("line", "none"), AFTER_NO]}, "to": "room"},
                 {"when": is_("line", "none"), "to": "elsewhere"}, {"to": "card"}],
    },
    {**card("card", "card_title", "line", True, next_to="elsewhere"),
     "next": [{"when": AFTER_NO, "to": "room"}, {"to": "elsewhere"}]},
    # After a host's no: the acknowledgement, then Let it be inline (R8) if they want it. A flooded entry with no frame
    # keeps the hand-off below, with Let it be as a link (it asks about the body itself).
    {
        "id": "room", "kind": "ask", "title": "room_title", "hint": "room_hint",
        "lines": [
            {"when": is_("line", "none"), "key": "elsewhere_line_none"},
            {"when": None, "key": "elsewhere_line_no"},
        ],
        "fields": [{"id": "room", "options": {"list": "room"}, "max": 1, "required": True}],
        "next": [{"when": is_("room", "here"), "to": "accept"}, {"to": "after"}],
    },
    {
        "id": "accept", "kind": "embed", "embed": "inlineSkill", "answerAs": "accepted",
        "props": {"skill": "let_it_be", "enterAt": "what"},
        "next": [
            {"when": {"any": [{"has": ["$a.accepted.ids", "unsafe"]}, {"has": ["$a.accepted.ids", "stopped"]}]}, "to": "unsafe"},
            {"when": {"has": ["$a.accepted.ids", "body"]}, "to": "body"},
            {"to": "after"},
        ],
    },
    {
        "id": "after", "kind": "handoff", "complete": True,
        "lines": [{"when": {"set": "$a.accepted"}, "key": "after_line"}, {"when": None, "key": "elsewhere_line"}],
        "offers": [
            {"exit": "recover", "when": None},
            {"exit": "finding_connection", "when": None},
        ],
        "done": "done",
    },
    {
        # Let it be's danger check said anything but no: never acceptance of ongoing harm (C6, its own safety rule).
        "id": "unsafe", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "other_person", "when": {"all": []}}],
        "lines": [{"when": {"has": ["$a.accepted.ids", "finished"]}, "key": "unsafe_line_made_room"}, {"when": None, "key": "unsafe_line"}],
        "offers": [{"exit": "safety_open", "when": None}, {"exit": "cool_down", "when": {"has": ["$a.accepted.ids", "body"]}},
                   {"exit": "ending_careful", "when": None}],
        "done": "done",
    },
    {
        "id": "body", "kind": "handoff", "complete": True, "noClose": True,
        "lines": [{"when": None, "key": "body_line"}],
        "offers": [{"exit": "cool_down", "when": None}],
        "done": "done",
    },
    {
        "id": "elsewhere", "kind": "handoff", "complete": True,
        "lines": [
            {"when": is_("line", "none"), "key": "elsewhere_line_none"},
            {"when": {"eq": ["$ctx.frame", "let_go"]}, "key": "elsewhere_line_no"},
            {"when": None, "key": "elsewhere_line"},
        ],
        # Meet the need elsewhere: Recover, from its start until IE-B4 gives it `enterAt` (then its need step, WMP's
        # need-restoration picker; the Witness deck waits on WMP); acceptance (DT-04)
        # and finding your people (IE-09) once they ship.
        "offers": [
            {"exit": "let_it_be", "when": None},
            {"exit": "recover", "when": None},
            {"exit": "finding_connection", "when": None},
        ],
        "done": "done",
    },
]

LET_GO_EXITS = [
    {"id": "let_it_be", "toolId": "let-it-be"},
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "recover", "toolId": "recovering-from-invalidation"},
    {"id": "finding_connection", "toolId": "finding-connection", "planned": True},
    {"id": "done", "done": True},
]

LET_GO = {
    "id": "fast_let_go", "toolId": TOOL_ID, "concept": CONCEPT, "version": "fast-let-go-v1", "start": "line",
    "ownMax": OWN_MAX, "accepts": ["frame", "band"], "copy": LET_GO_COPY, "tables": {}, "derive": [],
    "steps": LET_GO_STEPS, "exits": LET_GO_EXITS,
    "options": [("line", v, LINE_LABEL[v], {}, "BoundaryLine" if v != "none" else None) for v in SERVED_LINES]
    + [("room", "here", LET_GO_COPY["room_here"], {}, None), ("room", "later", LET_GO_COPY["room_later"], {}, None)],
    "emotionFields": [],
}

SKILLS = [REVIEW, LET_GO]
