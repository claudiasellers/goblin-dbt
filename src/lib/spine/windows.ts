/**
 * Follow-up due times in the user's local time (PR-S5). Generalises OA's dueAtFor: the window
 * spec comes from FollowUpType content (schema/practice-spine.cypher). Pure.
 *
 *   {kind: 'at_local', days: 1, time: '10:00'}   next day at 10:00 local
 *   {kind: 'next_local', time: '07:00'}          the next 07:00 local: today if it's still ahead, else tomorrow
 *   {kind: 'after', minutes: 60}                  an hour from now
 *   {kind: 'chip', chips: {today: {...}, ...}}    the user picks one
 */
export type WindowSpec =
  | { kind: 'at_local'; days: number; time: string }
  | { kind: 'next_local'; time: string }
  | { kind: 'after'; minutes: number }
  | { kind: 'chip'; chips: Record<string, WindowSpec> }
  | { kind: 'tool' | 'derived' };

/** At least this far ahead: a time that has already passed today becomes "soon", not the past. */
const MIN_AHEAD_MS = 30 * 60_000;

/** The due time for a window (and the chosen chip for `chip` windows); null when it has none. */
export function dueAtFor(spec: WindowSpec | Record<string, unknown> | undefined, now: Date, chip?: string): Date | null {
  const s = spec as WindowSpec | undefined;
  if (!s) return null;
  if (s.kind === 'chip') {
    const inner = chip ? s.chips?.[chip] : undefined;
    return inner ? dueAtFor(inner, now) : null;
  }
  if (s.kind === 'after') return new Date(now.getTime() + Math.max(1, s.minutes) * 60_000);
  if (s.kind === 'next_local') {
    // Sleep reset's morning check: a plan made at 1am means this morning, at 10pm tomorrow morning.
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.time);
    if (!m) return null;
    const d = new Date(now);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (d.getTime() < now.getTime() + MIN_AHEAD_MS) d.setDate(d.getDate() + 1);
    return d;
  }
  if (s.kind === 'at_local') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.time);
    if (!m) return null;
    const d = new Date(now);
    d.setDate(d.getDate() + s.days);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (d.getTime() < now.getTime() + MIN_AHEAD_MS) return new Date(now.getTime() + 60 * 60_000);
    return d;
  }
  return null;
}

/** The chip ids a `chip` window offers, in order. */
export function chipsOf(spec: WindowSpec | Record<string, unknown> | undefined): string[] {
  const s = spec as WindowSpec | undefined;
  return s?.kind === 'chip' && s.chips ? Object.keys(s.chips) : [];
}
