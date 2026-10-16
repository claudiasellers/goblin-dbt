/** Parts callables (docs/design/parts.md). Only ever called with parts on (`partsEnabled`). */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AnswerPartCandidateRequest, AnswerPartCandidateResponse,
  AnswerPartCheckbackRequest, AnswerPartCheckbackResponse, AnswerPartRevisitRequest, KeepPartRequest, KeepPartResponse, PartRefRequest, PartSessionResponse, PartWriteResponse,
  PartsEntry, QueuePartCandidateRequest, QueuePartCandidateResponse, RenamePartRequest, RestPartRequest,
  SavePartSessionRequest, SchedulePartCheckbackRequest, SchedulePartCheckbackResponse, StartPartSessionRequest,
} from '../data/partsTypes';

const getPartsEntryFn = httpsCallable<Record<string, never>, PartsEntry>(functions, 'getPartsEntry');

/**
 * What a parts flow opens on, from the caller's own recent records: the P2 hand-off first
 * (`band: 'flooded'`, crisis banner alongside when `crisis`), the far-away heads-up, or clear.
 * Never a lock: every outcome lets the person continue. `reasons` are for logging, never shown.
 */
export async function getPartsEntry(): Promise<PartsEntry> {
  return (await getPartsEntryFn({})).data;
}

const deleteMyPartsFn = httpsCallable<Record<string, never>, { deleted: Record<string, number> }>(functions, 'deleteMyParts');

/**
 * Delete my parts (Privacy & Data): every parts record the person has kept or made, in one step
 * they confirmed. The one call made with parts off too (turning parts off deletes nothing).
 */
export async function deleteMyParts(): Promise<{ deleted: Record<string, number> }> {
  return (await deleteMyPartsFn({})).data;
}

const startPartSessionFn = httpsCallable<StartPartSessionRequest, PartSessionResponse>(functions, 'startPartSession');
const savePartSessionFn = httpsCallable<SavePartSessionRequest, PartSessionResponse>(functions, 'savePartSession');

/**
 * Open this visit's PartSession (Meet a part). Safe to repeat while it's open. The spine's
 * ToolSession links to it on close with `detail: { kind: 'meet_a_part', id }`.
 */
export async function startPartSession(req: StartPartSessionRequest): Promise<PartSessionResponse> {
  return (await startPartSessionFn(req)).data;
}

/**
 * Merge what the visit has so far; `final: true` saves it for good. `feelTowardIds` and
 * `blendCheck` are ask-fresh: send what was asked in this visit, never a remembered answer.
 */
export async function savePartSession(req: SavePartSessionRequest): Promise<PartSessionResponse> {
  return (await savePartSessionFn(req)).data;
}

const keepPartFn = httpsCallable<KeepPartRequest, KeepPartResponse>(functions, 'keepPart');
const queuePartCandidateFn = httpsCallable<QueuePartCandidateRequest, QueuePartCandidateResponse>(functions, 'queuePartCandidate');

/**
 * 9b's yes ("Keep it, so you can come back to it?"). The server builds the part from this visit's
 * saved session: send only the ids and the name. Safe to repeat.
 */
export async function keepPart(req: KeepPartRequest): Promise<KeepPartResponse> {
  return (await keepPartFn(req)).data;
}

/** Only on a yes ("another time", "spend a minute with it later?"). Safe to repeat with the same id. */
export async function queuePartCandidate(req: QueuePartCandidateRequest): Promise<QueuePartCandidateResponse> {
  return (await queuePartCandidateFn(req)).data;
}

const answerPartCandidateFn = httpsCallable<AnswerPartCandidateRequest, AnswerPartCandidateResponse>(functions, 'answerPartCandidate');

/** Me's "Not any more" on a part waiting to be got to know. Safe to repeat. */
export async function answerPartCandidate(req: AnswerPartCandidateRequest): Promise<AnswerPartCandidateResponse> {
  return (await answerPartCandidateFn(req)).data;
}

// ---- The part card (Me). Each answers with the new profile version (the profile cache key). ----

const renamePartFn = httpsCallable<RenamePartRequest, PartWriteResponse>(functions, 'renamePart');
const restPartFn = httpsCallable<RestPartRequest, PartWriteResponse>(functions, 'restPart');
const setAsidePartFn = httpsCallable<PartRefRequest, PartWriteResponse>(functions, 'setAsidePart');
const restorePartFn = httpsCallable<PartRefRequest, PartWriteResponse>(functions, 'restorePart');
const setPartTenderFn = httpsCallable<PartRefRequest, PartWriteResponse>(functions, 'setPartTender');
const answerPartRevisitFn = httpsCallable<AnswerPartRevisitRequest, PartWriteResponse>(functions, 'answerPartRevisit');

/** A new name, or null / '' for "Not yet". What the person typed is kept as typed (trimmed). */
export async function renamePart(req: RenamePartRequest): Promise<PartWriteResponse> {
  return (await renamePartFn(req)).data;
}

/** `resting: true` rests an active part; `false` wakes a resting one. A set-aside part is restored instead. */
export async function restPart(req: RestPartRequest): Promise<PartWriteResponse> {
  return (await restPartFn(req)).data;
}

/** "Not any more": kept and restorable. */
export async function setAsidePart(req: PartRefRequest): Promise<PartWriteResponse> {
  return (await setAsidePartFn(req)).data;
}

export async function restorePart(req: PartRefRequest): Promise<PartWriteResponse> {
  return (await restorePartFn(req)).data;
}

/** Gentler from now on. There is no unmark yet. */
export async function setPartTender(req: PartRefRequest): Promise<PartWriteResponse> {
  return (await setPartTenderFn(req)).data;
}

/**
 * The 30-day "Is {name} still doing the same job?". `id` is a new client UUID per answer (a repeat
 * with the same id changes nothing); `ratherIds` (1 to 3) only with `new`.
 */
export async function answerPartRevisit(req: AnswerPartRevisitRequest): Promise<PartWriteResponse> {
  return (await answerPartRevisitFn(req)).data;
}

// ---- The next-day check-back ----

const schedulePartCheckbackFn = httpsCallable<SchedulePartCheckbackRequest, SchedulePartCheckbackResponse>(functions, 'schedulePartCheckback');
const answerPartCheckbackFn = httpsCallable<AnswerPartCheckbackRequest, AnswerPartCheckbackResponse>(functions, 'answerPartCheckback');

/**
 * The close's yes ("Check back with it tomorrow?"), for the part this visit kept. `dueAt` is the
 * type's window (tomorrow 10:00 local). Safe to repeat: one open check-back per part.
 */
export async function schedulePartCheckback(req: SchedulePartCheckbackRequest): Promise<SchedulePartCheckbackResponse> {
  return (await schedulePartCheckbackFn(req)).data;
}

/** The Today card's answer. `aftercare` (Louder): show aftercare_louder with the body tools. */
export async function answerPartCheckback(req: AnswerPartCheckbackRequest): Promise<AnswerPartCheckbackResponse> {
  return (await answerPartCheckbackFn(req)).data;
}
