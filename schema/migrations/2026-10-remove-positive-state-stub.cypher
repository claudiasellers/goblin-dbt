// ============================================================
// REMOVE THE positive_state STUB PATTERN — found by the Phase A rehearsal (2026-09-30).
// Run AFTER deploying M2 (PR-C1's saveCheckIn), right after 2026-10-remove-goal-fields.cypher.
//
// positive_state is not a graph pattern: it's the synthetic pleasant-quadrant result. The old
// saveCheckIn (before PR-C1) did `MERGE (ap:ActivationPattern {id: $activationPatternId})`, so the
// first pleasant check-in created an empty ActivationPattern {id: 'positive_state'} node plus a
// MATCHED_PATTERN edge from that check-in. PR-C1 only links patterns that exist, so after the M2
// deploy nothing recreates it. The check-ins keep their activationPatternId property; only the stub
// and its MATCHED_PATTERN edges go. Guarded: it deletes the node only while it is still a bare stub
// (no property but id, and no relationship except MATCHED_PATTERN from a CheckIn), so real graph
// content can never be removed by it. Idempotent: a second run removes nothing.
//   node scripts/load-graph.mjs --file schema/migrations/2026-10-remove-positive-state-stub.cypher
// Not in LOAD_ORDER (it touches user-data edges).
// ============================================================

MATCH (p:ActivationPattern {id: 'positive_state'})
WHERE keys(p) = ['id']
  AND all(r IN [(p)-[x]-() | x] WHERE type(r) = 'MATCHED_PATTERN' AND startNode(r):CheckIn AND endNode(r) = p)
WITH p, COUNT { (:CheckIn)-[:MATCHED_PATTERN]->(p) } AS links
DETACH DELETE p
RETURN count(p) AS stubsRemoved, sum(links) AS checkInLinksRemoved;
