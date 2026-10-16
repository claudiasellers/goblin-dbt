/**
 * Router state passed from Recover from a hurtful moment ("Ask them" exit) into DEAR MAN.
 * Everything here was already answered by the user; DEAR MAN skips those questions.
 */
import type { WaitLockCopy } from '../components/tools/regulation/WaitLock';
import type { Band } from './capacityTypes';

export interface DearManHandoff {
  source: 'recovering-from-invalidation';
  /** Graph Emotion id and display name the user picked. */
  emotionId: string;
  emotionName: string;
  /** What they needed (UnmetNeed label), shown as context in the plan. */
  needLabel: string;
  /** Latest 0–10 intensity when they chose to ask. Kept until WMP-02 moves Recover to bands. */
  intensity: number;
  /** A4-4: the same answer as a band (bandFromLegacyScore on Recover's gates). DEAR MAN reads this. */
  band?: Band;
  /** When Recover took that reading (ISO), for the carried reading's freshness. */
  bandAt?: string;
  /** Suggested wait from the recovery flow. DEAR MAN no longer locks the plan; kept for session/analytics compatibility. */
  waitMinutes: number;
  /** True when the pull was to chase: one message only. */
  oneMessageOnly: boolean;
  /** Legacy: wait-lock copy from the recovery flow. Unused by DEAR MAN since the plan lock was removed. */
  waitCopy?: WaitLockCopy;
  /**
   * The ProtectedHurt id picked on Recover's angry-part card. Absent after "Not sure" or "Not now", or
   * when no card showed. DEAR MAN offers its felt phrase as the first "I felt" chip (src/lib/dearManHurt.ts).
   */
  hurtId?: string;
}

/** A graph id (ProtectedHurt ids are snake_case). */
const GRAPH_ID = /^[a-z][a-z0-9_]{0,63}$/;

export function isDearManHandoff(v: unknown): v is DearManHandoff {
  if (!v || typeof v !== 'object') return false;
  const h = v as Record<string, unknown>;
  return h.source === 'recovering-from-invalidation'
    && typeof h.emotionId === 'string' && typeof h.emotionName === 'string'
    && typeof h.needLabel === 'string' && typeof h.intensity === 'number'
    && typeof h.waitMinutes === 'number' && typeof h.oneMessageOnly === 'boolean'
    && (h.band === undefined || h.band === 'steady' || h.band === 'stirred' || h.band === 'flooded')
    && (h.bandAt === undefined || (typeof h.bandAt === 'string' && !Number.isNaN(Date.parse(h.bandAt))))
    && (h.hurtId === undefined || (typeof h.hurtId === 'string' && GRAPH_ID.test(h.hurtId)));
}
