"""One message (DBT IE Handouts 5 and 7; PRD IE-01 Mode A, *The Ask*) as a skill on the runtime: `dear_man_one`
under the `dear-man` tool id (IE-B3 second PR, D11: three skills under the one id; docs/design/one-message.md).

  source      where's this coming from? (`wise_mind_check`, MF P2's small check; its first consumer)
  about       what's the message about? something I need · something that happened · something that keeps happening
  fact        what happened, plainly (Describe), as the message's first line
  felt        I felt… (Express); a word Recover carried comes first, never picked for them
  give        a warm line (optional; IE-06's GIVE in one line: "I'm not asking you to agree.")
  ask         would you…? ONE small ask (Assert); asks to be heard are left out after *it tends to go badly*, and a
              person who has turned one down before gets Let go offered beside them (FAST's `?frame=let_go`)
  why         why it matters (Reinforce, optional)
  message     the `messageComposer` card: the message in that order, the FAST strip (*Take the sorry out*), Copy and
              Open messages (the app never sends)
  cool        only when it's coming from a hot place or the body is running hot: read it aloud · hold it (the
              `waitLock` embed) · save it and remind me (`ask_delayed`) · settle my body first · I'm good to send it.
              Sending is never locked
  predict     how will they take it? how sure?
  sent        *Want me to ask how it went?* (`ask_outcome`: the card opens DEAR MAN's debrief)

`ask_delayed`'s card reopens the run at `back` (R9): *Still want to send it?* yes → the message again → predict → sent;
not yet → another reminder; changed my mind → done, accepted flatly.

The page (src/components/tools/dearMan/DearManOne.tsx, `?mode=one`) asks who first (PersonPicker, people.md): someone on
the safety route gets the safety screen and never this skill; *it tends to go badly* comes in as `$ctx.frame =
heads_up`. Recover's *Ask them* with the chase pull opens it with the hurt word (`$ctx.emotionId`) and its band. The
projection (functions/src/dearMan/oneProjection.ts) writes a `DearManSession {type: 'prep', mode: 'one_message'}` so
the debrief finds what was asked.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)

ID = "dear_man_one"
TOOL_ID = "dear-man"
CONCEPT = "dbt_dear_man"
VERSION = "dm-one-v1"
OWN_MAX = 100


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


FLOODED = {"eq": ["$ctx.band", "flooded"]}
HEADS_UP = {"eq": ["$ctx.frame", "heads_up"]}
REFUSED = {"eq": ["$ctx.refused", "validation"]}
# The cooling screen (Wound PRD §4.3 *Cool*): when it's coming from a hot place, or the body is running hot.
HOT = {"any": [{"in": [a("source"), ["hot", "unsure"]]}, {"in": ["$ctx.band", ["stirred", "flooded"]]}]}

PICKER_KEYS = [
    "personWhoOne", "personNew", "personNameLabel", "personNameHint", "personRoleLabel", "personKeepLine", "personNoNameLine",
    "personSignedOutLine", "personGoOn", "personChanged", "personChangedHint", "safeQuestion", "safeYes", "safeNo",
    "safeUnsure", "riskQuestion", "riskHarm", "riskBadly", "riskUnsaid",
    "safetyRouteOneHeading", "safetyRouteBody", "safetyRouteEnding", "safetyRouteBack",
]
PICKER_COPY = {f"picker_{k}": DM.SAFETY_COPY[k] for k in PICKER_KEYS}

COPY = {
    "source_title": "Before you write it: where's this coming from?",
    "source_hint": "Any answer is fine. It only changes what comes after the message.",
    "cool_down": "Settle my body first",
    "about_title": "What's the message about?",
    "about_title_heads_up": "Keep it short, written, and about one thing. What's it about?",
    "fact_title": "What happened? Say it the way a camera would see it.",
    "fact_hint": "Pick the closest, or say it your way.",
    "felt_title": "How did it feel?",
    "felt_hint": "One word is enough.",
    "give_title": "A warm line can help it land. Want one?",
    "give_hint": "Optional.",
    "ask_title": "What's the one thing you're asking for?",
    "ask_hint": "One small ask is often easier to say yes to.",
    "ask_title_heads_up": "What's the one practical thing you're asking for?",
    "let_go": "I've asked them to hear me before. Look at letting this one go",
    "why_title": "Why it matters (optional)",
    "own_line": "In my own words",
    "message_title": "Here's your message.",
    "sorry_line": "There's a sorry in there. Asking for something isn't a wrong. Keep it only if it's for something you did.",
    "drop_sorry": "Take the sorry out",
    "copy": "Copy",
    "copied": "Copied",
    "selected": "Selected. Copy it from here.",
    "open_messages": "Open messages",
    "next": "Next",
    "done": "Done",
    "cool_title": "Your message is put together. Send it now, or give it a little time first?",
    "cool_hint": "Sending is up to you. Messages sent from a hot place tend to land harder than we mean.",
    "wise_title": "Before you send it: ask wise mind.",
    "aloud_title": "Read it out loud once.",
    "aloud_hint": "If a part sounds sharper than you mean, change it once you've pasted it.",
    "wait_title": "Phone down. The message will keep.",
    "wait_waiting": "Put the phone face down and come back when you're ready. Your message is still here.",
    "wait_short": "Waiting",
    "wait_done": "That's the wait. Read it once more and see if it still fits.",
    "wait_done_short": "Done",
    "wait_back": "I'm back",
    "resend_title": "Your message, ready when you are.",
    "later_label": "When do you want the reminder?",
    "later_line": "Pick a time and a reminder brings it back. It won't say who it's for or what it says.",
    "settle_line": "Settle your body first. Pick a time and a reminder brings the message back.",
    "predict_title": "How do you think they'll take it?",
    "sure_label": "How sure are you?",
    "again_label": "Want me to ask how it went?",
    "sent_line": "One message, said once. Give them room to answer.",
    "sent_line_badly": "You're sending it knowing it might not go well. That takes something.",
    # Afterwards: the ask_delayed card reopens the run here (R9)
    "back_title": "Still want to send it?",
    "back_hint": "Whatever you decide is fine.",
    "dropped_line": "You decided not to send it. That's a real choice too.",
    **PICKER_COPY,
}

SOURCE = [
    ("calm", "A calm, clear place"),
    ("hot", "Mostly hurt or angry"),
    ("unsure", "Not sure"),
]
# DEAR MAN's situation types, in the message's words (the projection stores them as the prep's `situationType`, so
# the debrief counts a refused ask to be heard as it does for a prep).
ABOUT = [
    ("ask", "Something I need from them"),
    ("address", "Something that happened"),
    ("pattern", "Something that keeps happening"),
]
# Describe, as the message's first line: facts, no judgements (Handout 5). Each fits the situations it names.
FACTS = [
    ("f_need_help", "I've got a lot on right now", ["ask"]),
    ("f_need_time", "Something's come up that I need time for", ["ask"]),
    ("f_going_through", "I'm going through something hard at the moment", ["ask"]),
    ("f_how_we_do", "We've been doing this the same way for a while", ["ask", "pattern"]),
    ("f_didnt_follow", "You said you'd do something, and it didn't happen", ["address"]),
    ("f_said_hurtful", "Something you said the other day stayed with me", ["address"]),
    ("f_decided", "A decision got made that affects me, without me", ["address"]),
    ("f_told_you", "When I told you how I felt, the conversation moved on", ["address", "pattern"]),
    ("f_keeps", "Something I've asked about before is still happening", ["pattern"]),
    ("f_one_sided", "Lately I've been the one getting in touch first", ["pattern"]),
]
# Express: "I felt…", one word. Ids are the check-in's word ids where there is one, so a word Recover carried comes
# first ($ctx.emotionId, R12), never picked for them.
FELT = [
    ("hurt", "I felt hurt"),
    ("let_down", "I felt let down"),
    ("frustrated", "I felt frustrated"),
    ("excluded", "I felt left out"),
    # Recover's words, said as feelings, not as what the other person meant (Gate 3).
    ("dismissed", "I felt unheard"),
    ("disrespected", "I felt small"),
    ("lonely", "I felt lonely"),
    ("anxious", "I've been anxious about it"),
    ("overwhelmed", "I've been overwhelmed"),
    ("sad", "I felt sad"),
    ("angry", "I felt angry"),
    ("embarrassed", "I felt embarrassed"),
]
# GIVE in one line (IE-06's default first).
GIVE = [
    ("g_not_agree", "I'm not asking you to agree with me", ["ask", "address", "pattern"]),
    ("g_matter", "You matter to me, which is why I'm saying this", ["ask", "address", "pattern"]),
    # Truthful (Handout 7): only for one thing that happened, never offered for a pattern.
    ("g_not_mean", "I'm not assuming you meant it that way", ["address"]),
    ("g_busy", "I know you've got a lot on too", ["ask", "address", "pattern"]),
]
# Assert: ONE small ask. `validation` marks an ask to be heard (left out after *it tends to go badly*, PRD IE-01
# step 0; Let go is offered beside it after a refused one, step 3).
ASKS = [
    ("a_help", "Could you give me a hand with it this week?", ["ask"], False),
    ("a_time", "Could we find a time that works for both of us?", ["ask", "pattern"], False),
    ("a_space", "Could I have a few days before we talk about it?", ["ask", "address"], False),
    ("a_check_first", "Could you check with me before deciding things that affect me?", ["address", "pattern"], False),
    ("a_follow_through", "Could you let me know if plans change?", ["address", "pattern"], False),
    ("a_try_new", "Could we try doing it a different way?", ["ask", "pattern"], False),
    ("a_hear_me", "Could you hear me out when we next talk?", ["address", "pattern"], True),
    ("a_acknowledge", "Could you tell me you get why it mattered to me?", ["address", "pattern"], True),
    ("a_support", "Could you be there for me with this for a bit?", ["ask"], True),
]
WHY = [
    ("w_easier", "It would make things easier between us"),
    ("w_help", "It would help me a lot"),
    ("w_less", "I'd stop carrying it around"),
    ("w_closer", "I'd feel closer to you"),
]
COOL = [
    ("aloud", "Read it out loud first"),
    ("hold", "Hold it for ten minutes"),
    ("later", "Save it and remind me"),
    ("settle", "Settle my body first. Keep the message"),
    ("send", "I'm good to send it"),
    # MF-04's check, inline (MF-B6): the decision is this message; the check hands back its answer, and the waiting
    # stays here (Hold it, Save it and remind me).
    ("wise", "Check it with wise mind first"),
]
# The ask_delayed card's window chips (scripts/practice-spine/content.py ask_delayed).
LATER = [("hour", "In an hour"), ("today", "This evening"), ("tomorrow", "Tomorrow")]
PREDICT = [("well", "Well"), ("mixed", "Mixed"), ("badly", "Badly"), ("no_answer", "They won't answer")]
SURE = [("sure", "Sure"), ("think_so", "Think so"), ("not_sure", "Not sure")]
# The ask_outcome card's window chips (its prep chips without *not sure*).
AGAIN = [("today", "This evening"), ("tomorrow", "Tomorrow"), ("this_week", "In a few days")]
BACK = [("send", "Yes, show me the message"), ("not_yet", "Not yet"), ("dropped", "I've changed my mind")]

ABOUT_WHERE = {"has": ["$opt.about", "$a.about"]}
# After *it tends to go badly*, asks to be heard are left out (practical asks stay).
ASK_WHERE = {"all": [ABOUT_WHERE, {"any": [{"not": HEADS_UP}, {"not": {"eq": ["$opt.validation", True]}}]}]}
COMPOSER = {"parts": ["fact", "felt", "give", "ask", "why"], "field": "ask",
            "sorryLine": "sorry_line", "dropSorry": "drop_sorry", "copyLabel": "copy", "copiedLabel": "copied",
            "selectedLabel": "selected", "openLabel": "open_messages", "next": "next"}

STEPS = [
    {
        "id": "source", "kind": "ask", "title": "source_title", "hint": "source_hint",
        "fields": [{"id": "source", "options": {"list": "source"}, "max": 1, "required": True,
                    "links": [{"exit": "cool_down", "label": "cool_down", "when": FLOODED}]}],
        "next": [{"to": "about"}],
    },
    {
        "id": "about", "kind": "ask", "title": [{"key": "about_title_heads_up", "when": HEADS_UP}, {"key": "about_title"}],
        "fields": [{"id": "about", "options": {"list": "about"}, "max": 1, "required": True}],
        "next": [{"to": "fact"}],
    },
    {
        "id": "fact", "kind": "ask", "title": "fact_title", "hint": "fact_hint",
        "fields": [{"id": "fact", "options": {"list": "fact", "where": ABOUT_WHERE}, "max": 1, "required": True,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 100}}],
        "next": [{"to": "felt"}],
    },
    {
        "id": "felt", "kind": "ask", "title": "felt_title", "hint": "felt_hint",
        "fields": [{"id": "felt", "options": {"list": "felt", "firstFrom": "$ctx.emotionId"}, "max": 1, "required": True,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 40}}],
        "next": [{"to": "give"}],
    },
    {
        "id": "give", "kind": "ask", "title": "give_title", "hint": "give_hint",
        "fields": [{"id": "give", "options": {"list": "give", "where": ABOUT_WHERE}, "max": 1,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 60}}],
        "next": [{"to": "ask"}],
    },
    {
        "id": "ask", "kind": "ask", "title": [{"key": "ask_title_heads_up", "when": HEADS_UP}, {"key": "ask_title"}],
        "hint": "ask_hint",
        "fields": [{"id": "ask", "options": {"list": "ask", "where": ASK_WHERE}, "max": 1, "required": True,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 100},
                    "links": [{"exit": "let_go", "label": "let_go",
                               "when": {"all": [REFUSED, {"in": [a("about"), ["address", "pattern"]]}]}}]}],
        "next": [{"to": "why"}],
    },
    {
        "id": "why", "kind": "ask", "title": "why_title",
        "fields": [{"id": "why", "options": {"list": "why"}, "max": 1,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 60}}],
        # Hot or stirred: the cooling screen comes before the card (and its Copy), never after it.
        "next": [{"when": HOT, "to": "cool"}, {"to": "message"}],
    },
    {
        "id": "message", "kind": "embed", "embed": "messageComposer", "title": "message_title", "answerAs": "sent_how",
        "props": COMPOSER,
        "next": [{"to": "predict"}],
    },
    # --- Cool (Wound PRD §4.3): never a lock; the message stays copyable on every path ---
    {
        "id": "cool", "kind": "ask", "title": "cool_title", "hint": "cool_hint",
        # Settle my body first keeps the message (saved, with a reminder), so settling never costs the draft.
        "fields": [{"id": "cool", "options": {"list": "cool"}, "max": 1, "required": True}],
        "next": [{"when": is_("cool", "aloud"), "to": "aloud"}, {"when": is_("cool", "hold"), "to": "wait"},
                 {"when": {"in": [a("cool"), ["later", "settle"]]}, "to": "later"}, {"when": is_("cool", "wise"), "to": "wise"},
                 {"to": "message"}],
    },
    {
        # MF-04's wise mind check, run inline (R8): which mind is steering, the stone, what comes back. Its answer picks
        # the way on: wait → hold it here; a quiet no → save it and remind me (the draft kept); a yes → the card.
        "id": "wise", "kind": "embed", "embed": "inlineSkill", "title": "wise_title", "answerAs": "wise",
        "props": {"skill": "wise_mind_check", "enterAt": "cues", "ctx": {"situationId": "send", "frame": "hosted", "band": "$ctx.band"}},
        "next": [{"when": {"any": [{"has": ["$a.wise.ids", "unsafe"]}, {"has": ["$a.wise.ids", "no_go"]}]}, "to": "later"},
                 {"when": {"has": ["$a.wise.ids", "wait"]}, "to": "wait"},
                 {"to": "message"}],
    },
    {
        "id": "aloud", "kind": "embed", "embed": "messageComposer", "title": "aloud_title", "hint": "aloud_hint",
        "answerAs": "aloud_how", "props": COMPOSER,
        "next": [{"to": "predict"}],
    },
    {
        "id": "wait", "kind": "embed", "embed": "waitLock", "answerAs": "wait", "title": "wait_title",
        "props": {"minutes": 10, "waiting": "wait_waiting", "waitingShort": "wait_short", "done": "wait_done",
                  "doneShort": "wait_done_short", "next": "wait_back"},
        "next": [{"to": "resend"}],
    },
    {
        "id": "resend", "kind": "embed", "embed": "messageComposer", "title": "resend_title", "answerAs": "resend_how",
        "props": COMPOSER,
        "next": [{"to": "predict"}],
    },
    {
        "id": "later", "kind": "handoff", "complete": True,
        "lines": [{"when": is_("cool", "settle"), "key": "settle_line"}, {"when": None, "key": "later_line"}],
        "fields": [{"id": "later_when", "label": "later_label", "max": 1, "options": {"list": "later"}}],
        "followUp": {"type": "ask_delayed", "whenFrom": "later_when"},
        "offers": [{"exit": "cool_down", "when": is_("cool", "settle")}], "done": "done",
        # The wise mind check's danger flag (it can't be raised from a seeded `send`, but a host branches on it first).
        "crisis": [{"variant": "crisis", "when": {"has": ["$a.wise.ids", "unsafe"]}}],
    },
    {
        "id": "predict", "kind": "ask", "title": "predict_title",
        "fields": [
            {"id": "predict", "options": {"list": "predict"}, "max": 1, "required": True},
        ],
        "next": [{"to": "sure"}],
    },
    # One question a screen (Gate 2): how sure, on its own, and optional.
    {
        "id": "sure", "kind": "ask", "title": "sure_label",
        "fields": [{"id": "sure", "options": {"list": "sure"}, "max": 1}],
        "next": [{"to": "sent"}],
    },
    {
        "id": "sent", "kind": "handoff", "complete": True,
        "lines": [{"when": is_("predict", "badly"), "key": "sent_line_badly"}, {"when": None, "key": "sent_line"}],
        "fields": [{"id": "again", "label": "again_label", "max": 1, "options": {"list": "again"}}],
        "followUp": {"type": "ask_outcome", "whenFrom": "again"},
        "offers": [], "done": "done",
    },
    # --- Afterwards: the ask_delayed card reopens the run here (R9) ---
    {
        "id": "back", "kind": "ask", "reopens": {"after": "later"}, "clears": ["back"],
        "title": "back_title", "hint": "back_hint",
        "fields": [{"id": "back", "options": {"list": "back"}, "max": 1, "required": True}],
        "next": [{"when": is_("back", "not_yet"), "to": "later"}, {"when": is_("back", "dropped"), "to": "dropped"},
                 {"to": "resend"}],
    },
    {
        "id": "dropped", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "dropped_line"}],
        "offers": [], "done": "done",
    },
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "let_go", "toolId": "fast", "query": {"frame": "let_go"}},
    {"id": "done", "done": True},
]


def options():
    out = [("source", v, l, {}, None) for v, l in SOURCE]
    out += [("about", v, l, {}, None) for v, l in ABOUT]
    out += [("fact", v, l, {"about": ab}, None) for v, l, ab in FACTS]
    out += [("felt", v, l, {}, None) for v, l in FELT]
    out += [("give", v, l, {"about": ab}, None) for v, l, ab in GIVE]
    out += [("ask", v, l, {"about": ab, "validation": val}, None) for v, l, ab, val in ASKS]
    out += [("why", v, l, {}, None) for v, l in WHY]
    out += [("cool", v, l, {}, None) for v, l in COOL]
    out += [("later", v, l, {}, None) for v, l in LATER]
    out += [("predict", v, l, {}, None) for v, l in PREDICT]
    out += [("sure", v, l, {}, None) for v, l in SURE]
    out += [("again", v, l, {}, None) for v, l in AGAIN]
    out += [("back", v, l, {}, None) for v, l in BACK]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "source", "ownMax": OWN_MAX,
    "accepts": ["personId", "frame", "band", "emotionId", "refused"], "copy": COPY,
    "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(), "emotionFields": [],
}
