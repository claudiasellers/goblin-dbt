"""Know this feeling (ER-10, part 1; DBT ER Handouts 3-6: what emotions do, the model of emotions, ways to
describe them). Spec: docs/design/emotion-guide.md. Content: scripts/emotion-guide/content.py (the FeelingGuide
nodes), read through the runtime's shared feelingOf / feelingGuideOf tables.

Steps:
  feel      *Which feeling do you want to know better?* one word: a chip per family (carried words first) or any
            word from the full list. A word with no guide (calm, surprised, tired, numb...) → `none`.
  heads_up  a carried flooded reading: *Your body's loud right now.* The body first or *Show me anyway*.
  card      the `feelingCard` embed: the word's family, what it's for, what often sets it off, where it often shows up
            (its body map's signed-off places), the pull it can bring (the parent's emotion urges; a pull isn't
            something to do). Recognition, never criteria.
  ladder    *Which of these is closest?* the family's ladder, milder to stronger (one tap trains differentiation;
            none is an answer too). Skipped for a family with one word (jealousy, envy).
  end       a closer word can take some of the edge off; then, by family: Check the Facts (does it fit what
            happened?) and Do the Opposite (the nine DBT parents), Good things (happiness: stay with it).
  none      no card for this word yet: Find the feeling.

No close question (close kind `none`: knowing a feeling isn't a state change to rate), no keep, no follow-up.
Words: `feel` and `closest` are the visit's emotions (`emotionFields`).

Departures from the PRD (docs/design/emotion-guide.md): part 1 is the card and the ladder only. Walk the wave
(`episodeStrip`), words everywhere (FOUND_WORD from more hosts, own words first) and the myth cards are parts 2-4.
The card is a tool of its own for now, opened from the Tools list and from a link carrying the word; hosts showing it
after naming come with part 3.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "emotion_guide"
TOOL_ID = "emotion-guide"
CONCEPT = "dbt_model_of_emotions"
VERSION = "eg-v1"
OWN_MAX = 60

COPY = {
    "feel_title": "Which feeling do you want to know better?",
    "feel_hint": "Pick the word that's closest. It doesn't have to be exact.",
    "feel_more": "More words",
    # A carried flooded reading: a heads-up, never a lock (as Build mastery).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "Getting to know a feeling works better once it settles a little.",
    "settle_line": "This will keep. First, the body.",
    "card_title": "Feeling {feeling}",
    "family_line": "Part of the {family} family.",
    "for_label": "What it's for",
    "prompts_label": "What often sets it off",
    "body_label": "Where it often shows up",
    "urges_label": "The pull it can bring",
    "urge_note": "A pull comes with the feeling. You don't have to act on it.",
    "ladder_title": "You picked {feeling}. Is one of these closer?",
    "ladder_hint": "They go from milder to stronger. Your word is fine too, and so is none.",
    "end_title": "You know this feeling a little better now.",
    "end_title_picked": "You named it: {closest}.",
    "end_line": "Putting a closer word to a feeling can take some of the edge off.",
    "end_known": "Knowing what a feeling is for can make it easier to be with.",
    # A safety-screen word (scripts/safety/content.py SCREEN_EMOTIONS) named here: say it, never gate it (gate 3).
    "end_heavy": "Heavy feelings can come with thoughts of not being here. If they do, talk to someone now.",
    "end_fits": "Check the Facts looks at whether it fits. Do the Opposite helps when acting on it won't.",
    "end_happy": "Good things can help you stay with it a little longer.",
    "none_title": "There's no card for “{feeling}” yet.",
    "none_line": "Find the feeling can help put more words to it.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

# One chip per family (the family's most common word), the full list a tap away. Envy has no word on the square.
FEEL_CHIPS = ["scared", "angry", "sad", "ashamed", "guilty", "disgusted", "jealous", "loving", "happy"]
HEADS_UP = [("settle", "Settle my body first"), ("try", "Show me anyway")]

HAS_GUIDE = {"set": "$d.guide"}
HAPPY = {"eq": ["$d.guide", "happiness"]}
PICKED = {"set": "$a.closest"}
# The safety screen's words (scripts/safety/content.py SCREEN_EMOTIONS) that can reach a card.
HEAVY_WORDS = ["worthless", "empty", "despair", "helpless", "powerless"]
HEAVY = {"any": [{"in": [a("feel"), HEAVY_WORDS]}, {"in": [a("closest"), HEAVY_WORDS]}]}
# A DBT parent with fit statements: Check the Facts and Do the Opposite apply (never happiness).
FITS = {"set": "$d.fitsParent"}

DERIVE = [
    {"name": "guide", "from": a("feel"), "table": "feelingGuideOf"},
    {"name": "ladder", "from": "$d.guide", "table": "feelingOf", "field": "ladder"},
    {"name": "parent", "from": a("feel"), "table": "parentOf"},
    {"name": "fitsParent", "from": "$d.parent", "table": "fitsWhen", "keep": "key"},
]


# A hand-off shows one line, the first that holds (`handoffLine`), so the end card's parts are composed into one key
# per case (Codex, #123): the heavy line first when it applies, then the closer-word or knowing line, then what
# Check the Facts and Do the Opposite are for.
END_LINES = []
for heavy in (True, False):
    for picked in (True, False):
        for fits in (True, False):
            key = f"end_{'h' if heavy else ''}{'p' if picked else 'k'}{'f' if fits else ''}"
            COPY[key] = " ".join(COPY[k] for k in (["end_heavy"] if heavy else []) + ["end_line" if picked else "end_known"]
                                 + (["end_fits"] if fits else []))
            END_LINES.append({"key": key, "when": {"all": [HEAVY if heavy else {"not": HEAVY}, PICKED if picked else {"not": PICKED},
                                                         FITS if fits else {"not": FITS}, {"not": HAPPY}]}})


def handoff(sid, title, lines, offers, *, no_close=True, **extra):
    s = {"id": sid, "kind": "handoff", "complete": True, "title": title, "lines": lines, "offers": offers,
         "done": "done", "next": [], "links": [SAFETY_LINK], **extra}
    if no_close:
        s["noClose"] = True
    return s


STEPS = [
    {
        "id": "feel", "kind": "ask", "title": "feel_title", "hint": "feel_hint",
        "fields": [{"id": "feel", "options": {"emotions": FEEL_CHIPS, "carriedFirst": True, "moreKey": "feel_more"},
                    "max": 1, "required": True, "emotion": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"not": HAS_GUIDE}, "to": "none"}, {"when": FLOODED, "to": "heads_up"}, {"to": "card"}],
    },
    {
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint",
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, {"to": "card"}],
    },
    handoff("settle", "heads_up_title", [{"when": ALWAYS, "key": "settle_line"}], [{"exit": "cool_down", "when": ALWAYS}]),
    {
        "id": "card", "kind": "embed", "embed": "feelingCard", "title": "card_title",
        "titleSlots": {"feeling": {"labelOf": "feel"}}, "answerAs": "card", "links": [SAFETY_LINK],
        "props": {"guide": "$d.guide", "familyLine": "family_line", "forLabel": "for_label", "promptsLabel": "prompts_label",
                  "bodyLabel": "body_label", "urgesLabel": "urges_label", "urgeNote": "urge_note", "next": "next"},
        "next": [{"when": {"set": "$d.ladder"}, "to": "ladder"}, {"to": "end"}],
    },
    {
        "id": "ladder", "kind": "ask", "title": "ladder_title", "hint": "ladder_hint",
        "titleSlots": {"feeling": {"labelOf": "feel"}},
        "fields": [{"id": "closest", "options": {"emotions": FEEL_CHIPS, "emotionsFrom": "$d.ladder"}, "max": 1,
                    "required": False, "emotion": True, "links": [SAFETY_LINK]}],
        "next": [{"to": "end"}],
    },
    handoff("end", [{"when": {"set": a("closest")}, "key": "end_title_picked"}, {"key": "end_title"}],
            END_LINES + [{"when": HAPPY, "key": "end_happy"}],
            # The closer word goes on when one was picked, else the word they came with (Codex, #120).
            [{"exit": "check_the_facts_closest", "when": {"all": [FITS, PICKED]}},
             {"exit": "check_the_facts", "when": {"all": [FITS, {"not": PICKED}]}},
             {"exit": "opposite_action_closest", "when": {"all": [FITS, PICKED]}},
             {"exit": "opposite_action", "when": {"all": [FITS, {"not": PICKED}]}},
             {"exit": "good_things", "when": HAPPY}],
            titleSlots={"closest": {"labelOf": "closest"}}),
    handoff("none", "none_title", [{"when": ALWAYS, "key": "none_line"}], [{"exit": "find_the_feeling", "when": ALWAYS}],
            titleSlots={"feeling": {"labelOf": "feel"}}),
]

EXITS = [
    {"id": "check_the_facts", "toolId": "check-the-facts", "carry": ["feel"]},   # ER-02: does it fit what happened?
    {"id": "opposite_action", "toolId": "opposite-action", "carry": ["feel"]},   # ER-03: the doors pre-tick the word
    {"id": "check_the_facts_closest", "toolId": "check-the-facts", "carry": ["closest"]},  # the ladder's closer word
    {"id": "opposite_action_closest", "toolId": "opposite-action", "carry": ["closest"]},
    {"id": "good_things", "toolId": "good-things", "query": {"frame": "savour"}},  # ER-04: stay with a good moment
    {"id": "find_the_feeling", "toolId": "find-the-feeling", "carry": ["feel"]},  # more words for it
    {"id": "cool_down", "toolId": "cool-down"},                                  # DT-01 First, the body (flooded)
    {"id": "safety_open", "toolId": None, "safety": True},                       # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    return [("heads_up", v, label, {}, None) for v, label in HEADS_UP]


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "feel", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": DERIVE, "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel", "closest"],
}
