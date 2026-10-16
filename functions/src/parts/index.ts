/**
 * Parts (docs/design/parts.md). Phase 2's server foundation: the entry gate every parts flow opens
 * with. Off by default (the `partsEnabled` setting); the client asks only with parts on.
 */
import { callable } from '../shared/callable';
import { getPartsEntryHandler } from './handler';
import { graphDeps } from './queries';
import type { PartsEntry } from './types';

/** What a parts flow opens on: P2 first, the far-away heads-up, or clear. Never a lock. */
export const getPartsEntry = callable<unknown, PartsEntry>(
  { auth: 'required', label: 'getPartsEntry' },
  async ({ uid }) => getPartsEntryHandler(graphDeps(uid as string)),
);
