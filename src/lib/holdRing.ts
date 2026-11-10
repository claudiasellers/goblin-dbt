/**
 * holdRing's pure rules (docs/design/dbt-modules-plan.md C3b; DT PRD "Rhythm and tempo" and DT-02 S). The
 * embed (src/components/skillPlayer/HoldRingEmbed.tsx) renders; this decides.
 *
 * Variants: `press` (press and hold; letting go early keeps the seconds held), `timed` (tap to start a
 * hands-free fill on the deadline clock; tap again to stop), `settle` (a few short holds, each counted once a
 * quarter of it is held, as Cope Ahead's three long breaths out).
 */
export type HoldVariant = 'press' | 'timed' | 'settle';
export const HOLD_VARIANTS: readonly HoldVariant[] = ['press', 'timed', 'settle'];

/** The ids the embed answers with (EMBED_OUTPUTS.holdRing.ids). */
export type HoldOutcome = 'held' | 'partly' | 'skipped';

/** The pulse: 1 Hz, each beat 8% slower than the last, never more than 45% slower (FTF's ambient descent). */
export const PULSE = { baseMs: 1000, perBeat: 0.08, maxSlow: 0.45 } as const;
export function pulseMs(beat: number): number {
  return Math.round(PULSE.baseMs * Math.min(1 + PULSE.maxSlow, (1 + PULSE.perBeat) ** Math.max(0, beat)));
}

/** A settle hold counts once this much of it is held: nothing is a miss once it's begun. */
export const SETTLE_COUNTS_FROM = 0.25;

export interface HoldPlan {
  variant: HoldVariant;
  /** The first hold, in seconds. */
  seconds: number;
  /** How many holds make it done. */
  holds: number;
  /** Each completed hold makes the next this much longer, in percent (150 = ×1.5; DT-02's 90 s → 2:15 → 3:20). */
  growthPct: number;
  /** No hold is longer than this. */
  maxSeconds: number;
}

const int = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : dflt;

/** The plan from the step's props (build.py has checked them; anything off falls back, never throws). */
export function holdPlan(props: Record<string, unknown>): HoldPlan {
  const variant = HOLD_VARIANTS.includes(props.variant as HoldVariant) ? (props.variant as HoldVariant) : 'press';
  const maxSeconds = int(props.maxSeconds, 1, 900, 900);
  return {
    variant,
    seconds: Math.min(maxSeconds, int(props.seconds, 1, 900, variant === 'settle' ? 4 : 30)),
    holds: int(props.holds, 1, 10, variant === 'settle' ? 3 : 1),
    growthPct: int(props.growthPct, 100, 300, 100),
    maxSeconds,
  };
}

/** The length of the hold after `done` completed ones, in ms. */
export function holdMs(plan: HoldPlan, done: number): number {
  return Math.round(Math.min(plan.maxSeconds, plan.seconds * (plan.growthPct / 100) ** Math.max(0, done)) * 1000);
}

/** What a release at `reached` (0–1) of the current hold counts as. */
export function release(plan: HoldPlan, reached: number): 'done' | 'early' | 'none' {
  if (reached >= 1) return 'done';
  if (plan.variant === 'settle' && reached >= SETTLE_COUNTS_FROM) return 'done';
  return reached > 0 ? 'early' : 'none';
}

export interface HoldTally { doneCount: number; earlyCount: number; heldMs: number }
export const EMPTY_TALLY: HoldTally = { doneCount: 0, earlyCount: 0, heldMs: 0 };

/** The tally after a hold ends at `reached` of its length (a completed hold counts its whole length). */
export function tally(plan: HoldPlan, t: HoldTally, reached: number): HoldTally {
  const r = release(plan, reached);
  const ms = holdMs(plan, t.doneCount) * Math.min(1, Math.max(0, reached));
  if (r === 'none') return t;
  return {
    doneCount: t.doneCount + (r === 'done' ? 1 : 0),
    earlyCount: t.earlyCount + (r === 'early' ? 1 : 0),
    heldMs: t.heldMs + Math.round(ms),
  };
}

export function finished(plan: HoldPlan, t: HoldTally): boolean {
  return t.doneCount >= plan.holds;
}

/** The embed's output: every hold done is `held`; any time held is `partly`; none is `skipped`. */
export function holdOutput(plan: HoldPlan, t: HoldTally): { ids: [HoldOutcome]; durationSec: number; doneCount: number; earlyCount: number } {
  const id: HoldOutcome = finished(plan, t) ? 'held' : t.heldMs > 0 || t.doneCount > 0 ? 'partly' : 'skipped';
  return { ids: [id], durationSec: Math.round(t.heldMs / 1000), doneCount: t.doneCount, earlyCount: t.earlyCount };
}
