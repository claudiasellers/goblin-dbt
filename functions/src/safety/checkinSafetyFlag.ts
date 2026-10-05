/**
 * The check-in result's safety flag: the single seam the safety batch replaces (CORE-01
 * `safety.open`). Moved verbatim from getStateAndTools' phase 5 (plan E4-1); Oct 2026 adds the
 * spiral path's safety question (schema/checkin-safety.cypher):
 *   - an answer that RAISES_SAFETY (Yes / Not sure to "thoughts of hurting yourself or ending your
 *     life") returns that flag as the full banner, whatever the pattern or quadrant: an explicit
 *     signal is never gated;
 *   - otherwise low-unpleasant results are never flagged (no query at all);
 *   - otherwise the pattern's first TRIGGERS_SAFETY flag (`LIMIT 1`). When that edge says
 *     `withoutSignal: "line"` (flooding's crisis_self_harm: its condition needs intent the person
 *     didn't report), the flag comes back with `level: 'line'`, a calm line with 988 instead of the
 *     banner. The edge's `condition` text itself is still not evaluated.
 * The client renders `crisis` as the non-blocking CrisisBanner above the result (A0-1, R12), or the
 * SafetyLine for level 'line'. An app from before `level` shows the banner: the safe direction.
 * Pure apart from the query runner it is given.
 */
import type { SafetyFlag } from '../recommendation/types';

export interface QueryRunner {
  run(query: string, params?: Record<string, unknown>): Promise<{ records: Array<{ get(key: string): unknown }> }>;
}

export const SAFETY_FLAG_QUERY = `
  MATCH (p:ActivationPattern {id: $patternId})-[t:TRIGGERS_SAFETY]->(sf:SafetyFlag)
  RETURN sf.id as id, sf.type as type, sf.trigger as trigger, sf.action as action, t.withoutSignal as withoutSignal
  LIMIT 1
`;

/** A flag raised outright by an answer (checkin-safety.cypher RAISES_SAFETY). */
export const RAISED_SAFETY_QUERY = `
  MATCH (r:QuestionResponse)-[:RAISES_SAFETY]->(sf:SafetyFlag)
  WHERE r.id IN $responseIds
  RETURN sf.id as id, sf.type as type, sf.trigger as trigger, sf.action as action, null as withoutSignal
  ORDER BY sf.id
  LIMIT 1
`;

/** A flag row as the graph stores it: the flag plus its edge's `withoutSignal`. */
export interface SafetyFlagRow {
  id: string;
  type: string;
  trigger: string;
  action: string;
  withoutSignal?: string | null;
}

/** Whether this quadrant is checked for a pattern's safety flag at all. */
export function checksSafety(quadrant: string): boolean {
  return quadrant !== 'low-unpleasant';
}

const asFlag = (f: SafetyFlagRow): SafetyFlag => ({ id: f.id, type: f.type, trigger: f.trigger, action: f.action });

/**
 * The pure twin (golden tests): `flags` are the pattern's in the graph's order (the first one wins);
 * `raised` are the flags the answers raised. A raised flag wins, as the banner; a pattern flag whose
 * edge says withoutSignal "line" comes back as the line.
 */
export function safetyFlagFor(
  quadrant: string, flags: readonly SafetyFlagRow[], raised: readonly SafetyFlagRow[] = [],
): SafetyFlag | undefined {
  if (raised.length) return asFlag(raised[0]);
  if (!checksSafety(quadrant)) return undefined;
  const f = flags[0];
  if (!f) return undefined;
  return f.withoutSignal === 'line' ? { ...asFlag(f), level: 'line' } : asFlag(f);
}

const rowsOf = (res: { records: Array<{ get(key: string): unknown }> }): SafetyFlagRow[] => res.records.map((r) => ({
  id: r.get('id') as string,
  type: r.get('type') as string,
  trigger: r.get('trigger') as string,
  action: r.get('action') as string,
  withoutSignal: (r.get('withoutSignal') as string | null) ?? null,
}));

export async function evaluateSafetyFlag(
  tx: QueryRunner, patternId: string, quadrant: string, responseIds: readonly string[] = [],
): Promise<SafetyFlag | undefined> {
  const raised = responseIds.length ? rowsOf(await tx.run(RAISED_SAFETY_QUERY, { responseIds: [...responseIds] })) : [];
  if (raised.length) return safetyFlagFor(quadrant, [], raised);
  if (!checksSafety(quadrant)) return undefined;
  return safetyFlagFor(quadrant, rowsOf(await tx.run(SAFETY_FLAG_QUERY, { patternId })));
}
