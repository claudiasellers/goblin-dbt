/**
 * Capacity band logic (ER-01, plan A4-1). Pure; the runtime (BandProvider, probe, P2) is A4-2.
 * `band.current()` is client-only (R1): a reading is current for `freshMinutes` (20) and only when
 * its framing is `now`. Nothing here reads the server's log.
 */
import type { Band, CapacityReading, HandoffPrimitive, ThenVsNow, ThenVsNowDir } from '../data/capacityTypes';

/** A reading is current when it answers "right now" and is at most `freshMinutes` old. */
export function isCurrent(r: CapacityReading | null | undefined, now: number, freshMinutes: number): boolean {
  if (!r || r.framing !== 'now') return false;
  const t = Date.parse(r.at);
  if (Number.isNaN(t)) return false;
  return now - t <= freshMinutes * 60_000 && t <= now + 60_000;
}

/** "I can't tell" reads as stirred (D-07). */
export function fromCantTell(): Band {
  return 'stirred';
}

/**
 * A legacy 0–10 score as a band (Phase A: only Recover → DEAR MAN, until WMP-02 moves Recover to bands).
 * n ≥ downshiftAt → flooded; n > askMax → stirred; else steady.
 */
export function bandFromLegacyScore(n: number, g: { downshiftAt: number; askMax: number }): Band {
  if (n >= g.downshiftAt) return 'flooded';
  if (n > g.askMax) return 'stirred';
  return 'steady';
}

/**
 * The hand-off plan (E3 §A4.2.6): two primitives of different modality, never a third.
 * Blank (numb / shut-down pull) and not flooded → orient first; otherwise the sigh first.
 * Flooded + blank still starts with the sigh and follows with orient (never calming alone).
 */
export function planHandoff(
  s: { band: Band; blank: boolean },
  primitives: HandoffPrimitive[],
): HandoffPrimitive[] {
  const usable = primitives
    .filter((p) => p.bands.includes(s.band) && (p.blank === 'any' || (p.blank === 'yes') === s.blank))
    .sort((a, b) => a.rank - b.rank);
  const calm = usable.find((p) => p.direction === 'calm');
  const orient = usable.find((p) => p.direction === 'orient');
  const order = s.blank && s.band !== 'flooded' ? [orient, calm] : [calm, orient];
  return order.filter((p): p is HandoffPrimitive => Boolean(p));
}

/** After the reread: better → resume; otherwise a second, different primitive; after that, offer later. */
export function afterReread(v: ThenVsNow | null, attempt: 1 | 2): 'resume' | 'second' | 'offerLater' {
  if (v === 'better' || v === 'much_better') return 'resume';
  return attempt === 1 ? 'second' : 'offerLater';
}

/** FTF's stored `close` → the canonical then-vs-now pair (R3). */
export function thenVsNowFromFtf(close: string | null | undefined): { thenVsNow: ThenVsNow; thenVsNowDir: ThenVsNowDir } | null {
  const map: Record<string, ThenVsNow> = { louder: 'worse', same: 'same', quieter: 'better', much: 'much_better' };
  const v = close ? map[close] : undefined;
  return v ? { thenVsNow: v, thenVsNowDir: 'down' } : null;
}

/** Compat `ToolUsage.outcome` for Insights (R3, D-03). */
export function legacyOutcome(v: ThenVsNow | null | undefined): 'helped' | 'somewhat' | 'not_really' | null {
  if (v === 'much_better') return 'helped';
  if (v === 'better') return 'somewhat';
  if (v === 'same' || v === 'worse') return 'not_really';
  return null;
}
