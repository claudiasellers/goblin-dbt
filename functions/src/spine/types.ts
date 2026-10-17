/**
 * Practice spine types (PR-S3). Pure, no imports. Mirrored in src/data/spineTypes.ts
 * (tests/spine-validation.test.mjs asserts the two stay identical after the header).
 * Band and then-vs-now come from the capacity types (R1, R3).
 */
export type ToolEntry =
  | 'checkin_result' | 'checkin_grid' | 'tools' | 'followup' | 'today' | 'handoff' | 'embedded' | 'insights' | 'direct';
export const TOOL_ENTRIES: readonly ToolEntry[] = [
  'checkin_result', 'checkin_grid', 'tools', 'followup', 'today', 'handoff', 'embedded', 'insights', 'direct',
];

export type SpineModule = 'mf' | 'dt' | 'er' | 'ie' | 'wmp' | 'core';
export const SPINE_MODULES: readonly SpineModule[] = ['mf', 'dt', 'er', 'ie', 'wmp', 'core'];

/**
 * What a tool asks at its close. regulation_down / orienting ask then-vs-now (dir down / orient);
 * urge asks whether the user acted on it; plan asks when (PR-S5); none asks nothing.
 * `regulation_up` (dir up) is reserved until DT authors its wording.
 */
export type CloseKind = 'regulation_down' | 'orienting' | 'regulation_up' | 'urge' | 'plan' | 'none';
export const CLOSE_KINDS: readonly CloseKind[] = ['regulation_down', 'orienting', 'regulation_up', 'urge', 'plan', 'none'];

export type ActedOnUrge = 'no' | 'partly' | 'yes' | 'not_yet';
export const ACTED_ON_URGE: readonly ActedOnUrge[] = ['no', 'partly', 'yes', 'not_yet'];

export type SessionStatus = 'open' | 'completed' | 'exited_early';
export type CloseStatus = 'completed' | 'exited_early';
export const CLOSE_STATUSES: readonly CloseStatus[] = ['completed', 'exited_early'];

export type DetailKind = 'opposite_action' | 'invalidation_recovery' | 'dear_man' | 'find_the_feeling' | 'meet_a_part' | 'two_pulls';
export const DETAIL_KINDS: readonly DetailKind[] = ['opposite_action', 'invalidation_recovery', 'dear_man', 'find_the_feeling', 'meet_a_part', 'two_pulls'];

export type RepSource = 'standalone' | 'embedded' | 'help_now' | 'followup_offphone';
export const REP_SOURCES: readonly RepSource[] = ['standalone', 'embedded', 'help_now', 'followup_offphone'];

/** Spine tool ids that aren't app tools (embeds and one-shots). */
export const RESERVED_TOOL_IDS = ['help-now', 'micro-step', 'guided-activity'] as const;
export type ReservedToolId = (typeof RESERVED_TOOL_IDS)[number];
