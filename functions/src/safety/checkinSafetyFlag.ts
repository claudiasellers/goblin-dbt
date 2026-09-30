/**
 * The check-in result's safety flag: the single seam the safety batch replaces (CORE-01
 * `safety.open`). Moved verbatim from getStateAndTools' phase 5 (plan E4-1); behaviour unchanged:
 *   - low-unpleasant results are never flagged (no query at all);
 *   - otherwise the pattern's first TRIGGERS_SAFETY flag (`LIMIT 1`); the edge's `condition` is
 *     not evaluated.
 * The client renders a `crisis` flag as the non-blocking CrisisBanner above the result (A0-1, R12).
 * Pure apart from the query runner it is given.
 */
import type { SafetyFlag } from '../recommendation/types';

export interface QueryRunner {
  run(query: string, params?: Record<string, unknown>): Promise<{ records: Array<{ get(key: string): unknown }> }>;
}

export const SAFETY_FLAG_QUERY = `
  MATCH (p:ActivationPattern {id: $patternId})-[:TRIGGERS_SAFETY]->(sf:SafetyFlag)
  RETURN sf.id as id, sf.type as type, sf.trigger as trigger, sf.action as action
  LIMIT 1
`;

/** Whether this quadrant is checked for a safety flag at all. */
export function checksSafety(quadrant: string): boolean {
  return quadrant !== 'low-unpleasant';
}

/** The pure twin (golden tests): `flags` in the graph's order; the first one wins. */
export function safetyFlagFor(quadrant: string, flags: readonly SafetyFlag[]): SafetyFlag | undefined {
  if (!checksSafety(quadrant)) return undefined;
  return flags[0];
}

export async function evaluateSafetyFlag(tx: QueryRunner, patternId: string, quadrant: string): Promise<SafetyFlag | undefined> {
  if (!checksSafety(quadrant)) return undefined;
  const res = await tx.run(SAFETY_FLAG_QUERY, { patternId });
  const rows = res.records.map((r) => ({
    id: r.get('id') as string,
    type: r.get('type') as string,
    trigger: r.get('trigger') as string,
    action: r.get('action') as string,
  }));
  return safetyFlagFor(quadrant, rows);
}
