// Phase 1 integrity cleanup — 2026-04-20
// Fixes verified via neo4j-auditor subagent.
// Safe to re-run (idempotent; matches are no-ops once fixed).

// --- 1. Delete ghost ActivationPattern ---
MATCH (p:ActivationPattern {id: 'positive_state'}) DETACH DELETE p;

// --- 2. Normalize invalid evidence grades ---
MATCH ()-[r]->() WHERE r.evidence = 'strong' SET r.evidence = 'Strong';
MATCH ()-[r]->() WHERE r.evidence = 'moderate' SET r.evidence = 'Moderate';
MATCH ()-[r:HOMOLOGUE_OF]->() WHERE r.evidence = 'translational research'
  SET r.evidence = 'Moderate', r.method = 'translational research';

// --- 3. Delete 326 unlabeled phantom nodes ---
// Verified: fully isolated subgraph (0 connections to labeled nodes),
// all propertyless. Not user data. Artifact of a failed/partial schema load.
MATCH (n) WHERE size(labels(n)) = 0 DETACH DELETE n;

// Step 4 (user-data cleanup via :BodySensation etc.) is handled by the
// existing schema/cleanup-user-data.cypher. Run that separately.
