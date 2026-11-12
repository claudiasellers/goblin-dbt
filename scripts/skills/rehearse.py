"""Rehearse it (IE-02; behavioural rehearsal for a hard conversation, McFall 1973; DBT IE Handouts 5-6, 8) as a skill on
the runtime, under the new `rehearse` tool id. Part 1 of IE-02. Spec: docs/design/rehearse.md.

The moment (PRD IE-02): "I know what I want to say. I'll freeze or cave when they push back." Calm time before a planned
conversation, after a debrief that says *partly* or *no*, or straight from Say no, Keep it warm, FAST, Ending or the prep.

The page (src/pages/tools/Rehearse.tsx) asks who first (PersonPicker, people.md, D4): someone on the safety route gets
the safety screen (the other-person resources, Ending in its careful frame) and never this skill. *Someone new* with
no name rehearses with a stand-in.

Steps:
  kind     what's the conversation? asking for something · saying no · setting a limit · bringing up a problem ·
           making a repair. A host's `?situationId=` puts its kind first. A carried flooded reading gets the
           settle line and *Settle my body first*, and later only the easy version (PRD).
  line     the first thing you'll say: that kind's starter lines, or own words.
  tier     how they'll respond, chosen by the person: the easy version · realistic · the hardest likely · practise
           leaving (a calm way out, always there). Stirred: no hardest; flooded: easy or leaving only.
  stage    the two figures (`rehearsalStage`): your line in your bubble (*I said it out loud* / *in my head*), their
           reply from the script (kind × tier) with a pose, your move from that turn's chips (each one a DEAR MAN,
           GIVE or FAST move), three exchanges. Stop is always there. *I'd lose it here* ends it at once.
  ifthen   after the hardest version or *I'd lose it here*: one if-then for the real thing (PRD step 8; Cope Ahead
           is offered on the end card for a fuller plan).
  close    *Saying it for real feels…* harder · about the same · easier · much easier (the close, in the flow).
  ready    *Could you say it for real?* sure · I think so · not sure.
  end      the real conversation when you choose (the prep, with the person), another practice, or Cope Ahead.

Stopping counts: Stop goes to the close like finishing (*You stopped. That counts.*). No numbers on any screen.

Departures (docs/design/rehearse.md lists them): one script per kind and tier (15, plus practise leaving), not two
variants (30); the scripts are this skill's options, not `RehearsalScenario` / `RehearsalTurn` nodes; no prompt fade
(full line → first words → blank) or tier advance over past rehearsals, no off-phone reps, no cap of two a day (no
history read yet); no follow-up card (the end card opens the prep, which books the real conversation); the picker's
safety route shows the resources rather than practise-leaving only (practise leaving is offered to everyone).

Safety (plan C6): *Talk to someone now* on every screen; no line in any script threatens, slurs or names a trauma.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "rehearse"
TOOL_ID = "rehearse"
CONCEPT = "dbt_behavioral_rehearsal"
VERSION = "rh-v1"
OWN_MAX = 90  # one opening line


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def has(field, v):
    return {"has": [a(field) + ".ids", v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
STIRRED = {"eq": ["$ctx.band", "stirred"]}
HEADS_UP = {"eq": ["$ctx.frame", "heads_up"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

# The picker's copy (the shared keys from DEAR MAN's content; this skill's own question and safety heading).
import importlib.util  # noqa: E402
import os  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)
SHARED_PICKER_KEYS = [
    "personNew", "personNameLabel", "personNameHint", "personRoleLabel", "personKeepLine", "personNoNameLine",
    "personSignedOutLine", "personGoOn", "personChanged", "personChangedHint", "safeQuestion", "safeYes", "safeNo",
    "safeUnsure", "riskQuestion", "riskHarm", "riskBadly", "riskUnsaid", "safetyRouteBody", "safetyRouteEnding",
    "safetyRouteBack",
]
PICKER_COPY = {
    **{f"picker_{k}": DM.SAFETY_COPY[k] for k in SHARED_PICKER_KEYS},
    "picker_personWhoRehearse": "Who's the conversation with?",
    # PRD IE-02: no confrontation rehearsal with someone who might hurt you.
    "picker_safetyRouteRehearseHeading": "With {who}, your safety comes before any practice conversation.",
}

COPY = {
    "kind_title": "What's the conversation?",
    "kind_flooded": "Practising works better once your body settles. The easy version is here if you want it now.",
    "cool_down": "Settle my body first",
    "line_title": "What's the first thing you'll say?",
    "line_hint": "Your words. You can change them any time.",
    "tier_title": "How will they respond?",
    "tier_hint": "You choose how hard. Stopping always counts.",
    "tier_heads_up": "With them, practising a calm way out can help too.",
    "tier_flooded": "The easy version, or practising a way out, for now.",
    # --- The stage ---
    "stage_title": "Say it.",
    "stage_hint": "Out loud if you can, or in your head.",
    "aloud": "I said it out loud",
    "in_head": "I said it in my head",
    "your_move": "What do you do?",
    "stop": "Stop practising",
    # What their figure does, read to a screen reader with their line (the stage shows it as a pose).
    "pose_closer": "steps closer",
    "pose_arms": "arms folded",
    "pose_turn_away": "turns away",
    "pose_still": "goes still",
    "you": "You",
    "them": "Them",
    "end_line": "That's the conversation.",
    "next": "Next",
    # --- If it goes that way ---
    "ifthen_title": "If it goes that way for real, what will you do?",
    "ifthen_hint": "One thing you can do in the moment.",
    # --- The close ---
    "close_title": "Saying it for real feels…",
    "close_done": "You practised it. That counts.",
    "close_stopped": "You stopped. That counts too.",
    "ready_title": "Could you say it for real?",
    "end_title": "That's the practice.",
    "end_ready": "The real conversation is yours to choose. Planning it can help.",
    "end_not_sure": "Another practice can help. Pick a harder version when you're ready.",
    "end_harder": "Saying it for real feels harder right now. Settle your body first, or leave it for today.",
    "end_plan_title": "For the hard moment: {plan}.",
    "plan_offer": "Plan the conversation",
    "again_offer": "Practise again",
    "cope_offer": "Plan for the hardest moment",
    "safety_open": "Talk to someone now",
    "done": "Done",
    "own_words": "Something else",
    **PICKER_COPY,
}

KIND = [
    ("ask", "Asking for something"),
    ("say_no", "Saying no"),
    ("boundary", "Setting a limit"),
    ("address", "Bringing up a problem"),
    ("repair", "Making a repair"),
]
# Starter lines per kind (own words always there).
LINES = {
    "ask": ["Could you help me with something?", "I need to ask you for something.", "Would you be willing to help this week?"],
    "say_no": ["No, I can't do that.", "I'm going to say no this time.", "That doesn't work for me."],
    "boundary": ["I need this to stop.", "I'm not okay with that.", "Please don't do that again."],
    "address": ["Can we talk about what happened?", "Something's been bothering me.", "I want to bring something up."],
    "repair": ["I'm sorry for what I said.", "I got that wrong, and I'm sorry.", "I'd like to make things right."],
}
# How they'll respond (PRD step 3), and which band sees each (step 2: flooded easy only, stirred no hardest; practising
# a way out is always offered).
TIER = [
    ("easy", "The easy version: they listen", True, True),
    ("realistic", "Realistic: they push back, then partly", False, True),
    ("hardest", "The hardest likely: they say no or turn it on you", False, False),
    ("leave", "Practise leaving: a calm way out", True, True),
]
TIER_FOR_BAND = {"all": [{"any": [{"not": FLOODED}, {"eq": ["$opt.flooded", True]}]},
                         {"any": [{"not": STIRRED}, {"eq": ["$opt.stirred", True]}]},
                         # *It tends to go badly* (heads_up): no hardest version with them (as the prep drops asks to be heard).
                         {"any": [{"not": HEADS_UP}, {"eq": ["$opt.stirred", True]}]}]}

# Your moves (PRD step 6), each a DEAR MAN, GIVE or FAST move, or the walk-away point. `says` is what your figure says.
MOVE = [
    ("again", "Say it again", "M", None),                                           # broken record: your line again
    ("acknowledge", "Acknowledge, then come back", "V+M", "I hear you. And this still matters to me."),
    ("name", "Name what's happening", "M", "I notice we keep moving away from it."),
    ("middle", "Offer a middle", "N", "Could we find something in between?"),
    ("turn", "Ask what would work for them", "N", "What would work for you?"),
    ("break", "Step out, come back later", "walk_away", "I'm going to take a break and come back to this."),
    ("done", "End the conversation", "walk_away", "I'm done with this conversation for now."),
    ("lost_it", "I'd lose it here", None, None),                                    # ends the stage at once → ifthen
]
EASY_MOVES = ["again", "acknowledge", "turn", "done"]
REAL_MOVES = ["again", "acknowledge", "middle", "turn", "break"]
HARD_MOVES = ["again", "acknowledge", "name", "break", "done", "lost_it"]
# Practising leaving starts from the step-out line; *Say it again* holds it while they push.
LEAVE_MOVES = ["again", "break", "done"]

# The scripts (PRD step 5): their three replies per kind and tier, plain and never abusive. A line in brackets is
# what they do. Poses: open, neutral, closer, arms, turn_away, still.
SCRIPTS = {
    ("ask", "easy"): [("What do you need?", "open"), ("Okay, that makes sense.", "open"), ("Sure, I can do that.", "open")],
    ("ask", "realistic"): [("Can we talk about this later?", "turn_away"), ("I don't know if I can do all of that.", "neutral"),
                           ("I could do part of it.", "open")],
    ("ask", "hardest"): [("No. That's not happening.", "arms"), ("You always want something from me.", "arms"),
                         ("(They go quiet and look away.)", "still")],
    ("say_no", "easy"): [("Oh. Is there a reason?", "neutral"), ("Okay, I'll ask someone else.", "open"), ("Fair enough.", "open")],
    ("say_no", "realistic"): [("Come on, it's only this once.", "closer"), ("I really thought I could count on you.", "neutral"),
                              ("Fine. Maybe next time?", "open")],
    ("say_no", "hardest"): [("You can't be serious.", "arms"), ("After everything I've done for you?", "still"),
                            ("(They turn away and go quiet.)", "turn_away")],
    ("boundary", "easy"): [("I didn't know it bothered you.", "neutral"), ("Okay. I'll try.", "open"), ("Thanks for telling me.", "open")],
    ("boundary", "realistic"): [("I didn't think it was a big deal.", "arms"), ("I'll think about it.", "neutral"),
                                ("I can try, sometimes.", "open")],
    ("boundary", "hardest"): [("Who are you to tell me what to do?", "arms"), ("I don't see why it matters so much.", "turn_away"),
                              ("(They fold their arms and say nothing.)", "still")],
    ("address", "easy"): [("Oh, what happened?", "open"), ("I didn't realise. I'm sorry.", "neutral"), ("Let's sort it out.", "open")],
    ("address", "realistic"): [("This isn't a good time.", "turn_away"), ("That's not how I remember it.", "arms"),
                               ("Okay, maybe I could have handled it better.", "neutral")],
    ("address", "hardest"): [("Here we go again.", "arms"), ("What about what you did?", "arms"),
                             ("(They look at their phone and don't answer.)", "turn_away")],
    ("repair", "easy"): [("Thanks for saying that.", "open"), ("I was upset, yes.", "neutral"), ("Okay. I appreciate it.", "open")],
    ("repair", "realistic"): [("Sorry doesn't really fix it.", "arms"), ("I need a bit of time.", "turn_away"),
                              ("Okay. Let's see how it goes.", "neutral")],
    ("repair", "hardest"): [("It's too late for that.", "arms"), ("You always say that.", "still"), ("(They walk away.)", "turn_away")],
    # Practise leaving, whatever the kind: a calm way out (PRD: exit line, step-out move). Pressure to stay, never
    # blocking the way (Gate 2): nobody steps closer in this script or the hardest ones.
    ("any", "leave"): [("Can we keep going?", "neutral"), ("I'd rather finish this now.", "neutral"), ("(They keep talking.)", "neutral")],
}
MOVES_FOR = {"easy": EASY_MOVES, "realistic": REAL_MOVES, "hardest": HARD_MOVES, "leave": LEAVE_MOVES}
# Per kind: a repair never repeats the apology (FAST: no extra apologies), and a firm no is not traded for a middle.
NOT_FOR_KIND = {"repair": {"again"}, "say_no": {"middle"}}


def moves_for(kind, tier):
    return [m for m in MOVES_FOR[tier] if m not in NOT_FOR_KIND.get(kind, set())]


READY = [("sure", "Sure"), ("think_so", "I think so"), ("not_sure", "Not sure")]
TVN = [("worse", "Harder"), ("same", "About the same"), ("better", "Easier"), ("much_better", "Much easier")]
IFTHEN = [
    ("again", "Say my line again, calmly"),
    ("acknowledge", "Acknowledge them, then come back to it"),
    ("name", "Name what's happening"),
    ("break", "Step out and come back later"),
    ("done", "End the conversation"),
]
STOPPED = has("stage", "stopped")
PRACTISED = {"any": [has("stage", "finished"), has("stage", "stepped_out"), has("stage", "lost_it")]}
# After the hardest version, unless they stopped (finished or stepped out), or *I'd lose it here* on any.
WENT_HARD = {"any": [has("stage", "lost_it"), {"all": [is_("tier", "hardest"), PRACTISED]}]}
WORSE = is_("close", "worse")


def ask(sid, title, hint, fields, nxt, **extra):
    # *Talk to someone now* on every screen: on the last field always shown, so it sits below the form.
    i = max(j for j, f in enumerate(fields) if "showWhen" not in f)
    fields = [*fields[:i], {**fields[i], "links": [*fields[i].get("links", []), SAFETY_LINK]}, *fields[i + 1:]]
    s = {"id": sid, "kind": "ask", "title": title, "fields": fields, "next": nxt, **extra}
    if hint:
        s["hint"] = hint
    return s


def field(fid, lst, *, mx=1, required=True, own=None, where=None, first=None, **extra):
    opts = {"list": lst, **({"where": where} if where else {}), **({"firstFrom": first} if first else {})}
    f = {"id": fid, "options": opts, "max": mx, "required": required, **extra}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True, "max": OWN_MAX}
    return f


STAGE_PROPS = {
    "fromSkill": ID, "kind": "kind", "tier": "tier", "line": "line",
    "aloud": "aloud", "inHead": "in_head", "yourMove": "your_move", "stop": "stop", "you": "you", "them": "them",
    "endLine": "end_line", "next": "next",
    "poseCloser": "pose_closer", "poseArms": "pose_arms", "poseTurnAway": "pose_turn_away", "poseStill": "pose_still",
}

STEPS = [
    ask("kind", "kind_title", None,
        [field("kind", "kind", first="$ctx.situationId", links=[{"exit": "cool_down", "label": "cool_down", "when": FLOODED}])],
        [{"to": "line"}], lines=[{"when": FLOODED, "key": "kind_flooded"}]),
    ask("line", "line_title", "line_hint",
        [field("line", "line", own="own_words", where={"eq": ["$opt.kind", a("kind")]})], [{"to": "tier"}]),
    ask("tier", "tier_title", "tier_hint", [field("tier", "tier", where=TIER_FOR_BAND)], [{"to": "stage"}],
        lines=[{"when": FLOODED, "key": "tier_flooded"}, {"when": HEADS_UP, "key": "tier_heads_up"}]),
    {"id": "stage", "kind": "embed", "embed": "rehearsalStage", "answerAs": "stage", "title": "stage_title",
     "hint": "stage_hint", "props": STAGE_PROPS, "links": [SAFETY_LINK],
     "next": [{"when": WENT_HARD, "to": "ifthen"}, {"to": "close"}]},
    # Optional: someone who just said they'd lose it isn't made to pick a plan to go on.
    ask("ifthen", "ifthen_title", "ifthen_hint", [field("ifthen", "ifthen", required=False)], [{"to": "close"}]),
    ask("close", "close_title", None, [field("close", "tvn", askFresh="thenVsNow")],
        # Harder: no *could you say it for real?*; the end card settles the body.
        [{"when": WORSE, "to": "end"}, {"to": "ready"}],
        lines=[{"when": STOPPED, "key": "close_stopped"}, {"when": PRACTISED, "key": "close_done"}]),
    ask("ready", "ready_title", None, [field("ready", "ready")], [{"to": "end"}]),
    {"id": "end", "kind": "handoff", "complete": True, "done": "done", "next": [],
     "title": [{"key": "end_plan_title", "when": {"all": [{"set": a("ifthen")}, {"not": WORSE}]}}, {"key": "end_title"}],
     "titleSlots": {"plan": {"labelOf": "ifthen"}},
     "lines": [
         {"when": is_("close", "worse"), "key": "end_harder"},
         {"when": is_("ready", "not_sure"), "key": "end_not_sure"},
         {"when": ALWAYS, "key": "end_ready"},
     ],
     "offers": [
         {"exit": "cool_down", "when": is_("close", "worse")},
         {"exit": "plan", "when": {"not": is_("close", "worse")}},
         {"exit": "cope_ahead", "when": {"all": [{"set": a("ifthen")}, {"not": WORSE}]}},
         {"exit": "again", "when": ALWAYS},
     ],
     "links": [SAFETY_LINK]},
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                                       # DT-01 First, the body
    {"id": "plan", "toolId": "dear-man", "query": {"person": "$ctx.personId"}, "label": "plan_offer"},
    {"id": "again", "toolId": "rehearse", "query": {"situationId": "$a.kind", "person": "$ctx.personId"}, "label": "again_offer"},
    {"id": "cope_ahead", "toolId": "cope-ahead", "query": {"situationId": "conversation"}, "label": "cope_offer"},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    out = [("kind", v, label, {}, None) for v, label in KIND]
    out += [("line", f"{k}_{i}", text, {"kind": k}, None) for k, lines in LINES.items() for i, text in enumerate(lines, 1)]
    out += [("tier", v, label, {"flooded": fl, "stirred": st}, None) for v, label, fl, st in TIER]
    out += [("move", v, label, {k: x for k, x in (("letter", letter), ("says", says)) if x}, None) for v, label, letter, says in MOVE]
    for (kind, tier), turns in SCRIPTS.items():
        for n, (text, pose) in enumerate(turns, 1):
            out.append(("turn", f"{kind}_{tier}_{n}", text, {"kind": kind, "tier": tier, "n": n, "pose": pose,
                                                            "moves": ",".join(moves_for(kind, tier))}, None))
    out += [("ifthen", v, label, {}, None) for v, label in IFTHEN]
    out += [("tvn", v, label, {}, None) for v, label in TVN]
    out += [("ready", v, label, {}, None) for v, label in READY]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "kind", "ownMax": OWN_MAX,
    # personId: the person picked on the page (or `none`); band: a host's or the carried reading; situationId: which
    # kind comes first (a host's); frame: heads_up when the picker's answer was *it tends to go badly*.
    "accepts": ["personId", "band", "situationId", "frame"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
