/**
 * The next-day check-back after a meeting (docs/design/parts.md, Meet a part step 10 and "Over
 * weeks"). On the close's yes, a `part_checkback` FollowUp for the part the visit kept, linked
 * `(:FollowUp)-[:CHECKS_BACK]->(:Part)` and `(:PartSession)-[:SCHEDULED]->(:FollowUp)`, with
 * `f.partId` / `f.partSessionId`. At most one open per part (a second schedule returns the open one
 * and writes nothing); never for a part paused by Louder; nothing while parts are off.
 *
 * Today: this module draws the card (registerTodaySource owns the type, so spine's generic read
 * leaves it out). Parts on only, the name and tenderness through readProfileSlices(tx, uid, 'today')
 * (spine never imports profile/). A set-aside or deleted part has no card.
 *
 * The answer resolves the follow-up under GUARDS.FollowUp.update and, on Louder, pauses the part
 * (keep.ts's PAUSE_PART_QUERY) in the same transaction. deleteMyParts removes every check-back by type, open or answered.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { toNumber } from '../shared/values';
import { GUARDS } from '../userdata/lifecycle';
import { userKey } from '../userdata/ownership';
import { readProfileSlices } from '../profile/slices';
import { scheduleTx } from '../spine/followUp';
import { readFollowUpTypes } from '../spine/registry';
import { registerTodaySource } from '../spine/today';
import { followUpState, type TodayItem } from '../spine/todayOrder';
import { validateScheduleItem, type ScheduleInput } from '../spine/validation';
import { DEFAULT_LOUDER_PAUSE_HOURS, partsOff, pausePart } from './keep';
import {
  PART_CHECKBACK_ANSWERS, PART_CHECKBACK_TYPE, type AnswerPartCheckbackResponse, type PartCheckbackAnswer,
  type SchedulePartCheckbackResponse,
} from './checkbackTypes';

const fail = (m: string): never => { throw new ValidationError(m); };

/** What each answer resolves the follow-up as. Louder is `done` too: the person answered. */
export const CHECKBACK_STATUS: Record<PartCheckbackAnswer, 'done' | 'dismissed'> = {
  settled: 'done', same: 'done', louder: 'done', skip: 'dismissed',
};

export interface ScheduleCheckbackInput { sessionId: string; item: ScheduleInput }

export function validateScheduleCheckback(raw: unknown, now: Date): ScheduleCheckbackInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'sessionId', 'dueAt'].includes(k)) fail(`${k}: not accepted`);
  return {
    sessionId: uuid(o.sessionId),
    item: validateScheduleItem({ id: o.id, type: PART_CHECKBACK_TYPE, dueAt: o.dueAt }, now),
  };
}

export function validateAnswerCheckback(raw: unknown): { id: string; answer: PartCheckbackAnswer } {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'answer'].includes(k)) fail(`${k}: not accepted`);
  return { id: uuid(o.id), answer: oneOf(o.answer, PART_CHECKBACK_ANSWERS) };
}

// ---- Scheduling ----

export const SCHEDULE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pt:Part {key: $uid + ':' + ps.partId})
  OPTIONAL MATCH (u)-[:HAS_FOLLOW_UP]->(open:FollowUp {type: '${PART_CHECKBACK_TYPE}'})-[:CHECKS_BACK]->(pt)
    WHERE ${GUARDS.FollowUp.update('open')}
  RETURN coalesce(u.partsEnabled, false) AS partsOn, ps IS NOT NULL AS sessionFound, pt.id AS partId,
         pt.status AS partStatus, coalesce(pt.pausedUntil > datetime(), false) AS paused, head(collect(open.id)) AS openId
`;

/**
 * After scheduleTx wrote the follow-up: which part it checks back with, and the visit it came from.
 * `SCHEDULED` comes out of the Meet a part session, so only while it takes writes (GUARDS.PartSession.keep).
 */
export const LINK_CHECKBACK_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $followUpKey})
  MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey})
  SET f.partId = $partId, f.partSessionId = $sessionId
  MERGE (f)-[:CHECKS_BACK]->(pt)
  WITH u, f
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey}) WHERE ${GUARDS.PartSession.keep('ps')}
  FOREACH (x IN CASE WHEN ps IS NULL THEN [] ELSE [ps] END | MERGE (x)-[:SCHEDULED]->(f))
  RETURN f.id AS id
`;

export interface ScheduleCheckbackState {
  partsOn: boolean;
  sessionFound: boolean;
  partId: string | null;
  partStatus: string | null;
  paused: boolean;
  openId: string | null;
}

export interface ScheduleCheckbackDeps {
  state(sessionId: string): Promise<ScheduleCheckbackState>;
  /** The spine's own scheduler, then the link; the id written, or null (the type is off or missing). */
  schedule(input: ScheduleCheckbackInput, partId: string): Promise<string | null>;
}

export async function schedulePartCheckbackHandler(
  input: ScheduleCheckbackInput, deps: ScheduleCheckbackDeps,
): Promise<SchedulePartCheckbackResponse> {
  const st = await deps.state(input.sessionId);
  if (!st.partsOn) throw partsOff();
  if (!st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  if (!st.partId) throw new HttpsError('failed-precondition', 'Nothing kept to check back with');
  if (st.partStatus === 'set_aside') throw new HttpsError('failed-precondition', 'That part is set aside');
  if (st.paused) throw new HttpsError('failed-precondition', 'That part is resting after Louder');
  if (st.openId) return { id: st.openId };
  return { id: await deps.schedule(input, st.partId) };
}

export function scheduleCheckbackDeps(tx: ManagedTransaction, uid: string): ScheduleCheckbackDeps {
  return {
    async state(sessionId) {
      const r = (await tx.run(SCHEDULE_STATE_QUERY, { uid, sessionKey: userKey(uid, sessionId) })).records[0];
      const s = (k: string) => (typeof r?.get(k) === 'string' ? (r.get(k) as string) : null);
      return {
        partsOn: r?.get('partsOn') === true, sessionFound: r?.get('sessionFound') === true, partId: s('partId'),
        partStatus: s('partStatus'), paused: r?.get('paused') === true, openId: s('openId'),
      };
    },
    async schedule(input, partId) {
      const [id] = await scheduleTx(tx, uid, [input.item], { sourceSessionId: null, sourceToolId: 'meet-a-part' });
      if (!id) return null;
      await tx.run(LINK_CHECKBACK_QUERY, {
        uid, followUpKey: userKey(uid, id), partKey: userKey(uid, partId), sessionKey: userKey(uid, input.sessionId),
        partId, sessionId: input.sessionId,
      });
      return id;
    },
  };
}

// ---- The answer ----

export const ANSWER_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key})
  OPTIONAL MATCH (f)-[:CHECKS_BACK]->(pt:Part)
  OPTIONAL MATCH (pol:PartsPolicy {id: 'parts'})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, f.type AS type, f.status AS status,
         coalesce(${GUARDS.FollowUp.update('f')}, false) AS open, pt.id AS partId, pol.louderPauseHours AS louderPauseHours
`;

/** Resolves the check-back the way resolveFollowUp does (same guard, same outcome shape). */
export const RESOLVE_CHECKBACK_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key})
  WHERE f.type = '${PART_CHECKBACK_TYPE}' AND ${GUARDS.FollowUp.update('f')}
  SET f.status = $status, f.outcome = $outcome, f.harmSignal = $harmSignal, f.resolvedAt = datetime(), f.updatedAt = datetime()
  RETURN f.id AS id
`;

export interface AnswerCheckbackState {
  partsOn: boolean;
  type: string | null;
  status: string | null;
  open: boolean;
  partId: string | null;
  pauseHours: number;
}

export interface AnswerCheckbackDeps {
  state(id: string): Promise<AnswerCheckbackState>;
  resolve(id: string, status: string, answer: PartCheckbackAnswer): Promise<boolean>;
  pause(partId: string, hours: number): Promise<boolean>;
}

/**
 * One transaction: resolve (Settled / Same / Louder → done, Skip → dismissed, the answer in
 * `outcome`), and on Louder pause the part and mark the follow-up a harm signal for review. A repeat
 * after it's resolved changes nothing.
 */
export async function answerPartCheckbackHandler(
  input: { id: string; answer: PartCheckbackAnswer }, deps: AnswerCheckbackDeps,
): Promise<AnswerPartCheckbackResponse> {
  const st = await deps.state(input.id);
  if (!st.partsOn) throw partsOff();
  if (!st.type) throw new HttpsError('not-found', 'Follow-up not found');
  if (st.type !== PART_CHECKBACK_TYPE) throw new HttpsError('invalid-argument', 'Not a check-back');
  if (!st.open) return { status: st.status ?? 'done', aftercare: false };
  const status = CHECKBACK_STATUS[input.answer];
  if (!(await deps.resolve(input.id, status, input.answer))) return { status: st.status ?? 'done', aftercare: false };
  const louder = input.answer === 'louder';
  if (louder && st.partId) await deps.pause(st.partId, st.pauseHours);
  return { status, aftercare: louder };
}

export function answerCheckbackDeps(tx: ManagedTransaction, uid: string): AnswerCheckbackDeps {
  return {
    async state(id) {
      const r = (await tx.run(ANSWER_STATE_QUERY, { uid, key: userKey(uid, id) })).records[0];
      const s = (k: string) => (typeof r?.get(k) === 'string' ? (r.get(k) as string) : null);
      const hours = toNumber(r?.get('louderPauseHours'));
      return {
        partsOn: r?.get('partsOn') === true, type: s('type'), status: s('status'), open: r?.get('open') === true,
        partId: s('partId'), pauseHours: hours && hours > 0 ? hours : DEFAULT_LOUDER_PAUSE_HOURS,
      };
    },
    async resolve(id, status, answer) {
      return (await tx.run(RESOLVE_CHECKBACK_QUERY, {
        uid, key: userKey(uid, id), status, outcome: JSON.stringify({ choiceId: answer }), harmSignal: answer === 'louder',
      })).records.length > 0;
    },
    pause: (partId, hours) => pausePart(tx, uid, partId, hours),
  };
}

// ---- Today ----

/** Open check-backs, parts on only; the part's name comes from the slice, never from here. */
export const CHECKBACK_ITEMS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {type: '${PART_CHECKBACK_TYPE}', status: 'scheduled'})
  WHERE coalesce(u.partsEnabled, false)
    AND (f.snoozedUntil IS NULL OR f.snoozedUntil <= datetime())
    AND f.dueAt <= datetime() + duration({hours: 24})
  MATCH (f)-[:CHECKS_BACK]->(pt:Part)
  RETURN f.id AS id, toString(f.dueAt) AS dueAt, pt.id AS partId
  ORDER BY f.dueAt LIMIT 5
`;

export async function partCheckbackItems(tx: ManagedTransaction, uid: string, now: Date): Promise<TodayItem[]> {
  const res = await tx.run(CHECKBACK_ITEMS_QUERY, { uid });
  if (res.records.length === 0) return [];
  const t = (await readFollowUpTypes(tx)).find((x) => x.id === PART_CHECKBACK_TYPE);
  if (!t?.enabled) return [];
  // Parts off returns no parts at all; set-aside parts aren't in the slice: no card for either.
  const { parts } = await readProfileSlices(tx, uid, 'today', now.getTime());
  const byId = new Map(parts.map((p) => [p.id, p]));
  const items: TodayItem[] = [];
  for (const r of res.records) {
    const part = byId.get(r.get('partId') as string);
    const dueAt = r.get('dueAt') as string;
    const state = followUpState(dueAt, t.staleAfterHours, now.getTime());
    if (!part || !state) continue;
    items.push({
      id: r.get('id') as string, kind: 'follow_up', type: PART_CHECKBACK_TYPE, tier: t.tier, state, dueAt,
      resolveMode: 'inline', deepLink: null,
      choices: t.choices.map(({ id, label, status }) => ({ id, label, ...(status ? { status: status as 'done' } : {}) })),
      copy: t.copy, source: { toolId: 'meet-a-part' },
      part: { id: part.id, name: part.name, tender: part.tender },
    });
  }
  return items;
}

registerTodaySource(partCheckbackItems, [PART_CHECKBACK_TYPE]);
