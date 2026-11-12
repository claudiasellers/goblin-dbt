/**
 * The ways into Cope Ahead (docs/design/cope-ahead.md, *Where it starts*): one link shape, read back by the
 * page. Pure.
 *
 *   /tool/cope-ahead?situationId=<situationId>&partId=<partId>
 *
 * The keys are the skill runtime's context in (R2: `$ctx.situationId`, `$ctx.partId`; the skill `cope_ahead`
 * accepts both, ER-B2). The hand-built page, kept unrouted for a rollback, reads these and its old `first` / `part`.
 *
 * - `situationId`: a situation id from the content. The chip comes first and is **not** pressed.
 *   An id the content doesn't have is dropped.
 * - `partId`: a kept part's id. It passes here only if it looks like an id (the server's `UUID` shape,
 *   functions/src/shared/validate.ts); the page presets it in the parts step only if it is one of the
 *   person's kept parts, and they can change it. Carried in only with parts on (the caller's call).
 *
 * DEAR MAN's summary links with `conversation` and the visit's part; Today's *Rehearse the next time*
 * (Recover's `recover_rehearse`) with `someone`.
 */
import type { CopeAheadContent } from '../data/copeAheadTypes';

export const COPE_AHEAD_PATH = '/tool/cope-ahead';

/** The copy keys of the ways in (cope-ahead.json): DEAR MAN's summary, Today's Rehearse the next time. */
export const COPE_ENTRY_KEYS = ['entry_dear_man', 'entry_recover'] as const;
export type CopeEntryKey = (typeof COPE_ENTRY_KEYS)[number];

/** The server's id shape (functions/src/shared/validate.ts `UUID`). */
const ID = /^[a-f0-9-]{36}$/i;
/** A situation id as the content writes them (snake_case). */
const SITUATION = /^[a-z][a-z0-9_]*$/;

export interface CopeAheadEntryInput {
  situationId?: string | null;
  partId?: string | null;
}

export interface CopeAheadEntry {
  /** The situation chip shown first, not pre-selected; null: the content's own order. */
  firstSituationId: string | null;
  /** The part to preset in the parts step, once the page has found it among the kept parts. */
  presetPartId: string | null;
}

/** The link into Cope Ahead. A missing or malformed value is left out, never sent empty. */
export function copeAheadLink({ situationId, partId }: CopeAheadEntryInput = {}): string {
  const q = new URLSearchParams();
  if (situationId && SITUATION.test(situationId)) q.set('situationId', situationId);
  if (partId && ID.test(partId)) q.set('partId', partId);
  const s = q.toString();
  return s ? `${COPE_AHEAD_PATH}?${s}` : COPE_AHEAD_PATH;
}

/** What the page reads from its address: an unknown situation is dropped, a part only if it looks like an id. */
export function parseCopeAheadEntry(
  search: string | URLSearchParams | null | undefined,
  content: Pick<CopeAheadContent, 'situations'> | null | undefined,
): CopeAheadEntry {
  const q = typeof search === 'string' || search == null ? new URLSearchParams(search ?? '') : search;
  const first = q.get('situationId') ?? q.get('first');
  const part = q.get('partId') ?? q.get('part');
  return {
    firstSituationId: first && content?.situations.some((s) => s.id === first) ? first : null,
    presetPartId: part && ID.test(part) ? part : null,
  };
}

/** The situations in screen order with the entry's first, the rest as they were. */
export function situationsWithFirst<T extends { id: string }>(situations: readonly T[], firstId: string | null): T[] {
  const first = firstId ? situations.find((s) => s.id === firstId) : undefined;
  return first ? [first, ...situations.filter((s) => s !== first)] : [...situations];
}
