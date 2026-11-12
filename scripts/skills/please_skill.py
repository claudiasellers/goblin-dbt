"""Running low (DBT ER Handout 20, PLEASE: reducing vulnerability to emotion mind) as a skill on the runtime.

PRD ER-07 (`PRD – Emotion Regulation.md` §5; docs/design/dbt-modules-plan.md §2.3, batch ER-B4; D6 the
`please-skill` id named "Running low", D8 the PRD's five rows reusing closed PR #33's copy). For "everything is too
much today and I don't know why": five rows one tap each (sleep, food, body, alcohol or drugs, moving), verbal
categories only, then the volume named (the loudest row, a fixed order) and one fix for today from that row's
fixes (two or three, plus *shrink today*), now or later, with an optional evening check
(`please_fix`, reopening the run at *Did it happen?*).

Departures from the PRD, all listed in docs/design/running-low.md with a reason and a batch:
- The readout names the loudest row, not every loud row: one named cause and one fix is the PRD's own transform,
  and a list of every factor reads as a report card. The fixes are that row's, which keeps the screen short.
- Not offered flooded (PRD) becomes a quiet *settle your body first* link: nothing locks (C6.2).
- H20's *avoid* in A and *avoid foods that make you emotional* are left out: harm reduction (food and water first) and
  eating-disorder safety (C6.7). *See a doctor when necessary* is a quiet line on the fix screen when ill or in pain.
- One check per visit, not one per day upserted (the diary is CORE's and isn't built; the record is `ext.run`, D2).
- No weekly pattern card, no "sleep short 3 of 7 → Sleep reset" offer and no monthly *something you've been putting
  off*: each is an aggregate over past visits or a monthly schedule, which a live flow never reads (data layers).
- Sleep reset (ER-13) from the sleep row is a planned exit until it's built (ER-B5).
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
    # The five rows (PRD ER-07 step 1). One tap each, words only: no hours, amounts, calories or weight.
    "sleep_title": "How was your sleep last night?",
    "sleep_hint": "Running low on sleep, food or health can make every feeling louder. One tap each, and any can be skipped.",
    "settle_first": "Things feel loud right now. You could settle your body first.",
    "food_title": "How's food been today?",
    "body_title": "How's your body today?",
    "subs_title": "Any alcohol or drugs in the last day?",
    "subs_hint": "Any answer is fine here, and so is not saying.",
    "moved_title": "Have you moved today?",
    # The readout (step 2, the batteryRead screens' titles): the loudest row, in a fixed order (the body first: pain and missed meds matter most).
    # Hedged (one tap is not a cause) and never effort-blame (voice S5: a still day is the body, not the person).
    "vol_body": "Your body may be part of why the volume's up today.",
    "vol_sleep": "Sleep may be part of why the volume's up today.",
    "vol_food": "Food may be part of why the volume's up today.",
    "vol_subs": "Alcohol or drugs may be part of why the volume's up today.",
    "vol_moved": "A still day can keep the volume up. That's the body, not you.",
    "tank_names": "Sleep · Food · Body · Alcohol or drugs · Moving",
    "fix_title": "One thing for today",
    "fix_hint": "Pick the smallest one that feels doable.",
    # Ill or in pain (H20's *see a doctor when necessary*): a quiet line, never a gate.
    "fix_care": "If it's new, bad or not easing, a doctor or pharmacist can help.",
    "fix_own": "Something else",
    # Tired, or heavy? (PR #33's check, as two quiet links): sadness and shame can feel like tiredness.
    "heavy_link": "Rest doesn't refill me: find the feeling",
    # Nothing loud.
    "none_title": "Nothing obvious from the body today",
    "none_line": "That's worth knowing too. If things still feel loud, it may be a feeling more than the body.",
    # Now or later (step 3), with an optional evening check (step 4).
    "when_title": "When will you do it?",
    "remind_label": "Want me to ask tonight if it happened?",
    "set_title": "Your one thing for today: {fix}",
    "back_end_title": "Looking after your body is the skill",
    "set_now": "Feelings run hotter on an empty tank. This is one small thing for it.",
    "set_later": "It's on for later today.",
    "set_remind": "It'll be on Today this evening, to ask if it happened.",
    # The evening card reopens the run here (step 4).
    "back_title": "Did it happen? {fix}",
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
# The readout's order: the body first, then sleep, food, alcohol or drugs, moving.
ORDER = ["body", "sleep", "food", "subs", "moved"]
LOUD_ROW = {f: {"in": [a(f), LOUD[f]]} for f in ORDER}
ANY_LOUD = {"any": [LOUD_ROW[f] for f in ORDER]}

# One fix for today (PRD step 3, PR #33's right-now list): small enough to do while depleted. `on` names the loud
# answers it's for; "always" is offered whatever was picked (lowering the bar is the skill on an empty tank).
# Medication: never advice; a missed dose goes to the label or a pharmacist, never "take it now".
FIXES = [
    # Food (ED-safe, C6.7): regular eating, never a nutrient, a size or "proper".
    ("fix_snack", "Something to eat in the next hour, whatever's easy", ["food_skipped", "food_all_over", "subs_some"]),
    ("fix_water", "A glass of water now", ["food_skipped", "body_ill", "subs_some", "sleep_short"]),
    ("fix_mealtime", "A meal or snack at your next usual mealtime", ["food_all_over"]),
    # Short sleep only: daytime naps work against broken sleep (insomnia care), and no clock time (it may be late).
    ("fix_rest", "A short rest with an alarm set, if it's not too late in the day", ["sleep_short"]),
    ("fix_daylight", "Five minutes outside, or by an open window", ["sleep_broken", "sleep_much", "moved_not_yet"]),
    ("fix_sick_care", "Look after it like a cold: rest, fluids, warmth", ["body_ill"]),
    ("fix_usual", "Whatever you'd usually do for the pain", ["body_pain"]),
    ("fix_sit", "Sit or lie down for 15 minutes", ["body_pain"]),
    # A missed dose: never "take it now" (a late or doubled dose can be wrong); the label or a pharmacist says.
    ("fix_meds", "Check the label, or ask a pharmacist, about the missed dose", ["body_meds"]),
    ("fix_food_first", "Food and water before any big decisions", ["subs_some"]),
    ("fix_move", "Walk around the block, or the room, for five minutes", ["moved_not_yet", "sleep_much"]),
    ("fix_one_thing", "Shrink today to the one thing that has to happen", ["always"]),
]
# The loudest row's fixes only (the first loud row in ORDER), so the screen stays at two or three plus shrink today.
# The body first also keeps a walk away from someone ill or in pain.
FIX_WHERE = {"any": [{"all": [LOUD_ROW[f], *({"not": LOUD_ROW[g]} for g in ORDER[:i]), {"has": ["$opt.on", a(f)]}]}
                     for i, f in enumerate(ORDER)] + [{"has": ["$opt.on", "always"]}]}
BODY_HURTS = {"in": [a("body"), ["body_ill", "body_pain"]]}

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
        # The last row: the loudest row's readout, in ORDER (the first loud row wins), or nothing loud.
        step["next"] = [{"to": nxt}] if nxt else [{"when": LOUD_ROW[f], "to": f"read_{f}"} for f in ORDER] + [{"to": "none"}]
        out.append(step)
    # The readout (PRD step 2): the day's tank, one cell per row, the loudest drained (`batteryRead`); its title names it.
    for f in ORDER:
        out.append({
            "id": f"read_{f}", "kind": "embed", "embed": "batteryRead", "answerAs": "tank", "title": f"vol_{f}",
            "props": {"fields": [r[1] for r in ROWS], "low": f, "names": "tank_names", "next": "next"},
            "next": [{"to": "fix"}],
        })
    out += [
        {
            "id": "fix", "kind": "ask", "title": "fix_title", "hint": "fix_hint",
            "lines": [{"when": BODY_HURTS, "key": "fix_care"}],
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
            "id": "set", "kind": "handoff", "complete": True, "title": "set_title", "titleSlots": {"fix": {"labelOf": "fix"}},
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
            "titleSlots": {"fix": {"labelOf": "fix"}},
            "fields": [{"id": "happened", "options": {"list": "happened"}, "max": 1, "required": True}],
            "next": [{"to": "back_end"}],
        },
        {
            "id": "back_end", "kind": "handoff", "complete": True, "noClose": True, "title": "back_end_title",
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
