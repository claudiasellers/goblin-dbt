/**
 * Ride it out's wave (DT-05, docs/design/ride-it-out.md), pure: the rules the `urgeWave` and `waveTrace` embeds
 * share. The urge is an object that answers the person's taps (*still here · fading · gone · bigger*); the trace is
 * those taps in order, categorical, never a number the person gave (plan C1 rule 2). Checks run on the deadline clock
 * (R13), so a locked phone or a throttled tab can't stretch the wait between them.
 */

export type WaveSample = 'still_here' | 'fading' | 'gone' | 'bigger';
export type WaveEnd = 'ended_gone' | 'ended_bigger' | 'ended_not_now' | 'ended_left' | 'ended_long';

export const SAMPLES: readonly WaveSample[] = ['still_here', 'fading', 'gone', 'bigger'];

const int = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : dflt;

/** The wait before each soft check, in ms (PRD: every 60–90 s). */
export function checkMs(props: Record<string, unknown>): number {
  return int(props.checkSec, 20, 180, 75) * 1000;
}

/** How many checks one ride takes before it ends on its own (the trace's room: ids ≤ 12 with the end marker). */
export function maxChecks(props: Record<string, unknown>): number {
  return int(props.maxChecks, 1, 10, 10);
}

/** The object's size from 0 (gone) to 1 (as big as it gets), starting high: the person came because it's loud. */
export const START_LEVEL = 0.7;

export function nextLevel(level: number, s: WaveSample): number {
  if (s === 'gone') return 0;
  const step = s === 'bigger' ? 0.15 : s === 'fading' ? -0.18 : 0;
  return Math.min(1, Math.max(0.12, level + step));
}

/** The levels a trace draws, from the start. */
export function levels(trace: readonly string[]): number[] {
  const out = [START_LEVEL];
  for (const s of trace) if ((SAMPLES as readonly string[]).includes(s)) out.push(nextLevel(out[out.length - 1], s as WaveSample));
  return out;
}

/**
 * What a tap does: the ride ends when it's gone, on a second *bigger* in a row (PRD: bigger twice → change the
 * modality) or when the checks run out; otherwise it goes on to the next check.
 */
export function afterTap(trace: readonly WaveSample[], s: WaveSample, max: number): WaveEnd | null {
  const t = [...trace, s];
  if (s === 'gone') return 'ended_gone';
  if (s === 'bigger' && trace[trace.length - 1] === 'bigger') return 'ended_bigger';
  if (t.length >= max) return 'ended_long';
  return null;
}

/** The output a ride reports: the samples in order, then how it ended; the seconds it ran and the checks answered. */
export function rideOutput(trace: readonly WaveSample[], end: WaveEnd, ranMs: number): { ids: string[]; durationSec: number; doneCount: number } {
  return { ids: [...trace.slice(0, 11), end], durationSec: Math.max(0, Math.round(ranMs / 1000)), doneCount: trace.length };
}

/** Did it come down? The close's line: gone, or the last check fading. */
export function cameDown(ids: readonly string[]): boolean {
  const samples = ids.filter((x) => (SAMPLES as readonly string[]).includes(x));
  const last = samples[samples.length - 1];
  return last === 'gone' || last === 'fading';
}

/**
 * The trace as an axis-free path (PRD: "the drawn wave shown as a shape without axes"): a smooth line through the
 * levels across `w`, rising up the `h` box. Pure, so the card and a test draw the same shape.
 */
export function tracePath(ls: readonly number[], w: number, h: number, pad = 8): string {
  const pts = ls.length > 1 ? ls : [ls[0] ?? START_LEVEL, ls[0] ?? START_LEVEL];
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (pts.length - 1);
  const y = (l: number) => h - pad - l * (h - 2 * pad);
  let d = `M ${x(0).toFixed(1)} ${y(pts[0]).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (x(i - 1) + x(i)) / 2;
    d += ` C ${mx.toFixed(1)} ${y(pts[i - 1]).toFixed(1)}, ${mx.toFixed(1)} ${y(pts[i]).toFixed(1)}, ${x(i).toFixed(1)} ${y(pts[i]).toFixed(1)}`;
  }
  return d;
}
