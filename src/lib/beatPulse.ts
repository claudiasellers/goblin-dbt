/**
 * The beat (MF-10 Join in, docs/design/join-in.md): a steady pulse to move, hum or tap along to for a set time. Pure:
 * the beatPulse embed (src/components/skillPlayer/BeatPulse.tsx) and its tests read it. The tempo and the length come
 * from the skill (a blank frame's quicker short rounds, a stirred reading's moderate minute); taps along are a measure,
 * never shown or counted on screen.
 */

export type BeatOutcome = 'done' | 'partly' | 'skipped';

function int(v: unknown, min: number, max: number, dflt: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : dflt;
}

/** Beats per minute, clamped to an easy-to-follow range. */
export function beatBpm(props: Record<string, unknown>): number {
  return int(props.bpm, 60, 140, 100);
}

/** One beat, in milliseconds. */
export function beatIntervalMs(bpm: number): number {
  return Math.round(60000 / Math.min(140, Math.max(60, bpm)));
}

/** The round's length, in milliseconds. */
export function beatMs(props: Record<string, unknown>): number {
  return int(props.seconds, 15, 180, 60) * 1000;
}

/** The outcome: the whole round is `done`, any of it `partly`, never started `skipped`. */
export function beatOutcome(started: boolean, fraction: number): BeatOutcome {
  if (!started) return 'skipped';
  return fraction >= 1 ? 'done' : 'partly';
}

/** What the embed reports: the outcome, the seconds it ran and how many taps along (a measure, never shown). */
export function beatOutput(started: boolean, fraction: number, ranMs: number, taps: number): { ids: [BeatOutcome]; durationSec: number; doneCount: number } {
  return { ids: [beatOutcome(started, fraction)], durationSec: Math.max(0, Math.round(ranMs / 1000)), doneCount: Math.max(0, Math.floor(taps)) };
}
