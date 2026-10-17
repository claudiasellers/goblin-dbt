/**
 * Delete my parts (docs/design/parts.md, "Deleting"): one confirmed step that removes every parts
 * record the caller owns. Works with parts off: turning parts off deletes nothing, so this is how
 * someone leaves for good. Never touches ToolSessions (a visit happened; its DETAIL edge goes with
 * the deleted PartSession), check-ins, or any other record.
 *
 * Kept Two pulls lines (the keepsake in My words, an `OwnLine` with `source: 'two_pulls'` and the two
 * kept parts' ids in `partIds`) are asked about separately (parts.md "Deleting": "Also remove 2 kept
 * lines that name your parts?"): `countMyPartsLines` counts them for the confirm, and they go only
 * when the caller passes `keptLines: true` (default false). No other My words line is ever touched.
 *
 * Follow-ups: every follow-up of a parts type goes, open or answered (an answered check-back carries
 * `partId`). Left alone on purpose: `ToolSession.ext.er.copeAheadPartId` / `whoShowedUp`. They are an
 * opaque id and an enum on finalised log records, carry no name or own words, and point at nothing
 * once the part is gone; rewriting a finalised record is not ours to do outside retention.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx, writeTx } from '../shared/neo4j';
import { ValidationError, obj } from '../shared/validate';
import { int } from '../shared/values';
import { USER_DATA } from '../userdata/layers';
import { PARTS_FOLLOW_UP_TYPES } from './followUpTypes';

/**
 * Every user-data label parts.md defines (Data model → User data), registered or not yet, plus
 * PartRevisit (a part's logged still-true answers) and PullsSession (Two pulls' visits).
 */
const PARTS_DESIGN_LABELS = ['Part', 'PartLink', 'DenSnapshot', 'PartSession', 'PullsSession', 'PartTag', 'PartCandidate', 'TrailOffer', 'PartRevisit'] as const;

/**
 * The parts labels deleteMyParts removes: the design's labels that are registered in layers.ts, so a
 * later phase's label joins by registering. Also the whitelist for the label interpolated below.
 */
export const PARTS_LABELS: readonly string[] = PARTS_DESIGN_LABELS.filter((l) => l in USER_DATA);

export { PARTS_FOLLOW_UP_TYPES } from './followUpTypes';

export interface DeleteMyPartsResponse {
  /**
   * Nodes deleted per label (`FollowUp`: the parts follow-up types, open or answered; `OwnLine`: the kept
   * Two pulls lines, present only when they were asked for).
   */
  deleted: Record<string, number>;
}

export interface DeleteMyPartsRequest {
  /** Also remove the kept Two pulls lines that name the caller's parts. Default false. */
  keptLines?: boolean;
}

/** `{}` or `{ keptLines: boolean }` (a missing body is `{}`). */
export function validateDeleteMyParts(raw: unknown): { keptLines: boolean } {
  if (raw === undefined || raw === null) return { keptLines: false };
  const o = obj(raw);
  for (const k of Object.keys(o)) if (k !== 'keptLines') throw new ValidationError(`${k}: not accepted`);
  if (o.keptLines !== undefined && typeof o.keptLines !== 'boolean') throw new ValidationError('keptLines: expected a boolean');
  return { keptLines: o.keptLines === true };
}

/** The kept Two pulls lines that name a kept part: the keepsake's own marker (keepsake.ts). */
const KEPT_LINES_MATCH = `
  MATCH (o:OwnLine {ownerId: $uid})
  WHERE o.source = 'two_pulls' AND size(coalesce(o.partIds, [])) > 0`;

export const COUNT_KEPT_LINES = `${KEPT_LINES_MATCH}
  RETURN count(o) AS n`;

export const DELETE_KEPT_LINES = `${KEPT_LINES_MATCH}
  WITH collect(o) AS os
  FOREACH (x IN os | DETACH DELETE x)
  RETURN size(os) AS n`;

const deleteLabel = (label: string) => `
  MATCH (n:${label} {ownerId: $uid})
  WITH collect(n) AS ns
  FOREACH (x IN ns | DETACH DELETE x)
  RETURN size(ns) AS n`;

/** Every parts follow-up, open or answered: an answered check-back still carries `partId`. */
export const DELETE_FOLLOW_UPS = `
  MATCH (f:FollowUp {ownerId: $uid})
  WHERE f.type IN $types
  WITH collect(f) AS fs
  FOREACH (x IN fs | DETACH DELETE x)
  RETURN size(fs) AS n`;

/** Kept parts are profile items: a new profile version drops any cached slice that held them. */
const BUMP_PROFILE_VERSION = `
  MATCH (u:User {id: $uid})
  SET u.profileVersion = coalesce(u.profileVersion, 0) + 1`;

export async function deleteMyPartsTx(tx: ManagedTransaction, uid: string, opts: { keptLines?: boolean } = {}): Promise<DeleteMyPartsResponse> {
  const deleted: Record<string, number> = {};
  const count = (r: { records: Array<{ get(k: string): unknown }> }) => {
    const v = r.records[0]?.get('n');
    return v == null ? 0 : int(v);
  };
  for (const label of PARTS_LABELS) deleted[label] = count(await tx.run(deleteLabel(label), { uid }));
  deleted.FollowUp = count(await tx.run(DELETE_FOLLOW_UPS, { uid, types: PARTS_FOLLOW_UP_TYPES }));
  // Kept lines are profile items too (My words): only on the separate yes.
  if (opts.keptLines) deleted.OwnLine = count(await tx.run(DELETE_KEPT_LINES, { uid }));
  if ((deleted.Part ?? 0) > 0 || (deleted.OwnLine ?? 0) > 0) await tx.run(BUMP_PROFILE_VERSION, { uid });
  return { deleted };
}

/** One write transaction, the caller's own records only. Returns counts, nothing else. */
export const deleteMyParts = callable<unknown, DeleteMyPartsResponse>(
  { auth: 'required', label: 'deleteMyParts', errorMessage: 'Could not delete your parts' },
  async ({ uid, data }) => {
    const input = validateDeleteMyParts(data);
    return writeTx((tx) => deleteMyPartsTx(tx, uid as string, input));
  },
);

/** For the confirm: how many kept Two pulls lines name the caller's parts (works with parts off). */
export const countMyPartsLines = callable<unknown, { keptLines: number }>(
  { auth: 'required', label: 'countMyPartsLines', errorMessage: 'Could not count your kept lines' },
  async ({ uid }) => readTx(async (tx) => {
    const v = (await tx.run(COUNT_KEPT_LINES, { uid })).records[0]?.get('n');
    return { keptLines: v == null ? 0 : int(v) };
  }),
);
