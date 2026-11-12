"""Problem Solve (DBT ER Handout 12, 12a) as a skill on the runtime (ER-12, docs/design/problem-solve.md).

The port of the hand-built page (src/pages/tools/ProblemSolve.tsx before 10 Nov 2026). The clinical content is NOT
here: the problem types per DBT parent, the solution directions and their three step sizes, the parts of a problem
and the MI barriers stay in schema/problem-solve-data.cypher and schema/problem-solve-barriers.cypher, read by
ps_graph.py and turned into the skill's options below (each keeps a PRESENTS edge to the node it shows). What is here:
the screens, their copy (rewritten in the house voice; the protocol's sentences predate it), the transitions, and the
few chip labels the voice check changes (LABELS).

Handout 12: (1) check the facts / name the problem, (2) the goal, (3) brainstorm, (4) pick a solution that fits,
(5) the pros and cons, (6) put it into action, (7) evaluate the results. Steps 1, 3, 4 and 6 are here as the old page
had them (departures in docs/design/problem-solve.md: no separate goal or facts step, a curated brainstorm with an own
idea, pros and cons waiting for DT-10); step 7, the evaluation, is `review` (did it, and did it help), which only a
reopened run starts on (`reopens`), from the `ps_review` card the commit card schedules.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ps_graph import content as ps_content  # noqa: E402

ID = "problem_solve"
TOOL_ID = "problem-solve"
CONCEPT = "dbt_problem_solving"
VERSION = "ps-v1"
OWN_MAX = 140

PS = ps_content()

# --- Screen 1: the curated grid words. Each one's DBT parent has problem types and the word is PS-applicable. ---
FEEL_CHIPS = ["anxious", "worried", "stressed", "angry", "frustrated", "sad", "lonely", "hurt", "guilty", "jealous"]

COPY = {
    "feel_title": "What's the feeling that's pointing at a problem?",
    "feel_more": "Something else",
    "ready_title": "Can you think about this fairly clearly right now, or is the feeling too loud?",
    "not_now_line": "That makes sense. When a feeling is this loud, planning is harder. It may help to bring it down a little first, then come back to this.",
    "not_fit_shame": "When a feeling says something is wrong with you, there's nothing there to solve. Lots of people feel this. Doing the opposite of hiding often helps more. If there's one thing you did that you want to put right, you can come back for that.",
    "not_fit_facts": "When something isn't clear yet, it helps to get the facts straight before solving anything.",
    "not_fit_other": "Problem Solve works from a feeling that's pointing at a problem you can work on. This one might want something else first.",
    # The problem screen leads with what the feeling is saying (the parent's acknowledgment, re-voiced).
    "ack_fear": "Your fear is pointing at something that matters to you. Let's see what you can do about it.",
    "ack_anger": "Your anger says something that mattered got crossed. Let's work out what to do about it.",
    "ack_disgust": "Something is crossing a line for you. Let's see what you can do about it.",
    "ack_envy": "Envy points at something you want. That's useful to know, and you can use it.",
    "ack_jealousy": "Something in this relationship feels under threat. Let's look at what you can do, starting from what you need.",
    "ack_love": "The love is real, and something is in the way. Let's look at what's in the way.",
    "ack_sadness": "You've lost something, or something didn't go the way you needed. Let's see which parts you can do something about.",
    "ack_guilt": "Something you did doesn't sit right with your values. The move now is repair, not punishing yourself.",
    "problem_q": "Which of these sounds closest?",
    # A word the routing sends here from outside the graph's problem-solve words: the screen doesn't name a parent.
    "ack_routed": "Something is asking a lot of you right now. Let's see what you can do about it.",
    "own_hint": "Say it your way",
    "piling": "It's not one thing. Everything feels like too much",
    "safety_open": "Talk to someone now",
    "triage_title": "When everything piles up, one thing is a foothold. Which would shift most if it moved even a little?",
    "barrier_title": "What's in the way of doing something about it?",
    "barrier_hint": "There's no wrong answer. It helps find the next step.",
    "sub_title": "Can you say a bit more?",
    "sub_title_tried": "You've been trying. That counts, even though it hasn't landed the way you needed. Can you say a bit more?",
    # What to say to each barrier (BarrierSubResponse.therapeuticResponse, re-voiced).
    "re_cant-afraid-aftermath": "The fear of what comes after is real, and you can prepare for it. Rehearsing the hard part first can make the real thing less overwhelming.",
    "re_cant-no-energy": "That's not a flaw in you. When you're running low, even obvious steps feel impossible. Refill a little first, then come back.",
    "re_cant-ambivalent": "That's honest. Both sides are real: the part that wants change and the part that doesn't. Let's look at what staying the same protects you from.",
    "re_cant-keep-putting-off": "Putting it off usually protects you from something, like discomfort, failing or conflict. Let's find the smallest version of the step and see how sure you feel about that.",
    "re_person-dont-know-what-to-say": "DEAR MAN is for exactly that. It gives you a shape for what to say, so you don't start from nothing.",
    "re_person-scared-reaction": "Their reaction is worth taking seriously. You can prepare what to say and rehearse how you'll handle the hard part.",
    "re_person-tried-they-dont-listen": "When something hasn't landed, it may be the approach and not the message. Changing how you say it can change whether it gets through. Or this may be where your influence over them ends.",
    "re_person-no-right-to-speak": "That feeling is worth a look. You have needs, and saying them isn't selfish. This may be more about your self-respect than the problem itself.",
    "re_tried-talked-to-them": "Maybe it's the approach that needs to change, not the goal. Saying your piece and saying it so it gets through are different things.",
    "re_tried-thinking-constantly": "That's your mind working on it, and it counts. Thinking and doing are different skills. You've done the thinking. Let's try the smallest piece of doing.",
    "re_tried-different-approaches": "That tells you something. Either it needs a different kind of strategy, or this wall won't move and the wise move is to put your energy somewhere else.",
    "re_tried-exhausted": "Trying hard without results wears you out. You're not failing, you're running low. The most useful thing now is to refill, not push harder.",
    "go_q": "What would help now?",
    "go_ambiv": "Look at what it protects me from",
    "go_ruler": "See how sure I feel",
    "go_options": "Show me some options",
    "go_keep": "Keep problem-solving",
    "ambiv_title": "What does staying the same protect you from?",
    # What to say to each answer (AmbivalenceOption.therapeuticFollow, re-voiced).
    "fo_ambiv-hard-conversation": "Hard conversations carry real risk. The question is whether not having it costs more than having it.",
    "fo_ambiv-change-might-not-help": "If you change things and it still hurts, that would be hard. That fear is real. Staying put to avoid finding out is a choice too.",
    "fo_ambiv-losing-something": "Change usually costs something. There may be a way to change and keep the part that matters.",
    "fo_ambiv-admitting-need-help": "Asking for help or owning a mistake can feel like it makes you smaller. It's also a way of looking after what matters.",
    "conf_title": "How sure are you that you could do the smallest version of this?",
    "co_high": "So the how is there. Let's name the step.",
    "co_medium": "Small is real. Let's find the smallest version that still counts.",
    "co_low": "That's honest. Someone else could help with this, and a smaller piece might be in reach.",
    "co_none": "Then the step may need to be smaller still, or something may need to change first. Not easy. Possible.",
    "decompose_title": "Some parts of this are facts. Some are up to other people. Some are in your hands.",
    "mine_q": "Which of these are in your hands?",
    "others_title": "Which parts are up to someone else?",
    "accept_line": "Most of this is facts or other people's choices. That's painful, and it isn't a failure. Here the skill is to carry it, not solve it.",
    "solutions_title": "Which direction feels right?",
    "solutions_title_small": "Let's start small. Which direction feels right?",
    "solutions_title_mine": "Here's what's in your hands. Which direction feels right?",
    "size_title": "{direction}. Pick what feels doable.",
    "own_step_title": "What's the step you already know you want to take?",
    "own_step_hint": "Write it your way, or start from one of these.",
    "mysize_q": "How big is it?",
    "commit_title": "Your next step: {step}",
    "commit_title_own": "Your next step: {mine}",
    "commit_line": "Any size is a real step. If it doesn't work, or the problem shifts, come back: problem-solving goes round more than once.",
    "commit_line_rehearse": "A bigger step can help to rehearse before you take it.",
    "commit_line_safety": "If it gets more dangerous, call now. You don't have to wait for a plan.",
    "when_q": "Want me to ask how it went?",
    "review_title": "How did it go? You planned: {step}",
    "review_title_own": "How did it go? You planned: {mine}",
    "review_next_part": "Part of it is still a step. What would help with the rest?",
    "review_next_didnt": "That happens, and it's useful to know. What would help next time?",
    "review_next_didnt_safety": "That happens. If you're not safe now, call. Or pick another way.",
    "review_next_nohelp": "You did it, and it didn't help. That's worth knowing. What would help now?",
    "review_next_nohelp_safety": "It didn't help enough. If you're not safe now, call. Or pick another way.",
    "review_help_title": "You took the step. Did it help with the problem?",
    "review_done_line": "You took the step and saw what it did. That's the whole loop: a problem, a step, and seeing how it went.",
    "review_later_line": "It can wait.",
    "review_later_q": "Want me to ask again?",
    "rest_line": "Stopping here is a real choice. You can come back to this when you have more in the tank.",
    "go_rest": "Stop here for now",
    "own_direction": "My own idea",
    "done": "Done",
    "next": "Next",
    # Quiet links (labels for the tools they open; planned ones are written but never shown).
    "l_cope_ahead": "Rehearse it with Cope Ahead",
    "l_dear_man": "Work out what to say with DEAR MAN",
    "l_fast": "Keep your self-respect",
    "l_give": "Keep it warm",
    "l_dialectics": "Find the middle path",
    "l_please_skill": "Look after the basics first",
    "l_build_mastery": "Build a small win",
    "l_finding_connection": "Find someone to lean on",
    "l_self_validate": "Validate yourself",
    "l_others": "This part is about them. Work out what to say with DEAR MAN",
    "l_missing_links": "Find what got in the way",
}

# --- Chip labels the house voice changes (build.py refuses "just" and "but"; the dash becomes a colon) ---
LABELS = {
    "know-but-cant": "I know what to do, and I can't make myself do it",
    "sadness-loss-allow-and-move": "Allow the grief and take one step",
    "sadness-failure-try-again": "Try again, differently",
    "guilt-pattern-understand:medium": "Trace the chain: what set it off, the thought, the urge, what I did, what came after",
    "guilt-pattern-reduce-vulnerability:small": "Check whether I'm short on sleep, hungry, alone or overwhelmed",
    "guilt-pattern-reduce-vulnerability:bigger": "Build a routine that keeps me above the point where the pattern takes over",
    "jealousy-trust-conversation:medium": "Have the conversation with DEAR MAN: what happened, how it hit me, what I need",
    "jealousy-trust-conversation:bigger": "Agree together what rebuilding trust looks like: specific actions, not only promises",
    "sadness-loss-allow-and-move:bigger": "Honor the loss in a way that matters, then change one thing about how I'm living now",
    "jealousy-trust-decide:medium": "Give it a set time, then look again at whether to keep going",
    "sadness-erosion-identify-barrier:small": "Name one thing I stopped doing, and what got in the way",
    "love-internal-conversation:medium": "Tell them: \"I love you, and this thing between us needs to change\"",
}


def voiced(text):
    """A chip label as the graph has it, in the house voice: the spaced dash becomes a colon."""
    t = re.sub(r"\s+—\s+(and|even)\b", r", \1", text.strip())
    t = re.sub(r"\s+—\s+", ": ", t)
    t = re.sub(r"\bnot just\b", "not only", t)
    t = re.sub(r"\bjust talk\b", "talk", t)
    t = re.sub(r"\bdon't just offer\b", "don't only offer", t)
    t = re.sub(r",? not just ", ", not only ", t)
    return t


def label(node):
    over = LABELS.get(node["id"])
    return over if over else voiced(node["label"])


# --- Who goes where after screen 1 (grid word → fit / shame / facts / other) ---
def fit_table():
    import json
    import subprocess
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    square = json.loads(subprocess.check_output([sys.executable, os.path.join(root, "scripts/emotions/build.py"), "--json"]))["square"]
    saved = list(sys.path)
    try:
        from graph_tables import tables  # puts scripts/recommendations on the path, whose build.py would shadow ours
    finally:
        sys.path[:] = saved
    parent_of, _ = tables()
    with_types = set(PS["problemTypes"])
    out, parents = {}, {}
    for w in square:
        applicable, alt = PS["fit"].get(w, (False, None))
        parent = ROUTED_IN.get(w) or parent_of.get(w)
        if (applicable or w in ROUTED_IN) and parent in with_types:
            parents[w] = parent
            out[w] = "fit"
        elif parent == "shame" or alt == "opposite-action":
            out[w] = "shame"
        elif alt == "check-the-facts":
            out[w] = "facts"
        else:
            out[w] = "other"
    return out, parents


# Words the check-in's routing sends here (scripts/recommendations/content.py WORD_RULES, tool problem-solve) that the
# graph doesn't mark problem-solve applicable: the parent whose problems each one starts from, so a person routed here
# isn't turned away on the first screen. Busy and rushed sit with stressed (fear); helpless starts from sadness's
# problems (the row's why: Problem Solve in micro-steps). For Claudia's review with the routing words.
ROUTED_IN = {"busy": "fear", "rushed": "fear", "helpless": "sadness"}
PS_FIT, PS_PARENT = fit_table()
assert all(PS_FIT[w] == "fit" for w in FEEL_CHIPS), [w for w in FEEL_CHIPS if PS_FIT[w] != "fit"]

# Words that can carry hopelessness: a quiet *Talk to someone now* wherever they land (as ER-14's *Nothing will ever
# help me*), since nothing in the skill asks.
HOPELESS = [w for w in ("hopeless", "despair", "depressed", "worthless", "helpless", "powerless") if w in PS_FIT]
# With only own words, the problem type whose parts and directions fit most problems of the parent. Fear's list starts
# with safety and health, so own words alone would get *Get safe now* or medical steps; anticipatory is the general one.
OWN_FALLBACK = {"fear": "fear-anticipatory"}
SAFETY_TYPE = "fear-safety-threat"  # "My safety is at risk": the other_person banner, and straight to the directions
KNOW_BUT_CANT, INVOLVES, TRIED, NOT_SURE, OUTSIDE = "know-but-cant", "involves-person", "tried-nothing-works", "not-sure-what", "outside-control"


def a(field):
    return f"$a.{field}"


def eq(ref, v):
    return {"eq": [ref, v]}


# The problem the person picked: on the problem screen, or the foothold they picked when everything piled up.
PICKED_TYPE = {"any": [{"all": [{"set": "$a.problem.ids"}, {"not": eq(a("problem"), "piling")}]}, {"set": "$a.focus.ids"}]}
SAFETY = {"any": [eq(a("problem"), SAFETY_TYPE), eq(a("focus"), SAFETY_TYPE)]}
# An option of the problem type picked; with only own words, the parent's general problem type (OWN_FALLBACK).
FOR_TYPE = {"any": [
    {"all": [{"set": a("problem")}, eq("$opt.type", a("problem"))]},
    {"all": [{"set": a("focus")}, eq("$opt.type", a("focus"))]},
    {"all": [{"not": PICKED_TYPE}, eq("$opt.firstOf", "$d.parent")]},
]}
FLOODED = eq("$ctx.band", "flooded")
# Own words for the problem are never read, so danger told in them gets someone to talk to on the planning screens too.
OWN_PROBLEM_LINK = {"exit": "safety_open", "label": "safety_open", "when": {"any": [{"own": "problem"}, {"own": "focus"}]}}
BIG = {"any": [{"some": ["size", {"in": ["$opt.size", ["medium", "bigger"]]}]}, {"in": [a("mysize"), ["medium", "bigger"]]}]}
OWN_STEP = {"own": "mystep"}
NOT_LATER_IF_SAFE = {"not": {"all": [SAFETY, eq("$opt.value", "this_week")]}}

DERIVE = [
    {"name": "parent", "from": a("feel"), "table": "psParent"},
    {"name": "fit", "from": a("feel"), "table": "psFit", "default": "other"},
    {"name": "subGo", "from": a("sub"), "table": "subGo"},
    {"name": "startSmall", "from": a("sub"), "table": "startSmall"},
]

RUNNING_LOW = ("cant-no-energy", "tried-exhausted")  # what to say is *refill first*, so the first chip is to stop
# --- Which "what next" chips each barrier answer gets (the old page's buttons, from the sub-response's flags) ---
SUB_GO = {}
for _bt, rows in PS["subs"].items():
    for r in rows:
        go = ["rest"] if r["id"] in RUNNING_LOW else []
        if r.get("triggersAmbivalenceExploration"):
            go.append("ambiv")
        if r.get("triggersConfidenceRuler"):
            go.append("ruler")
        if r.get("routesToSolutions"):
            go.append("options")
        if go in ([], ["rest"]):
            go.append("keep")
        SUB_GO[r["id"]] = go
START_SMALL = {r["id"]: "yes" for rows in PS["subs"].values() for r in rows if r.get("solutionSizeHint") == "small"}

# --- Exits: every tool the content names. Unbuilt ones are planned: written, never offered or linked. ---
BUILT = {"cool-down", "five-senses", "pause", "cope-ahead", "dear-man", "fast", "opposite-action", "check-the-facts",
         "find-the-feeling", "ending-relationships", "let-it-be", "give"}


def exit_id(tool):
    return tool.replace("-", "_")


def tools_named():
    t = set(PS["protocol"]["readinessRedirectTools"]) | set(PS["protocol"]["nothingCanChangeTools"])
    for k in ("confidenceHighTools", "confidenceLowTools", "confidenceNoneTools"):
        t |= set(PS["protocol"][k])
    for rows in PS["directions"].values():
        t |= {d["linkedToolId"] for d in rows if d.get("linkedToolId")}
    for rows in PS["subs"].values():
        for r in rows:
            t |= {r[k] for k in ("redirectToolId", "redirectToolIdSecondary") if r.get(k)}
    for rows in PS["ambivalence"].values():
        t |= {r["redirectToolId"] for r in rows if r.get("redirectToolId")}
    t |= set(PS["fit"][w][1] for w in PS["fit"] if PS["fit"][w][1])
    t |= {"cope-ahead", "dear-man", "give", "find-the-feeling", "missing-links"}
    return sorted(t)


EXITS = [{"id": exit_id(t), "toolId": t, **({"carry": ["feel"]} if t in BUILT else {"planned": True})} for t in tools_named()]
EXITS += [{"id": "safety_open", "safety": True}, {"id": "done", "done": True}]


def link(tool, when):
    return {"exit": exit_id(tool), "label": f"l_{exit_id(tool)}", "when": when}


def tool_links(pairs):
    """One quiet link per tool, shown while the picked option is one that names it."""
    by_tool = {}
    for opt_id, tool in pairs:
        by_tool.setdefault(tool, []).append(opt_id)
    return by_tool


def sub_links():
    pairs = []
    for rows in PS["subs"].values():
        for r in rows:
            for k in ("redirectToolId", "redirectToolIdSecondary"):
                if r.get(k):
                    pairs.append((r["id"], r[k]))
    return [link(t, {"in": [a("sub"), ids]}) for t, ids in sorted(tool_links(pairs).items())]


def ambiv_links():
    pairs = [(r["id"], r["redirectToolId"]) for rows in PS["ambivalence"].values() for r in rows if r.get("redirectToolId")]
    return [link(t, {"in": [a("ambiv"), ids]}) for t, ids in sorted(tool_links(pairs).items())]


def conf_links():
    p = PS["protocol"]
    pairs = [(lvl, t) for lvl, key in (("high", "confidenceHighTools"), ("low", "confidenceLowTools"), ("none", "confidenceNoneTools")) for t in p[key]]
    return [link(t, {"in": [a("conf"), ids]}) for t, ids in sorted(tool_links(pairs).items())]


def direction_offers():
    by_tool = {}
    for rows in PS["directions"].values():
        for d in rows:
            if d.get("linkedToolId"):
                by_tool.setdefault(d["linkedToolId"], True)
    return [{"exit": exit_id(t), "when": {"some": ["solutions", eq("$opt.tool", t)]}} for t in sorted(by_tool) if t not in DECIDE_ONLY]


# A direction's tool that answers the question its smaller steps only ask (*Decide if this can be repaired* →
# Ending a relationship): offered only on the step that names the choice (bigger), and behind the others, so it
# never leads a card whose step is still weighing repair.
DECIDE_ONLY = {"ending-relationships"}


def decide_offers():
    return [{"exit": exit_id(t), "when": {"all": [{"some": ["solutions", eq("$opt.tool", t)]}, {"some": ["size", eq("$opt.size", "bigger")]}]}}
            for t in sorted(DECIDE_ONLY)]


for t in {ln["exit"] for ln in sub_links() + ambiv_links() + conf_links()} - {k[2:] for k in COPY if k.startswith("l_")}:
    raise AssertionError(f"a link label for {t}")

STEPS = [
    {
        "id": "feel", "kind": "ask", "title": "feel_title",
        "fields": [{"id": "feel", "options": {"emotions": FEEL_CHIPS, "carriedFirst": True, "moreKey": "feel_more"},
                    "max": 1, "required": True, "emotion": True}],
        # A carried flooded reading (C6.2): settle first, never into the planning.
        "next": [{"when": FLOODED, "to": "not_now"}, {"when": {"not": eq("$d.fit", "fit")}, "to": "not_fit"}, {"to": "ready"}],
    },
    {
        "id": "ready", "kind": "ask", "title": "ready_title",
        "fields": [{"id": "ready", "options": {"list": "ready"}, "max": 1, "required": True}],
        "next": [{"when": eq(a("ready"), "too_loud"), "to": "not_now"}, {"to": "problem"}],
    },
    {
        "id": "problem", "kind": "ask",
        "title": [{"when": {"in": [a("feel"), sorted(ROUTED_IN)]}, "key": "ack_routed"}]
                 + [{"when": eq("$d.parent", p), "key": f"ack_{p}"} for p in sorted(PS["problemTypes"])][:-1]
                 + [{"key": f"ack_{sorted(PS['problemTypes'])[-1]}"}],
        "fields": [{
            "id": "problem", "label": "problem_q", "max": 1, "swap": True, "required": True,
            "options": {"list": "problem", "where": {"any": [eq("$opt.parent", "$d.parent"), eq("$opt.all", True)]}},
            # 80, like the step below: the longest record (every field, both own-words boxes full) stays under ext's 4 KB.
            "own": {"hint": "own_hint", "countsAsPick": True, "max": 80},
            # Own words are never read, so danger told in them can't raise the banner: someone to talk to is one tap away.
            "links": [{"exit": "safety_open", "label": "safety_open", "when": {"any": [{"own": "problem"}, {"in": [a("feel"), HOPELESS]}]}}],
        }],
        "crisis": [{"variant": "other_person", "when": eq(a("problem"), SAFETY_TYPE)}],
        "next": [{"when": eq(a("problem"), "piling"), "to": "triage"}, {"when": SAFETY, "to": "solutions"}, {"to": "barrier"}],
    },
    {
        "id": "triage", "kind": "ask", "title": "triage_title",
        "fields": [{"id": "focus", "max": 1, "required": True, "swap": True,
                    "options": {"list": "problem", "where": {"all": [eq("$opt.parent", "$d.parent"), {"not": eq("$opt.all", True)}]}},
                    "own": {"hint": "own_hint", "countsAsPick": True, "max": 80},
                    "links": [{"exit": "safety_open", "label": "safety_open", "when": {"any": [{"own": "focus"}, {"in": [a("feel"), HOPELESS]}]}}]}],
        "crisis": [{"variant": "other_person", "when": eq(a("focus"), SAFETY_TYPE)}],
        "next": [{"when": SAFETY, "to": "solutions"}, {"to": "barrier"}],
    },
    {
        "id": "barrier", "kind": "ask", "title": "barrier_title", "hint": "barrier_hint",
        "fields": [{"id": "barrier", "options": {"list": "barrier"}, "max": 1, "required": True}],
        "next": [
            {"when": {"in": [a("barrier"), [KNOW_BUT_CANT, INVOLVES, TRIED]]}, "to": "sub"},
            {"when": eq(a("barrier"), OUTSIDE), "to": "decompose"},
            {"to": "solutions"},
        ],
    },
    {
        "id": "sub", "kind": "ask",
        "title": [{"when": eq(a("barrier"), TRIED), "key": "sub_title_tried"}, {"key": "sub_title"}],
        "fields": [{"id": "sub", "options": {"list": "sub", "where": eq("$opt.barrier", a("barrier"))}, "max": 1, "required": True}],
        "next": [{"to": "sub_reply"}],
    },
    {
        "id": "sub_reply", "kind": "ask",
        "title": [{"when": eq(a("sub"), r["id"]), "key": f"re_{r['id']}"} for rows in PS["subs"].values() for r in rows]
                 + [{"key": "go_q"}],
        "fields": [{"id": "go", "label": "go_q", "options": {"list": "go", "where": {"has": ["$d.subGo", "$opt.value"]}},
                    "max": 1, "required": True,
                    "links": sub_links() + [{"exit": "safety_open", "label": "safety_open", "when": eq(a("sub"), "tried-exhausted")}]}],
        "next": [{"when": eq(a("go"), "rest"), "to": "rest"}, {"when": eq(a("go"), "ambiv"), "to": "ambivalence"},
                 {"when": eq(a("go"), "ruler"), "to": "confidence"}, {"to": "solutions"}],
    },
    {
        "id": "ambivalence", "kind": "ask", "title": "ambiv_title",
        "fields": [{"id": "ambiv", "options": {"list": "ambiv", "where": eq("$opt.sub", a("sub"))}, "max": 1, "required": True,
                    "links": ambiv_links()}],
        # Parts on, after "Part of me doesn't actually want this to change": come back to that part another time.
        "slots": [{"after": "ambiv", "embed": "partLater", "props": {}, "showWhen": {"all": [eq(a("sub"), "cant-ambivalent"), {"set": a("ambiv")}]},
                   "record": "ps_later"}],
        "next": [{"to": "ambiv_reply"}],
    },
    {
        "id": "ambiv_reply", "kind": "ask",
        "title": [{"when": eq(a("ambiv"), r["id"]), "key": f"fo_{r['id']}"} for rows in PS["ambivalence"].values() for r in rows][:-1]
                 + [{"key": f"fo_{[r for rows in PS['ambivalence'].values() for r in rows][-1]['id']}"}],
        "fields": [],
        "next": [{"to": "solutions"}],
    },
    {
        "id": "confidence", "kind": "ask", "title": "conf_title",
        "fields": [{"id": "conf", "options": {"list": "conf"}, "max": 1, "required": True, "links": conf_links()}],
        "next": [{"to": "conf_reply"}],
    },
    {
        "id": "conf_reply", "kind": "ask",
        "title": [{"when": eq(a("conf"), lvl), "key": f"co_{lvl}"} for lvl in ("high", "medium", "low")] + [{"key": "co_none"}],
        "fields": [],
        "next": [{"when": eq(a("conf"), "high"), "to": "own_step"}, {"to": "solutions"}],
    },
    {
        # One question a screen: what's in their hands first; only when nothing is, what's up to someone else.
        "id": "decompose", "kind": "ask", "title": "decompose_title",
        "fields": [{"id": "mine", "label": "mine_q", "options": {"list": "aspect", "where": FOR_TYPE}, "max": 9,
                    "links": [OWN_PROBLEM_LINK]}],
        "next": [{"when": {"set": a("mine")}, "to": "solutions"}, {"to": "theirs"}],
    },
    {
        # Only other people's parts: the accept card. Nothing picked (not sure, or too much to sort): the directions,
        # starting small, never a verdict on a skip.
        "id": "theirs", "kind": "ask", "title": "others_title",
        "fields": [{"id": "others", "options": {"list": "aspect", "where": FOR_TYPE}, "max": 9,
                    "links": [{"exit": "dear_man", "label": "l_others", "when": {"set": a("others")}}]}],
        "next": [{"when": {"set": a("others")}, "to": "accept"}, {"to": "solutions"}],
    },
    {
        # A guided plan replaces an own-words one (after *A different direction*, or the barrier loop).
        "id": "solutions", "kind": "ask", "clears": ["mystep", "mysize"],
        "title": [
            {"when": {"all": [eq(a("barrier"), OUTSIDE), {"set": a("mine")}]}, "key": "solutions_title_mine"},
            {"when": {"any": [{"set": "$d.startSmall"}, eq(a("conf"), "medium"), eq(a("barrier"), OUTSIDE)]}, "key": "solutions_title_small"},
            {"key": "solutions_title"},
        ],
        # Brainstorm's escape hatch: their own idea goes to the step they already know.
        "fields": [{"id": "solutions", "options": {"list": "direction", "where": {"any": [FOR_TYPE, eq("$opt.all", True)]}}, "max": 1, "required": True,
                    "links": [OWN_PROBLEM_LINK]}],
        "crisis": [{"variant": "other_person", "when": SAFETY}],
        "next": [{"when": eq(a("solutions"), "own"), "to": "own_step"}, {"to": "size"}],
    },
    {
        "id": "size", "kind": "ask", "title": "size_title", "titleSlots": {"direction": {"labelOf": "solutions"}},
        "fields": [{"id": "size", "options": {"list": "step", "where": eq("$opt.dir", a("solutions"))}, "max": 1, "required": True,
                    "links": [OWN_PROBLEM_LINK]}],
        "crisis": [{"variant": "other_person", "when": SAFETY}],
        "next": [{"to": "commit"}],
    },
    {
        "id": "own_step", "kind": "ask", "title": "own_step_title", "clears": ["solutions", "size"],
        "fields": [
            {"id": "mystep", "options": {"list": "starter"}, "max": 1, "required": True,
             "own": {"hint": "own_step_hint", "countsAsPick": True, "open": True, "seed": True, "max": 80},
             "links": [{"exit": "safety_open", "label": "safety_open", "when": {"own": "mystep"}}]},
            {"id": "mysize", "label": "mysize_q", "options": {"list": "mysize"}, "max": 1, "required": True},
        ],
        "next": [{"to": "commit"}],
    },
    {
        "id": "commit", "kind": "handoff", "complete": True,
        "title": [{"when": OWN_STEP, "key": "commit_title_own"}, {"key": "commit_title"}],
        "titleSlots": {"step": {"labelOf": "size"}, "mine": {"labelOf": "mystep"}},
        # On the danger path: call now beats any plan, and a safety step is never sent to rehearse first.
        "lines": [{"when": SAFETY, "key": "commit_line_safety"}, {"when": BIG, "key": "commit_line_rehearse"}, {"when": None, "key": "commit_line"}],
        "fields": [{"id": "when", "label": "when_q", "max": 1,
                    "options": {"list": "when", "where": NOT_LATER_IF_SAFE}}],
        "followUp": {"type": "ps_review", "whenFrom": "when"},
        "crisis": [{"variant": "other_person", "when": SAFETY}],
        "offers": direction_offers() + [{"exit": "cope_ahead", "when": {"all": [BIG, {"not": SAFETY}]}}] + decide_offers(),
        "done": "done",
    },
    {
        # Handout 12 step 7: evaluate. Only the review card's link opens it, on a run that got to the commit card.
        # A second reopen (after a revised plan) doesn't read the last review's answers back as this time's, and the
        # first visit's *can you think clearly right now* is never carried into a later day. What got in the way last
        # time is asked again if they go back to it (it may not be the same thing); the plan itself stays.
        "id": "review", "kind": "ask", "reopens": {"after": "commit", "again": ["review_later"]}, "clears": ["how", "help", "then", "ready", "barrier", "sub", "go", "ambiv", "conf", "mine", "others"],
        "title": [{"when": OWN_STEP, "key": "review_title_own"}, {"key": "review_title"}],
        "titleSlots": {"step": {"labelOf": "size"}, "mine": {"labelOf": "mystep"}},
        "fields": [{"id": "how", "options": {"list": "how"}, "max": 1, "required": True}],
        "next": [{"when": eq(a("how"), "did_it"), "to": "review_help"}, {"when": eq(a("how"), "not_yet"), "to": "review_later"},
                 {"to": "review_next"}],
    },
    {
        # Handout 12 step 7 evaluates the result, not only whether the step got done.
        "id": "review_help", "kind": "ask", "title": "review_help_title",
        "fields": [{"id": "help", "options": {"list": "help"}, "max": 1, "required": True}],
        "next": [{"when": eq(a("help"), "not_really"), "to": "review_next"}, {"to": "review_done"}],
    },
    {
        "id": "review_next", "kind": "ask",
        "title": [{"when": {"all": [eq(a("help"), "not_really"), SAFETY]}, "key": "review_next_nohelp_safety"},
                  {"when": eq(a("help"), "not_really"), "key": "review_next_nohelp"},
                  # On the danger path a step that didn't happen isn't a lesson for next time.
                  {"when": {"all": [{"in": [a("how"), ["didnt", "did_part"]]}, SAFETY]}, "key": "review_next_didnt_safety"},
                  {"when": eq(a("how"), "did_part"), "key": "review_next_part"}, {"key": "review_next_didnt"}],
        # A step that got done and didn't help needs another direction, not a smaller version of itself.
        "fields": [{"id": "then", "max": 1, "required": True,
                    # CORE-11's missing links (as ps_step's missed path was): planned, recorded, never shown yet.
                    "links": [{"exit": "missing_links", "label": "l_missing_links", "when": eq(a("how"), "didnt")}],
                    "options": {"list": "then", "where": {"not": {"all": [eq(a("help"), "not_really"), eq("$opt.value", "smaller")]}}}}],
        "next": [
            {"when": {"all": [eq(a("then"), "smaller"), {"set": a("size")}]}, "to": "size"},
            {"when": eq(a("then"), "smaller"), "to": "own_step"},
            # On the danger path the barrier questions stay skipped (the person in the way may be the danger).
            {"when": {"all": [eq(a("then"), "blocked"), {"not": SAFETY}]}, "to": "barrier"},
            {"to": "solutions"},
        ],
    },
    {"id": "review_done", "kind": "handoff", "complete": True, "lines": [{"when": None, "key": "review_done_line"}],
     "offers": [], "done": "done"},
    # A safety step that hasn't happened yet is never told it can wait.
    {"id": "review_later", "kind": "handoff", "complete": True,
     "lines": [{"when": SAFETY, "key": "commit_line_safety"}, {"when": None, "key": "review_later_line"}],
     "fields": [{"id": "again", "label": "review_later_q", "max": 1, "options": {"list": "when", "where": NOT_LATER_IF_SAFE}}],
     "followUp": {"type": "ps_review", "whenFrom": "again"}, "offers": [], "done": "done"},
    {
        "id": "not_now", "kind": "handoff", "complete": True, "lines": [{"when": None, "key": "not_now_line"}],
        "links": [{"exit": "safety_open", "label": "safety_open", "when": {"in": [a("feel"), HOPELESS]}}],
        "offers": [{"exit": exit_id(t), "when": None} for t in PS["protocol"]["readinessRedirectTools"]],
        "done": "done",
    },
    {
        "id": "not_fit", "kind": "handoff", "complete": True,
        "links": [{"exit": "safety_open", "label": "safety_open", "when": {"in": [a("feel"), HOPELESS]}}],
        "lines": [{"when": eq("$d.fit", "shame"), "key": "not_fit_shame"}, {"when": eq("$d.fit", "facts"), "key": "not_fit_facts"},
                  {"when": None, "key": "not_fit_other"}],
        "offers": [
            {"exit": "opposite_action", "when": eq("$d.fit", "shame")},
            {"exit": "self_validate", "when": eq("$d.fit", "shame")},
            {"exit": "check_the_facts", "when": eq("$d.fit", "facts")},
            {"exit": "body_scan", "when": eq(a("feel"), "numb")},
            {"exit": "mindfulness_emotions", "when": eq("$d.fit", "other")},
            {"exit": "find_the_feeling", "when": eq("$d.fit", "other")},
        ],
        "done": "done",
    },
    {
        "id": "accept", "kind": "handoff", "complete": True, "lines": [{"when": None, "key": "accept_line"}],
        "offers": [{"exit": "dear_man", "when": {"set": a("others")}}]
                  + [{"exit": exit_id(t), "when": None} for t in PS["protocol"]["nothingCanChangeTools"]],
        "done": "done",
    },
    {
        "id": "rest", "kind": "handoff", "complete": True, "lines": [{"when": None, "key": "rest_line"}],
        # Running low wants refilling, not calming down: Look after the basics (planned), and outward attention.
        "offers": [{"exit": "please_skill", "when": None}, {"exit": "five_senses", "when": None}],
        "done": "done",
    },
]

# Safety from a person holds on every step after the problem screen, the review loop included (a reopened run has
# the answer back), so the banner never drops away while they plan.
for _st in STEPS:
    if _st["id"] not in ("feel", "ready", "problem", "triage", "not_now", "not_fit") and "crisis" not in _st:
        _st["crisis"] = [{"variant": "other_person", "when": SAFETY}]

# A hopeless word at the start keeps *Talk to someone now* on every hand-off, wherever the run ends.
HOPELESS_LINK = {"exit": "safety_open", "label": "safety_open", "when": {"in": [a("feel"), HOPELESS]}}
for _st in STEPS:
    if _st["kind"] == "handoff" and not any(ln["exit"] == "safety_open" for ln in _st.get("links", [])):
        _st["links"] = _st.get("links", []) + [HOPELESS_LINK]

# Starters for "the step you already know" (own.seed: a tap writes them into the box to change).
STARTERS = [("call", "Make the call"), ("message", "Send the message"), ("book", "Book it"), ("five_minutes", "Start it for five minutes")]
SIZES = [("small", "Small: in the next hour"), ("medium", "Medium: today or tomorrow"), ("bigger", "Bigger: a real change")]
HELP = [("helped", "It helped"), ("some", "Some"), ("not_really", "Not really")]
HOW = [("did_it", "I did it"), ("did_part", "I did part of it"), ("didnt", "I didn't"), ("not_yet", "Not yet")]
THEN = [("smaller", "A smaller version of the same step"), ("other", "A different direction"), ("blocked", "Something got in the way")]
# The review card's window chips (scripts/practice-spine/content.py ps_review). No chip: no card.
WHEN = [("today", "Tonight"), ("tomorrow", "Tomorrow"), ("this_week", "Later this week")]


def options():
    out = [("ready", "can", "I can think about it", {}, None), ("ready", "too_loud", "It's too loud right now", {}, None)]
    for parent, rows in PS["problemTypes"].items():
        for i, pt in enumerate(rows):
            extra = {"parent": parent}
            if pt["id"] == SAFETY_TYPE:
                extra["danger"] = "other"
            out.append(("problem", pt["id"], label(pt), extra, ("ProblemType", pt["id"])))
    out.append(("problem", "piling", COPY["piling"], {"all": True}, None))
    for b in PS["barriers"]:
        out.append(("barrier", b["id"], label(b), {}, ("BarrierType", b["id"])))
    for bt, rows in PS["subs"].items():
        for r in rows:
            out.append(("sub", r["id"], label(r), {"barrier": bt}, ("BarrierSubResponse", r["id"])))
    for v in ("rest", "ambiv", "ruler", "options", "keep"):
        out.append(("go", v, COPY[f"go_{v}"], {}, None))
    for sub, rows in PS["ambivalence"].items():
        for r in rows:
            out.append(("ambiv", r["id"], label(r), {"sub": sub}, ("AmbivalenceOption", r["id"])))
    p = PS["protocol"]
    for lvl, key in (("high", "confidenceHigh"), ("medium", "confidenceMedium"), ("low", "confidenceLow"), ("none", "confidenceNone")):
        out.append(("conf", lvl, voiced(p[key]), {}, None))
    # With only own words, the parent's first problem type that isn't danger: someone who wrote "exam tomorrow" is never
    # handed *Get safe now* (danger told in own words gets the quiet *Talk to someone now* instead).
    firsts = {OWN_FALLBACK.get(parent) or next(pt for pt in rows if pt["id"] != SAFETY_TYPE)["id"]: parent
              for parent, rows in PS["problemTypes"].items()}
    for parent, rows in PS["problemTypes"].items():
        for pt in rows:
            first = {"firstOf": firsts[pt["id"]]} if pt["id"] in firsts else {}
            for asp in PS["aspects"].get(pt["id"], []):
                out.append(("aspect", asp["id"], label(asp), {"type": pt["id"], **first}, ("DecompositionAspect", asp["id"])))
            for d in PS["directions"].get(pt["id"], []):
                extra = {"type": pt["id"], **first, **({"tool": d["linkedToolId"]} if d.get("linkedToolId") else {})}
                out.append(("direction", d["id"], label(d), extra, ("SolutionDirection", d["id"])))
    out.append(("direction", "own", COPY["own_direction"], {"all": True}, None))
    for parent, rows in PS["problemTypes"].items():
        for pt in rows:
            for d in PS["directions"].get(pt["id"], []):
                for size in ("small", "medium", "bigger"):
                    v = f"{d['id']}:{size}"
                    out.append(("step", v, LABELS.get(v) or voiced(d[size]), {"dir": d["id"], "size": size}, None))
    out += [("starter", v, lab, {}, None) for v, lab in STARTERS]
    out += [("mysize", v, lab, {}, None) for v, lab in SIZES]
    out += [("how", v, lab, {}, None) for v, lab in HOW]
    out += [("help", v, lab, {}, None) for v, lab in HELP]
    out += [("then", v, lab, {}, None) for v, lab in THEN]
    out += [("when", v, lab, {}, None) for v, lab in WHEN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "feel", "ownMax": OWN_MAX,
    "copy": COPY, "tables": {"psFit": PS_FIT, "psParent": PS_PARENT, "subGo": SUB_GO, "startSmall": START_SMALL},
    "derive": DERIVE, "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"], "accepts": ["band"],
}
