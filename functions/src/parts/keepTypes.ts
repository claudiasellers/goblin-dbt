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

/** Me's "Not any more" on a candidate (functions/src/parts/candidateAnswer.ts). */
export interface AnswerPartCandidateRequest { candidateId: string; answer: 'dismiss' }
/** `dismissed`, or `accepted` when keepPart got there first (nothing written). */
export interface AnswerPartCandidateResponse { id: string; status: string }

/** Every change to a kept part answers with the new profile version (the client cache key). */
export interface PartWriteResponse { version: number }

/** Rename: up to PartsPolicy.nameMaxChars (40), trimmed; '' or null is "Not yet". Never linted. */
export interface RenamePartRequest { partId: string; name: string | null }
/** true: active → resting; false: resting → active. A set-aside part is restored, not woken. */
export interface RestPartRequest { partId: string; resting: boolean }
/** Set aside, restore, mark tender. */
export interface PartRefRequest { partId: string }

/** The 30-day still-true for a part: an active part's answers, then a resting part's. */
export type PartRevisitAnswer = 'same' | 'less' | 'new' | 'resting' | 'still_quiet' | 'back';
export const ACTIVE_REVISIT_ANSWERS: readonly PartRevisitAnswer[] = ['same', 'less', 'new', 'resting'];
export const RESTING_REVISIT_ANSWERS: readonly PartRevisitAnswer[] = ['still_quiet', 'back'];
/** `new` takes 1 to 3 of the meet flow's `rather` option ids (the part's new job). */
export const RATHER_IDS_MAX = 3;
export interface AnswerPartRevisitRequest {
  /** A client UUID: the logged answer's id, so a repeat call applies nothing twice. */
  id: string;
  partId: string;
  answer: PartRevisitAnswer;
  ratherIds?: string[];
}

/** A job the part did before it took up a new one (`Part.jobHistoryJson`, newest last, at most 10). */
export interface PartJobHistoryEntry { jobIds: string[]; ownJob: string | null; until: string }
export const JOB_HISTORY_MAX = 10;
