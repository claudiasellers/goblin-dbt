/**
 * The app-wide offer budget (docs/design/parts.md, "When an offer may appear": at most one offer a week,
 * shared with what_helps). One number and one test for both kinds of offer: a `PatternOffer` (what_helps,
 * patternOffers.ts) and a `TrailOffer` (parts trails, functions/src/parts/offers/) each count against the
 * other. Pure, no imports, so the parts offer gate can use it without loading the profile callables;
 * patternOffers.ts re-exports both.
 */

const DAY = 86_400_000;

/** App-wide: at most one new offer a week. */
export const OFFER_EVERY_DAYS = 7;

/**
 * True when an offer of either kind was made in the last OFFER_EVERY_DAYS (strictly inside the window:
 * one made exactly a week ago no longer counts). `offeredAt` are ISO timestamps; unparseable ones are ignored.
 */
export function offerBudgetSpent(offeredAt: readonly (string | null | undefined)[], now: number): boolean {
  return offeredAt.some((at) => {
    const t = at ? Date.parse(at) : Number.NaN;
    return Number.isFinite(t) && t > now - OFFER_EVERY_DAYS * DAY;
  });
}

/**
 * When an offer last spent the budget, as Cypher over the offer variable `v`: the later of when it was
 * offered and when it was answered. A trail offer answered *Not now* stays open and comes back on Today
 * after its cooldown without a new `offeredAt`; counting it from its answer keeps that return to the week's
 * one offer (otherwise a new offer could follow it the next day). Offers never offered (rule D's Reflect
 * batch) don't count: callers keep `offeredAt IS NOT NULL`.
 */
export const offerBudgetAt = (v: string): string =>
  `CASE WHEN ${v}.answeredAt IS NOT NULL AND ${v}.answeredAt > ${v}.offeredAt THEN ${v}.answeredAt ELSE ${v}.offeredAt END`;
