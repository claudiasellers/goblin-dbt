/**
 * Router state passed from Recover from a hurtful moment ("Ask them" exit) into DEAR MAN.
 * Everything here was already answered by the user; DEAR MAN skips those questions.
 */
import type { WaitLockCopy } from '../components/tools/regulation/WaitLock';

export interface DearManHandoff {
  source: 'recovering-from-invalidation';
  /** Graph Emotion id and display name the user picked. */
  emotionId: string;
  emotionName: string;
  /** What they needed (UnmetNeed label), shown as context in the plan. */
  needLabel: string;
  /** Latest 0–10 intensity when they chose to ask (always ≤ askMax: asking was unlocked). */
  intensity: number;
  /** Minutes before the plan's message can be copied/sent (graph flow.gates). */
  waitMinutes: number;
  /** True when the pull was to chase: one message only. */
  oneMessageOnly: boolean;
  /** Graph copy for the wait lock, so DEAR MAN can lock the plan even if its own gate content is missing. */
  waitCopy?: WaitLockCopy;
}

export function isDearManHandoff(v: unknown): v is DearManHandoff {
  if (!v || typeof v !== 'object') return false;
  const h = v as Record<string, unknown>;
  return h.source === 'recovering-from-invalidation'
    && typeof h.emotionId === 'string' && typeof h.emotionName === 'string'
    && typeof h.needLabel === 'string' && typeof h.intensity === 'number'
    && typeof h.waitMinutes === 'number' && typeof h.oneMessageOnly === 'boolean';
}
