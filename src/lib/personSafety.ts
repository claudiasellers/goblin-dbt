/**
 * People and safety, client twin of functions/src/safety/personSafety.ts (tests/people.test.mjs keeps everything
 * after this header identical). The server refuses a DEAR MAN plan for someone on the safety route; the picker and
 * DEAR MAN read the same rules here so the screen never offers what the server would refuse.
 */

/** Ask again after this many days (PRD IE-01 step 0; the person can also say *Things changed* any time). */
export const PEOPLE_SAFE_REASK_DAYS = 90;

export type PersonSafe = 'yes' | 'no' | 'unsure';
export type PersonRisk = 'none' | 'invalidating' | 'harm' | 'unstated';
export type PersonRoute = 'ok' | 'heads_up' | 'safety';

/** The route an answer sets. No answer yet is `ok` only for the server: the flows ask before they plan. */
export function personRoute(risk: PersonRisk | null | undefined): PersonRoute {
  if (risk === 'harm' || risk === 'unstated') return 'safety';
  if (risk === 'invalidating') return 'heads_up';
  return 'ok';
}

/** True when the flow asks the safety question before going on: never asked, too long ago, or unreadable. */
export function needsSafetyAsk(p: { safe: PersonSafe | null; safeAskedAt: string | null }, now: number): boolean {
  if (!p.safe || !p.safeAskedAt) return true;
  const at = Date.parse(p.safeAskedAt);
  if (!Number.isFinite(at)) return true;
  return now - at > PEOPLE_SAFE_REASK_DAYS * 86_400_000;
}

/** The stored risk in a Person's valueJson (null when absent or unreadable). */
export function storedRisk(valueJson: unknown): PersonRisk | null {
  try {
    const v = JSON.parse(String(valueJson)) as { risk?: unknown };
    return v.risk === 'none' || v.risk === 'invalidating' || v.risk === 'harm' || v.risk === 'unstated' ? v.risk : null;
  } catch {
    return null;
  }
}
