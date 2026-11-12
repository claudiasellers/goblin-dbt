"""Notice them (IE-10; mindfulness of others, DBT IE Handout 12: observe, describe, participate, with curiosity and
without judging) as a skill on the runtime, under the new `mindfulness-of-others` tool id. Part 1 of IE-10. Spec:
docs/design/notice-them.md.

The moment (PRD IE-10): "I was sure they meant it." "I don't really listen, I'm planning my comeback." Calm-time
practice, before a conversation, or the day after a misunderstanding (never while flooded).

The page (src/pages/tools/NoticeThem.tsx) asks who first (PersonPicker, people.md, D4): someone on the safety route gets
the safety screen and never this skill (PRD: noticing danger signs is the right kind of attention with someone who
isn't safe). *Someone new* with no name is the PRD's *someone I'll see today*.

Steps:
  way          what would help with them? (one tap): notice them next time (observe) · look again at something that
               happened (describe) · do one thing with them fully (participate). `?situationId=` puts one first
               (the debrief after *they got defensive*, and *I couldn't*: look again). A carried flooded
               reading doesn't get *look again* (PRD: never while flooded; Recover owns the acute path).
  notice       observe: one thing to notice next time, with curiosity (their face, what they care about right now,
               how they're doing, …). Curiosity, not checking on them (the hypervigilance guard).
  fully        participate: one thing to do with them fully, no phone, going with it.
  when         when you'll see them, and *Want me to ask how it went?* (`notice_back`).
  set          the practice, and *notice yourself too* (the PRD's closing cue).
  back         the `notice_back` card reopens the run here (R9): *Did you get to notice them?* / *Did you get to do
               it?* yes · I forgot · I couldn't · we didn't see each other.
  noticed      yes: what did you notice? (optional) → noticed_end.
  again        forgot or didn't see them: another go (a new card) or leave it. couldn't → couldnt (a real answer;
               look again at what happened, offered).
  did          describe: what did they actually say or do? What a camera would catch (up to three, own words).
  added        and what did you add? The meaning you put on it (up to three, own words; *Nothing, I took it as it
               was* is an answer).
  sure         how sure are you of what you added? sure · think so · not sure. Sure goes to `trust` (PRD: never asks
               the person to doubt themselves), and so does *Nothing*.
  not_knowing  think so / not sure: what might have been going on for them? (one pick; a guess). *They meant to hurt
               me* is always a valid answer and goes to `harm_seen` (FAST's Let go, Recover), never to more empathy.
  columns      the two columns on paper (`twoColumns`): what they did, what I added, and the maybe line.
  end          holding it a bit looser; One message offered.
  trust        the two columns, then trust_end: you saw it; you don't need to talk yourself out of it.

Departures (docs/design/notice-them.md lists them): the columns are two picks, not a pile sort of the episode's chips
dealt one at a time (no episode record to deal from); no THINK line (the PRD's open question; adult app); no MF
runtime cap of one a day and no fade (MF's runtime doesn't exist yet); no `OthersPractice` / `NotKnowingOption` nodes
(the skill's options); no *their side* in DEAR MAN's prep (one more exit takes its worst-case record past ext's 4 KB).

Safety (plan C6): *Talk to someone now* on every screen.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "notice_them"
TOOL_ID = "mindfulness-of-others"
CONCEPT = "dbt_mindfulness_of_others"
VERSION = "nt-v1"
OWN_MAX = 60  # a thing they did, in a few words


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def has(field, v):
    return {"has": [a(field) + ".ids", v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
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
    "picker_personWhoNotice": "Who's it about?",
    # PRD IE-10 safety: never a practice in seeing the best in someone who isn't safe.
    "picker_safetyRouteNoticeHeading": "With {who}, noticing danger signs is the right kind of attention. Your safety comes first.",
}

COPY = {
    "way_title": "What would help with them?",
    "way_hint": "Curiosity, not checking on them.",
    "way_flooded": "Looking again at what happened works better once your body settles. The other two are here now.",
    "cool_down": "Settle my body first",
    # --- Observe ---
    "notice_title": "Next time you're with them, notice one thing with curiosity.",
    "notice_hint": "Not checking whether they're upset. Noticing them, the way you'd notice weather.",
    # --- Participate ---
    "fully_title": "Pick one thing to do with them fully.",
    "fully_hint": "No phone, and go with it. If your mind drifts, come back to them.",
    "when_title": "When will you see them?",
    "remind_label": "Want me to ask how it went?",
    "set_title": "That's the practice.",
    "set_remind": "I'll ask how it went. Notice yourself too: how you are when you look at them this way.",
    "set_line": "Notice yourself too: how you are when you look at them this way.",
    # The notice_back card reopens the run here.
    "back_title_notice": "Did you get to notice them?",
    "back_title_fully": "Did you get to do it fully?",
    "noticed_title": "What did you notice?",
    "noticed_hint": "Anything counts, including about yourself.",
    "noticed_end_title": "That's mindfulness of someone else.",
    "noticed_end_line": "Attention with curiosity, off the phone. It gets easier with practice.",
    "again_title": "That's part of practising. Another go?",
    "again_when_label": "When will you see them next?",
    "again_set_line": "I'll ask again then.",
    "leave_line": "It'll keep. Come back to it any time.",
    "couldnt_title": "That's a real answer.",
    "couldnt_line": "Some days it's too much to be curious about someone. Looking again at what happened can help.",
    # --- Describe: the two columns ---
    "did_title": "What did they actually say or do?",
    "did_hint": "What a camera would have caught.",
    "added_title": "And what did you add?",
    "added_hint": "The meaning you put on it. Most of us add something.",
    "sure_title": "How sure are you of what you added?",
    "not_knowing_title": "What might have been going on for them?",
    "not_knowing_hint": "A guess. You can't know for sure, and that's allowed.",
    "columns_title": "What happened, and what you added.",
    "columns_hint": "Notice yourself too: how is it to see them side by side?",
    "col_did": "What they did",
    "col_added": "What I added",
    "col_maybe": "Maybe",
    "end_title": "Two columns.",
    "end_line_unsure": "Not knowing leaves room. Holding it a bit looser can make the next conversation easier.",
    "end_line": "Holding your reading a bit looser can make the next conversation easier.",
    "harm_title": "That's a real answer.",
    "harm_line": "You don't have to find a kinder reading. Looking after yourself with them comes first.",
    "trust_end_title": "You saw what happened.",
    "trust_end_line": "You don't need to talk yourself out of it.",
    "trust_end_nothing": "You took it as it was. That's the practice.",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
    **PICKER_COPY,
}

WAY = [
    ("notice", "Notice them next time I'm with them", False),
    ("look_again", "Look again at something that happened", True),
    ("fully", "Do one thing with them fully", False),
]
NOTICE = [
    ("face", "Their face"),
    ("cares", "What they care about right now"),
    ("doing", "How they're doing"),
    ("good_at", "Something they're good at"),
    ("new", "Something I hadn't noticed before"),
]
FULLY = [
    ("meal", "A meal"),
    ("walk", "A walk"),
    ("talk", "A conversation"),
    ("watch", "Watching something together"),
    ("their_thing", "Something they like doing"),
]
WHEN = [("today", "Later today"), ("tomorrow", "Tomorrow"), ("few_days", "In a few days"), ("this_week", "Sometime this week")]
REMIND = [("yes", "Yes")]
BACK = [("yes", "Yes"), ("forgot", "I forgot"), ("couldnt", "I couldn't"), ("not_seen", "We didn't see each other")]
NOTICED = [
    ("seemed_tired", "They seemed tired or busy"),
    ("seemed_glad", "They seemed glad to see me"),
    ("something_new", "Something new about them"),
    ("what_matters", "What matters to them"),
    ("calmer", "I was calmer around them"),
]
AGAIN = [("new_time", "Pick a new time"), ("leave", "Leave it for now")]
# What a camera would catch (H12 describe: facts, no interpretation).
DID = [
    ("short", "Said something short or sharp"),
    ("no_reply", "Didn't reply, or replied late"),
    ("interrupted", "Interrupted me"),
    ("loud", "Raised their voice"),
    ("said_no", "Said no"),
    ("forgot", "Forgot something"),
    ("phone", "Looked at their phone"),
    ("criticised", "Criticised something"),
    ("left", "Walked away"),
]
# What I added (the meaning, not the facts).
ADDED = [
    ("dont_care", "They don't care"),
    ("angry", "They're angry with me"),
    ("on_purpose", "They did it on purpose"),
    ("think_less", "They think less of me"),
    ("always", "It's always like this"),
    ("pulling_away", "They're pulling away"),
    ("nothing", "Nothing. I took it as it was"),
]
SURE = [("sure", "Sure"), ("think_so", "I think so"), ("not_sure", "Not sure")]
# The not-knowing card (PRD IE-10). *They meant to hurt me* is always valid; it never routes to more empathy.
NOT_KNOWING = [
    ("tired", "They were tired"),
    ("stressed", "They were stressed about something else"),
    ("didnt_notice", "They didn't notice"),
    ("disagrees", "They see it differently"),
    ("defensive", "They felt defensive"),
    ("meant_harm", "They meant to hurt me"),
    ("dont_know", "I don't know"),
]

# Nothing, and nothing else: picking *Nothing* with something else is read as the something else.
ADDED_NOTHING = {"all": [has("added", "nothing"),
                         {"not": {"any": [has("added", v) for v, _ in ADDED if v != "nothing"]}},
                         {"not": {"set": a("added") + ".own"}}]}


def ask(sid, title, hint, fields, nxt, **extra):
    # *Talk to someone now* on every screen: an ask step's links live on a field, the last, so they sit below the form.
    last = fields[-1]
    fields = [*fields[:-1], {**last, "links": [*last.get("links", []), SAFETY_LINK]}]
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


def handoff(sid, title, lines, offers, *, no_close=False, **extra):
    s = {"id": sid, "kind": "handoff", "complete": True, "title": title, "lines": lines, "offers": offers,
         "done": "done", "next": [], "links": [SAFETY_LINK], **extra}
    if no_close:
        s["noClose"] = True
    return s


COLUMNS_PROPS = {"left": "did", "right": "added", "leftLabel": "col_did", "rightLabel": "col_added", "next": "next"}

STEPS = [
    ask("way", "way_title", None,
        [field("way", "way", where={"any": [{"not": FLOODED}, {"eq": ["$opt.calm", False]}]},
               first="$ctx.situationId", links=[{"exit": "cool_down", "label": "cool_down", "when": FLOODED}])],
        [{"when": is_("way", "look_again"), "to": "did"}, {"when": is_("way", "fully"), "to": "fully"}, {"to": "notice"}],
        lines=[{"when": FLOODED, "key": "way_flooded"}, {"when": ALWAYS, "key": "way_hint"}]),
    # --- Observe and participate: one off-phone practice, checked when the person said ---
    ask("notice", "notice_title", "notice_hint", [field("notice_what", "notice")], [{"to": "when"}]),
    ask("fully", "fully_title", "fully_hint", [field("fully_what", "fully", own="own_words")], [{"to": "when"}]),
    ask("when", "when_title", None,
        [field("when", "when"), field("remind", "remind", required=False, label="remind_label")],
        [{"to": "set"}],
        followUp={"type": "notice_back", "whenFrom": "when", "when": is_("remind", "yes")}),
    handoff("set", "set_title", [{"when": is_("remind", "yes"), "key": "set_remind"}, {"when": ALWAYS, "key": "set_line"}], []),
    # --- The notice_back card reopens the run here (R9), on a run that reached `when` ---
    ask("back", [{"key": "back_title_fully", "when": is_("way", "fully")}, {"key": "back_title_notice"}], None,
        [field("back", "back")],
        [{"when": is_("back", "yes"), "to": "noticed"}, {"when": is_("back", "couldnt"), "to": "couldnt"}, {"to": "again"}],
        reopens={"after": "when", "again": ["again"]}, clears=["back", "noticed", "again", "again_when"]),
    ask("noticed", "noticed_title", "noticed_hint", [field("noticed", "noticed", mx=2, required=False, own="own_words")],
        [{"to": "noticed_end"}]),
    handoff("noticed_end", "noticed_end_title", [{"when": ALWAYS, "key": "noticed_end_line"}], []),
    ask("again", "again_title", None,
        [field("again", "again"),
         field("again_when", "when", required=True, label="again_when_label", showWhen=is_("again", "new_time"))],
        [{"when": is_("again", "new_time"), "to": "again_set"}, {"to": "leave"}],
        followUp={"type": "notice_back", "whenFrom": "again_when"}),
    handoff("again_set", "set_title", [{"when": ALWAYS, "key": "again_set_line"}], []),
    handoff("leave", "again_title", [{"when": ALWAYS, "key": "leave_line"}], [], no_close=True),
    handoff("couldnt", "couldnt_title", [{"when": ALWAYS, "key": "couldnt_line"}], [{"exit": "look_again", "when": ALWAYS}],
            no_close=True),
    # --- Describe: what they did, what I added (the two columns) ---
    ask("did", "did_title", "did_hint", [field("did", "did", mx=3, own="own_words")], [{"to": "added"}]),
    ask("added", "added_title", "added_hint", [field("added", "added", mx=3, own="own_words")],
        [{"when": ADDED_NOTHING, "to": "trust"}, {"to": "sure"}]),
    ask("sure", "sure_title", None, [field("sure", "sure")],
        [{"when": is_("sure", "sure"), "to": "trust"}, {"to": "not_knowing"}]),
    ask("not_knowing", "not_knowing_title", "not_knowing_hint", [field("not_knowing", "not_knowing")],
        [{"when": is_("not_knowing", "meant_harm"), "to": "harm_seen"}, {"to": "columns"}]),
    {"id": "columns", "kind": "embed", "embed": "twoColumns", "answerAs": "columns_read", "title": "columns_title",
     "hint": "columns_hint", "props": {**COLUMNS_PROPS, "foot": "not_knowing", "footLabel": "col_maybe"},
     "links": [SAFETY_LINK], "next": [{"to": "end"}]},
    handoff("end", "end_title",
            [{"when": {"any": [is_("sure", "not_sure"), is_("not_knowing", "dont_know")]}, "key": "end_line_unsure"},
             {"when": ALWAYS, "key": "end_line"}],
            [{"exit": "one_message", "when": ALWAYS}]),
    # PRD IE-10: *meant to hurt me* is always valid, and routes to FAST's Let go, not to more empathy.
    handoff("harm_seen", "harm_title", [{"when": ALWAYS, "key": "harm_line"}],
            [{"exit": "fast_let_go", "when": ALWAYS}, {"exit": "recover", "when": ALWAYS}], no_close=True),
    # Sure, or nothing added: the columns, and never a question that asks the person to doubt what they saw.
    {"id": "trust", "kind": "embed", "embed": "twoColumns", "answerAs": "columns_read", "title": "columns_title",
     "hint": "columns_hint", "props": COLUMNS_PROPS, "links": [SAFETY_LINK], "next": [{"to": "trust_end"}]},
    handoff("trust_end", "trust_end_title",
            [{"when": ADDED_NOTHING, "key": "trust_end_nothing"}, {"when": ALWAYS, "key": "trust_end_line"}],
            [{"exit": "fast_let_go", "when": {"not": ADDED_NOTHING}}]),
]
COPY["own_words"] = "Something else"

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                                       # DT-01 First, the body (flooded)
    {"id": "look_again", "toolId": "mindfulness-of-others", "query": {"situationId": "look_again", "person": "$ctx.personId"}},
    {"id": "one_message", "toolId": "dear-man", "query": {"mode": "one", "person": "$ctx.personId"}},
    {"id": "fast_let_go", "toolId": "fast", "query": {"frame": "let_go"}},
    {"id": "recover", "toolId": "recovering-from-invalidation"},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    out = [("way", v, label, {"calm": calm}, None) for v, label, calm in WAY]
    out += [("notice", v, label, {}, None) for v, label in NOTICE]
    out += [("fully", v, label, {}, None) for v, label in FULLY]
    out += [("when", v, label, {}, None) for v, label in WHEN]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("back", v, label, {}, None) for v, label in BACK]
    out += [("noticed", v, label, {}, None) for v, label in NOTICED]
    out += [("again", v, label, {}, None) for v, label in AGAIN]
    out += [("did", v, label, {}, None) for v, label in DID]
    out += [("added", v, label, {}, None) for v, label in ADDED]
    out += [("sure", v, label, {}, None) for v, label in SURE]
    out += [("not_knowing", v, label, {}, None) for v, label in NOT_KNOWING]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "way", "ownMax": OWN_MAX,
    # personId: the person picked on the page (or `none`); band: a host's or the carried reading (flooded: no looking
    # again); situationId: which way in comes first (the debrief: look_again).
    "accepts": ["personId", "band", "situationId"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
