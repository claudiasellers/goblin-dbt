/**
 * Trail offers (Phase 4, docs/design/parts.md "Discovery: trails"): the record (record.ts), what answers
 * block (blocked.ts), the gate (gate.ts), Today's card and the daily evaluation (today.ts, which
 * registers itself with Today when this module loads) and the two callables below (answer.ts).
 * Everything ships off: PartsPolicy.offersEnabled false, every TrailRule.enabled false, the copy drafts.
 */
import { callable } from '../../shared/callable';
import { parseOrInvalid } from '../../shared/errors';
import { writeTx } from '../../shared/neo4j';
import './today';
import {
  answerDeps, answerTrailOfferHandler, evidenceDeps, getTrailOfferEvidenceHandler, validateAnswer, validateEvidenceRequest,
} from './answer';
import type { AnswerTrailOfferResponse, GetTrailOfferEvidenceResponse } from './types';

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
