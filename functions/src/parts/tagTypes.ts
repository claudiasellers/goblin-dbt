/**
 * "Was this a part you know?" (docs/design/parts.md, "the stronger signal"). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** One tap on the tag row after a better or much better close. */
export interface TagPartRequest {
  /** A new client UUID for the tag. */
  id: string;
  /** The caller's kept part (active or resting). */
  partId: string;
  /** The caller's closed ToolSession whose close was better or much better. */
  toolSessionId: string;
}
/** The tag for that session: this one, or the first one if the session was already tagged. */
export interface TagPartResponse { id: string; created: boolean }
