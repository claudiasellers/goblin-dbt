/**
 * The switch (docs/design/dbt-modules-plan.md C8.4): the tool ids whose page renders the skill player, each with
 * the skill it plays. ToolPage checks this before its hand-built pages, so a port PR adds its id here and keeps
 * the old page in the tree, unrouted; after Claudia has used it and the gates passed, a follow-up PR deletes the
 * old page. Rolling a port back is removing its line. Same tool id, same URL (C8.1).
 */
export const PLAYER_TOOLS: Readonly<Record<string, string>> = {
  'check-the-facts': 'check_the_facts',
  'er-troubleshoot': 'er_troubleshoot',
};

/** The skill a tool's page plays, or null when the tool still has its own page. */
export function playerSkillFor(toolId: string): string | null {
  return Object.prototype.hasOwnProperty.call(PLAYER_TOOLS, toolId) ? PLAYER_TOOLS[toolId] : null;
}
