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

