// ============================================================
// ONE-OFF: Remove deprecated EmotionRegulationContent properties
//
// Run once after consolidating opposite-action data (Option A).
// These properties were removed from emotion-regulation-content.cypher;
// this script drops them from existing nodes so the graph matches.
//
// Safe to re-run (REMOVE of missing property is a no-op).
// ============================================================

MATCH (c:EmotionRegulationContent)
REMOVE c.commonActionUrges,
       c.oppositeActionsBasic,
       c.oppositeActionsAllTheWay,
       c.problemSolveActions;
