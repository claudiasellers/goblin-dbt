/**
 * Every tool the spine records, with its module and what it asks at its close. Pure.
 *
 * The server derives `module` and `closeKind` from here (the client can't mislabel a session).
 * src/lib/spine/close.ts mirrors TOOL_CLOSE_KIND for the UI; tests/spine-validation.test.mjs
 * asserts the two agree and that every interactive tool in ToolPage.tsx is declared, so a Phase B
 * tool can't ship without declaring its close.
 */
import type { CloseKind, SpineModule, ToolEntry } from './types';

export interface SpineTool { module: SpineModule; closeKind: CloseKind }

export const SPINE_TOOLS: Record<string, SpineTool> = {
  'cool-down': { module: 'dt', closeKind: 'regulation_down' },
  'five-senses': { module: 'dt', closeKind: 'orienting' },
  'pause': { module: 'dt', closeKind: 'urge' },
  'urge-surfing': { module: 'dt', closeKind: 'urge' },
  'problem-solve': { module: 'er', closeKind: 'plan' },
  // Cope Ahead (docs/design/cope-ahead.md): screen 1 already asked when, so no close question; its outcome
  // is the cope_ahead_after card.
  'cope-ahead': { module: 'er', closeKind: 'none' },
  // FTF asks its own then-vs-now (stored `close`, mapped at read: R3).
  'find-the-feeling': { module: 'er', closeKind: 'regulation_down' },
  // Check the Facts (docs/design/check-the-facts.md), the first skill on the runtime: "How strong is it now,
  // compared to when you started?", asked before any hand-off leaves.
  'check-the-facts': { module: 'er', closeKind: 'regulation_down' },
  // These ask their own questions inside their flows; the spine adds none (PR-S4 wraps them).
  'opposite-action': { module: 'er', closeKind: 'none' },
  'dear-man': { module: 'ie', closeKind: 'none' },
  'recovering-from-invalidation': { module: 'wmp', closeKind: 'none' },
  // Meet a part (docs/design/parts.md): "Further away … More here". Not in src/data/tools.ts yet.
  'meet-a-part': { module: 'mf', closeKind: 'orienting' },
  // Two pulls (docs/design/parts.md): the same orienting close, never what-helps evidence.
  'two-pulls': { module: 'mf', closeKind: 'orienting' },
  // Wise mind (docs/design/wise-mind.md): "Further away … More here", unless it handed off. A skill:
  // a "More here" after it counts toward what helps (not in NOT_WHAT_HELPS).
  'wise-mind': { module: 'mf', closeKind: 'orienting' },
  // Reserved spine ids (one-shots and embeds).
  'help-now': { module: 'core', closeKind: 'none' },
  'micro-step': { module: 'core', closeKind: 'none' },
  'guided-activity': { module: 'core', closeKind: 'none' },
};

/**
 * Tools whose close is never evidence that something helped: no what_helps pattern offer, no
 * "went well" in Insights, no "did it help?" card in Today, no compat ToolUsage outcome. "More here"
 * after meeting a part (or sitting with two pulls) is not the same claim as "it calmed me" (docs/design/parts.md).
 */
export const NOT_WHAT_HELPS: readonly string[] = ['meet-a-part', 'two-pulls'];

/** Where the reserved ids may be opened from. */
export const RESERVED_ENTRIES: Record<string, readonly ToolEntry[]> = {
  'help-now': ['checkin_grid', 'direct', 'today'],
  'micro-step': ['checkin_result', 'direct'],
  'guided-activity': ['checkin_result', 'direct'],
};

/** then-vs-now direction of a close kind (R3); null when the kind doesn't ask it. */
export function thenVsNowDirFor(k: CloseKind): 'down' | 'orient' | 'up' | null {
  return k === 'regulation_down' ? 'down' : k === 'orienting' ? 'orient' : k === 'regulation_up' ? 'up' : null;
}
