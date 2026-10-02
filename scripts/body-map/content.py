# Editable content for the body map (docs/design/body-map.md, build step 1). Regenerate
# schema/body-map.cypher with build.py and tests/fixtures/body-map-content.json with fixture.py
# after editing:
#   python3 scripts/body-map/build.py > /tmp/bm.cypher && mv /tmp/bm.cypher schema/body-map.cypher
#   python3 scripts/body-map/fixture.py
#
# Four kinds of content, all emotion knowledge, so they live in the graph:
#   REGIONS    the places the figure and the graph share, as BodyRegion nodes (REGION_NAMES). Geometry,
#              labels on screen and which places are paired are presentation (src/data/bodyFigure.ts).
#   PAD_WORDS  the sensation chips. Each is a SensationType: `zones` says which quarter it belongs to
#              (hu more intense + unpleasant, lu less intense + unpleasant, hp more intense + pleasant,
#              lp less intense + pleasant); `regions` limits it to some places (None = anywhere);
#              The first zone is the word's home quarter: a mark glows in that quarter's colour on the
#              feeling square (so Settled reads calm green, not low blue). `energy` (more / less) is the
#              word's arousal, kept for the mirror.
#   FELT       where each emotion is typically felt: (Emotion)-[:FELT_AS {region, weight, status}]->
#              (SensationType). THE one source of body-place knowledge in the graph (Oct 2026: it
#              replaced the body maps' own place lists and the hand-written FELT_AS statements in
#              relationships.cypher and the low-unpleasant patch). BASE rows are those original edges
#              (live); NEW rows are proposed additions (draft until signed off).
#   MAPS       the body mirror: a family of feelings. Each map GROUPS the emotions whose FELT_AS it
#              shows (its places are computed from them; nothing is stored on the map) and MIRRORS the
#              grid words (src/data/emotions.ts ids, Emotion nodes from emotion-wheel-sync) it answers.
#              Every grid word mirrors exactly one map. Grounding: Nummenmaa et al. 2014, Bodily maps
#              of emotions (PNAS), where "less" states such as sadness and depression show as cooled limbs.
#
# REVIEW: nothing new is served until it's signed off. Add the key to SIGNED_OFF with the review date
# and rebuild: "map:fear" (the map: its emotions and words), "word:tension" (a sensation chip),
# "felt:anxiety:shoulders:raised_up" (a NEW FELT_AS row; BASE rows are already live).
# Voice: plain body words, no diagnosis, no "should", no exclamation marks.

VERSION = "body-map-v2"

SIGNED_OFF = {}

REGIONS = [
    "head", "face", "jaw", "throat", "neck", "shoulders", "chest", "upper_back",
    "stomach", "lower_back", "arms", "hands", "legs", "feet", "body",
]

# BodyRegion nodes (Oct 2026: replaced the 8 old regions in knowledge-graph.cypher; the one FELT_AS
# row on the old "back" (stress) became upper_back, and build.py prunes the old node and row).
REGION_NAMES = {
    "head": ("Head", ["forehead", "temples", "scalp"]),
    "face": ("Face", ["eyes", "cheeks", "mouth"]),
    "jaw": ("Jaw", ["jaw", "teeth"]),
    "throat": ("Throat", ["throat"]),
    "neck": ("Neck", ["back of the neck"]),
    "shoulders": ("Shoulders", ["shoulders"]),
    "chest": ("Chest", ["heart area", "lungs", "sternum"]),
    "upper_back": ("Upper back", ["between the shoulder blades", "upper spine"]),
    "stomach": ("Stomach", ["stomach", "solar plexus", "abdomen", "gut"]),
    "lower_back": ("Lower back", ["lower back", "hips"]),
    "arms": ("Arms", ["upper arms", "forearms"]),
    "hands": ("Hands", ["hands", "fingers"]),
    "legs": ("Legs", ["thighs", "knees", "calves"]),
    "feet": ("Feet", ["feet", "toes"]),
    "body": ("Whole body", ["all over"]),
}

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
    # less intense, unpleasant
    ("heaviness", "Heavy", ["lu"], None, "less"),
    ("numbness_sensation", "Numb", ["lu"], None, "less"),
    ("drained", "Drained", ["lu"], ["arms", "legs", "body"], "less"),
    ("weakness", "Weak", ["lu"], ["arms", "legs", "body"], "less"),
    ("cold_sensation", "Cold", ["lu", "hu"], ["hands", "feet", "chest", "body"], "less"),
    ("hollow", "Hollow", ["lu"], ["chest", "stomach"], "less"),
    ("sinking", "Sinking", ["lu"], ["chest", "stomach"], "less"),
    ("foggy", "Foggy", ["lu"], ["head"], "less"),
    ("lump", "A lump", ["lu"], ["throat"], "less"),
    ("slumped", "Slumped", ["lu"], ["shoulders", "upper_back", "body"], "less"),
    ("achy", "Achy", ["lu"], None, "less"),  # a dull, lasting ache: low arousal (review 2 Oct 2026)
    # more intense, pleasant
    ("butterflies", "Fluttery", ["hp", "hu"], ["chest", "stomach"], "more"),
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

BASE, NEW = "base", "new"

# emotion id: [(region, sensation id, weight 0–1 = how typical, BASE | NEW)]
FELT = {
    # --- fear and worry ---
    "anxiety": [("chest", "constriction", 0.6, BASE), ("chest", "racing_heart", 1.0, BASE), ("stomach", "butterflies", 0.8, BASE),
                ("shoulders", "tension", 0.6, BASE), ("throat", "constriction", 0.8, BASE), ("shoulders", "raised_up", 0.7, NEW)],
    "fear": [("chest", "racing_heart", 1.0, BASE), ("stomach", "heaviness", 0.6, BASE), ("body", "cold_sensation", 0.6, BASE),
             ("legs", "weakness", 0.5, BASE), ("body", "shaking", 0.6, BASE), ("hands", "shaking", 0.6, NEW),
             # fight-or-flight pulls blood from the hands and feet: cold, clammy (review 2 Oct 2026)
             ("hands", "cold_sensation", 0.7, NEW), ("feet", "cold_sensation", 0.5, NEW)],
    "panic": [("chest", "racing_heart", 1.0, BASE), ("chest", "constriction", 0.6, BASE), ("body", "shaking", 0.6, BASE),
              ("hands", "numbness_sensation", 0.6, BASE)],
    "stress": [("shoulders", "tension", 0.6, BASE), ("upper_back", "tension", 0.6, BASE), ("neck", "tension", 0.6, BASE)],
    # --- anger ---
    "anger": [("head", "pressure", 0.5, BASE), ("head", "heat", 1.0, BASE), ("chest", "heat", 0.6, BASE), ("arms", "tension", 0.6, BASE),
              ("jaw", "tension", 0.6, BASE), ("face", "heat", 0.9, NEW), ("jaw", "clenched", 0.9, NEW), ("hands", "clenched", 0.8, NEW),
              ("chest", "pressure", 0.7, NEW)],
    # --- sadness ---
    "sadness": [("chest", "heaviness", 1.0, BASE), ("throat", "constriction", 0.8, BASE), ("body", "heaviness", 0.6, BASE),
                ("throat", "lump", 0.8, NEW), ("arms", "heaviness", 0.6, NEW), ("legs", "heaviness", 0.6, NEW), ("head", "pressure", 0.5, NEW)],
    "disappointment": [("chest", "heaviness", 0.8, BASE), ("throat", "constriction", 0.6, BASE), ("stomach", "pressure", 0.6, BASE)],
    "loneliness": [("chest", "heaviness", 0.8, BASE), ("chest", "cold_sensation", 0.6, BASE), ("throat", "constriction", 0.6, BASE)],
    "hopelessness": [("chest", "heaviness", 0.8, BASE), ("body", "heaviness", 0.6, BASE), ("body", "weakness", 0.6, BASE),
                     ("chest", "pressure", 0.6, BASE)],
    # --- shame ---
    "hot_shame": [("face", "heat", 1.0, BASE), ("chest", "heat", 0.6, BASE)],
    "cold_shame": [("stomach", "heaviness", 0.6, BASE), ("body", "weakness", 0.6, BASE), ("chest", "sinking", 0.7, NEW),
                   ("stomach", "sinking", 0.7, NEW), ("shoulders", "slumped", 0.6, NEW)],
    # --- guilt ---
    "guilt": [("stomach", "heaviness", 0.6, BASE), ("chest", "constriction", 0.6, BASE), ("face", "heat", 0.6, BASE),
              ("chest", "heaviness", 0.9, NEW), ("stomach", "knotted", 0.8, NEW), ("shoulders", "heaviness", 0.6, NEW), ("head", "pressure", 0.5, NEW)],
    # --- disgust ---
    "disgust": [("throat", "constriction", 0.8, BASE), ("stomach", "pressure", 0.6, BASE), ("stomach", "churning", 1.0, NEW),
                ("face", "tension", 0.6, NEW)],
    # --- drained or numb ---
    "apathy": [("body", "heaviness", 0.6, BASE), ("body", "weakness", 0.6, BASE), ("body", "drained", 1.0, NEW),
               ("arms", "heaviness", 0.7, NEW), ("legs", "heaviness", 0.7, NEW)],
    "boredom": [("body", "restlessness", 0.6, BASE), ("body", "heaviness", 0.6, BASE)],
    "emptiness": [("chest", "numbness_sensation", 0.6, BASE), ("stomach", "numbness_sensation", 0.6, BASE),
                  ("chest", "cold_sensation", 0.6, BASE), ("chest", "hollow", 0.8, NEW)],
    "numbness": [("body", "numbness_sensation", 0.8, BASE), ("hands", "numbness_sensation", 0.6, BASE), ("body", "cold_sensation", 0.6, BASE),
                 ("body", "heaviness", 0.6, BASE), ("head", "foggy", 0.8, NEW)],
    # --- love and warmth ---
    "love": [("chest", "expansion", 0.6, BASE), ("chest", "warmth", 1.0, NEW), ("face", "warmth", 0.8, NEW), ("stomach", "butterflies", 0.6, NEW),
             ("body", "warmth", 0.6, NEW), ("hands", "tingly", 0.5, NEW)],
    "compassion": [("chest", "expansion", 0.7, BASE)],
    # --- joy ---
    "joy": [("chest", "expansion", 0.6, BASE), ("chest", "lightness", 1.0, BASE), ("body", "lightness", 0.7, BASE),
            ("face", "smiling", 0.9, NEW), ("arms", "energised", 0.6, NEW), ("legs", "bouncy", 0.5, NEW)],
    # --- excitement ---
    "excitement": [("stomach", "butterflies", 0.8, BASE), ("chest", "racing_heart", 0.8, BASE), ("body", "restlessness", 0.6, BASE),
                   ("stomach", "fizzy", 1.0, NEW), ("hands", "tingly", 0.7, NEW), ("legs", "bouncy", 0.7, NEW), ("body", "energised", 0.6, NEW)],
    # --- surprise (no core Emotion node; the grid word "surprised" is one) ---
    "surprised": [("chest", "racing_heart", 0.8, NEW), ("head", "buzzing", 0.7, NEW), ("stomach", "butterflies", 0.6, NEW)],
    # --- calm ---
    "calm": [("body", "lightness", 0.6, BASE), ("legs", "groundedness", 0.6, BASE), ("shoulders", "lightness", 0.6, BASE),
             ("shoulders", "loose", 1.0, NEW), ("chest", "easy_breathing", 0.9, NEW), ("stomach", "settled", 0.8, NEW),
             ("jaw", "loose", 0.6, NEW), ("feet", "groundedness", 0.6, NEW)],
}

# A map's places: every live FELT_AS row of the emotions it groups, per (place, sensation) the highest
# weight plus SHARED_BONUS for each further emotion that shares it (capped at 1), strongest first.
SHARED_BONUS = 0.1

# id: (label, emotions it GROUPS (their FELT_AS gives its places), grid words it MIRRORS)
MAPS = {
    "fear": ("Fear and worry", ["anxiety", "fear", "panic", "stress", "overwhelm"], [
        "fearful", "scared", "anxious", "insecure", "helpless", "frightened", "worried", "overwhelmed",
        "persecuted", "nervous", "threatened", "stressed", "busy", "rushed", "pressured", "out_of_control",
        "hesitant", "jealous",
    ]),
    "anger": ("Anger", ["anger", "irritation", "frustration", "hostility", "angsty"], [
        "angry", "bitter", "mad", "aggressive", "frustrated", "betrayed", "resentful", "disrespected",
        "indignant", "violated", "furious", "provoked", "hostile", "infuriated", "annoyed",
    ]),
    "sadness": ("Sadness", ["sadness", "disappointment", "loneliness", "hopelessness", "rejection"], [
        "rejected", "excluded", "let_down", "dismayed", "disillusioned", "bad", "disappointed", "awful",
        "sad", "lonely", "vulnerable", "despair", "depressed", "hurt", "isolated", "abandoned",
        "victimized", "fragile", "grief",
    ]),
    "shame": ("Shame", ["hot_shame", "cold_shame"], [
        "inadequate", "inferior", "worthless", "insignificant", "exposed", "humiliated", "ridiculed",
        "embarrassed", "ashamed",
    ]),
    "guilt": ("Guilt", ["guilt"], ["guilty", "remorseful"]),
    "disgust": ("Disgust", ["disgust"], [
        "critical", "skeptical", "dismissive", "disgusted", "disapproving", "repelled", "judgmental",
        "appalled", "revolted", "nauseated", "detestable", "horrified",
    ]),
    "depleted": ("Drained or numb", ["apathy", "boredom", "emptiness", "numbness"], [
        "weak", "distant", "withdrawn", "tired", "bored", "sleepy", "unfocused", "apathetic", "indifferent",
        "empty", "numb", "powerless",
    ]),
    "love": ("Love and warmth", ["love", "compassion", "gratitude", "trust"], [
        "trusting", "sensitive", "intimate", "loving", "thankful", "sympathetic", "appreciative",
        "tender",
    ]),
    "joy": ("Joy", ["joy", "pride", "hope", "amusement", "inspiration"], [
        "happy", "interested", "proud", "accepted", "powerful", "optimistic", "joyful", "curious",
        "inquisitive", "successful", "confident", "respected", "valued", "courageous", "creative", "hopeful",
        "inspired", "good",
    ]),
    "excitement": ("Excitement", ["excitement", "enthusiasm", "curiosity"], ["excited", "eager", "energetic", "playful", "cheeky", "aroused"]),
    "surprise": ("Surprise", ["surprised"], ["surprised", "startled", "confused", "amazed", "shocked", "perplexed", "astonished", "awe"]),
    "calm": ("Calm", ["calm", "contentment", "serenity", "relief", "safety", "humility"], [
        "calm", "relaxed", "peaceful", "content", "chill", "comfortable", "thoughtful", "mellow", "serene",
        "secure", "satisfied", "restful", "at_ease", "balanced", "grounded", "cozy", "humble",
    ]),
}
