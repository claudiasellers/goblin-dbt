/**
 * Trail offers (docs/design/parts.md, "Discovery: trails" → "When an offer may appear", "The offer card").
 * Pure, no imports. The requests and responses are mirrored in src/data/partsTypes.ts
 * (tests/trail-offers.test.mjs asserts the text appears there).
 */

/**
 * One trail the evaluator found: the same fields as functions/src/parts/trails/'s `TrailCandidate`
 * (lane 1, `trails-engine`), mirrored structurally so nothing here imports that file before it lands.
 * A `TrailCandidate` is assignable to this (`share` / `lift` are widened to take its `null`).
 */
export interface OfferableTrail {
  ruleId: string;
  shape: TrailShape;
  /** A: [m]; B: [first, then]; C: [a, b] (the pair's order); D: the part's matching moves. */
  moveIds: string[];
  /** A TrailContext id (A, C). */
  contextId: string | null;
  /** C. */
  pairId: string | null;
  /** D. */
  partId: string | null;
  /** One row per episode: ids and keys only, never text. */
  evidence: TrailEvidence[];
  strength: { episodes: number; spanDays: number; tools: number; share?: number | null; lift?: number | null };
}

export type TrailShape = 'A' | 'B' | 'C' | 'D';
export const TRAIL_SHAPES: readonly TrailShape[] = ['A', 'B', 'C', 'D'];
/**
 * The shapes Today offers. Rule D ("Was this {name}?") is never a push: it is shown in Reflect and answered
 * in a batch (parts.md's rules table), so the Today prepare step and source leave it out.
 */
export const TODAY_SHAPES: readonly TrailShape[] = ['A', 'B', 'C'];

export interface TrailEvidence { at: string; toolIds: string[]; recordKeys: string[]; moveIds: string[]; contextIds: string[] }

/** offered (written, on Today) → seen (the evidence step opened) → answered (any answer but Not now). */
export type TrailOfferStatus = 'offered' | 'seen' | 'answered';

/**
 * The five answers. The card's *No* is `not_me`; *Not now* (card or evidence step) cools the offer down
 * and leaves it open, as `answerPatternOffer`'s does; the rest are final.
 */
export type TrailOfferAnswer = 'not_now' | 'not_me' | 'yes' | 'more_than_one' | 'how_it_goes';
export const TRAIL_OFFER_ANSWERS: readonly TrailOfferAnswer[] = ['not_now', 'not_me', 'yes', 'more_than_one', 'how_it_goes'];
/** The answers that close an offer for good (status `answered`). */
export const FINAL_TRAIL_ANSWERS: readonly TrailOfferAnswer[] = ['not_me', 'yes', 'more_than_one', 'how_it_goes'];

/** "More than one" keeps at most this many moves (a Today offer has at most two). */
export const SPLIT_MAX = 4;

/** A PartCandidate written by "More than one" (server only: queuePartCandidate never takes it). */
export const TRAIL_CANDIDATE_ORIGIN = 'trail';

/** What the evaluator must skip (lane 1's `ctx.blocked`): rule + sorted moves + context (+ part). */
export interface BlockedTrail {
  ruleId: string;
  moveIds: string[];
  contextId: string | null;
  partId: string | null;
  /** null: blocked for good (or while the offer is still open). ISO: blocked until then. */
  until: string | null;
}

// ---- Callables ----

/** "Show me": the evidence, and the offer marked seen. */
export interface GetTrailOfferEvidenceRequest { offerId: string }
export interface TrailOfferEvidenceRow {
  /** The episode's first record (ISO); the client shows the date in the locale. */
  at: string;
  /** App tool ids (src/data/tools.ts names them; unknown ids are dropped). */
  toolIds: string[];
  /** The episode's context, as its signed-off TrailContext phrase; null when none ships. */
  context: string | null;
  /** The graph labels of the picks behind it (an ActionUrge's or FeelingUrge's label); never the person's words. */
  sources: string[];
}
export interface GetTrailOfferEvidenceResponse {
  offerId: string;
  shape: TrailShape;
  /** The offer's moves in the statement's order (the split's chips). */
  moveIds: string[];
  rows: TrailOfferEvidenceRow[];
}

export interface AnswerTrailOfferRequest {
  offerId: string;
  answer: TrailOfferAnswer;
  /** more_than_one only: the moves that feel like their own thing (each one of the offer's). */
  split?: string[];
  /** more_than_one only: a new client UUID per kept move, in `split`'s order (the candidates' ids). */
  candidateIds?: string[];
}
export interface AnswerTrailOfferResponse {
  offerId: string;
  status: TrailOfferStatus;
  answer: TrailOfferAnswer;
  /**
   * What the client does next: `meet` opens Meet a part on this offer (`trailheadKind: 'offer'`);
   * `candidates` wrote the split's PartCandidates; `none` otherwise.
   */
  next: 'meet' | 'candidates' | 'none';
  /** The moves Meet a part opens on (yes). */
  moveIds?: string[];
  /** more_than_one: the candidates' ids. */
  candidateIds?: string[];
}
