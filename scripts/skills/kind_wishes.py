"""Kind wishes (MF-06 loving-kindness; DBT Mindfulness, loving kindness, Linehan 2015), as a skill on the runtime.

The editable source. The flow is PRD MF-06 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): a strong negative
self-sense with almost no positive one, or hostility after rejection. Loving-kindness practises warmth on purpose,
without needing to feel it. A calm-time practice. The design note is docs/design/kind-wishes.md.

Steps:
  heads_up  a carried flooded reading first (PRD: not offered flooded): *Kind wishes work best on a calmer day.* My body
            first (First, the body, or a hand on the heart in Held) · someone easy, anyway. Never a lock.
  who       *Who will you send kind wishes to?* someone easy to like · someone I saw today and don't know well · me ·
            someone I find difficult · everyone around me right now (the PRD's tiers, in its order; *Someone easy is a
            good place to start.*). A carried stirred reading lists easy, neutral and everyone (PRD: the self and difficult
            tiers when steady), with a line saying so; a flooded one that went on, someone easy only. All tiers are shown
            otherwise (the PRD's own recommendation: suggest easy first, never a lock).
  check     someone difficult: *Has this person hurt you, or could they?* no · yes · not sure. Yes or not sure →
  not_them  *Then not this one. Your safety comes first.* the `other_person` resources, Leaving someone who might hurt me
            (Ending, `frame=careful`), and send them to me or to someone easy instead (PRD risk: never warmth toward
            an unsafe person; Arch Map row 29).
  wishes    *Pick two or three wishes for them / for yourself / for everyone around you.* be safe · be at ease · be looked
            after · rest · be free from this pain, or own words (up to three).
  offer_*   the `wishOffer` embed: each wish on its own (*May you be safe.* · *May I…* · *May everyone around me…*), a tap
            offers it with a slow ring, 20 s each. *The wishes don't need to feel true. Offering them is the practice.*
  came      *What came up?* some warmth · nothing much · sadness · stirred up or angry.
  backdraft sadness or stirred: *That's common. Warmth can wake old hurts. It's called backdraft, and it isn't failure.*
            a hand on my heart (`bodyCard`, the mug alternative) · try someone easier (not from the easy tier) · stop here.
  again     someone easier: the same wishes to someone easy (`offer_again`), then `came_again`; backdraft again →
  twice     *Warmth keeps stirring things up today.* talking it through with someone you trust, starting with someone
            easy next time, a hand on the heart (Held) and someone to talk to now (PRD: two backdraft closes in a row).
  end       *You offered kind wishes. That's the practice.* (reps, never feelings) and the next step out as a suggestion.

*Talk to someone now* (safety.open) is on every screen. Close kind `none`: *What came up?* is the close, in the flow
(`noClose`). A completed visit is a `kind_wishes` rep (the PracticeSkill's `defaultFor`, scripts/practice-spine/content.py),
backdraft or not; the tier, the wishes and what came up are the run's answers (no names: the tier only).
"""

ID = "kind_wishes"
TOOL_ID = "kind-wishes"
CONCEPT = "dbt_loving_kindness"
VERSION = "kw-v1"
OWN_MAX = 40  # a short wish

COPY = {
    "heads_up_title": "Kind wishes work best on a calmer day.",
    "heads_up_line": "Your body's loud right now. Settle it first, or offer them to someone easy.",
    "body_first_title": "Settle your body first.",
    "body_first_line": "Kind wishes will keep for a calmer minute.",
    "who_title": "Who will you send kind wishes to?",
    "who_hint": "Someone easy is a good place to start.",
    "who_stirred": "With things stirred up, someone easy or someone neutral works best today.",
    "who_flooded": "Someone easy, for today.",
    "check_title": "Has this person hurt you, or could they?",
    "check_hint": "Kind wishes are never owed to someone who hurts you.",
    "not_them_title": "Then not this one. Your safety comes first.",
    "not_them_line": "Send the wishes somewhere else today. Support is here if you want it.",
    "wishes_other": "Pick two or three wishes for them.",
    "wishes_self": "Pick two or three wishes for yourself.",
    "wishes_all": "Pick two or three wishes for everyone around you.",
    "wishes_hint": "Pick the ones that sound kind. They don't need to feel true.",
    "wish_own": "My own words",
    "offer_title": "Offer them one at a time.",
    "offer_self_title": "Offer them to yourself, one at a time.",
    "offer_again_title": "Picture someone easy, and offer them the same wishes.",
    "offer_hint": "The wishes don't need to feel true. Offering them is the practice.",
    "line_you": "May you {wish}.",
    "line_me": "May I {wish}.",
    "line_all": "May everyone around me {wish}.",
    "offer_start": "Offer it",
    "offer_running": "Offering",
    "offer_ring_hint": "Tap to offer this wish. The ring fills slowly. Tap again to stop.",
    "offer_done": "All offered.",
    "offer_skip": "Move on",
    "came_title": "What came up?",
    "came_hint": "Any of these is fine.",
    "backdraft_title": "That's common. Warmth can wake old hurts.",
    "backdraft_line": "It's called backdraft, and it isn't failure.",
    "hand_title": "A hand on your heart for a few breaths.",
    "hand_step1": "One hand on your chest, or both hands around a warm mug.",
    "hand_step2": "Notice any warmth in your hand.",
    "hand_step3": "Let your breath move under it, slowly.",
    "hand_start": "Start",
    "hand_running": "Resting here",
    "hand_done": "That's enough for now.",
    "twice_title": "Warmth keeps stirring things up today.",
    "twice_line": "That happens. It's worth talking through with someone you trust. Next time, start with someone easy.",
    "end_title": "You offered kind wishes. That's the practice.",
    "end_line": "Next time, try your own words, or someone one step further out.",
    "end_stopped": "You stopped when it got heavy. That's looking after yourself.",
    "end_easy": "Next time, someone easy again is a good place to start.",
    "body_first": "My body first",
    "hand_offer": "A hand on my heart",
    "ending_careful": "Leaving someone who might hurt me",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


def EQ(field, v):
    return {"eq": [a(field), v]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
STIRRED = {"eq": ["$ctx.band", "stirred"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
LINKS = [SAFETY_LINK]

HEADS_UP = [("body", "My body first"), ("go", "Someone easy, anyway")]
# The PRD's tiers in its order (easy → neutral → you → difficult → everyone). `hideIn`: the bands a tier isn't listed in
# (PRD capacity branching: self and difficult only when steady; flooded, someone easy only).
WHO = [
    ("easy", "Someone easy to like, a friend or a pet", []),
    ("neutral", "Someone I saw today and don't know well", ["flooded"]),
    ("self", "Me", ["stirred", "flooded"]),
    ("difficult", "Someone I find difficult", ["stirred", "flooded"]),
    ("everyone", "Everyone around me right now", ["flooded"]),
]
CHECK = [("no", "No"), ("yes", "Yes"), ("unsure", "I'm not sure")]
INSTEAD = [("self", "Send them to me instead"), ("easy", "Someone easy instead")]
# The PRD's wishes; `phrase` is how the offer says them (the label lower-cased goes into *May you {wish}.*).
WISHES = [
    ("safe", "Be safe"),
    ("ease", "Be at ease"),
    ("cared", "Be looked after"),
    ("rest", "Rest"),
    ("free", "Be free from this pain"),
]
CAME = [("warmth", "Some warmth"), ("nothing", "Nothing much"), ("sad", "Sadness"), ("stirred", "Stirred up or angry")]
STEP_DOWN = [("hand", "A hand on my heart"), ("easier", "Try someone easier"), ("stop", "Stop here")]

# The tier the wishes go to: the pick, or where *not this one* sent them instead.
def tier(v):
    return {"any": [EQ("instead", v), {"all": [{"not": {"set": a("instead")}}, EQ("who", v)]}]}


SELF = tier("self")
EVERYONE = tier("everyone")
EASY = tier("easy")
OTHER = {"all": [{"not": SELF}, {"not": EVERYONE}]}
UNSAFE = {"all": [EQ("who", "difficult"), {"in": [a("check"), ["yes", "unsure"]]}]}
BACKDRAFT = {"in": [a("came"), ["sad", "stirred"]]}
BACKDRAFT_AGAIN = {"in": [a("came_again"), ["sad", "stirred"]]}
LISTED = {"not": {"has": ["$opt.hideIn", "$ctx.band"]}}


def field(fid, lst, *, mx=1, required=True, own=None, label=None, where=None):
    opts = {"list": lst}
    if where:
        opts["where"] = where
    f = {"id": fid, "options": opts, "max": mx, "required": required}
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


def handoff(step_id, title, lines, offers, *, complete=True, crisis=None):
    s = {"id": step_id, "kind": "handoff", "complete": complete, "lines": lines, "offers": offers, "done": "done",
         "links": LINKS, "noClose": True}
    if title:
        s["title"] = title
    if crisis:
        s["crisis"] = crisis
    return s


def offer(step_id, title, line, answer_as, nxt):
    return {"id": step_id, "kind": "embed", "embed": "wishOffer", "answerAs": answer_as, "title": title,
            "hint": "offer_hint",
            "props": {"wishes": "wishes", "line": line, "seconds": 20, "start": "offer_start",
                      "running": "offer_running", "hint": "offer_ring_hint", "done": "offer_done", "next": "next",
                      "skip": "offer_skip"},
            "links": LINKS, "next": nxt}


TO_CAME = [{"to": "came"}]

STEPS = [
    ask("who", "who_title", "who_hint", [field("who", "who", where=LISTED)],
        [{"when": {"all": [FLOODED, {"not": {"set": a("heads_up")}}]}, "to": "heads_up"},
         {"when": EQ("who", "difficult"), "to": "check"}, {"to": "wishes"}],
        lines=[{"when": FLOODED, "key": "who_flooded"}, {"when": STIRRED, "key": "who_stirred"}]),
    # A carried flooded reading (PRD: not offered flooded): the body first, or someone easy anyway. Never a lock.
    ask("heads_up", "heads_up_title", None, [field("heads_up", "heads_up")],
        [{"when": EQ("heads_up", "body"), "to": "body_first"}, {"to": "wishes"}],
        lines=[{"when": ALWAYS, "key": "heads_up_line"}]),
    handoff("body_first", "body_first_title", [{"when": ALWAYS, "key": "body_first_line"}],
            [{"exit": "cool_down", "when": ALWAYS}, {"exit": "held_hand", "when": ALWAYS}], complete=False),
    # Someone difficult (PRD risk: never an abuser; Arch Map row 29, IE `Person.safe`): asked plainly, every time.
    ask("check", "check_title", "check_hint", [field("check", "check")],
        [{"when": UNSAFE, "to": "not_them"}, {"to": "wishes"}]),
    {**ask("not_them", "not_them_title", None,
           [{**field("instead", "instead"),
             "links": [{"exit": "ending_careful", "label": "ending_careful", "when": ALWAYS}]}],
           [{"to": "wishes"}], lines=[{"when": ALWAYS, "key": "not_them_line"}]),
     "crisis": [{"variant": "other_person", "when": ALWAYS}]},
    ask("wishes", [{"when": SELF, "key": "wishes_self"}, {"when": EVERYONE, "key": "wishes_all"},
                   {"when": ALWAYS, "key": "wishes_other"}],
        "wishes_hint", [field("wishes", "wishes", mx=3, own="wish_own")],
        [{"when": SELF, "to": "offer_self"}, {"when": EVERYONE, "to": "offer_all"}, {"to": "offer_other"}]),
    offer("offer_other", "offer_title", "line_you", "offered", TO_CAME),
    offer("offer_self", "offer_self_title", "line_me", "offered_self", TO_CAME),
    offer("offer_all", "offer_title", "line_all", "offered_all", TO_CAME),
    ask("came", "came_title", "came_hint", [field("came", "came")],
        [{"when": BACKDRAFT, "to": "backdraft"}, {"to": "end"}]),
    # Backdraft (PRD step 4; Germer & Neff): named, not failure; the hand, a step back to someone easy, or stop.
    ask("backdraft", "backdraft_title", None,
        [field("step_down", "step_down", where={"any": [{"not": {"eq": ["$opt.value", "easier"]}}, {"not": EASY}]})],
        [{"when": EQ("step_down", "hand"), "to": "hand"}, {"when": EQ("step_down", "easier"), "to": "offer_again"},
         {"to": "end"}],
        lines=[{"when": ALWAYS, "key": "backdraft_line"}]),
    {"id": "hand", "kind": "embed", "embed": "bodyCard", "answerAs": "hand", "title": "hand_title",
     "props": {"kind": "hand_heart", "seconds": 30, "step1": "hand_step1", "step2": "hand_step2", "step3": "hand_step3",
               "start": "hand_start", "running": "hand_running", "done": "hand_done", "next": "next"},
     "links": LINKS, "next": [{"to": "end"}]},
    offer("offer_again", "offer_again_title", "line_you", "offered_again", [{"to": "came_again"}]),
    ask("came_again", "came_title", "came_hint", [field("came_again", "came")],
        [{"when": BACKDRAFT_AGAIN, "to": "twice"}, {"to": "end"}]),
    # Two backdraft closes in a row (PRD): easy next time and someone to talk it through with.
    handoff("twice", "twice_title", [{"when": ALWAYS, "key": "twice_line"}],
            [{"exit": "held_hand", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}]),
    handoff("end", [{"when": EQ("step_down", "stop"), "key": "end_stopped"}, {"when": ALWAYS, "key": "end_title"}],
            [{"when": {"any": [BACKDRAFT, BACKDRAFT_AGAIN]}, "key": "end_easy"}, {"when": ALWAYS, "key": "end_line"}],
            []),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down", "label": "body_first"},          # DT-01 First, the body (flooded)
    {"id": "held_hand", "toolId": "soothe", "query": {"enterAt": "hand"}, "label": "hand_offer"},  # DT-07 hand on heart
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}, "label": "ending_careful"},  # IE-08
    {"id": "safety_open", "toolId": None, "safety": True},                      # safety.open (R6): on every screen
    {"id": "done", "done": True},
]


def options():
    out = [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("who", v, label, {"hideIn": hide}, "KindWishRecipientTier") for v, label, hide in WHO]
    out += [("check", v, label, {}, None) for v, label in CHECK]
    out += [("instead", v, label, {}, None) for v, label in INSTEAD]
    out += [("wishes", v, label, {}, "KindWish") for v, label in WISHES]
    out += [("came", v, label, {"backdraft": v in ("sad", "stirred")}, None) for v, label in CAME]
    out += [("step_down", v, label, {}, None) for v, label in STEP_DOWN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "who", "ownMax": OWN_MAX,
    # band: a carried flooded or stirred reading (C6.2).
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
