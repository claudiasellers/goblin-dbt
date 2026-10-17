/**
 * The part safety flag's client twin: the same rule as functions/src/safety/partSafetyFlag.ts (the
 * seam; tests/part-safety.test.mjs checks they agree). The server sends the decision as `safety` on the
 * part (the parts slice, Me's part item, the check-back's part), so screens read that boolean; this twin
 * is for content-only checks (src/data/content/parts.json: `moves[].safetyLine`, `options[].flag`). Pure.
 */
import type { PartsContent } from '../data/partsContentTypes';

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

/** The seam over the shipped parts content (approved rows only; the server's read sees drafts too). */
export function partSafetyFromContent(part: PartSafetyInput, content: Pick<PartsContent, 'moves' | 'options'>): boolean {
  const options = Object.values(content.options).flatMap((steps) => Object.values(steps).flat());
  return partSafetyFlag(part, { moves: content.moves, fears: options });
}
