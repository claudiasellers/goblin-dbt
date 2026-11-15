"""My crisis kit (DT-03; DBT DT crisis survival skills, IMPROVE, self-soothe, ACCEPTS, TIP) as two skills on the runtime.

The editable source. The flow is PRD DT-03 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): at 2 a.m. the person can't remember what helps, can't come up with ideas and
can't read a list, so the kit is their own thinking from a better day, handed back one card at a time.
docs/design/crisis-kit.md lists what this batch defers and where it departs from the PRD.

Two skills under the one `crisis-kit` tool id (as FAST's two): `src/lib/crisisKit.ts` `crisisKitSkillFor` picks.
- **Open it** (`crisis_kit_use`, the default): the kit the person kept (`crisis_kit`, the tool's `crisisKit` slice),
  or a short starter kit when there isn't one yet (signed out, or never made), one card at a time (`kitDeck`):
  body first; *Another card* changes the kind of card; a carried flooded reading shows body cards only, one plus one
  swap. Then the close asked in the flow (`askFresh: 'thenVsNow'`), then "Anyone you could call or text?".
- **Make it** (`crisis_kit_build`, `?frame=build`): one section per screen, every one skippable, curated chips plus
  own words: the body, hands busy, something soothing, words for you, a safe place, reasons to get through tonight.
  A kept pros & cons card goes in by itself. *Keep it* keeps `crisis_kit` (one per person; making it again replaces
  it, said on the keep screen). Built in calm: a carried flooded reading gets a heads-up and a choice.

Safety (plan C6):
- **The kit never stands in for help** (PRD; CORE-01's rule): *Talk to someone now* on every screen of both skills,
  and opened from a crisis route (`?frame=crisis`: Hold to wait's *Hurt myself*, Ride it out's not-safe ending,
  pros & cons' reach, the habit plan's harm route) the crisis banner sits above every card. The last screen asks
  about people, always.
- No soother or busy-hands card is food, alcohol, shopping or scrolling; no card promises how long a feeling lasts.
- The safe place is the person's own (no starter card), text only (D13), and *Another card* leaves it at any time.
- Cold carries First, the body's caution line (D4).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import first_body  # noqa: E402  (the cold caution, one source)

TOOL_ID = "crisis-kit"
CONCEPT = "dbt_crisis_survival_kit"
BUILD_ID = "crisis_kit_build"
USE_ID = "crisis_kit_use"
VERSION = "kit-v2"
OWN_MAX = 80  # one line: a card in their words, a reason, a place

# The sections, in the kit's own order (PRD: body first, people last but visible). The use deck reads the same ids.
SECTIONS = ("body", "hands", "soothe", "words", "place", "reasons")


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
KEPT = {"eq": [a("keepit"), "keep"]}

# ---------------------------------------------------------------------------------------------------------------
# The cards. (value, label, how, starter). `how` is the card's one instruction line; a starter card is in the kit
# someone gets before they've made their own. Second person on the card: the kit speaks to them (Kross 2014,
# distanced self-talk), first person on the chips (it's their kit).
# ---------------------------------------------------------------------------------------------------------------
BODY = [
    ("cold", "Cold water on my face", "Cold water on your face or wrists, or hold something cold (not ice straight on skin). About thirty seconds.", True),
    ("breath_out", "Breathing out longer than in", "Breathe in for four, out for six. Five times, slowly. Dizzy or tingly? Stop and breathe normally.", True),
    ("squeeze", "Squeezing and letting go", "Squeeze your fists, shoulders and legs tight for five seconds, then let go. Three times.", True),
    ("march", "Marching on the spot", "March on the spot for a minute, at a pace that feels okay.", False),
    ("feet", "Pressing my feet into the floor", "Press your feet into the floor and feel it push back. Ten slow breaths.", False),
]
HANDS = [
    ("count", "Counting back in threes", "Count back from 100 in threes. Lose count? Pick any number and carry on.", True),
    ("colours", "Finding five blue things", "Look around for five blue things and name each one, out loud if you can.", True),
    ("tidy", "Tidying something small", "One drawer, one bag, one shelf. Five minutes.", False),
    ("puzzle", "A puzzle or a game I know", "Something that takes some thinking, not too much.", False),
    ("sing", "Singing along to a song", "Pick one you know every word of, and sing it through.", False),
    ("rewatch", "Something I've watched before", "A show you know well, one episode. Nothing new for now.", False),
]
SOOTHE = [
    ("warm", "Holding something warm", "A mug, a hot water bottle, a warm towel. Warm, not hot.", True),
    ("hand_heart", "A hand on my heart", "One hand on your chest. Notice the warmth for a minute.", True),
    ("soft", "Something soft", "A blanket, a jumper, a pet. Let it take some of the weight.", False),
    ("smell", "A smell I like", "Soap, hand cream, a jumper that smells like someone you love.", False),
    ("sound", "A sound that calms me", "Rain sounds, a playlist, a voice you like.", False),
    ("look", "Something to look at", "The sky, a photo, a plant. Look at it slowly, one detail at a time.", False),
]
# Words for you (IMPROVE encouragement). The line is the card; no promise of how long it lasts (PRD: no durations).
WORDS = [
    ("minute", "You're getting through this minute.", True),
    ("before", "You've got through nights like this before.", False),
    ("feeling", "This is a feeling. It isn't the whole of you.", True),
    ("next", "You only have to do the next small thing.", False),
    ("wave", "Feelings rise and fall, even the big ones.", False),
    ("trying", "You're doing your best with something hard.", False),
    ("ask", "It's okay to ask for help tonight.", False),
]
# My safe place (IMPROVE imagery): the person's own, so no starter card. Text only (D13).
PLACE = [
    ("beach", "A beach"),
    ("woods", "A forest or a park"),
    ("room", "A room I love"),
    ("with", "Somewhere with someone I trust"),
    ("made_up", "Somewhere I've made up"),
]
# Reasons to get through tonight (distinct from CORE-02's reasons for living, which the safety plan owns).
REASONS = [
    ("tomorrow", "Seeing what tomorrow's like"),
    ("people", "People I care about"),
    ("pet", "My pet"),
    ("looking_forward", "Something I'm looking forward to"),
    ("prove", "Showing myself I can"),
    ("still_want", "Things I still want to do"),
]
CARD_PROPS = {"cold": {"caution": "cold_caution"}}

COPY_BUILD = {
    "body_title": "Let's make your kit. What helps your body when it's loud?",
    "body_hint": "Pick up to three, or skip. You can change it any time.",
    "heads_up_title": "Your body's loud right now. A kit is easier to make on a calmer day.",
    "heads_up_hint": "You can open a starter kit now, settle first, or keep making it.",
    "settle_line": "The kit can wait for a steadier moment.",
    "hands_title": "What keeps your hands and head busy?",
    "hands_hint": "Something that takes a bit of attention. Up to three, or skip.",
    "soothe_title": "What feels soothing?",
    "soothe_hint": "Pick by what you can touch, smell, hear or see. Up to three, or skip.",
    "words_title": "What would you want to hear on a hard night?",
    "words_hint": "Pick up to three, or write one in your own words. Your words count most.",
    "place_title": "Is there a place you go to in your mind that feels safe?",
    "place_hint": "Somewhere real or made up. Describe it if you like. Skip it if this isn't for you.",
    "reasons_title": "What are your reasons to get through a hard night?",
    "reasons_hint": "Pick what's true, or write your own. Skip it if you like.",
    "own": "In my words",
    "place_own": "Describe it",
    "keep_title": "Keep this kit? It opens from Help me now and from Tools.",
    "keep_title_has": "Keep this kit? It replaces the one you have now.",
    "keep_hint": "Your pros & cons cards and kept rebellions go in by themselves.",
    "keep_primary": "Next",
    "end_kept": "It's kept. Try one card on an ordinary hard day this week, so it feels familiar when you need it.",
    "end_not_kept": "That's fine. You can make it whenever you like.",
    "end_empty": "Nothing picked this time. The starter kit is there whenever you need it.",
    "end_line": "It opens one card at a time.",
    "open_kit": "Open my kit",
    "cold_caution": first_body.COPY["cold_caution"],  # one source: First, the body's line (D4)
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}

COPY_USE = {
    "deck_title": "One card at a time.",
    "deck_starter": "A few to start with. You can make the kit yours later.",
    "deck_another": "Another card",
    "deck_done": "That's enough for now",
    "sec_body": "For your body",
    "sec_hands": "Keep your hands busy",
    "sec_soothe": "Something soothing",
    "sec_words": "Words for you",
    "sec_place": "Your safe place",
    "sec_reasons": "Your reasons to get through tonight",
    "sec_pros_cons": "Your pros & cons card",
    # DT-11 part 3: a rebellion kept from Rebel without the wreckage (kind `rebellion_card`), up to two, never on a
    # crisis route's kit. The line names what it gives, from Rebel's own options.
    "sec_rebellion": "A rebellion without the wreckage",
    "rebellion_for": "What it gives you:",
    "place_how": "Picture it. What can you see there? What can you hear? You can come back from it whenever you like.",
    "words_how": "Read it slowly, twice.",
    "reasons_label": "You wrote these on a calmer day.",
    "cold_caution": COPY_BUILD["cold_caution"],
    "close_title": "Compared with when you opened it?",
    "harder_line": "That happens, and it's worth saying. Someone to talk to, or something for your body, could come next.",
    "reach_title": "Is there anyone you could call or text, even for a few minutes?",
    "reach_line": "You don't have to explain everything. Hearing a voice can help.",
    "reach_make": "When things are calmer, you can make the kit your own.",
    "make_kit": "Make it yours",
    "safety_open": "Talk to someone now",
    "done": "Done",
}

HEADS_UP = [("open", "Open a starter kit now"), ("settle", "Settle my body first"), ("go", "Keep making it")]
KEEPIT = [("keep", "Keep it"), ("not_now", "Not this time")]
TVN = [("much_better", "Much easier"), ("better", "A bit easier"), ("same", "About the same"), ("worse", "Harder")]
ANY_PICK = {"any": [{"set": a(s)} for s in SECTIONS]}
HAS_KIT = {"set": "$p.crisisKit"}
CRISIS_FRAME = {"eq": ["$ctx.frame", "crisis"]}
# Making a kit is offered only on a visit opened from Tools (no frame): never from a crisis route or Help me now
# (`frame=now`), where someone is in it right now.
FROM_TOOLS_NO_KIT = {"all": [{"not": HAS_KIT}, {"not": {"set": "$ctx.frame"}}]}
USE_CRISIS = [{"variant": "crisis", "when": CRISIS_FRAME}]


def section(sid, title, hint, nxt, *, mx=3, own="own"):
    return {"id": sid, "kind": "ask", "title": title, "hint": hint,
            "fields": [{"id": sid, "options": {"list": sid}, "max": mx, "required": False,
                        "own": {"hint": own, "countsAsPick": True}, "links": [SAFETY_LINK]}],
            "next": nxt}


BUILD_STEPS = [
    section("body", "body_title", "body_hint", [{"when": FLOODED, "to": "heads_up"}, {"to": "hands"}]),
    {
        # Built in calm (PRD): a carried flooded reading gets a heads-up and a choice; nothing locks.
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint",
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"in": [a("heads_up"), ["open", "settle"]]}, "to": "settle"}, {"to": "hands"}],
    },
    section("hands", "hands_title", "hands_hint", [{"to": "soothe"}]),
    section("soothe", "soothe_title", "soothe_hint", [{"to": "words"}]),
    section("words", "words_title", "words_hint", [{"to": "place"}]),
    section("place", "place_title", "place_hint", [{"to": "reasons"}], mx=1, own="place_own"),
    section("reasons", "reasons_title", "reasons_hint", [{"when": ANY_PICK, "to": "keep"}, {"to": "end"}], mx=4),
    {
        # Keep (R4) on *Keep it*: that tap is the yes (C2.2). One kit per person: keeping again replaces it.
        "id": "keep", "kind": "ask", "hint": "keep_hint",
        "title": [{"when": HAS_KIT, "key": "keep_title_has"}, {"key": "keep_title"}],
        "fields": [{"id": "keepit", "options": {"list": "keepit"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "keep": {"kind": "crisis_kit", "many": False, "from": list(SECTIONS), "when": KEPT},
        "primary": "keep_primary",
        "next": [{"to": "end"}],
    },
    {
        "id": "end", "kind": "handoff", "complete": True, "noClose": True,
        "lines": [
            {"when": KEPT, "key": "end_kept"},
            {"when": {"not": ANY_PICK}, "key": "end_empty"},
            {"when": {"set": a("keepit")}, "key": "end_not_kept"},
            {"when": ALWAYS, "key": "end_line"},
        ],
        "offers": [{"exit": "open_kit", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        "id": "settle", "kind": "handoff", "complete": True, "noClose": True,
        "lines": [{"when": ALWAYS, "key": "settle_line"}],
        "offers": [{"exit": "open_kit", "when": ALWAYS}, {"exit": "cool_down", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
]

BUILD_EXITS = [
    {"id": "open_kit", "toolId": TOOL_ID, "label": "open_kit"},           # the kit itself (use)
    {"id": "cool_down", "toolId": "cool-down"},                           # DT-01 First, the body
    {"id": "safety_open", "toolId": None, "safety": True},                # safety.open (R6)
    {"id": "done", "done": True},
]

USE_STEPS = [
    {
        "id": "deck", "kind": "embed", "embed": "kitDeck", "answerAs": "deck", "title": "deck_title",
        "crisis": USE_CRISIS, "links": [SAFETY_LINK],
        "props": {"fromSkill": BUILD_ID, "prosSkill": "pros_cons", "rebelSkill": "alternate_rebellion", "starter": "deck_starter", "another": "deck_another",
                  "enough": "deck_done", "secBody": "sec_body", "secHands": "sec_hands", "secSoothe": "sec_soothe",
                  "secWords": "sec_words", "secPlace": "sec_place", "secReasons": "sec_reasons",
                  "secProsCons": "sec_pros_cons", "secRebellion": "sec_rebellion", "rebellionFor": "rebellion_for", "placeHow": "place_how", "wordsHow": "words_how",
                  "reasonsLabel": "reasons_label"},
        "next": [{"to": "close"}],
    },
    {
        # The close, asked in the flow (PRD: each card closes with then-vs-now; here once, for the visit).
        "id": "close", "kind": "ask", "title": "close_title", "crisis": USE_CRISIS,
        "fields": [{"id": "close", "options": {"list": "tvn"}, "max": 1, "required": True, "askFresh": "thenVsNow",
                    "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("close"), "worse"]}, "to": "harder"}, {"to": "reach"}],
    },
    {
        "id": "harder", "kind": "handoff", "complete": True, "noClose": True, "crisis": USE_CRISIS,
        # Harder still ends with people (PRD; gate review): someone to talk to first, then the body.
        "title": "reach_title",
        "lines": [{"when": ALWAYS, "key": "harder_line"}, {"when": ALWAYS, "key": "reach_line"}],
        "offers": [{"exit": "safety_open", "when": ALWAYS}, {"exit": "cool_down", "when": ALWAYS}],
        "done": "done", "links": [SAFETY_LINK],
    },
    {
        # The kit ends with people (PRD: "Anyone you could call?"), always.
        "id": "reach", "kind": "handoff", "complete": True, "noClose": True, "crisis": USE_CRISIS, "title": "reach_title",
        "lines": [{"when": ALWAYS, "key": "reach_line"}, {"when": FROM_TOOLS_NO_KIT, "key": "reach_make"}],
        "offers": [{"exit": "safety_open", "when": ALWAYS}, {"exit": "make_kit", "when": FROM_TOOLS_NO_KIT}],
        "done": "done", "links": [SAFETY_LINK],
    },
]

USE_EXITS = [
    {"id": "make_kit", "toolId": TOOL_ID, "query": {"frame": "build"}, "label": "make_kit"},   # make it yours
    {"id": "cool_down", "toolId": "cool-down"},                           # DT-01 First, the body
    {"id": "safety_open", "toolId": None, "safety": True},                # safety.open (R6)
    {"id": "done", "done": True},
]


def build_options():
    out = []
    for lst, rows in (("body", BODY), ("hands", HANDS), ("soothe", SOOTHE)):
        out += [(lst, v, label, {"how": how, "starter": starter, **CARD_PROPS.get(v, {}), "section": lst}, None)
                for v, label, how, starter in rows]
    out += [("words", v, label, {"starter": starter, "section": "words"}, None) for v, label, starter in WORDS]
    out += [("place", v, label, {"section": "place"}, None) for v, label in PLACE]
    out += [("reasons", v, label, {"section": "reasons"}, None) for v, label in REASONS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("keepit", v, label, {}, None) for v, label in KEEPIT]
    return out


BUILD = {
    "id": BUILD_ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "body", "ownMax": OWN_MAX,
    # frame: `build`, which picked this skill (src/lib/crisisKit.ts); nothing here reads it.
    "accepts": ["band", "frame"],
    "copy": COPY_BUILD, "tables": {}, "derive": [], "steps": BUILD_STEPS, "exits": BUILD_EXITS, "options": build_options(),
    "emotionFields": [],
}

USE = {
    "id": USE_ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "deck", "ownMax": OWN_MAX,
    # band: a carried flooded reading (body cards only); frame: `crisis` from a crisis route (the banner on every card),
    # `now` from Help me now (no *Make it yours*).
    "accepts": ["band", "frame"],
    "copy": COPY_USE, "tables": {}, "derive": [], "steps": USE_STEPS, "exits": USE_EXITS,
    "options": [("tvn", v, label, {}, None) for v, label in TVN],
    "emotionFields": [],
}

SKILLS = [USE, BUILD]
