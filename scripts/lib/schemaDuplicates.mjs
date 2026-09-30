/**
 * Duplicate checks shared by scripts/load-graph.mjs (--verify) and mirrored, verbatim, in
 * schema/maintenance/dedupe-*.cypher (tests/schema-idempotency.test.mjs keeps them in sync).
 *
 * SCHEMA_REL_TYPES: the relationship types the CREATE-based base files declared (knowledge-graph,
 * relationships, the low-unpleasant patch) plus the two discriminating-questions types that had
 * properties inside their MERGE pattern. Only these can have been duplicated by loader re-runs, and
 * only these are ever deduplicated. User-data types (LOGGED, COMPLETED_SESSION, PRACTICED,
 * FOUND_WORD, …) are never in this list (plan R6).
 */
export const SCHEMA_REL_TYPES = [
  'ACTIVATES', 'ACTIVATES_DURING', 'ADDRESSES', 'ASSOCIATED_WITH', 'BELONGS_TO', 'CAN_ESCALATE_TO',
  'CARRIES', 'CONCEPTUALLY_RELATED_TO', 'CONTEXT_DEPENDENT_ON', 'CONTRIBUTES_TO', 'CORRESPONDS_TO',
  'CORRESPONDS_TO_ANS_STATE', 'DEACTIVATES', 'DEVELOPED_FOR', 'DOMINANT_NETWORK', 'ENABLES', 'ENGAGES',
  'FELT_AS', 'HAS_RESPONSE', 'HOMOLOGUE_OF', 'IMPLICATED_IN', 'INHIBITS', 'INVOLVES', 'KEY_CIRCUIT',
  'MAINTAINS', 'MAPS_TO', 'MAPS_TO_WOT_ZONE', 'MECHANISM_OF', 'MEDIATED_BY', 'MEDIATES', 'MODULATED_BY',
  'MODULATES', 'NEURAL_HUB', 'NEUROBIOLOGICAL_ANCHOR_FOR', 'OPPOSITE_OF', 'PARTICIPATES_IN', 'PART_OF',
  'PREVENTS', 'PRIMARY_CIRCUIT', 'PRIMARY_HUB', 'PRODUCES', 'PROMOTES', 'RDOC_DOMAIN_ASSOCIATION',
  'REDUCES', 'RESPONDS_TO', 'REWIRES', 'SHARED_CORE', 'SIGNATURE_OF', 'SUBCORTICAL_ACTIVATION',
  'TARGETS', 'TREATS', 'TRIGGERS_NEXT', 'TRIGGERS_SAFETY', 'TYPE_OF', 'UTILIZES',
];

/** Duplicate nodes: same label + same id (or same dbtParent for EmotionRegulationContent). */
export const DUPLICATE_NODES_QUERY = `
MATCH (n) WHERE n.id IS NOT NULL OR n:EmotionRegulationContent
UNWIND labels(n) AS label
WITH label, CASE WHEN label = 'EmotionRegulationContent' THEN n.dbtParent ELSE n.id END AS key, count(*) AS copies
WHERE key IS NOT NULL AND copies > 1
RETURN label, count(*) AS duplicatedKeys, sum(copies - 1) AS extraNodes, collect(key)[0..10] AS sampleKeys
ORDER BY extraNodes DESC`;

/** Duplicate relationships of every type, keyed like the schema MERGEs: (a, TYPE, b), FELT_AS also on region. */
export const DUPLICATE_RELS_QUERY = `
MATCH (a)-[r]->(b)
WITH a, b, type(r) AS t, CASE type(r) WHEN 'FELT_AS' THEN r.region END AS k, count(*) AS copies
WHERE copies > 1
RETURN t AS type, count(*) AS duplicatedPairs, sum(copies - 1) AS extraRels, max(copies) AS worstMultiplicity
ORDER BY extraRels DESC`;
