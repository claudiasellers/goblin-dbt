/**
 * The query layer behind getPartsEntry: Cypher plus record → value mapping, nothing else.
 * Every user read is the caller's own (`ownerId: $uid`) and returns booleans or a count: no record
 * ids, timestamps or emotion data leave this file. Windows are parameters, never interpolated.
 */
import neo4j from 'neo4j-driver';
import { readTx } from '../shared/neo4j';
import { toNumber } from '../shared/values';
import type { PartsEntryDeps } from './handler';

/**
 * PartsPolicy's thresholds and Recover's flooded line, in one read. Either node may be missing
 * (then gate.ts's defaults apply). PartsPolicy is still a draft as content; its numbers are used
 * anyway, since they only ever make the gate more careful.
 */
export const POLICY_QUERY = `
  OPTIONAL MATCH (p:PartsPolicy {id: 'parts'})
  OPTIONAL MATCH (f:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow'})
  RETURN p.floodGateHours AS floodGateHours, p.dissociationCount AS dissociationCount,
         p.dissociationDays AS dissociationDays, f.contentJson AS recoverFlow
`;

/**
 * Flood window: a check-in that matched flooding (the pattern, or the spiraling answer) or carried a
 * crisis flag; a Recover session (saved at its end) whose start or end reading was at or over its
 * flooded line.
 */
export const RECENT_QUERY = `
  OPTIONAL MATCH (c:CheckIn {ownerId: $uid})
  WHERE c.timestamp >= datetime() - duration({hours: $hours})
  WITH count(CASE WHEN c.activationPatternId = 'emotional_flooding'
                    OR 'hu_exp_flooding' IN coalesce(c.discResponseIds, []) THEN 1 END) > 0 AS checkinFlooding,
       count(CASE WHEN c.safetyFlagId IS NOT NULL THEN 1 END) > 0 AS checkinCrisis
  OPTIONAL MATCH (s:InvalidationRecoverySession {ownerId: $uid})
  WHERE s.createdAt >= datetime() - duration({hours: $hours})
    AND (s.startIntensity >= $downshiftAt OR s.endIntensity >= $downshiftAt)
  RETURN checkinFlooding, checkinCrisis, count(s) > 0 AS recoverLoud
`;

/** Dissociation window: the shutdown pair as the check-in's pattern. */
export const DISSOCIATION_QUERY = `
  MATCH (c:CheckIn {ownerId: $uid})
  WHERE c.timestamp >= datetime() - duration({days: $days})
    AND c.activationPatternId IN ['dissociation_overmodulation', 'conservation_freeze']
  RETURN count(c) AS n
`;

/** Recover's `gates.downshiftAt` from its flow JSON, or null. */
export function recoverDownshiftAt(contentJson: unknown): number | null {
  if (typeof contentJson !== 'string') return null;
  try {
    const v = (JSON.parse(contentJson) as { gates?: { downshiftAt?: unknown } })?.gates?.downshiftAt;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Whole numbers go as Neo4j integers (like insights' days); a tuned fractional value stays a float. */
const num = (n: number) => (Number.isInteger(n) ? neo4j.int(n) : n);

const read = (query: string, params: Record<string, unknown>) => readTx((tx) => tx.run(query, params)).then((res) => res.records);

/** The production query layer for one user. */
export function graphDeps(uid: string): PartsEntryDeps {
  return {
    async policy() {
      const r = (await read(POLICY_QUERY, {}))[0];
      if (!r) return null;
      return {
        floodGateHours: toNumber(r.get('floodGateHours')),
        dissociationCount: toNumber(r.get('dissociationCount')),
        dissociationDays: toNumber(r.get('dissociationDays')),
        recoverDownshiftAt: recoverDownshiftAt(r.get('recoverFlow')),
      };
    },
    async recent(hours, downshiftAt) {
      const r = (await read(RECENT_QUERY, { uid, hours: num(hours), downshiftAt: num(downshiftAt) }))[0];
      return {
        checkinFlooding: r?.get('checkinFlooding') === true,
        checkinCrisis: r?.get('checkinCrisis') === true,
        recoverLoud: r?.get('recoverLoud') === true,
      };
    },
    async dissociation(days) {
      const r = (await read(DISSOCIATION_QUERY, { uid, days: num(days) }))[0];
      return toNumber(r?.get('n')) ?? 0;
    },
  };
}
