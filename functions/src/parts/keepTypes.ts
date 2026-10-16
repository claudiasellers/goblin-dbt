/**
 * Keeping a part and queueing a candidate (docs/design/parts.md, "Data model → User data"). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** 9b's yes. Only ids and the name: the part itself is built from the stored session. */
export interface KeepPartRequest {
  sessionId: string;
  /** A new client UUID for a new part; the visited part's id on a revisit. */
  partId: string;
  /** Up to PartsPolicy.nameMaxChars (40); null or absent is "Not yet" (a revisit keeps the old name). */
  name?: string | null;
}
export interface KeepPartResponse { partId: string; created: boolean }

/** Where a candidate came from. */
export type CandidateOrigin = 'new_one' | 'worried_part' | 'split' | 'ps_ambivalence' | 'angry_card';
export const CANDIDATE_ORIGINS: readonly CandidateOrigin[] = ['new_one', 'worried_part', 'split', 'ps_ambivalence', 'angry_card'];

/** Written only on a yes. */
export interface QueuePartCandidateRequest {
  id: string;
  origin: CandidateOrigin;
  /** ProtectiveMove ids (at most 4), every one of which must exist. */
  moveIds: string[];
  /** The Meet a part visit it came from, when there is one. */
  sessionId?: string;
  /**
   * The caller's own closed ToolSession it came from ("A new one" on the tag row). The server adds the
   * moves that session's urge / pull ids express (approved EXPRESSES edges) to `moveIds`, up to 4.
   */
  toolSessionId?: string;
}
export interface QueuePartCandidateResponse { id: string }
