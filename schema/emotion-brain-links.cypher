// ============================================================
// INCREMENTAL UPDATE - Emotion-Brain ACTIVATES_DURING Relationships
// Run this against existing Neo4j database
// 
// Purpose: Ensure every Emotion node has at least one
// ACTIVATES_DURING relationship from a BrainStructure so that
// the "related emotions" feature can surface suggestions.
// 
// These relationships enable the query:
// Emotion ← ACTIVATES_DURING ← BrainStructure → ACTIVATES_DURING → OtherEmotion
// ============================================================


// ============================================================
// STEP 1: CREATE MISSING EMOTION NODES
// These emotions are in the UI (emotions.ts) but not in Neo4j
// ============================================================

// High Energy Unpleasant - Missing nodes
CREATE (annoyed:Emotion {
  id: "annoyed",
  name: "Annoyed",
  quadrant: "high-unpleasant",
  description: "Mild irritation or displeasure"
});

CREATE (worried:Emotion {
  id: "worried",
  name: "Worried",
  quadrant: "high-unpleasant",
  description: "Anxious concern about potential problems"
});

CREATE (nervous:Emotion {
  id: "nervous",
  name: "Nervous",
  quadrant: "high-unpleasant",
  description: "Feeling uneasy or apprehensive"
});

CREATE (tense:Emotion {
  id: "tense",
  name: "Tense",
  quadrant: "high-unpleasant",
  description: "Physical and mental tightness from stress"
});

CREATE (shocked:Emotion {
  id: "shocked",
  name: "Shocked",
  quadrant: "high-unpleasant",
  description: "Sudden surprise or alarm"
});

CREATE (impassioned:Emotion {
  id: "impassioned",
  name: "Impassioned",
  quadrant: "high-unpleasant",
  description: "Intense emotional arousal"
});

CREATE (hyper:Emotion {
  id: "hyper",
  name: "Hyper",
  quadrant: "high-unpleasant",
  description: "Excessive energy or agitation"
});

CREATE (jittery:Emotion {
  id: "jittery",
  name: "Jittery",
  quadrant: "high-unpleasant",
  description: "Nervous restlessness"
});

CREATE (fomo:Emotion {
  id: "fomo",
  name: "FOMO",
  quadrant: "high-unpleasant",
  description: "Fear of missing out"
});

CREATE (confused:Emotion {
  id: "confused",
  name: "Confused",
  quadrant: "high-unpleasant",
  description: "Mental uncertainty or disorientation"
});

CREATE (apprehensive:Emotion {
  id: "apprehensive",
  name: "Apprehensive",
  quadrant: "high-unpleasant",
  description: "Anxious anticipation of something negative"
});

CREATE (restless:Emotion {
  id: "restless",
  name: "Restless",
  quadrant: "high-unpleasant",
  description: "Unable to rest or relax"
});

CREATE (concerned:Emotion {
  id: "concerned",
  name: "Concerned",
  quadrant: "high-unpleasant",
  description: "Worried interest or attention"
});

CREATE (peeved:Emotion {
  id: "peeved",
  name: "Peeved",
  quadrant: "high-unpleasant",
  description: "Mildly annoyed or irritated"
});

CREATE (uneasy:Emotion {
  id: "uneasy",
  name: "Uneasy",
  quadrant: "high-unpleasant",
  description: "Feeling of discomfort or anxiety"
});

CREATE (pressured:Emotion {
  id: "pressured",
  name: "Pressured",
  quadrant: "high-unpleasant",
  description: "Feeling overwhelmed by demands"
});

// High Energy Pleasant - Missing nodes
CREATE (energized:Emotion {
  id: "energized",
  name: "Energized",
  quadrant: "high-pleasant",
  description: "Feeling full of energy and vitality"
});

CREATE (happy:Emotion {
  id: "happy",
  name: "Happy",
  quadrant: "high-pleasant",
  description: "General positive emotional state"
});

CREATE (thrilled:Emotion {
  id: "thrilled",
  name: "Thrilled",
  quadrant: "high-pleasant",
  description: "Intense excitement and pleasure"
});

CREATE (eager:Emotion {
  id: "eager",
  name: "Eager",
  quadrant: "high-pleasant",
  description: "Keen anticipation or desire"
});

CREATE (surprised:Emotion {
  id: "surprised",
  name: "Surprised",
  quadrant: "high-pleasant",
  description: "Unexpected positive experience"
});

CREATE (cheerful:Emotion {
  id: "cheerful",
  name: "Cheerful",
  quadrant: "high-pleasant",
  description: "Bright and positive mood"
});

CREATE (pleasant:Emotion {
  id: "pleasant",
  name: "Pleasant",
  quadrant: "high-pleasant",
  description: "Generally agreeable feeling"
});

CREATE (focused:Emotion {
  id: "focused",
  name: "Focused",
  quadrant: "high-pleasant",
  description: "Clear mental engagement"
});

CREATE (pleased:Emotion {
  id: "pleased",
  name: "Pleased",
  quadrant: "high-pleasant",
  description: "Satisfaction with something"
});

CREATE (confident:Emotion {
  id: "confident",
  name: "Confident",
  quadrant: "high-pleasant",
  description: "Self-assured and certain"
});

CREATE (motivated:Emotion {
  id: "motivated",
  name: "Motivated",
  quadrant: "high-pleasant",
  description: "Driven toward a goal"
});

// Low Energy Unpleasant - Missing nodes
CREATE (tired:Emotion {
  id: "tired",
  name: "Tired",
  quadrant: "low-unpleasant",
  description: "Physical or mental exhaustion"
});

CREATE (down:Emotion {
  id: "down",
  name: "Down",
  quadrant: "low-unpleasant",
  description: "Feeling low or deflated"
});

CREATE (meh:Emotion {
  id: "meh",
  name: "Meh",
  quadrant: "low-unpleasant",
  description: "Indifferent or unenthusiastic"
});

CREATE (fatigued:Emotion {
  id: "fatigued",
  name: "Fatigued",
  quadrant: "low-unpleasant",
  description: "Deep tiredness or exhaustion"
});

CREATE (discouraged:Emotion {
  id: "discouraged",
  name: "Discouraged",
  quadrant: "low-unpleasant",
  description: "Loss of confidence or enthusiasm"
});

CREATE (disheartened:Emotion {
  id: "disheartened",
  name: "Disheartened",
  quadrant: "low-unpleasant",
  description: "Loss of hope or determination"
});

CREATE (insecure:Emotion {
  id: "insecure",
  name: "Insecure",
  quadrant: "low-unpleasant",
  description: "Lacking confidence or certainty"
});

CREATE (lost:Emotion {
  id: "lost",
  name: "Lost",
  quadrant: "low-unpleasant",
  description: "Feeling directionless or confused"
});

CREATE (nostalgic:Emotion {
  id: "nostalgic",
  name: "Nostalgic",
  quadrant: "low-unpleasant",
  description: "Bittersweet longing for the past"
});

CREATE (disengaged:Emotion {
  id: "disengaged",
  name: "Disengaged",
  quadrant: "low-unpleasant",
  description: "Disconnected or uninvolved"
});

CREATE (depleted:Emotion {
  id: "depleted",
  name: "Depleted",
  quadrant: "low-unpleasant",
  description: "Resources or energy exhausted"
});

// Low Energy Pleasant - Missing nodes
CREATE (relaxed:Emotion {
  id: "relaxed",
  name: "Relaxed",
  quadrant: "low-pleasant",
  description: "Free from tension or anxiety"
});

CREATE (good:Emotion {
  id: "good",
  name: "Good",
  quadrant: "low-pleasant",
  description: "General positive state"
});

CREATE (chill:Emotion {
  id: "chill",
  name: "Chill",
  quadrant: "low-pleasant",
  description: "Relaxed and easygoing"
});

CREATE (comfortable:Emotion {
  id: "comfortable",
  name: "Comfortable",
  quadrant: "low-pleasant",
  description: "At ease physically or emotionally"
});

CREATE (thoughtful:Emotion {
  id: "thoughtful",
  name: "Thoughtful",
  quadrant: "low-pleasant",
  description: "Contemplative and reflective"
});

CREATE (mellow:Emotion {
  id: "mellow",
  name: "Mellow",
  quadrant: "low-pleasant",
  description: "Softened and relaxed"
});

CREATE (serene:Emotion {
  id: "serene",
  name: "Serene",
  quadrant: "low-pleasant",
  description: "Calm and peaceful"
});

CREATE (satisfied:Emotion {
  id: "satisfied",
  name: "Satisfied",
  quadrant: "low-pleasant",
  description: "Content with what is"
});

CREATE (restful:Emotion {
  id: "restful",
  name: "Restful",
  quadrant: "low-pleasant",
  description: "Peaceful and restorative"
});

CREATE (appreciative:Emotion {
  id: "appreciative",
  name: "Appreciative",
  quadrant: "low-pleasant",
  description: "Grateful and thankful"
});

CREATE (at_ease:Emotion {
  id: "at-ease",
  name: "At Ease",
  quadrant: "low-pleasant",
  description: "Comfortable and relaxed"
});

CREATE (balanced:Emotion {
  id: "balanced",
  name: "Balanced",
  quadrant: "low-pleasant",
  description: "Equilibrium and stability"
});

CREATE (grounded:Emotion {
  id: "grounded",
  name: "Grounded",
  quadrant: "low-pleasant",
  description: "Stable and centered"
});

CREATE (cozy:Emotion {
  id: "cozy",
  name: "Cozy",
  quadrant: "low-pleasant",
  description: "Warm comfort and security"
});


// ============================================================
// STEP 2: ACTIVATES_DURING RELATIONSHIPS FOR EXISTING EMOTIONS
// (Emotions that exist in Neo4j but lack brain structure links)
// ============================================================


// ============================================================
// HIGH ENERGY UNPLEASANT EMOTIONS (Existing but missing links)
// ============================================================

// Frustration - related to anger circuitry
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "frustration"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "goal-blocking triggers threat response"}]->(e);

MATCH (ofc:BrainStructure {id: "ofc"}), (e:Emotion {id: "frustration"})
CREATE (ofc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward expectation violation"}]->(e);

// Overwhelm - salience network overload
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "overwhelm"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "threat system activation"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "overwhelm"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "interoceptive overload"}]->(e);

// Irritation - low-grade anger
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "irritation"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "mild threat response"}]->(e);

MATCH (dacc:BrainStructure {id: "dacc"}), (e:Emotion {id: "irritation"})
CREATE (dacc)-[:ACTIVATES_DURING {direction: "increases", notes: "conflict monitoring"}]->(e);

// Stress - HPA axis and arousal systems
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "stress"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "HPA axis activation"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "stress"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "threat system"}]->(e);

MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (e:Emotion {id: "stress"})
CREATE (lc)-[:ACTIVATES_DURING {direction: "increases", notes: "norepinephrine arousal"}]->(e);

// Rejection - social pain network
MATCH (dacc:BrainStructure {id: "dacc"}), (e:Emotion {id: "rejection"})
CREATE (dacc)-[:ACTIVATES_DURING {direction: "increases", notes: "social pain alarm"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "rejection"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "social pain awareness"}]->(e);


// ============================================================
// LOW ENERGY UNPLEASANT EMOTIONS (Missing from base schema)
// ============================================================

// Loneliness - social absence awareness
MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "loneliness"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "interoceptive awareness of social absence"}]->(e);

MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "loneliness"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative affect"}]->(e);

// Hopelessness - depression circuitry
MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "hopelessness"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "subgenual cingulate in depression"}]->(e);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "hopelessness"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative self-referential processing"}]->(e);

// Emptiness - depletion state
MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "emptiness"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "anhedonic processing"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "emptiness"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "decreases", notes: "reward system blunted"}]->(e);

// Numbness - overmodulation/disconnection
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "numbness"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "excessive top-down suppression"}]->(e);

MATCH (pcc:BrainStructure {id: "pcc"}), (e:Emotion {id: "numbness"})
CREATE (pcc)-[:ACTIVATES_DURING {direction: "increases", notes: "depersonalization component"}]->(e);

// Boredom - understimulation
MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "boredom"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "monitoring for stimulation"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "boredom"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "decreases", notes: "reward anticipation absent"}]->(e);

// Disappointment - reward prediction error
MATCH (ofc:BrainStructure {id: "ofc"}), (e:Emotion {id: "disappointment"})
CREATE (ofc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative reward prediction error"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "disappointment"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "value comparison"}]->(e);


// ============================================================
// HIGH ENERGY PLEASANT EMOTIONS (Missing from base schema)
// ============================================================

// Curiosity - exploration/approach
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "curiosity"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "anticipatory reward"}]->(e);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "curiosity"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "novelty detection"}]->(e);

// Pride - self-referential positive
MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "pride"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive self-evaluation"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "pride"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "self-reward"}]->(e);

// Enthusiasm - high activation positive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "enthusiasm"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward anticipation"}]->(e);

MATCH (vta:BrainStructure {id: "vta"}), (e:Emotion {id: "enthusiasm"})
CREATE (vta)-[:ACTIVATES_DURING {direction: "increases", notes: "dopamine release"}]->(e);

// Hope - future-oriented positive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "hope"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "anticipated reward"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "hope"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive future valuation"}]->(e);

// Inspiration - motivation surge
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "inspiration"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "goal-directed motivation"}]->(e);

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (e:Emotion {id: "inspiration"})
CREATE (dlpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "goal planning engagement"}]->(e);

// Amusement - playful positive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "amusement"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward from humor"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "amusement"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "positive interoceptive awareness"}]->(e);


// ============================================================
// LOW ENERGY PLEASANT EMOTIONS (Missing from base schema)
// ============================================================

// Calm - regulated state
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "calm"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "successful regulation"}]->(e);

MATCH (pfc:BrainStructure {id: "pfc"}), (e:Emotion {id: "calm"})
CREATE (pfc)-[:ACTIVATES_DURING {direction: "increases", notes: "prefrontal engagement"}]->(e);

// Contentment - satisfied state
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "contentment"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "satisfied reward state"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "contentment"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive valuation"}]->(e);

// Gratitude - social positive
MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "gratitude"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "social-self processing"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "gratitude"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "social emotional awareness"}]->(e);

// Love - attachment and bonding
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "love"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "oxytocin release"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "love"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "attachment reward"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "love"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "social bonding awareness"}]->(e);

// Serenity - deep calm
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "serenity"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "regulation success"}]->(e);

MATCH (pcc:BrainStructure {id: "pcc"}), (e:Emotion {id: "serenity"})
CREATE (pcc)-[:ACTIVATES_DURING {direction: "increases", notes: "peaceful self-awareness"}]->(e);

// Safety - security state
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "safety"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "safety signal processing"}]->(e);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "safety"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "contextual safety"}]->(e);

// Relief - threat resolution
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "relief"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "threat resolution"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "relief"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative outcome avoided reward"}]->(e);

// Trust - social safety
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "trust"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "oxytocin-mediated"}]->(e);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "trust"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "mentalizing/social evaluation"}]->(e);


// ============================================================
// STEP 3: ACTIVATES_DURING RELATIONSHIPS FOR NEW EMOTIONS
// ============================================================


// --- HIGH ENERGY UNPLEASANT (New nodes) ---

// Annoyed - mild anger circuitry
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "annoyed"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "mild threat response"}]->(e);

// Worried - anticipatory anxiety
MATCH (bnst:BrainStructure {id: "bnst"}), (e:Emotion {id: "worried"})
CREATE (bnst)-[:ACTIVATES_DURING {direction: "increases", notes: "sustained anticipatory anxiety"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "worried"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "threat anticipation"}]->(e);

// Nervous - anxiety spectrum
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "nervous"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "apprehension"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "nervous"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "body awareness of anxiety"}]->(e);

// Tense - stress/tension
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "tense"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "stress response"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "tense"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "vigilance"}]->(e);

// Shocked - surprise/alarm
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "shocked"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "sudden alarm response"}]->(e);

MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (e:Emotion {id: "shocked"})
CREATE (lc)-[:ACTIVATES_DURING {direction: "increases", notes: "arousal surge"}]->(e);

// Impassioned - intense arousal
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "impassioned"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "emotional intensity"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "impassioned"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "intense feeling awareness"}]->(e);

// Hyper - excessive arousal
MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (e:Emotion {id: "hyper"})
CREATE (lc)-[:ACTIVATES_DURING {direction: "increases", notes: "heightened arousal"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "hyper"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "activation"}]->(e);

// Jittery - nervous energy
MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (e:Emotion {id: "jittery"})
CREATE (lc)-[:ACTIVATES_DURING {direction: "increases", notes: "norepinephrine arousal"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "jittery"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "nervous activation"}]->(e);

// FOMO - social anxiety + reward seeking
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "fomo"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "social threat"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "fomo"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward anticipation"}]->(e);

// Confused - cognitive uncertainty
MATCH (dacc:BrainStructure {id: "dacc"}), (e:Emotion {id: "confused"})
CREATE (dacc)-[:ACTIVATES_DURING {direction: "increases", notes: "conflict/uncertainty monitoring"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "confused"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "uncertainty awareness"}]->(e);

// Apprehensive - anticipatory anxiety
MATCH (bnst:BrainStructure {id: "bnst"}), (e:Emotion {id: "apprehensive"})
CREATE (bnst)-[:ACTIVATES_DURING {direction: "increases", notes: "anticipatory anxiety"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "apprehensive"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "threat anticipation"}]->(e);

// Restless - unable to settle
MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (e:Emotion {id: "restless"})
CREATE (lc)-[:ACTIVATES_DURING {direction: "increases", notes: "arousal"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "restless"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "activation"}]->(e);

// Concerned - worry
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "concerned"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "concern activation"}]->(e);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "concerned"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "social concern processing"}]->(e);

// Peeved - mild irritation
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "peeved"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "mild irritation"}]->(e);

// Uneasy - discomfort
MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "uneasy"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "interoceptive discomfort"}]->(e);

MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "uneasy"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "mild threat"}]->(e);

// Pressured - stress
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "pressured"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "stress response"}]->(e);

MATCH (dacc:BrainStructure {id: "dacc"}), (e:Emotion {id: "pressured"})
CREATE (dacc)-[:ACTIVATES_DURING {direction: "increases", notes: "demand monitoring"}]->(e);


// --- HIGH ENERGY PLEASANT (New nodes) ---

// Energized - vitality
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "energized"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward/motivation"}]->(e);

MATCH (vta:BrainStructure {id: "vta"}), (e:Emotion {id: "energized"})
CREATE (vta)-[:ACTIVATES_DURING {direction: "increases", notes: "dopamine activation"}]->(e);

// Happy - general positive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "happy"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward state"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "happy"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive valuation"}]->(e);

// Thrilled - intense positive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "thrilled"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "intense reward"}]->(e);

MATCH (vta:BrainStructure {id: "vta"}), (e:Emotion {id: "thrilled"})
CREATE (vta)-[:ACTIVATES_DURING {direction: "increases", notes: "dopamine surge"}]->(e);

// Eager - anticipation
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "eager"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward anticipation"}]->(e);

// Surprised (positive) - unexpected positive
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "surprised"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "novelty detection"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "surprised"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "unexpected reward"}]->(e);

// Cheerful - bright mood
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "cheerful"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive affect"}]->(e);

// Pleasant - agreeable
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "pleasant"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive valuation"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "pleasant"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward state"}]->(e);

// Focused - engaged attention
MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (e:Emotion {id: "focused"})
CREATE (dlpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "executive engagement"}]->(e);

MATCH (dacc:BrainStructure {id: "dacc"}), (e:Emotion {id: "focused"})
CREATE (dacc)-[:ACTIVATES_DURING {direction: "increases", notes: "attention monitoring"}]->(e);

// Pleased - satisfaction
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "pleased"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "reward received"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "pleased"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive evaluation"}]->(e);

// Confident - self-assurance
MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "confident"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive self-evaluation"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "confident"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "self-reward"}]->(e);

// Motivated - goal drive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "motivated"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "goal anticipation"}]->(e);

MATCH (vta:BrainStructure {id: "vta"}), (e:Emotion {id: "motivated"})
CREATE (vta)-[:ACTIVATES_DURING {direction: "increases", notes: "motivation dopamine"}]->(e);


// --- LOW ENERGY UNPLEASANT (New nodes) ---

// Tired - exhaustion
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "tired"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "fatigue signaling"}]->(e);

// Down - low mood
MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "down"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative affect"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "down"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "decreases", notes: "reduced reward"}]->(e);

// Meh - indifference
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "meh"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "decreases", notes: "low engagement"}]->(e);

// Fatigued - deep tiredness
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "fatigued"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "exhaustion"}]->(e);

MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "fatigued"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "depletion state"}]->(e);

// Discouraged - loss of hope
MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "discouraged"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative self-evaluation"}]->(e);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "discouraged"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative self-referential"}]->(e);

// Disheartened - loss of determination
MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "disheartened"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative affect"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "disheartened"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "decreases", notes: "reduced motivation"}]->(e);

// Insecure - lacking confidence
MATCH (amyg:BrainStructure {id: "amygdala"}), (e:Emotion {id: "insecure"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", notes: "self-threat"}]->(e);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "insecure"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "negative self-evaluation"}]->(e);

// Lost - directionless
MATCH (dacc:BrainStructure {id: "dacc"}), (e:Emotion {id: "lost"})
CREATE (dacc)-[:ACTIVATES_DURING {direction: "increases", notes: "uncertainty"}]->(e);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "lost"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "orientation seeking"}]->(e);

// Nostalgic - bittersweet memory
MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "nostalgic"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "autobiographical memory"}]->(e);

MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "nostalgic"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "bittersweet affect"}]->(e);

// Disengaged - disconnected
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "disengaged"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "withdrawal"}]->(e);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "disengaged"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "decreases", notes: "low engagement"}]->(e);

// Depleted - exhausted resources
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "depleted"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "resource depletion"}]->(e);

MATCH (vacc:BrainStructure {id: "vacc"}), (e:Emotion {id: "depleted"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases", notes: "depletion state"}]->(e);


// --- LOW ENERGY PLEASANT (New nodes) ---

// Relaxed - tension free
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "relaxed"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "regulation success"}]->(e);

MATCH (pfc:BrainStructure {id: "pfc"}), (e:Emotion {id: "relaxed"})
CREATE (pfc)-[:ACTIVATES_DURING {direction: "increases", notes: "calm engagement"}]->(e);

// Good - general positive
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "good"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive state"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "good"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive valuation"}]->(e);

// Chill - relaxed ease
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "chill"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "regulated state"}]->(e);

// Comfortable - at ease
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "comfortable"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "safety state"}]->(e);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "comfortable"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "safe context"}]->(e);

// Thoughtful - reflective
MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "thoughtful"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "reflective processing"}]->(e);

MATCH (pcc:BrainStructure {id: "pcc"}), (e:Emotion {id: "thoughtful"})
CREATE (pcc)-[:ACTIVATES_DURING {direction: "increases", notes: "self-reflection"}]->(e);

// Mellow - softened
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "mellow"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "calm regulation"}]->(e);

// Serene - peaceful
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "serene"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "deep calm"}]->(e);

MATCH (pcc:BrainStructure {id: "pcc"}), (e:Emotion {id: "serene"})
CREATE (pcc)-[:ACTIVATES_DURING {direction: "increases", notes: "peaceful awareness"}]->(e);

// Satisfied - content
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (e:Emotion {id: "satisfied"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases", notes: "goal completion"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "satisfied"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "positive evaluation"}]->(e);

// Restful - restorative
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "restful"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "restorative state"}]->(e);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "restful"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "decreases", notes: "reduced stress"}]->(e);

// Appreciative - grateful
MATCH (mpfc:BrainStructure {id: "mpfc"}), (e:Emotion {id: "appreciative"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "gratitude processing"}]->(e);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (e:Emotion {id: "appreciative"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases", notes: "emotional awareness"}]->(e);

// At Ease - comfortable
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "at-ease"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "safety signal"}]->(e);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "at-ease"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "contextual safety"}]->(e);

// Balanced - equilibrium
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "balanced"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "regulation"}]->(e);

MATCH (pfc:BrainStructure {id: "pfc"}), (e:Emotion {id: "balanced"})
CREATE (pfc)-[:ACTIVATES_DURING {direction: "increases", notes: "executive balance"}]->(e);

// Grounded - stable
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "grounded"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "stable regulation"}]->(e);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (e:Emotion {id: "grounded"})
CREATE (hippo)-[:ACTIVATES_DURING {direction: "increases", notes: "present orientation"}]->(e);

// Cozy - warm comfort
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (e:Emotion {id: "cozy"})
CREATE (hypo)-[:ACTIVATES_DURING {direction: "increases", notes: "oxytocin warmth"}]->(e);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (e:Emotion {id: "cozy"})
CREATE (vmpfc)-[:ACTIVATES_DURING {direction: "increases", notes: "safety comfort"}]->(e);


// ============================================================
// VERIFICATION QUERY (Run separately to check coverage)
// ============================================================
// MATCH (e:Emotion)
// OPTIONAL MATCH (bs:BrainStructure)-[:ACTIVATES_DURING]->(e)
// WITH e, count(bs) as brainLinks
// WHERE brainLinks = 0
// RETURN e.id as emotion_without_brain_links
// ORDER BY e.id;


// ============================================================
// END OF EMOTION-BRAIN LINKS UPDATE
// ============================================================
