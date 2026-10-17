/**
 * The part safety flag: the single seam that decides whether a kept part shows crisis resources
 * (docs/design/parts.md, *The vocabulary* and *Safety*): a part whose moves include a `safetyLine` move,
 * or that carries a fear flagged `danger`, always shows the app's CrisisBanner **alongside** its normal
 * content, never instead of it, the way checkinSafetyFlag.ts flags a check-in result.
 *
 * Both facts come from content (`ProtectiveMove.safetyLine`, `PartOption.flag`), never a hard-coded id.
 * Review status is not checked: content can only add a banner here, never take one away.
 *
 * The pure twin is mirrored in src/lib/partSafetyFlag.ts (tests/part-safety.test.mjs checks they agree).
 * Server reads use PART_SAFETY_CYPHER, so a tender part's fears (which the client never receives) still
 * flag it, and every consumer gets one boolean (`safety`) instead of the part's fears.
 */

/** What the seam reads from content. */
export interface PartSafetyContent {
  moves: ReadonlyArray<{ id: string; safetyLine?: boolean | null }>;
  fears: ReadonlyArray<{ id: string; flag?: string | null }>;
}

/** The part: the moves it USES and the fear option ids it carries. */
export interface PartSafetyInput {
  moveIds: readonly string[];
  fearIds: readonly string[];
}

export function partSafetyFlag(part: PartSafetyInput, content: PartSafetyContent): boolean {
  const lines = new Set(content.moves.filter((m) => m.safetyLine === true).map((m) => m.id));
  const danger = new Set(content.fears.filter((f) => f.flag === 'danger').map((f) => f.id));
  return part.moveIds.some((m) => lines.has(m)) || part.fearIds.some((f) => danger.has(f));
}

/**
 * The same rule as a Cypher boolean over a bound Part variable (default `p`): it USES a move with
 * `safetyLine`, or one of its `fearIds` is a PartOption flagged `danger`.
 */
export function partSafetyCypher(p = 'p'): string {
  return `(EXISTS { MATCH (${p})-[:USES]->(sm:ProtectiveMove) WHERE sm.safetyLine = true }
      OR EXISTS { MATCH (so:PartOption) WHERE so.flag = 'danger' AND so.id IN coalesce(${p}.fearIds, []) })`;
}
