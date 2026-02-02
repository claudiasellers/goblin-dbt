// ============================================================
// VALIDATION QUERIES FOR KNOWLEDGE GRAPH INTEGRITY
// Run these queries to detect schema drift and data quality issues
// Per domain expert: "Develop automated validation scripts that
// can run against the graph to catch schema drift and data quality issues"
// ============================================================


// ============================================================
// 1. ORPHANED NODES DETECTION
// Find nodes that have no relationships
// ============================================================

// Orphaned BrainStructures (should have at least one relationship)
MATCH (b:BrainStructure)
WHERE NOT (b)-[]-()
RETURN "Orphaned BrainStructure" AS issue_type, b.id AS node_id, b.name AS node_name;

// Orphaned Emotions (should be linked to brain, sensations, or therapy concepts)
MATCH (e:Emotion)
WHERE NOT (e)-[]-()
RETURN "Orphaned Emotion" AS issue_type, e.id AS node_id, e.name AS node_name;

// Orphaned TherapyConcepts (should belong to a modality)
MATCH (tc:TherapyConcept)
WHERE NOT (tc)-[:BELONGS_TO|:PART_OF]->()
RETURN "Orphaned TherapyConcept (no modality)" AS issue_type, tc.id AS node_id, tc.name AS node_name;

// Orphaned ClinicalConstructs (should have brain associations or therapy treatments)
MATCH (cc:ClinicalConstruct)
WHERE NOT (cc)-[]-()
RETURN "Orphaned ClinicalConstruct" AS issue_type, cc.id AS node_id, cc.name AS node_name;


// ============================================================
// 2. BROKEN REFERENCE DETECTION
// Find relationships pointing to non-existent nodes
// ============================================================

// Check for dangling PART_OF relationships
MATCH (a)-[r:PART_OF]->(b)
WHERE b IS NULL
RETURN "Broken PART_OF reference" AS issue_type, a.id AS source_id, type(r) AS rel_type;

// Check for dangling BELONGS_TO relationships
MATCH (a)-[r:BELONGS_TO]->(b)
WHERE b IS NULL
RETURN "Broken BELONGS_TO reference" AS issue_type, a.id AS source_id, type(r) AS rel_type;


// ============================================================
// 3. INCONSISTENT PROPERTY SCHEMAS
// Find nodes missing required properties
// ============================================================

// BrainStructures must have id, name, and level
MATCH (b:BrainStructure)
WHERE b.id IS NULL OR b.name IS NULL OR b.level IS NULL
RETURN "BrainStructure missing required property" AS issue_type,
       b.id AS node_id,
       CASE WHEN b.id IS NULL THEN "id" ELSE "" END +
       CASE WHEN b.name IS NULL THEN " name" ELSE "" END +
       CASE WHEN b.level IS NULL THEN " level" ELSE "" END AS missing_properties;

// Emotions must have id, name, valence, arousal, quadrant
MATCH (e:Emotion)
WHERE e.id IS NULL OR e.name IS NULL OR e.valence IS NULL OR e.arousal IS NULL OR e.quadrant IS NULL
RETURN "Emotion missing required property" AS issue_type,
       e.id AS node_id,
       e.name AS node_name;

// TherapyConcepts must have id, name, modality
MATCH (tc:TherapyConcept)
WHERE tc.id IS NULL OR tc.name IS NULL OR tc.modality IS NULL
RETURN "TherapyConcept missing required property" AS issue_type,
       tc.id AS node_id,
       tc.name AS node_name;


// ============================================================
// 4. REDUNDANT RELATIONSHIP DETECTION
// Find semantically overlapping edge labels
// ============================================================

// Check for duplicate relationships between same nodes
MATCH (a)-[r1]->(b)
MATCH (a)-[r2]->(b)
WHERE id(r1) < id(r2) AND type(r1) = type(r2)
RETURN "Duplicate relationship" AS issue_type,
       a.id AS source_id,
       b.id AS target_id,
       type(r1) AS rel_type,
       count(*) AS duplicate_count;


// ============================================================
// 5. CROSS-MODALITY BRIDGE VALIDATION
// Ensure key therapeutic equivalences are present
// ============================================================

// Verify IFS Self <-> DBT Wise Mind <-> Ventral Vagal bridge exists
MATCH (self:TherapyConcept {id: "ifs_self"})
OPTIONAL MATCH (self)-[:CONCEPTUALLY_RELATED_TO]-(wm:TherapyConcept {id: "dbt_wise_mind"})
OPTIONAL MATCH (self)-[:CONCEPTUALLY_RELATED_TO]-(vv:TherapyConcept {id: "pv_ventral_vagal"})
WITH self, wm, vv
WHERE wm IS NULL OR vv IS NULL
RETURN "Missing core regulatory axis bridge" AS issue_type,
       CASE WHEN wm IS NULL THEN "IFS Self -> Wise Mind missing" ELSE "" END +
       CASE WHEN vv IS NULL THEN " IFS Self -> Ventral Vagal missing" ELSE "" END AS missing_bridges;

// Verify Unblending <-> Defusion <-> Decentering bridge exists
MATCH (unb:TherapyConcept {id: "ifs_unblending"})
OPTIONAL MATCH (unb)-[:CONCEPTUALLY_RELATED_TO]-(def:TherapyConcept {id: "act_defusion"})
OPTIONAL MATCH (dec:TherapyConcept {id: "mbct_decentering"})-[:CONCEPTUALLY_RELATED_TO]-(def)
WITH unb, def, dec
WHERE def IS NULL OR dec IS NULL
RETURN "Missing metacognitive equivalence bridge" AS issue_type,
       "Check Unblending-Defusion-Decentering connections" AS details;


// ============================================================
// 6. HiTOP/RDoC FRAMEWORK VALIDATION
// Ensure dimensional frameworks are properly connected
// ============================================================

// All HiTOP spectra should connect to p-factor
MATCH (spec:HiTOPConstruct)
WHERE spec.level = "spectrum"
OPTIONAL MATCH (spec)-[:CONTRIBUTES_TO]->(pf:HiTOPConstruct {id: "hitop_p_factor"})
WITH spec, pf
WHERE pf IS NULL
RETURN "HiTOP spectrum not connected to p-factor" AS issue_type,
       spec.id AS spectrum_id,
       spec.name AS spectrum_name;

// All RDoC constructs should belong to a domain
MATCH (c:RDoCConstruct)
OPTIONAL MATCH (c)-[:BELONGS_TO]->(d:RDoCDomain)
WITH c, d
WHERE d IS NULL
RETURN "RDoC construct missing domain" AS issue_type,
       c.id AS construct_id,
       c.name AS construct_name;


// ============================================================
// 7. CLINICAL-NEURAL MAPPING VALIDATION
// Ensure clinical constructs have brain associations
// ============================================================

// Major clinical constructs should have brain associations
MATCH (cc:ClinicalConstruct)
WHERE cc.id IN ["ptsd", "bpd", "mdd", "gad", "ocd", "panic_disorder"]
OPTIONAL MATCH (cc)-[:ASSOCIATED_WITH]->(b:BrainStructure)
WITH cc, collect(b) AS brain_regions
WHERE size(brain_regions) = 0
RETURN "Clinical construct missing brain associations" AS issue_type,
       cc.id AS construct_id,
       cc.name AS construct_name;


// ============================================================
// 8. SHAME/GUILT DIFFERENTIATION VALIDATION
// Per expert: These must be distinct with different neural signatures
// ============================================================

// Verify shame and guilt have distinct neural signature nodes
MATCH (shame_sig:NeuralSignature {emotion: "shame"})
MATCH (guilt_sig:NeuralSignature {emotion: "guilt"})
OPTIONAL MATCH (shame_sig)-[:PRIMARY_HUB]->(shame_brain:BrainStructure)
OPTIONAL MATCH (guilt_sig)-[:PRIMARY_HUB]->(guilt_brain:BrainStructure)
WITH collect(DISTINCT shame_brain.id) AS shame_hubs, collect(DISTINCT guilt_brain.id) AS guilt_hubs
WITH shame_hubs, guilt_hubs,
     [x IN shame_hubs WHERE x IN guilt_hubs] AS overlap
WHERE size(overlap) = size(shame_hubs) // All hubs are shared = no differentiation
RETURN "Shame/Guilt not differentiated" AS issue_type,
       "Neural signatures should have distinct primary hubs" AS details;


// ============================================================
// 9. WINDOW OF TOLERANCE VALIDATION
// Ensure all zones are connected to Polyvagal states
// ============================================================

MATCH (zone:TherapyConcept)
WHERE zone.id STARTS WITH "wot_" AND zone.id <> "window_of_tolerance" AND zone.id <> "wot_frozen_flight"
OPTIONAL MATCH (zone)-[:CORRESPONDS_TO]->(pv:TherapyConcept)
WHERE pv.modality = "Polyvagal"
WITH zone, pv
WHERE pv IS NULL
RETURN "Window of Tolerance zone missing Polyvagal mapping" AS issue_type,
       zone.id AS zone_id,
       zone.name AS zone_name;


// ============================================================
// 10. BODY SENSATION COMPLETENESS
// Ensure key emotions have body sensation mappings
// ============================================================

MATCH (e:Emotion)
WHERE e.quadrant IN ["high-unpleasant", "low-unpleasant"] // Distressing emotions
OPTIONAL MATCH (e)-[:FELT_AS]->(s:SensationType)
WITH e, collect(s) AS sensations
WHERE size(sensations) = 0
RETURN "Emotion missing body sensation mapping" AS issue_type,
       e.id AS emotion_id,
       e.name AS emotion_name,
       e.quadrant AS quadrant;


// ============================================================
// 11. THERAPY MODALITY COMPLETENESS
// Ensure each modality has concepts
// ============================================================

MATCH (tm:TherapyModality)
OPTIONAL MATCH (tc:TherapyConcept)-[:BELONGS_TO|:PART_OF*]->(tm)
WITH tm, count(tc) AS concept_count
WHERE concept_count < 3 // Minimum expected concepts per modality
RETURN "Therapy modality has few concepts" AS issue_type,
       tm.id AS modality_id,
       tm.name AS modality_name,
       concept_count AS num_concepts;


// ============================================================
// 12. SUMMARY STATISTICS QUERY
// Get overall graph health metrics
// ============================================================

MATCH (n)
WITH labels(n) AS node_labels, count(*) AS count
RETURN "Node counts by label" AS metric_type, node_labels[0] AS label, count
ORDER BY count DESC;

// Relationship type counts
// MATCH ()-[r]->()
// WITH type(r) AS rel_type, count(*) AS count
// RETURN "Relationship counts by type" AS metric_type, rel_type, count
// ORDER BY count DESC;
