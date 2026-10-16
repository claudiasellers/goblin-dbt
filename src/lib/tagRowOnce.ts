/**
 * One answer per ToolSession per source (docs/design/parts.md, "Was this a part you know?"): once the
 * person has answered a session's tag row (a part chip, A new one, Skip, the shape question, or the
 * debrief's named form), no surface asks them again for that session and source. Kept in memory for the
 * life of the page only, never in localStorage (the server already refuses a second tag; this stops the
 * second question). A host that draws the row in two places (Find the feeling's next step and its
 * collection) or can show it again (Cool Down's pick, DEAR MAN's Back) reads this.
 */
import type { TagSource } from '../data/partsTypes';

const answered = new Set<string>();

const keyOf = (toolSessionId: string, source: TagSource) => `${source}:${toolSessionId}`;

export function markTagRowAnswered(toolSessionId: string, source: TagSource): void {
  answered.add(keyOf(toolSessionId, source));
}

export function tagRowAnswered(toolSessionId: string | null | undefined, source: TagSource): boolean {
  return !!toolSessionId && answered.has(keyOf(toolSessionId, source));
}

/** Tests only: a fresh page. */
export function resetTagRowAnswers(): void {
  answered.clear();
}
