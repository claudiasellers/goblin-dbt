/**
 * "Say something to it" (Parts of me; after Thanks in Meet a part): what the person says to a kept part.
 * Pure, no imports. Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** Own words: at most this many characters, kept as written (never linted). */
export const SAY_OWN_MAX = 140;

/** One message: a chip from the parts content (flow `say`), or their own words. Exactly one of the two. */
export interface SayToPartRequest {
  /** A new client UUID for the message. */
  id: string;
  /** The caller's kept part (active or resting). */
  partId: string;
  chipId?: string | null;
  own?: string | null;
}
/** The message: this one, or the same id already said (nothing written again). */
export interface SayToPartResponse { id: string; created: boolean }

/** The latest thing said to a part, as its card and its story show it. */
export interface PartMessageLine {
  chipId: string | null;
  own: string | null;
  /** ISO time it was said. */
  at: string;
}
