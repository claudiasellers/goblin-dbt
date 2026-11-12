/**
 * When the check-in asks the safety question (CORE-01 entry 2, docs/design/safety-route.md). Pure apart
 * from the query runner `evaluateSafetyAsk` is given; `safetyAskFor` is the rule.
 *
 * Asked (only while SafetyPolicy {id: 'safety_route'} is enabled) when the result is unpleasant and any of:
 *   - `pattern`: the winning or co-occurring pattern ASKS_SAFETY (schema/safety-route.cypher; the
 *     low-unpleasant patterns included);
 *   - `word`: a picked word has `Emotion.safetyScreen`;
 *   - `flooded_history`: the band is flooded and the person has ever answered above *no*;
 *   - `recent_answer`: their last answer, within 72 h, was anything but *no* (asked every time then).
 * Never within 12 h of a *no* (unless a later answer was something else). Nothing is ever inferred
 * from the answer to the next check-in: the person is asked.
 *
 * The answer comes back through saveSafetyCheck (./checkRecord.ts). A signed-out check-in never
 * reaches here (getStateAndTools is signed-in only); the client keeps its own device-only rule.
 */
import type { QueryRunner } from './checkinSafetyFlag';

export const SAFETY_VERSION = 'safety-v1';

export const SAFETY_ANSWERS = ['no', 'declined', 'passing', 'strong', 'plan', 'act'] as const;
export type SafetyAnswer = (typeof SAFETY_ANSWERS)[number];
/** An answer only ever moves up (plan → act after the medical question). */
export const ANSWER_RANK: Readonly<Record<SafetyAnswer, number>> = { no: 0, declined: 1, passing: 1, strong: 2, plan: 3, act: 4 };

export const REPEAT_AFTER_NO_HOURS = 12;
export const REPEAT_AFTER_OTHER_HOURS = 72;

export type SafetyAskReason = 'pattern' | 'word' | 'flooded_history' | 'recent_answer';

export interface SafetyAsk {
  ask: boolean;
  reasons: SafetyAskReason[];
}

export interface SafetyHistory {
  /** The newest SafetyCheck's answer and time (ms), or nulls. */
  lastAnswer: SafetyAnswer | null;
  lastAt: number | null;
  /** Whether any of the person's SafetyChecks was above *no*. */
  anyAboveNo: boolean;
}

export interface SafetyAskInput {
  quadrant: string;
  patternAsks: boolean;
  wordScreens: boolean;
  band: string | null;
  history: SafetyHistory;
  now: number;
}

const HOUR = 3_600_000;
const NO_ASK: SafetyAsk = { ask: false, reasons: [] };

/** Whether this quadrant can be asked at all (every unpleasant one; pleasant results never). */
export function asksQuadrant(quadrant: string): boolean {
  return quadrant === 'high-unpleasant' || quadrant === 'low-unpleasant';
}

export function safetyAskFor(i: SafetyAskInput): SafetyAsk {
  if (!asksQuadrant(i.quadrant)) return NO_ASK;
  const { lastAnswer, lastAt, anyAboveNo } = i.history;
  const age = lastAt == null ? Infinity : i.now - lastAt;
  const reasons: SafetyAskReason[] = [];
  if (i.patternAsks) reasons.push('pattern');
  if (i.wordScreens) reasons.push('word');
  if (i.band === 'flooded' && anyAboveNo) reasons.push('flooded_history');
  if (lastAnswer && lastAnswer !== 'no' && age <= REPEAT_AFTER_OTHER_HOURS * HOUR) reasons.push('recent_answer');
  if (!reasons.length) return NO_ASK;
  if (lastAnswer === 'no' && age < REPEAT_AFTER_NO_HOURS * HOUR) return NO_ASK;
  return { ask: true, reasons };
}

export const SAFETY_POLICY_QUERY = `
  OPTIONAL MATCH (p:SafetyPolicy {id: 'safety_route'})
  RETURN coalesce(p.enabled, false) AS enabled
`;

/** The graph side: does a pattern ask, does a word screen. */
export const SAFETY_ASK_GRAPH_QUERY = `
  OPTIONAL MATCH (p:ActivationPattern)-[:ASKS_SAFETY]->(:SafetyScreenFlow)
  WHERE p.id IN $patternIds
  WITH count(p) > 0 AS patternAsks
  OPTIONAL MATCH (e:Emotion)
  WHERE e.id IN $emotionIds AND e.safetyScreen = true
  RETURN patternAsks, count(e) > 0 AS wordScreens
`;

/** The person's side: the newest answer and whether any was above no. Ids and enums only. */
export const SAFETY_HISTORY_QUERY = `
  OPTIONAL MATCH (:User {id: $uid})-[:HAS_SAFETY_CHECK]->(s:SafetyCheck)
  WITH s ORDER BY s.at DESC
  WITH collect(s) AS all
  RETURN CASE WHEN size(all) = 0 THEN null ELSE all[0].answer END AS lastAnswer,
         CASE WHEN size(all) = 0 THEN null ELSE toString(all[0].at) END AS lastAt,
         any(x IN all WHERE x.answer <> 'no') AS anyAboveNo
`;

export async function safetyPolicyEnabled(tx: QueryRunner): Promise<boolean> {
  const r = (await tx.run(SAFETY_POLICY_QUERY, {})).records[0];
  return r ? r.get('enabled') === true : false;
}

const asAnswer = (v: unknown): SafetyAnswer | null =>
  typeof v === 'string' && (SAFETY_ANSWERS as readonly string[]).includes(v) ? (v as SafetyAnswer) : null;

export async function evaluateSafetyAsk(
  tx: QueryRunner,
  uid: string,
  a: { quadrant: string; patternIds: string[]; emotionIds: string[]; band: string | null },
  now: number = Date.now(),
): Promise<SafetyAsk> {
  if (!asksQuadrant(a.quadrant)) return NO_ASK;
  const g = (await tx.run(SAFETY_ASK_GRAPH_QUERY, { patternIds: a.patternIds, emotionIds: a.emotionIds })).records[0];
  const h = (await tx.run(SAFETY_HISTORY_QUERY, { uid })).records[0];
  const lastAt = h ? Date.parse(String(h.get('lastAt'))) : NaN;
  return safetyAskFor({
    quadrant: a.quadrant,
    patternAsks: g ? g.get('patternAsks') === true : false,
    wordScreens: g ? g.get('wordScreens') === true : false,
    band: a.band,
    history: {
      lastAnswer: h ? asAnswer(h.get('lastAnswer')) : null,
      lastAt: Number.isNaN(lastAt) ? null : lastAt,
      anyAboveNo: h ? h.get('anyAboveNo') === true : false,
    },
    now,
  });
}
