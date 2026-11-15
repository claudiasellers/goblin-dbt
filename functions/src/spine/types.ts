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
/**
 * `urge_change` (plan R7): the two-part close, *Did you act on it?* (`actedOnUrge`) then then-vs-now (down).
 * Today's card, if the close was skipped, asks the urge part only.
 */
export type CloseKind = 'regulation_down' | 'orienting' | 'regulation_up' | 'urge' | 'urge_change' | 'plan' | 'none';
export const CLOSE_KINDS: readonly CloseKind[] = ['regulation_down', 'orienting', 'regulation_up', 'urge', 'urge_change', 'plan', 'none'];
/** The kinds that ask "Did you act on the urge?". */
export const URGE_KINDS: readonly CloseKind[] = ['urge', 'urge_change'];

export type ActedOnUrge = 'no' | 'partly' | 'yes' | 'not_yet';
export const ACTED_ON_URGE: readonly ActedOnUrge[] = ['no', 'partly', 'yes', 'not_yet'];

export type SessionStatus = 'open' | 'completed' | 'exited_early';
export type CloseStatus = 'completed' | 'exited_early';
export const CLOSE_STATUSES: readonly CloseStatus[] = ['completed', 'exited_early'];

export type DetailKind = 'opposite_action' | 'invalidation_recovery' | 'dear_man' | 'find_the_feeling' | 'meet_a_part' | 'two_pulls';
export const DETAIL_KINDS: readonly DetailKind[] = ['opposite_action', 'invalidation_recovery', 'dear_man', 'find_the_feeling', 'meet_a_part', 'two_pulls'];

/** `catch`: a judgment caught off the app, one tap on the Practice home (MF-02's catch-one, H5a's clicker). */
export type RepSource = 'standalone' | 'embedded' | 'help_now' | 'followup_offphone' | 'catch';
export const REP_SOURCES: readonly RepSource[] = ['standalone', 'embedded', 'help_now', 'followup_offphone', 'catch'];

/** Spine tool ids that aren't app tools (embeds and one-shots). */
export const RESERVED_TOOL_IDS = ['help-now', 'micro-step', 'guided-activity', 'practice'] as const;
export type ReservedToolId = (typeof RESERVED_TOOL_IDS)[number];
