/**
 * The deadline clock every hold, dose and wait shares (docs/design/dbt-modules-plan.md C3a R13). Pure: the
 * deadline is a timestamp, so a throttled or backgrounded tab can't stretch the count; whatever reads it only
 * asks "how far along is it now?". `useDeadlineTimer` (src/hooks/useDeadlineTimer.ts) runs it in React.
 */
export interface DeadlineClock {
  /** When it started (ms since epoch), or null before it starts. */
  startedAt: number | null;
  durationMs: number;
}

export interface DeadlineReading {
  state: 'idle' | 'running' | 'done';
  elapsedMs: number;
  leftMs: number;
  /** 0 → 1. */
  fraction: number;
  /** Whole seconds left, rounded up (what a countdown shows); 0 when done. */
  secondsLeft: number;
}

export function readDeadline(c: DeadlineClock, now: number): DeadlineReading {
  if (c.startedAt === null || c.durationMs <= 0) {
    return { state: 'idle', elapsedMs: 0, leftMs: Math.max(0, c.durationMs), fraction: 0, secondsLeft: Math.ceil(Math.max(0, c.durationMs) / 1000) };
  }
  const elapsedMs = Math.min(c.durationMs, Math.max(0, now - c.startedAt));
  const leftMs = c.durationMs - elapsedMs;
  return {
    state: leftMs <= 0 ? 'done' : 'running',
    elapsedMs, leftMs, fraction: elapsedMs / c.durationMs, secondsLeft: Math.ceil(leftMs / 1000),
  };
}

/** mm:ss for a countdown label. */
export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
