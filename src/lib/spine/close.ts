/**
 * What each tool asks at its close, for the UI (PR-S3). Mirrors functions/src/spine/tools.ts;
 * tests/spine-validation.test.mjs asserts they agree and that every interactive tool in
 * src/pages/ToolPage.tsx is declared.
 */
import type { CloseKind, SpineModule } from '../../data/spineTypes';
import type { ThenVsNowDir } from '../../data/capacityTypes';
import type { CloseQuestion, SpineContent } from '../../services/spine';

export const TOOL_CLOSE_KIND: Record<string, { module: SpineModule; closeKind: CloseKind }> = {
  'cool-down': { module: 'dt', closeKind: 'regulation_down' },
  'five-senses': { module: 'dt', closeKind: 'orienting' },
  'pause': { module: 'dt', closeKind: 'urge_change' },
  'urge-surfing': { module: 'dt', closeKind: 'urge_change' },
  'let-it-be': { module: 'dt', closeKind: 'regulation_down' },
  'mind-job': { module: 'dt', closeKind: 'regulation_down' },
  'soothe': { module: 'dt', closeKind: 'regulation_down' },
  'thoughts-passing': { module: 'dt', closeKind: 'regulation_down' },
  'pros-cons': { module: 'dt', closeKind: 'none' },
  'habit-plan': { module: 'dt', closeKind: 'none' },
  // My crisis kit (DT-03, docs/design/crisis-kit.md): opening it asks how it is now in the flow, once, after the cards
  // (askFresh thenVsNow, no SessionClose after it); making it ends with no close.
  'crisis-kit': { module: 'dt', closeKind: 'regulation_down' },
  'alternate-rebellion': { module: 'dt', closeKind: 'urge_change' },
  'problem-solve': { module: 'er', closeKind: 'plan' },
  'cope-ahead': { module: 'er', closeKind: 'none' },
  'find-the-feeling': { module: 'er', closeKind: 'regulation_down' },
  'check-the-facts': { module: 'er', closeKind: 'regulation_down' },
  'er-troubleshoot': { module: 'er', closeKind: 'none' },
  'nightmare-rescript': { module: 'er', closeKind: 'none' },
  'please-skill': { module: 'er', closeKind: 'none' },
  'sleep-reset': { module: 'er', closeKind: 'none' },
  'good-things': { module: 'er', closeKind: 'none' },
  'values-clarification': { module: 'er', closeKind: 'none' },
  'build-mastery': { module: 'er', closeKind: 'none' },
  'finding-connection': { module: 'ie', closeKind: 'none' },
  'mindfulness-of-others': { module: 'ie', closeKind: 'none' },
  'rehearse': { module: 'ie', closeKind: 'regulation_down' },
  'emotion-guide': { module: 'er', closeKind: 'none' },
  'mindfulness-emotions': { module: 'er', closeKind: 'regulation_down' },
  'opposite-action': { module: 'er', closeKind: 'regulation_down' },
  'dear-man': { module: 'ie', closeKind: 'none' },
  'fast': { module: 'ie', closeKind: 'regulation_down' },
  'ending-relationships': { module: 'ie', closeKind: 'none' },
  'say-no': { module: 'ie', closeKind: 'none' },
  'give': { module: 'ie', closeKind: 'none' },
  'recovering-from-invalidation': { module: 'wmp', closeKind: 'none' },
  'meet-a-part': { module: 'mf', closeKind: 'orienting' },
  'two-pulls': { module: 'mf', closeKind: 'orienting' },
  'wise-mind': { module: 'mf', closeKind: 'orienting' },
  'notice-and-name': { module: 'mf', closeKind: 'orienting' },
  'unpack-a-judgment': { module: 'mf', closeKind: 'none' },
  'one-thing': { module: 'mf', closeKind: 'regulation_down' },
  'help-now': { module: 'core', closeKind: 'none' },
  'micro-step': { module: 'core', closeKind: 'none' },
  'guided-activity': { module: 'core', closeKind: 'none' },
  'practice': { module: 'mf', closeKind: 'none' },
};

export function closeKindFor(toolId: string): CloseKind {
  return TOOL_CLOSE_KIND[toolId]?.closeKind ?? 'none';
}

/** then-vs-now direction of a close kind (R3). */
export function dirFor(kind: CloseKind): ThenVsNowDir | null {
  return kind === 'regulation_down' || kind === 'urge_change' ? 'down' : kind === 'orienting' ? 'orient' : kind === 'regulation_up' ? 'up' : null;
}

/** Whether the close question has something to ask (plan's when-chips arrive with follow-ups). */
export function asksAtClose(kind: CloseKind): boolean {
  return kind === 'regulation_down' || kind === 'orienting' || kind === 'urge' || kind === 'urge_change';
}

/** Whole seconds between two instants (for durationSec; never negative, capped at a day). */
export function durationSec(from: number, to: number): number {
  return Math.max(0, Math.min(86_400, Math.round((to - from) / 1000)));
}

/** The close question for a tool: its kind's copy, or the tool's own wording of it (byTool). */
export function closeQuestion(content: SpineContent['closeFlow'], toolId: string, kind: CloseKind): CloseQuestion | null {
  if (!asksAtClose(kind)) return null;
  // The two-part close opens with the urge question; its second part is `secondCloseQuestion`.
  const k = (kind === 'urge_change' ? 'urge' : kind) as 'regulation_down' | 'orienting' | 'urge';
  return content.byTool[toolId]?.[k] ?? content.kinds[k] ?? null;
}

/** The second question of a two-part close (`urge_change`, R7): then-vs-now, in the tool's own words if any. */
export function secondCloseQuestion(content: SpineContent['closeFlow'], toolId: string, kind: CloseKind): CloseQuestion | null {
  if (kind !== 'urge_change') return null;
  return content.byTool[toolId]?.regulation_down ?? content.kinds.regulation_down ?? null;
}
