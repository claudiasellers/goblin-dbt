import { NEUTRAL, type Sound } from './sound';

export interface Layout { cy: number; gap: number; amp: number }

/**
 * Mutable state the canvas reads every frame. The room writes to it from handlers and effects;
 * nothing here re-renders React.
 */
export class InstState {
  target: Sound = { ...NEUTRAL };
  cur: Sound = { ...NEUTRAL };
  /** Settle time constant (s) for the current glide: short for closer/further, long for ambient drift. */
  tau = 0.3;
  layout: Layout = { cy: 0.47, gap: 96, amp: 1 };
  layoutCur: Layout = { cy: 0.47, gap: 96, amp: 1 };
  holding = false;
  holdStart = 0;
  holdEnd = 0;
  /** How long a hold must last to count as a full breath (s). */
  holdSecs = 2.8;
  twitchAt = -10;
  plucks: { t0: number; u: number; s: number }[][] = [[], [], []];

  pluck(i: number, u = 0.5, s = 1) {
    const arr = this.plucks[i]; arr.push({ t0: performance.now() / 1000, u, s });
    if (arr.length > 4) arr.shift();
  }

  twitch() { this.twitchAt = performance.now() / 1000; }
}
