/**
 * The address that opens Two pulls (pure, no imports, so the den and the trail offer card can link to it
 * without loading the tool): two kept parts, or a pair with the rule C offer it came from.
 */
export type PullsEntry =
  | { kind: 'parts'; aId: string; bId: string }
  | { kind: 'pair'; pairId: string; offerId: string | null };

export function twoPullsPath(e: PullsEntry): string {
  if (e.kind === 'parts') return `/tool/two-pulls?a=${e.aId}&b=${e.bId}`;
  return `/tool/two-pulls?pair=${encodeURIComponent(e.pairId)}${e.offerId ? `&offer=${encodeURIComponent(e.offerId)}` : ''}`;
}

/** A rule C trail ("two pulls") opens Two pulls on More than one instead of asking the split. */
export const opensTwoPulls = (trail: { shape: string } | null | undefined): boolean => trail?.shape === 'C';
