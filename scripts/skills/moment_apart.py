"""Take a moment apart (MF-07; DBT Mindfulness Worksheets 8 and 9, pleasant and unpleasant events, Linehan 2015), as a
skill on the runtime.

The editable source. The flow is PRD MF-07 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): people can say
"today was bad" or "that was nice" but not what the moment was made of. One moment split into body, thoughts and
feeling, then *were you aware of it while it happened?*: the most structured describe exercise in the curriculum and an
alexithymia drill. The pleasant mode is the bridge from neutral attention to good things (ER-04's Things I like). The
design note is docs/design/moment-apart.md.

Steps:
  which     *Which moment?* something good, even small · something hard · something in between. A carried flooded
            reading gets a heads-up first (`heads_up`: the body first, or go on); a hard moment on a carried stirred or
            flooded reading gets one too (a good one instead, the body first, or go on). Never a lock.
  what      *What was going on?* with someone · on my own · at work or study · outside · online · something else (own
            words). For a hard or in-between moment, four routes too: *Someone put me down, brushed me off or left
            me out* (→ `recover`: Recover, the right tool for that, instead of going on), *Someone threatened me,
            scared me or hurt me* (→ `danger`: no replay; the `other_person` resources, Ending careful, someone to
            talk to, back to the room), *Something frightening happened* (→ `stop`: no replay; someone to talk to,
            back to the room) and *I hurt myself, or thought about it* (→ `hurt`: the crisis banner and someone to
            talk to). No close on any route.
  body      *What did your body do then?* where (up to two places, or nothing stands out) and what it felt like (the
            check-in's sensation words, led by the moment's side; up to three, or no words). Both optional.
  thoughts  *What went through your mind?* about me · about them · about what's next · about what it meant · no
            thoughts I noticed (up to two); on a hard or in-between moment also *Thoughts of hurting myself or not
            being here* (→ `hurt`). From the body to the awareness question, a hard or in-between moment has *Back to
            the room* (Five senses) one tap away (PRD risk: replay becoming rumination).
  feel      *What were you feeling?* grid words as guesses, led by the moment's side, carried words first; *I can't
            tell* is a full answer (PRD: complete).
  aware     *Were you aware of it while it happened?* yes · partly · only now. Over reps, *yes* rising is the skill.
  savour    good only: *Stay with the good bit for a few seconds* (`holdRing`, 10 s), then `keep` (not after a skipped
            savour): what was the good bit (Good things' own kinds, the same ids, or own words) and *Keep it in Things
            I like?* (`thing_i_like`, R4).
  end       good: kept or not, and *More of this?* (Good things); hard: *That was hard. You took it apart instead of
            carrying it whole.* (PRD) and *Back to the room*; in between: a plain line. *I can't tell* adds Find the
            feeling, a thought about me on a hard moment adds Unpack a judgment.

*Talk to someone now* (safety.open) is on every screen. Close kind `none`: the description is the outcome (`noClose`).
A completed visit is a `describe` rep (the PracticeSkill's `defaultFor`, scripts/practice-spine/content.py). One moment
a visit, no re-open (PRD risk: replay becomes rumination).
"""

import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("body_map_content_ma", os.path.join(os.path.dirname(HERE), "body-map", "content.py"))
BM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(BM)

ID = "moment_apart"
TOOL_ID = "moment-apart"
CONCEPT = "dbt_mindful_events"
VERSION = "ma-v1"
OWN_MAX = 40  # a word or two

COPY = {
    "which_title": "Which moment do you want to take apart?",
    "which_hint": "One moment from today or lately. Small is fine.",
    "heads_up_title": "Your body's loud right now.",
    "heads_up_line": "This one works better once it has settled.",
    "body_first_title": "Settle your body first.",
    "body_first_line": "This moment will keep. First, the body.",
    "heads_up_hard_title": "You're already stirred up.",
    "heads_up_hard_line": "Going back into a hard moment can stir things more. A good one might fit better today.",
    "what_title": "What was going on?",
    "what_hint": "Pick the closest.",
    "what_own": "Something else",
    "recover_title": "Someone put you down or brushed you off.",
    "recover_line": "That needs more care than taking apart. Recover is made for it.",
    "stop_title": "Let's not go back into that one.",
    "stop_line": "Something frightening deserves care, not a replay. You can talk to someone, or come back to the room first.",
    "danger_line": "When someone threatened or hurt you, your safety comes first, not a replay. Support is here, and so is the room.",
    "ending_careful": "Leaving someone who might hurt me",
    "hurt_title": "Thank you for saying it.",
    "hurt_line": "That matters more than this practice. Someone to talk to comes first.",
    "body_title": "What did your body do then?",
    "body_hint": "Guesses are fine. Up to two places and three words, or skip.",
    "where_label": "Where",
    "words_label": "What it felt like",
    "thoughts_title": "What went through your mind?",
    "thoughts_hint": "Not the words, only what kind. Up to two.",
    "feel_title": "What were you feeling?",
    "feel_hint": "A guess is fine. Up to two.",
    "feel_more": "Something else",
    "unsure_label": "Or",
    "aware_title": "Were you aware of it while it was happening?",
    "aware_hint": "Noticing later counts. Noticing during gets easier with practice.",
    "savour_title": "Stay with the good bit for a few seconds. Notice one thing you liked about it.",
    "savour_label": "Start",
    "savour_running": "Staying with it",
    "savour_hint": "Bring it back to mind. Notice one thing you liked about it. Let it be as big as it was.",
    "savour_done": "You stayed with it.",
    "keep_title": "What was the good bit?",
    "keep_hint": "Pick the closest, or name it in a few words so you'll know it again.",
    "keep_own": "Name it",
    "keepit_label": "Keep it in Things I like?",
    "keep_primary": "Next",
    "end_good_kept": "Kept. Good things are worth finding again.",
    "end_good": "You took a good moment apart. It's easier to find the next one.",
    "end_hard": "That was hard. You took it apart instead of carrying it whole.",
    "end_mid": "You took one moment apart. That's the skill.",
    "end_aware_yes": "And you noticed it while it happened.",
    "end_aware_partly": "And you caught some of it while it happened.",
    "end_aware_later": "Next time, see if you notice one while it's happening.",
    "more_label": "Plan more of this",
    "ftf_label": "Find the word for the feeling",
    "unpack_label": "Look at the thought about me",
    "body_first": "My body first",
    "go_on": "Go on anyway",
    "good_instead": "Take apart a good one instead",
    "back_room": "Back to the room",
    "recover_offer": "Open Recover",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


def EQ(field, v):
    return {"eq": [a(field), v]}


def has(field, v):
    return {"has": [a(field) + ".ids", v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
STIRRED = {"eq": ["$ctx.band", "stirred"]}
GOOD = EQ("valence", "good")
HARD = EQ("valence", "hard")
MID = EQ("valence", "mid")
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
LINKS = [SAFETY_LINK]

VALENCE = [("good", "Something good, even small"), ("hard", "Something hard"), ("mid", "Something in between")]
HEADS_UP = [("body", "My body first"), ("go", "Go on anyway")]
HEADS_UP_HARD = [("good", "Take apart a good one instead"), ("body", "My body first"), ("go", "Go on anyway")]
# What was going on (PRD situation chips). `v` is the sides a chip shows on; the three routes only for a hard or
# in-between moment (never on a good one, where they would sting).
WHAT = [
    ("someone", "With someone", ["good", "hard", "mid"]),
    ("alone", "On my own", ["good", "hard", "mid"]),
    ("work", "At work or study", ["good", "hard", "mid"]),
    ("outside", "Outside", ["good", "hard", "mid"]),
    ("online", "Online", ["good", "hard", "mid"]),
]
# Gate review: *hurt me* is the danger chip everywhere in the app, so Recover's chip is plainly about being put down,
# danger from a person is its own route (the `other_person` resources and Ending careful), and a frightening moment
# with no one behind it (an accident, a scare) gets no domestic-violence banner.
ROUTES = [
    ("hurt_by", "Someone put me down, brushed me off or left me out", {}),
    ("threatened", "Someone threatened me, scared me or hurt me", {"danger": "other"}),
    ("frightening", "Something frightening happened", {}),
    ("self_harm", "I hurt myself, or thought about it", {"danger": "self"}),
]
# The body: the check-in's places and sensation words (SensationType), each word on the sides it's offered on.
WHERE = ["chest", "stomach", "throat", "shoulders", "face", "jaw", "head", "hands", "arms", "legs", "body"]
BODY_WORDS = [
    ("warmth", ["good", "mid"]), ("lightness", ["good", "mid"]), ("expansion", ["good"]), ("settled", ["good", "mid"]),
    ("loose", ["good", "mid"]), ("soft", ["good"]), ("energised", ["good", "mid"]), ("smiling", ["good"]),
    ("fizzy", ["good"]), ("easy_breathing", ["good"]), ("tingly", ["good", "mid"]),
    ("tension", ["hard", "mid"]), ("pressure", ["hard", "mid"]), ("heaviness", ["hard", "mid"]), ("knotted", ["hard"]),
    ("churning", ["hard"]), ("racing_heart", ["hard", "good"]), ("heat", ["hard"]), ("constriction", ["hard"]),
    ("shaking", ["hard"]), ("sinking", ["hard"]), ("lump", ["hard"]), ("numbness_sensation", ["hard", "mid"]),
    ("drained", ["hard", "mid"]), ("butterflies", ["good", "hard", "mid"]),
]
NO_WORDS = ("no_words", "No words for it")
NOTHING_WHERE = ("nowhere", "Nothing stands out")
THOUGHTS = [
    ("me", "About me"),
    ("them", "About someone else"),
    ("next", "About what happens next"),
    ("meant", "About what it meant"),
    ("none", "No thoughts I noticed"),
]
# A thought of hurting myself is never only a kind of thought (Thoughts passing through, Unpack a judgment).
THOUGHT_HARM = ("self_harm_thought", "Thoughts of hurting myself or not being here")
# The feeling, led by the moment's side (grid words as guesses).
FEEL_GOOD = ["happy", "content", "calm", "thankful", "proud", "loving", "relaxed", "excited", "hopeful", "peaceful"]
FEEL_HARD = ["sad", "anxious", "angry", "hurt", "frustrated", "embarrassed", "lonely", "disappointed", "guilty", "ashamed"]
FEEL_MID = ["calm", "tired", "bored", "interested", "content", "anxious", "frustrated", "confused", "thoughtful"]
FEEL_OF = {"good": FEEL_GOOD, "hard": FEEL_HARD, "mid": FEEL_MID}
UNSURE = [("unsure", "I can't tell")]
AWARE = [("yes", "Yes"), ("partly", "Partly"), ("later", "Only now")]
# The good bit: Good things' kinds, the same ids, so Me and the Things I like slice name a kept one (THING_OPTION).
KINDS = [
    ("moment", "A moment, or how I felt"),
    ("person", "A person"),
    ("view", "A view"),
    ("sound", "A sound"),
    ("taste", "A taste or smell"),
    ("texture", "Something soft or comfortable"),
    ("colour", "A colour"),
    ("pet", "An animal"),
]
KEEPIT = [("keep", "Keep it"), ("not_now", "Not this time")]

KEPT = EQ("keepit", "keep")
ROUTE_RECOVER = EQ("what", "hurt_by")
ROUTE_STOP = EQ("what", "frightening")
ROUTE_DANGER = EQ("what", "threatened")
THOUGHT_HURT = has("thoughts", "self_harm_thought")
ROUTE_HURT = {"any": [EQ("what", "self_harm"), THOUGHT_HURT]}
CANT_TELL = {"any": [has("unsure", "unsure"), {"not": {"set": a("feel") + ".ids"}}]}


def field(fid, lst, *, mx=1, required=True, own=None, label=None, where=None, extra=None):
    opts = {"list": lst} if isinstance(lst, str) else lst
    if where:
        opts["where"] = where
    f = {"id": fid, "options": opts, "max": mx, "required": required, **(extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    if label:
        f["label"] = label
    return f


def ask(step_id, title, hint, fields, nxt, *, lines=None, extra=None):
    s = {"id": step_id, "kind": "ask", "title": title, "fields": fields, "next": nxt, **(extra or {})}
    # One quiet *Talk to someone now* per screen, on its first field.
    s["fields"][0]["links"] = s["fields"][0].get("links", []) + LINKS
    if hint:
        s["hint"] = hint
    if lines:
        s["lines"] = lines
    return s


def handoff(step_id, title, lines, offers, *, complete=True, crisis=None, links=None):
    s = {"id": step_id, "kind": "handoff", "complete": complete, "lines": lines, "offers": offers, "done": "done",
         "links": LINKS if links is None else links, "noClose": True}
    if title:
        s["title"] = title
    if crisis:
        s["crisis"] = crisis
    return s


ON_SIDE = {"has": ["$opt.v", a("valence")]}
NOT_GOOD = {"not": GOOD}
# Back to the room while taking a hard or in-between moment apart (PRD risk: replay becomes rumination).
ROOM_LINK = {"exit": "five_senses", "label": "back_room", "when": NOT_GOOD}

STEPS = [
    ask("which", "which_title", "which_hint", [field("valence", "valence")],
        [{"when": FLOODED, "to": "heads_up"},
         {"when": {"all": [STIRRED, HARD]}, "to": "heads_up_hard"}, {"to": "what"}]),
    # A carried flooded reading (PRD: not flooded): the body first offered, never a lock.
    ask("heads_up", "heads_up_title", None, [field("heads_up", "heads_up")],
        [{"when": EQ("heads_up", "body"), "to": "body_first"},
         {"when": HARD, "to": "heads_up_hard"}, {"to": "what"}],
        lines=[{"when": ALWAYS, "key": "heads_up_line"}]),
    # A hard moment on a stirred reading (PRD: unpleasant only when settled): a good one instead, the body, or go on.
    ask("heads_up_hard", "heads_up_hard_title", None, [field("heads_up_hard", "heads_up_hard")],
        [{"when": EQ("heads_up_hard", "body"), "to": "body_first"},
         {"when": EQ("heads_up_hard", "good"), "to": "which"}, {"to": "what"}],
        lines=[{"when": ALWAYS, "key": "heads_up_hard_line"}],
        extra={"clears": ["heads_up_hard"]}),
    handoff("body_first", "body_first_title", [{"when": ALWAYS, "key": "body_first_line"}],
            [{"exit": "cool_down", "when": ALWAYS}], complete=False),
    {**ask("what", "what_title", "what_hint", [field("what", "what", own="what_own", where=ON_SIDE)],
           [{"when": ROUTE_HURT, "to": "hurt"}, {"when": ROUTE_DANGER, "to": "danger"},
            {"when": ROUTE_STOP, "to": "stop"}, {"when": ROUTE_RECOVER, "to": "recover"}, {"to": "body"}]),
     "crisis": [{"variant": "crisis", "when": ROUTE_HURT}, {"variant": "other_person", "when": ROUTE_DANGER}]},
    {**handoff("hurt", "hurt_title", [{"when": ALWAYS, "key": "hurt_line"}], [{"exit": "safety_open", "when": ALWAYS}],
               complete=False, links=[], crisis=[{"variant": "crisis", "when": ALWAYS}]),
     "safetyFirst": ALWAYS},
    handoff("stop", "stop_title", [{"when": ALWAYS, "key": "stop_line"}],
            [{"exit": "safety_open", "when": ALWAYS}, {"exit": "five_senses", "when": ALWAYS}],
            complete=False, links=[]),
    handoff("danger", "stop_title", [{"when": ALWAYS, "key": "danger_line"}],
            [{"exit": "safety_open", "when": ALWAYS}, {"exit": "ending_careful", "when": ALWAYS},
             {"exit": "five_senses", "when": ALWAYS}],
            complete=False, links=[], crisis=[{"variant": "other_person", "when": ALWAYS}]),
    handoff("recover", "recover_title", [{"when": ALWAYS, "key": "recover_line"}],
            [{"exit": "recover", "when": ALWAYS}], complete=False),
    ask("body", "body_title", "body_hint",
        [{**field("where", "where", mx=2, required=False, label="where_label"), "links": [ROOM_LINK]},
         field("words", "words", mx=3, required=False, label="words_label", where=ON_SIDE)],
        [{"to": "thoughts"}]),
    {**ask("thoughts", "thoughts_title", "thoughts_hint",
           [{**field("thoughts", "thoughts", mx=2, required=False, where=ON_SIDE), "links": [ROOM_LINK]}],
           [{"when": THOUGHT_HURT, "to": "hurt"}, {"to": "feel"}]),
     "crisis": [{"variant": "crisis", "when": THOUGHT_HURT}]},
    ask("feel", "feel_title", "feel_hint",
        [field("feel", {"emotions": FEEL_MID, "emotionsFrom": "$d.feelFirst", "carriedFirst": True,
                        "moreKey": "feel_more"}, mx=2, required=False, extra={"emotion": True, "links": [ROOM_LINK]}),
         field("unsure", "unsure", required=False, label="unsure_label")],
        [{"to": "aware"}]),
    ask("aware", "aware_title", "aware_hint", [{**field("aware", "aware"), "links": [ROOM_LINK]}],
        [{"when": GOOD, "to": "savour"}, {"to": "end"}]),
    {"id": "savour", "kind": "embed", "embed": "holdRing", "answerAs": "savoured", "title": "savour_title",
     "props": {"variant": "timed", "seconds": 10, "label": "savour_label", "runningLabel": "savour_running",
               "hint": "savour_hint", "doneLabel": "savour_done", "next": "next"},
     # A skipped savour doesn't ask for a good bit to name (anhedonia: nothing found is a full answer).
     "links": LINKS, "next": [{"when": EQ("savoured", "skipped"), "to": "end"}, {"to": "keep"}]},
    # Keep (R4) on *Keep it*: that tap is the yes (C2.2). Into ER's Things I like (PRD: MF-07 sends to ER-04).
    ask("keep", "keep_title", "keep_hint",
        [field("kind", "kind", own="keep_own"), field("keepit", "keepit", label="keepit_label")],
        [{"to": "end"}],
        extra={"keep": {"kind": "thing_i_like", "many": True, "when": KEPT, "from": ["kind"]},
               "primary": "keep_primary"}),
    handoff("end", [{"when": {"all": [GOOD, KEPT]}, "key": "end_good_kept"}, {"when": GOOD, "key": "end_good"},
                    {"when": HARD, "key": "end_hard"}, {"when": ALWAYS, "key": "end_mid"}],
            [{"when": EQ("aware", "yes"), "key": "end_aware_yes"}, {"when": EQ("aware", "partly"), "key": "end_aware_partly"},
             {"when": ALWAYS, "key": "end_aware_later"}],
            [{"exit": "good_things", "when": GOOD},
             {"exit": "find_the_feeling", "when": CANT_TELL},
             {"exit": "unpack", "when": {"all": [HARD, has("thoughts", "me")]}},
             {"exit": "five_senses", "when": HARD}]),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body (a carried flooded reading)
    {"id": "recover", "toolId": "recovering-from-invalidation", "label": "recover_offer"},  # WMP: hurt by someone
    {"id": "five_senses", "toolId": "five-senses", "label": "back_room"},  # back to the room after a frightening moment
    {"id": "good_things", "toolId": "good-things", "label": "more_label"},          # ER-04: more of this (the plan)
    {"id": "find_the_feeling", "toolId": "find-the-feeling", "label": "ftf_label"},  # the word, when it was hard to tell
    {"id": "unpack", "toolId": "unpack-a-judgment", "label": "unpack_label"},       # MF-03: a thought about me, hard moment
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}, "label": "ending_careful"},  # IE-08
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6): on every screen
    {"id": "done", "done": True},
]


def options():
    out = [("valence", v, label, {}, "MomentValence") for v, label in VALENCE]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("heads_up_hard", v, label, {}, None) for v, label in HEADS_UP_HARD]
    out += [("what", v, label, {"v": sides}, "MomentPrompt") for v, label, sides in WHAT]
    out += [("what", v, label, {"v": ["hard", "mid"], **props}, None) for v, label, props in ROUTES]
    out += [("where", rid, BM.REGION_NAMES[rid][0], {}, ("BodyRegion", rid)) for rid in WHERE]
    out += [("where", NOTHING_WHERE[0], NOTHING_WHERE[1], {}, None)]
    labels = {w[0]: w[1] for w in BM.PAD_WORDS}
    out += [("words", sid, labels[sid], {"v": sides}, ("SensationType", sid)) for sid, sides in BODY_WORDS]
    out += [("words", NO_WORDS[0], NO_WORDS[1], {"v": ["good", "hard", "mid"]}, None)]
    out += [("thoughts", v, label, {"v": ["good", "hard", "mid"]}, "MomentPrompt") for v, label in THOUGHTS]
    out += [("thoughts", THOUGHT_HARM[0], THOUGHT_HARM[1], {"v": ["hard", "mid"], "danger": "self"}, None)]
    out += [("unsure", v, label, {}, None) for v, label in UNSURE]
    out += [("aware", v, label, {}, None) for v, label in AWARE]
    out += [("kind", v, label, {}, None) for v, label in KINDS]
    out += [("keepit", v, label, {}, None) for v, label in KEEPIT]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "which", "ownMax": OWN_MAX,
    # band: a carried flooded or stirred reading (C6.2).
    "accepts": ["band"],
    "copy": COPY,
    "tables": {"feelOf": FEEL_OF},
    "derive": [{"name": "feelFirst", "from": a("valence"), "table": "feelOf"}],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"],
}
