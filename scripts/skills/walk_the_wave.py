"""Know this feeling, Walk the wave (ER-10 part 2; DBT ER Handout 5, the model of emotions). Spec:
docs/design/emotion-guide.md (*Walk the wave*). The third skill under the `emotion-guide` tool, opened by
`?frame=wave`; `emotionGuideSkillFor` (src/lib/emotionGuide.ts) picks it.

One episode laid out as a strip, in calm: before (what left me open to it) → what happened → what my mind said → my
body → the urge → what I did → after (and any feeling about the feeling). The person starts where it's clearest (the
body or the urge first, for someone who can't name the feeling yet), then the rest in order; any slot can be skipped.
The name comes last, as a guess, and none is an answer.

Steps:
  start     *Where do you want to start?* what happened · my body · the urge · what I did · from the beginning.
  heads_up  after it, a carried flooded reading only: the body first or *Walk it anyway* (never a lock).
  before … after   the seven slots, chips plus own words, none required (*Skip any you're not sure of*). The start
            slot first, then the others in the model's order.
  name      *If you had to guess, what was the feeling?* one grid word, or none.
  strip     the `episodeStrip` embed: the seven slots on paper in the model's order, the guess under them.
  end       what's next: Know this feeling for the guessed word, Check the Facts when the mind said something, Cope
            Ahead for next time. Danger from a person (what happened) → the other_person slot from then on, Ending in
            its careful frame and someone to talk to, no plan to face them. *Hurt myself* (the urge) → the crisis
            banner from then on and someone to talk to first.

Chips come from the skills that own them: what happened is Check the Facts' event kinds (same ids, the danger ones
included), the urge is Hold to wait's pulls (same ids and ActionUrge ids, so the session records `urgeIds`) and a few
of the feeling's own pulls, before is Running low's rows in plain words. *Talk to someone now* on every screen. No
close (the tool's close kind is `none`), no keep, no follow-up; the episode is `ext.run`. CORE-08's chain analysis
embeds this later.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

from check_the_facts import DANGER_EVENTS, EVENT_KINDS
from emotion_guide import FEEL_CHIPS
from hold_to_wait import PULLS

ID = "walk_the_wave"
TOOL_ID = "emotion-guide"
CONCEPT = "dbt_model_of_emotions"
VERSION = "ww-v1"
OWN_MAX = 100

ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}


def a(field):
    return f"$a.{field}"


# The seven slots, in the model's order (H5): (field, title, hint, max, options).
SLOTS = [
    ("before", "before_title", "before_hint", 3, [
        # Running low's loud rows in plain words (ER-07), plus stress already there.
        ("before_sleep", "Short or broken sleep"), ("before_food", "Skipped food"), ("before_body", "Ill or in pain"),
        ("before_subs", "Alcohol or drugs"), ("before_stress", "Already stressed"), ("before_none", "Nothing I can think of")]),
    ("event", "event_title", "event_hint", 2, EVENT_KINDS),
    ("mind", "mind_title", "mind_hint", 2, [
        ("mind_bad_coming", "Something bad is going to happen"), ("mind_dont_care", "They don't care about me"),
        ("mind_unfair", "This isn't fair"), ("mind_my_fault", "I did something wrong"),
        ("mind_not_enough", "I'm not good enough"), ("mind_cant_cope", "I can't cope with this"),
        ("mind_leave", "They're going to leave me")]),
    ("body", "body_title", "body_hint", 3, [
        ("body_chest", "Tight chest"), ("body_heart", "Racing heart"), ("body_hot", "Hot face"),
        ("body_stomach", "Knot in my stomach"), ("body_tense", "Tense jaw or shoulders"), ("body_heavy", "Heavy or tired"),
        ("body_shaky", "Shaky"), ("body_tears", "Close to tears"), ("body_far", "Numb or far away")]),
    ("urge", "urge_title", "urge_hint", 2, [
        *[(v, label) for v, label, _p in PULLS],
        ("urge_hide", "Go quiet or hide"), ("urge_snap", "Shout or snap"), ("urge_cry", "Cry"),
        ("urge_reach", "Reach out to someone"), ("urge_freeze", "Freeze"), ("urge_fix", "Fix it right now")]),
    ("did", "did_title", "did_hint", 2, [
        ("did_urge", "What the urge wanted"), ("did_held", "Held off"), ("did_else", "Something else"),
        ("did_pulled_away", "Pulled away"), ("did_said", "Snapped or said something sharp"),
        ("did_showed", "It showed on my face"), ("did_still", "It's still going on")]),
    ("after", "after_title", "after_hint", 2, [
        ("after_relief", "Relief"), ("after_calmer", "Calmer"), ("after_stirred", "Still stirred up"),
        ("after_regret", "Regret"), ("after_ashamed", "Ashamed of how I felt"), ("after_angry_self", "Angry at myself for feeling it"),
        ("after_ongoing", "It isn't over yet"), ("after_unsure", "Too soon to tell")]),
]
ORDER = [s[0] for s in SLOTS]
# The urge chips that are Hold to wait's pulls carry their ActionUrge id (the session's urgeIds) and their danger.
PULL_PROPS = {v: p for v, _l, p in PULLS}

# Where the person starts: one of five slots (before is *from the beginning*).
STARTS = [("event", "What happened"), ("body", "My body"), ("urge", "The urge"), ("did", "What I did"),
          ("before", "From the beginning")]


def sequence(start):
    """The slots in the order this start walks them: the start slot, then the others in the model's order."""
    return [start] + [s for s in ORDER if s != start]


# Any pick, not only the first (two can be picked): read through the options' danger props.
HURT = {"some": ["urge", {"eq": ["$opt.danger", "self"]}]}
# Danger from a person (Check the Facts' safety chips): any of them among what happened.
DANGER = {"some": ["event", {"eq": ["$opt.danger", "other"]}]}
# Both picked: the other_person banner, which lists 988 too (Gate 1).
UNSAFE = {"in": [a("safe"), ["unsure", "no"]]}
CRISIS = [{"variant": "other_person", "when": DANGER}, {"variant": "crisis", "when": {"any": [HURT, UNSAFE]}}]

COPY = {
    "start_title": "Where do you want to start?",
    "start_hint": "Start where it's clearest. Seven short questions; skip any.",
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "Walking through a feeling works better once it settles a little.",
    "settle_line": "Body first. This will be here when you're ready.",
    "before_title": "Before it, was anything already wearing you down?",
    "before_hint": "Skip it if you're not sure.",
    "event_title": "What happened?",
    "event_hint": "It can be small, or something inside, like a thought. A word is enough.",
    "mind_title": "What did your mind say about it?",
    "mind_hint": "The first thought, even if it's not fair.",
    "body_title": "Where did you feel it in your body?",
    "body_hint": "Skip it if you're not sure.",
    "urge_title": "What did it make you want to do?",
    "urge_hint": "A pull isn't something you have to act on.",
    "did_title": "What did you do?",
    "did_hint": "Nothing here is a grade.",
    "after_title": "And after?",
    "after_hint": "Sometimes a second feeling comes about the first.",
    "own_hint": "In your own words",
    "too_much": "This is bringing it back",
    # Hurt myself (as Hold to wait): the resources open first, then one question.
    "safe_title": "Are you safe right now?",
    "safe_hint": "If the pull to hurt yourself is here now, someone can be with you in it.",
    "reach_title": "Talk to someone now.",
    "reach_line": "You don't have to hold this alone. Someone can talk with you right now.",
    "name_title": "If you had to guess, what was the feeling?",
    "name_hint": "A guess is fine, and so is none.",
    "name_more": "More words",
    "strip_title": "The whole wave",
    "strip_names": "Before · What happened · What my mind said · My body · The urge · What I did · After",
    "strip_blank": "Skipped",
    "strip_name_label": "Maybe",
    "next": "Next",
    # One line per screen (handoffLine shows the first that holds): composed by case.
    "end_title": "A feeling has a beginning, a middle and an end.",
    "end_title_danger": "Thank you for laying that out.",
    "end_line": "Seeing the whole wave can make the next one easier to spot early.",
    "end_hurt": "If the pull to hurt yourself is still there, talk to someone now. Seeing the whole wave can make the "
                "next one easier to spot early.",
    "end_danger": "If someone is hurting you or scaring you, you don't have to plan around it alone.",
    "end_both": "If someone is hurting you or scaring you, or the pull to hurt yourself is still there, talk to someone "
                "now. You don't have to hold this alone.",
    "offer_guide": "Get to know this feeling",
    "offer_facts": "Check the story your mind told",
    "offer_cope": "Plan for next time",
    "safety_open": "Talk to someone now",
    "done": "Done",
}

STEPS = [
    {
        "id": "start", "kind": "ask", "title": "start_title", "hint": "start_hint",
        "fields": [{"id": "start", "options": {"list": "start"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": FLOODED, "to": "heads_up"}] + [{"when": {"eq": [a("start"), s]}, "to": s} for s, _l in STARTS],
    },
    {
        "id": "heads_up", "kind": "ask", "title": "heads_up_title", "hint": "heads_up_hint",
        "fields": [{"id": "heads_up", "options": {"list": "heads_up"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        "next": [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}]
        + [{"when": {"eq": [a("start"), s]}, "to": s} for s, _l in STARTS],
    },
    {"id": "settle", "kind": "handoff", "complete": True, "noClose": True, "title": "heads_up_title",
     "lines": [{"when": ALWAYS, "key": "settle_line"}], "offers": [{"exit": "cool_down", "when": ALWAYS}],
     "done": "done", "next": [], "links": [SAFETY_LINK]},
]


def slot_next(field):
    """From this slot, the next one in the start's sequence; after the last, the name."""
    targets = {}
    for s, _l in STARTS:
        seq = sequence(s)
        i = seq.index(field) if field in seq else -1
        to = seq[i + 1] if 0 <= i < len(seq) - 1 else "name"
        targets.setdefault(to, []).append(s)
    return [{"when": {"in": [a("start"), starts]}, "to": to} for to, starts in targets.items()]


# A way out mid-walk if it brings the feeling back (Gate 3): First, the body, beside someone to talk to.
TOO_MUCH = {"exit": "cool_down", "label": "too_much", "when": ALWAYS}

for field, title, hint, mx, _opts in SLOTS:
    STEPS.append({
        "id": field, "kind": "ask", "title": title, "hint": hint, "crisis": CRISIS,
        "fields": [{"id": field, "options": {"list": field}, "max": mx, "required": False, "links": [SAFETY_LINK, TOO_MUCH],
                    "own": {"hint": "own_hint", "max": OWN_MAX}}],
        # Hurt myself: the safety question first, as every sibling with that pull (Gate 3).
        "next": ([{"when": HURT, "to": "safe"}] if field == "urge" else []) + slot_next(field),
    })

STEPS += [
    {
        # The resources open over this screen as it arrives (C6.5), then one question; the banner stays.
        "id": "safe", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "crisis": CRISIS, "safetyFirst": ALWAYS,
        "fields": [{"id": "safe", "options": {"list": "safe"}, "max": 1, "required": True, "links": [SAFETY_LINK]}],
        # Not sure or no: someone to talk to, straight away (S9); safe for now: the walk goes on from the urge.
        "next": [{"when": UNSAFE, "to": "reach"}] + slot_next("urge"),
    },
    {"id": "reach", "kind": "handoff", "complete": True, "noClose": True, "title": "reach_title", "crisis": CRISIS,
     "lines": [{"when": ALWAYS, "key": "reach_line"}], "offers": [{"exit": "safety_open", "when": ALWAYS}],
     "done": "done", "next": []},
]

NAMED = {"set": a("name")}
END_LINES = [
    {"key": "end_both", "when": {"all": [DANGER, HURT]}},
    {"key": "end_danger", "when": DANGER},
    {"key": "end_hurt", "when": HURT},
    {"key": "end_line", "when": ALWAYS},
]

STEPS += [
    {
        "id": "name", "kind": "ask", "title": "name_title", "hint": "name_hint", "crisis": CRISIS,
        "fields": [{"id": "name", "options": {"emotions": FEEL_CHIPS, "carriedFirst": True, "moreKey": "name_more"},
                    "max": 1, "required": False, "emotion": True, "links": [SAFETY_LINK]}],
        "next": [{"to": "strip"}],
    },
    {
        "id": "strip", "kind": "embed", "embed": "episodeStrip", "title": "strip_title", "answerAs": "strip",
        "crisis": CRISIS, "links": [SAFETY_LINK],
        "props": {"fields": ORDER, "names": "strip_names", "blank": "strip_blank", "nameField": "name",
                  "nameLabel": "strip_name_label", "next": "next"},
        "next": [{"to": "end"}],
    },
    {
        "id": "end", "kind": "handoff", "complete": True, "noClose": True, "crisis": CRISIS,
        "title": [{"when": DANGER, "key": "end_title_danger"}, {"key": "end_title"}],
        "lines": END_LINES,
        # Danger from a person: someone to talk to and Ending (careful), never a plan to face them. Hurt myself:
        # someone to talk to first. Otherwise the word, the story, next time.
        "offers": [
            {"exit": "safety_open", "when": {"any": [HURT, DANGER]}},
            {"exit": "ending_careful", "when": DANGER},
            {"exit": "emotion_guide", "when": {"all": [NAMED, {"not": DANGER}]}},
            # Questioning a story while a self-harm pull may be live is the wrong next step (Gate 3).
            {"exit": "check_the_facts", "when": {"all": [{"set": a("mind")}, {"not": {"any": [DANGER, HURT]}}]}},
            {"exit": "cope_ahead", "when": {"not": {"any": [DANGER, HURT]}}},
        ],
        # Someone to talk to is already the first offer when either danger is picked: no second link (Gate 1).
        "done": "done", "next": [], "links": [{**SAFETY_LINK, "when": {"not": {"any": [HURT, DANGER]}}}],
    },
]

EXITS = [
    {"id": "emotion_guide", "toolId": "emotion-guide", "carry": ["name"], "label": "offer_guide"},  # the card for the guess
    {"id": "check_the_facts", "toolId": "check-the-facts", "carry": ["name"], "label": "offer_facts"},  # ER-02: the story
    {"id": "cope_ahead", "toolId": "cope-ahead", "label": "offer_cope"},    # ER-05: if it will come again
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},  # IE-08's safety branch
    {"id": "cool_down", "toolId": "cool-down"},                             # DT-01 First, the body (flooded)
    {"id": "safety_open", "toolId": None, "safety": True},                  # safety.open (R6)
    {"id": "done", "done": True},
]

HEADS_UP = [("settle", "Settle my body first"), ("try", "Walk it anyway")]
SAFE = [("safe", "Yes, I'm safe for now", {}), ("unsure", "I'm not sure", {"danger": "self"}), ("no", "No", {"danger": "self"})]


def options():
    out = [("start", v, label, {}, None) for v, label in STARTS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("safe", v, label, props, None) for v, label, props in SAFE]
    for field, _t, _h, _m, opts in SLOTS:
        for v, label in opts:
            props = {}
            if field == "event" and v in DANGER_EVENTS:
                props = {"danger": "other"}
            if field == "urge" and v in PULL_PROPS:
                props = dict(PULL_PROPS[v])
            out.append((field, v, label, props, None))
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "start", "ownMax": OWN_MAX,
    # band: a host's or the carried reading (C6.2): flooded gets the body first.
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["name"],
}
