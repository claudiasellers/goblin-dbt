/**
 * Two pulls' callables (docs/design/parts.md, "Two pulls (polarities)"). Every one is a writer and refuses
 * with parts off (`partsOff()`). Its Today card registers itself in ./checkback.
 */
import { callable } from '../../shared/callable';
import { writeTx } from '../../shared/neo4j';
import { parseOrInvalid } from '../../shared/errors';
import { pullsSessionDeps, savePullsSessionHandler, startPullsSessionHandler } from './session';
import { keepPullsKeepsakeHandler, keepsakeDeps } from './keepsake';
import { pullsCheckbackDeps, schedulePullsCheckbackHandler } from './checkback';
import { validateKeepsake, validatePullsCheckback, validateStartPulls } from './validation';
import type { KeepPullsKeepsakeResponse, PullsSessionResponse, SchedulePullsCheckbackResponse } from './types';

/** Open this visit's record (idempotent while open): two kept parts, or a pair. */
export const startPullsSession = callable<unknown, PullsSessionResponse>(
  { auth: 'required', label: 'startPullsSession', errorMessage: 'Could not start' },
  async ({ uid, data, request }) => {
    const s = parseOrInvalid(() => validateStartPulls(data), 'Invalid session');
    return writeTx((tx) => startPullsSessionHandler(s, pullsSessionDeps(tx, uid as string, request.auth?.token?.email ?? null)));
  },
);

/** Merge what the visit has so far; `final` saves it, and nothing changes it after that. */
export const savePullsSession = callable<unknown, PullsSessionResponse>(
  { auth: 'required', label: 'savePullsSession', errorMessage: 'Could not save' },
  async ({ uid, data, request }) =>
    writeTx((tx) => savePullsSessionHandler(data, pullsSessionDeps(tx, uid as string, request.auth?.token?.email ?? null))),
);

/** "Keep this": the keepsake, built from the stored visit, kept in My words. */
export const keepPullsKeepsake = callable<unknown, KeepPullsKeepsakeResponse>(
  { auth: 'required', label: 'keepPullsKeepsake', errorMessage: 'Could not keep it' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateKeepsake(data), 'Invalid request');
    return writeTx((tx) => keepPullsKeepsakeHandler(input, keepsakeDeps(tx, uid as string)));
  },
);

/** On the close's yes: check back with both kept parts in a week. One per visit. */
export const schedulePullsCheckback = callable<unknown, SchedulePullsCheckbackResponse>(
  { auth: 'required', label: 'schedulePullsCheckback', errorMessage: 'Could not schedule that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validatePullsCheckback(data, new Date()), 'Invalid request');
    return writeTx((tx) => schedulePullsCheckbackHandler(input, pullsCheckbackDeps(tx, uid as string)));
  },
);
