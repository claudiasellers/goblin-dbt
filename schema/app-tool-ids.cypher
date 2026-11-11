// ============================================================
// APP TOOL IDS — join key from graph concepts to app tools (src/data/tools.ts)
//
// getStateAndTools and getInsightsData return TherapyConcept ids as tool cards. The
// frontend matches cards to tools by id; the old string normalization
// (strip "dbt_", "_" -> "-") produced ids with no tool behind them: dbt_tipp ->
// "tipp", dbt_stop -> "stop", dbt_problem_solving -> "problem-solving". The functions
// now prefer tc.appToolId and fall back to the normalization.
//
// Concepts created by later migrations set their own appToolId there
// (e.g. find-the-feeling.cypher sets dbt_find_the_feeling and urge_surfing).
// MATCH-only on existing concepts: SET is idempotent, missing ids are no-ops.
// ============================================================

UNWIND [
  {c: "dbt_tipp", t: "cool-down"},
  {c: "dbt_stop", t: "pause"},
  {c: "se_orienting", t: "five-senses"},
  {c: "dbt_opposite_action", t: "opposite-action"},
  {c: "dbt_problem_solving", t: "problem-solve"},
  {c: "dbt_dear_man", t: "dear-man"},
  {c: "dbt_recovering_from_invalidation", t: "recovering-from-invalidation"},
  {c: "dbt_wise_mind", t: "wise-mind"},
  {c: "dbt_cope_ahead", t: "cope-ahead"},
  {c: "dbt_check_facts", t: "check-the-facts"},
  {c: "dbt_troubleshooting", t: "er-troubleshoot"},
  {c: "dbt_alternate_rebellion", t: "alternate-rebellion"},
  {c: "dbt_fast", t: "fast"},
  {c: "dbt_nightmare_protocol", t: "nightmare-rescript"},
  {c: "dbt_ending_relationships", t: "ending-relationships"},
  {c: "dbt_pros_cons", t: "pros-cons"},
  {c: "dbt_saying_no", t: "say-no"}
] AS row
MATCH (c:TherapyConcept {id: row.c})
SET c.appToolId = row.t;
