"""Running low (DBT ER Handout 20, PLEASE: reducing vulnerability to emotion mind) as a skill on the runtime.

PRD ER-07 (`PRD – Emotion Regulation.md` §5; docs/design/dbt-modules-plan.md §2.3, batch ER-B4; D6 the
`please-skill` id named "Running low", D8 the PRD's five rows reusing closed PR #33's copy). For "everything is too
much today and I don't know why": five rows one tap each (sleep, food, body, alcohol or drugs, moving), verbal
categories only, then the volume named (the loudest row, a fixed order) and one fix for today from that row's
fixes (a recommendation and a swap, plus *shrink today*), now or later, with an optional evening check
(`please_fix`, reopening the run at *Did it happen?*).

Departures from the PRD, all listed in docs/design/running-low.md with a reason and a batch:
- The readout names the loudest row, not every loud row: one named cause and one fix is the PRD's own transform,
  and a list of every factor reads as a report card. The fixes offered cover every loud row.
- One check per visit, not one per day upserted (the diary is CORE's and isn't built; the record is `ext.run`, D2).
- No weekly pattern card, no "sleep short 3 of 7 → Sleep reset" offer and no monthly *something you've been putting
  off*: each is an aggregate over past visits or a monthly schedule, which a live flow never reads (data layers).
- No per-row hiding in settings: every row can be skipped (nothing is required), and food and substances have
  *not sure* / *rather not say*.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "please_skill"
TOOL_ID = "please-skill"
CONCEPT = "dbt_please"
VERSION = "pl-v1"
OWN_MAX = 90

ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}


def a(field):
    return f"$a.{field}"


COPY = {
    "next": "Next",
    "done": "Done",
    "skip": "Skip this one",
    # The five rows (PRD ER-07 step 1). One tap each, words only: no hours, amounts, calories or weight.
    "sleep_title": "How was your sleep last night?",
    "sleep_hint": "Running low on sleep, food or health can make every feeling louder. One tap each, and any can be skipped.",
    "settle_first": "Things feel loud right now. You could settle your body first.",
    "food_title": "How's food been today?",
    "body_title": "How's your body today?",
    "subs_title": "Any alcohol or drugs in the last day?",
    "subs_hint": "Any answer is fine here, and so is not saying.",
    "moved_title": "Have you moved much today?",
    # The readout (step 2): the loudest row, in a fixed order (the body first: pain and missed meds matter most).
    "vol_body": "Your body is part of why the volume's up today.",
    "vol_sleep": "Sleep is part of why the volume's up today.",
    "vol_food": "Food is part of why the volume's up today.",
    "vol_subs": "Last night is part of why the volume's up today.",
    "vol_moved": "Not moving yet is part of why the volume's up today.",
    "fix_hint": "One thing for today. Pick the smallest one you'd actually do.",
    "fix_own": "Something else",
    # Tired, or heavy? (PR #33's check, as two quiet links): sadness and shame can feel like tiredness.
    "heavy_link": "Rest doesn't refill me: find the feeling",
    # Nothing loud.
    "none_title": "Nothing obvious from the body today",
    "none_line": "That's worth knowing too. If things still feel loud, it may be a feeling more than the body.",
    # Now or later (step 3), with an optional evening check (step 4).
    "when_title": "When will you do it?",
    "remind_label": "Want me to ask tonight if it happened?",
    "set_title": "Looking after your body is the skill",
    "set_now": "Feelings run hotter on an empty tank. This is one small thing for it.",
    "set_later": "It's on for later today.",
    "set_remind": "It'll be on Today this evening, to ask if it happened.",
    "sleep_more": "If short sleep keeps coming back, a sleep reset can help.",
    # The evening card reopens the run here (step 4).
    "back_title": "Did the fix happen?",
    "back_yes": "That's one thing done for your body today.",
    "back_partly": "Part of it counts. Your body got some of what it needed.",
    "back_no": "Days like that happen. Tomorrow's another go, and a smaller thing can count.",
}

# Each row: (step, field, title, hint, [(value, label, loud)]). Values are unique across rows so a fix's `on`
# list can name the answers it's for. Loud answers are the ones that turn the volume up.
ROWS = [
    ("sleep", "sleep", "sleep_title", "sleep_hint", [
        ("sleep_enough", "Enough", False), ("sleep_short", "Short", True), ("sleep_broken", "Broken", True),
        ("sleep_much", "Too much", True), ("sleep_unsure", "Not sure", False)]),
    # ED-safe by design: no calories, amounts, weight or "too much".
    ("food", "food", "food_title", None, [
        ("food_regular", "Regular so far", False), ("food_skipped", "Skipped something", True),
        ("food_all_over", "All over the place", True), ("food_unsure", "Not sure", False)]),
    ("body", "body", "body_title", None, [
        ("body_okay", "Okay", False), ("body_ill", "Ill or sore", True), ("body_pain", "In pain", True),
        ("body_meds", "Missed my meds", True)]),
    # No judgment copy; *rather not say* is a complete answer.
    ("subs", "subs", "subs_title", "subs_hint", [
        ("subs_none", "None", False), ("subs_some", "Some", True), ("subs_rather_not", "Rather not say", False)]),
    ("moved", "moved", "moved_title", None, [
        ("moved_yes", "Yes", False), ("moved_bit", "A bit", False), ("moved_not_yet", "Not yet", True)]),
]
LOUD = {fid: [v for v, _l, loud in opts if loud] for _s, fid, _t, _h, opts in ROWS}
# The readout's order: the body first, then sleep, food, last night, moving.
ORDER = ["body", "sleep", "food", "subs", "moved"]
LOUD_ROW = {f: {"in": [a(f), LOUD[f]]} for f in ORDER}
ANY_LOUD = {"any": [LOUD_ROW[f] for f in ORDER]}

# One fix for today (PRD step 3, PR #33's right-now list): small enough to do while depleted. `on` names the loud
# answers it's for; "always" is offered whatever was picked (lowering the bar is the skill on an empty tank).
# Medication: never advice, only what's already prescribed.
FIXES = [
    ("fix_protein", "Eat something with some protein in it, in the next hour", ["food_skipped", "food_all_over", "subs_some"]),
    ("fix_water", "A glass of water now", ["food_skipped", "body_ill", "subs_some", "sleep_short"]),
    ("fix_meal", "A proper meal, even a small one", ["food_all_over"]),
    ("fix_lie_down", "A 20-minute lie-down before 3pm, with an alarm", ["sleep_short", "sleep_broken"]),
    ("fix_daylight", "Five minutes outside, or by an open window", ["sleep_broken", "sleep_much", "moved_not_yet"]),
    ("fix_sick_care", "Treat it like being sick: rest, fluids, warmth", ["body_ill"]),
    ("fix_usual", "Whatever you'd usually do for the pain", ["body_pain"]),
    ("fix_sit", "Sit or lie down for 15 minutes", ["body_pain"]),
    ("fix_meds", "Check what's due and take it as prescribed", ["body_meds"]),
    ("fix_food_first", "Food and water before any big decisions", ["subs_some"]),
    ("fix_move", "Walk around the block, or the room, for five minutes", ["moved_not_yet", "sleep_much"]),
    ("fix_one_thing", "Shrink today to the one thing that has to happen", ["always"]),
]
FIX_WHERE = {"any": [{"has": ["$opt.on", a(f)]} for f in ORDER] + [{"has": ["$opt.on", "always"]}]}

WHEN = [("now", "Now"), ("later", "Later today")]
REMIND = [("evening", "Yes, this evening")]
BACK = [("done_yes", "Yes"), ("done_partly", "Partly"), ("done_no", "No")]


def steps():
    out = []
    for i, (sid, fid, title, hint, _opts) in enumerate(ROWS):
        nxt = ROWS[i + 1][0] if i + 1 < len(ROWS) else None
        field = {"id": fid, "options": {"list": fid}, "max": 1}
        step = {"id": sid, "kind": "ask", "title": title, "fields": [field]}
        if hint:
            step["hint"] = hint
        if sid == "sleep":
            # Not offered flooded (PRD): a carried flooded reading gets a quiet way to settle first; going on is fine.
            field["links"] = [{"exit": "cool_down", "label": "settle_first", "when": FLOODED}]
        step["next"] = [{"to": nxt}] if nxt else [{"when": ANY_LOUD, "to": "fix"}, {"to": "none"}]
        out.append(step)
    out += [
        {
            "id": "fix", "kind": "ask",
            "title": [{"when": LOUD_ROW[f], "key": f"vol_{f}"} for f in ORDER],
            "hint": "fix_hint",
            "fields": [{"id": "fix", "options": {"list": "fix", "where": FIX_WHERE}, "max": 1, "required": True,
                        "own": {"hint": "fix_own", "countsAsPick": True, "max": OWN_MAX},
                        # Sleep or moving loud: tiredness can be a feeling (PR #33's *tired or heavy?*), one quiet tap.
                        "links": [{"exit": "find_the_feeling", "label": "heavy_link",
                                   "when": {"any": [LOUD_ROW["sleep"], LOUD_ROW["moved"]]}}]}],
            "next": [{"to": "when"}],
        },
        {
            "id": "when", "kind": "ask", "title": "when_title",
            "fields": [
                {"id": "when", "options": {"list": "when"}, "max": 1, "required": True},
                {"id": "remind", "label": "remind_label", "options": {"list": "remind"}, "max": 1,
                 "showWhen": {"eq": [a("when"), "later"]}},
            ],
            # Later today with the chip: please_fix (*Did the fix happen?*) this evening, reopening the run at `back`.
            "followUp": {"type": "please_fix", "whenFrom": "remind",
                         "when": {"all": [{"eq": [a("when"), "later"]}, {"set": a("remind")}]}},
            "next": [{"to": "set"}],
        },
        {
            "id": "set", "kind": "handoff", "complete": True, "title": "set_title",
            "lines": [
                {"when": {"set": a("remind")}, "key": "set_remind"},
                {"when": {"eq": [a("when"), "later"]}, "key": "set_later"},
                {"when": ALWAYS, "key": "set_now"},
            ],
            "offers": [{"exit": "sleep_reset", "when": LOUD_ROW["sleep"]}],
            "done": "done", "next": [],
        },
        {
            "id": "none", "kind": "handoff", "complete": True, "title": "none_title",
            "lines": [{"when": ALWAYS, "key": "none_line"}],
            "offers": [{"exit": "find_the_feeling", "when": ALWAYS}],
            "done": "done", "next": [],
        },
        {
            # The evening card's link reopens the run here, on a run that reached `when`.
            "id": "back", "kind": "ask", "reopens": {"after": "when"}, "clears": ["happened"], "title": "back_title",
            "fields": [{"id": "happened", "options": {"list": "happened"}, "max": 1, "required": True}],
            "next": [{"to": "back_end"}],
        },
        {
            "id": "back_end", "kind": "handoff", "complete": True, "noClose": True, "title": "set_title",
            "lines": [
                {"when": {"eq": [a("happened"), "done_yes"]}, "key": "back_yes"},
                {"when": {"eq": [a("happened"), "done_partly"]}, "key": "back_partly"},
                {"when": ALWAYS, "key": "back_no"},
            ],
            "offers": [], "done": "done", "next": [],
        },
    ]
    return out


EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                              # DT-01 First, the body
    {"id": "find_the_feeling", "toolId": "find-the-feeling"},
    {"id": "sleep_reset", "toolId": "sleep-reset", "planned": True},          # ER-13 Sleep reset (not built)
    {"id": "done", "done": True},
]


def options():
    out = [(fid, v, label, {}, None) for _s, fid, _t, _h, opts in ROWS for v, label, _loud in opts]
    out += [("fix", v, label, {"on": on}, None) for v, label, on in FIXES]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("happened", v, label, {}, None) for v, label in BACK]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "sleep", "ownMax": OWN_MAX,
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": steps(), "exits": EXITS, "options": options(),
    "emotionFields": [],
}
