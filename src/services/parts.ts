/** Parts callables (docs/design/parts.md). Only ever called with parts on (`partsEnabled`). */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { PartsEntry } from '../data/partsTypes';

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
