# The safety route's content (CORE-01, docs/design/safety-route.md): the one editable source for
# schema/safety-route.cypher (build.py) and src/data/content/safety.json (fixture.py --ship).
#
# What lives here:
#   - FLOW: SafetyScreenFlow, the question and every screen of the route as copy (A the question,
#     B strong thoughts, C a plan or an act, the exit, the next-morning check-in);
#   - ASK_PATTERNS / SCREEN_EMOTIONS: when the check-in asks (ASKS_SAFETY, Emotion.safetyScreen);
#   - FLAGS: the SafetyFlag rewrite (userCopy apart from the clinician `action`; crisis_suicidal.doNot fixed);
#   - COUNTRIES / LINES: Country and CrisisLine (COVERS → Country). Hand-curated (open question 1's default);
#     every line carries `checkedAt` (the day it was looked up) and `verifiedAt` (null until a person has
#     called or confirmed it with the service: the audit, never shown to the user);
#   - POLICY: SafetyPolicy {id: 'safety_route'}, the one switch. Off: the check-in behaves exactly as before
#     (the crisis banner on a TRIGGERS_SAFETY crisis flag, low-unpleasant skipped). On: it asks.
#
# REVIEW: every string is a draft for the clinician pass (PRD open question 5). Voice: flat and warm, no
# cheer, no "should", no "just", no exclamation marks, no pledge, no method words, nothing about family.

VERSION = "safety-v1"
REVIEW_STATUS = "draft"

# ---- When to ask -------------------------------------------------------------------------------------
# PRD CORE-01 entry 2. A pattern with any TRIGGERS_SAFETY edge asks; the low-unpleasant ones are no longer
# skipped (hopelessness, emptiness and numbness are where passive ideation lives). Clinical to confirm.
ASK_PATTERNS = [
    "emotional_flooding",
    "dissociation_overmodulation",
    "rumination_loop",
    "conservation_freeze",
    "reward_drive_low",
]
# Emotion.safetyScreen. The PRD's list is hopeless, worthless, trapped, empty, despair, self-hatred, numb;
# hopeless, trapped and self-hatred aren't check-in words, so helpless and powerless stand in for hopeless
# and trapped until they are (clinical to confirm, open question 3).
SCREEN_EMOTIONS = ["worthless", "empty", "despair", "numb", "helpless", "powerless"]

# Asking frequency (PRD): at most once per 12 h after a no; every time while the last answer was anything
# else within 72 h. A non-no answer in the last 72 h also asks on any unpleasant check-in, triggered or not.
REPEAT = {"afterNoHours": 12, "afterOtherHours": 72}

# Answers, in rank order (a SafetyCheck's answer only ever moves up: plan → act after the medical question).
ANSWER_RANK = {"no": 0, "declined": 1, "passing": 1, "strong": 2, "plan": 3, "act": 4}

# ---- The flow -----------------------------------------------------------------------------------------
PEOPLE = {
    "heading": "People you can talk to",
    "emergency": "Emergency: {number}",
    "call": "Call",
    "text": "Text",
    "chat": "Chat",
    "textBody": "Text {body} to {number}",
    "allDay": "Any time, day or night",
    "notIn": "Not in {country}?",
    "pickCountry": "Where are you?",
    "noLine": "We don't have a checked line for {country} yet. Find A Helpline lists the ones near you.",
    "findLine": "Find a line near you",
    "fromPlan": "Someone from your plan",
    "unknownCountry": "Your local emergency number",
    "emergencyOr": "Emergency: {number} or {alt}",
}

FLOW = {
    "version": VERSION,
    "repeat": REPEAT,
    "answerRank": ANSWER_RANK,
    "findAHelpline": {"label": "Find A Helpline", "url": "https://findahelpline.com"},
    "people": PEOPLE,
    "header": {"label": "Help & safety", "plan": "My safety plan", "makePlan": "Make a safety plan", "people": "People you can talk to",
               "say": "I'm thinking about hurting myself"},
    # A: one screen, one tap.
    "question": {
        "title": "Sometimes feelings like this come with thoughts of hurting yourself or not wanting to be alive. Is that part of it right now?",
        "choices": [
            {"id": "no", "label": "No"},
            {"id": "passing", "label": "Some passing thoughts"},
            {"id": "strong", "label": "Yes, strong thoughts"},
            {"id": "plan", "label": "I have a plan, or I've already done something"},
            {"id": "declined", "label": "I'd rather not say"},
        ],
        # Help me now's own wording (PRD CORE-07): the self-harm card opens the question, worded for that entry.
        "helpNowTitle": "Let's get you to people first. Which is closest right now?",
        # *I'm thinking about hurting myself* (the header's item) and Help me now's card: the person has already said
        # it, so there's no No, and only the say-it entry thanks them. The plain header button opens People first.
        "saidTitle": "Thanks for saying it. Which is closest right now?",
        "saidChoices": [
            {"id": "passing", "label": "Some passing thoughts"},
            {"id": "strong", "label": "Strong thoughts"},
            {"id": "plan", "label": "I have a plan, or I've already done something"},
            {"id": "declined", "label": "I'd rather not say"},
        ],
    },
    "passing": {
        "line": "Thanks for telling me. That's worth taking seriously, even when it's passing.",
        "plan": "Your safety plan",
        "makePlan": "Make a safety plan",
        "makePlanSub": "Five minutes, whenever you're ready",
        "people": "People you can talk to",
        "continue": "Carry on",
    },
    # *I'd rather not say*: the passing screen's buttons, its own line (nothing was told).
    "declined": {"line": "That's okay. These are here if you want them."},
    # B: the calm crisis screen. Order is fixed: people, plan, safer space, a body skill below, the exit.
    "strong": {
        "title": "You don't have to hold this on your own right now.",
        "plan": "Open your plan",
        "quickPlan": "Make a quick plan",
        "quickPlanSub": "Three screens, about a minute",
        "meansFirst": "First, one thing to make right now a bit safer.",
        "whileYouDecide": "While you decide",
        "fromYourPlan": "From your plan",
    },
    "quickPlan": {
        "steps": [
            {"id": "sign", "title": "One thing you're noticing right now that tells you it's a hard time", "placeholder": "In your words"},
            {"id": "do", "title": "One thing you can do for the next ten minutes", "placeholder": "In your words"},
            {"id": "contact", "title": "One person or line you'll contact", "placeholder": "A name, or a line"},
        ],
        "ownMax": 120,
        "save": "Keep this",
        "saved": "It's kept. It opens from Help & safety.",
        "deviceSaved": "It's kept on this device.",
    },
    "means": {
        "title": "Is there anything nearby you might use to hurt yourself?",
        "choices": [{"id": "yes", "label": "Yes"}, {"id": "not_sure", "label": "Not sure"}, {"id": "no", "label": "No"}],
        "actionsTitle": "Which of these could you do?",
        "actions": [
            {"id": "other_room", "label": "Put it in another room"},
            {"id": "give_someone", "label": "Give it to someone"},
            {"id": "lock_away", "label": "Lock it away"},
            {"id": "leave_room", "label": "Leave the room myself"},
            {"id": "cant_now", "label": "I can't right now"},
        ],
        "did": "I did it",
        # The plan builder's version (CORE-02 step 6, calm only). medsLine and firearm are for building the plan,
        # never shown at the moment of crisis.
        "calmTitle": "On a hard night, what would be safer out of reach? Who could keep it for you?",
        "medsLine": "Keeping only a small amount of medicine at home, and the rest with someone you trust, makes a hard night safer.",
        "firearm": "If there's a gun in the home, could someone else hold it for now, or could it be locked with the key kept elsewhere?",
    },
    # C: a plan or an act. Medical first: on yes / not sure the emergency number and medicalTitle are the first thing on
    # the screen, and kindTitle sits below them, never before. No "not that kind of hurt" once anything was taken, or
    # when either answer was not sure (`showWhen`).
    "act": {
        "title": "Have you already done something to hurt yourself, or taken something?",
        "choices": [{"id": "yes", "label": "Yes"}, {"id": "no", "label": "No"}, {"id": "not_sure", "label": "Not sure"}],
        "kindTitle": "Was it something you took, or an injury?",
        "kinds": [
            {"id": "took", "label": "Something I took or swallowed"},
            {"id": "injury", "label": "An injury"},
            {"id": "not_sure", "label": "Not sure"},
        ],
        "medicalTitle": "If you're hurt or you've taken something, the emergency number is the right call, even if it feels like too much.",
        "medicalLine": "Don't wait to see if it gets better.",
        "tookLine": "Some things you take don't hurt at first and do harm hours later. Call now, even if you feel all right. Keep the packaging or the name of what you took.",
        "poison": "Poison information",
        "medicalChoices": [
            {"id": "got_help", "label": "I've got help"},
            {"id": "getting_help", "label": "I'm getting help"},
            {"id": "not_that_kind", "label": "It's not that kind of hurt", "showWhen": {"act": "yes", "kind": "injury"}},
        ],
        "firstAid": "Rinse it under cool running water and cover it with something clean. Press firmly on a cut until it stops. If it's deep or gaping, still bleeding after ten minutes of pressure, a burn bigger than your palm, or you feel faint, call the emergency number.",
        "nextDay": "Tomorrow, when it's quieter, a look at what led up to this can help next time.",
        "nextDayChoices": [{"id": "yes", "label": "Remind me tomorrow"}, {"id": "no", "label": "No thanks"}],
    },
    "exit": {
        "button": "I'm okay for now",
        "title": "Before you go, which is closest?",
        "choices": [
            {"id": "plan", "label": "I'll use my plan"},
            {"id": "contacted", "label": "I've contacted someone"},
            {"id": "stop", "label": "I need to stop here"},
        ],
        "back": "Back to where I was",
    },
    "checkin": {
        "title": "Can I check in with you tomorrow morning?",
        "choices": [{"id": "yes", "label": "Yes"}, {"id": "no", "label": "No thanks"}],
    },
    # The next-morning check (FollowUpType safety_checkin). Content-free on Today and in notifications.
    "morning": {
        "title": "How are you this morning?",
        "choices": [
            {"id": "okay", "label": "Doing okay"},
            {"id": "hard", "label": "Still hard"},
            {"id": "not_safe", "label": "I'm not safe"},
        ],
        "okay": "Glad you're here.",
        "hard": "Thanks for saying. Your plan, or something for the next few minutes.",
        "twiceHard": "Two hard mornings in a row. A doctor, therapist or a non-crisis support line can help with this, and you don't have to be in crisis to call.",
    },
    "signedOut": {
        "saveToAccount": "Save this plan to your account so it's there next time?",
        "save": "Save it",
        "notNow": "Not now",
    },
    "cantTell": "Goblin can't judge how safe you are right now. The people on these lines are trained to help with that.",
}

# ---- SafetyFlag rewrite ------------------------------------------------------------------------------
# `action` stays the clinician's line; `userCopy` is what a screen may show. crisis_suicidal.doNot used to
# forbid coping tools, which contradicts Stanley–Brown (the person's own coping is step 2).
FLAGS = {
    "crisis_suicidal": {
        "doNot": "Show coping instead of, or before, people and crisis lines",
        "userCopy": "People you can talk to are here, any time.",
    },
    "crisis_self_harm": {
        "doNot": "Show coping instead of, or before, people and crisis lines",
        "userCopy": "People you can talk to are here, any time.",
    },
    "clinical_referral_shutdown": {
        "userCopy": "If this has gone on for a while, a doctor or therapist can help with it too.",
    },
    "clinical_referral_psychosis": {
        "userCopy": "What you're going through sounds hard. A doctor or therapist can help make sense of it with you.",
    },
    "clinical_referral_severe_dissociation": {
        "userCopy": "If feeling far away keeps happening, a doctor or therapist can help with it too.",
    },
}

# ---- Concepts and sources -----------------------------------------------------------------------------
CONCEPTS = [
    # id, name, appToolId, description, sources. core_safety_route takes appToolId "safety" with the route's
    # page (PR 2): the official-names test refuses a tool id the app doesn't have yet.
    ("core_safety_route", "Safety route", None,
     "Ask plainly once, people first, the person's own plan, a safer space, a check-in the next morning.",
     ["stanley_brown_2012", "dazzi_2014", "law_2015"]),
    ("core_means_safety", "Means safety", None,
     "Putting time and distance between a person and the means on a hard night.",
     ["barber_miller_2014"]),
]
SOURCES = [
    ("stanley_brown_2012", "Stanley & Brown (2012). Safety Planning Intervention: a brief intervention to mitigate suicide risk. Cognitive and Behavioral Practice 19(2).",
     "https://doi.org/10.1016/j.cbpra.2011.01.001"),
    ("barber_miller_2014", "Barber & Miller (2014). Reducing a suicidal person's access to lethal means of suicide. American Journal of Preventive Medicine 47(3S2).",
     "https://doi.org/10.1016/j.amepre.2014.05.028"),
    ("dazzi_2014", "Dazzi et al. (2014). Does asking about suicide and related behaviours induce suicidal ideation? Psychological Medicine 44(16).",
     "https://doi.org/10.1017/S0033291714001299"),
    ("law_2015", "Law et al. (2015). A randomized controlled trial of asking about suicidal ideation. (Moderate evidence, KB §6.)",
     ""),
]

# ---- Countries and lines ------------------------------------------------------------------------------
CHECKED = "2026-11-12"
# code, name, emergency number, firearmPrompt, lines (ids, in the order shown). EMERGENCY_ALT: a second number people
# know as well (Ireland's 999) or the medical one (France's SAMU, 15), shown beside the first.
COUNTRIES = [
    ("US", "the United States", "911", True, ["us_988", "us_crisis_text", "us_poison"]),
    ("CA", "Canada", "911", True, ["ca_988"]),
    ("GB", "the UK", "999", False, ["gb_samaritans", "gb_shout", "gb_nhs111", "gb_lifeline_ni"]),
    ("IE", "Ireland", "112", False, ["ie_samaritans", "ie_text_about_it"]),
    ("AU", "Australia", "000", False, ["au_lifeline", "au_lifeline_text", "au_poisons"]),
    ("NZ", "New Zealand", "111", False, ["nz_1737", "nz_lifeline", "nz_poisons"]),
    ("FR", "France", "112", False, ["fr_3114"]),
    ("DE", "Germany", "112", False, ["de_telefonseelsorge"]),
    ("ES", "Spain", "112", False, ["es_024"]),
    ("NL", "the Netherlands", "112", False, ["nl_113"]),
    ("SE", "Sweden", "112", False, ["se_90101"]),
    ("IN", "India", "112", False, ["in_tele_manas"]),
    # Emergency number only: the route shows Find A Helpline for a line.
    ("IT", "Italy", "112", False, []),
]
EMERGENCY_ALT = {"IE": "999", "FR": "15"}
# id, country, name, kind, phone, sms, smsBody, chatUrl, hours, languages, source
LINES = [
    ("us_988", "US", "988 Suicide & Crisis Lifeline", "crisis", "988", "988", None, "https://988lifeline.org/chat/", "24/7", ["en", "es"], "https://988lifeline.org"),
    ("us_crisis_text", "US", "Crisis Text Line", "text", None, "741741", "HOME", None, "24/7", ["en"], "https://www.crisistextline.org"),
    ("us_poison", "US", "Poison Control", "poison", "1-800-222-1222", None, None, None, "24/7", ["en", "es"], "https://www.poison.org"),
    ("ca_988", "CA", "9-8-8 Suicide Crisis Helpline", "crisis", "988", "988", None, None, "24/7", ["en", "fr"], "https://988.ca"),
    ("gb_samaritans", "GB", "Samaritans", "crisis", "116 123", None, None, None, "24/7", ["en"], "https://www.samaritans.org"),
    ("gb_shout", "GB", "Shout", "text", None, "85258", "SHOUT", None, "24/7", ["en"], "https://giveusashout.org"),
    ("gb_nhs111", "GB", "NHS 111, mental health option (England, Scotland, Wales)", "urgent", "111", None, None, None, "24/7", ["en"], "https://111.nhs.uk"),
    ("gb_lifeline_ni", "GB", "Lifeline (Northern Ireland)", "crisis", "0808 808 8000", None, None, None, "24/7", ["en"], "https://www.lifelinehelpline.info"),
    ("ie_samaritans", "IE", "Samaritans", "crisis", "116 123", None, None, None, "24/7", ["en"], "https://www.samaritans.org/ireland"),
    ("ie_text_about_it", "IE", "Text About It", "text", None, "50808", "HELLO", None, "24/7", ["en"], "https://text50808.ie"),
    ("au_lifeline", "AU", "Lifeline", "crisis", "13 11 14", None, None, "https://www.lifeline.org.au/crisis-chat/", "24/7", ["en"], "https://www.lifeline.org.au"),
    ("au_lifeline_text", "AU", "Lifeline Text", "text", None, "0477 13 11 14", None, None, "24/7", ["en"], "https://www.lifeline.org.au/text"),
    ("au_poisons", "AU", "Poisons Information Centre", "poison", "13 11 26", None, None, None, "24/7", ["en"], "https://www.poisonsinfo.health.qld.gov.au"),
    ("nz_1737", "NZ", "1737 Need to talk?", "crisis", "1737", "1737", None, None, "24/7", ["en"], "https://1737.org.nz"),
    ("nz_lifeline", "NZ", "Lifeline Aotearoa", "crisis", "0800 543 354", "4357", None, None, "24/7", ["en"], "https://www.lifeline.org.nz"),
    ("nz_poisons", "NZ", "National Poisons Centre", "poison", "0800 764 766", None, None, None, "24/7", ["en"], "https://poisons.co.nz"),
    ("fr_3114", "FR", "3114, numéro national de prévention du suicide", "crisis", "3114", None, None, None, "24/7", ["fr"], "https://3114.fr"),
    ("es_024", "ES", "024, Línea de atención a la conducta suicida", "crisis", "024", None, None, None, "24/7", ["es"], "https://www.sanidad.gob.es/linea024/home.htm"),
    ("nl_113", "NL", "113 Zelfmoordpreventie", "crisis", "0800 0113", None, None, "https://www.113.nl", "24/7", ["nl"], "https://www.113.nl"),
    ("se_90101", "SE", "Självmordslinjen (Mind)", "crisis", "90101", None, None, "https://mind.se/hitta-hjalp/sjalvmordslinjen/", "24/7", ["sv"], "https://mind.se"),
    ("in_tele_manas", "IN", "Tele-MANAS", "crisis", "14416", None, None, None, "24/7", ["en", "hi"], "https://telemanas.mohfw.gov.in"),
    ("de_telefonseelsorge", "DE", "TelefonSeelsorge", "crisis", "0800 111 0 111", None, None, "https://online.telefonseelsorge.de", "24/7", ["de"], "https://www.telefonseelsorge.de"),
]
LINE_KINDS = ["crisis", "text", "chat", "poison", "urgent", "youth", "lgbtq", "warmline"]

# ---- The switch ---------------------------------------------------------------------------------------
# Off until CORE-01's last PR. build.py refuses `enabled: True` while REVIEW_STATUS is "draft" unless
# APPROVED_TO_SHIP names the reason (Claudia: build and connect everything, a clinician tweaks after).
POLICY = {"id": "safety_route", "enabled": False, "version": VERSION}
APPROVED_TO_SHIP = None
