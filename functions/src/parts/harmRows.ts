/**
 * One person's harm rows (harm.ts's `HarmRows`), read for the offer gate: the same records and the
 * same fields scripts/parts/report.cypher counts for everyone, for the caller only, over a window the
 * caller passes (the policy's harmWindowDays plus crisisPauseHours, so a crisis just after a visit at the
 * window's start is still seen). harm.ts applies the definitions; this file only reads.
 *
 * Reads: `FollowUp {type: 'part_checkback'}.resolvedAt` / `.harmSignal`; `PartSession.createdAt` /
 * `.stopReason` / `.blendCheck` / whether `.handoffsJson` is set; crisis-flagged `CheckIn.timestamp`;
 * `Part.createdAt`. Never any own-words field.
 */
import neo4j, { type ManagedTransaction } from 'neo4j-driver';
import { CHECKBACK_TYPE, type HarmPolicy, type HarmRows } from './harm';

export const HARM_ROWS_QUERY = `
  MATCH (u:User {id: $uid})
  WITH u, datetime() - duration({days: $days}) AS since
  CALL {
    WITH u, since
    OPTIONAL MATCH (u)-[:HAS_FOLLOW_UP]->(f:FollowUp {type: '${CHECKBACK_TYPE}'})
    WHERE f.resolvedAt >= since
    RETURN collect(CASE WHEN f IS NULL THEN null ELSE {at: toString(f.resolvedAt), harmSignal: f.harmSignal = true} END) AS checkbacks
  }
  CALL {
    WITH u, since
    OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession)
    WHERE ps.createdAt >= since
    RETURN collect(CASE WHEN ps IS NULL THEN null ELSE {at: toString(ps.createdAt), stopReason: ps.stopReason,
      blendCheck: ps.blendCheck, p2: ps.handoffsJson IS NOT NULL} END) AS sessions
  }
  CALL {
    WITH u, since
    OPTIONAL MATCH (c:CheckIn {ownerId: u.id})
    WHERE c.safetyFlagId IS NOT NULL AND c.timestamp >= since
    RETURN collect(CASE WHEN c IS NULL THEN null ELSE {at: toString(c.timestamp)} END) AS crisisCheckIns
  }
  CALL {
    WITH u, since
    OPTIONAL MATCH (u)-[:HAS_PART]->(p:Part)
    WHERE p.createdAt >= since
    RETURN collect(CASE WHEN p IS NULL THEN null ELSE {at: toString(p.createdAt)} END) AS partsMade
  }
  RETURN checkbacks, sessions, crisisCheckIns, partsMade
`;

export const EMPTY_HARM_ROWS: HarmRows = { checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] };

/** Days to read so every signal in the window is seen (a crisis may fall up to crisisPauseHours later). */
export const harmReadDays = (p: HarmPolicy): number => Math.ceil(p.windowDays + p.crisisPauseHours / 24);

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : []);
const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export async function readHarmRows(tx: ManagedTransaction, uid: string, policy: HarmPolicy): Promise<HarmRows> {
  const r = (await tx.run(HARM_ROWS_QUERY, { uid, days: neo4j.int(harmReadDays(policy)) })).records[0];
  if (!r) return EMPTY_HARM_ROWS;
  return {
    checkbacks: list<Record<string, unknown>>(r.get('checkbacks')).map((x) => ({ at: s(x.at) ?? '', harmSignal: x.harmSignal === true })),
    sessions: list<Record<string, unknown>>(r.get('sessions')).map((x) => ({
      at: s(x.at) ?? '', stopReason: s(x.stopReason), blendCheck: s(x.blendCheck), p2: x.p2 === true,
    })),
    crisisCheckIns: list<Record<string, unknown>>(r.get('crisisCheckIns')).map((x) => ({ at: s(x.at) ?? '' })),
    partsMade: list<Record<string, unknown>>(r.get('partsMade')).map((x) => ({ at: s(x.at) ?? '' })),
  };
}
