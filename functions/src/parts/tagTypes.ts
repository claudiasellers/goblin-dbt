/**
 * "Was this a part you know?" and DEAR MAN's "who showed up?" (docs/design/parts.md). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/**
 * Where a tag comes from: `close` (the tag row after a better close; the default) or `debrief` (DEAR MAN's
 * debrief, "who showed up?").
 */
export type TagSource = 'close' | 'debrief';
export const TAG_SOURCES: readonly TagSource[] = ['close', 'debrief'];
/** A debrief tag's answer: Yes or A bit (No and Skip write nothing). */
export type TagStrength = 'yes' | 'a_bit';
export const TAG_STRENGTHS: readonly TagStrength[] = ['yes', 'a_bit'];

/** One tap on the tag row after a better close, or a Yes / A bit in DEAR MAN's debrief. */
export interface TagPartRequest {
  /** A new client UUID for the tag. */
  id: string;
  /** The caller's kept part (active or resting). */
  partId: string;
  /** close: the caller's closed ToolSession with a better close. debrief: the caller's DEAR MAN ToolSession, open or closed. */
  toolSessionId: string;
  /** Absent is `close`. */
  source?: TagSource;
  /** debrief only (required there). */
  strength?: TagStrength;
}
/** The tag for that session and source: this one, or the first one if it was already tagged. */
export interface TagPartResponse { id: string; created: boolean }
