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
  'pros-cons': 'pros_cons',
};

/**
 * Tools whose own page plays a skill for part of the visit (not the switch above): FAST picks one of its two skills,
 * DEAR MAN plays its debrief on `?mode=debrief` (IE-B2) while the prep stays hand-built. A projection may exist for
 * these too (C8.2: the skill's run still has old readers).
 */
export const PAGE_SKILLS: Readonly<Record<string, readonly string[]>> = {
  'fast': ['fast_review', 'fast_let_go'],
  'dear-man': ['dear_man_debrief'],
};

/**
 * Tools whose close writes profile data through a projection (functions/src/skills/projections.ts `PROJECTIONS`,
 * test-pinned to the same keys): DEAR MAN's debrief sets the person's refusal counts and `safetyRecheckAt`. The
 * profile cache is cleared once such a close lands, so the next prep reads them fresh.
 */
export const PROFILE_WRITING_CLOSES: ReadonlySet<string> = new Set(['dear-man']);

/** The skill a tool's page plays, or null when the tool still has its own page. */
export function playerSkillFor(toolId: string): string | null {
  return Object.prototype.hasOwnProperty.call(PLAYER_TOOLS, toolId) ? PLAYER_TOOLS[toolId] : null;
}
