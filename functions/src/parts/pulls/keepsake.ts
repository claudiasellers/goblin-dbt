/**
 * keepPullsKeepsake (docs/design/parts.md, "Two pulls", step 6): "Keep this" saves the keepsake to My
 * words, the store My words already reads for kept lines (an `OwnLine`, `area: 'my_words'`,
 * `source: 'two_pulls'`). Built on the server from the stored visit, never from client text: the two
 * names (a kept part's own name, else "the part that {move}" from its side's move), what they both want
 * (the pair's BOTH_WANT chip the visit picked) and the two signed-off keepsake lines. Kept only on the
 * person's yes, once per line id; the line carries `partIds` (two kept parts) so Delete your parts can
 * ask about it separately, and the visit links to it (KEPT_LINE, under GUARDS.PullsSession.keep).
 *
 * With two kept parts the same yes links them in the den: `PartLink {kind: 'two_pulls', bothWantId}`,
 * through links.ts' writePartLink in this transaction (the only PartLink writer; one link per pair and
 * kind, a repeat keeps the latest both-want). A pair-only visit has no parts to link.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { int } from '../../shared/values';
import { GUARDS } from '../../userdata/lifecycle';
import { userKey } from '../../userdata/ownership';
import { partsOff } from '../keep';
import { writePartLink } from '../links';
import type { KeepPullsKeepsakeResponse } from './types';

/** The keepsake's prompts and the pair-only name (scripts/parts/content.py). */
export const KEEPSAKE_PROMPTS = ['keepsake_both_want', 'keepsake_choose'] as const;
export const PAIR_NAME_PROMPT = 'pulls_pair_name';
/** A visit that stopped on one of these has no keepsake (the conservative branch, danger, a side not ready). */
const NO_KEEPSAKE = ['own_words', 'danger', 'not_self'];

export interface KeepsakeSide { name: string | null; found: boolean; unblendPhrase: string | null }

export interface KeepsakeState {
  partsOn: boolean;
  sessionFound: boolean;
  /** GUARDS.PullsSession.keep: open, or saved within 12 h. */
  keepable: boolean;
  entry: 'parts' | 'pair' | null;
  stopReason: string | null;
  aId: string | null;
  bId: string | null;
  a: KeepsakeSide;
  b: KeepsakeSide;
  /** The picked bothWant chip's label, only when it is one of the visit's pair's and signed off. */
  want: string | null;
  /** Its id (the PartLink's bothWantId). */
  bothWantId: string | null;
  /** Signed-off copy by id (the keepsake lines, the pair-only name). */
  copy: Record<string, string>;
  /** This line id is already the caller's OwnLine: a repeat. */
  existing: { text: string } | null;
}

export interface KeepsakeDeps {
  state(sessionId: string, lineId: string): Promise<KeepsakeState>;
  /** The OwnLine, the visit's KEPT_LINE, the profile version bump. Returns the new version. */
  write(input: { sessionId: string; lineId: string; text: string; partIds: string[] }): Promise<number>;
  version(): Promise<number>;
  /** Two kept parts: the den's `two_pulls` link (writePartLink). Its id and the profile version after it. */
  link(input: { aId: string; bId: string; bothWantId: string | null }): Promise<{ id: string; version: number }>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A side's name in the keepsake: the part's own name as they kept it, else the pair-only name with its
 * move's phrase. Null when neither can be said.
 */
export function sideName(side: KeepsakeSide, pairName: string | null): { name: string; own: boolean } | null {
  const own = side.name?.trim();
  if (own) return { name: own, own: true };
  if (!pairName || !side.unblendPhrase) return null;
  return { name: pairName.replace('{move}', side.unblendPhrase), own: false };
}

/**
 * The two lines, and-not-but, as one My words line. A generated name that opens the sentence takes a
 * capital; the person's own names are left exactly as they wrote them. Null when a slot can't be filled.
 */
export function keepsakeText(
  copy: Record<string, string>, a: { name: string; own: boolean }, b: { name: string; own: boolean }, want: string,
): string | null {
  const both = copy.keepsake_both_want;
  const choose = copy.keepsake_choose;
  if (!both || !choose) return null;
  let missing = false;
  const first = both.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (k === 'A') return a.name;
    if (k === 'B') return b.name;
    if (k === 'want') return want;
    missing = true;
    return '';
  });
  if (missing) return null;
  const lead = both.startsWith('{A}') && !a.own ? cap(first) : first;
  return `${lead} ${choose}`;
}

export async function keepPullsKeepsakeHandler(
  input: { sessionId: string; lineId: string }, deps: KeepsakeDeps,
): Promise<KeepPullsKeepsakeResponse> {
  const st = await deps.state(input.sessionId, input.lineId);
  if (!st.partsOn) throw partsOff();
  if (!st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  if (st.existing) return { lineId: input.lineId, text: st.existing.text, version: await deps.version() };
  if (!st.keepable) throw new HttpsError('failed-precondition', 'This visit can no longer be kept');
  if (st.stopReason && NO_KEEPSAKE.includes(st.stopReason)) throw new HttpsError('failed-precondition', 'Nothing to keep from this visit');
  if (!st.want) throw new HttpsError('failed-precondition', 'Nothing they both want was picked');
  if (st.entry === 'parts' && (!st.a.found || !st.b.found)) throw new HttpsError('failed-precondition', 'That part is not kept');
  const pairName = st.copy[PAIR_NAME_PROMPT] ?? null;
  const a = sideName(st.a, pairName);
  const b = sideName(st.b, pairName);
  const text = a && b ? keepsakeText(st.copy, a, b, st.want) : null;
  if (!text) throw new HttpsError('failed-precondition', 'The keepsake is not ready');
  const partIds = st.entry === 'parts' && st.aId && st.bId ? [st.aId, st.bId] : [];
  let version = await deps.write({ sessionId: input.sessionId, lineId: input.lineId, text, partIds });
  if (partIds.length === 2) {
    const link = await deps.link({ aId: partIds[0], bId: partIds[1], bothWantId: st.bothWantId });
    return { lineId: input.lineId, text, version: link.version, linkId: link.id };
  }
  return { lineId: input.lineId, text, version };
}

const signedOff = (v: string) => `(${v}.reviewStatus = 'approved' AND ${v}.pending IS NULL)`;

export const KEEPSAKE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PULLS_SESSION]->(ps:PullsSession {key: $sessionKey})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pa:Part) WHERE ps.aId IS NOT NULL AND pa.key = $uid + ':' + ps.aId AND pa.status IN ['active', 'resting']
  OPTIONAL MATCH (u)-[:HAS_PART]->(pb:Part) WHERE ps.bId IS NOT NULL AND pb.key = $uid + ':' + ps.bId AND pb.status IN ['active', 'resting']
  OPTIONAL MATCH (ma:ProtectiveMove {id: ps.moveA})
  OPTIONAL MATCH (mb:ProtectiveMove {id: ps.moveB})
  OPTIONAL MATCH (:PolarityPair {id: ps.pairId})-[bw:BOTH_WANT]->(w:PartOption {id: ps.bothWantId})
    WHERE ${signedOff('bw')} AND ${signedOff('w')}
  OPTIONAL MATCH (u)-[:HAS_OWN_LINE]->(same:OwnLine {key: $lineKey})
  OPTIONAL MATCH (c:PartPrompt) WHERE c.id IN $copyIds AND ${signedOff('c')}
  RETURN coalesce(u.partsEnabled, false) AS partsOn, ps IS NOT NULL AS sessionFound,
         coalesce(${GUARDS.PullsSession.keep('ps')}, false) AS keepable, ps.entry AS entry, ps.stopReason AS stopReason,
         ps.aId AS aId, ps.bId AS bId,
         pa IS NOT NULL AS aFound, pa.name AS aName, ma.unblendPhrase AS aPhrase,
         pb IS NOT NULL AS bFound, pb.name AS bName, mb.unblendPhrase AS bPhrase,
         w.label AS want, w.id AS bothWantId, same.text AS existingText, collect(c {.id, .copy}) AS copy
`;

/** The line (create once), the visit's link to it, and a new profile version (a kept line is profile). */
export const KEEPSAKE_WRITE_QUERY = `
  MATCH (u:User {id: $uid})
  MERGE (o:OwnLine {key: $lineKey})
  ON CREATE SET o:UserData:ProfileItem, o.id = $lineId, o.ownerId = $uid, o.kind = 'own_line', o.area = 'my_words',
    o.status = 'active', o.source = 'two_pulls', o.createdAt = datetime(), o.confirmedAt = datetime(), o.schemaVersion = 1,
    o.text = $text, o.emotionIds = [], o.moment = 'two_pulls', o.uses = 0, o.partIds = $partIds, o.pullsSessionId = $sessionId
  MERGE (u)-[:HAS_OWN_LINE]->(o)
  WITH u, o
  OPTIONAL MATCH (u)-[:HAS_PULLS_SESSION]->(ps:PullsSession {key: $sessionKey}) WHERE ${GUARDS.PullsSession.keep('ps')}
  FOREACH (x IN CASE WHEN ps IS NULL THEN [] ELSE [ps] END | MERGE (x)-[:KEPT_LINE]->(o))
  SET u.profileVersion = coalesce(u.profileVersion, 0) + 1
  RETURN u.profileVersion AS version
`;

const VERSION_QUERY = `MATCH (u:User {id: $uid}) RETURN coalesce(u.profileVersion, 0) AS version`;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function keepsakeDeps(tx: ManagedTransaction, uid: string): KeepsakeDeps {
  return {
    async state(sessionId, lineId) {
      const r = (await tx.run(KEEPSAKE_STATE_QUERY, {
        uid, sessionKey: userKey(uid, sessionId), lineKey: userKey(uid, lineId), copyIds: [...KEEPSAKE_PROMPTS, PAIR_NAME_PROMPT],
      })).records[0];
      const copy: Record<string, string> = {};
      for (const c of ((r?.get('copy') as Array<{ id?: unknown; copy?: unknown }> | null | undefined) ?? [])) {
        if (typeof c.id === 'string' && typeof c.copy === 'string') copy[c.id] = c.copy;
      }
      const entry = str(r?.get('entry'));
      const existing = str(r?.get('existingText'));
      return {
        partsOn: r?.get('partsOn') === true,
        sessionFound: r?.get('sessionFound') === true,
        keepable: r?.get('keepable') === true,
        entry: entry === 'parts' || entry === 'pair' ? entry : null,
        stopReason: str(r?.get('stopReason')),
        aId: str(r?.get('aId')),
        bId: str(r?.get('bId')),
        a: { found: r?.get('aFound') === true, name: str(r?.get('aName')), unblendPhrase: str(r?.get('aPhrase')) },
        b: { found: r?.get('bFound') === true, name: str(r?.get('bName')), unblendPhrase: str(r?.get('bPhrase')) },
        want: str(r?.get('want')),
        bothWantId: str(r?.get('bothWantId')),
        copy,
        existing: existing !== null ? { text: existing } : null,
      };
    },
    async write(input) {
      const r = (await tx.run(KEEPSAKE_WRITE_QUERY, {
        uid, lineKey: userKey(uid, input.lineId), lineId: input.lineId, sessionKey: userKey(uid, input.sessionId),
        sessionId: input.sessionId, text: input.text, partIds: input.partIds,
      })).records[0];
      return int(r?.get('version') ?? 0);
    },
    async version() {
      const r = (await tx.run(VERSION_QUERY, { uid })).records[0];
      return int(r?.get('version') ?? 0);
    },
    async link({ aId, bId, bothWantId }) {
      const out = await writePartLink(tx, uid, { kind: 'two_pulls', aId, bId, ...(bothWantId ? { bothWantId } : {}) });
      return { id: out.id, version: out.version };
    },
  };
}
