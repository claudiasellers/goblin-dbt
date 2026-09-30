// ============================================================
// REMOVE THE UNUSED GOAL FIELDS — PR-P2 (runbook R-14). Run AFTER deploying P2.
//
// The Goals section (daily check-in goal, weekly tool goal, focus categories) had no reader and is
// gone from Me; the whitelist no longer accepts the fields. Idempotent: a second run removes nothing.
//   node scripts/load-graph.mjs --file schema/migrations/2026-10-remove-goal-fields.cypher
// Not in LOAD_ORDER (it touches user data).
// ============================================================

MATCH (u:User)
WHERE u.dailyCheckInGoal IS NOT NULL OR u.weeklyToolGoal IS NOT NULL OR u.focusCategories IS NOT NULL
REMOVE u.dailyCheckInGoal, u.weeklyToolGoal, u.focusCategories
RETURN count(u) AS usersCleaned;
