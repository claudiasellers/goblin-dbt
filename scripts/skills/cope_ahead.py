"""Cope Ahead (DBT ER Handout 19) on the skill runtime: the port of the hand-built page (ER-05, batch ER-B2).

docs/design/cope-ahead.md is the design (and its *On the skill runtime* section every departure from the hand-built
page); docs/design/dbt-modules-plan.md §2.3 the batch. The content stays Cope Ahead's own (scripts/cope-ahead/
content.py → schema/cope-ahead.cypher, shipped as cope-ahead.json): the situations, the hardest moments, the moves and
the screen copy are read from there, and every option keeps a PRESENTS edge to the node it shows. So:

- **One plan sentence.** The embeds (`planSentence`, `rehearsal`, `keepCard`) compose it with `planLine` from the
  run's answers, as the after card and Me do from the stored ids: never a stored string.
- **The visit's record.** `ext.run`, plus `ext.ca` written from it at close by the projection
  (functions/src/skills/projections.ts), so the after card, the part tag, Reflect and stats read what they read.
- **Keep** (R4) is the keep step's *Keep this* chip, kept as `cope_ahead_plan` (Me, My plans), no longer an own line;
  *Want me to ask how it went?* schedules `cope_ahead_after` (R5) from screen 1's *When is it?*.
- **Safety.** A danger moment shows CrisisBanner compact on the moment and plan screens (`other_person` for *They
  might hurt me*, the default for *I might hurt myself*), and its move is listed first, never pre-selected. The flow
  goes on.
- **Parts on**, with a kept part: *Who might show up there?* (parts copy, as the screen's question) and the part's
  anchor under the plan (DEAR MAN's setPartAnchor). The link's part (`?partId=`) comes first, never pre-selected.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import importlib.util
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(_ROOT, rel))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


CA = _load("cope_ahead_content", "scripts/cope-ahead/content.py")
FTF = _load("ftf_content", "scripts/find-the-feeling/content.py")

ID = "cope_ahead"
TOOL_ID = "cope-ahead"
CONCEPT = "dbt_cope_ahead"
VERSION = "ca-skill-v1"
OWN_MAX = CA.OWN_MAX            # the situation and the hardest moment (140)
MOVE_OWN_MAX = CA.MOVE_OWN_MAX  # a move (90)
# *Once more*'s twist and its changed moves are rehearsed once and never kept: shorter boxes, so the visit's
# longest record fits ext's 6 KB (the hand-built page used the moment's and the move's caps).
TWIST_OWN_MAX = 90
NEW_MOVE_OWN_MAX = 60

# The screens' words are Cope Ahead's own (cope-ahead.json's copy), by the same keys.
FLOW_KEYS = [
    "what_title", "what_own_hint", "when_title", "when_today", "when_tomorrow", "when_week", "when_later",
    "feel_title", "feel_hint", "feel_more", "pull_title", "not_sure", "moment_title", "moment_own_hint",
    "plan_title", "plan_use_pull", "plan_own_hint", "rehearse_again_q", "rehearse_again_yes", "rehearse_again_no",
    "rehearse_new_problem", "rehearse_keep_move", "rehearse_change_move", "settle_title", "settle_breath",
    "settle_five", "settle_ok", "settle_hold", "settle_hold_hint", "keep_title", "keep_yes", "keep_no",
    "ask_after_q", "ask_after_yes", "ask_after_no", "done",
]
COPY = {k: CA.COPY[k] for k in FLOW_KEYS}
COPY.update({
    # The runtime's own: the hold's button and running line, Next, the end card.
    "next": "Next",
    "hold_label": "Hold",
    "hold_running": "Breathe out, slowly",
    "safety_open": "Talk to someone now",
    "done_kept": "Your plan is in Me, under My plans.",
    "done_line": "You've walked through it, start to finish.",
    # A part with no name, in the parts step's chips (the parts copy's own wording).
    "profile_unnamed": "One you haven't named",
})

SITUATIONS = CA.SITUATIONS            # (id, label, afterName, likelyFeelings, hardMoments)
SIT_IDS = [s[0] for s in SITUATIONS]
NAMED = [s for s in SIT_IDS if s != "other"]  # own words with no chip are "Something else"
PULLS = [u[0] for u in FTF.URGES]
DANGER = {"might_hurt": "other", "might_hurt_self": "self"}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
# The situation the moments and feelings are for: a chip, or own words alone (then "Something else").
IS_OTHER = {"not": {"in": [a("situation"), NAMED]}}
FOR_SITUATION = {"any": [{"has": ["$opt.sits", a("situation")]}, {"all": [IS_OTHER, {"has": ["$opt.sits", "other"]}]}]}
PULL_PICKED = {"in": [a("pull"), PULLS]}
# A move shows for its situations only (empty: every situation), and for the pull picked (else the general ones).
MOVE_FITS = {"all": [
    {"any": [{"not": {"set": "$opt.sits"}}, {"has": ["$opt.sits", a("situation")]}]},
    {"any": [{"all": [PULL_PICKED, {"has": ["$opt.pulls", a("pull")]}]}, {"all": [{"not": PULL_PICKED}, {"eq": ["$opt.general", True]}]}]},
]}
# The danger moment's own move, or the moves that fit (a danger move never shows anywhere else). For a danger
# moment, only the moves Cope Ahead's content names safe for it (`DANGER_SAFE_MOVES`, the option's `safeIn`).
DANGER_IDS = list(DANGER)
MOVE_WHERE = {"any": [{"has": ["$opt.forMoments", a("moment")]}, {"all": [
    {"not": {"set": "$opt.forMoments"}}, MOVE_FITS,
    {"any": [{"not": {"in": [a("moment"), DANGER_IDS]}}, {"has": ["$opt.safeIn", a("moment")]}]}]}]}
# *I might hurt myself*: *Talk to someone now* (safety.open, C6.5) as a quiet link under the moment and the plan.
SELF_HARM = {"eq": [a("moment"), "might_hurt_self"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": SELF_HARM}
# *Once more*: another of the situation's moments (never the plan's, never danger: that list has none).
NEW_MOMENT_WHERE = {"all": [FOR_SITUATION, {"not": {"eq": ["$opt.value", a("moment")]}}]}
CRISIS = [{"variant": "other_person", "when": {"eq": [a("moment"), "might_hurt"]}},
          {"variant": "crisis", "when": {"eq": [a("moment"), "might_hurt_self"]}}]
PLAN_FIELDS = {"momentField": "moment", "movesField": "moves", "forpullField": "forpull", "pullField": "pull"}


# What might show up there: the situation's likely feelings (a lookup by screen 1's pick); a situation in the
# person's own words, or none, gets *Something else*'s list. One field, so one answer in the record.
FEEL_BY_SITUATION = {sid: feels for sid, _, _, feels, _ in SITUATIONS}
FEEL_OTHER = FEEL_BY_SITUATION["other"]
FEEL_FIELD = {"id": "feel", "options": {"emotions": FEEL_OTHER, "emotionsFrom": "$d.feelFor", "moreKey": "feel_more"},
              "max": 2, "swap": True}


# Step ids are four letters at most (the moment's step is `hard`, *Once more* is `more` → `new` → `redo`, settle is
# `calm`): the path is in the record, and its worst case must fit ext's 6 KB. Field ids keep their names.
STEPS = [
    {
        "id": "what", "kind": "ask", "title": "what_title",
        "fields": [
            {"id": "situation", "options": {"list": "situation", "firstFrom": "$ctx.situationId"}, "max": 1, "required": True,
             "own": {"hint": "what_own_hint", "countsAsPick": True}},
            {"id": "when", "label": "when_title", "options": {"list": "when"}, "max": 1},
        ],
        "next": [{"to": "feel"}],
    },
    {
        "id": "feel", "kind": "ask", "title": "feel_title", "hint": "feel_hint",
        "fields": [FEEL_FIELD, {"id": "pull", "label": "pull_title", "options": {"list": "pull"}, "max": 1}],
        # Parts on, with a kept part: who might show up (the parts slice is empty with parts off).
        "next": [{"when": {"set": "$p.parts"}, "to": "who"}, {"to": "hard"}],
    },
    {
        "id": "who", "kind": "ask",
        "slots": [{"after": "$title", "embed": "partsLine", "props": {"promptId": "cope_title_any", "as": "heading"},
                   "showWhen": ALWAYS, "record": "parts_title"}],
        "fields": [{"id": "part", "options": {"profile": "parts", "firstFrom": "$ctx.partId"}, "max": 1}],
        "next": [{"to": "hard"}],
    },
    {
        "id": "hard", "kind": "ask", "title": "moment_title", "crisis": CRISIS,
        "fields": [{"id": "moment", "options": {"list": "moment", "where": FOR_SITUATION}, "max": 1, "required": True,
                    "own": {"hint": "moment_own_hint", "countsAsPick": True}, "links": [SAFETY_LINK]}],
        "next": [{"to": "plan"}],
    },
    {
        "id": "plan", "kind": "ask", "title": "plan_title", "crisis": CRISIS,
        "slots": [
            {"after": "$title", "embed": "planSentence", "props": PLAN_FIELDS, "showWhen": ALWAYS, "record": "plan_line"},
            {"after": "moves", "embed": "partAnchor", "props": {"partField": "part"}, "showWhen": {"set": a("part")}, "record": "part_anchor"},
        ],
        "fields": [
            # The "If": the moment, or (a chip, pressed) the pull.
            # Never for a danger moment: the plan must say what it is for.
            {"id": "forpull", "options": {"list": "forpull"}, "max": 1,
             "showWhen": {"all": [PULL_PICKED, {"not": {"in": [a("moment"), DANGER_IDS]}}]}},
            {"id": "moves", "options": {"list": "move", "where": MOVE_WHERE}, "max": 2, "swap": True, "required": True,
             "own": {"hint": "plan_own_hint", "countsAsPick": True, "max": MOVE_OWN_MAX}, "links": [SAFETY_LINK]},
        ],
        "next": [{"to": "walk"}],
    },
    {
        "id": "walk", "kind": "embed", "embed": "rehearsal", "links": [SAFETY_LINK], "answerAs": "rehearsed", "crisis": CRISIS,
        "props": {**PLAN_FIELDS, "pass": 1},
        "next": [{"to": "more"}],
    },
    {
        "id": "more", "kind": "ask", "title": "rehearse_again_q",
        "fields": [{"id": "again", "options": {"list": "again"}, "max": 1, "required": True}],
        "next": [{"when": {"eq": [a("again"), "yes"]}, "to": "new"}, {"to": "calm"}],
    },
    {
        "id": "new", "kind": "ask", "title": "rehearse_new_problem",
        "fields": [
            {"id": "new_moment", "options": {"list": "new_moment", "where": NEW_MOMENT_WHERE}, "max": 1, "required": True,
             "own": {"hint": "moment_own_hint", "countsAsPick": True, "max": TWIST_OWN_MAX}},
            {"id": "change_move", "options": {"list": "change_move"}, "max": 1, "required": True, "showWhen": {"set": a("new_moment")}},
            {"id": "new_moves", "options": {"list": "new_move", "where": MOVE_FITS}, "max": 2, "swap": True, "required": True,
             "own": {"hint": "plan_own_hint", "countsAsPick": True, "max": NEW_MOVE_OWN_MAX},
             "showWhen": {"eq": [a("change_move"), "change"]}},
        ],
        "next": [{"to": "redo"}],
    },
    {
        "id": "redo", "kind": "embed", "embed": "rehearsal", "links": [SAFETY_LINK], "answerAs": "rehearsed2", "crisis": CRISIS,
        "props": {"momentField": "new_moment", "movesField": "moves", "pullField": "pull", "pass": 2,
                  "changeField": "change_move", "changedMovesField": "new_moves"},
        "next": [{"to": "calm"}],
    },
    {
        # The handout's relaxation step, never skipped silently: *I'm OK* is a choice. 5-4-3-2-1 leaves with the plan saved.
        "id": "calm", "kind": "ask", "title": "settle_title", "complete": True,
        "fields": [{"id": "settle", "options": {"list": "settle"}, "max": 1, "required": True,
                    "links": [{"exit": "five_senses", "label": "settle_five", "when": ALWAYS}]}],
        "next": [{"when": {"eq": [a("settle"), "breath"]}, "to": "hold"}, {"to": "keep"}],
    },
    {
        "id": "hold", "kind": "embed", "embed": "holdRing", "answerAs": "breath", "title": "settle_hold",
        "props": {"variant": "settle", "seconds": 6, "holds": 3, "label": "hold_label", "hint": "settle_hold_hint",
                  "runningLabel": "hold_running", "next": "next"},
        "next": [{"to": "keep"}],
    },
    {
        # The plan on the paper; *Keep this* is the one primary and the yes (R4), *Not now* a quiet way on.
        "id": "keep", "kind": "ask", "title": "keep_title", "crisis": CRISIS,
        "slots": [{"after": "$title", "embed": "keepCard", "props": {**PLAN_FIELDS, "partField": "part"}, "showWhen": ALWAYS, "record": "plan_card"}],
        "keep": {"kind": "cope_ahead_plan", "many": True, "from": ["situation", "moment", "forpull", "pull", "moves"],
                 "done": "done_kept"},
        "primary": "keep_yes", "secondary": "keep_no",
        "next": [{"to": "ask"}],
    },
    {
        # Then, kept or not: *Want me to ask how it went?* (R5), at screen 1's when (*Later, or not sure* if unanswered,
        # as the hand-built page did). The keep's confirmation shows above it.
        "id": "ask", "kind": "ask", "title": "ask_after_q", "crisis": CRISIS,
        "fields": [{"id": "ask", "options": {"list": "ask"}, "max": 1, "required": True}],
        "followUp": {"type": "cope_ahead_after", "whenFrom": "when", "whenDefault": "later", "when": {"eq": [a("ask"), "yes"]}},
        "primary": "done",
        "next": [{"to": "end"}],
    },
    {
        "id": "end", "kind": "handoff", "complete": True,
        "lines": [{"when": ALWAYS, "key": "done_line"}],
        "offers": [], "done": "done",
    },
]

EXITS = [
    {"id": "five_senses", "toolId": "five-senses"},   # settle with 5-4-3-2-1 (the plan already saved)
    {"id": "safety_open", "safety": True},             # *Talk to someone now* on *I might hurt myself* (C6.5)
    {"id": "done", "done": True},
]


def options():
    out = [("situation", sid, label, {}, ("CopeSituation", sid)) for sid, label, *_ in SITUATIONS]
    out += [("when", w, CA.COPY[key], {}, None) for w, key in CA.WHEN]
    out += [("pull", u[0], u[1], {}, ("FeelingUrge", u[0])) for u in FTF.URGES]
    out.append(("pull", "not_sure", CA.COPY["not_sure"], {}, None))
    sits_of = {m: [s[0] for s in SITUATIONS if m in s[4]] for m, *_ in CA.HARD_MOMENTS}
    for mid, label, _ in CA.HARD_MOMENTS:
        extra = {"sits": sits_of[mid], **({"danger": DANGER[mid]} if mid in DANGER else {})}
        out.append(("moment", mid, label, extra, ("HardMoment", mid)))
        if mid not in DANGER:
            out.append(("new_moment", mid, label, {"sits": sits_of[mid]}, ("HardMoment", mid)))
    out.append(("forpull", "pull", CA.COPY["plan_use_pull"], {}, None))
    # A danger moment's own move first (it shows only for that moment), then the rest in Cope Ahead's order.
    moves = sorted(CA.MOVES, key=lambda m: 0 if m[7] else 1)
    for mid, kind, label, _line, pulls, general, tool, for_moments, for_sits in moves:
        safe_in = [d for d, ms in CA.DANGER_SAFE_MOVES.items() if mid in ms]
        extra = {"kind": kind, "pulls": pulls, "general": general, "forMoments": for_moments, "sits": for_sits,
                 "safeIn": safe_in, **({"tool": tool} if tool else {})}
        out.append(("move", mid, label, extra, ("CopeMove", mid)))
        if not for_moments:
            out.append(("new_move", mid, label, extra, ("CopeMove", mid)))
    out += [("again", "yes", CA.COPY["rehearse_again_yes"], {}, None), ("again", "no", CA.COPY["rehearse_again_no"], {}, None)]
    out += [("change_move", "keep", CA.COPY["rehearse_keep_move"], {}, None),
            ("change_move", "change", CA.COPY["rehearse_change_move"], {}, None)]
    out += [("settle", "breath", CA.COPY["settle_breath"], {}, None), ("settle", "ok", CA.COPY["settle_ok"], {}, None)]
    out += [("ask", "yes", CA.COPY["ask_after_yes"], {}, None), ("ask", "no", CA.COPY["ask_after_no"], {}, None)]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "what", "ownMax": OWN_MAX,
    "accepts": ["situationId", "partId"],
    "copy": COPY, "tables": {"feelBySituation": FEEL_BY_SITUATION},
    "derive": [{"name": "feelFor", "from": "$a.situation", "table": "feelBySituation", "default": FEEL_OTHER}], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": ["feel"],
}
