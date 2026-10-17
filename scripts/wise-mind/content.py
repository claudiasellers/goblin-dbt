# Editable content for Wise mind (docs/design/wise-mind.md). Regenerate schema/wise-mind.cypher with
# build.py, then tests/fixtures/wise-mind-content.json with fixture.py, after editing.
#
# DBT Mindfulness 3 and 3a (Linehan, DBT Skills Training Handouts): wise mind as the synthesis of
# emotion mind and reasonable mind, reached by short bodily practices. The app never says what wise
# mind says and never calls an answer right.
#
# Voice (scripts/voice-lint.mjs, user_copy, and the house rules): flat and warm, no cheer, no "should",
# "just" or "but", no exclamation marks. A mind "says" something in its own short voice.
# Not gated on sign-off (like Find the feeling and Recover). The parts form's lines are parts copy
# (scripts/parts/content.py, flow wise_mind) and wait for the parts sign-off.

VERSION = "wise-mind-v1"

# Own words, anywhere in the flow: length-checked only, never linted (functions/src/spine/extSchemas.ts).
OWN_MAX = 140

# Screen 1. (id, label, default practice). The entry may put one first, never pre-selected.
# "Nothing in particular" has no question, so its practice is the stone, not Ask and listen.
QUESTIONS = [
    ("wm_q_next", "What to do next", "wm_ask"),
    ("wm_q_say", "Whether to say something", "wm_ask"),
    ("wm_q_let_go", "Whether to let it go", "wm_ask"),
    ("wm_q_need", "What I actually need", "wm_ask"),
    ("wm_q_trust", "Whether to trust this feeling", "wm_ask"),
    ("wm_q_settle", "Nothing in particular, I want to settle", "wm_stone"),
]

# Screen 2: what each mind says, per question (3-4 each). Neither side is ever marked as wrong.
VOICES = {
    "wm_q_next": {
        "emotion": ["Do something, now", "Fix it before it gets worse", "Hide until it passes"],
        "reason": ["Make a list first", "Do the sensible thing", "Wait for more information"],
    },
    "wm_q_say": {
        "emotion": ["Say it now", "Don't, it'll go badly", "They ought to know by now"],
        "reason": ["Wait until you're calm", "It's not worth the fight", "Get the facts first"],
    },
    "wm_q_let_go": {
        "emotion": ["I can't let this go", "Let it go, it's easier", "They need to know it hurt"],
        "reason": ["It's a small thing", "See if it still matters tomorrow", "Think about what holding on costs"],
    },
    "wm_q_need": {
        "emotion": ["I need someone, right now", "I need to be left alone", "I need this to stop"],
        "reason": ["Sleep, food, a break", "Get on with what's due", "Needs can wait"],
    },
    "wm_q_trust": {
        "emotion": ["This feeling is the truth", "Something's wrong, I can tell", "Act on it before it's too late"],
        "reason": ["Feelings aren't facts", "Check what actually happened", "Ignore it and carry on"],
    },
    "wm_q_settle": {
        "emotion": ["Everything's too much", "I can't sit still", "Something needs doing"],
        "reason": ["There's no reason to feel this", "Make a plan", "Keep busy"],
    },
}

# Screen 3, from Handout 3a. (id, name, sub, kind, lines, breaths, seconds)
#   drift: lines over `seconds`, a stone settling (reduced motion: one still frame per line)
#   hold:  `breaths` presses, hold on the in-breath, let go on the out-breath (LightHold's press)
#   ask:   `breaths` breaths, the question on the in-breath, "Listen." on the out-breath
PRACTICES = [
    ("wm_stone", "Stone on the lake", "A small stone drifts down through clear water and settles.", "drift", [
        "Picture a clear lake, and a small flat stone on the water.",
        "Let it go. It drifts down slowly through the clear water.",
        "It settles on the soft sand at the bottom. Rest there with it.",
    ], None, 40),
    ("wm_breath", "Wise in, mind out", "Five breaths. Hold as you breathe in, let go as you breathe out.", "hold", [
        "Breathing in: wise.",
        "Breathing out: mind.",
    ], 5, None),
    ("wm_ask", "Ask and listen", "Three breaths. Ask on the in-breath, listen on the out-breath.", "ask", [
        "Breathing in, ask.",
        "Listen.",
    ], 3, None),
]

# Screen 4: what comes (id, label, nextToolIds, kind). nextToolIds are app tool ids (src/data/tools.ts);
# "quiet" closes with the quiet line.
ANSWERS = [
    ("wm_a_know", "I already know what to do", ["problem-solve"], None),
    ("wm_a_wait", "Wait, not now", ["pause"], None),
    ("wm_a_say", "Say it, kindly", ["dear-man"], None),
    ("wm_a_let_go", "Let this one go", ["pause"], None),
    ("wm_a_help", "Ask someone for help", ["dear-man"], None),
    ("wm_a_care", "Look after myself first", ["cool-down", "five-senses"], None),
    ("wm_a_nothing", "Nothing yet", [], "quiet"),
]

# Every other visible line of screens 1-6 (the parts form's screen 2p: scripts/parts/content.py).
FLOW = {
    "version": VERSION,
    "ownMax": OWN_MAX,
    "sourceIds": ["linehan_skills_2015"],
    "copy": {
        "chrome": {"back": "Back", "next": "Next", "skip": "Skip"},
        "question": {
            "prompt": "What would you like wise mind's help with?",
            "own": "Something else",
            "ownLabel": "What would you like help with?",
        },
        "minds": {
            "prompt": "Tap each side to hear what it says.",
            "emotion": "Emotion mind",
            "reason": "Reasonable mind",
            "emotionSays": "Emotion mind says…",
            "reasonSays": "Reasonable mind says…",
            "nothingComes": "Nothing comes",
            "own": "Something else",
            "ownLabel": "In your own words",
            "witness": "Both make sense from where they stand.",
        },
        "dropIn": {
            "prompt": "Choose a way in.",
            "start": "Start",
            "here": "I'm here",
            "hold": "Hold as you breathe in",
            "letGo": "Let go as you breathe out",
            "holdHint": "Hold to fill it, or press once and wait.",
            "listen": "Listen.",
        },
        "comes": {
            "prompt": "What does wise mind say?",
            "own": "Something else",
            "ownLabel": "What does it say?",
            "quiet": "Wise mind is often quiet. It can arrive later, on a walk or in the shower.",
        },
        "feel": {
            "prompt": "How does it feel?",
            "options": {"calm": "Calm, settled", "pushed": "Pushed, urgent", "unsure": "Not sure"},
            "lines": {
                "calm": "That sounds like wise mind.",
                "pushed": "That might be emotion mind talking.",
                "unsure": "Keep it and see how it sits.",
            },
            "onceMore": "Drop in once more",
            "keepAnyway": "Keep it anyway",
        },
        "next": {
            "prompt": "What's one thing you'll do with it?",
            "enough": "This is enough for now",
            "keep": "Keep what wise mind said",
            # The kept line, in the person's voice: {answer} is the chip in lower case, or their words.
            "kept": "Wise mind said: {answer}",
            "keptDone": "Kept in My words.",
            "done": "Done",
        },
    },
}
