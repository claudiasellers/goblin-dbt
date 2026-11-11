"""DEAR MAN's debrief (DBT IE Handouts 5, 9) as a skill on the runtime: `dear_man_debrief` under the `dear-man`
tool id (IE-B2 second PR; PRD IE-01 Mode D and IE-11; docs/design/dear-man-debrief.md).

  feel        how they are right now (a cool-down link while shaky or wound up)
  happened    did it happen? yes · not yet · decided not to (accepted without rescue)
  outcome     got it · partly · no · no answer yet, then still okay between you?, then proud of how you handled it?
  went_well   got it: the readout, and *look at what worked* or enough for now
  factor      partly / no / no answer (IE-11, Handout 9): what got in the way most? one chip, things that happen, not
              faults; *look at what happened first* opens the chain and comes back here
  chain       moment → response → body → thought → underneath → who showed up (parts on) → reflection → what to
              try → rehearse it → the moment plan
  fix         the factor's one move, offered as the tools that do it, and *try again* (a new prep, which books its
              own "How did it go?")

The page (src/pages/tools/DearMan.tsx, `?mode=debrief`) asks who it was with first (PersonPicker, people.md) and
passes the person in as `$ctx.personId`; someone on the safety route gets the safety screen, never this skill. The
run's projection (functions/src/dearMan/debriefProjection.ts) writes the legacy DearManSession {type: 'debrief'},
the `Interaction` and the person's refusal counts.

The chain's clinical vocabulary stays in scripts/dear-man/content.py (TurningPoint, MomentResponse, BodySignal,
ThoughtPattern, Underneath, Reflection, CopeAhead nodes): options here present those nodes (PRESENTS), with labels
the voice check passes, and the reflections and rehearsals re-voiced (no physiology claims, no "just").

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)

ID = "dear_man_debrief"
TOOL_ID = "dear-man"
CONCEPT = "dbt_dear_man"
VERSION = "dm-debrief-v1"
OWN_MAX = 140


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def has(field, v):
    return {"has": [a(field) + ".ids", v]}


ALWAYS = {"all": []}  # the condition language's true
# A refusal or a partial answer asks what got in the way; *No answer yet* doesn't (nothing has gone wrong yet).
BAD = {"in": [a("outcome"), ["partly", "no"]]}
LOUD = {"any": [has("feel", "shaky"), has("feel", "wound_up")]}
LOW = {"any": [has("feel", "hurt"), has("feel", "defeated")]}
UNSAFE = is_("between", "unsafe")
OTHER_PERSON = [{"variant": "other_person", "when": UNSAFE}]

# --- The person picker's words, from the one source (DearManSafetyCopy): the page shows the picker before the run
# from this copy, so the debrief never waits on getDearManContent. Never shown by a step.
PICKER_KEYS = [
    "personWhoDebrief", "personNew", "personNameLabel", "personNameHint", "personRoleLabel", "personKeepLine", "personNoNameLine",
    "personSignedOutLine", "personGoOn", "personChanged", "personChangedHint", "safeQuestion", "safeYes", "safeNo",
    "safeUnsure", "riskQuestion", "riskHarm", "riskBadly", "riskUnsaid",
    "safetyRouteDebriefHeading", "safetyRouteBody", "safetyRouteEnding", "safetyRouteBack",
]
PICKER_COPY = {f"picker_{k}": DM.SAFETY_COPY[k] for k in PICKER_KEYS}

COPY = {
    "feel_title": "Before we look back, how are you feeling right now?",
    "feel_hint": "Pick up to three.",
    "cool_down": "Settle my body first",
    "talk_now": "Talk to someone now",
    "happened_title": "Did the conversation happen?",
    "outcome_title": "How did it turn out?",
    "between_title": "Is it still okay between you?",
    "proud_title": "Are you proud of how you handled it?",
    "proud_hint": "However it turned out.",
    "went_well_title": "You got what you asked for.",
    "went_well_title_proud": "You got what you asked for, and you're proud of how you did it.",
    "more_title": "Want to look at what worked, so you can do it again?",
    "factor_title_partly": "Part of it landed. What got in the way most?",
    "factor_title_no": "It didn't go your way this time. What got in the way most?",
    "factor_title_no_answer": "No answer can be hard to sit with. Looking back, what got in the way most?",
    "factor_hint": "One is enough. These happen to most people.",
    "waiting_title": "No answer can be hard to sit with.",
    "waiting_more": "Want to look at how it went, or leave it for now?",
    "again_label": "Want me to ask again?",
    "moment_title": "Was there a moment where things shifted?",
    "pick_any": "Pick any that fit.",
    "response_title": "What did you do in that moment?",
    "body_title": "What was happening in your body, right before or during it?",
    "thought_title": "What thoughts showed up?",
    "thought_own": "Something else",
    "underneath_title": "Underneath that, what was the deeper feeling?",
    "reflect_hint": "Does that land?",
    "cope_title": "What could you try when that moment comes again?",

    "plan_title": "Your moment plan",
    "plan_next": "Next",
    "next": "Next",
    "done": "Done",
    # Handoffs
    "not_yet_line": "It's still ahead. When you want, you can get ready for it, or leave it for now.",
    "waiting_line": "When you hear back, you can look at it here again.",
    "later_line": "That was a lot. We can look at the rest later.",
    "unsafe_line": "Your safety comes first. The people below can help, any time, and you don't have to be sure.",
    "decided_not_line": "Deciding not to have it is a real answer. You know your situation best.",
    "good_line_proud": "You asked, and you're proud of how you did it. That's the skill working.",
    "good_line_shaky": "You got what you asked for, and things feel unsettled between you. Both can be true at once.",
    "good_line": "You asked for what you needed. That counts.",
    "good_line_not_proud": "You got what you asked for. If how you did it doesn't sit right, keeping your self-respect can be part of the plan next time.",
    "fix_no_words": "When the words go, a line ready ahead of time is easier to find. Saying it out loud first helps it stick.",
    "fix_unclear": "Next time, pick the one thing that matters most before you start. A plan can help you find it.",
    "fix_feelings": "Feelings rising fast is common in hard talks. A plan for that moment, and a check on how you're doing before you start, can help.",
    "fix_belief": "Worries like that can be checked. Looking at the facts can loosen their grip.",
    "fix_quick_win": "Ending it fast can cost what you came for. Keeping your self-respect in view can help you hold on a little longer.",
    "fix_power": "When they hold more of the power, a smaller ask or another route can be wiser. If it's the relationship itself, that's worth looking at too.",
    "fix_cant_give": "Some needs can't be met by this person. That doesn't make the need wrong. There may be other places to meet it.",
    "fix_not_willing": "Asking skilfully doesn't decide their answer. You did your part.",
    **PICKER_COPY,
}

FEEL = [
    ("okay", "Okay"), ("relieved", "Relieved"), ("drained", "Drained"), ("numb", "Numb"),
    ("shaky", "Shaky"), ("wound_up", "Wound up"), ("defeated", "Defeated"), ("hurt", "Hurt"),
]
HAPPENED = [("yes", "Yes"), ("not_yet", "Not yet"), ("decided_not", "I decided not to")]
OUTCOME = [("got_it", "I got what I asked for"), ("partly", "Partly"), ("no", "No"), ("no_answer", "No answer yet")]
BETWEEN = [("yes", "Yes"), ("shaky", "Shaky"), ("no", "No"), ("unsafe", "I don't feel safe with them")]
WAIT = [("look", "Look at how it went"), ("leave", "Leave it for now")]
# ask_outcome's window chips (scripts/practice-spine/content.py). No chip: no card.
AGAIN = [("tomorrow", "Tomorrow"), ("this_week", "In a few days")]
PROUD = [("yes", "Yes"), ("sort_of", "Sort of"), ("no", "Not really")]
MORE = [("look", "Look at what worked"), ("enough", "That's enough for now")]

# IE-11 (Handout 9, factors that reduce interpersonal effectiveness), phrased as things that happen. Each is a
# TroubleshootFactor node too (scripts/dear-man/content.py TROUBLESHOOT_FACTORS), which the option presents.
FACTORS = [(f["id"], f["label"]) for f in DM.TROUBLESHOOT_FACTORS]
LOOK_FIRST = ("look", "I'd like to look at what happened first")

# Chip labels the voice check changes (the node keeps its own label for older readers).
LABELS = {
    "tp_apologized": "I said sorry when I didn't need to",
    "thought_should_know": "They ought to know without me saying",
    "under_grief": "Grief for how it was meant to be",
    "mr_left": "I left or ended it",
    "ca_pause_phrase": "Have a pause line ready",
    "ca_body_anchor": "Settle your body first",
    "ca_broken_record": "Come back to your one line",
    "ca_name_the_dynamic": "Name what's happening",
    "ca_planned_exit": "Plan your exit line",
    "ca_validate_first": "Start by naming their side",
    "ca_tears_plan": "Make a plan for tears",
    "ca_apology_check": "Check before saying sorry",
    "ca_write_it_down": "Write your key points down",
    "ca_time_limit": "Set a time limit",
    "ca_success_anchor": "Remember what worked this time",
}


def label(n):
    return LABELS.get(n["id"], n["label"])


# The reflections, re-voiced (the nodes' text predates the voice rules: physiology, "just"). Keyed by node id; each
# shows when the moment and the response it reflects on were both picked, the first match wins, else the default.
REFLECTIONS = {
    "ref_defensive_froze": "When someone gets defensive, freezing is common. The skill isn't never freezing. It's having a plan for when you do.",
    "ref_defensive_loud": "When they got defensive, you matched their intensity. That happens to most people. The aim is to notice the surge a moment before it takes over.",
    "ref_defensive_quiet": "Going quiet when someone gets defensive can be a way to protect yourself. The question is whether the quiet helped you, or only kept the peace.",
    "ref_crying_froze": "Tears and freezing can come when there's too much to hold at once. Next time you can give yourself permission to pause.",
    "ref_crying_cried": "Tears in a hard talk usually mean it matters to you. The skill is keeping going through them, or saying 'I need a minute' without dropping what you need.",
    "ref_apologized_agreed": "Saying sorry and agreeing when you don't mean it makes the discomfort stop for now. The need doesn't go away. It goes quiet.",
    "ref_apologized_quiet": "Saying sorry and then going quiet can be something people learn when asking felt risky. Your voice is still there.",
    "ref_nowords_froze": "When feelings flood in, words are hard to reach. It's not that you had nothing to say. A few lines ready ahead of time can help.",
    "ref_nowords_changed": "Changing the subject when the words wouldn't come was a way out of the moment. One rehearsed sentence can be there for you next time.",
    "ref_gavein_agreed": "Giving in to keep the peace makes sense when conflict feels risky. Peace paid for with your needs costs a lot. A plan for next time can help you hold on a little longer, when it's safe to.",
    "ref_gavein_left": "Leaving can be a wise move, especially before saying something you'd regret. If you want to come back to it, a plan for that can help.",
    "ref_escalated_loud": "When it escalated and you got louder, you were trying to be heard. Volume usually makes it harder for the other person to hear you.",
    "ref_escalated_left": "Leaving when things escalate can be a skill. One sentence can turn it into a break: 'I need to pause. I want to come back to this.'",
    "ref_okay_stayed": "You stayed on course, so something worked. Was it something you said, something you didn't say, or something you did with your body?",
    "ref_default": "Whatever happened in that moment, you did the best you could with what you had. Let's find something you can reach for next time.",
}
REHEARSALS = {
    "ca_pause_phrase": "Choose one sentence for when you feel the moment coming, like 'I want to keep talking about this. I need a second.' Say it out loud three times now. Notice how it feels to say.",
    "ca_body_anchor": "When you notice the signal: feet on the floor, hands on your thighs, one slow breath. It buys you a couple of seconds to think. Try it now: feet, hands, breath.",
    "ca_broken_record": "Pick your one key sentence, the thing you need to say. When the talk starts spinning, come back to it. Same words, calm voice: 'What I need is…' Say it three times now, a little softer each time.",
    "ca_name_the_dynamic": "When things heat up, name the pattern instead of the content: 'I notice we're both getting louder. I don't want that. Can we slow down?' Say it out loud now.",
    "ca_planned_exit": "Choose your exit line now: 'I care about this too much to keep going while we're both this upset. Can we come back to it at [a time]?' Naming a time makes it a pause, not an escape. Say it out loud.",
    "ca_validate_first": "Before you say what you need, name what they might be feeling: 'I can see this is hard for you too.' One line like that can lower their guard. Say it now.",
    "ca_tears_plan": "Give yourself permission ahead of time: 'If I cry, that's okay. I'll keep talking.' You could tell them: 'I might get emotional. It doesn't mean I want to stop.' Say that now and notice what comes up.",
    "ca_apology_check": "When you feel the urge to say sorry, pause and ask: 'Did I do something wrong, or am I uncomfortable?' If it's discomfort, try 'I know this is hard' instead of 'I'm sorry'. Practise the swap now.",
    "ca_write_it_down": "Write down the two or three things you want to say. It's not a script. It's something to glance at if the words go. Do it now, on your phone or on paper.",
    "ca_time_limit": "Before you start, say: 'I'd like to talk about this for 15 minutes, then check how we're both doing.' A time limit makes a hard talk feel more doable, and gives you a natural place to stop.",
    "ca_success_anchor": "You stayed on course. Before it fades, describe what you did with your body, your voice, and where you put your attention. Write it down. That's your playbook for next time.",
}
COPY.update({f"reflect_{k}": v for k, v in REFLECTIONS.items()})
# Practising is offered, never required: each ends with a way to leave it for later (the button is Next).
COPY.update({f"rehearse_{k}": f"{v} Or come back to it later." for k, v in REHEARSALS.items()})

REFLECT_TITLES = [
    {"key": f"reflect_{r['id']}", "when": {"all": [has("moment", r["turningPoint"]), has("response", r["response"])]}}
    for r in DM.REFLECTIONS if not r["isDefault"]
] + [{"key": "reflect_ref_default"}]

# What to try: the universal moves, and the ones for any response picked (CopeAhead FOR_RESPONSE).
RESPONSES = [m["id"] for m in DM.MOMENT_RESPONSES]
COPE_WHERE = {"any": [{"eq": ["$opt.universal", True]}] + [
    {"all": [has("response", mr), {"has": ["$opt.responses", mr]}]} for mr in RESPONSES
]}

FACTOR_FIX = {f["id"]: f for f in DM.TROUBLESHOOT_FACTORS}
RETRY = {"in": [a("factor"), ["no_words", "unclear", "feelings", "belief", "quick_win"]]}

STEPS = [
    {
        "id": "feel", "kind": "ask", "title": "feel_title", "hint": "feel_hint",
        "fields": [{"id": "feel", "options": {"list": "feel"}, "max": 3, "swap": True, "required": True,
                    "links": [{"exit": "cool_down", "label": "cool_down", "when": LOUD},
                              {"exit": "safety_open", "label": "talk_now", "when": LOW}]}],
        "next": [{"to": "happened"}],
    },
    {
        "id": "happened", "kind": "ask", "title": "happened_title",
        "fields": [{"id": "happened", "options": {"list": "happened"}, "max": 1, "required": True}],
        "next": [{"when": is_("happened", "not_yet"), "to": "not_yet"}, {"when": is_("happened", "decided_not"), "to": "decided_not"},
                 {"to": "outcome"}],
    },
    {
        "id": "outcome", "kind": "ask", "title": "outcome_title",
        "fields": [{"id": "outcome", "options": {"list": "outcome"}, "max": 1, "required": True}],
        "next": [{"to": "between"}],
    },
    {
        "id": "between", "kind": "ask", "title": "between_title",
        "fields": [{"id": "between", "options": {"list": "between"}, "max": 1, "required": True}],
        # *I don't feel safe with them*: the other-person resources, and nothing that plans more talk with them.
        "crisis": OTHER_PERSON,
        "next": [{"when": UNSAFE, "to": "unsafe"}, {"to": "proud"}],
    },
    {
        "id": "proud", "kind": "ask", "title": "proud_title", "hint": "proud_hint",
        "fields": [{"id": "proud", "options": {"list": "proud"}, "max": 1, "required": True}],
        # Shaky or wound up: no detailed recall now (PRD IE-11 defers it); a way back later instead.
        "next": [{"when": LOUD, "to": "later"}, {"when": is_("outcome", "no_answer"), "to": "waiting"},
                 {"when": BAD, "to": "factor"}, {"to": "went_well"}],
    },
    {
        "id": "waiting", "kind": "ask", "title": "waiting_title",
        "fields": [{"id": "wait", "label": "waiting_more", "options": {"list": "wait"}, "max": 1, "required": True}],
        "next": [{"when": is_("wait", "look"), "to": "moment"}, {"to": "no_answer"}],
    },
    {
        # A good outcome doesn't need a chain (PRD Mode D): the readout, and the chain only if they want it.
        "id": "went_well", "kind": "ask",
        "title": [{"key": "went_well_title_proud", "when": is_("proud", "yes")}, {"key": "went_well_title"}],
        "fields": [{"id": "more", "label": "more_title", "options": {"list": "more"}, "max": 1, "required": True}],
        "next": [{"when": is_("more", "look"), "to": "moment"}, {"to": "good"}],
    },
    {
        # IE-11: one chip. Coming back from the chain asks again (the chain may have changed the answer).
        "id": "factor", "kind": "ask", "clears": ["factor"],
        "title": [{"key": "factor_title_partly", "when": is_("outcome", "partly")},
                  {"key": "factor_title_no_answer", "when": is_("outcome", "no_answer")},
                  {"key": "factor_title_no"}],
        "hint": "factor_hint",
        "fields": [{"id": "factor", "options": {"list": "factor"}, "max": 1, "required": True}],
        "next": [{"when": is_("factor", "look"), "to": "moment"}, {"to": "fix"}],
    },
    # --- The chain (Handout 9's look at what happened) ---
    {
        "id": "moment", "kind": "ask", "title": "moment_title", "hint": "pick_any",
        "fields": [{"id": "moment", "options": {"list": "moment"}, "max": 3, "swap": True, "required": True}],
        "next": [{"to": "response"}],
    },
    {
        "id": "response", "kind": "ask", "title": "response_title", "hint": "pick_any",
        "fields": [{"id": "response", "options": {"list": "response"}, "max": 3, "swap": True, "required": True}],
        "next": [{"to": "body"}],
    },
    {
        "id": "body", "kind": "ask", "title": "body_title", "hint": "pick_any",
        "fields": [{"id": "body", "options": {"list": "body"}, "max": 3, "swap": True, "required": True}],
        "next": [{"to": "thought"}],
    },
    {
        "id": "thought", "kind": "ask", "title": "thought_title", "hint": "pick_any",
        "fields": [{"id": "thought", "options": {"list": "thought"}, "max": 3, "swap": True, "required": True,
                    "own": {"hint": "thought_own", "countsAsPick": True, "max": 90},
                    "links": [{"exit": "safety_open", "label": "talk_now", "when": has("thought", "thought_cant_handle")}]}],
        "next": [{"to": "underneath"}],
    },
    {
        "id": "underneath", "kind": "ask", "title": "underneath_title", "hint": "pick_any",
        "fields": [{"id": "underneath", "options": {"list": "underneath"}, "max": 2, "swap": True, "required": True}],
        "next": [{"to": "who"}],
    },
    {
        # Parts on, a kept part, the lines shipped (src/lib/debriefWho.ts): who showed up? Otherwise it moves on at once.
        "id": "who", "kind": "embed", "embed": "debriefWho", "answerAs": "who", "props": {},
        "next": [{"to": "reflect"}],
    },
    {
        "id": "reflect", "kind": "ask", "title": REFLECT_TITLES, "hint": "reflect_hint",
        "fields": [{"id": "landed", "options": {"list": "landed"}, "max": 1, "required": True}],
        "next": [{"to": "cope"}],
    },
    {
        "id": "cope", "kind": "ask", "title": "cope_title",
        "fields": [{"id": "cope", "options": {"list": "cope", "where": COPE_WHERE}, "max": 1, "required": True}],
        "next": [{"to": "rehearse"}],
    },
    {
        "id": "rehearse", "kind": "ask",
        "title": [{"key": f"rehearse_{k}", "when": is_("cope", k)} for k in REHEARSALS],
        "primary": "next",
        "fields": [],
        "next": [{"to": "plan"}],
    },
    {
        "id": "plan", "kind": "embed", "embed": "boundaryLine", "title": "plan_title", "answerAs": "plan_copied",
        "props": {"field": "body", "field2": "thought", "field3": "cope", "shape": "list", "next": "plan_next"},
        "next": [{"when": BAD, "to": "factor"}, {"to": "good"}],
    },
    # --- Ends ---
    {
        "id": "not_yet", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "not_yet_line"}],
        "fields": [{"id": "again", "label": "again_label", "max": 1, "options": {"list": "again"}}],
        "followUp": {"type": "ask_outcome", "whenFrom": "again"},
        "offers": [{"exit": "dear_man", "when": None}, {"exit": "cope_ahead", "when": None}, {"exit": "rehearse", "when": None}],
        "done": "done",
    },
    {
        "id": "no_answer", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "waiting_line"}],
        "fields": [{"id": "again", "label": "again_label", "max": 1, "options": {"list": "again"}}],
        "followUp": {"type": "ask_outcome", "whenFrom": "again"},
        "offers": [], "done": "done",
    },
    {
        "id": "later", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "later_line"}],
        "fields": [{"id": "again", "label": "again_label", "max": 1, "options": {"list": "again"}}],
        "followUp": {"type": "ask_outcome", "whenFrom": "again"},
        "offers": [{"exit": "cool_down", "when": None}], "done": "done",
    },
    {
        # The conversation left them unsafe with this person: the resources, Ending in its safety branch; never a
        # retry, a rehearsal or Cope Ahead for talking to them again (plan D4, C6.6).
        "id": "unsafe", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "other_person", "when": ALWAYS}],
        "lines": [{"when": None, "key": "unsafe_line"}],
        "offers": [{"exit": "ending_careful", "when": None}, {"exit": "safety_open", "when": None}], "done": "done",
    },
    {
        "id": "decided_not", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "decided_not_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "good", "kind": "handoff", "complete": True,
        "lines": [
            {"when": {"in": [a("between"), ["shaky", "no"]]}, "key": "good_line_shaky"},
            {"when": is_("proud", "yes"), "key": "good_line_proud"},
            {"when": {"all": [is_("outcome", "got_it"), is_("proud", "no")]}, "key": "good_line_not_proud"},
            {"when": None, "key": "good_line"},
        ],
        # Keeping it warm (IE-06, GIVE) when things feel unsettled between you.
        "offers": [{"exit": "give", "when": {"in": [a("between"), ["shaky", "no"]]}},
                   {"exit": "fast", "when": {"all": [is_("outcome", "got_it"), is_("proud", "no")]}}],
        "done": "done",
    },
    {
        "id": "fix", "kind": "handoff", "complete": True,
        "lines": [{"when": is_("factor", f), "key": f"fix_{f}"} for f in FACTOR_FIX],
        "offers": [
            {"exit": "rehearse", "when": is_("factor", "no_words")},
            {"exit": "cope_ahead", "when": {"in": [a("factor"), ["no_words", "feelings"]]}},
            {"exit": "check_the_facts", "when": is_("factor", "belief")},
            {"exit": "fast", "when": {"in": [a("factor"), ["quick_win", "power", "not_willing"]]}},
            {"exit": "ending_relationships", "when": is_("factor", "power")},
            {"exit": "let_it_be", "when": is_("factor", "power")},
            {"exit": "fast_let_go", "when": {"in": [a("factor"), ["cant_give", "not_willing"]]}},
            {"exit": "finding_connection", "when": is_("factor", "cant_give")},
            {"exit": "dear_man", "when": RETRY},
        ],
        "done": "done",
    },
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "dear_man", "toolId": "dear-man"},
    {"id": "cope_ahead", "toolId": "cope-ahead", "query": {"first": "conversation"}},
    {"id": "rehearse", "toolId": "rehearse", "planned": True},
    {"id": "check_the_facts", "toolId": "check-the-facts"},
    {"id": "fast", "toolId": "fast"},
    {"id": "fast_let_go", "toolId": "fast", "query": {"frame": "let_go"}},
    {"id": "ending_relationships", "toolId": "ending-relationships"},
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "let_it_be", "toolId": "let-it-be", "planned": True},
    {"id": "finding_connection", "toolId": "finding-connection", "planned": True},
    {"id": "give", "toolId": "give", "planned": True},
    {"id": "done", "done": True},
]


def options():
    out = [("feel", v, l, {}, None) for v, l in FEEL]
    out += [("happened", v, l, {}, None) for v, l in HAPPENED]
    out += [("outcome", v, l, {}, None) for v, l in OUTCOME]
    out += [("between", v, l, {}, None) for v, l in BETWEEN]
    out += [("proud", v, l, {}, None) for v, l in PROUD]
    out += [("more", v, l, {}, None) for v, l in MORE]
    out += [("wait", v, l, {}, None) for v, l in WAIT]
    out += [("again", v, l, {}, None) for v, l in AGAIN]
    out += [("factor", v, l, {}, ("TroubleshootFactor", v)) for v, l in FACTORS]
    out += [("factor", LOOK_FIRST[0], LOOK_FIRST[1], {}, None)]
    out += [("moment", n["id"], label(n), {}, ("TurningPoint", n["id"])) for n in DM.TURNING_POINTS]
    out += [("response", n["id"], label(n), {}, ("MomentResponse", n["id"])) for n in DM.MOMENT_RESPONSES]
    out += [("body", n["id"], label(n), {}, ("BodySignal", n["id"])) for n in DM.BODY_SIGNALS]
    out += [("thought", n["id"], label(n), {}, ("ThoughtPattern", n["id"])) for n in DM.THOUGHT_PATTERNS if n["id"] != "thought_something_else"]
    out += [("underneath", n["id"], label(n), {}, ("Underneath", n["id"])) for n in DM.UNDERNEATH]
    out += [("landed", "yes", "Yeah, that's it", {}, None), ("landed", "sort_of", "Sort of", {}, None), ("landed", "not_really", "Not really", {}, None)]
    out += [("cope", n["id"], label(n), {"universal": n["isUniversal"], "responses": n["responses"]}, ("CopeAhead", n["id"])) for n in DM.COPE_AHEAD]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "feel", "ownMax": OWN_MAX,
    "accepts": ["personId", "partId"], "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS,
    "options": options(), "emotionFields": [],
}
