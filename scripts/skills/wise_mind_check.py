"""Wise mind check (MF-04's check; DBT Mindfulness Handouts 3, 3a, Linehan 2015), as a skill on the runtime.

The editable source. The flow is PRD MF-04's *check* (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): costly
decisions get made in emotion mind (send, quit, leave, act on an urge) or in a cold reasonable mind that overrides
needs, and there's no place to decide *from*. Under a minute: the decision, which mind is steering, the stone settles,
ask, check the yes, then a look back tomorrow. Wise mind's practice (the hand-built page, docs/design/wise-mind.md)
stays as it is; this is the small check a host runs inline (R8) before a decision, and *Help me decide* on its own.
The design note is docs/design/wise-mind-check.md.

Steps:
  decision  *What are you deciding?* send a message · say something to someone · leave · quit something · buy or use
            something · something else (own words) · *Hurting myself* (→ `hurt`: the PRD's hard rule, a self-harm
            decision never reaches a wise mind check; the crisis banner and someone to talk to, no close). A host
            seeds it (`situationId`) and enters at `cues`.
  cues      *Which mind is steering right now? Tap any.* it has to happen now · the facts don't matter right now · my
            feelings don't count here · I'm sure and I'm hot · I'm calm and it still feels right · I can't tell. A
            carried flooded reading puts *Wise mind is hard to reach this loud.* in the title with *Body first, then
            ask.* and, on its own (not inside a host, whose draft would be lost), *My body first* as a link (PRD: DT
            first, never a lock).
  settle    the read stated plainly (*Sounds like emotion mind is driving. It isn't wrong. It decides fast.*), then
            the stone (`stoneSink`): tap to let it go, it sinks through clear water and rests on the sand.
  answer    *What came back?* a quiet yes · a quiet no · wait · nothing yet (*Nothing yet is an answer too.*)
  yes_check a quiet yes with emotion-mind cues, or a body running hot: *Is the yes calm, or urgent?* calm · urgent ·
            can't tell (PRD risk: emotion mind in disguise).
  wait_pick on its own, when the answer is to wait (wait, nothing yet, an urgent or unclear yes): *Then give it some
            time. How long?* a minute and a half (`holdRing`, timed) · twenty minutes (`waitLock`) · sleep on it · go
            ahead anyway (never a lock). After a wait, `after_wait` asks again. Inside a host, the host owns the wait.
  look      the answer said plainly, and *Look back on it tomorrow?* (optional) booking `wise_mind_lookback`.
  end       on its own: *Whatever you decide, you checked first.* Inside a host the run gives back here, its outcome
            `go` · `wait` · `no_go` (and `unsafe` for *Hurting myself*).
  lookback  reopened from the card (R9): what did you do in the end, and *Looking back, did that come from wise mind?*
            yes · sort of · no · can't tell; then, after yes or sort of, *What tells you it's wise mind?* quiet ·
            still · sure without rushing · own words (the person's own sign, PRD: internalise).

*Talk to someone now* (safety.open) is on every screen. Close kind: the tool's (`orienting`), never asked here: the
answer is the outcome (`noClose`). Every completed check logs a `wise_mind` rep (the PracticeSkill's `defaultFor`).
"""

ID = "wise_mind_check"
TOOL_ID = "wise-mind"
CONCEPT = "dbt_wise_mind"
VERSION = "wmc-v1"
OWN_MAX = 60

COPY = {
    "decision_title": "What are you deciding?",
    "decision_hint": "Wise mind is the part of you that knows what fits. It can take a minute to hear.",
    "decision_own": "Something else",
    "hurt_title": "Thank you for saying it.",
    "hurt_line": "That's not a decision to make alone. Someone to talk to comes first.",
    "cues_title": "Which mind is steering right now? Tap any.",
    "cues_hint": "There's no wrong answer. It's only to notice.",
    "flooded_title": "Wise mind is hard to reach this loud.",
    "flooded_hint": "Body first, then ask. Or ask anyway.",
    "body_first": "My body first",
    # The read, stated plainly (PRD step 2): never a verdict on the decision.
    "read_emotion": "Sounds like emotion mind is driving. It isn't wrong. It decides fast.",
    "read_reasonable": "Sounds like reasonable mind is driving. It's useful, and it can leave your feelings out.",
    "read_wise": "Sounds like it could be wise mind. Ask it and see.",
    "read_unsure": "Hard to tell which mind is driving. That's common.",
    "settle_hint": "Ask your question as the stone goes down. Notice what comes back.",
    "stone_line1": "Let the question go, like a stone into clear water.",
    "stone_line2": "It drifts down, past the busy surface.",
    "stone_line3": "It rests on the sand. Quiet down here.",
    "stone_start": "Let it go",
    "answer_title": "What came back?",
    "answer_hint": "Nothing yet is an answer too.",
    "yes_title": "Is the yes calm, or urgent?",
    "yes_hint": "Emotion mind can sound like a yes. A wise yes can wait a minute.",
    "wait_title": "Then give it some time. How long?",
    "wait_hint": "Waiting is never a lock. You can go ahead whenever you choose.",
    "hold_label": "Waiting",
    "hold_hint": "A minute and a half. Let the question sit.",
    "hold_done": "That's the wait.",
    "lock_waiting": "Phone down. The question will keep.",
    "lock_short": "Waiting",
    "lock_done": "Twenty minutes. That's the wait.",
    "lock_done_short": "Done",
    "after_title": "After the wait, what comes back now?",
    "after_hint": "It's fine if it's the same.",
    # The answer, said plainly; then the look-back (PRD: the internalisation step).
    "look_go": "A calm yes. That's yours to act on.",
    "look_no": "A quiet no. That's worth listening to.",
    "look_wait": "Then waiting is the wise answer for now.",
    "look_urgent": "An urgent yes is worth a wait.",
    "look_anyway": "You're going ahead. You checked first, and that counts.",
    "look_sleep": "Sleeping on it is a wise answer too.",
    "look_hint": "It's how you learn what your wise mind feels like.",
    "look_label": "Look back on it tomorrow?",
    "end_title": "Whatever you decide, you checked first.",
    "end_line": "Next time, the stone and one question are enough.",
    # Reopened from the wise_mind_lookback card.
    "lookback_title": "Yesterday you checked with wise mind about this: {decision}",
    "did_label": "What did you do in the end?",
    "came_label": "Looking back, did that come from wise mind?",
    "sign_title": "What tells you it's wise mind?",
    "sign_hint": "Your own sign. It's the check you can use without the app.",
    "sign_own": "My own word",
    "back_yes": "That's what your wise mind feels like. Worth remembering.",
    "back_sort_of": "Some of it was. That's how it gets clearer.",
    "back_no": "Now you know a bit more about how emotion mind sounds. That counts too.",
    "back_unsure": "Can't tell is fine. Wise mind gets easier to hear with practice.",
    "inline_back": "Back to the message",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


def has(field, v):
    return {"has": [a(field) + ".ids", v]}


def EQ(field, v):
    return {"eq": [a(field), v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
HOT_BAND = {"in": ["$ctx.band", ["stirred", "flooded"]]}
HOSTED = {"eq": ["$ctx.frame", "hosted"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

DECISIONS = [
    ("send", "Send a message"),
    ("say", "Say something to someone"),
    ("leave", "Leave"),
    ("quit", "Quit something"),
    ("buy_use", "Buy or use something"),
]
# Behavioural cues (PRD step 2), each with the mind it points to. The read is worked out from them, emotion mind first
# (any emotion-mind cue reads as emotion mind: it's the one that costs), then reasonable, then wise.
CUES = [
    ("now", "It has to happen now", "emotion"),
    ("facts", "The facts don't matter right now", "emotion"),
    ("feelings", "My feelings don't count here", "reasonable"),
    ("hot", "I'm sure, and I'm hot", "emotion"),
    ("calm", "I'm calm, and it still feels right", "wise"),
    ("unsure", "I can't tell", "unsure"),
]
ANSWERS = [("yes", "A quiet yes"), ("no", "A quiet no"), ("wait", "Wait"), ("nothing", "Nothing yet")]
YES = [("calm", "Calm"), ("urgent", "Urgent"), ("unsure", "I can't tell")]
WAITS = [("short", "A minute and a half"), ("long", "Twenty minutes"), ("sleep", "Sleep on it"),
         ("anyway", "Go ahead anyway")]
LOOK = [("tomorrow", "Tomorrow")]
DID = [("waited", "I waited"), ("went", "I went ahead"), ("undecided", "I didn't decide")]
CAME = [("yes", "Yes"), ("sort_of", "Sort of"), ("no", "No"), ("unsure", "I can't tell")]
SIGNS = [("quiet", "Quiet"), ("still", "Still"), ("unhurried", "Sure, without rushing")]

EMOTION = {"any": [has("cues", c) for c, _, m in CUES if m == "emotion"]}
REASONABLE = {"all": [{"not": EMOTION}, has("cues", "feelings")]}
# Calm and it still feels right reads as wise mind only when nothing else points away and the body isn't flooded.
WISE = {"all": [{"not": EMOTION}, {"not": has("cues", "feelings")}, has("cues", "calm"), {"not": FLOODED}]}
NEEDS_YES_CHECK = {"all": [EQ("answer", "yes"), {"any": [EMOTION, HOT_BAND]}]}

def final(v):
    """The final answer is `v`: the answer after a wait when there was one, else the first."""
    return {"any": [EQ("after", v), {"all": [{"not": {"set": a("after")}}, EQ("answer", v)]}]}


URGENT_YES = {"all": [{"not": {"set": a("after")}}, EQ("answer", "yes"), {"in": [a("yes_check"), ["urgent", "unsure"]]}]}
GO = {"any": [{"all": [final("yes"), {"not": URGENT_YES}]}, EQ("wait_pick", "anyway")]}
NO_GO = {"all": [final("no"), {"not": EQ("wait_pick", "anyway")}]}
WAIT = {"all": [{"not": GO}, {"not": NO_GO}]}
TO_WAIT = {"any": [EQ("answer", "wait"), EQ("answer", "nothing"), URGENT_YES]}
SLOT_DECISION = {"decision": {"labelOf": "decision"}}


def ask(step_id, title, hint, fields, nxt, *, lines=None, extra=None):
    s = {"id": step_id, "kind": "ask", "title": title, "fields": fields, "next": nxt, **(extra or {})}
    # One quiet *Talk to someone now* per screen, on its first field.
    s["fields"][0]["links"] = s["fields"][0].get("links", []) + [SAFETY_LINK]
    if hint:
        s["hint"] = hint
    if lines:
        s["lines"] = lines
    return s


def field(fid, lst, *, mx=1, required=True, own=None, label=None, links=None):
    f = {"id": fid, "options": {"list": lst}, "max": mx, "required": required}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    if label:
        f["label"] = label
    if links:
        f["links"] = links
    return f


def handoff(step_id, title, lines, offers, *, extra=None):
    s = {"id": step_id, "kind": "handoff", "complete": True, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK], "noClose": True, **(extra or {})}
    if title:
        s["title"] = title
    return s


STEPS = [
    {**ask("decision", "decision_title", "decision_hint", [field("decision", "decision", own="decision_own")],
           [{"when": EQ("decision", "hurt"), "to": "hurt"}, {"to": "cues"}]),
     "crisis": [{"variant": "crisis", "when": EQ("decision", "hurt")}]},
    handoff("hurt", "hurt_title", [{"when": ALWAYS, "key": "hurt_line"}], [{"exit": "safety_open", "when": ALWAYS}],
            extra={"complete": False, "links": [], "crisis": [{"variant": "crisis", "when": ALWAYS}]}),
    ask("cues", [{"when": FLOODED, "key": "flooded_title"}, {"when": ALWAYS, "key": "cues_title"}], "cues_hint",
        [field("cues", "cues", mx=len(CUES),
               links=[{"exit": "cool_down", "label": "body_first", "when": {"all": [FLOODED, {"not": HOSTED}]}}])],
        [{"to": "settle"}], lines=[{"when": FLOODED, "key": "flooded_hint"}]),
    {"id": "settle", "kind": "embed", "embed": "stoneSink", "answerAs": "settled",
     "title": [{"when": EMOTION, "key": "read_emotion"}, {"when": REASONABLE, "key": "read_reasonable"},
               {"when": WISE, "key": "read_wise"}, {"when": ALWAYS, "key": "read_unsure"}],
     "hint": "settle_hint",
     "props": {"line1": "stone_line1", "line2": "stone_line2", "line3": "stone_line3", "seconds": 20,
               "start": "stone_start", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "answer"}]},
    ask("answer", "answer_title", "answer_hint", [field("answer", "answer")],
        [{"when": NEEDS_YES_CHECK, "to": "yes_check"}, {"when": {"all": [{"not": HOSTED}, TO_WAIT]}, "to": "wait_pick"},
         {"to": "look"}]),
    ask("yes_check", "yes_title", "yes_hint", [field("yes_check", "yes_check")],
        [{"when": {"all": [{"not": HOSTED}, TO_WAIT]}, "to": "wait_pick"}, {"to": "look"}]),
    ask("wait_pick", "wait_title", "wait_hint", [field("wait_pick", "wait_pick")],
        [{"when": EQ("wait_pick", "short"), "to": "hold"}, {"when": EQ("wait_pick", "long"), "to": "lock"},
         {"to": "look"}]),
    {"id": "hold", "kind": "embed", "embed": "holdRing", "answerAs": "held",
     "props": {"variant": "timed", "seconds": 90, "label": "hold_label", "hint": "hold_hint", "doneLabel": "hold_done",
               "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "after_wait"}]},
    {"id": "lock", "kind": "embed", "embed": "waitLock", "answerAs": "locked",
     "props": {"minutes": 20, "waiting": "lock_waiting", "waitingShort": "lock_short", "done": "lock_done",
               "doneShort": "lock_done_short", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "after_wait"}]},
    ask("after_wait", "after_title", "after_hint", [field("after", "answer")], [{"to": "look"}]),
    ask("look", [{"when": EQ("wait_pick", "anyway"), "key": "look_anyway"},
                 {"when": EQ("wait_pick", "sleep"), "key": "look_sleep"},
                 {"when": URGENT_YES, "key": "look_urgent"},
                 {"when": GO, "key": "look_go"}, {"when": NO_GO, "key": "look_no"},
                 {"when": ALWAYS, "key": "look_wait"}],
        "look_hint", [field("look", "look", required=False, label="look_label")], [{"to": "end"}],
        extra={"followUp": {"type": "wise_mind_lookback", "whenFrom": "look"}}),
    handoff("end", "end_title", [{"when": ALWAYS, "key": "end_line"}], []),
    # Reopened from the wise_mind_lookback card (R9): a check that reached `look`.
    ask("lookback", "lookback_title", None,
        [field("did", "did", label="did_label"), field("came", "came", label="came_label")],
        [{"when": {"in": [a("came"), ["yes", "sort_of"]]}, "to": "sign"}, {"to": "back_end"}],
        extra={"reopens": {"after": "look"}, "clears": ["did", "came", "sign"], "titleSlots": SLOT_DECISION}),
    ask("sign", "sign_title", "sign_hint", [field("sign", "sign", mx=2, required=False, own="sign_own")],
        [{"to": "back_end"}]),
    handoff("back_end", None, [{"when": EQ("came", "yes"), "key": "back_yes"},
                               {"when": EQ("came", "sort_of"), "key": "back_sort_of"},
                               {"when": EQ("came", "no"), "key": "back_no"},
                               {"when": ALWAYS, "key": "back_unsure"}], []),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},              # DT-01 First, the body (a carried flooded reading)
    {"id": "safety_open", "toolId": None, "safety": True},   # safety.open (R6): on every screen
    {"id": "done", "done": True},
]


def options():
    out = [("decision", v, label, {}, "DecisionType") for v, label in DECISIONS]
    # PRD hard rule: a self-harm decision never reaches a wise mind check.
    out += [("decision", "hurt", "Hurting myself", {"danger": "self"}, None)]
    out += [("cues", v, label, {"mind": m}, "MindCue") for v, label, m in CUES]
    out += [("answer", v, label, {}, None) for v, label in ANSWERS]
    out += [("yes_check", v, label, {}, None) for v, label in YES]
    out += [("wait_pick", v, label, {}, None) for v, label in WAITS]
    out += [("look", v, label, {}, None) for v, label in LOOK]
    out += [("did", v, label, {}, None) for v, label in DID]
    out += [("came", v, label, {}, None) for v, label in CAME]
    out += [("sign", v, label, {}, None) for v, label in SIGNS]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "decision", "ownMax": OWN_MAX,
    # band: a carried flooded reading (C6.2); situationId: the host's decision (One message: `send`), seeding
    # `decision`; frame `hosted`: inside a host, which owns the wait and the draft.
    "accepts": ["band", "situationId", "frame"],
    "copy": COPY, "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
    # R8: hosts run it inline from `cues`, the decision seeded. It gives back at `end` (or `hurt`, stopped) with the
    # answer that stands: go · wait · no_go, and unsafe for *Hurting myself*.
    "inline": {
        "enterAt": ["cues"],
        "returns": [],
        "seed": {"decision": "$ctx.situationId"},
        "enterWhen": {"cues": {"set": a("decision")}},
        "outcomes": ["go", "wait", "no_go"],
        "ends": {"hurt": "stopped"},
        "flags": [{"id": "unsafe", "when": EQ("decision", "hurt")},
                  {"id": "go", "when": {"all": [{"set": a("answer")}, GO]}},
                  {"id": "wait", "when": {"all": [{"set": a("answer")}, WAIT]}},
                  {"id": "no_go", "when": {"all": [{"set": a("answer")}, NO_GO]}}],
    },
}
