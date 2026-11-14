/**
 * Help me now, interim (PR-C2, D-08) until DT-01 / CORE-07 build the real front door. Pure.
 *
 * No feeling was given, so there is no check-in and no getStateAndTools call (a guessed quadrant can
 * land on emotional_flooding and show the crisis banner to someone who never reported risk). The
 * user gets the universally safe fallback micro-step, and two quiet links that split direction
 * instead of guessing it: one down-regulating, one orienting.
 */
export const HELP_NOW_MICRO_STEP_SET = 'fallback';

/** The links, in order: down-regulate (Cool Down), orient (5-4-3-2-1), and the person's own kit (DT-03). */
export const HELP_NOW_TOOL_IDS = ['cool-down', 'five-senses', 'crisis-kit'] as const;

/** The link's query per tool: the kit opens as "right now" (`frame=now`: no *Make it yours* while someone is in it). */
export const HELP_NOW_QUERY: Partial<Record<(typeof HELP_NOW_TOOL_IDS)[number], string>> = { 'crisis-kit': 'frame=now' };

/** Route state for a tool opened from Help me now. */
export function helpNowLinkState(hostSessionId: string | null) {
  return { spine: { entry: 'checkin_grid' as const, ...(hostSessionId ? { hostSessionId } : {}) } };
}
