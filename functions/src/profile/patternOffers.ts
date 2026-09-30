/**
 * Pattern promotion (PR-P1; CORE-owned). The app offers, the user decides (rule 4): a rule over
 * the log creates a PatternOffer (log); only answerPatternOffer's "yes" creates a MyPattern
 * (profile), with ACCEPTED_FROM → the offer. Rules ship enabled: false (D-10: switch on after four
 * weeks of ToolSession data, reviewed on real counts).
 *
 * Evaluation is lazy: when Today loads, at most once a day per user (User.patternsEvaluatedAt).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx, writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { obj, oneOf, str } from '../shared/validate';
import { int } from '../shared/values';
import { GUARDS } from '../userdata/lifecycle';
import { userKey } from '../userdata/ownership';
import { registerTodayPrepare, registerTodaySource } from '../spine/today';
import type { TodayItem } from '../spine/todayOrder';
import type { PatternOfferAnswer } from './types';

export interface PatternRule {
  id: string;
  patternKind: 'what_helps';
  windowDays: number;
  minEvidence: number;
  ofLast: number;
  cooldownDays: number;
  enabled: boolean;
  statementTemplate: string;
  offerCopy: string;
}

export interface SessionEvidence { id: string; toolId: string; patternId: string | null; thenVsNow: string | null; at: string }
export interface ExistingOffer { ruleId: string; toolId: string; patternId: string | null; status: string; offeredAt: string; cooldownUntil: string | null }
export interface OfferCandidate { ruleId: string; patternKind: string; toolId: string; patternId: string; evidenceIds: string[] }

const DAY = 86_400_000;
/** App-wide: at most one new offer a week. */
export const OFFER_EVERY_DAYS = 7;

/**
 * Pure rule evaluation. For each (tool, pattern) in the window, the last `ofLast` answered closes:
 * `minEvidence` or more better / much better → a candidate. Never re-offer a declined or accepted
 * (tool, pattern) for the rule, never while one is pending or cooling down, and at most one new
 * offer a week app-wide. Returns at most one candidate (the strongest, then the most recent).
 */
export function evaluateRule(sessions: SessionEvidence[], rule: PatternRule, offers: ExistingOffer[], now: number): OfferCandidate | null {
  if (!rule.enabled) return null;
  if (offers.some((o) => Date.parse(o.offeredAt) > now - OFFER_EVERY_DAYS * DAY)) return null;
  const blocked = new Set(offers.filter((o) => o.ruleId === rule.id && (o.status !== 'offered' || !o.cooldownUntil || Date.parse(o.cooldownUntil) > now))
    .map((o) => `${o.toolId}|${o.patternId}`));
  const groups = new Map<string, SessionEvidence[]>();
  for (const s of sessions) {
    if (!s.patternId || !s.thenVsNow || Date.parse(s.at) < now - rule.windowDays * DAY) continue;
    const k = `${s.toolId}|${s.patternId}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
  }
  let best: (OfferCandidate & { hits: number; last: number }) | null = null;
  for (const [k, list] of groups) {
    if (blocked.has(k)) continue;
    const lastN = [...list].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, rule.ofLast);
    const hits = lastN.filter((s) => s.thenVsNow === 'better' || s.thenVsNow === 'much_better');
    if (hits.length < rule.minEvidence) continue;
    const last = Date.parse(lastN[0].at);
    if (!best || hits.length > best.hits || (hits.length === best.hits && last > best.last)) {
      best = { ruleId: rule.id, patternKind: rule.patternKind, toolId: lastN[0].toolId, patternId: lastN[0].patternId!, evidenceIds: hits.map((h) => h.id), hits: hits.length, last };
    }
  }
  if (!best) return null;
  const { hits: _h, last: _l, ...candidate } = best;
  void _h; void _l;
  return candidate;
}

async function readRules(tx: ManagedTransaction): Promise<PatternRule[]> {
  const r = await tx.run(`MATCH (p:PatternRule) RETURN p {.*} AS p`);
  return r.records.map((rec) => {
    const p = rec.get('p') as Record<string, unknown>;
    return {
      id: String(p.id), patternKind: 'what_helps', windowDays: int(p.windowDays), minEvidence: int(p.minEvidence),
      ofLast: int(p.ofLast), cooldownDays: int(p.cooldownDays), enabled: p.enabled === true,
      statementTemplate: String(p.statementTemplate ?? ''), offerCopy: String(p.offerCopy ?? ''),
    };
  });
}

/** Today prepare step: evaluate enabled rules at most once a day; writes only PatternOffers. */
export async function evaluatePatternOffers(uid: string, now: Date): Promise<void> {
  const state = await readTx(async (tx) => {
    const rules = (await readRules(tx)).filter((r) => r.enabled);
    if (!rules.length) return null;
    const u = await tx.run(`MATCH (u:User {id: $uid}) RETURN toString(u.patternsEvaluatedAt) AS at`, { uid });
    const last = u.records[0]?.get('at') as string | null | undefined;
    if (last && Date.parse(last) > now.getTime() - DAY) return null;
    const maxDays = Math.max(...rules.map((r) => r.windowDays));
    const s = await tx.run(
      `MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession)
       WHERE ts.thenVsNow IS NOT NULL AND coalesce(ts.endedAt, ts.startedAt) > datetime() - duration({days: $days})
       RETURN ts.id AS id, ts.toolId AS toolId, ts.patternId AS patternId, ts.thenVsNow AS thenVsNow,
              toString(coalesce(ts.endedAt, ts.startedAt)) AS at`,
      { uid, days: maxDays },
    );
    const o = await tx.run(
      `MATCH (:User {id: $uid})-[:HAS_PATTERN_OFFER]->(o:PatternOffer)
       RETURN o.ruleId AS ruleId, o.toolId AS toolId, o.patternId AS patternId, o.status AS status,
              toString(o.offeredAt) AS offeredAt, toString(o.cooldownUntil) AS cooldownUntil`,
      { uid },
    );
    return {
      rules,
      sessions: s.records.map((r) => r.toObject() as unknown as SessionEvidence),
      offers: o.records.map((r) => r.toObject() as unknown as ExistingOffer),
    };
  });
  if (!state) return;
  let candidate: OfferCandidate | null = null;
  for (const rule of state.rules) {
    candidate = evaluateRule(state.sessions, rule, state.offers, now.getTime());
    if (candidate) break;
  }
  await writeTx(async (tx) => {
    if (candidate) {
      const id = `${candidate.ruleId}:${candidate.toolId}:${candidate.patternId}`;
      await tx.run(
        `MATCH (u:User {id: $uid})
         MERGE (o:PatternOffer {key: $key})
         ON CREATE SET o:UserData:LogRecord, o.id = $id, o.ownerId = $uid, o.createdAt = datetime(), o.schemaVersion = 1,
           o.ruleId = $ruleId, o.patternKind = $patternKind, o.toolId = $toolId, o.patternId = $patternId,
           o.evidenceIds = $evidenceIds, o.status = 'offered', o.offeredAt = datetime()
         MERGE (u)-[:HAS_PATTERN_OFFER]->(o)`,
        { uid, key: userKey(uid, id), id, ...candidate },
      );
    }
    await tx.run(`MATCH (u:User {id: $uid}) SET u.patternsEvaluatedAt = datetime()`, { uid });
  });
}

/** Today source: open offers not cooling down, as pattern_offer cards (tier skills). */
export async function patternOfferItems(tx: ManagedTransaction, uid: string): Promise<TodayItem[]> {
  const r = await tx.run(
    `MATCH (t:FollowUpType {id: 'pattern_offer'}) WHERE t.enabled = true
     MATCH (:User {id: $uid})-[:HAS_PATTERN_OFFER]->(o:PatternOffer {status: 'offered'})
     WHERE o.cooldownUntil IS NULL OR o.cooldownUntil <= datetime()
     OPTIONAL MATCH (p:PatternRule {id: o.ruleId})
     RETURN o.id AS id, o.toolId AS toolId, toString(o.offeredAt) AS at, p.statementTemplate AS statement,
            p.offerCopy AS offerCopy, t.contentJson AS content
     ORDER BY o.offeredAt DESC LIMIT 1`,
    { uid },
  );
  return r.records.map((rec) => {
    const content = JSON.parse((rec.get('content') as string | null) ?? '{}') as { choices?: Array<{ id: string; label: string }> };
    return {
      id: rec.get('id') as string, kind: 'pattern_offer', type: 'pattern_offer', tier: 'skills', state: 'due',
      dueAt: rec.get('at') as string, resolveMode: 'inline', deepLink: null,
      choices: (content.choices ?? []).map(({ id, label }) => ({ id, label })),
      copy: { title: (rec.get('statement') as string | null) ?? '', body: (rec.get('offerCopy') as string | null) ?? undefined },
      source: { toolId: (rec.get('toolId') as string | null) ?? undefined },
    } satisfies TodayItem;
  });
}

registerTodayPrepare((uid, now) => evaluatePatternOffers(uid, now));
registerTodaySource((tx, uid) => patternOfferItems(tx, uid));

/**
 * The user's answer. yes → a MyPattern (profile) ACCEPTED_FROM the offer; not now → cooldown;
 * no → declined, never offered again for this rule + tool + pattern. The only writer of MyPattern.
 */
export const answerPatternOffer = callable<unknown, { version: number | null; status: string }>(
  { auth: 'required', label: 'answerPatternOffer', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const a = parseOrInvalid(() => {
      const d = obj(data);
      return { id: str(d.id, { max: 200 }), answer: oneOf(d.answer, ['yes', 'not_now', 'no'] as const satisfies readonly PatternOfferAnswer[]) };
    }, 'Invalid answer');
    const key = userKey(uid as string, a.id);
    return writeTx(async (tx) => {
      if (a.answer === 'yes') {
        const r = await tx.run(
          `MATCH (u:User {id: $uid})-[:HAS_PATTERN_OFFER]->(o:PatternOffer {key: $key})
           WHERE ${GUARDS.PatternOffer.answer('o')}
           MATCH (k:ProfileKind {id: o.patternKind})
           SET o.status = 'accepted', o.answeredAt = datetime()
           MERGE (m:MyPattern {key: $uid + ':' + o.id})
           ON CREATE SET m:UserData:ProfileItem, m.id = o.id, m.ownerId = $uid, m.kind = o.patternKind, m.area = k.area,
                         m.patternKind = o.patternKind, m.toolId = o.toolId, m.patternId = o.patternId, m.statementId = o.ruleId,
                         m.status = 'active', m.source = 'offer', m.createdAt = datetime(), m.confirmedAt = datetime(),
                         m.revisitAt = datetime() + duration({days: k.revisitAfterDays}), m.reviewCount = 0, m.schemaVersion = 1
           MERGE (u)-[:HAS_PATTERN]->(m)
           MERGE (m)-[:ACCEPTED_FROM]->(o)
           SET u.profileVersion = coalesce(u.profileVersion, 0) + 1
           RETURN u.profileVersion AS version`,
          { uid, key },
        );
        const rec = r.records[0];
        if (!rec) throw new HttpsError('failed-precondition', 'This offer was already answered');
        return { version: int(rec.get('version')), status: 'accepted' };
      }
      const r = await tx.run(
        `MATCH (:User {id: $uid})-[:HAS_PATTERN_OFFER]->(o:PatternOffer {key: $key})
         WHERE ${GUARDS.PatternOffer.answer('o')}
         OPTIONAL MATCH (p:PatternRule {id: o.ruleId})
         SET o.status = CASE WHEN $answer = 'no' THEN 'declined' ELSE o.status END,
             o.answeredAt = CASE WHEN $answer = 'no' THEN datetime() ELSE o.answeredAt END,
             o.cooldownUntil = CASE WHEN $answer = 'not_now' THEN datetime() + duration({days: coalesce(p.cooldownDays, 14)}) ELSE o.cooldownUntil END
         RETURN o.status AS status`,
        { uid, key, answer: a.answer },
      );
      const rec = r.records[0];
      if (!rec) throw new HttpsError('failed-precondition', 'This offer was already answered');
      return { version: null, status: rec.get('status') as string };
    });
  },
);
