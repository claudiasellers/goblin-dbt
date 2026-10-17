/** Parts callables (docs/design/parts.md). Only ever called with parts on (`partsEnabled`). */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AnswerPartCandidateRequest, AnswerPartCandidateResponse,
  AnswerPartCheckbackRequest, AnswerPartCheckbackResponse, AnswerPartRevisitRequest, KeepPartRequest, KeepPartResponse, PartRefRequest, PartSessionResponse, PartWriteResponse,
  PartsEntry, QueuePartCandidateRequest, QueuePartCandidateResponse, RenamePartRequest, RestPartRequest,
  SavePartSessionRequest, SchedulePartCheckbackRequest, SchedulePartCheckbackResponse, SetPartAnchorRequest, SetPartShapeRequest, StartPartSessionRequest,
  TagPartRequest, TagPartResponse, SayToPartRequest, SayToPartResponse,
  AnswerTrailOfferRequest, AnswerTrailOfferResponse, GetTrailOfferEvidenceRequest, GetTrailOfferEvidenceResponse,
  AnswerKnownPartReviewRequest, AnswerKnownPartReviewResponse, GetReflectTrailsResponse, RemoveTrailPatternRequest, RemoveTrailPatternResponse,
  GetDenResponse, GetPartStoryRequest, GetPartStoryResponse, GetDenSnapshotRequest, GetDenSnapshotResponse, LinkPartsRequest, LinkPartsResponse, UnlinkPartsRequest,
  UnlinkPartsResponse, UpdatePartLayoutRequest, UpdatePartLayoutResponse,
} from '../data/partsTypes';

const getPartsEntryFn = httpsCallable<{ partId?: string }, PartsEntry>(functions, 'getPartsEntry');

/**
 * What a parts flow opens on, from the caller's own recent records: the P2 hand-off first
 * (`band: 'flooded'`, crisis banner alongside when `crisis`), the far-away heads-up, or clear.
 * Never a lock: every outcome lets the person continue. `reasons` are for logging, never shown.
 * `partId` (a visit to one of the person's own parts) adds `paused` when that part is paused.
 */
export async function getPartsEntry(partId?: string | null): Promise<PartsEntry> {
  return (await getPartsEntryFn(partId ? { partId } : {})).data;
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

const tagPartFn = httpsCallable<TagPartRequest, TagPartResponse>(functions, 'tagPart');

/**
 * "Was this a part you know?": one tag per closed ToolSession (better or much better). A second call
 * for the same session returns the first tag. Fire and forget from the row: it never blocks leaving.
 */
export async function tagPart(req: TagPartRequest): Promise<TagPartResponse> {
  return (await tagPartFn(req)).data;
}

const sayToPartFn = httpsCallable<SayToPartRequest, SayToPartResponse>(functions, 'sayToPart');

/** "Say something to it": a chip or their own words, to one of their kept parts. A repeat id writes nothing. */
export async function sayToPart(req: SayToPartRequest): Promise<SayToPartResponse> {
  return (await sayToPartFn(req)).data;
}

// ---- DEAR MAN's cope ahead ----

const setPartAnchorFn = httpsCallable<SetPartAnchorRequest, PartWriteResponse>(functions, 'setPartAnchor');

/** The part's anchor: `lineId` (one of their kept lines) or `own` (their words, 1 to 90 characters), exactly one. */
export async function setPartAnchor(req: SetPartAnchorRequest): Promise<PartWriteResponse> {
  return (await setPartAnchorFn(req)).data;
}

const setPartShapeFn = httpsCallable<SetPartShapeRequest, PartWriteResponse>(functions, 'setPartShape');

/** Find the feeling's "Use this shape for {name}?": the server reads the shape from that visit; none is sent. */
export async function setPartShape(req: SetPartShapeRequest): Promise<PartWriteResponse> {
  return (await setPartShapeFn(req)).data;
}

// ---- Trail offers (Phase 4; the card on Today) ----

const getTrailOfferEvidenceFn = httpsCallable<GetTrailOfferEvidenceRequest, GetTrailOfferEvidenceResponse>(functions, 'getTrailOfferEvidence');
const answerTrailOfferFn = httpsCallable<AnswerTrailOfferRequest, AnswerTrailOfferResponse>(functions, 'answerTrailOffer');

/** "Show me": the offer's evidence as labels (marks it seen). */
export async function getTrailOfferEvidence(req: GetTrailOfferEvidenceRequest): Promise<GetTrailOfferEvidenceResponse> {
  return (await getTrailOfferEvidenceFn(req)).data;
}

/** One of the five answers; `next` says what the card does after it. */
export async function answerTrailOffer(req: AnswerTrailOfferRequest): Promise<AnswerTrailOfferResponse> {
  return (await answerTrailOfferFn(req)).data;
}

// ---- Reflect: rule D's batch and the plain patterns (Phase 4) ----

const getReflectTrailsFn = httpsCallable<Record<string, never>, GetReflectTrailsResponse>(functions, 'getReflectTrails');
const answerKnownPartReviewFn = httpsCallable<AnswerKnownPartReviewRequest, AnswerKnownPartReviewResponse>(functions, 'answerKnownPartReview');
const removeTrailPatternFn = httpsCallable<RemoveTrailPatternRequest, RemoveTrailPatternResponse>(functions, 'removeTrailPattern');

/** Reflect's trails: rule D's blocks (gated on the server) and the trails kept as plain patterns. */
export async function getReflectTrails(): Promise<GetReflectTrailsResponse> {
  return (await getReflectTrailsFn({})).data;
}

/** Rule D's batch for one part: each answered row, then Done or Not now. */
export async function answerKnownPartReview(req: AnswerKnownPartReviewRequest): Promise<AnswerKnownPartReviewResponse> {
  return (await answerKnownPartReviewFn(req)).data;
}

/** A plain pattern's ×. */
export async function removeTrailPattern(req: RemoveTrailPatternRequest): Promise<RemoveTrailPatternResponse> {
  return (await removeTrailPatternFn(req)).data;
}

// ---- The den (Me → Parts of me → See them together) ----

const getDenFn = httpsCallable<Record<string, never>, GetDenResponse>(functions, 'getDen');
const getDenSnapshotFn = httpsCallable<GetDenSnapshotRequest, GetDenSnapshotResponse>(functions, 'getDenSnapshot');
const updatePartLayoutFn = httpsCallable<UpdatePartLayoutRequest, UpdatePartLayoutResponse>(functions, 'updatePartLayout');
const linkPartsFn = httpsCallable<LinkPartsRequest, LinkPartsResponse>(functions, 'linkParts');
const unlinkPartsFn = httpsCallable<UnlinkPartsRequest, UnlinkPartsResponse>(functions, 'unlinkParts');

/** The room: active and resting parts (each with a recency bucket, never a date), confirmed links, snapshots. */
export async function getDen(): Promise<GetDenResponse> {
  return (await getDenFn({})).data;
}

/** One saved layout ("How it looked in {month}"): ids, places, status, tender. */
export async function getDenSnapshot(req: GetDenSnapshotRequest): Promise<GetDenSnapshotResponse> {
  return (await getDenSnapshotFn(req)).data;
}

/** The drop: where the person put each part (0..1). */
export async function updatePartLayout(req: UpdatePartLayoutRequest): Promise<UpdatePartLayoutResponse> {
  return (await updatePartLayoutFn(req)).data;
}

/** On the person's yes: "This one stands in front of that one" (`covers_for`, `aId` in front). */
export async function linkParts(req: LinkPartsRequest): Promise<LinkPartsResponse> {
  return (await linkPartsFn(req)).data;
}

/** A thread's ×. */
export async function unlinkParts(req: UnlinkPartsRequest): Promise<UnlinkPartsResponse> {
  return (await unlinkPartsFn(req)).data;
}

// ---- A part's story ----

const getPartStoryFn = httpsCallable<GetPartStoryRequest, GetPartStoryResponse>(functions, 'getPartStory');

/** One of the caller's own parts, how it has changed: months, ids and the readout's counts, never a date. */
export async function getPartStory(req: GetPartStoryRequest): Promise<GetPartStoryResponse> {
  return (await getPartStoryFn(req)).data;
}
