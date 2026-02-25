// ============================================================
// INCREMENTAL UPDATE - Opposite Emotion Relationships
// Run this against existing Neo4j database
//
// Adds OPPOSITE_OF relationships between emotions to enable
// programmatic traversal for the DBT Opposite Action skill.
//
// Mapping logic:
//   - Arousal Flip (Circumplex Model): high-unpleasant <-> low-pleasant
//   - Arousal Flip (Circumplex Model): low-unpleasant <-> high-pleasant
//   - Action Tendency Flip: avoidance <-> approach, hiding <-> showing
// ============================================================


// ============================================================
// STEP 1: CREATE NEW EMOTION NODES
// ============================================================

CREATE (apathy:Emotion {
  id: "apathy",
  name: "Apathy",
  description: "Lack of interest, enthusiasm, or concern; flat affect",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
});

CREATE (hostility:Emotion {
  id: "hostility",
  name: "Hostility",
  description: "Antagonistic state involving opposition or resistance",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
});

CREATE (humility:Emotion {
  id: "humility",
  name: "Humility",
  description: "Modest view of one's importance; freedom from pride or arrogance",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
});


// ============================================================
// STEP 2: CREATE OPPOSITE_OF RELATIONSHIPS
// Bidirectional pairs using MERGE for idempotency
// ============================================================

// --- High-Unpleasant <-> Low-Pleasant (arousal flip) ---

MATCH (fear:Emotion {id: "fear"}), (safety:Emotion {id: "safety"})
MERGE (fear)-[:OPPOSITE_OF]->(safety) MERGE (safety)-[:OPPOSITE_OF]->(fear);

MATCH (anxiety:Emotion {id: "anxiety"}), (calm:Emotion {id: "calm"})
MERGE (anxiety)-[:OPPOSITE_OF]->(calm) MERGE (calm)-[:OPPOSITE_OF]->(anxiety);

MATCH (panic:Emotion {id: "panic"}), (serenity:Emotion {id: "serenity"})
MERGE (panic)-[:OPPOSITE_OF]->(serenity) MERGE (serenity)-[:OPPOSITE_OF]->(panic);

MATCH (anger:Emotion {id: "anger"}), (compassion:Emotion {id: "compassion"})
MERGE (anger)-[:OPPOSITE_OF]->(compassion) MERGE (compassion)-[:OPPOSITE_OF]->(anger);

MATCH (stress:Emotion {id: "stress"}), (relief:Emotion {id: "relief"})
MERGE (stress)-[:OPPOSITE_OF]->(relief) MERGE (relief)-[:OPPOSITE_OF]->(stress);

// --- Low-Unpleasant <-> High-Pleasant (arousal flip) ---

MATCH (sadness:Emotion {id: "sadness"}), (joy:Emotion {id: "joy"})
MERGE (sadness)-[:OPPOSITE_OF]->(joy) MERGE (joy)-[:OPPOSITE_OF]->(sadness);

MATCH (hopelessness:Emotion {id: "hopelessness"}), (hope:Emotion {id: "hope"})
MERGE (hopelessness)-[:OPPOSITE_OF]->(hope) MERGE (hope)-[:OPPOSITE_OF]->(hopelessness);

MATCH (loneliness:Emotion {id: "loneliness"}), (love:Emotion {id: "love"})
MERGE (loneliness)-[:OPPOSITE_OF]->(love) MERGE (love)-[:OPPOSITE_OF]->(loneliness);

MATCH (boredom:Emotion {id: "boredom"}), (excitement:Emotion {id: "excitement"})
MERGE (boredom)-[:OPPOSITE_OF]->(excitement) MERGE (excitement)-[:OPPOSITE_OF]->(boredom);

MATCH (emptiness:Emotion {id: "emptiness"}), (contentment:Emotion {id: "contentment"})
MERGE (emptiness)-[:OPPOSITE_OF]->(contentment) MERGE (contentment)-[:OPPOSITE_OF]->(emptiness);

// --- Self-Conscious / Social Emotions ---

MATCH (hot_shame:Emotion {id: "hot_shame"}), (pride:Emotion {id: "pride"})
MERGE (hot_shame)-[:OPPOSITE_OF]->(pride) MERGE (pride)-[:OPPOSITE_OF]->(hot_shame);

MATCH (cold_shame:Emotion {id: "cold_shame"}), (humility:Emotion {id: "humility"})
MERGE (cold_shame)-[:OPPOSITE_OF]->(humility) MERGE (humility)-[:OPPOSITE_OF]->(cold_shame);

MATCH (disgust:Emotion {id: "disgust"}), (gratitude:Emotion {id: "gratitude"})
MERGE (disgust)-[:OPPOSITE_OF]->(gratitude) MERGE (gratitude)-[:OPPOSITE_OF]->(disgust);

MATCH (rejection:Emotion {id: "rejection"}), (trust:Emotion {id: "trust"})
MERGE (rejection)-[:OPPOSITE_OF]->(trust) MERGE (trust)-[:OPPOSITE_OF]->(rejection);

// --- Functional / Cognitive States ---

MATCH (inspiration:Emotion {id: "inspiration"}), (apathy:Emotion {id: "apathy"})
MERGE (inspiration)-[:OPPOSITE_OF]->(apathy) MERGE (apathy)-[:OPPOSITE_OF]->(inspiration);

MATCH (frustration:Emotion {id: "frustration"}), (amusement:Emotion {id: "amusement"})
MERGE (frustration)-[:OPPOSITE_OF]->(amusement) MERGE (amusement)-[:OPPOSITE_OF]->(frustration);
