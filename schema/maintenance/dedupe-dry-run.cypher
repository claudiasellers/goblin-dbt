// ============================================================
// DEDUPE DRY RUN — READ-ONLY. Plan A1-5, runbook R-8.
//
// Run each query in Aura Workspace/Browser (or locally:
// node scripts/load-graph.mjs --file schema/maintenance/dedupe-dry-run.cypher)
// and save the output in the PR and the Product Changelog.
//
// Expected on live (2026-09-30 report): query 1 empty (0 duplicate nodes;
// if it is NOT empty, stop: A1-5 has no node merge); query 2 about 354
// extra relationships minus the legitimate FELT_AS region variants;
// query 2b the exact number dedupe-apply-rels.cypher will delete.
// After the apply: queries 1, 2 and 2b return no rows / 0.
// Not in LOAD_ORDER.
// ============================================================

// 1. Duplicate nodes: same label + id (EmotionRegulationContent: + dbtParent); user data excluded (PR-S1)
MATCH (n) WHERE (n.id IS NOT NULL OR n:EmotionRegulationContent) AND NOT n:UserData
UNWIND labels(n) AS label
WITH label, CASE WHEN label = 'EmotionRegulationContent' THEN n.dbtParent ELSE n.id END AS key, count(*) AS copies
WHERE key IS NOT NULL AND copies > 1
RETURN label, count(*) AS duplicatedKeys, sum(copies - 1) AS extraNodes, collect(key)[0..10] AS sampleKeys
ORDER BY extraNodes DESC;

// 2. Duplicate relationships, every type, keyed like the schema MERGEs:
//    (start, TYPE, end), FELT_AS also on region
MATCH (a)-[r]->(b)
WITH a, b, type(r) AS t, CASE type(r) WHEN 'FELT_AS' THEN r.region END AS k, count(*) AS copies
WHERE copies > 1
RETURN t AS type, count(*) AS duplicatedPairs, sum(copies - 1) AS extraRels, max(copies) AS worstMultiplicity
ORDER BY extraRels DESC;

// 2b. What dedupe-apply-rels.cypher would delete (schema types only; never user data)
MATCH (a)-[r]->(b)
WHERE type(r) IN ["ACTIVATES","ACTIVATES_DURING","ADDRESSES","ASSOCIATED_WITH","BELONGS_TO","CAN_ESCALATE_TO","CARRIES","CONCEPTUALLY_RELATED_TO","CONTEXT_DEPENDENT_ON","CONTRIBUTES_TO","CORRESPONDS_TO","CORRESPONDS_TO_ANS_STATE","DEACTIVATES","DEVELOPED_FOR","DOMINANT_NETWORK","ENABLES","ENGAGES","FELT_AS","HAS_RESPONSE","HOMOLOGUE_OF","IMPLICATED_IN","INHIBITS","INVOLVES","KEY_CIRCUIT","MAINTAINS","MAPS_TO","MAPS_TO_WOT_ZONE","MECHANISM_OF","MEDIATED_BY","MEDIATES","MODULATED_BY","MODULATES","NEURAL_HUB","NEUROBIOLOGICAL_ANCHOR_FOR","OPPOSITE_OF","PARTICIPATES_IN","PART_OF","PREVENTS","PRIMARY_CIRCUIT","PRIMARY_HUB","PRODUCES","PROMOTES","RDOC_DOMAIN_ASSOCIATION","REDUCES","RESPONDS_TO","REWIRES","SHARED_CORE","SIGNATURE_OF","SUBCORTICAL_ACTIVATION","TARGETS","TREATS","TRIGGERS_NEXT","TRIGGERS_SAFETY","TYPE_OF","UTILIZES"]
WITH a, b, type(r) AS t, CASE type(r) WHEN 'FELT_AS' THEN r.region END AS k, count(*) AS copies
WHERE copies > 1
RETURN sum(copies - 1) AS wouldDelete, count(*) AS duplicatedPairs;

// 3. Recommender input: pattern -> emotion ASSOCIATED_WITH multiplicity
//    (live 2026-09-30: 48 edges, 48 distinct pairs; must not change)
MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
WITH p.id AS pattern, e.id AS emotion, count(r) AS copies
RETURN pattern, count(*) AS emotions, sum(copies) AS edges, max(copies) AS worstMultiplicity
ORDER BY pattern;

// 4. Totals (compare before / after)
MATCH (n) WITH count(n) AS nodes
OPTIONAL MATCH ()-[r]->()
RETURN nodes, count(r) AS relationships;
