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
# Oct 2026: SIGNALS (bottom of this file) gives every unpleasant grid word its reviewed pattern; while the
# policy is on that replaces the aliases in scoring. The aliases and the notes below stay as the emotion
# vocabulary for words without one (and for live checks against older loads).
#
# REVIEW (D-01, R-19): clinical content, every row a DRAFT (reviewStatus "draft") until Claudia
# signs it off (add the word to SIGNED_OFF). Mapping rule: each word → the 1–2 closest emotions in
# PATTERN_VOCABULARY (the only ids that move scoring); a second target only when the word has two
# plain components. Points to look at first:
#   - Plain anger words are HELD (no alias; see HELD below). `anger`'s only strong high-unpleasant
#     edge is emotional_flooding (moderate; social_threat_shame weak) and reactive_aggression isn't a
#     candidate yet (D-02), so an alias to `anger` would put "Angry", "Mad", "Furious", "Infuriated",
#     "Hostile", "Aggressive" and "Provoked" on flooding, whose TRIGGERS_SAFETY flag (crisis_self_harm,
#     condition "self-harm urges + out of control", not evaluated until the safety batch) shows 988 on
#     one anger word. Held, they keep today's result (acute_alarm: the threat system's fight response,
#     body-first cards) and flooding stays reachable through what the user endorses (the high-unpleasant
#     answers, since Oct 2026 "I'm spiraling and can't stop it" / "Shaking or crying, can't stop").
#     Oct 2026: reactive_aggression is a candidate while the policy is on and the anger words signal
#     it (SIGNALS below), so they're no longer held in scoring; the aliases stay held.
#     `anger` is also a held target (HELD_TARGETS): annoyed / frustrated → stress (irritability as
#     strain → chronic_vigilance); bitter / resentful / indignant / betrayed / jealous → rejection and
#     disrespected → hot_shame (social_threat_shame); violated → fear (acute_alarm).
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

# Pattern-vocabulary ids no alias may target yet. `anger`'s only high-unpleasant edges are
# emotional_flooding (moderate, crisis-flagged) and social_threat_shame (weak), so an anger target
# only ever adds flooding: alone it wins ("Angry" → the crisis banner), and with an answer such as
# "I don't know what triggered it" it overtakes the word's own pattern ("Resentful" → flooding).
# Every word that carried `anger` next to another target keeps that target; its one-word result is
# unchanged. Revisit with reactive_aggression (D-02) or the safety batch's condition check.
HELD_TARGETS = {"anger"}

# Unpleasant grid words deliberately given no alias yet: word → why. They score as they do live today
# (no pattern edge → the quadrant's candidates tie → acute_alarm), and the discriminating answers
# decide. A word is either here or in VOCABULARY (build.py and the reachability test check it).
HELD = {
    w: "Anger alone is not flooding: until reactive_aggression is a candidate (D-02) or the safety batch "
       "evaluates crisis_self_harm's condition, one anger word must not raise the crisis banner. "
       "Today's acute_alarm (fight response, body-first cards) stands; flooding comes from the answers."
    for w in ["angry", "mad", "furious", "infuriated", "hostile", "aggressive", "provoked"]
}

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
    "annoyed":       (["stress"], "Low-grade anger; irritability reads as strain (anger itself is a held target, see HELD_TARGETS)."),
    "frustrated":    (["stress"], "Blocked-goal anger read as strain (anger itself is a held target)."),
    "indignant":     (["rejection"], "Anger at being treated unfairly by others: the social wound carries it (anger held)."),
    "resentful":     (["rejection"], "Lasting anger at having been wronged: the social wound carries it (anger held)."),
    "bitter":        (["rejection"], "Resentment that has settled: the social wound carries it (anger held)."),
    "betrayed":      (["rejection"], "Hurt and anger at a broken trust: the social wound carries it (anger held)."),
    "jealous":       (["rejection"], "Fear of losing someone to a rival (anger held)."),
    "let_down":      (["disappointment", "rejection"], "Disappointed by someone who mattered."),
    "humiliated":    (["hot_shame"], "Shamed in front of others: hot shame."),
    "ridiculed":     (["hot_shame"], "Mocked: hot shame."),
    "disrespected":  (["hot_shame"], "Put down by someone (anger held)."),
    "threatened":    (["fear"], "Sensing danger."),
    "violated":      (["fear"], "A boundary crossed: threat (anger held)."),
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


# --- Reviewed patterns (Oct 2026, Claudia's routing review) ------------------------------------------------
# Each unpleasant grid word → the one activation pattern it stands for. While RoutingPolicy is on this is
# the word's ONLY match in pattern scoring (a strong edge, (:Emotion)-[:SIGNALS]->(:ActivationPattern));
# the aliases above apply only to words without one. Rules: the pattern is on the word's own side of the
# square (the dot decides which patterns are possible; Ready to fight joins the high side while the
# policy is on); no word signals Flooded (only the "I'm spiraling and can't stop it" answer gets there,
# so one everyday word never raises the crisis banner). Where the review put a word across the square,
# the closest pattern on its own side is used and the tool the review wanted comes from a word rule
# (content.py WORD_RULES). Drafts until signed off (SIGNED_OFF, by word).
ALARM, GUARD, SOCIAL, FIGHT = "acute_alarm", "chronic_vigilance", "social_threat_shame", "reactive_aggression"
REPLAY, LOW, SHUT = "rumination_loop", "reward_drive_low", "conservation_freeze"
SIDE_PATTERNS = {
    "high-unpleasant": {ALARM, GUARD, SOCIAL, FIGHT},
    "low-unpleasant": {REPLAY, LOW, SHUT, "dissociation_overmodulation"},
}


def _words(pattern, words, why):
    return {w: (pattern, why) for w in words}


SIGNALS = {
    # --- More energy ---
    **_words(ALARM, ["fearful", "scared", "frightened", "threatened"], "Acute fear: regulation, then approach."),
    **_words(ALARM, ["overwhelmed", "out_of_control"], "Capacity saturation: a behavioural halt first. Alarm, not Flooded, so one everyday word doesn't raise the crisis banner."),
    **_words(ALARM, ["frustrated", "stressed", "busy", "rushed", "pressured"], "High agitation and strain (the review's Alarm / On replay; Alarm on this side)."),
    **_words(ALARM, ["annoyed"], "Low-grade anger read as agitation."),
    **_words(ALARM, ["distant", "withdrawn"], "Freeze with high arousal underneath: orient, then settle (review, Oct 2026; was Shut down in the sheet, which isn't on this side)."),
    **_words(GUARD, ["anxious", "nervous"], "Anticipatory anxiety."),
    **_words(GUARD, ["worried", "persecuted", "critical", "skeptical", "dismissive", "jealous"], "Watching for threat or judging: check the facts."),
    **_words(GUARD, ["helpless"], "Nothing I do will change it (the sheet's Low drive is on the other side; On guard carries hopelessness here)."),
    **_words(SOCIAL, ["insecure", "inadequate", "inferior", "insignificant"], "Shame about the self."),
    **_words(SOCIAL, ["weak", "worthless"], "Cold shame (wheel branch weak → worthless / insignificant), not fatigue."),
    **_words(SOCIAL, ["rejected", "excluded", "let_down"], "A social wound."),
    **_words(SOCIAL, ["exposed", "humiliated", "ridiculed"], "Hot shame: being seen, mocked or shamed in front of others."),
    **_words(SOCIAL, ["betrayed", "disrespected", "violated"], "A broken trust or crossed boundary: protect self-respect."),
    **_words(FIGHT, ["angry", "mad", "aggressive", "furious", "provoked", "hostile", "infuriated", "indignant"],
             "Anger: halt the action urge, then bring arousal down. Ready to fight has no crisis flag, so these aren't held any more."),
    **_words(FIGHT, ["bitter", "resentful"], "Settled resentment (the review's On replay / Ready to fight; Ready to fight on this side)."),
    # --- Less energy ---
    **_words(LOW, ["tired", "bored", "sleepy", "unfocused", "apathetic", "indifferent"], "Low energy and drive: address the body, get active."),
    **_words(LOW, ["bad", "sad", "depressed"], "Low mood: behavioural activation."),
    **_words(LOW, ["lonely", "isolated"], "Cut off from people: reach towards them (the sheet's Social threat is on the other side)."),
    **_words(LOW, ["vulnerable", "fragile", "powerless"], "Unable to change things: accept, then small steps."),
    **_words(REPLAY, DISGUST := ["disgusted", "disapproving", "disappointed", "awful", "repelled", "judgmental", "appalled",
                                 "revolted", "nauseated", "detestable", "horrified"], "Aversion and disappointment that keeps replaying."),
    **_words(REPLAY, ["hesitant"], "Holding back out of worry (the sheet's Alarm is on the other side)."),
    **_words(REPLAY, ["guilty", "remorseful"], "Guilt: is it justified, then repair."),
    **_words(REPLAY, ["embarrassed", "ashamed"], "Low-energy shame that replays."),
    **_words(REPLAY, ["victimized", "hurt", "abandoned"], "Hurt by someone, replaying it: Recover leads (hurt and abandoned are wound words)."),
    **_words(SHUT, ["despair", "grief", "empty", "numb"], "Collapse: gentle movement first."),
}


def signals():
    """[(word, pattern, rationale, reviewStatus)] in a stable order."""
    return [(w, p, why, review_status(w)) for w, (p, why) in SIGNALS.items()]


def review_status(word):
    return "approved" if word in SIGNED_OFF else "draft"


def aliases():
    """[(word, target, rationale, reviewStatus)] in a stable order."""
    out = []
    for word, (targets, why) in VOCABULARY.items():
        for t in targets:
            out.append((word, t, why, review_status(word)))
    return out
