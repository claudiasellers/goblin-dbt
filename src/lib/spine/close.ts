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
  'pause': { module: 'dt', closeKind: 'urge' },
  'urge-surfing': { module: 'dt', closeKind: 'urge' },
  'problem-solve': { module: 'er', closeKind: 'plan' },
  'cope-ahead': { module: 'er', closeKind: 'none' },
  'find-the-feeling': { module: 'er', closeKind: 'regulation_down' },
  'opposite-action': { module: 'er', closeKind: 'none' },
  'dear-man': { module: 'ie', closeKind: 'none' },
  'recovering-from-invalidation': { module: 'wmp', closeKind: 'none' },
  'meet-a-part': { module: 'mf', closeKind: 'orienting' },
  'two-pulls': { module: 'mf', closeKind: 'orienting' },
  'wise-mind': { module: 'mf', closeKind: 'orienting' },
  'help-now': { module: 'core', closeKind: 'none' },
  'micro-step': { module: 'core', closeKind: 'none' },
  'guided-activity': { module: 'core', closeKind: 'none' },
};

export function closeKindFor(toolId: string): CloseKind {
  return TOOL_CLOSE_KIND[toolId]?.closeKind ?? 'none';
}

/** then-vs-now direction of a close kind (R3). */
export function dirFor(kind: CloseKind): ThenVsNowDir | null {
  return kind === 'regulation_down' ? 'down' : kind === 'orienting' ? 'orient' : kind === 'regulation_up' ? 'up' : null;
}

/** Whether the close question has something to ask (plan's when-chips arrive with follow-ups). */
export function asksAtClose(kind: CloseKind): boolean {
  return kind === 'regulation_down' || kind === 'orienting' || kind === 'urge';
}

/** Whole seconds between two instants (for durationSec; never negative, capped at a day). */
export function durationSec(from: number, to: number): number {
  return Math.max(0, Math.min(86_400, Math.round((to - from) / 1000)));
}

/** The close question for a tool: its kind's copy, or the tool's own wording of it (byTool). */
export function closeQuestion(content: SpineContent['closeFlow'], toolId: string, kind: CloseKind): CloseQuestion | null {
  if (!asksAtClose(kind)) return null;
  const k = kind as 'regulation_down' | 'orienting' | 'urge';
  return content.byTool[toolId]?.[k] ?? content.kinds[k] ?? null;
}
