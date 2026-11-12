/**
 * The switch (docs/design/dbt-modules-plan.md C8.4): the tool ids whose page renders the skill player, each with
 * the skill it plays. ToolPage checks this before its hand-built pages, so a port PR adds its id here and keeps
 * the old page in the tree, unrouted; after Claudia has used it and the gates passed, a follow-up PR deletes the
 * old page. Rolling a port back is removing its line. Same tool id, same URL (C8.1).
 */
export const PLAYER_TOOLS: Readonly<Record<string, string>> = {
  'check-the-facts': 'check_the_facts',
  'alternate-rebellion': 'alternate_rebellion',
  'er-troubleshoot': 'er_troubleshoot',
  'ending-relationships': 'ending_relationships',
  'nightmare-rescript': 'nightmare_rescript',
  'pause': 'hold_to_wait',
  'problem-solve': 'problem_solve',
  'cope-ahead': 'cope_ahead',
  'pros-cons': 'pros_cons',
  'cool-down': 'first_body',
  'urge-surfing': 'ride_it_out',
  'let-it-be': 'let_it_be',
  'mind-job': 'mind_job',
  'soothe': 'held',
  'thoughts-passing': 'thoughts_passing',
  'opposite-action': 'opposite_action',
  'habit-plan': 'habit_plan',
  'please-skill': 'please_skill',
  'good-things': 'good_things',
  'values-clarification': 'values',
  'build-mastery': 'build_mastery',
  'finding-connection': 'finding_connection',
};

/**
 * Tools whose own page plays a skill for part of the visit (not the switch above): FAST picks one of its two skills,
 * DEAR MAN plays its debrief on `?mode=debrief` (IE-B2) One message on `?mode=one` (IE-B3) and the prep everywhere else (IE-B4). A projection may exist for
 * these too (C8.2: the skill's run still has old readers).
 */
export const PAGE_SKILLS: Readonly<Record<string, readonly string[]>> = {
  'fast': ['fast_review', 'fast_let_go'],
  'dear-man': ['dear_man_debrief', 'dear_man_one', 'dear_man_prep'],
  'say-no': ['say_no'],
  'give': ['give'],
  'crisis-kit': ['crisis_kit_use', 'crisis_kit_build'],
};

/**
 * Tools whose close writes profile data through a projection (functions/src/skills/projections.ts `PROJECTIONS`;
 * test-pinned: every one has a projection, and Cope Ahead's projection writes log fields only): DEAR MAN's debrief
 * sets the person's refusal counts and `safetyRecheckAt`. The profile cache is cleared once such a close lands, so
 * the next prep reads them fresh.
 */
export const PROFILE_WRITING_CLOSES: ReadonlySet<string> = new Set(['dear-man', 'say-no', 'give']);

/**
 * Links the old page still answers after its port (C8.4: the old page stays in the tree, unrouted, except for these):
 * Do the Opposite's `?followUp=<sessionId>` from the oa_plan cards the hand-built page scheduled before the port (they
 * go stale after a week). A link that also names `run` is the skill's own (oa_try), so the player takes it.
 * Remove it, and the hand-built page's route with it, 7 days after the port's deploy (docs/design/opposite-action-v3.md).
 */
export function legacyLink(toolId: string, search: string): boolean {
  if (toolId !== 'opposite-action') return false;
  const q = new URLSearchParams(search);
  return q.has('followUp') && !q.has('run');
}

/** The skill a tool's page plays, or null when the tool still has its own page. */
export function playerSkillFor(toolId: string): string | null {
  return Object.prototype.hasOwnProperty.call(PLAYER_TOOLS, toolId) ? PLAYER_TOOLS[toolId] : null;
}
