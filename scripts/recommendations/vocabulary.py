# Editable source for the SCORES_AS alias edges in schema/recommended-for.cypher (plan E4-6).
# build.py reads this file; regenerate with build.py, then fixture.py (see content.py).
#
# WHY: the check-in sends grid words as display names, lower-cased, spaces → "_" ("anxious",
# "let_down"). Activation patterns are linked to a different vocabulary ("anxiety", "rejection").
# Live on 2026-09-30, 0 of the 85 unpleasant grid words reached any pattern (plan F1), so every
# high-unpleasant check-in resolved to acute_alarm and grid words never moved the pattern.
# Each grid word here gets (:Emotion {id: word})-[:SCORES_AS]->(:Emotion {id: target}) edges, and
# the pattern-scoring query counts a word as matching a pattern when the word itself or one of its
# targets is one of the pattern's emotions (each word still counts once per pattern).
#
# REVIEW (D-01, R-19): clinical content, every row a DRAFT (reviewStatus "draft") until Claudia
# signs it off (add the word to SIGNED_OFF). Mapping rule: each word → the 1–2 closest emotions in
# PATTERN_VOCABULARY (the only ids that move scoring); a second target only when the word has two
# plain components. Points to look at first:
#   - Anger words: `anger` is linked to emotional_flooding (moderate) and social_threat_shame (weak)
#     only; reactive_aggression isn't a candidate yet (D-02). So "Angry", "Mad", "Furious",
#     "Infuriated", "Hostile", "Aggressive", "Provoked" now resolve to emotional_flooding, which
#     carries the crisis banner (non-blocking, D-01). Milder anger is mapped away from flooding on
#     purpose: annoyed / frustrated → anger + stress (irritability as strain → chronic_vigilance);
#     bitter / resentful / indignant / betrayed / jealous → anger + rejection (social_threat_shame).
#   - The low-unpleasant disgust family has no low-energy pattern edge for `disgust`; its second
#     target (disappointment or anxiety) carries it (disappointment → reward_drive_low, below).
#   - Words now reach several patterns, so CO_OCCURS_WITH starts to matter (a runner-up above 0.35
#     at ≥ 60% of the leader): sadness words (Sad, Grief, Hurt, Bad, Fragile, Awful, Depressed)
#     score rumination first and the graph's ruminative-collapse edge makes conservation_freeze
#     primary; disappointment words tie rumination / reward and the edge makes reward_drive_low
#     primary. "Hurt" alone therefore lands on freeze, which has no Recover row (a D-02 point).
#   - "Lonely" / "Isolated" / "Abandoned" resolve to dissociation_overmodulation (the graph's
#     loneliness edge is moderate there and weak on freeze).
#   The low-unpleasant discriminating questions (already asked) and, from E4-6, the high-unpleasant
#   ones outweigh any single word (their evidence counts double).
# Pleasant grid words have no entries: pleasant quadrants never score patterns.

VERSION = "vocab-v1"
SIGNED_OFF = {}  # word → review date, e.g. {"anxious": "2026-10-05"}

# The live pattern-emotion vocabulary (tests/fixtures/live-routing-2026-09-30.json →
# patternEmotionVocabulary, identical to the schema). Targets must come from here.
PATTERN_VOCABULARY = [
    "anger", "anxiety", "apathy", "boredom", "cold_shame", "disappointment", "disgust", "emptiness", "fear",
    "guilt", "hopelessness", "hot_shame", "loneliness", "numbness", "overwhelm", "panic", "rejection",
    "sadness", "stress",
]

# word (as sent) → ([targets], rationale). Grouped as in src/data/emotions.ts.
VOCABULARY = {
    # --- High-unpleasant · fearful family ---
    "fearful":       (["fear"], "Same emotion."),
    "scared":        (["fear"], "Same emotion."),
    "frightened":    (["fear"], "Same emotion."),
    "anxious":       (["anxiety"], "Same emotion."),
    "nervous":       (["anxiety"], "Mild anxiety."),
    "worried":       (["anxiety"], "Worry is anticipatory anxiety."),
    "insecure":      (["anxiety"], "Unsure of footing or worth; the wheel places it under fear."),
    "overwhelmed":   (["overwhelm"], "Same state."),
    "helpless":      (["hopelessness"], "Nothing I do will change it."),
    "weak":          (["cold_shame"], "Wheel branch weak → worthless / insignificant: a lowered sense of self."),
    "worthless":     (["cold_shame"], "Worthlessness is the core of cold (collapsed) shame."),
    "insignificant": (["cold_shame"], "Feeling small and not counting: cold shame."),
    "inadequate":    (["cold_shame"], "Not good enough: shame about the self."),
    "inferior":      (["cold_shame"], "Less than others: shame about the self."),
    "rejected":      (["rejection"], "Same experience."),
    "excluded":      (["rejection"], "Left out: rejection by a group."),
    "persecuted":    (["fear"], "Under threat from others."),
    "exposed":       (["hot_shame"], "Being seen when you don't want to be is the core appraisal of shame."),
    # --- High-unpleasant · angry family ---
    "angry":         (["anger"], "Same emotion."),
    "mad":           (["anger"], "Same emotion."),
    "furious":       (["anger"], "Intense anger."),
    "infuriated":    (["anger"], "Intense anger."),
    "hostile":       (["anger"], "Anger turned outward."),
    "aggressive":    (["anger"], "Anger with an urge to attack."),
    "provoked":      (["anger"], "Anger in response to a trigger."),
    "annoyed":       (["anger", "stress"], "Low-grade anger; irritability reads as strain (keeps mild anger off flooding)."),
    "frustrated":    (["anger", "stress"], "Blocked-goal anger with strain (keeps mild anger off flooding)."),
    "indignant":     (["anger", "rejection"], "Anger at being treated unfairly by others."),
    "resentful":     (["anger", "rejection"], "Lasting anger at having been wronged."),
    "bitter":        (["anger", "rejection"], "Resentment that has settled."),
    "betrayed":      (["anger", "rejection"], "Hurt and anger at a broken trust."),
    "jealous":       (["rejection", "anger"], "Fear of losing someone to a rival, with anger."),
    "let_down":      (["disappointment", "rejection"], "Disappointed by someone who mattered."),
    "humiliated":    (["hot_shame"], "Shamed in front of others: hot shame."),
    "ridiculed":     (["hot_shame"], "Mocked: hot shame."),
    "disrespected":  (["hot_shame", "anger"], "Put down by someone, with anger."),
    "threatened":    (["fear"], "Sensing danger."),
    "violated":      (["anger", "fear"], "A boundary crossed: anger and fear."),
    "critical":      (["disgust"], "Judging others: the contempt side of disgust."),
    "skeptical":     (["disgust"], "Wheel branch critical → skeptical: distrust / contempt."),
    "dismissive":    (["disgust"], "Wheel branch critical → dismissive: contempt."),
    "distant":       (["loneliness", "numbness"], "Cut off from others; feelings muted."),
    "withdrawn":     (["loneliness", "numbness"], "Pulling away from others; feelings muted."),
    # --- High-unpleasant · bad family ---
    "stressed":      (["stress"], "Same state."),
    "pressured":     (["stress"], "Stress from demands."),
    "rushed":        (["stress"], "Stress from time pressure."),
    "busy":          (["stress"], "Load and demand."),
    "out_of_control": (["overwhelm"], "Too much to manage."),
    # --- Low-unpleasant · bad family ---
    "bad":           (["sadness"], "Generic low mood; the wheel's centre for this family."),
    "tired":         (["apathy"], "Low energy and drive."),
    "sleepy":        (["apathy"], "Low energy and drive."),
    "unfocused":     (["apathy"], "Low drive and attention; the nearest low-energy word."),
    "bored":         (["boredom"], "Same state."),
    "apathetic":     (["apathy"], "Same state."),
    "indifferent":   (["apathy"], "Not caring either way."),
    # --- Low-unpleasant · disgusted family (disgust has no low-energy pattern edge; see header) ---
    "disgusted":     (["disgust", "disappointment"], "Aversion; at low energy it lands as disappointment."),
    "disapproving":  (["disgust", "disappointment"], "Judging something as wrong, with disappointment."),
    "judgmental":    (["disgust", "disappointment"], "Judging, with disappointment."),
    "disappointed":  (["disappointment"], "Same emotion."),
    "appalled":      (["disgust", "disappointment"], "Moral disgust, with disappointment."),
    "revolted":      (["disgust", "disappointment"], "Strong aversion, with disappointment."),
    "repelled":      (["disgust", "disappointment"], "Aversion, with disappointment."),
    "awful":         (["sadness", "disgust"], "Feeling awful: low mood with aversion."),
    "nauseated":     (["disgust", "anxiety"], "Bodily disgust; nausea often comes with anxiety."),
    "detestable":    (["cold_shame"], "Feeling detestable is self-disgust: cold shame."),
    "horrified":     (["fear", "anxiety"], "Shocked fear."),
    "hesitant":      (["anxiety"], "Holding back out of worry."),
    "embarrassed":   (["hot_shame", "cold_shame"], "Mild shame."),
    # --- Low-unpleasant · sad family ---
    "sad":           (["sadness"], "Same emotion."),
    "grief":         (["sadness"], "Loss-driven sadness (grief_yearning is not a check-in candidate)."),
    "fragile":       (["sadness"], "Low and easily hurt."),
    "hurt":          (["sadness", "rejection"], "Emotional pain, usually from someone."),
    "lonely":        (["loneliness"], "Same emotion."),
    "isolated":      (["loneliness"], "Cut off from others."),
    "abandoned":     (["loneliness", "rejection"], "Left by someone who mattered."),
    "vulnerable":    (["anxiety"], "Unprotected; worried about being hurt."),
    "despair":       (["hopelessness"], "Same state."),
    "powerless":     (["hopelessness"], "Unable to change anything."),
    "victimized":    (["hopelessness"], "Powerless at others' hands."),
    "depressed":     (["sadness", "hopelessness"], "Low mood with hopelessness."),
    "guilty":        (["guilt"], "Same emotion."),
    "remorseful":    (["guilt"], "Regret for what I did: guilt."),
    "ashamed":       (["cold_shame"], "Shame about the self (low energy: cold shame)."),
    "empty":         (["emptiness"], "Same state."),
    "numb":          (["numbness"], "Same state."),
}


def review_status(word):
    return "approved" if word in SIGNED_OFF else "draft"


def aliases():
    """[(word, target, rationale, reviewStatus)] in a stable order."""
    out = []
    for word, (targets, why) in VOCABULARY.items():
        for t in targets:
            out.append((word, t, why, review_status(word)))
    return out
