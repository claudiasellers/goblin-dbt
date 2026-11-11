/**
 * People and safety (IE-03 minimal, D4; docs/design/people.md): one place that says what a person's stored safety
 * answer means. Pure, no imports; mirrored in src/lib/personSafety.ts (tests/people.test.mjs keeps the two equal
 * after the header).
 *
 * "Is it safe to bring hard things up with them?" yes, mostly · no · not sure; after *no* / *not sure*: "Is it more
 * that they might hurt or control you, or that it tends to go badly?" (harm · invalidating · unstated). Harm and
 * *rather not say* are the safety route: no plan to confront them, the other-person resources, Ending offered.
 * Invalidating keeps every route open with a heads-up (open question 2 in the PRD, routed to Claudia).
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

/**
 * True when the flow asks the safety question before going on: never asked, too long ago, unreadable, or a debrief
 * since said *I don't feel safe with them* (`safetyRecheckAt` after the last answer; IE-B2).
 */
export function needsSafetyAsk(p: { safe: PersonSafe | null; safeAskedAt: string | null; safetyRecheckAt?: string | null }, now: number): boolean {
  if (!p.safe || !p.safeAskedAt) return true;
  const at = Date.parse(p.safeAskedAt);
  if (!Number.isFinite(at)) return true;
  if (p.safetyRecheckAt) {
    const re = Date.parse(p.safetyRecheckAt);
    if (!Number.isFinite(re) || re >= at) return true;
  }
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
