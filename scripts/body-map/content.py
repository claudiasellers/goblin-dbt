# Editable content for the body map (docs/design/body-map.md, build step 1). Regenerate
# schema/body-map.cypher with build.py and tests/fixtures/body-map-content.json with fixture.py
# after editing:
#   python3 scripts/body-map/build.py > /tmp/bm.cypher && mv /tmp/bm.cypher schema/body-map.cypher
#   python3 scripts/body-map/fixture.py
#
# Three kinds of content, all emotion knowledge, so they live in the graph:
#   REGIONS    the places the figure and the graph share (ids only; geometry, labels and which
#              places are paired are presentation, in src/data/bodyFigure.ts from build step 2).
#   PAD_WORDS  the chips on the sensation pad. Each is a SensationType: `zones` says which quarter of
#              the pad it shows in (hu more intense + unpleasant, lu less intense + unpleasant,
#              hp more intense + pleasant, lp less intense + pleasant); `regions` limits it to some
#              places (None = anywhere); `energy` (more / less) colours a ghost mark warm or cool.
#   MAPS       the body mirror: where a family of feelings typically shows up (Nummenmaa et al.
#              2014, Bodily maps of emotions, PNAS; the 14 maps include "less" states such as
#              sadness and depression, shown as cooled limbs). Each map lists 3–6 places
#              (region, pad word, weight 0–1) and the grid words (src/data/emotions.ts ids) it
#              mirrors. Every grid word mirrors exactly one map.
#
# REVIEW: everything is a draft and is never served until it's signed off. To sign off a map (its
# places and its words) or a pad word, add its id to SIGNED_OFF with the review date and rebuild,
# e.g. SIGNED_OFF = {"map:fear": "2026-10-05", "word:tension": "2026-10-05"}.
# Voice: plain body words, no diagnosis, no "should", no exclamation marks.

VERSION = "body-map-v1"

SIGNED_OFF = {}

REGIONS = [
    "head", "face", "jaw", "throat", "neck", "shoulders", "chest", "upper_back",
    "stomach", "lower_back", "arms", "hands", "legs", "feet", "body",
]

ZONES = ["hu", "lu", "hp", "lp"]

# (id, label, zones, regions or None for anywhere, energy). Ids that already exist as
# SensationType nodes (knowledge-graph.cypher) keep their id and gain the pad properties.
PAD_WORDS = [
    # more intense, unpleasant
    ("tension", "Tight", ["hu"], None, "more"),
    ("pressure", "Pressure", ["hu"], None, "more"),
    ("raised_up", "Raised up", ["hu"], ["shoulders"], "more"),
    ("clenched", "Clenched", ["hu"], ["jaw", "hands", "stomach"], "more"),
    ("racing_heart", "Racing", ["hu", "hp"], ["chest"], "more"),
    ("pounding", "Pounding", ["hu"], ["chest", "head"], "more"),
    ("heat", "Hot", ["hu"], ["head", "face", "chest", "body"], "more"),
    ("burning", "Burning", ["hu"], ["face", "throat", "chest", "stomach"], "more"),
    ("constriction", "Closing up", ["hu"], ["throat", "chest"], "more"),
    ("shaking", "Shaky", ["hu"], ["hands", "arms", "legs", "body"], "more"),
    ("restlessness", "Restless", ["hu"], ["hands", "legs", "feet", "body"], "more"),
    ("knotted", "Knotted", ["hu"], ["stomach", "upper_back", "lower_back"], "more"),
    ("churning", "Churning", ["hu"], ["stomach"], "more"),
    ("buzzing", "Buzzing", ["hu"], ["head", "hands", "body"], "more"),
    ("achy", "Achy", ["hu", "lu"], None, "more"),
    # less intense, unpleasant
    ("heaviness", "Heavy", ["lu"], None, "less"),
    ("numbness_sensation", "Numb", ["lu"], None, "less"),
    ("drained", "Drained", ["lu"], ["arms", "legs", "body"], "less"),
    ("weakness", "Weak", ["lu"], ["arms", "legs", "body"], "less"),
    ("cold_sensation", "Cold", ["lu"], ["hands", "feet", "chest", "body"], "less"),
    ("hollow", "Hollow", ["lu"], ["chest", "stomach"], "less"),
    ("sinking", "Sinking", ["lu"], ["chest", "stomach"], "less"),
    ("foggy", "Foggy", ["lu"], ["head"], "less"),
    ("lump", "A lump", ["lu"], ["throat"], "less"),
    ("slumped", "Slumped", ["lu"], ["shoulders", "upper_back", "body"], "less"),
    # more intense, pleasant
    ("butterflies", "Fluttery", ["hu", "hp"], ["chest", "stomach"], "more"),
    ("tingly", "Tingly", ["hp"], None, "more"),
    ("lightness", "Light", ["hp", "lp"], None, "more"),
    ("warmth", "Warm", ["hp", "lp"], ["face", "chest", "stomach", "hands", "body"], "more"),
    ("expansion", "Open", ["hp", "lp"], ["throat", "shoulders", "chest"], "more"),
    ("fizzy", "Fizzy", ["hp"], ["chest", "stomach", "body"], "more"),
    ("bouncy", "Bouncy", ["hp"], ["legs", "feet"], "more"),
    ("smiling", "Smiling", ["hp", "lp"], ["face"], "more"),
    ("energised", "Energised", ["hp"], ["arms", "legs", "body"], "more"),
    # less intense, pleasant
    ("settled", "Settled", ["lp"], ["chest", "stomach", "body"], "less"),
    ("loose", "Loose", ["lp"], ["jaw", "neck", "shoulders", "upper_back", "lower_back", "arms", "hands", "legs"], "less"),
    ("soft", "Soft", ["lp"], ["face", "jaw", "stomach", "body"], "less"),
    ("groundedness", "Grounded", ["lp"], ["legs", "feet", "body"], "less"),
    ("easy_breathing", "Breathing easy", ["lp"], ["throat", "chest"], "less"),
    ("rested", "Rested", ["lp"], ["head", "body"], "less"),
]

# id: (label, places [(region, pad word id, weight)], grid words)
MAPS = {
    "fear": ("Fear and worry", [
        ("chest", "racing_heart", 1.0), ("throat", "constriction", 0.8), ("stomach", "butterflies", 0.8),
        ("shoulders", "raised_up", 0.7), ("hands", "shaking", 0.6), ("legs", "weakness", 0.5),
    ], [
        "fearful", "scared", "anxious", "insecure", "helpless", "frightened", "worried", "overwhelmed",
        "persecuted", "nervous", "threatened", "stressed", "busy", "rushed", "pressured", "out_of_control",
        "hesitant",
    ]),
    "anger": ("Anger", [
        ("head", "heat", 1.0), ("face", "heat", 0.9), ("jaw", "clenched", 0.9), ("hands", "clenched", 0.8),
        ("chest", "pressure", 0.7), ("arms", "tension", 0.6),
    ], [
        "angry", "bitter", "mad", "aggressive", "frustrated", "betrayed", "resentful", "disrespected",
        "indignant", "violated", "furious", "jealous", "provoked", "hostile", "infuriated", "annoyed",
    ]),
    "sadness": ("Sadness", [
        ("chest", "heaviness", 1.0), ("throat", "lump", 0.8), ("arms", "heaviness", 0.6),
        ("legs", "heaviness", 0.6), ("head", "pressure", 0.5),
    ], [
        "rejected", "excluded", "let_down", "dismayed", "disillusioned", "bad", "disappointed", "awful",
        "sad", "lonely", "vulnerable", "despair", "depressed", "hurt", "isolated", "abandoned",
        "victimized", "fragile", "grief", "powerless",
    ]),
    "shame": ("Shame", [
        ("face", "heat", 1.0), ("chest", "sinking", 0.7), ("stomach", "sinking", 0.7), ("shoulders", "slumped", 0.6),
    ], [
        "inadequate", "inferior", "worthless", "insignificant", "exposed", "humiliated", "ridiculed",
        "embarrassed", "ashamed",
    ]),
    "guilt": ("Guilt", [
        ("chest", "heaviness", 0.9), ("stomach", "knotted", 0.8), ("shoulders", "heaviness", 0.6), ("head", "pressure", 0.5),
    ], ["guilty", "remorseful"]),
    "disgust": ("Disgust", [
        ("stomach", "churning", 1.0), ("throat", "constriction", 0.8), ("face", "tension", 0.6),
    ], [
        "critical", "skeptical", "dismissive", "disgusted", "disapproving", "repelled", "judgmental",
        "appalled", "revolted", "nauseated", "detestable", "horrified",
    ]),
    "depleted": ("Drained or numb", [
        ("body", "drained", 1.0), ("head", "foggy", 0.8), ("arms", "heaviness", 0.7),
        ("legs", "heaviness", 0.7), ("chest", "hollow", 0.6),
    ], [
        "weak", "distant", "withdrawn", "tired", "bored", "sleepy", "unfocused", "apathetic", "indifferent",
        "empty", "numb",
    ]),
    "love": ("Love and warmth", [
        ("chest", "warmth", 1.0), ("face", "warmth", 0.8), ("stomach", "butterflies", 0.6),
        ("body", "warmth", 0.6), ("hands", "tingly", 0.5),
    ], [
        "aroused", "trusting", "sensitive", "intimate", "loving", "thankful", "sympathetic", "appreciative",
        "tender",
    ]),
    "joy": ("Joy", [
        ("chest", "lightness", 1.0), ("face", "smiling", 0.9), ("body", "lightness", 0.7),
        ("arms", "energised", 0.6), ("legs", "bouncy", 0.5),
    ], [
        "happy", "interested", "proud", "accepted", "powerful", "optimistic", "joyful", "curious",
        "inquisitive", "successful", "confident", "respected", "valued", "courageous", "creative", "hopeful",
        "inspired", "good",
    ]),
    "excitement": ("Excitement", [
        ("stomach", "fizzy", 1.0), ("chest", "racing_heart", 0.8), ("hands", "tingly", 0.7),
        ("legs", "bouncy", 0.7), ("body", "energised", 0.6),
    ], ["playful", "cheeky", "excited", "eager", "energetic"]),
    "surprise": ("Surprise", [
        ("chest", "racing_heart", 0.8), ("head", "buzzing", 0.7), ("stomach", "butterflies", 0.6),
    ], ["surprised", "startled", "confused", "amazed", "shocked", "perplexed", "astonished", "awe"]),
    "calm": ("Calm", [
        ("shoulders", "loose", 1.0), ("chest", "easy_breathing", 0.9), ("stomach", "settled", 0.8),
        ("jaw", "loose", 0.6), ("feet", "groundedness", 0.6),
    ], [
        "calm", "relaxed", "peaceful", "content", "chill", "comfortable", "thoughtful", "mellow", "serene",
        "secure", "satisfied", "restful", "at_ease", "balanced", "grounded", "cozy", "humble",
    ]),
}
