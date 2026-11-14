"""When it's a habit (DT-09; dialectical abstinence and the DBT-SUD skills: DBT DT Handouts 16–21, Linehan 2015;
Dimeff & Linehan 2008) as a skill on the runtime.

The editable source. The flow is PRD DT-09 (Claudia's vault, "DBT Module PRDs/PRD – Distress Tolerance.md"; copy in
/mnt/project-files/handoffs/prds/): something the person keeps doing despite the cost (drinking, using, smoking,
bingeing, gambling, spending, scrolling, checking someone's page, porn), with slips that turn into "I've blown it,
might as well" (the abstinence-violation effect, Marlatt & Gordon 1985). Built while steady, for one behaviour:

  what         the behaviour (chips, or their own words). Hurting myself is a route, not a habit (CORE owns
               self-harm): the crisis banner and someone to talk to, no plan, no close.
  heads_up     a carried flooded reading: the body first, ride the urge out, or make the plan anyway.
  medical      drink or drugs: stopping alcohol, benzodiazepines or opioids all at once can be dangerous, a doctor
               can help (PRD step 7). One optional tap, never a gate.
  eating       bingeing or purging: the commitment is never to not eat; a doctor or an eating disorder service can
               help. One optional tap.
  span         dialectical abstinence: all in, for a stretch you know you can keep (an hour, today, three days, a
               week). The stretch is also when the check-in comes (`habit_renew`).
  lapse        the lapse plan, written now: what I'll do first if I slip (up to three).
  burn         burning bridges, per behaviour (H17's checklist as chips).
  risky        apparently irrelevant behaviours: small choices that set it up.
  build        building new bridges: what I'll turn to when a craving comes (up to two); the competing image is
               rehearsed now for 30 s (`imagine`, doseTimer).
  reinforce    community reinforcement, optional: what I get back when I'm not doing it.
  card         the lapse plan on paper (boundaryLine list), read once; the same card comes back after a slip.
  remind       *Check in when the stretch ends?* books `habit_renew`, timed by `span`.
  keep         *Keep it in Me* keeps `abstinence_plan` (the minimal TargetBehavior: the behaviour and its plan).
  end          the dialectic said plainly: all in, and a plan for a slip. Ride it out and the pros & cons card.

Renewal (R9 `reopens`): the `habit_renew` card reopens the run at `renew`: *I kept to it* → the next stretch; *I
slipped* → "A slip isn't a relapse. Here's what you planned." (the lapse plan from the first visit), then recommit
for a stretch; *Not ready to go again* → the plan stays, no shame. The next stretch books the card again.

Hosts: Hold to wait's next card and Ride it out's end cards offer it for the use and check pulls.
Part 2 (14 Nov 2026): the weekly clear-mind check (`weekly` books `clear_mind`, which reopens the run at `clear`:
addict and clean mind signs, *I did it* → the lapse plan, the week named by its loudest mind, never counted), and the
lapse plan under Hold to wait's and Ride it out's close after an acted yes (src/lib/lapseSlot.ts, which reads this
skill's `what` urge props, `lapse` labels and slip copy). docs/design/habit-plan.md lists what is still deferred
(CORE-08's chain, BridgeTemplate / MindSign nodes) and where it departs from the PRD.

Safety (plan C6): *Talk to someone now* on every screen. No chip is food, drink or shopping as a comfort; nothing
counts days or calls a slip a failure; the plan never asks how much.

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""

ID = "habit_plan"
TOOL_ID = "habit-plan"
CONCEPT = "dbt_dialectical_abstinence"
VERSION = "hp-v1"
OWN_MAX = 60  # the behaviour, a step, a bridge: a few words each

COPY = {
    "what_title": "What do you keep going back to?",
    "what_hint": "Pick one. A plan works best for one thing at a time.",
    "what_own": "In my own words",
    # Hurting myself (CORE owns self-harm, PRD step 1): someone to talk to, no plan (voice.md S9).
    "harm_line": "Hurting yourself needs more care than a habit plan can give. Someone to talk to comes first.",
    # A carried flooded reading (PRD: build in steady or stirred; flooded → DT-01).
    "heads_up_title": "Your body's loud right now.",
    "heads_up_hint": "A plan is easier to make once things settle.",
    "settle_line": "The plan will keep. Look after the next few minutes first.",
    # PRD step 7, the medical heads-up. One line title, the dialectic in the hint.
    "medical_title": "Stopping alcohol, benzos or opioids all at once can be dangerous. A doctor can help you come off safely.",
    "medical_title_own": "If this is alcohol, benzos or opioids: stopping all at once can be dangerous. A doctor can help you come off safely.",
    "medical_hint": "Cutting down with a doctor's plan counts as a commitment too. Shaking, sweating, seeing things or a seizure after stopping: get help now.",
    # Eating: never not eating (PRD step 1).
    "eating_title": "This plan is about not bingeing or purging. It never means not eating.",
    "eating_hint": "Regular meals help keep the pull down. A doctor or an eating disorder service can help with the rest.",
    # Dialectical abstinence (H17).
    "span_title": "How long can you fully commit to not doing it?",
    # Drink or drugs most days: an abrupt stop is the danger the medical line names (Gate 3).
    "span_title_sub": "How long can you commit to not doing it, or to a doctor's plan for cutting down?",
    "span_hint": "Pick a stretch you know you can keep. When it ends, you can choose the next one.",
    "lapse_title": "If you slip, what will you do first?",
    "lapse_hint": "Planning for a slip isn't planning to slip. It stops one slip turning into giving up.",
    "lapse_own": "Something else",
    "burn_title": "What could you make harder to get to?",
    "burn_hint": "Small changes that put distance between you and it. Pick what you'd do this week.",
    "burn_own": "Something else",
    "risky_title": "What tends to lead you back, without seeming to?",
    "risky_hint": "Small choices that set it up. Naming them makes them easier to spot.",
    "risky_own": "Something else",
    "build_title": "When a craving comes, what will you turn to?",
    "build_hint": "Pick one or two to have ready.",
    "build_own": "Something else",
    # The competing image, rehearsed in calm (PRD step 4).
    "imagine_title": "Practise it now, while it's calm.",
    "imagine_step1": "Picture the thing you'd rather be doing.",
    "imagine_step2": "Where are you? What can you see and hear?",
    "imagine_step3": "Stay with it. This is the picture you'll reach for.",
    "imagine_running": "Picturing",
    "imagine_done": "That's the picture. Coming back to it makes it easier to find.",
    "reinforce_title": "What do you get back when you're not doing it?",
    "reinforce_hint": "Optional. These are worth remembering on a hard day.",
    "reinforce_own": "Something else",
    "card_title": "If you slip, this is your plan. Read it through once.",
    "card_next": "Next",
    # Renewal (R5): the stretch picked is when the card comes.
    "remind_title": "Want a check-in when the stretch ends?",
    "remind_hint": "It won't say what the plan is about.",
    # The weekly clear-mind check (H17's clear mind, PRD step 6): booked here, reopened from `clear_mind`.
    "weekly_title": "Want a short check once a week on how it's going?",
    "weekly_hint": "Optional. About a minute, and it won't say what it's about.",
    "clear_title": "Over the last week, did any of these show up?",
    "clear_hint": "Pick any that fit. None of them? Go on without picking.",
    "clear_addict": "The pull's been loud this week. That's addict mind, and your plan is still here.",
    "clear_clean": "Feeling safe can be the risky part. That's clean mind: the bridges are still worth keeping burned.",
    "clear_clear": "Off it, and still watching for the pull. That's clear mind.",
    "clear_next_hint": "Check in again next week?",
    "clear_end": "Clear mind isn't a finish line. It's watching, week by week.",
    "keep_title": "Keep this plan in Me?",
    "keep_primary": "Next",
    # The end card: the dialectic said plainly (PRD risk: harm reduction heard as permission).
    "end_kept": "It's in Me. All in on not doing it, and a plan ready if you slip. Both at once.",
    "end_line": "All in on not doing it, and a plan ready if you slip. Both at once.",
    # The renewal, reopened from the habit_renew card.
    "renew_title": "Your stretch is up. How did it go?",
    "renew_hint": "Whatever happened, there's a next step.",
    "slipped_title": "A slip isn't a relapse. Here's what you planned.",
    # Drink or drugs (or own words): tolerance drops after a break, so a slip at the old amount is the overdose risk.
    "after_use_title": "After a break, your body can't take what it used to.",
    "after_use_title_own": "If this was alcohol or drugs: after a break, your body can't take what it used to.",
    "after_use_hint": "If you've used, try not to be alone, and get emergency help if someone's hard to wake or breathing slowly.",
    "slipped_next": "Next",
    "again_title": "What's the next stretch you can keep?",
    "again_title_slip": "What stretch can you keep from here?",
    "again_end_held": "You kept the last one. The next one starts now.",
    "again_end_slip": "You're choosing it again. A slip is information, not who you are.",
    "stop_line": "That's okay. Your plan stays here for when you're ready.",
    # A kept plan in Me (KeptHabitPlan): the two lists under the behaviour.
    "me_craving": "When a craving comes",
    "me_slip": "If I slip",
    "start": "Start",
    "safety_open": "Talk to someone now",
    "next": "Next",
    "done": "Done",
}


def a(field):
    return f"$a.{field}"


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
SAFETY_LINK = {"exit": "safety_open", "label": "safety_open", "when": ALWAYS}
KEPT = {"eq": [a("keepit"), "keep"]}
SLIP = {"eq": [a("renew"), "slip"]}

# The behaviour (TargetBehavior, minimal). Self-harm is a route: never a habit plan (CORE's life-threatening targets).
WHATS = [
    ("drink", "Drinking", {"urge": "use"}),
    ("drugs", "Using drugs", {"urge": "use"}),
    ("smoke", "Smoking or vaping", {"urge": "use"}),
    ("binge", "Bingeing or purging", {"urge": "use"}),
    ("gamble", "Gambling or betting", {"urge": "use"}),
    ("spend", "Spending or buying", {"urge": "use"}),
    ("scroll", "Scrolling or gaming for hours", {}),
    ("check", "Checking someone's page", {"urge": "check"}),
    ("porn", "Porn, more than I want to", {}),
    ("hurt", "Hurting myself", {"urge": "self_harm"}),
]
BEHAVIOURS = [v for v, _, _ in WHATS if v != "hurt"]
ALL = BEHAVIOURS + ["other"]
NOT_BINGE = [w for w in ALL if w != "binge"]
OWN_WHAT = {"not": {"in": [a("what"), [v for v, _, _ in WHATS]]}}
SUBSTANCE = {"in": [a("what"), ["drink", "drugs"]]}
# Two choices in an acute state (T8): the next few minutes (the body or riding it out), or the plan anyway.
HEADS_UP = [("settle", "Look after the next few minutes first"), ("plan", "Make the plan anyway")]
OK_NOW = [("ok", "I'm okay right now"), ("with", "Someone's with me")]
SUPPORT = [("have", "I've got support with this"), ("will", "I'll talk to someone about it")]
# The stretch. Ids are the habit_renew window's chips (the check-in comes when the stretch ends).
SPANS = [("hour", "The next hour"), ("tonight", "The rest of today"), ("few_days", "Three days"), ("this_week", "A week")]
# The lapse plan (PRD step 2), first steps after a slip. Never "start counting again".
# Bingeing (Gate 3): never "get rid of" (echoes purging) or "recommit straight away" (invites skipping the next meal);
# the next meal at its usual time instead.
LAPSE = [
    ("tell", "Tell someone I trust", ALL),
    ("body", "Look after my body: water, food, rest", ALL),
    ("next_meal", "Eat my next meal at the usual time", ["binge"]),
    ("recommit", "Recommit straight away", NOT_BINGE),
    ("chain", "Look at what led to it, the next day", ALL),
    ("rid", "Get rid of what's left", NOT_BINGE),
    ("kind", "Talk to myself like a friend would", ALL),
]
# Burning bridges (H17), per behaviour; `other` for own words.
BURN = [
    ("no_stock", "Stop keeping it in the house", ["drink", "smoke"]),
    ("pour", "Pour away what's here, once it's safe to stop", ["drink"]),
    ("route", "Take a way home that doesn't pass the shop", ["drink", "smoke"]),
    ("order", "Decide what I'll order instead when I'm out", ["drink"]),
    ("dealer", "Delete my dealer's number", ["drugs"]),
    ("stash", "Get rid of the stash", ["drugs", "other"]),
    ("people", "Step back from people I use with", ["drugs", "drink"]),
    ("cash", "Stop carrying spare cash", ["drugs", "gamble"]),
    ("lighters", "Bin the lighters and spares", ["smoke"]),
    ("list", "Shop with a list, after eating", ["binge"]),
    ("bulk", "Buy single portions of the foods I binge on", ["binge"]),
    ("meals", "Eat regular meals so I'm not starving", ["binge"]),
    ("bank_block", "Turn on gambling blocks with my bank", ["gamble"]),
    ("exclude", "Self-exclude from betting sites and venues", ["gamble"]),
    ("cards", "Remove saved cards", ["gamble", "spend"]),
    ("unsub", "Unsubscribe from shop emails", ["spend"]),
    ("shop_apps", "Delete the shopping apps", ["spend"]),
    ("wait", "Wait two days before buying anything I don't need today", ["spend"]),
    ("hide_app", "Delete or hide the app", ["scroll"]),
    ("limit", "Set a time limit on my phone", ["scroll"]),
    ("bedroom", "Charge my phone outside the bedroom", ["scroll", "porn", "check"]),
    ("mute", "Mute or block their profile", ["check"]),
    ("logout", "Log out of the app", ["check", "scroll"]),
    ("history", "Delete the bookmark and search history", ["check", "porn"]),
    ("blocker", "Install a content blocker", ["porn"]),
    ("easy", "Block or delete what makes it easy", ["other"]),
    ("routine", "Change the routine that leads there", ["other", "binge", "porn"]),
    ("tell", "Tell someone what I'm doing", ["other", "drink", "drugs", "gamble"]),
]
# Apparently irrelevant behaviours (H17).
RISKY = [
    # Not for bingeing (Gate 3): food in the house and "one" are not risks; restraint drives binges.
    ("spare", "Keeping some spare, in case", ["drink", "drugs", "smoke", "other"]),
    ("near", "Going near the place, only to look", ["drink", "drugs", "gamble", "spend", "other"]),
    ("one", "Telling myself one won't hurt", NOT_BINGE),
    ("people", "Seeing people I do it with", ["drink", "drugs", "smoke", "gamble", "other"]),
    ("halt", "Being alone, tired or hungry", BEHAVIOURS + ["other"]),
    ("payday", "Payday, or having money spare", ["drink", "drugs", "gamble", "spend", "other"]),
    ("late", "Staying up late", ["scroll", "porn", "check", "binge", "drink", "other"]),
    ("bad_news", "After an argument or bad news", BEHAVIOURS + ["other"]),
    ("phone_bed", "Taking my phone to bed", ["scroll", "porn", "check"]),
]
# New bridges (PRD step 4): a competing image or sensation, never food, drink or shopping (C6.7).
# A walk is never offered for bingeing (it can become compensatory exercise, Gate 3).
BUILD = [
    ("image", "Picture something I'd rather be doing", ALL),
    ("cold", "Cold water, or hold something cold", ALL),
    ("ride", "Ride it out: watch it rise and fall", ALL),
    ("puzzle", "Give my mind a job: a puzzle, counting", ALL),
    ("move", "Get moving: a walk round the block", NOT_BINGE),
    ("text", "Text someone I trust", ALL),
]
# Community reinforcement (PRD step 5), optional.
REINFORCE = [
    ("money", "Money"),
    ("sleep", "Better sleep"),
    ("mornings", "Clear mornings"),
    ("trust", "People trusting me"),
    ("time", "Time for things I like"),
    ("health", "Feeling better in my body"),
    ("respect", "Respecting myself"),
]
REMIND = [("yes", "Yes, check in with me"), ("no", "No thanks")]
KEEPIT = [("keep", "Keep it in Me"), ("not_now", "Not this time")]
# The weekly check (H17: addict mind, clean mind, clear mind). Window chips of `clear_mind`; skipping books nothing.
WEEKLY = [("week", "Yes, once a week")]
CLEAR_NEXT = [("week", "Same time next week")]
# Signs, tagged by the mind they point to. Never a count, never a score: the loudest kind names the week.
MIND_SIGNS = [
    ("did_it", "I did it", "addict"),
    ("thinking", "Thinking about it a lot", "addict"),
    ("secret", "Keeping it from people", "addict"),
    ("excuses", "Telling myself it doesn't matter", "addict"),
    ("beaten", "Feeling like I've beaten it", "clean"),
    ("slide", "Letting the plan slide", "clean"),
    ("way_back", "Leaving myself a way back, in case", "clean"),
    ("near", "Going near old places or people", "clean"),
]
ADDICT = {"any": [{"has": [a("signs.ids"), v]} for v, _, m in MIND_SIGNS if m == "addict"]}
CLEAN = {"any": [{"has": [a("signs.ids"), v]} for v, _, m in MIND_SIGNS if m == "clean"]}
RENEW = [("held", "I kept to it"), ("slip", "I slipped"), ("stop", "I'm not ready to go again")]

# A per-behaviour chip shows for the behaviour picked; with own words, the `other` ones.
PER_WHAT = {"any": [
    *[{"all": [{"eq": [a("what"), v]}, {"eq": [f"$opt.{v}", True]}]} for v in BEHAVIOURS],
    {"all": [OWN_WHAT, {"eq": ["$opt.other", True]}]},
]}


def field(fid, lst, *, mx=1, required=True, own=None, where=None, extra=None):
    f = {"id": fid, "options": {"list": lst, **({"where": where} if where else {})}, "max": mx, "required": required,
         "links": [SAFETY_LINK], **(extra or {})}
    if own:
        f["own"] = {"hint": own, "countsAsPick": True}
    return f


def ask(sid, title, hint, f, nxt, **extra):
    s = {"id": sid, "kind": "ask", "title": title, "fields": [f], "next": nxt, **extra}
    if hint:
        s["hint"] = hint
    return s


def handoff(sid, lines, offers, *, no_close=False, crisis=None):
    s = {"id": sid, "kind": "handoff", "complete": True, "lines": lines, "offers": offers, "done": "done",
         "links": [SAFETY_LINK]}
    if no_close:
        s["noClose"] = True
    if crisis:
        s["crisis"] = crisis
    return s


AFTER_WHAT = [{"when": {"any": [SUBSTANCE, OWN_WHAT]}, "to": "medical"}, {"when": {"eq": [a("what"), "binge"]}, "to": "eating"}, {"to": "span"}]

STEPS = [
    ask("what", "what_title", "what_hint", {**field("what", "what", own="what_own"), "options": {"list": "what", "firstFrom": "$ctx.urgeId"}},
        [{"when": {"eq": [a("what"), "hurt"]}, "to": "harm"}, {"when": FLOODED, "to": "heads_up"}, *AFTER_WHAT]),
    # Hurting myself: the resources open over the card as it arrives (C6.5), the banner stays; no plan, no close.
    {**handoff("harm", [{"when": ALWAYS, "key": "harm_line"}], [{"exit": "safety_open", "when": ALWAYS}, {"exit": "crisis_kit", "when": ALWAYS}],
               no_close=True, crisis=[{"variant": "crisis", "when": ALWAYS}]),
     "safetyFirst": ALWAYS},
    ask("heads_up", "heads_up_title", "heads_up_hint", field("heads_up", "heads_up"),
        [{"when": {"eq": [a("heads_up"), "settle"]}, "to": "settle"}, *AFTER_WHAT]),
    handoff("settle", [{"when": ALWAYS, "key": "settle_line"}],
            [{"exit": "cool_down", "when": ALWAYS}, {"exit": "urge_surfing", "when": ALWAYS}], no_close=True),
    # One optional tap each: said once, never a gate.
    ask("medical", [{"when": OWN_WHAT, "key": "medical_title_own"}, {"key": "medical_title"}], "medical_hint", field("medical", "support", required=False), [{"to": "span"}]),
    ask("eating", "eating_title", "eating_hint", field("eating", "support", required=False), [{"to": "span"}]),
    ask("span", [{"when": SUBSTANCE, "key": "span_title_sub"}, {"key": "span_title"}], "span_hint", field("span", "span"), [{"to": "lapse"}]),
    ask("lapse", "lapse_title", "lapse_hint", field("lapse", "lapse", mx=3, own="lapse_own", where=PER_WHAT), [{"to": "burn"}]),
    ask("burn", "burn_title", "burn_hint",
        field("burn", "burn", mx=3, required=False, own="burn_own", where=PER_WHAT), [{"to": "risky"}]),
    ask("risky", "risky_title", "risky_hint",
        field("risky", "risky", mx=3, required=False, own="risky_own", where=PER_WHAT), [{"to": "build"}]),
    ask("build", "build_title", "build_hint",
        field("build", "build", mx=2, own="build_own", where=PER_WHAT),
        [{"when": {"has": [a("build.ids"), "image"]}, "to": "imagine"}, {"to": "reinforce"}]),
    {"id": "imagine", "kind": "embed", "embed": "doseTimer", "answerAs": "imagine", "title": "imagine_title",
     "props": {"seconds": 30, "step1": "imagine_step1", "step2": "imagine_step2", "step3": "imagine_step3",
               "start": "start", "running": "imagine_running", "done": "imagine_done", "next": "next"},
     "links": [SAFETY_LINK], "next": [{"to": "reinforce"}]},
    ask("reinforce", "reinforce_title", "reinforce_hint",
        field("reinforce", "reinforce", mx=3, required=False, own="reinforce_own"), [{"to": "card"}]),
    {"id": "card", "kind": "embed", "embed": "boundaryLine", "answerAs": "card", "title": "card_title",
     # A list card: the lapse plan on paper, no Copy (nothing to send). One list, so it never mixes with the cravings.
     "props": {"field": "lapse", "shape": "list", "next": "card_next"},
     "links": [SAFETY_LINK], "next": [{"to": "remind"}]},
    ask("remind", "remind_title", "remind_hint", field("remind", "remind"), [{"to": "weekly"}],
        followUp={"type": "habit_renew", "whenFrom": "span", "when": {"eq": [a("remind"), "yes"]}}),
    # The weekly clear-mind check, optional (skipping books nothing).
    ask("weekly", "weekly_title", "weekly_hint", field("weekly", "weekly", required=False), [{"to": "keep"}],
        followUp={"type": "clear_mind", "whenFrom": "weekly"}),
    # Keep (R4) on *Keep it in Me*: that tap is the yes (C2.2).
    ask("keep", "keep_title", None, field("keepit", "keepit"), [{"to": "end"}],
        keep={"kind": "abstinence_plan", "many": True, "when": KEPT,
              "from": ["what", "span", "lapse", "burn", "risky", "build", "reinforce"]},
        primary="keep_primary"),
    handoff("end", [{"when": KEPT, "key": "end_kept"}, {"when": ALWAYS, "key": "end_line"}],
            [{"exit": "urge_surfing", "when": ALWAYS}, {"exit": "pros_cons", "when": ALWAYS}]),
    # --- The renewal: the habit_renew card reopens the run here (R9) ---
    ask("renew", "renew_title", "renew_hint", field("renew", "renew"),
        [{"when": {"all": [SLIP, {"any": [SUBSTANCE, OWN_WHAT]}]}, "to": "after_use"}, {"when": SLIP, "to": "slipped"},
         {"when": {"eq": [a("renew"), "stop"]}, "to": "stop"}, {"to": "again"}],
        reopens={"after": "remind", "again": ["again"]}, clears=["renew", "after_use", "slipped", "again_span"]),
    # Drink or drugs (or own words) after a slip: the overdose risk first, with the medical banner (Gate 3).
    ask("after_use", [{"when": OWN_WHAT, "key": "after_use_title_own"}, {"key": "after_use_title"}], "after_use_hint",
        field("after_use", "ok_now", required=False), [{"to": "slipped"}],
        crisis=[{"variant": "medical", "when": ALWAYS}]),
    # The lapse plan they wrote, before anything else (PRD step 2: "A slip isn't a relapse").
    {"id": "slipped", "kind": "embed", "embed": "boundaryLine", "answerAs": "slipped", "title": "slipped_title",
     "props": {"field": "lapse", "shape": "list", "next": "slipped_next"},
     "links": [SAFETY_LINK], "next": [{"to": "again"}]},
    ask("again", [{"when": SLIP, "key": "again_title_slip"}, {"key": "again_title"}], "span_hint",
        field("again_span", "span"), [{"to": "again_end"}],
        followUp={"type": "habit_renew", "whenFrom": "again_span"}),
    handoff("again_end", [{"when": SLIP, "key": "again_end_slip"}, {"when": ALWAYS, "key": "again_end_held"}],
            [{"exit": "urge_surfing", "when": SLIP}]),
    # --- The weekly check: the clear_mind card reopens the run here (R9) ---
    ask("clear", "clear_title", "clear_hint", field("signs", "mind_signs", mx=4, required=False),
        [{"when": {"has": [a("signs.ids"), "did_it"]}, "to": "slipped_week"}, {"to": "clear_next"}],
        reopens={"after": "weekly", "again": ["clear_next"]}, clears=["signs", "slipped_week", "clear_next"]),
    # Did it this week: the lapse plan they wrote, before anything else (as the renewal's slip).
    {"id": "slipped_week", "kind": "embed", "embed": "boundaryLine", "answerAs": "slipped_week", "title": "slipped_title",
     "props": {"field": "lapse", "shape": "list", "next": "slipped_next"},
     "links": [SAFETY_LINK], "next": [{"to": "clear_next"}]},
    # The week named by its loudest mind (addict first), then next week's check, optional.
    ask("clear_next", [{"when": ADDICT, "key": "clear_addict"}, {"when": CLEAN, "key": "clear_clean"}, {"key": "clear_clear"}],
        "clear_next_hint", field("clear_next", "clear_next", required=False), [{"to": "clear_end"}],
        followUp={"type": "clear_mind", "whenFrom": "clear_next"}),
    handoff("clear_end", [{"when": ALWAYS, "key": "clear_end"}],
            [{"exit": "urge_surfing", "when": ADDICT}, {"exit": "pros_cons", "when": {"any": [ADDICT, CLEAN]}}]),
    handoff("stop", [{"when": ALWAYS, "key": "stop_line"}],
            [{"exit": "urge_surfing", "when": ALWAYS}, {"exit": "pros_cons", "when": ALWAYS}]),
]

EXITS = [
    {"id": "urge_surfing", "toolId": "urge-surfing"},                    # DT-05 Ride it out
    {"id": "pros_cons", "toolId": "pros-cons"},                          # DT-10 a card for a pull that keeps coming back
    {"id": "cool_down", "toolId": "cool-down"},                          # DT-01 First, the body (flooded)
    {"id": "crisis_kit", "toolId": "crisis-kit", "query": {"frame": "crisis"}},       # DT-03 My crisis kit, opened from a crisis route (the banner on every card)
    {"id": "safety_open", "toolId": None, "safety": True},               # safety.open (R6)
    {"id": "done", "done": True},
]


def options():
    out = [("what", v, label, props, None) for v, label, props in WHATS]
    out += [("heads_up", v, label, {}, None) for v, label in HEADS_UP]
    out += [("ok_now", v, label, {}, None) for v, label in OK_NOW]
    out += [("support", v, label, {}, None) for v, label in SUPPORT]
    out += [("span", v, label, {}, None) for v, label in SPANS]
    out += [("lapse", v, label, {w: True for w in whats}, None) for v, label, whats in LAPSE]
    out += [("burn", v, label, {w: True for w in whats}, None) for v, label, whats in BURN]
    out += [("risky", v, label, {w: True for w in whats}, None) for v, label, whats in RISKY]
    out += [("build", v, label, {w: True for w in whats}, None) for v, label, whats in BUILD]
    out += [("reinforce", v, label, {}, None) for v, label in REINFORCE]
    out += [("remind", v, label, {}, None) for v, label in REMIND]
    out += [("keepit", v, label, {}, None) for v, label in KEEPIT]
    out += [("renew", v, label, {}, None) for v, label in RENEW]
    out += [("weekly", v, label, {}, None) for v, label in WEEKLY]
    out += [("clear_next", v, label, {}, None) for v, label in CLEAR_NEXT]
    out += [("mind_signs", v, label, {"mind": m}, None) for v, label, m in MIND_SIGNS]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "what", "ownMax": OWN_MAX,
    "accepts": ["band", "urgeId"],
    "copy": COPY, "tables": {}, "derive": [], "steps": STEPS, "exits": EXITS, "options": options(),
    "emotionFields": [],
}
