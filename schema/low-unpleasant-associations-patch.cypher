// ============================================================
// LOW-UNPLEASANT ASSOCIATIONS PATCH
// schema/low-unpleasant-associations-patch.cypher
//
// Fills missing ASSOCIATED_WITH (pattern → emotion) and
// FELT_AS (emotion → body sensation) edges for the four
// low-unpleasant activation patterns. Uses MERGE throughout
// for idempotency. Each chunk self-contained for Aura.
// ============================================================


// ============================================================
// PART 1: MISSING ASSOCIATED_WITH RELATIONSHIPS
// ============================================================


// --------------------------------------------------------
// CONSERVATION_FREEZE — currently has: numbness, emptiness
// Adding: sadness, hopelessness, cold_shame, apathy, loneliness
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "sadness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "leaden_grief",
    r.discriminator = "Sadness in freeze has a physical weight quality — heavy limbs, heavy chest. Distinct from ruminative sadness (which is cognitively busy) and anhedonic sadness (which is flat/absent).";

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "hopelessness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "strong",
    r.quality = "immobilized_hopelessness",
    r.discriminator = "Hopelessness in freeze is body-first — the person feels physically unable to change anything. Distinct from ruminative hopelessness (cognitively argued) and anhedonic hopelessness (motivationally absent).";

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "cold_shame"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "shame_collapse",
    r.discriminator = "Cold shame can trigger freeze via behavioral inhibition → vlPAG motor shutdown. Person reports worthlessness combined with physical collapse. See CO_OCCURS_WITH shame_collapse pattern.";

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "apathy"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "shutdown_apathy",
    r.discriminator = "Apathy in freeze comes from global dampening — person can't care because the system is offline. Distinct from reward_drive_low apathy where interoceptive channels are intact but reward valuation is suppressed.";

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "loneliness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "weak",
    r.quality = "withdrawn_isolation",
    r.discriminator = "Freeze can produce withdrawal that leads to isolation, but loneliness is not a primary freeze emotion — it's a downstream consequence. Stronger signal for rumination or dissociation.";


// --------------------------------------------------------
// DISSOCIATION_OVERMODULATION — currently has: numbness (numb_but_alert)
// Adding: emptiness, hopelessness, cold_shame, loneliness
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (e:Emotion {id: "emptiness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "strong",
    r.quality = "void_disconnection",
    r.discriminator = "Emptiness in dissociation has an 'unreal void' quality — the person feels hollowed out, not just unmotivated. Distinct from freeze emptiness (heavy void) and anhedonic emptiness (flat void).";

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (e:Emotion {id: "hopelessness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "disconnected_from_future",
    r.discriminator = "Hopelessness in dissociation comes from being cut off from temporal continuity — the future feels unreal, not just bad. Distinct from ruminative hopelessness (argued) and freeze hopelessness (immobilized).";

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (e:Emotion {id: "cold_shame"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "weak",
    r.quality = "depersonalized_shame",
    r.discriminator = "Shame content may persist during dissociation but with muted emotional charge. Person reports 'knowing' they feel worthless but not feeling it somatically. Less common than freeze+shame pathway.";

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (e:Emotion {id: "loneliness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "unreachable",
    r.discriminator = "Loneliness in dissociation has an 'unreachable' quality — the person wants connection but feels separated by glass. Distinct from ruminative loneliness (replaying social failures) and anhedonic loneliness (social reward blunted).";


// --------------------------------------------------------
// RUMINATION_LOOP — currently has: sadness (depressive_brooding), anxiety (anxious_worry), guilt
// Adding: hopelessness, disappointment, loneliness, cold_shame
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "hopelessness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "strong",
    r.subtype = "argued_hopelessness",
    r.discriminator = "Hopelessness in rumination is cognitively generated — the person constructs arguments for why things won't improve. The loop produces the hopelessness. Distinct from freeze (body-felt) and dissociation (temporally disconnected).";

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "disappointment"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.subtype = "counterfactual_looping",
    r.discriminator = "Disappointment feeds rumination via counterfactual thinking — 'if only I had...', 'it should have been...'. The unmet expectation creates a gap the DMN loops on.";

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "loneliness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.subtype = "social_rumination",
    r.discriminator = "Loneliness can be both cause and content of rumination — replaying social disconnection, analyzing why relationships failed. DMN engages TPJ (theory-of-mind) to model others' abandonment.";

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "cold_shame"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.subtype = "ruminative_shame",
    r.discriminator = "Cold shame feeds rumination via global self-evaluation looping — 'I am fundamentally broken', 'everyone sees it'. The self-referential content is DMN-driven. See CO_OCCURS_WITH shame_rumination pattern.";


// --------------------------------------------------------
// REWARD_DRIVE_LOW — currently has: boredom, emptiness
// Adding: apathy, sadness, hopelessness, loneliness, disappointment
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "apathy"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "strong",
    r.quality = "signature_emotion",
    r.discriminator = "Apathy is the hallmark subjective experience of ventral striatal blunting. Nothing matters, nothing pulls. This is THE discriminating emotion for reward_drive_low — if apathy is selected, confidence for this pattern should increase significantly.";

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "sadness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "flat_sadness",
    r.discriminator = "Sadness in anhedonia is flat and affectless — 'I guess I'm sad' rather than felt grief. Low-grade, without the heaviness of freeze-sadness or the cognitive engagement of ruminative sadness.";

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "hopelessness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "strong",
    r.quality = "whats_the_point",
    r.discriminator = "Hopelessness in anhedonia centers on futility of effort — 'what's the point if I can't enjoy anything anyway'. Motivationally derived rather than cognitively argued (rumination) or physically felt (freeze).";

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "loneliness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "social_reward_blunted",
    r.discriminator = "Social anhedonia — the person recognizes they should want connection but can't generate the pull toward it. NAc doesn't fire on social reward cues. Distinct from dissociative loneliness (unreachable) and ruminative loneliness (replaying failures).";

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "disappointment"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "chronic_unmet_expectations",
    r.discriminator = "When reward prediction signals are blunted, nothing meets expectations because expectations themselves are generated by the reward system. Chronic low-grade disappointment without acute distress.";


// ============================================================
// PART 2: (moved) FELT_AS body sensations for hopelessness, emptiness, numbness, loneliness,
// apathy, boredom, disappointment, guilt and disgust now live in scripts/body-map/content.py
// (FELT), generated into schema/body-map.cypher: the one source of FELT_AS (Oct 2026).
// ============================================================


// ============================================================
// PART 3: HIGH-UNPLEASANT ASSOCIATION GAPS
//
// While auditing, these gaps also affect discrimination.
// ============================================================


// --------------------------------------------------------
// CHRONIC_VIGILANCE — currently has: anxiety (watchful), stress
// Adding: loneliness, hopelessness
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (e:Emotion {id: "loneliness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "weak",
    r.quality = "hypervigilant_isolation",
    r.discriminator = "Sustained threat scanning makes social engagement feel dangerous. Person withdraws from connection because others are perceived as potential threats.";

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (e:Emotion {id: "hopelessness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "exhausted_vigilance",
    r.discriminator = "Hopelessness from prolonged hypervigilance — 'I'll never feel safe'. Temporal quality: future-oriented dread rather than past-focused grief.";


// --------------------------------------------------------
// EMOTIONAL_FLOODING — currently has: overwhelm, anger (explosive), sadness (cant_stop_crying)
// Adding: fear, panic, guilt
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "fear"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "undifferentiated_fear",
    r.discriminator = "Fear in flooding is diffuse and unsorted — not fear OF something specific (that's acute_alarm) but fear as part of the everything-at-once overwhelm.";

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "panic"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "regulatory_collapse_panic",
    r.discriminator = "Panic in flooding is about the loss of control itself — 'I can't handle this' — rather than specific threat (acute_alarm panic). Meta-emotion: panicking about panicking.";

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "guilt"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "weak",
    r.quality = "post_flood_guilt",
    r.discriminator = "Guilt often emerges during or after flooding — about the flooding itself, about words said, about losing control. Secondary to the primary overwhelm.";


// --------------------------------------------------------
// SOCIAL_THREAT_SHAME — currently has: hot_shame, cold_shame, guilt, rejection
// Adding: loneliness, anxiety, anger, disgust
// --------------------------------------------------------

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "loneliness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "rejection_driven",
    r.discriminator = "Loneliness from social threat is specifically rejection-driven — 'I'm alone because I'm defective'. Distinct from anhedonic loneliness (can't generate pull toward others) and dissociative loneliness (feel unreachable).";

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "anxiety"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "moderate",
    r.quality = "social_evaluative",
    r.discriminator = "Anxiety in social threat is specifically about being observed/evaluated. Distinct from chronic_vigilance anxiety (diffuse environmental scanning) and acute_alarm anxiety (threat-specific).";

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "anger"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "weak",
    r.quality = "shame_rage",
    r.discriminator = "Anger as secondary response to shame — 'how dare they make me feel this way'. Precursor to social_threat → reactive_aggression escalation pathway.";

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "disgust"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = "weak",
    r.quality = "self_disgust",
    r.discriminator = "Self-directed disgust is a shame variant — 'I'm revolting'. Morphological overlap with contamination disgust (facial expression, nausea) but directed inward.";


// ============================================================
// PART 4: VALIDATION QUERIES
// ============================================================

// 4a. All low-unpleasant patterns should now have ≥ 4 ASSOCIATED_WITH
// MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
// WHERE e.quadrant IN ["low-unpleasant", "low_to_moderate"]
// WITH p, count(r) AS emotionCount
// RETURN p.id, emotionCount
// ORDER BY emotionCount ASC;

// 4b. Every low-unpleasant Emotion should have ≥ 1 FELT_AS
// MATCH (e:Emotion)
// WHERE e.quadrant = "low-unpleasant"
// OPTIONAL MATCH (e)-[r:FELT_AS]->(s:SensationType)
// WITH e, count(r) AS sensationCount
// WHERE sensationCount = 0
// RETURN "Emotion with no body map" AS issue, e.id, e.name;

// 4c. Every low-unpleasant Emotion should be ASSOCIATED_WITH ≥ 1 pattern
// MATCH (e:Emotion)
// WHERE e.quadrant = "low-unpleasant"
// OPTIONAL MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e)
// WITH e, count(r) AS patternCount
// WHERE patternCount = 0
// RETURN "Emotion with no pattern link" AS issue, e.id, e.name;

// 4d. Strength values should be valid
// MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
// WHERE NOT r.strength IN ["strong", "moderate", "weak"]
// RETURN "Invalid strength" AS issue, p.id, e.id, r.strength;