/**
 * First, the body's modes (DT-01, docs/design/first-the-body.md), pure: the rules the body embeds share. The embeds
 * (src/components/skillPlayer/BodyEmbeds.tsx) render; this decides. Every timer runs on the deadline clock
 * (src/lib/timer/deadline.ts, R13), so a locked phone or a throttled tab can't stretch a dose.
 *
 * - `doseTimer`: a hands-free dose with a short lead-in (cold on the face: Circuit Breaker).
 * - `bodyCard`: one body cue held for a while on a ring (wake up, something strong, hand on heart, nothing to do).
 * - `breathPacer`: the long out-breath, in and out at a set pace, with a stop rule (dizzy or tingly).
 * - `squeezeRelease`: squeeze on the in-breath, drop on the out-breath, a few rounds.
 * - `orientFind`: eyes open, today's date and time on screen, find a few things.
 */

/** What each body embed answers with (EMBED_OUTPUTS). */
export type BodyOutcome = 'done' | 'partly' | 'skipped';

const int = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : dflt;

/** A dose's or a card's length in ms, from its props (build.py has checked the range; anything off falls back). */
export function doseMs(props: Record<string, unknown>, dflt = 30): number {
  return int(props.seconds, 5, 300, dflt) * 1000;
}

/** The lead-in before a dose starts, in whole seconds (0: none). */
export function leadInSeconds(props: Record<string, unknown>): number {
  return int(props.leadIn, 0, 5, 0);
}

/** The lead-in's count at `elapsedMs` into it: 3, 2, 1, then null once the dose itself runs. */
export function leadCount(leadIn: number, elapsedMs: number): number | null {
  const left = leadIn - Math.floor(elapsedMs / 1000);
  return left > 0 ? left : null;
}

/** A timed piece's outcome: all of it is `done`, any of it is `partly`, none is `skipped`. */
export function outcome(fraction: number): BodyOutcome {
  if (fraction >= 1) return 'done';
  return fraction > 0 ? 'partly' : 'skipped';
}

/** The output a timed piece reports: its outcome and the seconds it ran. */
export function timedOutput(fraction: number, ranMs: number): { ids: [BodyOutcome]; durationSec: number } {
  return { ids: [outcome(fraction)], durationSec: Math.max(0, Math.round(ranMs / 1000)) };
}

export interface BreathPace { inMs: number; outMs: number }

/** The pace from props: the out-breath always longer than the in-breath (the long exhale is the dose). */
export function breathPace(props: Record<string, unknown>): BreathPace {
  const inS = int(props.inSec, 2, 6, 4);
  const outS = Math.max(inS + 1, int(props.outSec, 3, 10, 6));
  return { inMs: inS * 1000, outMs: outS * 1000 };
}

/** Where the breath is at `elapsedMs`: in or out, and how far through that half (0–1). */
export function breathPhase(p: BreathPace, elapsedMs: number): { phase: 'in' | 'out'; t: number; breaths: number } {
  const cycle = p.inMs + p.outMs;
  const e = Math.max(0, elapsedMs);
  const at = e % cycle;
  const breaths = Math.floor(e / cycle);
  return at < p.inMs ? { phase: 'in', t: at / p.inMs, breaths } : { phase: 'out', t: (at - p.inMs) / p.outMs, breaths };
}

/** How big the breath circle is (0.6 at empty, 1 at full): grows on the in-breath, shrinks on the out-breath. */
export function breathScale(phase: 'in' | 'out', t: number): number {
  const ease = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;
  return 0.6 + 0.4 * (phase === 'in' ? ease(t) : 1 - ease(t));
}

/** squeezeRelease: rounds and the squeeze's length; the drop is the out-breath, longer than the squeeze. */
export function squeezePlan(props: Record<string, unknown>): { rounds: number; squeezeMs: number; dropMs: number } {
  const squeezeMs = int(props.squeezeSec, 3, 8, 5) * 1000;
  return { rounds: int(props.rounds, 1, 5, 3), squeezeMs, dropMs: squeezeMs + 2000 };
}

/** A round counts once the squeeze was held most of the way (a release near the end is not a miss). */
export const SQUEEZE_COUNTS_FROM = 0.6;

/** The output after `done` of `rounds` squeezes, with the seconds squeezed. */
export function squeezeOutput(rounds: number, done: number, squeezedMs: number): { ids: [BodyOutcome]; durationSec: number; doneCount: number } {
  const id: BodyOutcome = done >= rounds ? 'done' : done > 0 || squeezedMs > 0 ? 'partly' : 'skipped';
  return { ids: [id], durationSec: Math.round(squeezedMs / 1000), doneCount: done };
}

/** orientFind: how many to find. */
export function findCount(props: Record<string, unknown>): number {
  return int(props.count, 1, 5, 3);
}

/** The output after `found` of `count`. */
export function findOutput(count: number, found: number): { ids: [BodyOutcome]; doneCount: number } {
  return { ids: [found >= count ? 'done' : found > 0 ? 'partly' : 'skipped'], doneCount: Math.min(found, count) };
}

/** Today, as the orient screen says it: the weekday and date, and the time, in the person's own locale. */
export function nowLines(d: Date, locale?: string): { date: string; time: string } {
  return {
    date: d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
  };
}
