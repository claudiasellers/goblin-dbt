/** Parts callables (docs/design/parts.md). Only ever called with parts on (`partsEnabled`). */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { PartSessionResponse, PartsEntry, SavePartSessionRequest, StartPartSessionRequest } from '../data/partsTypes';

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
