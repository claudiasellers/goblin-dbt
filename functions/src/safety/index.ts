/**
 * The safety route's callables (CORE-01, docs/design/safety-route.md). The check-in's question is decided
 * inside getStateAndTools (./safetyAsk.ts, while SafetyPolicy is on); this module saves the answers.
 */
import { callable } from '../shared/callable';
import { parseOrInvalid } from '../shared/errors';
import { writeTx } from '../shared/neo4j';
import { saveSafetyCheckTx, validateSafetyCheck, type SaveSafetyCheckResponse } from './checkRecord';

/** One visit to the safety route: the answer, then forward-only moves until the exit (finalise-once). */
export const saveSafetyCheck = callable<unknown, SaveSafetyCheckResponse>(
  { auth: 'required', label: 'saveSafetyCheck', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const input = parseOrInvalid(() => validateSafetyCheck(data), 'Invalid request');
    return writeTx((tx) => saveSafetyCheckTx(tx, uid as string, request.auth?.token?.email ?? null, input));
  },
);
