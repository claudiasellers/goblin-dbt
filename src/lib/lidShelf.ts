/**
 * The lid (DT-06, docs/design/mind-job.md; plan C3b `lidShelf`): the rules behind src/components/skillPlayer/LidShelf.tsx,
 * pure. Put it in, hold the lid shut, set it on the shelf. Nothing locks: the way past is there after the first try.
 */

export type Container = 'jar' | 'tin' | 'box';
export type LidOutcome = 'shut' | 'partly' | 'skipped';

/** The picked container (the field's option id); anything else draws a jar. */
export function containerOf(id: string | undefined): Container {
  return id === 'tin' || id === 'box' ? id : 'jar';
}

/** How long the hold takes, in ms (the step's `holdSec`, 1-10 s; 3 s when missing or out of range). */
export function lidHoldMs(props: Record<string, unknown>): number {
  const s = typeof props.holdSec === 'number' && Number.isInteger(props.holdSec) && props.holdSec >= 1 && props.holdSec <= 10 ? props.holdSec : 3;
  return s * 1000;
}

/** How far the lid sits above the rim, in px of the 200-px drawing, for a hold `p` of 0-1 (0 open, 1 shut). */
export function lidLift(p: number): number {
  const v = Math.min(1, Math.max(0, p));
  return Math.round((1 - v) * 36);
}

/**
 * What the embed reports: `shut` when a hold finished, `partly` after a release that got somewhere, `skipped` when the
 * way past came first; the seconds spent holding, whole.
 */
export function lidOutput(shut: boolean, reachedAny: boolean, heldMs: number): { ids: [LidOutcome]; durationSec: number } {
  return { ids: [shut ? 'shut' : reachedAny ? 'partly' : 'skipped'], durationSec: Math.max(0, Math.round(heldMs / 1000)) };
}
