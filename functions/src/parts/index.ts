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
import { keepDeps, keepPartHandler } from './keep';
import { validateKeep } from './keepPlan';
import { candidateDeps, queuePartCandidateHandler, validateCandidate } from './candidate';
import type { KeepPartResponse, QueuePartCandidateResponse } from './keepTypes';
import { isTaggedTwice, tagDeps, tagPartHandler, validateTag } from './tag';
import type { TagPartResponse } from './tagTypes';

export { deleteMyParts } from './delete';

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

/** 9b's yes: the part, built from the stored session. The only way a Part is made. */
export const keepPart = callable<unknown, KeepPartResponse>(
  { auth: 'required', label: 'keepPart', errorMessage: 'Could not keep it' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateKeep(data), 'Invalid request');
    return writeTx((tx) => keepPartHandler(input, keepDeps(tx, uid as string)));
  },
);

/** A part to get to know another time, on a yes. Idempotent per id. */
export const queuePartCandidate = callable<unknown, QueuePartCandidateResponse>(
  { auth: 'required', label: 'queuePartCandidate', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const input = parseOrInvalid(() => validateCandidate(data), 'Invalid request');
    return writeTx((tx) => queuePartCandidateHandler(input, candidateDeps(tx, uid as string, request.auth?.token?.email ?? null)));
  },
);

/**
 * "Was this a part you know?": one tag per ToolSession, after a better or much better close. A tag
 * that lost a race for the same session (the taggedKey constraint) reads again and returns the first.
 */
export const tagPart = callable<unknown, TagPartResponse>(
  { auth: 'required', label: 'tagPart', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const input = parseOrInvalid(() => validateTag(data), 'Invalid request');
    const run = () => writeTx((tx) => tagPartHandler(input, tagDeps(tx, uid as string, request.auth?.token?.email ?? null)));
    try {
      return await run();
    } catch (e) {
      if (!isTaggedTwice(e)) throw e;
      return run();
    }
  },
);
