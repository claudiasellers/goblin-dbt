# Editable content for the PLEASE tool ("Running low"; app tool id `please-skill`). Regenerate
# schema/please.cypher with build.py after editing.
#
# What it is: DBT Emotion Regulation, reducing vulnerability (Linehan 2015, ER handouts 19–20b).
# PhysicaL illness, balanced Eating, Avoid mood-altering substances, balanced Sleep, Exercise.
# Fatigue, hunger, illness and hangovers are not emotions: they lower the threshold for every
# emotion. So Opposite Action sends "tired", "sleepy", "bored", "unfocused", "apathetic" and
# "indifferent" here (schema/opposite-action-data.cypher, oaAlternativeSkill "please-skill"), and
# Problem Solve offers it as a companion and barrier redirect.
#
# The flow: what's running low (curated PLEASE factors, add your own) → tired or heavy? (check the
# facts: depletion that rest fixes vs. a feeling that looks like tiredness, which goes to Find the
# feeling / Opposite Action instead) → one thing right now (actions offered from the factors picked)
# → protect tomorrow (sleep hygiene and cope ahead, up to two) → the plan. Nothing is saved.
#
# REVIEW (D-07): all copy is a draft (reviewStatus "draft") until Claudia signs it off.
# Voice rules (E3 §A5.2.4): no cheer, no "should", no "just", no numbers on feelings. Options are
# in the user's first-person voice so they recognise their own day.

VERSION = "please-v1"
REVIEW_STATUS = "draft"
CONCEPT_ID = "dbt_please"
APP_TOOL_ID = "please-skill"
SOURCE_IDS = ["linehan_skills_2015"]

# The five PLEASE areas, in the acronym's order. `letter` is what the UI shows on the group.
AREAS = [
    {"id": "illness", "letter": "PL", "name": "Physical illness"},
    {"id": "eating", "letter": "E", "name": "Eating"},
    {"id": "substances", "letter": "A", "name": "Avoid mood-altering substances"},
    {"id": "sleep", "letter": "S", "name": "Sleep"},
    {"id": "exercise", "letter": "E", "name": "Exercise"},
]

# Right-now actions (one is picked). Small enough to do while depleted.
NOW = {
    "eat_protein": "Eat something with some protein in it, soon",
    "water": "Drink a glass of water now",
    "real_meal": "Have a proper meal, even a small one",
    "rest_alarm": "Lie down for 20 minutes with an alarm set",
    "daylight": "Get ten minutes of daylight",
    "sick_care": "Treat it like being sick: rest, fluids, warmth",
    "usual_remedy": "Take what you'd normally take for this",
    "meds_check": "Check what's due and take it as prescribed",
    "food_before_decisions": "Food and water before any big decisions",
    "swap_coffee": "Swap the next coffee for water or food",
    "move_five": "Five minutes outside or by an open window",
    "sit_down": "Sit or lie down for 15 minutes",
    # Offered whatever was picked: lowering the bar is the skill when the tank is empty.
    "one_thing": "Shrink today to the one thing that has to happen",
    "hand_off": "Ask someone to take one thing off you",
}
NOW_ALWAYS = ["one_thing", "hand_off"]

# Protect tomorrow (up to two). Sleep hygiene items follow ER handout 20b.
LATER = {
    "same_wake": "Wake at the same time tomorrow, whatever tonight is like",
    "screens_down": "Screens down 30 minutes before bed",
    "get_up_if_awake": "If I can't sleep after about 20 minutes, get up and do something dull",
    "no_late_nap": "No naps after mid-afternoon",
    "first_meal": "Decide when tomorrow's first meal happens",
    "easy_food": "Have something easy ready to eat",
    "skip_alcohol": "Skip alcohol tonight",
    "caffeine_cutoff": "No caffeine after early afternoon",
    "book_it": "Book the appointment or refill I've been putting off",
    "short_walk": "Plan a short walk for tomorrow",
    "rest_day": "Give my body an easier day tomorrow",
    "cope_ahead": "Plan tomorrow for a tired me: what can come off the list?",
}
LATER_ALWAYS = ["cope_ahead", "same_wake"]
LATER_MAX = 2

# What's running low. Each factor offers its own right-now and protect-tomorrow options.
FACTORS = [
    {"id": "ill", "area": "illness", "label": "I'm getting sick, or I'm in pain",
     "now": ["sick_care", "usual_remedy", "water"], "later": ["book_it", "rest_day"]},
    {"id": "hormones", "area": "illness", "label": "My period, hormones or a flare-up",
     "now": ["sick_care", "usual_remedy"], "later": ["rest_day"]},
    {"id": "meds", "area": "illness", "label": "I've missed or changed my meds",
     "now": ["meds_check"], "later": ["book_it"]},
    {"id": "not_eaten", "area": "eating", "label": "I haven't eaten in a while",
     "now": ["eat_protein", "water"], "later": ["first_meal", "easy_food"]},
    {"id": "snacks", "area": "eating", "label": "Mostly snacks, sugar or caffeine today",
     "now": ["real_meal", "water"], "later": ["easy_food", "first_meal"]},
    {"id": "drank", "area": "substances", "label": "Alcohol or something else last night",
     "now": ["water", "food_before_decisions"], "later": ["skip_alcohol"]},
    {"id": "caffeine", "area": "substances", "label": "Running on caffeine",
     "now": ["swap_coffee", "eat_protein"], "later": ["caffeine_cutoff"]},
    {"id": "short_sleep", "area": "sleep", "label": "I didn't sleep enough",
     "now": ["rest_alarm", "daylight"], "later": ["same_wake", "screens_down", "no_late_nap"]},
    {"id": "broken_sleep", "area": "sleep", "label": "My sleep was broken, or way too late",
     "now": ["daylight", "rest_alarm"], "later": ["same_wake", "get_up_if_awake", "screens_down"]},
    {"id": "not_moved", "area": "exercise", "label": "I've barely moved today",
     "now": ["move_five", "daylight"], "later": ["short_walk"]},
    {"id": "overdid", "area": "exercise", "label": "I've pushed my body hard",
     "now": ["sit_down", "eat_protein", "water"], "later": ["rest_day"]},
]

# Emotion words that arrive from Opposite Action (or a check-in) put an area first. Order only:
# nothing is pre-selected.
AREA_FIRST = {
    "tired": "sleep", "sleepy": "sleep", "exhausted": "sleep",
    "unfocused": "sleep", "bored": "exercise", "apathetic": "eating", "indifferent": "eating",
}

# Check the facts: is this depletion, or a feeling that looks like tiredness? `points` says which.
CHECK = [
    {"id": "rest_restores", "label": "Rest or food usually brings me back", "points": "body"},
    {"id": "rest_flat", "label": "I rest and still get up flat", "points": "feeling"},
    {"id": "after_event", "label": "It started after something happened", "points": "feeling"},
    {"id": "lifts_moving", "label": "It lifts a bit once I get going", "points": "feeling"},
    {"id": "cant_tell", "label": "I can't tell", "points": "body"},
]

COPY = {
    "stages": {
        "factors": "What's running low",
        "check": "Tired or heavy?",
        "now": "Right now",
        "later": "Protect tomorrow",
        "done": "Your plan",
    },
    "factors": {
        "title": "Is your body part of this?",
        "body": "Running low on sleep, food or health makes every feeling louder and every task heavier. Pick anything that's true today, even a little.",
        "ownLabel": "Something else running low",
        "ownPlaceholder": "In your own words",
        "none": "None of these",
        "next": "Next",
    },
    "check": {
        "title": "Tired, or heavy?",
        "body": "Sadness, hopelessness and shame can feel like tiredness from the inside. Which of these sounds like you?",
        "next": "Next",
    },
    "feeling": {
        "title": "This might be a feeling that looks like tiredness",
        "body": "When rest doesn't refill you, or the heaviness came with something that happened, it's often an emotion pulling you to lie low. Resting can feed that. Naming it, or doing the opposite of the pull, tends to help more.",
        "findTheFeeling": "Find the word for it",
        "oppositeAction": "Do the opposite of the pull",
        "continue": "Look after my body first anyway",
    },
    "now": {
        "title": "One thing for right now",
        "body": "Pick the smallest one you'd actually do. Doing less today is part of the skill.",
        "ownLabel": "Something else",
        "ownPlaceholder": "What would help your body right now?",
        "next": "Next",
    },
    "later": {
        "title": "Protect tomorrow",
        "body": "Pick up to two. Tired days run on yesterday's choices.",
        "next": "See my plan",
        "skip": "Skip this for today",
    },
    "done": {
        "title": "Looking after your body is the skill",
        "body": "Feelings run hotter on an empty tank. Here's what you picked.",
        "nowLabel": "Right now",
        "laterLabel": "For tomorrow",
        "footnote": "Nothing you picked here is saved.",
        "restart": "Start over",
        "otherTools": "Explore other tools",
    },
}
