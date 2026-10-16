/**
 * The `TrailOffer` record (docs/design/parts.md, Data model → User data): a log record, one per trail the
 * person is offered. `writeTrailOffer` is its one writer (tests/trail-offers.test.mjs fails if any other
 * file under functions/src MERGEs or CREATEs a `:TrailOffer`); the answer and the evidence step change it
 * only under GUARDS.TrailOffer (answer.ts).
 *
 * Fields: `ruleId`, `shape`, `moveIds` (sorted: the id and the block), `pullIds` (the same moves in the
 * statement's order: B's first-then, C's pair order), `contextId`, `pairId`, `partId`, `evidenceKeys`,
 * `evidenceJson` (one row per episode: dates, tool ids, record keys, move and context ids, never text),
 * `status` (offered → seen → answered), `answer`, `offeredAt`, `seenAt`, `answeredAt`, `cooldownUntil`.
 *
 * Edges run out of the offer only, because the records it points at are finalised:
 * `(:TrailOffer)-[:EVIDENCE]->(record)` for each evidence key the caller owns, and
 * `(:TrailOffer)-[:ABOUT_PART]->(:Part)` for rule D (the Part is only matched, never written).
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { userKey } from '../../userdata/ownership';
import { sortedMoves, trailOfferId } from './blocked';
import type { OfferableTrail } from './types';

/**
 * Create once, parts on only. An offer that already exists (any status) is never touched, so a re-run
 * of the day's evaluation, or the same trail found again, writes nothing. Rule D's part must be the
 * caller's own; evidence keys that aren't the caller's records are simply not linked.
 */
export const WRITE_TRAIL_OFFER_QUERY = `
  MATCH (u:User {id: $uid})
  WHERE coalesce(u.partsEnabled, false)
    AND NOT EXISTS { MATCH (:TrailOffer {key: $key}) }
  OPTIONAL MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey})
  WITH u, pt WHERE $partKey IS NULL OR pt IS NOT NULL
  MERGE (o:TrailOffer {key: $key})
  ON CREATE SET o:UserData:LogRecord, o.id = $id, o.ownerId = $uid, o.createdAt = datetime(), o.schemaVersion = 1,
    o.ruleId = $ruleId, o.shape = $shape, o.moveIds = $moveIds, o.pullIds = $pullIds, o.contextId = $contextId,
    o.pairId = $pairId, o.partId = $partId, o.evidenceKeys = $evidenceKeys, o.evidenceJson = $evidenceJson,
    o.status = 'offered', o.offeredAt = datetime()
  MERGE (u)-[:HAS_TRAIL_OFFER]->(o)
  WITH o, pt
  OPTIONAL MATCH (r:LogRecord {ownerId: $uid}) WHERE r.key IN $evidenceKeys
  WITH o, pt, collect(DISTINCT r) AS rs
  FOREACH (x IN rs | MERGE (o)-[:EVIDENCE]->(x))
  FOREACH (x IN CASE WHEN pt IS NULL THEN [] ELSE [pt] END | MERGE (o)-[:ABOUT_PART]->(x))
  RETURN o.id AS id
`;

/** The evidence as stored: ids, keys and times only (lane 1's evidence rows, unchanged). */
export function evidenceJson(t: Pick<OfferableTrail, 'evidence'>): string {
  return JSON.stringify(t.evidence.map((e) => ({
    at: e.at, toolIds: [...e.toolIds], recordKeys: [...e.recordKeys], moveIds: [...e.moveIds], contextIds: [...e.contextIds],
  })));
}

/** The parameters for one trail (pure; tested). */
export function trailOfferParams(uid: string, t: OfferableTrail) {
  const id = trailOfferId(t);
  return {
    uid, id, key: userKey(uid, id),
    partKey: t.partId ? userKey(uid, t.partId) : null,
    ruleId: t.ruleId, shape: t.shape, moveIds: sortedMoves(t.moveIds), pullIds: [...new Set(t.moveIds)],
    contextId: t.contextId, pairId: t.pairId, partId: t.partId,
    evidenceKeys: [...new Set(t.evidence.flatMap((e) => e.recordKeys))].sort(),
    evidenceJson: evidenceJson(t),
  };
}

/** The one writer. Returns the offer's id, or null when nothing was written (it exists, parts off, not their part). */
export async function writeTrailOffer(tx: ManagedTransaction, uid: string, trail: OfferableTrail): Promise<string | null> {
  const res = await tx.run(WRITE_TRAIL_OFFER_QUERY, trailOfferParams(uid, trail));
  return (res.records[0]?.get('id') as string | undefined) ?? null;
}
