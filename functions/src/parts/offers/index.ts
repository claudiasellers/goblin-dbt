/**
 * Trail offers (Phase 4, docs/design/parts.md "Discovery: trails"): the record (record.ts), what answers
 * block (blocked.ts), the gate (gate.ts), Today's card and the daily evaluation (today.ts, which
 * registers itself with Today when this module loads), the offer card's two callables (answer.ts) and
 * Reflect's three (review.ts: rule D's batch and the plain patterns).
 * Everything ships off: PartsPolicy.offersEnabled false, every TrailRule.enabled false, the copy drafts.
 */
import { callable } from '../../shared/callable';
import { parseOrInvalid } from '../../shared/errors';
import { readTx, writeTx } from '../../shared/neo4j';
import './today';
import {
  answerDeps, answerTrailOfferHandler, evidenceDeps, getTrailOfferEvidenceHandler, validateAnswer, validateEvidenceRequest,
} from './answer';
import {
  answerKnownPartReviewHandler, getReflectTrailsHandler, knownPartReviewDeps, reflectTrailsDeps, removePatternDeps,
  removeTrailPatternHandler, validateKnownPartReview, validateRemovePattern,
} from './review';
import type {
  AnswerKnownPartReviewResponse, AnswerTrailOfferResponse, GetReflectTrailsResponse, GetTrailOfferEvidenceResponse,
  RemoveTrailPatternResponse,
} from './types';

/** "Show me": the caller's own open offer, marked seen, with its evidence as labels. */
export const getTrailOfferEvidence = callable<unknown, GetTrailOfferEvidenceResponse>(
  { auth: 'required', label: 'getTrailOfferEvidence', errorMessage: 'Could not load that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateEvidenceRequest(data), 'Invalid request');
    return writeTx((tx) => getTrailOfferEvidenceHandler(input, evidenceDeps(tx, uid as string, input.offerId)));
  },
);

/** One of the five answers, on the caller's own open offer. */
export const answerTrailOffer = callable<unknown, AnswerTrailOfferResponse>(
  { auth: 'required', label: 'answerTrailOffer', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const input = parseOrInvalid(() => validateAnswer(data), 'Invalid request');
    return writeTx((tx) => answerTrailOfferHandler(
      input, answerDeps(tx, uid as string, request.auth?.token?.email ?? null, input.offerId),
    ));
  },
);

/** Reflect: rule D's blocks (through the offer gate) and the plain patterns. Parts off: both empty. */
export const getReflectTrails = callable<unknown, GetReflectTrailsResponse>(
  { auth: 'required', label: 'getReflectTrails', errorMessage: 'Could not load that' },
  async ({ uid }) => {
    const now = new Date();
    return readTx((tx) => getReflectTrailsHandler(reflectTrailsDeps(tx, uid as string, now), now));
  },
);

/** Rule D's batch on the caller's own part and records: Yes tags, No keeps out, Done / Not now rests the part. */
export const answerKnownPartReview = callable<unknown, AnswerKnownPartReviewResponse>(
  { auth: 'required', label: 'answerKnownPartReview', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateKnownPartReview(data), 'Invalid request');
    const now = new Date();
    return writeTx((tx) => answerKnownPartReviewHandler(input, knownPartReviewDeps(tx, uid as string, input.id, now), now));
  },
);

/** A plain pattern's ×: the caller's own trail answered *It's how things go*, once. */
export const removeTrailPattern = callable<unknown, RemoveTrailPatternResponse>(
  { auth: 'required', label: 'removeTrailPattern', errorMessage: 'Could not remove that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateRemovePattern(data), 'Invalid request');
    return writeTx((tx) => removeTrailPatternHandler(input, removePatternDeps(tx, uid as string, input.offerId)));
  },
);
