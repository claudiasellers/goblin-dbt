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
  {c: "dbt_radical_acceptance", t: "let-it-be"},
  {c: "dbt_accepts", t: "mind-job"},
  {c: "dbt_saying_no", t: "say-no"},
  {c: "dbt_self_soothe", t: "soothe"},
  {c: "dbt_mindfulness_current_thoughts", t: "thoughts-passing"},
  {c: "dbt_give", t: "give"},
  {c: "dbt_dialectical_abstinence", t: "habit-plan"},
  {c: "dbt_please", t: "please-skill"},
  {c: "dbt_accumulate_positives", t: "good-things"},
  {c: "dbt_values_priorities", t: "values-clarification"},
  {c: "dbt_build_mastery", t: "build-mastery"},
  {c: "dbt_crisis_survival_kit", t: "crisis-kit"},
  {c: "dbt_building_relationships", t: "finding-connection"},
  {c: "dbt_mindfulness_of_others", t: "mindfulness-of-others"},
  {c: "dbt_behavioral_rehearsal", t: "rehearse"}
] AS row
MATCH (c:TherapyConcept {id: row.c})
SET c.appToolId = row.t;
