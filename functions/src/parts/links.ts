/**
 * Every writer of a `PartLink` (docs/design/parts.md, "The den" and "Two pulls"): profile data, written
 * only on the person's yes, and only here (tests/parts-den-data.test.mjs fails if any other file under
 * functions/src MERGEs, CREATEs, SETs or DELETEs a `:PartLink`; deleteMyParts and account delete remove
 * them by label). The den's "This one stands in front of that one" writes `covers_for` through linkParts;
 * Two pulls writes `two_pulls` by calling writePartLink inside its own transaction.
 *
 * One link per pair and kind: the id is derived from the kind and the two part ids, so the MERGE on key
 * (and the `part_link_key` constraint) is the rule. A repeat keeps the person's latest answer: the
 * direction of a `covers_for`, the both-want of a `two_pulls`.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GRAPH_ID, ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { toNumber } from '../shared/values';
import { userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import {
  PART_LINK_KINDS, type LinkPartsRequest, type LinkPartsResponse, type PartLinkKind, type UnlinkPartsRequest,
  type UnlinkPartsResponse,
} from './denTypes';

const fail = (m: string): never => { throw new ValidationError(m); };
function only(o: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${k}: not accepted`);
}

export interface PartLinkInput { kind: PartLinkKind; aId: string; bId: string; bothWantId: string | null }

/** Where the yes came from: the den's thread sheet, or the Two pulls flow. */
export const linkSource = (kind: PartLinkKind): 'den' | 'two_pulls' => (kind === 'covers_for' ? 'den' : 'two_pulls');

/** One id per pair and kind, whichever way round the two are given. */
export function partLinkId(kind: PartLinkKind, aId: string, bId: string): string {
  const [lo, hi] = [aId.toLowerCase(), bId.toLowerCase()].sort();
  return `${kind}_${lo}_${hi}`;
}
export const PART_LINK_ID = /^(covers_for|two_pulls)_[a-f0-9-]{36}_[a-f0-9-]{36}$/;

export function validateLink(raw: unknown): PartLinkInput {
  const o = obj(raw);
  only(o, ['kind', 'aId', 'bId', 'bothWantId']);
  const kind = oneOf(o.kind, PART_LINK_KINDS);
  const aId = uuid(o.aId);
  const bId = uuid(o.bId);
  if (aId.toLowerCase() === bId.toLowerCase()) fail('bId: a part is not linked to itself');
  const given = o.bothWantId ?? null;
  if (given !== null && (typeof given !== 'string' || !GRAPH_ID.test(given))) fail('bothWantId: expected an option id');
  if (given !== null && kind !== 'two_pulls') fail('bothWantId: two_pulls only');
  return { kind, aId, bId, bothWantId: given as string | null };
}

export function validateUnlink(raw: unknown): UnlinkPartsRequest {
  const o = obj(raw);
  only(o, ['linkId']);
  if (typeof o.linkId !== 'string' || !PART_LINK_ID.test(o.linkId)) fail('linkId: expected a link id');
  return { linkId: o.linkId as string };
}

/** Parts on; both parts the caller's and in the room; the link if it exists; the both-want if it is a pair's or a general one (Two pulls without a pair). */
export const LINK_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pa:Part {key: $aKey}) WHERE pa.status IN ['active', 'resting']
  OPTIONAL MATCH (u)-[:HAS_PART]->(pb:Part {key: $bKey}) WHERE pb.status IN ['active', 'resting']
  OPTIONAL MATCH (u)-[:HAS_PART_LINK]->(l:PartLink {key: $linkKey})
  OPTIONAL MATCH (bw:PartOption {id: $bothWantId})
    WHERE EXISTS { MATCH (:PolarityPair)-[:BOTH_WANT]->(bw) } OR (bw.flow = 'pulls' AND bw.step = 'both_want_general')
  RETURN coalesce(u.partsEnabled, false) AS partsOn, coalesce(u.profileVersion, 0) AS version,
         pa IS NOT NULL AS aFound, pb IS NOT NULL AS bFound, l IS NOT NULL AS linked,
         count(bw) > 0 AS bothWantKnown
`;

/** The link and its two `LINKS` edges; a repeat updates the answer and its confirmation. */
export const WRITE_PART_LINK_QUERY = `
  MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
  MATCH (u)-[:HAS_PART]->(pa:Part {key: $aKey}) WHERE pa.status IN ['active', 'resting']
  MATCH (u)-[:HAS_PART]->(pb:Part {key: $bKey}) WHERE pb.status IN ['active', 'resting']
  MERGE (l:PartLink {key: $linkKey})
  ON CREATE SET l:UserData:ProfileItem, l.id = $linkId, l.ownerId = $uid, l.createdAt = datetime(), l.schemaVersion = 1,
    l.kind = $kind
  SET l.aId = $aId, l.bId = $bId, l.bothWantId = $bothWantId, l.source = $source, l.confirmedAt = datetime(),
    u.profileVersion = coalesce(u.profileVersion, 0) + 1
  MERGE (u)-[:HAS_PART_LINK]->(l)
  MERGE (l)-[:LINKS]->(pa)
  MERGE (l)-[:LINKS]->(pb)
  RETURN u.profileVersion AS version
`;

/** The den's ×: the link goes (a profile item the person removes). */
export const REMOVE_PART_LINK_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_LINK]->(l:PartLink {key: $linkKey})
  WHERE coalesce(u.partsEnabled, false)
  DETACH DELETE l
  SET u.profileVersion = coalesce(u.profileVersion, 0) + 1
  RETURN u.profileVersion AS version
`;

export interface LinkState {
  partsOn: boolean;
  version: number;
  aFound: boolean;
  bFound: boolean;
  linked: boolean;
  bothWantKnown: boolean;
}

export interface PartLinkDeps {
  state(q: { aId: string; bId: string; linkId: string; bothWantId: string | null }): Promise<LinkState>;
  /** The new profile version, or null when the write's own guard stopped it. */
  write(input: PartLinkInput & { linkId: string; source: string }): Promise<number | null>;
  remove(linkId: string): Promise<number | null>;
}

const changed = () => new HttpsError('failed-precondition', 'That part changed; try again');

/** linkParts, and writePartLink for Two pulls. */
export async function linkPartsHandler(input: PartLinkInput, deps: PartLinkDeps): Promise<LinkPartsResponse> {
  const linkId = partLinkId(input.kind, input.aId, input.bId);
  const st = await deps.state({ aId: input.aId, bId: input.bId, linkId, bothWantId: input.bothWantId });
  if (!st.partsOn) throw partsOff();
  if (!st.aFound || !st.bFound) throw new HttpsError('not-found', 'Part not found');
  if (input.bothWantId && !st.bothWantKnown) throw new HttpsError('invalid-argument', 'bothWantId: unknown option');
  const version = await deps.write({ ...input, linkId, source: linkSource(input.kind) });
  if (version === null) throw changed();
  return { id: linkId, created: !st.linked, version };
}

/** unlinkParts: the caller's own link, once; a repeat removes nothing. */
export async function unlinkPartsHandler(input: UnlinkPartsRequest, deps: PartLinkDeps): Promise<UnlinkPartsResponse> {
  const st = await deps.state({ aId: '', bId: '', linkId: input.linkId, bothWantId: null });
  if (!st.partsOn) throw partsOff();
  if (!st.linked) return { removed: false, version: st.version };
  const version = await deps.remove(input.linkId);
  if (version === null) return { removed: false, version: st.version };
  return { removed: true, version };
}

export function partLinkDeps(tx: ManagedTransaction, uid: string): PartLinkDeps {
  const keys = (q: { aId: string; bId: string; linkId: string }) => ({
    uid, aKey: userKey(uid, q.aId), bKey: userKey(uid, q.bId), linkKey: userKey(uid, q.linkId),
  });
  return {
    async state(q) {
      const r = (await tx.run(LINK_STATE_QUERY, { ...keys(q), bothWantId: q.bothWantId })).records[0];
      return {
        partsOn: r?.get('partsOn') === true,
        version: toNumber(r?.get('version')) ?? 0,
        aFound: r?.get('aFound') === true,
        bFound: r?.get('bFound') === true,
        linked: r?.get('linked') === true,
        bothWantKnown: r?.get('bothWantKnown') === true,
      };
    },
    async write(w) {
      const r = (await tx.run(WRITE_PART_LINK_QUERY, {
        ...keys(w), linkId: w.linkId, kind: w.kind, aId: w.aId, bId: w.bId, bothWantId: w.bothWantId, source: w.source,
      })).records[0];
      return r ? toNumber(r.get('version')) ?? 0 : null;
    },
    async remove(linkId) {
      const r = (await tx.run(REMOVE_PART_LINK_QUERY, { uid, linkKey: userKey(uid, linkId) })).records[0];
      return r ? toNumber(r.get('version')) ?? 0 : null;
    },
  };
}

/**
 * Two pulls' writer: inside the caller's own write transaction, on the person's yes. Validates like the
 * callable (`validateLink`), then the same checks and write. Throws HttpsError like linkParts.
 */
export async function writePartLink(tx: ManagedTransaction, uid: string, raw: LinkPartsRequest): Promise<LinkPartsResponse> {
  let input: PartLinkInput;
  try {
    input = validateLink(raw);
  } catch (e) {
    if (e instanceof ValidationError) throw new HttpsError('invalid-argument', e.message);
    throw e;
  }
  return linkPartsHandler(input, partLinkDeps(tx, uid));
}

/** The same removal, for a flow that removes its own link inside its transaction. */
export async function removePartLink(tx: ManagedTransaction, uid: string, linkId: string): Promise<UnlinkPartsResponse> {
  if (!PART_LINK_ID.test(linkId)) throw new HttpsError('invalid-argument', 'linkId: expected a link id');
  return unlinkPartsHandler({ linkId }, partLinkDeps(tx, uid));
}
