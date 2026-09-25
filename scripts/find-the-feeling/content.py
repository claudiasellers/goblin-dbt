# Editable content for "Find the feeling" (Shape it / Tune it). Regenerate the migration with build.py after editing.
# Clinical content: every word signature, gate and line of copy here needs clinical sign-off before launch.
# Signatures are hypotheses for OFFERING a word, never for diagnosing one. reviewStatus stays
# "needs_clinical_review" until signed off.

# ---------------------------------------------------------------------------
# Word signatures. Only existing Emotion ids (schema/emotion-wheel-sync.cypher).
#   shape: sharp, heat, weight, buzz, clench    each -1..1 (0 = neutral grey clay)
#          sharp  soft .. spiky        heat  cool .. hot        weight light .. heavy
#          buzz   still .. jittery     clench hollow .. tight
#   sound: rough, grit, register, pulse         each 0..1
#          rough  in tune .. beating   grit  pure .. gritty     register low .. high
#          pulse  steady .. tremolo
# `offer` = the order a word is offered within its family ("Close" walks the family, "Not that" jumps family).
# ---------------------------------------------------------------------------
FAMILIES = [
    # id, label (internal), words: (emotionId, shape{...}, sound[r,g,reg,p])
    ("heat_edge", "Hot and sharp", [
        ("frustrated", {"sharp": .6, "heat": .55, "buzz": .55, "clench": .1}, [.75, .7, .5, .65]),
        ("furious", {"sharp": .95, "heat": .95, "buzz": .8, "clench": .3}, [.9, .9, .5, .85]),
        ("resentful", {"sharp": .55, "heat": .45, "weight": .45, "buzz": -.1, "clench": .4}, [.6, .7, .25, .3]),
        ("disrespected", {"sharp": .5, "heat": .6, "weight": .2, "buzz": .35}, [.7, .55, .4, .5]),
    ]),
    ("heat_weight", "Hot and heavy", [
        ("humiliated", {"heat": .75, "weight": .75, "sharp": .15, "clench": -.2}, [.8, .35, .15, .2]),
        ("embarrassed", {"heat": .6, "weight": .35, "buzz": .35}, [.55, .25, .55, .45]),
        ("rejected", {"heat": .3, "weight": .6, "buzz": -.2, "clench": -.4}, [.65, .3, .2, .15]),
    ]),
    ("cool_weight", "Cool and heavy", [
        ("hurt", {"weight": .6, "heat": -.35, "buzz": -.5, "clench": -.3}, [.7, .2, .2, .12]),
        ("ashamed", {"weight": .85, "heat": -.15, "buzz": -.45, "clench": .35}, [.35, .8, .12, .15]),
        ("inferior", {"weight": .7, "heat": -.3, "buzz": -.3, "clench": .5, "sharp": -.2}, [.3, .75, .15, .15]),
        ("sad", {"weight": .7, "heat": -.45, "buzz": -.65, "sharp": -.4}, [.3, .1, .15, .08]),
        ("disappointed", {"weight": .5, "heat": -.3, "buzz": -.5, "sharp": -.2}, [.35, .2, .3, .1]),
    ]),
    ("tight_buzz", "Tight and buzzing", [
        ("anxious", {"clench": .55, "buzz": .7, "heat": -.3, "sharp": .3}, [.45, .3, .85, .85]),
        ("scared", {"clench": .85, "buzz": .8, "heat": -.6, "weight": -.2}, [.5, .35, .9, .9]),
        ("overwhelmed", {"buzz": .9, "weight": .5, "sharp": .4, "heat": .2}, [.7, .6, .6, .95]),
        ("insecure", {"clench": .5, "buzz": .4, "heat": -.35, "weight": .1}, [.35, .2, .7, .6]),
    ]),
    ("hollow", "Hollow and still", [
        ("lonely", {"clench": -.8, "heat": -.6, "buzz": -.6, "weight": .2}, [.1, .08, .18, .12]),
        ("abandoned", {"clench": -.7, "heat": -.45, "buzz": -.3, "weight": .55}, [.25, .1, .12, .2]),
        ("excluded", {"clench": -.6, "heat": -.4, "buzz": -.2, "weight": .1, "sharp": .15}, [.3, .15, .3, .2]),
        ("insignificant", {"clench": -.9, "heat": -.7, "buzz": -.8, "weight": -.5}, [.05, .05, .35, .05]),
    ]),
    ("dim", "Dim and far away", [
        ("tired", {"sharp": -.5, "heat": -.2, "weight": .95, "buzz": -.9}, [.1, .15, .1, .02]),
        ("empty", {"clench": -.95, "heat": -.8, "buzz": -.95, "weight": 0}, [.02, .02, .25, .0]),
        ("numb", {"sharp": -.2, "heat": -.9, "buzz": -1, "weight": .3, "clench": -.3}, [.0, .05, .2, .0]),
    ]),
    ("warm_light", "Warm and light", [
        ("content", {"sharp": -.7, "heat": .35, "weight": -.2, "buzz": -.5}, [.04, .05, .45, .1]),
        ("peaceful", {"sharp": -.9, "heat": .2, "weight": -.3, "buzz": -.8, "clench": -.1}, [.0, .0, .4, .05]),
        ("hopeful", {"sharp": -.5, "heat": .4, "weight": -.6, "buzz": .2}, [.08, .05, .7, .3]),
        ("excited", {"sharp": .1, "heat": .6, "weight": -.7, "buzz": .8}, [.2, .2, .8, .8]),
    ]),
]

# ---------------------------------------------------------------------------
# Urges (the "what does it want to do?" step). Same four as recovery-v1 plus a label for general use.
# routes: (appToolId-bearing TherapyConcept id, rank). The Cloud Function joins word routes (ADDRESSES)
# with these and returns at most two tools.
# ---------------------------------------------------------------------------
URGES = [
    ("fight", "Say something sharp", "prove them wrong, snap", [("dbt_stop", 0), ("dbt_opposite_action", 1)]),
    ("chase", "Text someone a lot", "explain, fix it, now", [("urge_surfing", 0), ("dbt_stop", 1)]),
    ("hide", "Disappear", "cancel, go quiet", [("dbt_opposite_action", 0)]),
    ("blank", "Nothing. I'm blank", "numb, heavy, far away", [("se_orienting", 0)]),
]

# App tool ids for the concepts this migration creates. Existing concepts get theirs from
# schema/app-tool-ids.cypher (loaded earlier); routing only ever targets concepts with an appToolId.
APP_TOOL_IDS = {
    "dbt_find_the_feeling": "find-the-feeling",
    "urge_surfing": "urge-surfing",
}

NEW_CONCEPTS = [
    # id, name, description, modality, module, parent (PART_OF, or "rel:<id>" for RELATED_TO)
    ("dbt_find_the_feeling", "Find the Feeling",
     "Identify and name an emotion without introspective rating: match it to a shape or a sound, then accept or refuse an offered word",
     "DBT", "Emotion Regulation", "dbt_emotion_regulation_module"),
    ("urge_surfing", "Urge Surfing",
     "Watching an urge rise, peak and fall without acting on it", "Mindfulness-based relapse prevention", None, "rel:dbt_opposite_action"),
    ("cross_modal_matching", "Cross-Modal Emotion Matching",
     "Describing a feeling through shape, temperature, weight, motion or sound instead of words", "Affective science", None, "rel:dbt_describe"),
    ("affective_touch", "Affective Touch",
     "Slow, gentle stroking (about 1 to 10 cm per second) that engages C-tactile afferents and settles arousal", "Physiological", None, "rel:dbt_tipp"),
    ("resonance_breathing", "Resonance Breathing",
     "Slow paced breathing near six breaths per minute", "Physiological", None, "rel:dbt_tipp"),
]
# What Find the Feeling uses. USES affect_labeling makes the existing co-occurrence contraindication
# (flooding_triggered_shutdown -> no affect_labeling) apply to this tool too.
USES = ["dbt_describe", "affect_labeling", "cross_modal_matching", "affective_touch", "resonance_breathing", "se_orienting"]
# getStateAndTools recommends dbt_* concepts that ADDRESS emotions associated with the user's pattern.
# Only the "can't tell / muddled" cluster. numb, empty and overwhelmed are left out on purpose: they are
# associated with dissociation and flooding, where affect labelling is contraindicated or must wait
# (see pattern-co-occurrence.cypher, flooding_triggered_shutdown). Those states get regulation tools first.
ADDRESSES = ["confused", "perplexed", "indifferent", "apathetic"]

SOURCES = [
    ("nummenmaa_2014", "Nummenmaa, Glerean, Hari & Hietanen (2014), PNAS — bodily maps of emotions", "https://doi.org/10.1073/pnas.1321664111"),
    ("juslin_laukka_2003", "Juslin & Laukka (2003), Psychological Bulletin — emotion in vocal expression and music performance share acoustic codes", "https://doi.org/10.1037/0033-2909.129.5.770"),
    ("palmer_2013", "Palmer et al. (2013), PNAS — music–colour associations are mediated by emotion", "https://doi.org/10.1073/pnas.1212562110"),
    ("lieberman_2007", "Lieberman et al. (2007), Psychological Science — putting feelings into words (affect labelling)", "https://doi.org/10.1111/j.1467-9280.2007.01916.x"),
    ("kashdan_2015", "Kashdan, Barrett & McKnight (2015), Current Directions in Psychological Science — emotion differentiation", "https://doi.org/10.1177/0963721414550708"),
    ("brewer_2016", "Brewer, Cook & Bird (2016), Royal Society Open Science — alexithymia as a general deficit of interoception", "https://doi.org/10.1098/rsos.150664"),
    ("loken_2009", "Löken et al. (2009), Nature Neuroscience — pleasant touch coded by unmyelinated (C-tactile) afferents", "https://doi.org/10.1038/nn.2312"),
    ("bernardi_2006", "Bernardi, Porta & Sleight (2006), Heart — breathing and cardiovascular measures follow musical tempo; slow music and pauses lower arousal", "https://doi.org/10.1136/hrt.2005.064600"),
    ("lehrer_gevirtz_2014", "Lehrer & Gevirtz (2014), Frontiers in Psychology — heart rate variability biofeedback", "https://doi.org/10.3389/fpsyg.2014.00756"),
]

FLOW = {
    "version": "find-v1",
    "ways": ["shape", "tune"],
    "defaultWay": "shape",
    # Gates. Bands replace every 1–10 number: steady ~ old <=5, stirred ~ 6, flooded ~ >=7.
    "gates": {
        "regulateBands": ["flooded"],           # flooded -> regulate (bottom-up) before any word
        "activateUrges": ["blank"],             # blank alone -> activating step, never calming
        "floodedBlank": "regulate_then_orient_no_label",  # numb-but-activated: down-regulate, then orient, NO word step
        "maxWordsOffered": 3,
        # Flooded + blank skips the word; "where to next" offers regulation tools only (app tool ids).
        "floodedBlankRoutes": ["cool-down", "five-senses"],
        "slowStrokePxPerSec": [45, 380],
        "fastStrokePxPerSec": 600,
        "breathHoldMs": 2800,
        "breathsToSettle": 5,
        "plucksToWake": 6,
        "regulationEscapeSeconds": 20,
        # Ambient descent: across the whole session the room drifts calmer on its own, below notice.
        # Tune: string beating slows and roughness/grit/pulse ease toward the tuned state. Shape: the object
        # cools and softens a little. Applied after the word step's replay so recognition uses the sound or
        # shape the person actually found. For blank (shutdown) it runs the other way: brighter and warmer.
        "ambientDescent": {"perStep": 0.08, "maxTotal": 0.45, "startAfter": "capacity", "blankDirection": "brighten", "floodedBlankDirection": "calm"},
    },
    "bandIntensity": {"steady": 0.35, "stirred": 0.6, "flooded": 0.85},  # for check-in -> getStateAndTools
    "copy": {
        "entry": {"checkInLabel": "I can't tell what I'm feeling", "title": "Find the feeling", "sub": "No words needed yet.", "shape": "By shape", "tune": "By ear", "tuneHint": "Headphones help. It works silently too.", "switchToTune": "Try it by ear instead", "switchToShape": "Try it by shape instead"},
        "shape": {
            "intro": "Something's there. Before words, let's give it a shape.",
            "round": "Which is closer to what's inside?", "cantTell": "can't tell",
            "rounds": [["sharp", "soft"], ["hot", "cool"], ["heavy", "light"], ["buzzing", "still"], ["clenched", "hollow"]],
            "begin": "Begin",
            "smooth": {"title": "Smooth it down. Slowly.", "sub": "Stroke it gently with your finger.", "tooFast": "Slower, like stroking a sleeping cat.", "hold": "Or press and hold here", "enough": "That's enough for now"},
            "warm": {"title": "Warm it up.", "sub": "Rub it briskly, like cold hands.", "hold": "Or press and hold here", "enough": "That's enough for now"},
            "wordLead": "Things shaped like this are often called",
            "shelf": "Your shelf",
        },
        "tune": {
            "intro": "Something's there. Let's find how it sounds in there.",
            "search": "Is this closer to how it feels, or further?", "closer": "Closer", "further": "Further", "thatsIt": "That's it",
            "begin": "Begin", "sound": "Sound", "continue": "Continue",
            "breathe": {"title": "Breathe them back into tune.", "sub": "Hold anywhere while you breathe in. Let go to breathe out.", "tooQuick": "A little slower. Let the breath fill up.", "done": "Hear it? The throb is slow and soft now."},
            "wake": {"title": "Wake the strings.", "sub": "Pluck them. Each one a bit brighter."},
            "wordLead": "Sounds like this often get called…",
            "harp": "Your strings",
        },
        "capacity": {"prompt": "If someone asked you for a favour right now, you'd…", "incoming": "hey, could you help me with something?", "options": {"steady": "Say yes like normal", "stirred": "Say yes, but with an edge", "flooded": "Couldn't answer, or would regret it"}},
        "pull": {"title": "What does it want to do?"},
        "word": {"yes": "Yes", "close": "Close", "no": "Not that", "none": "Not knowing the word is fine. You found it without one, and that counts.", "floodedBlank": "Let's skip the word today. Getting back into the room is the whole job right now."},
        "setOff": {"title": "Do you know what set it off?", "optional": True, "not_sure": "Not sure", "skip": "Skip", "someone": "Something with someone", "situation": "A situation", "body": "Tired, hungry or sore", "nothing": "Nothing I can see"},
        "close": {"prompt": "Which is closer to how you feel right now?", "then": "Then", "now": "Now", "options": {"louder": "Then", "same": "Somewhere between", "quieter": "Now", "much": "Now, and even calmer"}},
        "orient": {"title": "Come back into the room", "sub": "Before any words. Just get your bearings.", "look": "Look around slowly. Each time something catches your eye, tap a circle.", "move": "Stand up and shake out your hands", "moveSeconds": 20, "startMove": "Start", "skip": "Skip this", "seen": "{n} of 3 found"},
        "next": {"title": "Where to next", "sub": "Based on what you found.", "none": "Nothing else needed. Finding it was the work.", "open": "Open", "done": "Finish"},
        "collection": {"title": "Your collection", "new": "“{word}” joins the others. Naming a feeling is a skill, and you just used it.", "empty": "Every word you find lands here.", "noWord": "No new word this time. You still found it, and that counts.", "again": "Start again", "saving": "Saving…", "saved": "Saved", "saveError": "Couldn't save. Try again?", "retry": "Try again", "signedOut": "Sign in to keep your collection.", "rooms": {"shelf": "Shelf", "harp": "Strings", "scenes": "Scenes"}},
        "nav": {"back": "Back", "skip": "Skip this"},
    },
    "sourceIds": ["linehan_skills_2015", "nummenmaa_2014", "juslin_laukka_2003", "palmer_2013", "lieberman_2007", "kashdan_2015", "brewer_2016", "loken_2009", "lehrer_gevirtz_2014", "bernardi_2006"],
}
