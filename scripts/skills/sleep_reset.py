"""Sleep reset (DBT ER Handout 20b: sleep hygiene, and what to do when you can't sleep) as a skill on the runtime.

PRD ER-13 (docs/design/dbt-modules-plan.md §2.3, the ER-13 row; docs/design/sleep-reset.md). Two ways in, picked on
the first screen: *I can't sleep* (the night: what's keeping you up, a slow breath, then get up for a bit or rest,
never the clock) and *Set up my sleep times* (one wake time every day, one wind-down thing, and an optional morning
check, `sleep_morning`, that reopens the run at *How was the night?*).

Part 1 departures, all listed in docs/design/sleep-reset.md with a reason:
- No app-wide night mode (CORE's, Index §5.1 #13): the night path is written for the dark (short screens, nothing
  that wakes you up, no cold water) but the app's look doesn't change.
- The anchor lives in the run, not the profile: the wake time is asked on the plan path and read by the morning card
  from the run it reopens. Profile anchors (Me → My body) are part 2.
- The morning check is one card per plan, booked again only on the person's *yes* the next morning (no nightly
  schedule, no SleepLog label, no two-week pattern): a live flow never reads past visits (data layers).
- A bad dream at night gets grounding only; Rewrite the nightmare is offered the next morning, in daylight, when the
  person says one woke them (the PRD's ×3-in-two-weeks needs an aggregate, so part 1 offers it each time).
- *Thoughts of hurting myself* is the night path's first-class answer: the resources open first (`safetyFirst`), then
  getting through the night is the job, with no sleep coaching.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "sleep_reset"
TOOL_ID = "sleep-reset"
CONCEPT = "dbt_sleep_hygiene"
VERSION = "sr-v1"
OWN_MAX = 90


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}

COPY = {
    "next": "Next",
    "done": "Done",
    "safety_open": "Talk to someone now",
    "mode_title": "What do you need?",
    "mode_hint": "For tonight, or for the nights ahead.",
    "settle_first": "Settle my body first",
    # The night (H20b, when you can't sleep). A hand-off shows its first matching line, so each line is whole.
    "night_title": "What's keeping you up?",
    "night_hint": "You don't have to fix the night. Resting counts.",
    "safe_title": "Are you safe right now?",
    "safe_hint": "The support is on this screen, any hour.",
    "reach_title": "You don't have to do this part alone.",
    "reach_line": "Someone is there to talk to, right now.",
    "hurt_end_title": "Getting through the night is the job.",
    "hurt_end_line": "Sleep can wait. Someone to talk to is here, any hour.",
    "dream_title": "Back to the room first.",
    "dream_line": "Notice what's around you: the bed, the light, the sounds. Back to bed when you're ready. If it keeps coming back, there's help for that in the daytime.",
    "park_title": "Put it down for the night.",
    "park_hint": "Name it and leave it for the morning. It'll keep.",
    "park_own": "In my words",
    "mind_job_link": "Give my mind a job instead",
    "breathe_title": "Slow breaths, out longer than in.",
    "breathe_step1": "Lie back, or sit somewhere dim.",
    "breathe_step2": "No need to check the time.",
    "breathe_start": "Start",
    "breathe_in": "In",
    "breathe_out": "Out",
    "breathe_dizzy": "Light-headed? Breathe normally. That's fine too.",
    "breathe_done": "That's enough for now.",
    "now_title": "How is it now?",
    "up_title": "Try getting up for a bit.",
    "up_hint": "A different room for a while often helps more than lying there.",
    "sleepy_title": "Back to bed.",
    "sleepy_line": "Phone face down, out of reach. If you're still awake after a while, get up for a bit. Whatever time you fall asleep, get up at your usual time.",
    "rest_title": "Rest is enough for now.",
    "night_end_rest": "Eyes closed, phone face down. Resting still counts. If you start to stew, getting up for a bit helps.",
    "night_end_title": "Back to bed when your eyes get heavy.",
    "night_end_up": "Phone face down, out of reach. Go back when you're sleepy, not by the clock. Whatever time you fall asleep, get up at your usual time.",
    # The plan (H20b, the sleep schedule).
    "wake_title": "What time will you get up, every day?",
    "wake_hint": "The same time on weekends too. It resets sleep more than any bedtime does. If your hours change with shifts, set it by your shift; a doctor can help plan it.",
    "wind_title": "Pick one thing for the hour before bed.",
    "wind_hint": "One thing is enough. Go to bed when you're sleepy, not before.",
    "wind_own": "Something else",
    "remind_label": "Check in with me in the morning?",
    "plan_title": "Up at {wake}, every day.",
    "plan_remind": "A morning check will be on Today. Caffeine after midday and alcohol at night both break sleep up. If sleep's been bad for weeks, a doctor can help.",
    "plan_line": "Caffeine after midday and alcohol at night both break sleep up. On a night you can't sleep, open Sleep Reset again. If sleep's been bad for weeks, a doctor can help.",
    # The morning card reopens the run here.
    "morning_title": "Morning. How was the night?",
    "up_label": "Up at your time?",
    "dream_label": "Did a bad dream wake you?",
    "again_title_up": "Up at your time. That's the reset working.",
    "again_title": "A late start doesn't undo the reset.",
    "again_label": "Same again tomorrow?",
    "morning_end_title": "That's the reset.",
    "morning_barely": "A short night is hard. A nap can make tonight harder; if you need one, keep it short and early, and don't drive drowsy. Barely sleeping and full of energy, not tired? Tell your doctor soon.",
    "morning_broken": "Broken nights add up. If it's been weeks, or there's loud snoring, gasping or restless legs, a doctor can help.",
    "morning_not_yet": "Getting up now still helps. Light and moving tell your body it's morning.",
    "morning_again_no": "One fixed time to get up, every day, is most of it. You can set it up again any time in Sleep Reset.",
    "morning_line": "One fixed time to get up, every day, is most of it.",
}

MODE = [("awake", "I can't sleep"), ("plan", "Set up my sleep times")]
NIGHT = [("mind", "My mind won't stop"), ("body", "My body's wired"), ("dream", "A bad dream woke me"),
         ("hurt", "Thoughts of hurting myself"), ("unsure", "I don't know")]
SAFE = [("safe_now", "Safe for now"), ("not_sure", "Not sure"), ("no", "No")]
PARK = [("worry", "A worry"), ("todo", "Something to do tomorrow"), ("replay", "Something that happened")]
NOW = [("sleepy", "Sleepy now"), ("awake", "Still wide awake")]
# H20b: get up after a while, go to another room, do something calm that won't wake you further; or rest.
UP = [("dim", "Another room, lights low"), ("read", "Something calm on paper"), ("rest", "I'd rather rest here")]
# Wake times (the `sleep_morning` window's chips, scripts/practice-spine/content.py): the next morning.
WAKE = [(f"w{h:02d}{m:02d}", f"{h}:{m:02d}") for h in range(6, 10) for m in (0, 30)]
# H20b's wind-down: no screens, low light, worries parked, warmth. No food, drink or pills.
WIND = [("screens", "Screens away"), ("dim", "Lights low"), ("tomorrow", "Write tomorrow's list"),
        ("warm", "A warm shower or bath"), ("quiet", "A book, music or stretching")]
REMIND = [("yes", "Yes")]
SLEPT = [("okay", "Slept okay"), ("broken", "Broken"), ("barely", "Barely slept")]
UP_AT = [("up_yes", "Yes"), ("up_later", "Later than planned"), ("up_not_yet", "Not yet")]
DREAM = [("dream_yes", "Yes")]
AGAIN = [("again_yes", "Yes, check in tomorrow"), ("again_no", "Not tomorrow")]

HURT = {"eq": [a("night"), "hurt"]}
CRISIS = [{"variant": "crisis", "when": ALWAYS}]
UNSAFE = {"in": [a("safe"), ["not_sure", "no"]]}
REST = {"eq": [a("up"), "rest"]}


def field(fid, *, label=None, required=True, own=None, links=None, show=None, max_=1):
    f = {"id": fid, "options": {"list": fid}, "max": max_, "links": links if links is not None else [SAFETY_LINK]}
    if required:
        f["required"] = True
    if label:
        f["label"] = label
    if own:
        f["own"] = {"hint": own, "countsAsPick": True, "max": OWN_MAX}
    if show:
        f["showWhen"] = show
    return f


def handoff(sid, title, lines, offers, *, crisis=None, **extra):
    s = {"id": sid, "kind": "handoff", "complete": True, "title": title, "lines": lines, "offers": offers,
         "done": "done", "next": [], **extra}
    # Someone to talk to once: the offer where it's one, else the quiet link (never two of the same button).
    s["links"] = [] if any(o["exit"] == "safety_open" for o in offers) else [SAFETY_LINK]
    if crisis:
        s["crisis"] = crisis
    return s


STEPS = [
    {
        "id": "mode", "kind": "ask", "title": "mode_title", "hint": "mode_hint",
        # A carried flooded reading: a quiet way to settle first on the plan path's side (the night path breathes).
        "fields": [field("mode", links=[{"exit": "cool_down", "label": "settle_first",
                                         "when": {"all": [FLOODED, {"eq": [a("mode"), "plan"]}]}}, SAFETY_LINK])],
        "next": [{"when": {"eq": [a("mode"), "plan"]}, "to": "wake"}, {"to": "night"}],
    },
    # ── The night ──
    {
        "id": "night", "kind": "ask", "title": "night_title", "hint": "night_hint",
        "fields": [field("night")],
        "next": [{"when": HURT, "to": "safe"}, {"when": {"eq": [a("night"), "dream"]}, "to": "dream"},
                 # Flooded: the breath first, no writing.
                 {"when": {"all": [{"eq": [a("night"), "mind"]}, {"not": FLOODED}]}, "to": "park"},
                 {"to": "breathe"}],
    },
    {
        # Hurt myself (C6.5): the resources open over this screen as it arrives, then one plain question, with the
        # banner on every screen after.
        "id": "safe", "kind": "ask", "title": "safe_title", "hint": "safe_hint", "crisis": CRISIS, "safetyFirst": ALWAYS,
        "fields": [field("safe")],
        "next": [{"when": UNSAFE, "to": "reach"}, {"to": "hurt_end"}],
    },
    handoff("reach", "reach_title", [{"when": ALWAYS, "key": "reach_line"}],
            [{"exit": "safety_open", "when": ALWAYS}, {"exit": "crisis_kit", "when": ALWAYS}], crisis=CRISIS, noClose=True),
    # Safe for now: getting through the night is the job; no sleep coaching (Gate 3).
    handoff("hurt_end", "hurt_end_title", [{"when": ALWAYS, "key": "hurt_end_line"}],
            [{"exit": "safety_open", "when": ALWAYS}, {"exit": "crisis_kit", "when": ALWAYS}], crisis=CRISIS, noClose=True),
    # A bad dream: grounding, never back into it at night (ER-15 is offered in the morning).
    handoff("dream", "dream_title", [{"when": ALWAYS, "key": "dream_line"}],
            [{"exit": "five_senses", "when": ALWAYS}, {"exit": "soothe", "when": ALWAYS}]),
    {
        "id": "park", "kind": "ask", "title": "park_title", "hint": "park_hint",
        "fields": [field("park", required=False, own="park_own",
                         links=[{"exit": "mind_job", "label": "mind_job_link", "when": ALWAYS}, SAFETY_LINK])],
        "next": [{"to": "breathe"}],
    },
    {
        "id": "breathe", "kind": "embed", "embed": "breathPacer", "answerAs": "breathe", "title": "breathe_title",
        "props": {"seconds": 120, "inSec": 4, "outSec": 6, "step1": "breathe_step1", "step2": "breathe_step2",
                  "start": "breathe_start", "inLabel": "breathe_in", "outLabel": "breathe_out", "dizzy": "breathe_dizzy",
                  "done": "breathe_done", "next": "next"},
        "links": [SAFETY_LINK],
        "next": [{"to": "now"}],
    },
    {
        "id": "now", "kind": "ask", "title": "now_title",
        "fields": [field("now")],
        "next": [{"when": {"eq": [a("now"), "sleepy"]}, "to": "sleepy"}, {"to": "up"}],
    },
    handoff("sleepy", "sleepy_title", [{"when": ALWAYS, "key": "sleepy_line"}], []),
    {
        "id": "up", "kind": "ask", "title": "up_title", "hint": "up_hint",
        "fields": [field("up", links=[{"exit": "mind_job", "label": "mind_job_link", "when": {"eq": [a("night"), "mind"]}},
                                      SAFETY_LINK])],
        "next": [{"to": "night_end"}],
    },
    handoff("night_end", [{"when": REST, "key": "rest_title"}, {"key": "night_end_title"}],
            [{"when": REST, "key": "night_end_rest"}, {"when": ALWAYS, "key": "night_end_up"}],
            [{"exit": "mind_job", "when": {"eq": [a("night"), "mind"]}}]),
    # ── The plan ──
    {
        "id": "wake", "kind": "ask", "title": "wake_title", "hint": "wake_hint",
        "fields": [field("wake")],
        "next": [{"to": "wind"}],
    },
    {
        "id": "wind", "kind": "ask", "title": "wind_title", "hint": "wind_hint",
        "fields": [field("wind", own="wind_own"), field("remind", label="remind_label", required=False, links=[])],
        # The morning card at the wake time picked on the screen before; it reopens the run at `morning`.
        "followUp": {"type": "sleep_morning", "whenFrom": "wake", "when": {"set": a("remind")}},
        "next": [{"to": "plan_end"}],
    },
    {**handoff("plan_end", "plan_title",
               [{"when": {"set": a("remind")}, "key": "plan_remind"}, {"when": ALWAYS, "key": "plan_line"}], []),
     "titleSlots": {"wake": {"labelOf": "wake"}}},
    # ── The morning card reopens the run here ──
    {
        "id": "morning", "kind": "ask", "reopens": {"after": "wind", "again": ["again"]},
        "clears": ["slept", "up_at", "dream", "again"], "title": "morning_title",
        "fields": [field("slept"), field("up_at", label="up_label", links=[]), field("dream", label="dream_label", required=False, links=[])],
        "next": [{"to": "again"}],
    },
    {
        "id": "again", "kind": "ask",
        "title": [{"when": {"eq": [a("up_at"), "up_yes"]}, "key": "again_title_up"}, {"key": "again_title"}],
        "fields": [field("again", label="again_label")],
        "followUp": {"type": "sleep_morning", "whenFrom": "wake", "whenDefault": "w0700",
                     "when": {"eq": [a("again"), "again_yes"]}},
        "next": [{"to": "morning_end"}],
    },
    {**handoff("morning_end", "morning_end_title",
               [{"when": {"eq": [a("slept"), "barely"]}, "key": "morning_barely"},
                {"when": {"eq": [a("slept"), "broken"]}, "key": "morning_broken"},
                {"when": {"eq": [a("up_at"), "up_not_yet"]}, "key": "morning_not_yet"},
                {"when": {"eq": [a("again"), "again_no"]}, "key": "morning_again_no"},
                {"when": ALWAYS, "key": "morning_line"}],
               [{"exit": "nightmare_rescript", "when": {"set": a("dream")}},
                {"exit": "please_skill", "when": {"eq": [a("slept"), "barely"]}}])},
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},                                 # DT-01 First, the body
    {"id": "five_senses", "toolId": "five-senses"},                             # orienting: after a bad dream
    {"id": "soothe", "toolId": "soothe"},                                       # DT-07 Held: a hand on the heart
    {"id": "mind_job", "toolId": "mind-job"},                                   # DT-06: a mind that won't stop
    {"id": "crisis_kit", "toolId": "crisis-kit", "query": {"frame": "crisis"}},  # DT-03, the banner on every card
    {"id": "nightmare_rescript", "toolId": "nightmare-rescript"},               # ER-15, in the morning only
    {"id": "please_skill", "toolId": "please-skill"},                           # ER-07 Running low, after a short night
    {"id": "safety_open", "toolId": None, "safety": True},                      # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = []
    for fid, rows in (("mode", MODE), ("night", NIGHT), ("safe", SAFE), ("park", PARK), ("now", NOW), ("up", UP),
                      ("wake", WAKE), ("wind", WIND), ("remind", REMIND), ("slept", SLEPT), ("up_at", UP_AT),
                      ("dream", DREAM), ("again", AGAIN)):
        out += [(fid, v, label, {}, None) for v, label in rows]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "mode", "ownMax": OWN_MAX,
    "accepts": ["band"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
