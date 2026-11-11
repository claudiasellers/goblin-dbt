"""Pros & cons card (DT-10; DBT DT Handout 5, Linehan 2015) as a skill on the runtime.

The editable source. The flow is PRD DT-10 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): built while steady, for one pull that keeps coming back. The person's own
reasons not to come first (Miller & Rose 2015: a neutral pros-and-cons list lowers commitment in people who are
torn, so the card leans on the reasons to hold off); what acting gives is acknowledged, not argued ("It works fast.
That's why it pulls"); then what holding off costs and gives, which way they lean, and the card itself: two
reasons in their words and one acknowledged pro, readable in 20 seconds. Kept in Me (`pros_cons`), it plays inside
Hold to wait when the same pull comes up (`prosConsReplay`, on the proceed step). docs/design/pros-cons.md lists
what this batch defers and where it departs from the PRD.

Safety (plan C6):
- **Hurt myself goes to safety.open first** (C6.5, as in Hold to wait): the resources open over the next screen
  before anything else (`safetyFirst`), then one plain question; not sure or no ends on someone to talk to. The
  crisis banner stays on every screen after. What acting on it gives is never listed for hurt myself (C6.7: no
  enumerated pros for self-harm): the step says one plain line and asks nothing. Leaning towards doing it ends on
  someone to talk to, too.
- **Built in calm.** A carried flooded reading gets a heads-up and a choice (settle first, or make it now); nothing
  locks, and *This is too much right now* sits under every screen (the player). No band is asked (C6.2).
- No chip is food, drink, shopping or scrolling as a reason or a comfort; no amounts; nothing promises it gets
  easier or "makes you stronger" (C6.7).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "pros_cons"
TOOL_ID = "pros-cons"
CONCEPT = "dbt_pros_cons"
VERSION = "pc-v1"
OWN_MAX = 90  # one line each: a reason, a pull

COPY = {
    "pull_title": "Which pull is this card for?",
    "pull_hint": "Pick the one that keeps coming back.",
    "pull_own": "Say it your way",
    # Hurt myself (C6.5): after the resources, the same plain question as Hold to wait (CORE-01 owns the wording).
    "safe_title": "Thank you for saying it. Right now, are you safe from acting on it?",
    "safe_hint": "You can answer honestly. Whatever you say, the support stays on the screen.",
    # A carried flooded reading: a heads-up, never a lock (PRD: built in calm).
    "heads_up_title": "Your body's loud right now. This card is easier to make when things are calmer.",
    "heads_up_hint": "You can settle first and come back, or make it now.",
    "settle_line": "Settle first. The card can wait until you're steadier.",
    # Own reasons first (Miller & Rose 2015).
    "long_title": "Thinking further ahead, what are your reasons not to?",
    # Leave can be how someone gets safe (Gate 3): the card says so before it asks.
    "long_title_leave": "Getting away to be safe isn't what this card is for. Otherwise, what are your reasons not to?",
    "long_hint": "Pick what's true for you. Your own words count most.",
    "long_own": "A reason in your words",
    # What acting gives, acknowledged. Hurt myself: one plain line, nothing listed (C6.7).
    "gives_title": "And what does doing it give you, in the moment?",
    "gives_title_hurt": "It does something for you in the moment. That's real, and it's why the pull is strong.",
    "gives_label": "It works fast. That's why it pulls.",
    "gives_own": "Say it your way",
    "cost_title": "What does holding off cost you?",
    "cost_hint": "Holding off is hard. Naming what it costs is part of it.",
    "cost_own": "Say it your way",
    "keeps_title": "And what does holding off give you?",
    "keeps_hint": "Pick what you'd want to hear in a hard moment.",
    "keeps_own": "Say it your way",
    "lean_title": "Reading it back, which way do you lean?",
    "lean_hint": "Any answer is fine. It's yours.",
    # The card (prosConsCard): read it through once.
    "card_title": "Your card. Read it through once.",
    "card_reasons": "My reasons not to",
    "card_pro": "And yes, it pulls because",
    "card_fallback": "It does something for me in the moment.",
    "card_next": "Next",
    # Keep (R4): the chip is the yes (C2.2).
    "keep_title": "Keep this card in Me? Hold to wait will show it next time this pull comes up.",
    "keep_title_own": "Keep this card in Me, for when you need it?",
    "keep_primary": "Next",
    # The end card.
    "end_kept": "It's in Me. Hold to wait will show it when this pull comes up.",
    "end_kept_own": "It's in Me, for when you need it.",
    "end_act": "That's honest. Your reasons are written down now, for a harder moment.",
    "end_unsure": "Not sure is a fair place to be. Your reasons are here when you want them.",
    "end_line": "You thought it through. That counts.",
    "reach_line": "Please reach out to someone now, using the support on this screen. You don't have to hold this alone.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
HURT = {"eq": [a("pull"), "hurt"]}
UNSAFE = {"in": [a("safe"), ["unsure", "no"]]}
LEAN_ACT = {"eq": [a("lean"), "act"]}
KEPT = {"eq": [a("keepit"), "keep"]}
OWN_PULL = {"not": {"in": [a("pull"), ["send", "check", "hurt", "hit", "leave", "use"]]}}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
# The crisis banner on every screen once hurt myself is picked (as in Hold to wait); plan C6.4.
CRISIS = [{"variant": "crisis", "when": {"any": [HURT, UNSAFE]}}]

# Hold to wait's pulls, same ids and urges, so a kept card matches the pull picked there (prosConsReplay).
PULLS = [
    ("send", "Send or say something", {"urge": "send"}),
    ("check", "Check their page, or my phone", {"urge": "check"}),
    ("hurt", "Hurt myself", {"urge": "self_harm", "danger": "self"}),
    ("hit", "Hit, throw or slam", {"urge": "hit"}),
    ("leave", "Leave, run or disappear", {"urge": "leave"}),
    ("use", "Use, drink, binge or buy", {"urge": "use"}),
]
SAFE = [
    ("safe", "Yes, I'm safe for now", {}),
    ("unsure", "I'm not sure", {"danger": "self"}),
    ("no", "No", {"danger": "self"}),
]
HEADS_UP = [
    ("settle", "Settle first"),
    ("now", "Make it now"),
]
URGES = ["send", "check", "hurt", "hit", "leave", "use"]
# Reasons not to, further ahead (ProsConsItem, cell `long`), per pull; `other` for own words. First person, plain.
LONG = [
    ("unsend", "I can't take it back once it's sent", ["send"]),
    ("steadier", "I want to say it when I'm steadier", ["send"]),
    ("relationship", "It could cost me the relationship", ["send", "hit"]),  # not leave: leaving can be how someone gets safe
    ("worse_after", "I end up feeling worse after", ["check", "use", "hurt"]),
    ("keeps_hurt", "It keeps the hurt going", ["check"]),
    ("time", "It eats my time", ["check"]),
    ("someone_hurt", "Someone could get hurt", ["hit"]),
    ("trouble", "It could get me into real trouble", ["hit", "use"]),
    ("comes_with", "The problem comes with me", ["leave"]),
    ("explain", "I'd have to explain it after", ["leave"]),
    ("health", "My health", ["use"]),
    ("progress", "I've worked hard to get where I am", ["use", "hurt"]),
    ("made_it", "I've got through this before without it", ["hurt"]),
    ("stay_well", "There are people I want to stay well for", ["hurt"]),
    ("kinder", "I want to be kinder to myself", ["hurt"]),
    ("regret", "I'd regret it later", ["send", "hit", "leave", "other"]),
    ("doesnt_fix", "It doesn't fix what's wrong", ["check", "hit", "leave", "other"]),
    ("costs", "It would cost me something I care about", ["use", "other"]),
    ("trust_me", "I want to trust myself", ["other"]),
]
# What acting gives, acknowledged (cell `gives`). Never for hurt myself (C6.7: no enumerated pros for self-harm).
GIVES = [
    ("heard", "Being heard, right now", ["send"]),
    ("off_chest", "Getting it off my chest", ["send"]),
    ("knowing", "Knowing", ["check"]),
    ("close", "Feeling close to them", ["check"]),
    ("let_out", "Letting it out", ["hit"]),
    ("strong", "Feeling strong", ["hit"]),
    ("away", "Getting away from it", ["leave"]),
    ("not_face", "Not having to face it", ["leave"]),
    ("break", "A break from feeling this", ["use"]),
    ("relief", "Relief, fast", ["send", "check", "hit", "leave", "use"]),
]
# Own words have no chips here: a typed pull could be self-harm or an eating-disorder behaviour, so its pros are
# never listed for it (C6.7). The person can say it their way; the card falls back to the plain line.
EVERY = ["send", "check", "hurt", "hit", "leave", "use", "other"]
# What holding off costs (cell `cost`), per pull.
COST = [
    ("longer", "Feeling it for longer", EVERY),
    ("no_relief", "No relief right now", EVERY),
    ("not_knowing", "Not knowing, for now", ["send", "check"]),
    ("effort", "It takes effort", EVERY),
]
# What holding off gives (cell `keeps`), per pull. Never *people's trust* for hurt myself: it frames self-harm as
# betraying others (S7).
KEEPS = [
    ("no_regret", "No regret in the morning", EVERY),
    ("my_word", "Keeping my word to myself", EVERY),
    ("get_through", "Knowing I can get through it", EVERY),
    ("my_choice", "Choosing what I do next", EVERY),
    ("trust", "Keeping people's trust", ["send", "check", "hit", "leave", "use", "other"]),
]
LEAN = [
    ("hold", "Holding off"),
    ("act", "Doing it"),
    ("unsure", "Not sure yet"),
]
KEEPIT = [
    ("keep", "Keep it in Me"),
    ("not_now", "Not this time"),
]
# A per-pull chip shows for the pull picked; with own words (no pull chip), the `other` ones.
PER_PULL = {"any": [
    *[{"all": [{"eq": [a("pull"), u]}, {"eq": [f"$opt.{u}", True]}]} for u in URGES],
    {"all": [OWN_PULL, {"eq": ["$opt.other", True]}]},
]}

STEPS = [
    {
        "id": "pull", "kind": "ask", "title": "pull_title", "hint": "pull_hint", "crisis": CRISIS,
        "fields": [{"id": "pull", "options": {"list": "pull"}, "max": 1, "required": True,
                    "own": {"hint": "pull_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"when": HURT, "to": "safe"}, {"when": FLOODED, "to": "heads_up"}, {"to": "long"}],
    },
    {
        # Hurt myself (C6.5): the resources open over this screen as it arrives, before anything else.
        "id": "safe", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "crisis": CRISIS,
        "safetyFirst": ALWAYS,
        "fields": [{"id": "safe", "options": {"list": "safe"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": UNSAFE, "to": "reach"}, {"when": FLOODED, "to": "heads_up"}, {"to": "long"}],
    },
    {
        # A carried flooded reading (C6.2): a heads-up and a choice. Making it now goes on as usual.
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint", "crisis": CRISIS,
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True,
                    "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, {"to": "long"}],
    },
    {
        "id": "long", "kind": "ask", "title": [{"when": {"eq": [a("pull"), "leave"]}, "key": "long_title_leave"}, {"key": "long_title"}], "hint": "long_hint", "crisis": CRISIS,
        "fields": [{"id": "long", "options": {"list": "long", "where": PER_PULL}, "max": 3, "required": True,
                    "own": {"hint": "long_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "gives"}],
    },
    {
        # Acknowledged, not argued. Hurt myself: the plain line and nothing to pick (C6.7).
        "id": "gives", "kind": "ask", "crisis": CRISIS,
        "title": [{"when": HURT, "key": "gives_title_hurt"}, {"key": "gives_title"}],
        "fields": [{"id": "gives", "label": "gives_label", "options": {"list": "gives", "where": PER_PULL}, "max": 2, "showWhen": {"not": HURT},
                    "own": {"hint": "gives_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "cost"}],
    },
    {
        "id": "cost", "kind": "ask", "title": "cost_title", "hint": "cost_hint", "crisis": CRISIS,
        "fields": [{"id": "cost", "options": {"list": "cost", "where": PER_PULL}, "max": 2,
                    "own": {"hint": "cost_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "keeps"}],
    },
    {
        "id": "keeps", "kind": "ask", "title": "keeps_title", "hint": "keeps_hint", "crisis": CRISIS,
        "fields": [{"id": "keeps", "options": {"list": "keeps", "where": PER_PULL}, "max": 2,
                    "own": {"hint": "keeps_own", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "lean"}],
    },
    {
        "id": "lean", "kind": "ask", "title": "lean_title", "hint": "lean_hint", "crisis": CRISIS,
        "fields": [{"id": "lean", "options": {"list": "lean"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        # Hurt myself and leaning towards doing it: someone to talk to, now, not a card.
        "next": [{"when": {"all": [HURT, LEAN_ACT]}, "to": "reach"}, {"to": "card"}],
    },
    {
        "id": "card", "kind": "embed", "embed": "prosConsCard", "answerAs": "card", "title": "card_title",
        "crisis": CRISIS, "links": [SAFETY_LINK],
        "props": {"reasonsField": "long", "moreField": "keeps", "proField": "gives", "reasonsLabel": "card_reasons",
                  "proLabel": "card_pro", "fallback": "card_fallback", "next": "card_next"},
        "next": [{"to": "keep"}],
    },
    {
        # Keep (R4) on *Keep it in Me*: that tap is the yes (C2.2).
        "id": "keep", "kind": "ask", "crisis": CRISIS,
        "title": [{"when": OWN_PULL, "key": "keep_title_own"}, {"key": "keep_title"}],
        "fields": [{"id": "keepit", "options": {"list": "keepit"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "keep": {"kind": "pros_cons", "many": True, "from": ["pull", "long", "gives", "cost", "keeps"], "when": KEPT},
        "primary": "keep_primary",
        "next": [{"to": "end"}],
    },
    {
        "id": "end", "kind": "handoff", "complete": True, "crisis": CRISIS,
        "lines": [
            # First match wins: a kept card says where it is, whatever the lean.
            {"when": {"all": [KEPT, OWN_PULL]}, "key": "end_kept_own"},
            {"when": KEPT, "key": "end_kept"},
            {"when": LEAN_ACT, "key": "end_act"},
            {"when": {"eq": [a("lean"), "unsure"]}, "key": "end_unsure"},
            {"when": ALWAYS, "key": "end_line"},
        ],
        # Torn, or leaning towards it: wise mind is the next look (MF-04). Nothing else competes with Done.
        "offers": [{"exit": "wise_mind", "when": {"in": [a("lean"), ["act", "unsure"]]}}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        "id": "settle", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "settle_line"}],
        "offers": [{"exit": "pause", "when": {"not": HURT}}, {"exit": "cool_down", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # Not safe, not sure, or leaning towards hurting themselves: someone to talk to first (S9), no card.
        "id": "reach", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "lines": [{"when": ALWAYS, "key": "reach_line"}],
        "offers": [{"exit": "crisis_kit", "when": ALWAYS}],
        "done": "done",
    },
]

EXITS = [
    {"id": "wise_mind", "toolId": "wise-mind"},                          # MF-04: torn, or leaning towards it
    {"id": "pause", "toolId": "pause"},                                  # DT-02 Hold to wait (flooded, settle first)
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body
    {"id": "crisis_kit", "toolId": "crisis-kit", "planned": True},       # DT-03 My crisis kit (safety batch)
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("pull", v, label, props, None) for v, label, props in PULLS]
    out += [("safe", v, label, props, None) for v, label, props in SAFE]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    urge_of = {v: props["urge"] for v, _, props in PULLS}
    for lst, rows in (("long", LONG), ("gives", GIVES), ("cost", COST), ("keeps", KEEPS)):
        out += [(lst, v, label, {**{u: True for u in pulls}, "forUrges": [urge_of[u] for u in pulls if u in urge_of],
                                 "cell": lst}, "ProsConsItem")
                for v, label, pulls in rows]
    out += [("lean", v, label, {}, None) for v, label in LEAN]
    out += [("keepit", v, label, {}, None) for v, label in KEEPIT]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "pull", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2). A host's pull (`urgeId`) waits for the first host (the kit).
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
