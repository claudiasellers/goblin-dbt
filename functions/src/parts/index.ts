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
import {
  answerPartRevisitHandler, keepDeps, keepPartHandler, partEditDeps, renamePartHandler, restPartHandler,
  restorePartHandler, setAsidePartHandler, setPartTenderHandler,
} from './keep';
import { validatePartRef, validateRename, validateRest, validateRevisit } from './editPlan';
import { validateKeep } from './keepPlan';
import { candidateDeps, queuePartCandidateHandler, validateCandidate } from './candidate';
import type { KeepPartResponse, PartWriteResponse, QueuePartCandidateResponse } from './keepTypes';
import { isTaggedTwice, tagDeps, tagPartHandler, validateTag } from './tag';
import type { TagPartResponse } from './tagTypes';
import {
  answerCheckbackDeps, answerPartCheckbackHandler, scheduleCheckbackDeps, schedulePartCheckbackHandler,
  validateAnswerCheckback, validateScheduleCheckback,
} from './checkback';
import type { AnswerPartCheckbackResponse, SchedulePartCheckbackResponse } from './checkbackTypes';

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

// ---- The part card (Me): each the caller's own part, parts on, one guarded write ----

/** Rename a kept part ('' or null is "Not yet"). */
export const renamePart = callable<unknown, PartWriteResponse>(
  { auth: 'required', label: 'renamePart', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateRename(data), 'Invalid request');
    return writeTx((tx) => renamePartHandler(input, partEditDeps(tx, uid as string)));
  },
);

/** Rest a part, or wake a resting one. */
export const restPart = callable<unknown, PartWriteResponse>(
  { auth: 'required', label: 'restPart', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateRest(data), 'Invalid request');
    return writeTx((tx) => restPartHandler(input, partEditDeps(tx, uid as string)));
  },
);

/** "Not any more": set aside, kept and restorable. */
export const setAsidePart = callable<unknown, PartWriteResponse>(
  { auth: 'required', label: 'setAsidePart', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validatePartRef(data), 'Invalid request');
    return writeTx((tx) => setAsidePartHandler(input, partEditDeps(tx, uid as string)));
  },
);

export const restorePart = callable<unknown, PartWriteResponse>(
  { auth: 'required', label: 'restorePart', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validatePartRef(data), 'Invalid request');
    return writeTx((tx) => restorePartHandler(input, partEditDeps(tx, uid as string)));
  },
);

/** Mark a part tender (no unmark yet). */
export const setPartTender = callable<unknown, PartWriteResponse>(
  { auth: 'required', label: 'setPartTender', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validatePartRef(data), 'Invalid request');
    return writeTx((tx) => setPartTenderHandler(input, partEditDeps(tx, uid as string)));
  },
);

/** The 30-day still-true for a part, logged once per id. */
export const answerPartRevisit = callable<unknown, PartWriteResponse>(
  { auth: 'required', label: 'answerPartRevisit', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateRevisit(data), 'Invalid request');
    return writeTx((tx) => answerPartRevisitHandler(input, partEditDeps(tx, uid as string)));
  },
);

// ---- The next-day check-back (its Today card registers itself in ./checkback) ----

/** On the close's yes: check back with the kept part tomorrow. At most one open per part. */
export const schedulePartCheckback = callable<unknown, SchedulePartCheckbackResponse>(
  { auth: 'required', label: 'schedulePartCheckback', errorMessage: 'Could not schedule that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateScheduleCheckback(data, new Date()), 'Invalid request');
    return writeTx((tx) => schedulePartCheckbackHandler(input, scheduleCheckbackDeps(tx, uid as string)));
  },
);

/** "How's {name} today?": one write; Louder also pauses the part. */
export const answerPartCheckback = callable<unknown, AnswerPartCheckbackResponse>(
  { auth: 'required', label: 'answerPartCheckback', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const input = parseOrInvalid(() => validateAnswerCheckback(data), 'Invalid request');
    return writeTx((tx) => answerPartCheckbackHandler(input, answerCheckbackDeps(tx, uid as string)));
  },
);
