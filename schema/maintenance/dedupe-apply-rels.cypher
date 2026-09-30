// ============================================================
// DEDUPE, RELATIONSHIPS ONLY — WRITES. Plan A1-5, runbook R-8.
//
// Run ONLY after: a backup (Aura snapshot, or node scripts/graph-export.mjs;
// D-05) and dedupe-dry-run.cypher with query 1 empty. Deletes the extra
// copies of relationships that the old CREATE-based loader duplicated,
// keeping one per (start, TYPE, end) — FELT_AS per (start, end, region),
// so legitimate region variants survive. Keeps the copy with the most
// properties; the next full load re-SETs file properties anyway.
//
// Only the 55 schema relationship types below (the types the CREATE-based
// base files declared, plus HAS_RESPONSE / TRIGGERS_NEXT). User-data types
// (LOGGED, COMPLETED_SESSION, PRACTICED, FOUND_WORD, …) are never touched.
// No node is merged or deleted; no APOC. Idempotent: a second run deletes 0.
// Not in LOAD_ORDER.
// ============================================================

MATCH (a)-[r]->(b)
WHERE type(r) IN ["ACTIVATES","ACTIVATES_DURING","ADDRESSES","ASSOCIATED_WITH","BELONGS_TO","CAN_ESCALATE_TO","CARRIES","CONCEPTUALLY_RELATED_TO","CONTEXT_DEPENDENT_ON","CONTRIBUTES_TO","CORRESPONDS_TO","CORRESPONDS_TO_ANS_STATE","DEACTIVATES","DEVELOPED_FOR","DOMINANT_NETWORK","ENABLES","ENGAGES","FELT_AS","HAS_RESPONSE","HOMOLOGUE_OF","IMPLICATED_IN","INHIBITS","INVOLVES","KEY_CIRCUIT","MAINTAINS","MAPS_TO","MAPS_TO_WOT_ZONE","MECHANISM_OF","MEDIATED_BY","MEDIATES","MODULATED_BY","MODULATES","NEURAL_HUB","NEUROBIOLOGICAL_ANCHOR_FOR","OPPOSITE_OF","PARTICIPATES_IN","PART_OF","PREVENTS","PRIMARY_CIRCUIT","PRIMARY_HUB","PRODUCES","PROMOTES","RDOC_DOMAIN_ASSOCIATION","REDUCES","RESPONDS_TO","REWIRES","SHARED_CORE","SIGNATURE_OF","SUBCORTICAL_ACTIVATION","TARGETS","TREATS","TRIGGERS_NEXT","TRIGGERS_SAFETY","TYPE_OF","UTILIZES"]
WITH a, b, type(r) AS t, CASE type(r) WHEN 'FELT_AS' THEN r.region END AS k, r
ORDER BY size(keys(r)) DESC, elementId(r)
WITH a, b, t, k, collect(r) AS rs
WHERE size(rs) > 1
UNWIND tail(rs) AS extra
DELETE extra
RETURN count(*) AS deletedRelationships;
