"""Do the Opposite (DBT ER Handouts 9-11, Opposite Action) on the skill runtime: the port of the hand-built page
(ER-03, batch ER-B3, part 2).

docs/design/opposite-action-v3.md is the design and lists every departure from the hand-built page. The clinical
content stays in the graph (schema/opposite-action-data.cypher, schema/opposite-action-flow.cypher), read without a
database by oa_graph.py: each parent's acknowledgment and fit statements, each urge's graduated opposites and body
cues, the route table. Every urge option keeps a PRESENTS edge to its ActionUrge, every step option to its urge (or its
parent's EmotionRegulationContent for the defaults). So:

- **Up to three feelings, one sub-run each** (R16, `each: feel`): validation and the urge, *Do I want to change it?*,
  fits the facts, will the urge help, then the route. On the opposite route, the body cue held, the pull compared with
  before, and the step. A feeling sent elsewhere (clarify, problem, repair, keep it) offers *Carry on with the others*.
- **The goal and the safety split once**, before any feeling: danger opens the `other_person` crisis slot (Ending in
  its careful frame, Hold to wait); a boundary goes to FAST, DEAR MAN or Hold to wait; not sure what's safe gets the
  slot and Hold to wait. Nothing is practised on an unsafe answer.
- **No numbers.** The pull is then-vs-now after the body and after trying (`askFresh: thenVsNow`, newest wins: the
  session's close, `regulation_down`, asked in the flow); what you expect and what happened are named, never scored.
- **A carried flooded reading**: the body first (a settle hold), then *will it help?* before *does it fit?*: *it won't
  help* goes to the body cue and the small step, and the fit check comes after the hold once the pull is weaker
  (ER-B5); if it isn't, the fit stays unasked (recorded as deferred).
- **What's saved**: `ext.run`, and the projection (functions/src/oppositeAction/projection.ts) writes one
  OppositeActionSession v3 per feeling that reached its step, and the oa_plan follow-up for a plan for later.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import hashlib
import importlib.util
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("oa_graph", os.path.join(_HERE, "oa_graph.py"))
OA = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(OA)
C = OA.content()

ID = "opposite_action"
TOOL_ID = "opposite-action"
CONCEPT = "dbt_opposite_action"
VERSION = "oa-skill-v1"
OWN_MAX = 90  # an urge or a step in your own words; three of each must fit ext's 6 KB with the rest of the record
PARENTS = sorted(C["parents"])
URGE_IDS = sorted({u["id"] for p in C["parents"].values() for u in p["urges"]})
# Urges whose own cues replace the parent's (somaticReplace: freeze and bed need up-regulation, not relaxation).
REPLACE = sorted({u["id"] for p in C["parents"].values() for u in p["urges"] if u["replace"] and u["cues"]})
CH = C["flow"]["choices"]
ROUTES = C["flow"]["routes"]  # "facts:effectiveness" → opposite | problem | clarify (safe only)


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
EQ = lambda f, v: {"eq": [a(f), v]}  # noqa: E731
FLOODED = {"eq": ["$ctx.band", "flooded"]}

COPY = {
    "next": "Next",
    "done": "Done",
    "safety_open": "Talk to someone now",
    # Flooded: the body first.
    "calm_title": "First, let your body settle a little",
    "calm_label": "Hold",
    "calm_running": "Breathe out, slowly",
    "calm_hint": "Press and hold while you breathe out",
    # Goal and safety, once.
    "goal_title": "What do you want this moment to help you do?",
    "safety_label": "Is it safe to try something different?",
    "safe": "Yes, it's safe to try",
    "danger": "There's danger",
    "boundary": "There's a boundary I need to keep",
    "unsure": "I'm not sure what's safe",
    "danger_title": "Your safety comes first",
    "danger_line": "Doing the opposite isn't for a situation that could hurt you. Support is here, on this screen.",
    "boundary_title": "Keeping a boundary is a different skill",
    "boundary_line": "Holding your ground can be the effective thing. These can help you do it well.",
    "unsure_title": "When safety is unclear, slow down first",
    "unsure_line": "You don't have to act on the urge or against it right now.",
    # Per feeling.
    "urge_q": "What is it pushing you to do?",
    "urge_own": "In my own words",
    "carry_on": "Carry on with the next feeling",
    "pick_of": "{n} of {count}",
    "want_yes": "Yes, turn it down",
    "want_not_sure": "Not sure",
    "want_no": "No, I want to keep it",
    "keep_title": "Some feelings are worth keeping",
    # *Punish yourself*: never "worth keeping" or "acting on it" (Gate 3). The crisis banner stays on screen.
    "pun_title": "The pull to punish yourself deserves care",
    "pun_line": "You don't have to act on it. If something needs making right, there are kinder ways to do it.",
    "keep_line": "Want help acting on it well?",

    "help_title_any": "If you follow this urge, will it help?",
    "clar_title": "It may be serving a different goal",
    "clar_line": "The facts are worth a closer look before you act either way.",
    "clar_not_fit": "The feeling doesn't fit the facts, and acting on it still seems helpful. It may be serving a different goal.",
    "prob_title": "The feeling fits, and so does acting on it",
    "prob_line": "Then the situation is the thing to work on.",
    "prob_excessive": "It fits, and it's bigger than the situation. Bring it down first, then work on the situation.",
    # ER-B5: Check the Facts inline, on the clarify route. Its verdict picks where the feeling goes next.
    "ctf_title": "A closer look at this feeling",
    "prob_title_checked": "You checked, and the feeling fits",
    "prob_title_partly": "You checked, and it's bigger than the situation",
    "prob_partly": "Something here is worth working on, and the feeling is louder than it needs to be. Bring it down first.",
    "clar_title_unsure": "You don't have to decide yet",
    "clar_unsure": "Doing the opposite can wait until you know more.",
    "clar_title_left": "The facts will keep",
    "clar_left": "Check the Facts goes through them slowly whenever you're ready.",
    "clar_checked_helpful": "It doesn't fit the facts, and acting on it still seems useful. Is it serving a different goal?",
    "clar_checked_open": "The feeling fits. Whether acting on it helps is the open question.",
    "clar_checked_notfit_open": "It doesn't fit the facts, and whether acting on it would help is still open.",
    "clar_title_open": "One question is still open",
    "cdng_safe": "Your read of danger is the one that counts here. You don't have to check it against anything.",
    "clar_flooded": "Your body's loud right now. The facts can wait until it settles a little.",
    "fits_quieter": "Now that it's a little quieter, the facts are easier to see.",
    "size_small_only": "While your body's loud, a small step is the one to start with.",
    "repr_title": "When guilt or shame fits, repair is the opposite of hiding",
    "repr_line": "Owning it and making it right is the skill here.",
    "cue_title": "Let your body go first",
    "cue_hint": "Pick one to try now, or go on without one",
    "hold_label": "Hold",
    "hold_running": "Stay with it",
    "hold_hint": "Press and hold while you do it",
    "after_body_title": "After that, the pull is…",

    "size_own": "My own step",
    # H10 step 5, all the way (ER-B5): the steps carry the action; this line brings in the thoughts and words.
    "size_hint": "Whichever step you pick, let your thoughts and words do the opposite too, along with your body.",
    # Once, after every feeling.
    "pred_title": "If you do it, what do you expect?",
    "when_title": "When will you try it?",
    "due_label": "Roughly when?",
    "try_title": "Try it now, then come back",
    "try_hint": "Take your time. This screen will wait.",
    "tried": "I tried it",
    "after_title": "What happened?",
    "actual_label": "What actually happened?",
    "tvn_label": "The pull, compared with before?",
    "read_title": "You did the opposite",
    # *It felt unsafe*: never a line that says it went fine (Gate 3 r2).
    "read_unsafe_title": "Your safety comes first",
    "read_unsafe": "It felt unsafe. That matters more than the step.",
    "read_part": "You tried part of it. That counts.",
    "read_unclear": "It's not clear yet what it did. You still did something different.",
    "read_gap": "You expected it to go badly. It didn't.",
    "read_worse_gap": "You expected to feel worse. You didn't.",
    "read_react_gap": "You expected them to react badly. They didn't.",
    "read_later": "You did something different from what the urge wanted.",
    "read_down": "The pull is weaker than before.",
    "read_same": "The pull is still there. It often takes a few goes.",
    "plan_title": "It's planned",
    "plan_line": "It'll be on Today when it's time, to ask how it went.",
    "plan_line_none": "Try it when the moment comes.",
    "back_title": "Did you get to try it?",
    "miss_title": "That's useful to know",
    "miss_line": "A plan that didn't happen tells you something about the moment. You can make another one any time.",
    "miss_strong": "When the urge is that strong, waiting it out comes first.",
    "end_line": "Done for now.",
}
# The validation line is the first sentence of the parent's own acknowledgment (the graph's words, read at build): a
# title stays a line (≤ 90 characters), and the rest of it makes claims a title shouldn't (Gate 3).
def _first_sentence(text):
    first = (text or "").split(". ")[0].rstrip(".")
    return f"{first}." if first and len(first) < 90 else None


for pid in PARENTS:
    COPY[f"ack_{pid}"] = _first_sentence(C["parents"][pid]["acknowledgment"]) or COPY["urge_q"]
# Per-feeling titles name the feeling by its DBT parent ("the fear"), never the grid word ("Does fearful fit…", Gate 2).
NOUN = {"anger": "the anger", "disgust": "the disgust", "envy": "the envy", "fear": "the fear", "guilt": "the guilt",
        "jealousy": "the jealousy", "love": "the love", "sadness": "the sadness", "shame": "the shame"}
for pid in PARENTS:
    n = NOUN.get(pid, "this feeling")
    COPY[f"want_title_{pid}"] = f"Do you want to turn {n} down?"
    COPY[f"fits_title_{pid}"] = f"Does {n} fit the facts?"
    COPY[f"size_title_{pid}"] = f"Pick a step for {n}"
    COPY[f"ctf_title_{pid}"] = f"A closer look at {n}"
COPY.update({"want_title": "Do you want to turn this feeling down?", "fits_title": "Does this feeling fit the facts?",
             "size_title": "Pick a step for this feeling"})


def by_parent(key):
    return [{"when": {"eq": ["$d.parent", pid]}, "key": f"{key}_{pid}"} for pid in PARENTS] + [{"key": key}]

GOALS = [(c["id"], c["label"]) for c in CH["goal"]]
# How the goal reads inside "will it help you {goal}?".
GOAL_PHRASE = {"connection": "stay connected", "boundary": "protect a boundary", "progress": "make progress",
               "repair": "repair harm", "self_respect": "act with self-respect"}
for _g, _label in GOALS:
    COPY[f"help_title_{_g}"] = f"If you follow this urge, will it help you {GOAL_PHRASE.get(_g, _label.lower())}?"
FACTS = [(c["id"], c["label"]) for c in CH["facts"]]
EFFECT = [(c["id"], c["label"]) for c in CH["effectiveness"]]
WHEN = [(c["id"], c["label"]) for c in CH["cue"]]
# The oa_try card's window chips (scripts/practice-spine/content.py oa_try). No chip: no card.
DUE = [("hour", "Within the hour"), ("evening", "This evening"), ("tomorrow", "Tomorrow"), ("this_week", "Later this week")]
TRIED = [("yes", "Yes, I tried it"), ("too_strong", "The urge was too strong"), ("no_moment", "The moment didn't come"),
         ("forgot", "I forgot"), ("chose_not", "I chose not to")]
OUTCOME = [(c["id"], c["label"]) for c in CH["outcome"] if c["id"] != "unsafe"] + [("unsafe", "It felt unsafe")]
PREDICT = [("badly", "It'll go badly"), ("worse", "I'll feel worse"), ("react", "They'll react badly"),
           ("nothing", "Nothing much"), ("not_sure", "Not sure")]
ACTUAL = [("badly", "It went badly"), ("worse", "I felt worse"), ("react", "They reacted badly"),
          ("nothing", "Nothing much"), ("better", "It went better than I thought")]
# The size names the hand-built page showed (the flow's copy), ahead of each step (Gate 2).
SIZE_NAME = {"small": C["flow"]["copy"]["sizeSmall"], "medium": C["flow"]["copy"]["sizeMedium"], "bigger": C["flow"]["copy"]["sizeBigger"]}
TVN = [("worse", "Stronger"), ("same", "About the same"), ("better", "A bit weaker"), ("much_better", "Much weaker")]

# The route after *will it help?*, one feeling at a time. Repair first (guilt or shame that fits, goal repair harm: H11),
# then the graph's table for a safe answer (danger, a boundary and not sure never reach this step).
# *Punish yourself* can mean self-harm (#89's gates): its pick opens safety.open over the next screen (C6.5), and the
# crisis banner stays on that feeling's screens after it.
PUNISH = EQ("urge", "guilt-punish")
# The prediction gap reads only when it went well: "It didn't" never answers "It went badly" (Gate 3).
UNSAFE = EQ("outcome", "unsafe")
WENT_WELL = {"all": [{"in": [a("actual"), ["nothing", "better"]]}, {"not": UNSAFE}]}
READ_TITLE = [{"when": UNSAFE, "key": "read_unsafe_title"}, {"key": "read_title"}]
ROUTE_STEP = {"opposite": "cue", "clarify": "clar", "problem": "prob"}
REPAIR = {"all": [{"in": ["$d.parent", ["guilt", "shame"]]}, EQ("fits", "fits"), EQ("goal", "repair")]}
def _route_to(step):
    keys = sorted(k for k, r in ROUTES.items() if ROUTE_STEP[r] == step)
    return {"any": [{"all": [EQ("fits", k.split(":")[0]), EQ("help", k.split(":")[1])]} for k in keys]}


# One jump per target (NEXT is one edge per step pair); clarify is the table's rest and the fallback.
# Punish yourself that seems helpful goes to its own hand-off, whatever the fit (never "acting on it fits" or clarify).
# ER-B5 (Gates 2, 3): only *I still do not know* opens the check, inline, and never with a flooded reading (the clarify
# card says the facts can wait, the body first). Every other clarify row keeps the clarify card.
CHECK_ENTER = {"all": [EQ("fits", "unsure"), {"not": FLOODED}]}
# A carried flooded reading (ER-B5): the fit check waits until the body has settled. *Will it help?* comes first (one
# plain question), and *it won't help* is H10's own reason for the opposite, whatever the fit: the body cue and its
# hold, then *does it fit?* once the pull is weaker (`aftb`), never before. Guilt or shame with the repair goal waits for
# the facts (repair needs them, H11): the clarify card, the body first. Anything else (it would help, not sure) is the
# clarify card as before.
# The late fit is its own field (`fitl`, its own step `lfit`), so going back can never leave a fit standing on a path
# that didn't ask it: it counts only with *won't help* and a weaker pull, read on every screen that uses it.
REPAIR_GOAL = {"all": [{"in": ["$d.parent", ["guilt", "shame"]]}, EQ("goal", "repair")]}
DEFER_TO_CUE = {"all": [FLOODED, {"not": {"set": a("fits")}}, EQ("help", "unhelpful"), {"not": REPAIR_GOAL}]}
SETTLED = {"in": [a("tvnb"), ["better", "much_better"]]}
# The check after the body, answered: the table on *won't help* (fits, too big or doesn't fit → the step; not sure →
# the clarify card, the opposite can wait).
LATE_VALID = {"all": [FLOODED, {"set": a("fitl")}, SETTLED, EQ("help", "unhelpful"), {"not": REPAIR_GOAL}]}
LATE_UNSURE = {"all": [LATE_VALID, EQ("fitl", "unsure")]}
# The fit still unknown on a flooded start: the small step only.
FIT_DEFERRED = {"all": [FLOODED, {"not": {"set": a("fits")}}, {"not": LATE_VALID}]}
HELP_NEXT = [{"when": REPAIR, "to": "repr"}, {"when": {"all": [PUNISH, EQ("help", "helpful")]}, "to": "pun"},
             {"when": _route_to("prob"), "to": "prob"},
             {"when": {"any": [_route_to("cue"), DEFER_TO_CUE]}, "to": "cue"}, {"when": CHECK_ENTER, "to": "ctf"}, {"to": "clar"}]

URGE_WHERE = {"has": ["$opt.parents", "$d.parent"]}
# A cue: the urge's own, or the parent's (never with an urge that replaces them).
CUE_WHERE = {"any": [{"has": ["$opt.urges", a("urge")]},
                     {"all": [{"has": ["$opt.parents", "$d.parent"]}, {"not": {"in": [a("urge"), REPLACE]}}]}]}
# A step: the urge's graduated opposites, or the parent's defaults for an urge in your own words.
SIZE_WHERE = {"any": [{"all": [{"in": [a("urge"), URGE_IDS]}, {"eq": ["$opt.urgeFor", a("urge")]}]},
                      {"all": [{"not": {"in": [a("urge"), URGE_IDS]}}, {"eq": ["$opt.parent", "$d.parent"]}]}]}
PUNISH_CRISIS = [{"variant": "crisis", "when": PUNISH}]
DANGER_CRISIS = [{"variant": "other_person", "when": {"in": [a("safety"), ["danger", "unsure"]]}}]
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
# Check the Facts inline (ER-B5): what it gave back, read on `checked` (`unsafe` first: the danger card wins).
CHECKED = lambda v: {"has": ["$a.checked.ids", v]}  # noqa: E731
CHECK_UNSAFE = {"any": [CHECKED("unsafe"), CHECKED("stopped")]}
# The check's verdict stands in for *does it fit?* in the graph's table, with the earlier *will it help?* answer (H10
# asks both): fits → fits, bigger than this → excessive, not really → not_fit; I'm not sure stays on the clarify card.
VERDICT = {"fits": "fits", "partly": "excessive", "doesnt_fit": "not_fit"}
CHECKED_FITS = {"any": [CHECKED("fits"), CHECKED("partly")]}
NOT_CHECKED = {"not": {"set": a("checked")}}
NOT_LEFT = {"not": CHECKED("left")}


def _checked_to(step):
    rows = [(v, k.split(":")[1]) for v, f in VERDICT.items() for k, r in ROUTES.items()
            if k.split(":")[0] == f and ROUTE_STEP[r] == step]
    return {"any": [{"all": [CHECKED(v), EQ("help", h)]} for v, h in sorted(rows)]}


def _no_carry(s):
    s.pop("carryOn", None)
    return s


def handoff(step_id, title, lines, offers, each=True, crisis=None, no_close=False):
    s = {"id": step_id, "kind": "handoff", "title": title, "lines": lines, "offers": offers, "done": "done", "next": []}
    if no_close:
        # A safety hand-off: no skill was done, so no "did it help?" after it (Gate 1).
        s.update({"complete": True, "noClose": True})
    if each:
        s.update({"each": "feel", "carryOn": "pred"})
    crisis = crisis or (PUNISH_CRISIS if each else None)
    if crisis:
        s["crisis"] = crisis
    return s


STEPS = [
    {
        # #48's doors as an embed: one door per DBT parent, three other ways in, up to three, loudest first. Words a
        # hand-off carried arrive pre-ticked; the person still taps Yes.
        "id": "door", "kind": "embed", "embed": "doorPicker", "answerAs": "feel",
        "next": [{"when": FLOODED, "to": "calm"}, {"to": "goal"}],
    },
    {
        "id": "calm", "kind": "embed", "embed": "holdRing", "title": "calm_title",
        "props": {"variant": "settle", "seconds": 6, "holds": 3, "label": "calm_label", "hint": "calm_hint",
                  "runningLabel": "calm_running", "next": "next"},
        "next": [{"to": "goal"}],
    },
    {
        "id": "goal", "kind": "ask", "title": "goal_title",
        "fields": [{"id": "goal", "options": {"list": "goal"}, "max": 1, "required": True}],
        "next": [{"to": "safe"}],
    },
    {
        # One question per screen (Gate 2): the safety split on its own, the slot right under its four chips.
        "id": "safe", "kind": "ask", "title": "safety_label", "crisis": DANGER_CRISIS,
        "fields": [{"id": "safety", "options": {"list": "safety"}, "max": 1, "required": True}],
        "next": [{"when": EQ("safety", "danger"), "to": "dang"}, {"when": EQ("safety", "boundary"), "to": "bnd"},
                 {"when": EQ("safety", "unsure"), "to": "uns"}, {"to": "vald"}],
    },
    handoff("dang", "danger_title", [{"when": ALWAYS, "key": "danger_line"}],
            [{"exit": "ending", "when": ALWAYS}, {"exit": "pause", "when": ALWAYS}], each=False, crisis=DANGER_CRISIS, no_close=True),
    handoff("bnd", "boundary_title", [{"when": ALWAYS, "key": "boundary_line"}],
            [{"exit": "fast", "when": ALWAYS}, {"exit": "dear_man", "when": ALWAYS}, {"exit": "pause", "when": ALWAYS}],
            each=False, no_close=True),
    handoff("uns", "unsure_title", [{"when": ALWAYS, "key": "unsure_line"}],
            [{"exit": "pause", "when": ALWAYS}, {"exit": "ending", "when": ALWAYS}], each=False, crisis=DANGER_CRISIS, no_close=True),
    {
        # Validation first (ER-03 item 1): the parent's acknowledgment is the screen's title, then the urge.
        "id": "vald", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS,
        "title": [{"when": {"eq": ["$d.parent", pid]}, "key": f"ack_{pid}"} for pid in PARENTS] + [{"key": "urge_q"}],
        "fields": [{"id": "urge", "label": "urge_q", "options": {"list": "urge", "where": URGE_WHERE, "firstFrom": "$ctx.urgeId"},
                    "max": 1, "required": True, "own": {"hint": "urge_own", "countsAsPick": True, "max": OWN_MAX}}],
        "next": [{"to": "want"}],
    },
    {
        "id": "want", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS, "safetyFirst": PUNISH, "title": by_parent("want_title"),
        "fields": [{"id": "want", "options": {"list": "want"}, "max": 1, "required": True}],
        "next": [{"when": {"all": [PUNISH, EQ("want", "no")]}, "to": "pun"}, {"when": EQ("want", "no"), "to": "keep"},
                 {"when": FLOODED, "to": "help"}, {"to": "fits"}],
    },
    handoff("keep", "keep_title", [{"when": ALWAYS, "key": "keep_line"}],
            [{"exit": "problem_solve", "when": ALWAYS}, {"exit": "dear_man", "when": ALWAYS},
             {"exit": "ride", "when": ALWAYS}]),
    {
        # The parent's fit statements above the verdict (Check the Facts' list); the full check is a quiet link.
        "id": "fits", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS, "title": by_parent("fits_title"),
        "fields": [{"id": "fits", "options": {"list": "fits"}, "max": 1, "required": True,
                    "list": {"table": "fitsWhen", "key": "$d.fitsParent"},
                    "links": [{"exit": "check_the_facts", "label": "check_link", "when": ALWAYS}]}],
        "next": [{"to": "help"}],
    },
    {
        # A flooded start's fit check, after the body once the pull is weaker (`aftb`); *won't help* was the answer.
        "id": "lfit", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS, "title": by_parent("fits_title"),
        "lines": [{"when": ALWAYS, "key": "fits_quieter"}],
        "fields": [{"id": "fitl", "options": {"list": "fits"}, "max": 1, "required": True,
                    "list": {"table": "fitsWhen", "key": "$d.fitsParent"},
                    "links": [{"exit": "check_the_facts", "label": "check_link", "when": ALWAYS}]}],
        "next": [{"when": LATE_UNSURE, "to": "clar"}, {"to": "size"}],
    },
    {
        "id": "help", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS,
        "title": [{"when": EQ("goal", g), "key": f"help_title_{g}"} for g, _ in GOALS] + [{"key": "help_title_any"}],
        "fields": [{"id": "help", "options": {"list": "help"}, "max": 1, "required": True}],
        "next": HELP_NEXT,
    },
    {
        # ER-B5: the clarify route checks the facts here, inline, for this feeling (Check the Facts from what happened
        # when it has fit statements for the feeling, else from the feeling, carried). Its verdict picks the route.
        "id": "ctf", "kind": "embed", "embed": "inlineSkill", "each": "feel", "crisis": PUNISH_CRISIS,
        "title": by_parent("ctf_title"), "answerAs": "checked",
        "props": {"skill": "check_the_facts", "enterAt": "event", "ctx": {"feelingId": "$each"}},
        # Unsafe first; guilt or shame that fits with the repair goal is repair (H11); *Punish yourself* is never "it fits,
        # work on the situation"; then the table on the verdict; the rest (not sure, left) is the clarify card.
        # Leaving early is the clarify card whatever the verdict screen held (its flags still come back on a leave).
        "next": [{"when": CHECK_UNSAFE, "to": "cdng"},
                 {"when": {"all": [NOT_LEFT, {"in": ["$d.parent", ["guilt", "shame"]]}, CHECKED("fits"), EQ("goal", "repair")]}, "to": "repr"},
                 {"when": {"all": [NOT_LEFT, PUNISH, CHECKED_FITS]}, "to": "pun"},
                 {"when": {"all": [NOT_LEFT, _checked_to("prob")]}, "to": "prob"},
                 {"when": {"all": [NOT_LEFT, _checked_to("cue")]}, "to": "cue"},
                 {"to": "clar"}],
    },
    # A person hurt or threatened them, told to the check: this feeling's danger card (the whole run's is `dang`).
    # Nothing is practised after it (Gate 3): no carry-on to the other feelings, as on `dang`.
    _no_carry(handoff("cdng", "danger_title", [{"when": ALWAYS, "key": "danger_line"}, {"when": ALWAYS, "key": "cdng_safe"}],
                      [{"exit": "ending", "when": ALWAYS}, {"exit": "pause", "when": ALWAYS}, SAFETY_LINK],
                      crisis=[{"variant": "other_person", "when": ALWAYS}, *PUNISH_CRISIS], no_close=True)),
    handoff("clar", [{"when": {"any": [CHECKED("unsure"), LATE_UNSURE]}, "key": "clar_title_unsure"},
                     {"when": {"any": [CHECKED("left"), CHECKED("finished")]}, "key": "clar_title_left"},
                     {"when": {"any": [CHECKED_FITS, {"all": [CHECKED("doesnt_fit"), {"not": EQ("help", "helpful")}]}]}, "key": "clar_title_open"},
                     {"key": "clar_title"}],
            [{"when": {"all": [FLOODED, NOT_CHECKED, {"not": LATE_VALID}]}, "key": "clar_flooded"},
             {"when": {"any": [CHECKED("unsure"), LATE_UNSURE]}, "key": "clar_unsure"},
             {"when": {"all": [CHECKED("doesnt_fit"), EQ("help", "helpful")]}, "key": "clar_checked_helpful"},
             {"when": {"all": [CHECKED("doesnt_fit"), {"not": EQ("help", "helpful")}]}, "key": "clar_checked_notfit_open"},
             {"when": CHECKED_FITS, "key": "clar_checked_open"},
             {"when": {"any": [CHECKED("left"), CHECKED("finished")]}, "key": "clar_left"},
             {"when": {"all": [NOT_CHECKED, {"not": FLOODED}, EQ("fits", "not_fit"), EQ("help", "helpful")]}, "key": "clar_not_fit"},
             {"when": {"all": [NOT_CHECKED, {"not": FLOODED}, {"not": {"all": [EQ("fits", "not_fit"), EQ("help", "helpful")]}}]}, "key": "clar_line"}],
            # The full check as a link only when it didn't run to a verdict here; Wise mind after a verdict that leaves a
            # question; the body first with a flooded reading (the check is skipped then).
            [{"exit": "cool_down", "when": {"all": [FLOODED, NOT_CHECKED, {"not": LATE_VALID}]}},
             {"exit": "check_the_facts", "when": {"any": [NOT_CHECKED, CHECKED("left"), CHECKED("finished")]}},
             {"exit": "wise_mind", "when": {"any": [CHECKED("unsure"), CHECKED("doesnt_fit"), CHECKED_FITS, LATE_UNSURE]}}]),
    handoff("prob", [{"when": CHECKED("partly"), "key": "prob_title_partly"}, {"when": CHECKED("fits"), "key": "prob_title_checked"},
                     {"key": "prob_title"}],
            [{"when": CHECKED("partly"), "key": "prob_partly"},
             {"when": {"all": [EQ("fits", "excessive"), {"not": CHECKED("partly")}]}, "key": "prob_excessive"},
             {"when": {"not": {"any": [EQ("fits", "excessive"), CHECKED("partly")]}}, "key": "prob_line"}],
            [{"exit": "cool_down", "when": {"any": [EQ("fits", "excessive"), CHECKED("partly")]}}, {"exit": "problem_solve", "when": ALWAYS}]),
    # *Punish yourself*, kept or "helpful": a kinder way to make it right, or riding the urge out; never a plan for it.
    handoff("pun", "pun_title", [{"when": ALWAYS, "key": "pun_line"}],
            [{"exit": "problem_solve", "when": ALWAYS}, {"exit": "ride", "when": ALWAYS}]),
    handoff("repr", "repr_title", [{"when": ALWAYS, "key": "repr_line"}], [{"exit": "problem_solve_repair", "when": ALWAYS}]),
    {
        "id": "cue", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS, "title": "cue_title", "hint": "cue_hint",
        # Optional (the hand-built page's *None of these work for me*): no cue, no hold, straight to the step.
        "fields": [{"id": "cue", "options": {"list": "cue", "where": CUE_WHERE}, "max": 1}],
        "next": [{"when": {"set": a("cue")}, "to": "hold"}, {"to": "size"}],
    },
    {
        "id": "hold", "kind": "embed", "embed": "holdRing", "each": "feel", "crisis": PUNISH_CRISIS, "title": "hold_title",
        "titleSlots": {"cue": {"labelOf": "cue"}},
        "props": {"variant": "press", "seconds": 3, "label": "hold_label", "runningLabel": "hold_running",
                  "hint": "hold_hint", "next": "next"},
        "next": [{"to": "aftb"}],
    },
    {
        "id": "aftb", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS, "title": "after_body_title",
        "fields": [{"id": "tvnb", "options": {"list": "tvn"}, "max": 1, "required": True, "askFresh": "thenVsNow"}],
        "next": [{"when": {"all": [FLOODED, {"not": {"set": a("fits")}}, SETTLED]}, "to": "lfit"}, {"to": "size"}],
    },
    {
        "id": "size", "kind": "ask", "each": "feel", "crisis": PUNISH_CRISIS, "title": by_parent("size_title"), "hint": "size_hint",
        "lines": [{"when": FIT_DEFERRED, "key": "size_small_only"}],
        "fields": [{"id": "size", "options": {"list": "size", "where": {"all": [SIZE_WHERE, {"any": [{"not": FIT_DEFERRED}, {"eq": ["$opt.size", "small"]}]}]}},
                    "max": 1, "required": True,
                    "own": {"hint": "size_own", "countsAsPick": True, "max": OWN_MAX}}],
        "next": [{"to": "pred"}],
    },
    {
        "id": "pred", "kind": "ask", "title": "pred_title",
        "fields": [{"id": "predict", "options": {"list": "predict"}, "max": 1}],
        "next": [{"to": "when"}],
    },
    {
        "id": "when", "kind": "ask", "title": "when_title", "slots": [{"after": "$title", "embed": "oaSteps", "showWhen": ALWAYS, "record": "steps"}],
        "fields": [
            {"id": "when", "options": {"list": "when"}, "max": 1, "required": True},
            {"id": "due", "label": "due_label", "options": {"list": "due"}, "max": 1,
             "showWhen": {"all": [{"set": a("when")}, {"not": EQ("when", "now")}]}},
        ],
        # A plan for later: a chip schedules oa_try (*Did you get to try it?*), which reopens the run at `back`.
        "followUp": {"type": "oa_try", "whenFrom": "due", "when": {"all": [{"not": EQ("when", "now")}, {"set": a("due")}]}},
        "next": [{"when": EQ("when", "now"), "to": "try"}, {"to": "plan"}],
    },
    {
        "id": "try", "kind": "ask", "title": "try_title", "hint": "try_hint", "primary": "tried", "slots": [{"after": "$title", "embed": "oaSteps", "showWhen": ALWAYS, "record": "steps"}],
        "next": [{"to": "aftr"}],
    },
    {
        # One question per screen (Gate 2): what happened (the slot right under it), what actually happened, the pull.
        "id": "aftr", "kind": "ask", "title": "after_title",
        "fields": [{"id": "outcome", "options": {"list": "outcome"}, "max": 1, "required": True}],
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        "next": [{"to": "act"}],
    },
    {
        "id": "act", "kind": "ask", "title": "actual_label",
        "fields": [{"id": "actual", "options": {"list": "actual"}, "max": 1}],
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        "next": [{"to": "tvna"}],
    },
    {
        "id": "tvna", "kind": "ask", "title": "tvn_label",
        "fields": [{"id": "tvna", "options": {"list": "tvn"}, "max": 1, "required": True, "askFresh": "thenVsNow"}],
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        "next": [{"to": "read"}],
    },
    {
        # Readout v3 (item 10): the behaviour first, then the prediction gap, then the pull. No numbers.
        "id": "read", "kind": "handoff", "complete": True, "title": READ_TITLE,
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        # One line shows (the first that holds): the prediction gap when there is one, then what was tried, then the pull.
        "lines": [
            {"when": UNSAFE, "key": "read_unsafe"},
            {"when": {"all": [EQ("predict", "badly"), WENT_WELL]}, "key": "read_gap"},
            {"when": {"all": [EQ("predict", "worse"), WENT_WELL]}, "key": "read_worse_gap"},
            {"when": {"all": [EQ("predict", "react"), WENT_WELL]}, "key": "read_react_gap"},
            {"when": EQ("outcome", "partial"), "key": "read_part"},
            {"when": EQ("outcome", "unclear"), "key": "read_unclear"},
            {"when": {"in": [a("tvna"), ["better", "much_better"]]}, "key": "read_down"},
            {"when": {"in": [a("tvna"), ["same", "worse"]]}, "key": "read_same"},
        ],
        "offers": [{"exit": "pause", "when": EQ("outcome", "unsafe")},
                   {"exit": "er_troubleshoot", "when": EQ("tvna", "worse")}],
        "done": "done", "next": [],
    },
    {
        "id": "plan", "kind": "handoff", "complete": True, "title": "plan_title",
        "lines": [{"when": {"set": a("due")}, "key": "plan_line"}, {"key": "plan_line_none"}],
        "offers": [], "done": "done", "next": [],
    },
    {
        # The oa_try card's link reopens the run here, on a run that reached the plan card. The plan stays; what
        # happened is asked fresh (a second reopen doesn't read the last answers back).
        "id": "back", "kind": "ask", "reopens": {"after": "when"}, "clears": ["tried", "outcome", "actual"],
        "title": "back_title", "slots": [{"after": "$title", "embed": "oaSteps", "showWhen": ALWAYS, "record": "steps"}],
        "fields": [{"id": "tried", "options": {"list": "tried"}, "max": 1, "required": True}],
        "next": [{"when": EQ("tried", "yes"), "to": "aft2"}, {"to": "miss"}],
    },
    {
        # What happened, on a later day: the same two questions without the pull (a reopened run reads nothing
        # ask-fresh; the pull then was another moment's).
        "id": "aft2", "kind": "ask", "title": "after_title",
        "fields": [{"id": "outcome", "options": {"list": "outcome"}, "max": 1, "required": True}],
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        "next": [{"to": "act2"}],
    },
    {
        "id": "act2", "kind": "ask", "title": "actual_label",
        "fields": [{"id": "actual", "options": {"list": "actual"}, "max": 1}],
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        "next": [{"to": "read2"}],
    },
    {
        "id": "read2", "kind": "handoff", "complete": True, "noClose": True, "title": READ_TITLE,
        "crisis": [{"variant": "other_person", "when": EQ("outcome", "unsafe")}],
        "lines": [
            {"when": UNSAFE, "key": "read_unsafe"},
            {"when": {"all": [EQ("predict", "badly"), WENT_WELL]}, "key": "read_gap"},
            {"when": {"all": [EQ("predict", "worse"), WENT_WELL]}, "key": "read_worse_gap"},
            {"when": {"all": [EQ("predict", "react"), WENT_WELL]}, "key": "read_react_gap"},
            {"when": EQ("outcome", "partial"), "key": "read_part"},
            {"when": EQ("outcome", "unclear"), "key": "read_unclear"},
            {"key": "read_later"},
        ],
        "offers": [{"exit": "pause", "when": EQ("outcome", "unsafe")}],
        "done": "done", "next": [],
    },
    {
        "id": "miss", "kind": "handoff", "complete": True, "noClose": True, "title": "miss_title",
        "lines": [{"when": EQ("tried", "too_strong"), "key": "miss_strong"}, {"key": "miss_line"}],
        "offers": [{"exit": "pause", "when": EQ("tried", "too_strong")}],
        "done": "done", "next": [],
    },
]
COPY.update({"hold_title": "{cue}", "check_link": "Check the facts properly"})

EXITS = [
    {"id": "check_the_facts", "toolId": "check-the-facts"},                        # clarify (ER-02)
    {"id": "problem_solve", "toolId": "problem-solve"},                            # problem, keep it (ER-12)
    {"id": "problem_solve_repair", "toolId": "problem-solve", "query": {"frame": "repair"}, "carry": ["feel"]},  # repair (H11)
    {"id": "cool_down", "toolId": "cool-down"},                                    # too big: down first (DT-01)
    {"id": "dear_man", "toolId": "dear-man"},                                      # keep it, a boundary (IE-01)
    {"id": "fast", "toolId": "fast"},                                              # a boundary (IE-05)
    {"id": "ride", "toolId": "urge-surfing"},                                      # keep it, ride the urge (DT-05)
    {"id": "pause", "toolId": "pause"},                                            # not safe, not sure (DT-02)
    {"id": "ending", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # danger from someone (IE-08)
    {"id": "er_troubleshoot", "toolId": "er-troubleshoot"},                        # the pull got stronger (ER-14)
    {"id": "wise_mind", "toolId": "wise-mind"},                                    # not sure, after the check (ER-B5)
    {"id": "safety_open", "toolId": None, "safety": True},                         # safety.open (R6)
    {"id": "done", "done": True},
]


def cue_id(text):
    return "c_" + hashlib.sha1(text.encode("utf8")).hexdigest()[:10]


def options():
    out = []
    # Urges: one option per ActionUrge, listed under every parent it belongs to, in each parent's order.
    seen = {}
    for pid in PARENTS:
        for u in C["parents"][pid]["urges"]:
            seen.setdefault(u["id"], {"u": u, "parents": []})["parents"].append(pid)
    for uid, x in sorted(seen.items(), key=lambda kv: (kv[1]["u"]["order"], kv[0])):
        out.append(("urge", uid, x["u"]["label"], {"parents": x["parents"], "urge": uid, **({"danger": "self"} if uid == "guilt-punish" else {})}, ("ActionUrge", uid)))
    out += [("goal", g, label, {}, None) for g, label in GOALS]
    out += [("safety", s, COPY[s], {"danger": "other"} if s == "danger" else {}, None) for s in ("safe", "danger", "boundary", "unsure")]
    out += [("want", w, COPY[f"want_{w}"], {}, None) for w in ("yes", "not_sure", "no")]
    out += [("fits", f, label, {}, None) for f, label in FACTS]
    out += [("help", e, label, {}, None) for e, label in EFFECT]
    # Cues: one option per distinct cue, with the urges and parents that list it.
    cues = {}
    for pid in PARENTS:
        p = C["parents"][pid]
        for text in p["cues"]:
            cues.setdefault(text, {"urges": [], "parents": []})["parents"].append(pid)
        for u in p["urges"]:
            for text in u["cues"]:
                c = cues.setdefault(text, {"urges": [], "parents": []})
                if u["id"] not in c["urges"]:
                    c["urges"].append(u["id"])
    for text, c in cues.items():
        out.append(("cue", cue_id(text), text, {"urges": c["urges"], "parents": c["parents"]}, None))
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    # Steps: each urge's small, medium and bigger (once per urge), then each parent's defaults.
    done = set()
    for pid in PARENTS:
        p = C["parents"][pid]
        for u in p["urges"]:
            if u["id"] in done:
                continue
            done.add(u["id"])
            for size in ("small", "medium", "bigger"):
                if u[size]:
                    out.append(("size", f"{u['id']}:{size}", f"{SIZE_NAME[size]}: {u[size]}", {"urgeFor": u["id"], "size": size}, ("ActionUrge", u["id"])))
        for size in ("small", "medium", "bigger"):
            if p["defaults"][size]:
                out.append(("size", f"{pid}:{size}", f"{SIZE_NAME[size]}: {p['defaults'][size]}", {"parent": pid, "size": size}, "OppositeDefault"))
    out += [("predict", v, label, {}, None) for v, label in PREDICT]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("due", v, label, {}, None) for v, label in DUE]
    out += [("tried", v, label, {}, None) for v, label in TRIED]
    out += [("outcome", v, label, {}, None) for v, label in OUTCOME]
    out += [("actual", v, label, {}, None) for v, label in ACTUAL]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "door", "ownMax": OWN_MAX,
    "accepts": ["urgeId", "band"],
    "copy": COPY, "tables": {},
    "derive": [{"name": "parent", "from": "$each", "table": "parentOf"},
               {"name": "fitsParent", "from": "$d.parent", "table": "fitsWhen", "keep": "key"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"],
}
