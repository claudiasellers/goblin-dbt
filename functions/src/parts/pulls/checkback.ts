/**
 * Two pulls' week check-back (docs/design/parts.md, "Two pulls", step 7): on the close's yes, with two
 * kept parts, a `two_pulls_checkback` FollowUp due in a week, `(:FollowUp)-[:CHECKS_BACK]->(:Part)` for
 * both and `(:PullsSession)-[:SCHEDULED]->(:FollowUp)`, with `f.partIds` / `f.pullsSessionId`. One per
 * visit (a repeat returns the open one); nothing while parts are off. The answer is answerPartCheckback's
 * (../checkback.ts: the same card and answers; Louder records the harm signal and shows the aftercare).
 *
 * Today: this module draws the card (registerTodaySource owns the type). Parts on only, both names and
 * tenderness through readProfileSlices(tx, uid, 'today'); a set-aside or deleted part means no card.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GUARDS } from '../../userdata/lifecycle';
import { userKey } from '../../userdata/ownership';
import { readProfileSlices } from '../../profile/slices';
import { scheduleTx } from '../../spine/followUp';
import { readFollowUpTypes } from '../../spine/registry';
import { registerTodaySource } from '../../spine/today';
import { followUpState, type TodayItem } from '../../spine/todayOrder';
import { partsOff } from '../keep';
import type { PullsCheckbackInput } from './validation';
import { TWO_PULLS_CHECKBACK_TYPE, TWO_PULLS_TOOL, type SchedulePullsCheckbackResponse } from './types';

export interface PullsCheckbackState {
  partsOn: boolean;
  sessionFound: boolean;
  entry: string | null;
  aId: string | null;
  bId: string | null;
  /** Both parts still kept (active or resting). */
  bothKept: boolean;
  /** This visit's open check-back, if one was scheduled already. */
  openId: string | null;
}

export interface PullsCheckbackDeps {
  state(sessionId: string): Promise<PullsCheckbackState>;
  schedule(input: PullsCheckbackInput, partIds: [string, string]): Promise<string | null>;
}

export async function schedulePullsCheckbackHandler(input: PullsCheckbackInput, deps: PullsCheckbackDeps): Promise<SchedulePullsCheckbackResponse> {
  const st = await deps.state(input.sessionId);
  if (!st.partsOn) throw partsOff();
  if (!st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  if (st.entry !== 'parts' || !st.aId || !st.bId) throw new HttpsError('failed-precondition', 'Two kept parts to check back with');
  if (!st.bothKept) throw new HttpsError('failed-precondition', 'That part is not kept');
  if (st.openId) return { id: st.openId };
  return { id: await deps.schedule(input, [st.aId, st.bId]) };
}

export const PULLS_CHECKBACK_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PULLS_SESSION]->(ps:PullsSession {key: $sessionKey})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pa:Part) WHERE ps.aId IS NOT NULL AND pa.key = $uid + ':' + ps.aId AND pa.status IN ['active', 'resting']
  OPTIONAL MATCH (u)-[:HAS_PART]->(pb:Part) WHERE ps.bId IS NOT NULL AND pb.key = $uid + ':' + ps.bId AND pb.status IN ['active', 'resting']
  OPTIONAL MATCH (ps)-[:SCHEDULED]->(open:FollowUp {type: '${TWO_PULLS_CHECKBACK_TYPE}'}) WHERE ${GUARDS.FollowUp.update('open')}
  RETURN coalesce(u.partsEnabled, false) AS partsOn, ps IS NOT NULL AS sessionFound, ps.entry AS entry,
         ps.aId AS aId, ps.bId AS bId, pa IS NOT NULL AND pb IS NOT NULL AS bothKept, head(collect(open.id)) AS openId
`;

/** After scheduleTx: both parts it checks back with, and the visit it came from (while that takes links). */
export const LINK_PULLS_CHECKBACK_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $followUpKey})
  MATCH (u)-[:HAS_PART]->(pa:Part {key: $aKey})
  MATCH (u)-[:HAS_PART]->(pb:Part {key: $bKey})
  SET f.partIds = $partIds, f.pullsSessionId = $sessionId
  MERGE (f)-[:CHECKS_BACK]->(pa)
  MERGE (f)-[:CHECKS_BACK]->(pb)
  WITH u, f
  OPTIONAL MATCH (u)-[:HAS_PULLS_SESSION]->(ps:PullsSession {key: $sessionKey}) WHERE ${GUARDS.PullsSession.keep('ps')}
  FOREACH (x IN CASE WHEN ps IS NULL THEN [] ELSE [ps] END | MERGE (x)-[:SCHEDULED]->(f))
  RETURN f.id AS id
`;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function pullsCheckbackDeps(tx: ManagedTransaction, uid: string): PullsCheckbackDeps {
  return {
    async state(sessionId) {
      const r = (await tx.run(PULLS_CHECKBACK_STATE_QUERY, { uid, sessionKey: userKey(uid, sessionId) })).records[0];
      return {
        partsOn: r?.get('partsOn') === true, sessionFound: r?.get('sessionFound') === true, entry: str(r?.get('entry')),
        aId: str(r?.get('aId')), bId: str(r?.get('bId')), bothKept: r?.get('bothKept') === true, openId: str(r?.get('openId')),
      };
    },
    async schedule(input, [aId, bId]) {
      const [id] = await scheduleTx(tx, uid, [input.item], { sourceSessionId: null, sourceToolId: TWO_PULLS_TOOL });
      if (!id) return null;
      await tx.run(LINK_PULLS_CHECKBACK_QUERY, {
        uid, followUpKey: userKey(uid, id), aKey: userKey(uid, aId), bKey: userKey(uid, bId), partIds: [aId, bId],
        sessionKey: userKey(uid, input.sessionId), sessionId: input.sessionId,
      });
      return id;
    },
  };
}

// ---- Today ----

/** Open two-pulls check-backs, parts on only; the names come from the slice, never from here. */
export const PULLS_CHECKBACK_ITEMS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {type: '${TWO_PULLS_CHECKBACK_TYPE}', status: 'scheduled'})
  WHERE coalesce(u.partsEnabled, false)
    AND (f.snoozedUntil IS NULL OR f.snoozedUntil <= datetime())
    AND f.dueAt <= datetime() + duration({hours: 24})
  RETURN f.id AS id, toString(f.dueAt) AS dueAt, f.partIds AS partIds
  ORDER BY f.dueAt LIMIT 5
`;

export async function pullsCheckbackItems(tx: ManagedTransaction, uid: string, now: Date): Promise<TodayItem[]> {
  const res = await tx.run(PULLS_CHECKBACK_ITEMS_QUERY, { uid });
  if (res.records.length === 0) return [];
  const t = (await readFollowUpTypes(tx)).find((x) => x.id === TWO_PULLS_CHECKBACK_TYPE);
  if (!t?.enabled) return [];
  const { parts } = await readProfileSlices(tx, uid, 'today', now.getTime());
  const byId = new Map(parts.map((p) => [p.id, p]));
  const items: TodayItem[] = [];
  for (const r of res.records) {
    const ids = ((r.get('partIds') as unknown[] | null) ?? []).filter((x): x is string => typeof x === 'string');
    const both = ids.map((id) => byId.get(id));
    const dueAt = r.get('dueAt') as string;
    const state = followUpState(dueAt, t.staleAfterHours, now.getTime());
    if (both.length !== 2 || both.some((p) => !p) || !state) continue;
    items.push({
      id: r.get('id') as string, kind: 'follow_up', type: TWO_PULLS_CHECKBACK_TYPE, tier: t.tier, state, dueAt,
      resolveMode: 'inline', deepLink: null,
      choices: t.choices.map(({ id, label, status }) => ({ id, label, ...(status ? { status: status as 'done' } : {}) })),
      copy: t.copy, source: { toolId: TWO_PULLS_TOOL },
      parts: both.map((p) => ({ id: p!.id, name: p!.name, tender: p!.tender, safety: p!.safety })),
    });
  }
  return items;
}

registerTodaySource(pullsCheckbackItems, [TWO_PULLS_CHECKBACK_TYPE]);
