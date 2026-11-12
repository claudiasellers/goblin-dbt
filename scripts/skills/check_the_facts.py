"""Check the Facts (DBT ER Handout 8) as a skill on the runtime (docs/design/skill-runtime.md).

The editable source. Copy is from docs/design/check-the-facts.md (its *Decisions for the build* win);
`fitsTheFactsWhen` and each grid word's DBT parent are NOT here: the graph already has them
(EmotionRegulationContent, HAS_REGULATION_CONTENT) and the player reads them from the shared tables.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py
"""

ID = "check_the_facts"
TOOL_ID = "check-the-facts"
CONCEPT = "dbt_check_facts"
VERSION = "cf-v1-2"
OWN_MAX = 140

# --- Copy (CheckFactsFlow in the spec; every screen key, plus the decisions' additions) ---
COPY = {
    "feel_title": "What's the feeling you want to check?",
    "feel_more": "Something else",
    "event_title": "What happened, as a camera would have caught it?",
    "event_own_hint": "Only what happened, no why.",
    "story_title": "What's the story you're telling yourself about it?",
    "story_hint": "Pick one or two.",
    "alt_title": "What else could explain it?",
    "alt_note": "You don't have to believe them. Notice that they're possible.",
    "threat_title": "What are you afraid will happen?",
    "likely_q": "How likely is it, really?",
    "through_q": "If it did happen, could you get through it?",
    "through_cope_ahead": "Plan for it with Cope Ahead",
    "fits_title": "Here's when feeling {feeling} fits the facts. Does one of these match what happened?",
    "fits_title_general": "Does feeling {feeling} fit what happened?",
    "next_fits": "When a feeling fits, the move is to work on the situation.",
    "next_partly": "The feeling makes sense, and it's turned up loud. Bring the volume down, then work on what's left.",
    "next_no": "The feeling is bigger than the facts. Acting opposite to its urge helps it settle.",
    "next_unsure": "That's all right. Sometimes the facts come later.",
    "own_hint": "Say it your way",
    "not_sure": "Not sure",
    "next": "Next",
    "done": "Done",
    "entry_oa": "Go through it slowly with Check the Facts",
    # v1.1 (PRD ER-02 safety rules): a camera chip that is danger from a person skips the story, other readings
    # and threat screens. Nothing here asks the person to weigh their read of danger.
    "safety_open": "Talk to someone now",
    "safe_line": "Your read of danger is the one that counts here. You don't have to check it against anything.",
    # v1.2 (PRD ER-02 verdict table, *still don't know*): one missing fact, and an optional check-in about it.
    "missing_title": "What's one thing you could find out?",
    "missing_hint": "Not knowing is an answer. The move is one fact, not a decision.",
    "when_q": "Want me to ask later if you found out?",
}

# --- Screen 1: the curated grid words (decision 1), in order ---
FEEL_CHIPS = ["anxious", "worried", "annoyed", "angry", "hurt", "guilty", "ashamed", "embarrassed"]

# --- Story sets (decision 2): DBT parent → the set its stories come from; anything else is `general` ---
STORY_SET_OF = {"fear": "fear", "anger": "anger", "sadness": "sadness", "shame": "shame", "guilt": "guilt"}
THREAT_SETS = ["fear", "anger", "shame"]

# --- Screen 2: event kinds (FactsEventKind) ---
EVENT_KINDS = [
    ("said", "Someone said something"),
    ("didnt", "Someone didn't do something"),
    ("saw", "Something I saw or read"),
    ("thought", "A thought or a memory"),
    ("threatened", "Someone threatened me"),
    ("hurt_me", "Someone hurt me"),
    ("unsafe", "I'm not safe with them"),
    ("cant_name", "I can't name it"),
]
# v1.1 safety chips (PRD ER-02 "Safety rules"): danger from another person. Each opens the `other_person` crisis
# slot (911, the National Domestic Violence Hotline, 988 last) and skips screens 3-5.
DANGER_EVENTS = ["threatened", "hurt_me", "unsafe"]

# --- Screens 3-4: stories (Interpretation) and other ways to see them (Alternative) ---
# (set, id, story, predicts, [alternatives]). predicts per decision 5.
STORIES = [
    ("fear", "fear_bad_coming", "Something bad is about to happen", True,
     ["Nothing bad has happened yet", "It could go several ways", "I'd see it coming and could act"]),
    ("fear", "fear_wont_cope", "I won't be able to handle it", True,
     ["I've handled hard things before", "I'd have help", "I won't know until I'm there"]),
    ("fear", "fear_theyll_leave", "They're going to leave me", True,
     ["They're busy, not leaving", "One moment isn't the whole relationship", "I could ask them"]),
    ("fear", "fear_theyll_see", "Everyone will see I'm not good enough", True,
     ["Most people are thinking about themselves", "One mistake isn't who I am", "Someone might not notice at all"]),
    ("anger", "anger_on_purpose", "They did it on purpose", False,
     ["They were distracted or stressed", "They didn't know it mattered to me", "I don't know why yet"]),
    ("anger", "anger_no_respect", "They don't respect me", False,
     ["They were thinking about something else", "They show respect in other ways", "I could ask what they meant"]),
    ("anger", "anger_always", "This always happens", True,
     ["It's happened before, not every time", "This time has its own details", "Something can change"]),
    ("anger", "anger_unfair", "It isn't fair", False,
     ["It might be unfair, and I can act on that", "There's something I don't know", "Both can be true"]),
    ("sadness", "sad_gone", "It's gone for good", False,
     ["Some of it might come back", "What it meant to me stays", "I don't know yet"]),
    ("sadness", "sad_nobody_cares", "Nobody cares about me", False,
     ["Some people do, even if not right now", "They may not know how I feel", "I could reach out to one person"]),
    ("sadness", "sad_never_better", "It'll never get better", True,
     ["Feelings move, even slowly", "It has changed before", "I don't know what's ahead"]),
    ("shame", "shame_wrong_with_me", "There's something wrong with me", False,
     ["I did something; I'm not something", "I'd be kinder to a friend than this", "Most people feel this sometimes"]),
    ("shame", "shame_think_less", "They think less of me now", False,
     ["I don't know what they think", "One moment doesn't define me to them", "They might not have noticed"]),
    ("shame", "shame_if_they_knew", "If they knew, they'd turn away", True,
     ["Some people would understand", "I could share a small part", "I'm worth something without hiding"]),
    ("guilt", "guilt_hurt_them", "I hurt someone", False,
     ["I might have, and I can repair it", "They may see it differently", "I could ask them"]),
    ("guilt", "guilt_not_enough", "I didn't do enough", False,
     ["I did what I could with what I knew", "There may still be something I can do", "It wasn't all on me"]),
    ("guilt", "guilt_bad_person", "I'm a bad person", False,
     ["I did something I regret; I'm not all bad", "Regret means I care", "I can make it right"]),
    ("general", "gen_my_fault", "It's my fault", False,
     ["Other things played a part", "I can own my part, not all of it", "I don't know the whole picture"]),
    ("general", "gen_go_wrong", "It's going to go wrong", True,
     ["It might go fine", "I can't know yet", "I'd cope if it did"]),
    ("general", "gen_against_me", "They're against me", True,
     ["They might be against the situation, not me", "They might be dealing with their own thing", "I could check"]),
]

# Decision 4: a story in the person's own words gets these three.
OWN_STORY_ALTERNATIVES = [
    ("own_alt_unknown", "There's something I don't know yet"),
    ("own_alt_other_view", "Someone else might see it differently"),
    ("own_alt_meaning", "It might not mean what it feels like it means"),
]

# --- Screen 5: threats (ThreatChip). `all`: offered for every parent, and always last ---
ALL_PARENTS = ["fear", "anger", "disgust", "envy", "jealousy", "love", "sadness", "shame", "guilt"]
THREATS = [
    ("hurt", "Being hurt", ["fear", "anger"]),
    ("left", "Being left", ["fear", "sadness", "jealousy"]),
    ("embarrassed", "Being embarrassed", ["shame", "fear"]),
    ("lose", "Losing something I need", ["fear", "sadness", "envy"]),
    ("unfair", "Being treated unfairly again", ["anger"]),
    ("cant_say", "I can't say", ALL_PARENTS),
    ("none", "Nothing like that", ALL_PARENTS),
]
LIKELY = [("very", "Very likely"), ("either", "Could go either way"), ("not_that", "Not that likely"), ("unknown", "I don't know")]
THROUGH = [("yes", "I'd get through it, even if it's hard"), ("unsure", "I'm not sure I would")]

# --- Screen 6: the fits answers (the ask-fresh `fitsFacts` values) ---
FITS = [("fits", "Yes, it fits"), ("partly", "It fits, and it's bigger than this"), ("doesnt_fit", "Not really"), ("unsure", "I'm not sure")]

# --- v1.2, after *I'm not sure*: one missing fact (MissingFactAction) and when to ask about it ---
MISSING_FACTS = [("ask_them", "Ask them"), ("wait", "Wait a while and see"), ("look", "Look into it"),
                 ("ask_trusted", "Ask someone I trust")]
# The check_fact follow-up's window chips (scripts/practice-spine/content.py). No chip: no check-in.
FACT_WHEN = [("today", "Tonight"), ("tomorrow", "Tomorrow"), ("this_week", "Later this week")]


# ---------------------------------------------------------------------------------------------
# The skill (docs/design/skill-runtime.md: Step, Field, Slot, Exit; conditions in the JSON language)
# ---------------------------------------------------------------------------------------------

def a(field):
    return f"$a.{field}"


SHOWS_THREAT = {"any": [
    {"in": ["$d.set", THREAT_SETS]},
    {"some": ["story", {"eq": ["$opt.predicts", True]}]},
]}
# A threat was named (a chip other than *Nothing like that*, or own words): the next two parts appear.
THREAT_OPEN = {"all": [{"set": a("threat")}, {"not": {"eq": [a("threat"), "none"]}}]}
FITS_IS = lambda v: {"eq": [a("fits"), v]}  # noqa: E731
DANGER = {"in": [a("event"), DANGER_EVENTS]}

DERIVE = [
    {"name": "parent", "from": a("feel"), "table": "parentOf"},
    {"name": "set", "from": "$d.parent", "table": "storySetOf", "default": "general"},
    {"name": "fitsParent", "from": "$d.parent", "table": "fitsWhen", "keep": "key"},
]

STEPS = [
    {
        "id": "feel", "kind": "ask", "title": "feel_title",
        "fields": [{
            "id": "feel", "options": {"emotions": FEEL_CHIPS, "carriedFirst": True, "moreKey": "feel_more"},
            "max": 1, "required": True, "emotion": True,
        }],
        "next": [{"to": "event"}],
    },
    {
        "id": "event", "kind": "ask", "title": "event_title",
        "fields": [{
            "id": "event", "options": {"list": "event"}, "max": 1, "required": True,
            "own": {"hint": "event_own_hint", "countsAsPick": False, "open": True},
            # v1.1: own words are never read, so danger told in them can't raise the slot. Once there are own
            # words, someone to talk to is one quiet tap away (safety.open), whatever they say.
            "links": [{"exit": "safety_open", "label": "safety_open", "when": {"own": "event"}}],
        }],
        "crisis": [{"variant": "other_person", "when": DANGER}],
        "next": [{"when": DANGER, "to": "safe"}, {"to": "story"}],
    },
    {
        "id": "story", "kind": "ask", "title": "story_title", "hint": "story_hint",
        "fields": [{
            "id": "story", "options": {"list": "story", "where": {"eq": ["$opt.set", "$d.set"]}},
            "max": 2, "swap": True, "own": {"hint": "own_hint", "countsAsPick": True},
        }],
        "slots": [{"after": "story", "embed": "partsLine", "props": {"promptId": "cf_unblend"},
                   "showWhen": {"set": a("story")}, "record": "unblend"}],
        "next": [{"to": "alt"}],
    },
    {
        "id": "alt", "kind": "ask", "title": "alt_title", "note": "alt_note",
        "fields": [{
            "id": "alt", "options": {"list": "alt", "groupBy": "story", "ownGroup": "own_story"},
            "max": 9, "own": {"hint": "own_hint", "countsAsPick": False},
        }],
        "next": [{"when": SHOWS_THREAT, "to": "threat"}, {"to": "fits"}],
    },
    {
        "id": "threat", "kind": "ask", "title": "threat_title",
        "fields": [
            {"id": "threat", "max": 1, "own": {"hint": "own_hint", "countsAsPick": True},
             "options": {"list": "threat", "where": {"any": [
                 {"has": ["$opt.parents", "$d.parent"]},
                 {"not": {"set": "$d.parent"}},
             ]}}},
            {"id": "likely", "label": "likely_q", "max": 1, "options": {"list": "likely"},
             "showWhen": THREAT_OPEN},
            {"id": "through", "label": "through_q", "max": 1, "options": {"list": "through"},
             "showWhen": {"all": [THREAT_OPEN, {"set": a("likely")}]},
             "links": [{"exit": "cope_ahead", "label": "through_cope_ahead", "when": {"set": a("through")}}]},
        ],
        "next": [{"to": "fits"}],
    },
    {
        "id": "fits", "kind": "ask",
        "title": [{"when": {"set": "$d.fitsParent"}, "key": "fits_title"}, {"key": "fits_title_general"}],
        "titleSlots": {"feeling": {"labelOf": "feel"}},
        "fields": [{
            "id": "fits", "options": {"list": "fits"}, "max": 1, "required": True, "askFresh": "fitsFacts",
            "list": {"table": "fitsWhen", "key": "$d.fitsParent"},
        }],
        "next": [{"when": FITS_IS("unsure"), "to": "missing"}, {"to": "next"}],
    },
    {
        # v1.2: *still don't know* gets one fact to find out, not a decision. Both fields are optional: Next with
        # nothing picked goes on to the card. A window chip schedules check_fact on Next ("Did you find out?").
        "id": "missing", "kind": "ask", "title": "missing_title", "hint": "missing_hint",
        "fields": [
            {"id": "fact", "options": {"list": "fact"}, "max": 1,
             # One fact is short; 60 keeps the worst-case record under ext's 4 KB (tests/skill-contracts.test.mjs).
             "own": {"hint": "own_hint", "countsAsPick": True, "max": 60},
             # Own words aren't read, so someone to talk to stays one quiet tap away, as on the camera screen.
             "links": [{"exit": "safety_open", "label": "safety_open", "when": {"own": "fact"}}]},
            {"id": "when", "label": "when_q", "max": 1, "options": {"list": "when"}},
        ],
        "followUp": {"type": "check_fact", "whenFrom": "when", "when": {"set": a("when")}},
        "next": [{"to": "next"}],
    },
    {
        "id": "next", "kind": "handoff", "complete": True,
        "lines": [
            {"when": FITS_IS("fits"), "key": "next_fits"},
            {"when": FITS_IS("partly"), "key": "next_partly"},
            {"when": FITS_IS("doesnt_fit"), "key": "next_no"},
            {"when": FITS_IS("unsure"), "key": "next_unsure"},
        ],
        # The hand-off table (check-the-facts-handover.md, handoffFor), in order; Done is always there.
        "offers": [
            {"exit": "problem_solve", "when": FITS_IS("fits")},
            {"exit": "dear_man", "when": {"all": [FITS_IS("fits"), {"in": [a("event"), ["said", "didnt"]]}]}},
            {"exit": "opposite_action", "when": {"in": [a("fits"), ["partly", "doesnt_fit"]]}},
            {"exit": "problem_solve", "when": FITS_IS("partly")},
            {"exit": "wise_mind", "when": FITS_IS("unsure")},
            # v1.1: it fits and can't be changed today → the wave (ER-08, planned until it ships) or let it be
            # (DT-04, built 11 Nov 2026); doesn't fit with no urge to act on → the wave.
            {"exit": "mindfulness_emotions", "when": FITS_IS("fits")},
            {"exit": "let_it_be", "when": FITS_IS("fits")},
            {"exit": "mindfulness_emotions", "when": FITS_IS("doesnt_fit")},
        ],
        "done": "done",
    },
    {
        # v1.1: danger from a person. The resources above, the line, and Done; no verdict is asked for.
        # noClose: no "how strong is it now?" after someone has said a person hurt or threatened them.
        "id": "safe", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "other_person", "when": DANGER}],
        "lines": [{"when": DANGER, "key": "safe_line"}],
        "offers": [],
        "done": "done",
    },
]

EXITS = [
    {"id": "problem_solve", "toolId": "problem-solve", "carry": ["feel"]},
    {"id": "dear_man", "toolId": "dear-man", "carry": ["feel"]},
    {"id": "opposite_action", "toolId": "opposite-action", "carry": ["feel"]},
    {"id": "wise_mind", "toolId": "wise-mind", "query": {"first": "wm_q_next"}},
    {"id": "cope_ahead", "toolId": "cope-ahead", "query": {"situationId": "other"}},
    {"id": "mindfulness_emotions", "toolId": "mindfulness-emotions", "planned": True},  # ER-08 (ER-B5)
    {"id": "let_it_be", "toolId": "let-it-be"},                        # DT-04 (DT-B4)
    {"id": "safety_open", "safety": True},                                              # safety.open (R6)
    {"id": "done", "done": True},
]

# Option lists: (list, value, label, props, clinical label or None)
def options():
    out = [("event", v, label, {"danger": "other"} if v in DANGER_EVENTS else {}, "FactsEventKind") for v, label in EVENT_KINDS]
    for st, sid, label, predicts, _alts in STORIES:
        out.append(("story", sid, label, {"set": st, "predicts": predicts}, "Interpretation"))
    for st, sid, _label, _p, alts in STORIES:
        for i, alt in enumerate(alts):
            out.append(("alt", f"{sid}_alt{i + 1}", alt, {"for": sid}, "Alternative"))
    for v, label in OWN_STORY_ALTERNATIVES:
        out.append(("alt", v, label, {"for": "$own"}, "Alternative"))
    for v, label, parents in THREATS:
        out.append(("threat", v, label, {"parents": parents}, "ThreatChip"))
    out += [("likely", v, label, {}, None) for v, label in LIKELY]
    out += [("through", v, label, {}, None) for v, label in THROUGH]
    out += [("fits", v, label, {}, None) for v, label in FITS]
    out += [("fact", v, label, {}, "MissingFactAction") for v, label in MISSING_FACTS]
    out += [("when", v, label, {}, None) for v, label in FACT_WHEN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "feel", "ownMax": OWN_MAX,
    "copy": COPY, "tables": {"storySetOf": STORY_SET_OF}, "derive": DERIVE, "steps": STEPS, "exits": EXITS,
    "options": options(),
    # Answers that become the session's emotions (setEmotionIds).
    "emotionFields": ["feel"],
}
