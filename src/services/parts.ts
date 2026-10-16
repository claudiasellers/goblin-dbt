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
