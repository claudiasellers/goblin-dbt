/** Parts callables (docs/design/parts.md). Only ever called with parts on (`partsEnabled`). */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  KeepPartRequest, KeepPartResponse, PartSessionResponse, PartsEntry, QueuePartCandidateRequest, QueuePartCandidateResponse,
  SavePartSessionRequest, StartPartSessionRequest,
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
