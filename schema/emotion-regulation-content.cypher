// ============================================================
// EMOTION REGULATION CONTENT — HUMANIZED
// Linehan-sourced: Handouts 6, 8a, 11, 13
// (DBT Skills Training Handouts and Worksheets, 2e)
//
// Voice principle: preserve clinical meaning exactly,
// but write how someone would describe it to a friend.
// First person, plain language, recognition-triggering.
// ============================================================


// --- FEAR ---
MERGE (c:EmotionRegulationContent {dbtParent: 'fear'})
SET c.label = 'Fear',
    c.fitsTheFactsWhen = [
      "I'm in actual danger — something could hurt me or someone I care about.",
      "My health or someone else's health is genuinely at risk right now.",
      "Something is seriously threatening my safety or well-being."
    ];

MATCH (e:Emotion {id: 'fear'})
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- ANGER ---
MERGE (c:EmotionRegulationContent {dbtParent: 'anger'})
SET c.label = 'Anger',
    c.fitsTheFactsWhen = [
      "Something important to me is being blocked or taken away.",
      "Someone hurt me or someone I care about — physically or emotionally.",
      "Someone insulted, disrespected, or threatened me or someone I care about.",
      "My people are being treated unfairly or disrespected."
    ];

MATCH (e:Emotion {id: 'anger'})
MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- DISGUST ---
MERGE (c:EmotionRegulationContent {dbtParent: 'disgust'})
SET c.label = 'Disgust',
    c.fitsTheFactsWhen = [
      "Something I'm in contact with could actually make me sick or contaminate me.",
      "Someone who has seriously wronged me is physically too close.",
      "I'm around people whose behavior could genuinely harm me or my community."
    ];

MATCH (e:Emotion {id: 'disgust'})
MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- ENVY ---
MERGE (c:EmotionRegulationContent {dbtParent: 'envy'})
SET c.label = 'Envy',
    c.fitsTheFactsWhen = [
      "Someone has something I genuinely need or want — and I don't have it."
    ];


// --- JEALOUSY ---
MERGE (c:EmotionRegulationContent {dbtParent: 'jealousy'})
SET c.label = 'Jealousy',
    c.fitsTheFactsWhen = [
      "A relationship or something I deeply value is genuinely at risk of being lost or damaged.",
      "Someone is actually trying to take away a person or thing that matters to me."
    ];


// --- LOVE (when it doesn't fit / isn't effective) ---
MERGE (c:EmotionRegulationContent {dbtParent: 'love'})
SET c.label = 'Love',
    c.fitsTheFactsWhen = [
      "Being with this person genuinely makes my life better.",
      "This relationship helps me become who I want to be."
    ];

MATCH (e:Emotion {id: 'love'})
MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- SADNESS ---
MERGE (c:EmotionRegulationContent {dbtParent: 'sadness'})
SET c.label = 'Sadness',
    c.fitsTheFactsWhen = [
      "I've lost something or someone — and they're not coming back.",
      "Things didn't turn out how I hoped or expected."
    ];

MATCH (e:Emotion {id: 'sadness'})
MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- SHAME ---
MERGE (c:EmotionRegulationContent {dbtParent: 'shame'})
SET c.label = 'Shame',
    c.fitsTheFactsWhen = [
      "If people I care about found out about this, they would actually reject me — not just disapprove, but leave."
    ];

MATCH (c:EmotionRegulationContent {dbtParent: 'shame'})
MATCH (e:Emotion) WHERE e.id IN ['hot_shame', 'cold_shame']
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- GUILT ---
MERGE (c:EmotionRegulationContent {dbtParent: 'guilt'})
SET c.label = 'Guilt',
    c.fitsTheFactsWhen = [
      "What I did actually goes against my own values — not someone else's rules, but mine."
    ];

MATCH (e:Emotion {id: 'guilt'})
MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);