/**
 * Parts (docs/design/parts.md). Phase 2's server: the entry gate every parts flow opens with, and
 * Meet a part's session record. Off by default (the `partsEnabled` setting); the client calls these
 * only with parts on, and the writers refuse otherwise.
 */
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { getPartsEntryHandler } from './handler';
import { graphDeps } from './queries';
import type { PartsEntry } from './types';
import { savePartSessionHandler, startPartSessionHandler } from './sessions';
import { validateStartPartSession } from './validation';
import { sessionDeps } from './sessionQueries';
import type { PartSessionResponse } from './sessionTypes';

/** What a parts flow opens on: P2 first, the far-away heads-up, or clear. Never a lock. */
export const getPartsEntry = callable<unknown, PartsEntry>(
  { auth: 'required', label: 'getPartsEntry' },
  async ({ uid }) => getPartsEntryHandler(graphDeps(uid as string)),
);

/** Open Meet a part's record for this visit (idempotent while open). Parts must be on. */
export const startPartSession = callable<unknown, PartSessionResponse>(
  { auth: 'required', label: 'startPartSession', errorMessage: 'Could not start' },
  async ({ uid, data, request }) => {
    const s = parseOrInvalid(() => validateStartPartSession(data), 'Invalid session');
    return writeTx((tx) => startPartSessionHandler(s, sessionDeps(tx, uid as string, request.auth?.token?.email ?? null)));
  },
);

/** Merge what the visit has so far; `final` saves it, and nothing changes it after that. */
export const savePartSession = callable<unknown, PartSessionResponse>(
  { auth: 'required', label: 'savePartSession', errorMessage: 'Could not save' },
  async ({ uid, data, request }) =>
    writeTx((tx) => savePartSessionHandler(data, sessionDeps(tx, uid as string, request.auth?.token?.email ?? null))),
);
