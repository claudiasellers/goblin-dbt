"""Kind wishes (MF-06 loving-kindness; DBT Mindfulness, loving kindness, Linehan 2015), as a skill on the runtime.

The editable source. The flow is PRD MF-06 (Claudia's vault, "DBT Module PRDs/PRD – Mindfulness.md"): a strong negative
self-sense with almost no positive one, or hostility after rejection. Loving-kindness practises warmth on purpose,
without needing to feel it. A calm-time practice. The design note is docs/design/kind-wishes.md.

Steps:
  who       *Who will you send kind wishes to?* someone easy to like · someone I saw today and don't know well · me ·
            someone I find difficult · everyone around me right now (the PRD's tiers, in its order; *Someone easy is a
            good place to start.*). A carried stirred reading lists easy, neutral and everyone (PRD: the self and difficult
            tiers when steady), with a line saying so; a flooded one that went on, someone easy only. All tiers are shown
            otherwise (the PRD's own recommendation: suggest easy first, never a lock). A carried flooded reading (PRD: not
            offered flooded) titles it *Kind wishes work best on a calmer day.*, lists someone easy only and links My body
            first (First, the body) and a hand on the heart (Held). Never a lock.
  check     someone difficult: *Has this person ever threatened you, scared you or hurt you, or could they?* no, they're
            hard to be around · yes · not sure. Yes or not sure →
  not_them  *Then not this one. Your safety comes first.* the `other_person` resources, Leaving someone who might hurt me
            (Ending, `frame=careful`), and send them to me or to someone easy instead, or not today (`stop_safe`, no
            rep) (PRD risk: never warmth toward an unsafe person; Arch Map row 29).
  wishes    *Pick up to three wishes for them / for yourself / for everyone around you.* be safe · be at ease · be looked
            after · rest · be free from pain, or *My own wish* (up to three; a line says own words finish *May you…*).
  offer_*   the `wishOffer` embed: each wish on its own (*May you be safe.* · *May I…* · *May everyone around me…*), a tap
            offers it with a slow ring, 30 s each. Moving on before any wish → `skip_end` (no rep). *The wishes don't need to feel true. Offering them is the practice.*
  came      *What came up?* some warmth · nothing much · sadness · stirred up or angry · (for me) it felt like I don't
            deserve it.
  backdraft sadness or stirred: *That's common. Warmth can wake old hurts. It's called backdraft, and it isn't failure.*
            a hand on my heart (`bodyCard`, the mug alternative) · try someone easier (not from the easy tier) · stop here.
  again     someone easier: the same wishes to someone easy (`offer_again`), then `came_again`; backdraft again →
  twice     *Warmth keeps stirring things up today.* talking it through with someone you trust, starting with someone
            easy next time, a hand on the heart (Held) and someone to talk to now (PRD: two backdraft closes in a row).
  end       *You offered kind wishes. That's the practice.* (reps, never feelings); a next step as a suggestion only
            after the easy, neutral or self tiers, otherwise *try them in your own words*.

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
    "who_title": "Who will you send kind wishes to?",
    "who_hint": "Someone easy is a good place to start.",
    "who_stirred": "With things stirred up, wishes for yourself or someone difficult can wait for a steadier day.",
    "check_title": "Has this person ever threatened you, scared you or hurt you, or could they?",
    "check_hint": "Someone annoying or hard to be around is fine to pick. Kind wishes are never owed to someone who hurts or scares you.",
    "not_them_title": "Then not this one. Your safety comes first.",
    "not_them_line": "Send the wishes somewhere else today, or stop here. Support is here if you want it.",
    "stop_safe_title": "Stopping here is a real answer.",
    "stop_safe_line": "Support is here if you want it.",
    "wishes_other": "Pick up to three wishes for them.",
    "wishes_easy": "Pick up to three wishes for someone easy.",
    "wishes_self": "Pick up to three wishes for yourself.",
    "wishes_all": "Pick up to three wishes for everyone around you.",
    "wishes_hint": "Pick the ones that sound kind. They don't need to feel true.",
    "wishes_all_line": "Leave out anyone who hurts or scares you. Kind wishes are never owed to them.",
    "wishes_own_you": "Your own words finish the line \"May you…\"",
    "wishes_own_me": "Your own words finish the line \"May I…\"",
    "wish_own": "My own wish",
    "offer_title": "Offer them one at a time.",
    "offer_easy_title": "Picture someone easy, and offer them one at a time.",
    "offer_self_title": "Offer them to yourself, one at a time.",
    "offer_again_title": "Picture someone easy, and offer them the same wishes.",
    "offer_hint": "The wishes don't need to feel true. Offering them is the practice.",
    "line_you": "May you {wish}.",
    "line_me": "May I {wish}.",
    "line_all": "May everyone around me {wish}.",
    "offer_start": "Offer it",
    "offer_ring_hint": "Tap to offer this wish. The ring fills slowly. Tap again to stop.",
    "offer_done": "All offered.",
    "offer_skip": "Move on",
    "offer_fallback": "Be at ease",
    "came_title": "What came up?",
    "came_hint": "Any of these is fine.",
    "backdraft_title": "That's common. Warmth can wake old hurts.",
    "backdraft_line": "It's called backdraft, and it isn't failure.",
    "backdraft_deserve": "You don't have to deserve it. Offering is the practice, not believing it.",
    "hand_title": "A hand on your heart for a few breaths.",
    "hand_step1": "One hand on your chest, or both hands around a warm mug.",
    "hand_step2": "Notice any warmth in your hand.",
    "hand_step3": "Let your breath move under it, slowly.",
    "hand_start": "Start",
    "hand_running": "Resting here",
    "hand_done": "That's enough for now.",
    "twice_title": "Warmth keeps stirring things up today.",
    "twice_line": "That happens. It's worth talking through with someone you trust. Next time, a hand on your heart first, then someone easy.",
    "end_title": "You offered kind wishes. That's the practice.",
    "end_line": "Next time, try your own words, or someone a little less easy.",
    "end_own": "Next time, try them in your own words.",
    "end_stopped": "You stopped when it got heavy. That's looking after yourself.",
    "end_easy": "Next time, someone easy is a good place to begin.",
    "skip_title": "Not this time.",
    "skip_line": "The wishes will keep for another day.",
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

# The PRD's tiers in its order (easy → neutral → you → difficult → everyone). `hideIn`: the bands a tier isn't listed in
# (PRD capacity branching: stirred, easy and neutral; self and difficult only when steady; flooded, someone easy only).
WHO = [
    ("easy", "Someone easy to like, a friend or a pet", []),
    ("neutral", "Someone I saw today and don't know well", ["flooded"]),
    ("self", "Me", ["stirred", "flooded"]),
    ("difficult", "Someone I find difficult", ["stirred", "flooded"]),
    ("everyone", "Everyone around me right now", ["stirred", "flooded"]),
]
CHECK = [("no", "No, they're hard to be around"), ("yes", "Yes"), ("unsure", "I'm not sure")]
INSTEAD = [("easy", "To someone easy instead"), ("self", "To me instead"), ("stop", "Not today")]
# The PRD's wishes; `phrase` is how the offer says them (the label lower-cased goes into *May you {wish}.*).
WISHES = [
    ("safe", "Be safe"),
    ("ease", "Be at ease"),
    ("cared", "Be looked after"),
    ("rest", "Rest"),
    ("free", "Be free from pain"),
]
CAME = [("warmth", "Some warmth"), ("nothing", "Nothing much"), ("sad", "Sadness"), ("stirred", "Stirred up or angry"),
        # The self tier only (PRD risk: self-hatred; Held's *I don't deserve this*): backdraft too.
        ("undeserved", "It felt like I don't deserve it")]
STEP_DOWN = [("hand", "A hand on my heart"), ("easier", "Try someone easier"), ("stop", "Stop here")]

UNSAFE = {"all": [EQ("who", "difficult"), {"in": [a("check"), ["yes", "unsure"]]}]}


# The tier the wishes go to: the pick, or where *not this one* sent them instead (only while the check still says
# unsafe, so an answer left behind by Back never steers).
def tier(v):
    return {"any": [{"all": [UNSAFE, EQ("instead", v)]}, {"all": [{"not": UNSAFE}, EQ("who", v)]}]}


SELF = tier("self")
EVERYONE = tier("everyone")
EASY = tier("easy")
INSTEAD_EASY = {"all": [UNSAFE, EQ("instead", "easy")]}
OTHER = {"all": [{"not": SELF}, {"not": EVERYONE}]}
BACKDRAFT = {"in": [a("came"), ["sad", "stirred", "undeserved"]]}
BACKDRAFT_AGAIN = {"all": [EQ("step_down", "easier"), {"in": [a("came_again"), ["sad", "stirred", "undeserved"]]}]}
STOPPED = {"all": [BACKDRAFT, EQ("step_down", "stop")]}
LISTED = {"not": {"has": ["$opt.hideIn", "$ctx.band"]}}
FLOODED_LINK = [{"exit": "cool_down", "label": "body_first", "when": FLOODED}, {"exit": "held_hand", "label": "hand_offer", "when": FLOODED}]


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


def offer(step_id, title, line, answer_as, nxt, *, chips_only=False):
    props = {"wishes": "wishes", "line": line, "seconds": 30, "start": "offer_start", "hint": "offer_ring_hint",
             "done": "offer_done", "next": "next", "skip": "offer_skip"}
    if chips_only:
        # The step back to someone easier: own words written for another tier don't carry (*May you forgive myself.*).
        props.update({"chipsOnly": 1, "fallback": "offer_fallback"})
    return {"id": step_id, "kind": "embed", "embed": "wishOffer", "answerAs": answer_as, "title": title,
            "hint": "offer_hint", "props": props, "links": LINKS, "next": nxt}


# *Move on* before any wish was offered is no practice: no praise and nothing asked (One thing's skip_end).
def to_came(answer_as):
    return [{"when": EQ(answer_as, "skipped"), "to": "skip_end"}, {"to": "came"}]

STEPS = [
    # A carried flooded reading (PRD: not offered flooded): the heads-up is the who screen's title, someone easy is the
    # one tier, and the body first or a hand on the heart are links. Never a lock.
    ask("who", [{"when": FLOODED, "key": "heads_up_title"}, {"when": ALWAYS, "key": "who_title"}], "who_hint",
        [{**field("who", "who", where=LISTED), "links": FLOODED_LINK}],
        [{"when": EQ("who", "difficult"), "to": "check"}, {"to": "wishes"}],
        lines=[{"when": FLOODED, "key": "heads_up_line"}, {"when": STIRRED, "key": "who_stirred"}]),
    # Someone difficult (PRD risk: never an abuser; Arch Map row 29, IE `Person.safe`): asked plainly, every time.
    ask("check", "check_title", "check_hint", [field("check", "check")],
        [{"when": UNSAFE, "to": "not_them"}, {"to": "wishes"}]),
    {**ask("not_them", "not_them_title", None,
           [{**field("instead", "instead"),
             "links": [{"exit": "ending_careful", "label": "ending_careful", "when": ALWAYS}]}],
           [{"when": EQ("instead", "stop"), "to": "stop_safe"}, {"to": "wishes"}], lines=[{"when": ALWAYS, "key": "not_them_line"}]),
     "crisis": [{"variant": "other_person", "when": ALWAYS}]},
    handoff("stop_safe", "stop_safe_title", [{"when": ALWAYS, "key": "stop_safe_line"}],
            [{"exit": "ending_careful", "when": ALWAYS}, {"exit": "held_hand", "when": ALWAYS}],
            complete=False, crisis=[{"variant": "other_person", "when": ALWAYS}]),
    ask("wishes", [{"when": INSTEAD_EASY, "key": "wishes_easy"}, {"when": SELF, "key": "wishes_self"},
                   {"when": EVERYONE, "key": "wishes_all"}, {"when": ALWAYS, "key": "wishes_other"}],
        "wishes_hint", [field("wishes", "wishes", mx=3, own="wish_own")],
        [{"when": SELF, "to": "offer_self"}, {"when": EVERYONE, "to": "offer_all"}, {"to": "offer_other"}],
        # Everyone around me can include someone unsafe (Arch Map row 29); own words finish the tier's line.
        lines=[{"when": EVERYONE, "key": "wishes_all_line"}, {"when": SELF, "key": "wishes_own_me"},
               {"when": ALWAYS, "key": "wishes_own_you"}]),
    offer("offer_other", [{"when": INSTEAD_EASY, "key": "offer_easy_title"}, {"when": ALWAYS, "key": "offer_title"}],
          "line_you", "offered", to_came("offered")),
    offer("offer_self", "offer_self_title", "line_me", "offered_self", to_came("offered_self")),
    offer("offer_all", "offer_title", "line_all", "offered_all", to_came("offered_all")),
    ask("came", "came_title", "came_hint",
        [field("came", "came", where={"any": [{"not": {"eq": ["$opt.value", "undeserved"]}}, SELF]})],
        [{"when": BACKDRAFT, "to": "backdraft"}, {"to": "end"}]),
    # Backdraft (PRD step 4; Germer & Neff): named, not failure; the hand, a step back to someone easy, or stop.
    ask("backdraft", "backdraft_title", None,
        [field("step_down", "step_down", where={"any": [{"not": {"eq": ["$opt.value", "easier"]}}, {"not": EASY}]})],
        [{"when": EQ("step_down", "hand"), "to": "hand"}, {"when": EQ("step_down", "easier"), "to": "offer_again"},
         {"to": "end"}],
        lines=[{"when": EQ("came", "undeserved"), "key": "backdraft_deserve"}, {"when": ALWAYS, "key": "backdraft_line"}]),
    {"id": "hand", "kind": "embed", "embed": "bodyCard", "answerAs": "hand", "title": "hand_title",
     "props": {"kind": "hand_heart", "seconds": 30, "step1": "hand_step1", "step2": "hand_step2", "step3": "hand_step3",
               "start": "hand_start", "running": "hand_running", "done": "hand_done", "next": "next"},
     "links": LINKS, "next": [{"to": "end"}]},
    # A skip here still follows a wish offered once: the end card, without asking what came up.
    offer("offer_again", "offer_again_title", "line_you", "offered_again",
          [{"when": EQ("offered_again", "skipped"), "to": "end"}, {"to": "came_again"}], chips_only=True),
    ask("came_again", "came_title", "came_hint",
        [field("came_again", "came", where={"not": {"eq": ["$opt.value", "undeserved"]}})],
        [{"when": BACKDRAFT_AGAIN, "to": "twice"}, {"to": "end"}]),
    # Two backdraft closes in a row (PRD): easy next time and someone to talk it through with.
    handoff("twice", "twice_title", [{"when": ALWAYS, "key": "twice_line"}],
            [{"exit": "held_hand", "when": ALWAYS}, {"exit": "safety_open", "when": ALWAYS}]),
    handoff("end", [{"when": STOPPED, "key": "end_stopped"}, {"when": ALWAYS, "key": "end_title"}],
            [{"when": {"any": [BACKDRAFT, BACKDRAFT_AGAIN]}, "key": "end_easy"},
             # A next step only where there is one: everyone and someone difficult are the far end already.
             {"when": {"any": [EVERYONE, tier("difficult")]}, "key": "end_own"}, {"when": ALWAYS, "key": "end_line"}],
            []),
    handoff("skip_end", "skip_title", [{"when": ALWAYS, "key": "skip_line"}], [], complete=False),
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down", "label": "body_first"},          # DT-01 First, the body (flooded, a link)
    {"id": "held_hand", "toolId": "soothe", "query": {"enterAt": "hand"}, "label": "hand_offer"},  # DT-07 hand on heart
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}, "label": "ending_careful"},  # IE-08
    {"id": "safety_open", "toolId": None, "safety": True},                      # safety.open (R6): on every screen
    {"id": "done", "done": True},
]


def options():
    out = [("who", v, label, {"hideIn": hide}, "KindWishRecipientTier") for v, label, hide in WHO]
    out += [("check", v, label, {}, None) for v, label in CHECK]
    out += [("instead", v, label, {}, None) for v, label in INSTEAD]
    out += [("wishes", v, label, {}, "KindWish") for v, label in WISHES]
    out += [("came", v, label, {"backdraft": v in ("sad", "stirred", "undeserved")}, None) for v, label in CAME]
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
