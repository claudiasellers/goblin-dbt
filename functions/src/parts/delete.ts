/**
 * Delete my parts (docs/design/parts.md, "Deleting"): one confirmed step that removes every parts
 * record the caller owns. Works with parts off: turning parts off deletes nothing, so this is how
 * someone leaves for good. Never touches ToolSessions (a visit happened; its DETAIL edge goes with
 * the deleted PartSession), check-ins, or any other record.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { int } from '../shared/values';
import { USER_DATA } from '../userdata/layers';
import { GUARDS } from '../userdata/lifecycle';

/**
 * Every user-data label parts.md defines (Data model → User data), registered or not yet, plus
 * PartRevisit (a part's logged still-true answers).
 */
const PARTS_DESIGN_LABELS = ['Part', 'PartLink', 'DenSnapshot', 'PartSession', 'PartTag', 'PartCandidate', 'TrailOffer', 'PartRevisit'] as const;

/**
 * The parts labels deleteMyParts removes: the design's labels that are registered in layers.ts, so a
 * later phase's label joins by registering. Also the whitelist for the label interpolated below.
 */
export const PARTS_LABELS: readonly string[] = PARTS_DESIGN_LABELS.filter((l) => l in USER_DATA);

/** Follow-up types that only exist for parts (they arrive with the check-back flows). */
export const PARTS_FOLLOW_UP_TYPES: readonly string[] = ['part_checkback', 'two_pulls_checkback'];

export interface DeleteMyPartsResponse {
  /** Nodes deleted per label (`FollowUp`: open parts follow-ups only). */
  deleted: Record<string, number>;
}

const deleteLabel = (label: string) => `
  MATCH (n:${label} {ownerId: $uid})
  WITH collect(n) AS ns
  FOREACH (x IN ns | DETACH DELETE x)
  RETURN size(ns) AS n`;

export const DELETE_FOLLOW_UPS = `
  MATCH (f:FollowUp {ownerId: $uid})
  WHERE f.type IN $types AND ${GUARDS.FollowUp.update('f')}
  WITH collect(f) AS fs
  FOREACH (x IN fs | DETACH DELETE x)
  RETURN size(fs) AS n`;

/** Kept parts are profile items: a new profile version drops any cached slice that held them. */
const BUMP_PROFILE_VERSION = `
  MATCH (u:User {id: $uid})
  SET u.profileVersion = coalesce(u.profileVersion, 0) + 1`;

export async function deleteMyPartsTx(tx: ManagedTransaction, uid: string): Promise<DeleteMyPartsResponse> {
  const deleted: Record<string, number> = {};
  const count = (r: { records: Array<{ get(k: string): unknown }> }) => {
    const v = r.records[0]?.get('n');
    return v == null ? 0 : int(v);
  };
  for (const label of PARTS_LABELS) deleted[label] = count(await tx.run(deleteLabel(label), { uid }));
  deleted.FollowUp = count(await tx.run(DELETE_FOLLOW_UPS, { uid, types: PARTS_FOLLOW_UP_TYPES }));
  if ((deleted.Part ?? 0) > 0) await tx.run(BUMP_PROFILE_VERSION, { uid });
  return { deleted };
}

/** One write transaction, the caller's own records only. Returns counts, nothing else. */
export const deleteMyParts = callable<unknown, DeleteMyPartsResponse>(
  { auth: 'required', label: 'deleteMyParts', errorMessage: 'Could not delete your parts' },
  async ({ uid }) => writeTx((tx) => deleteMyPartsTx(tx, uid as string)),
);
