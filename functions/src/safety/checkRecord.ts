/**
 * saveSafetyCheck: one visit to the safety route (CORE-01, docs/design/safety-route.md), as a
 * `:SafetyCheck:UserData:LogRecord` with `(:User)-[:HAS_SAFETY_CHECK]->`. Ids and enums only: nothing
 * about method is ever stored (not even whether something was taken or an injury: that only picks the
 * screen), and no own words.
 *
 * Finalise-once (userdata/lifecycle.ts GUARDS.SafetyCheck): created on the first answer, then upserted by
 * key while open and within SAFETY_CHECK_OPEN_HOURS of it, forward only:
 *   - `answer` only rises (ANSWER_RANK: plan → act after the medical question; never back to no);
 *   - `medical`, `country` and `morningCheck` are set once;
 *   - `meansAsked` / `usedPlan` only turn true, `meansActions` only grows;
 *   - `contacted` only moves from none / unknown to line / person;
 *   - `exit` closes it (frozen after).
 * A late or replayed write is a no-op. The client sends the whole state it holds each time.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { GUARDS } from '../userdata/lifecycle';
import { ANSWER_RANK, SAFETY_ANSWERS, type SafetyAnswer } from './safetyAsk';

export const SAFETY_SOURCES = ['checkin', 'diary', 'help_now', 'header', 'followup'] as const;
/** `module:<toolId>`: a tool's chip or rule opened it (safety.open from inside a skill). */
const MODULE_SOURCE = /^module:[a-z0-9][a-z0-9-]{0,59}$/;
export const MEDICAL = ['yes', 'no', 'not_sure'] as const;
export const MEANS_ACTIONS = ['other_room', 'give_someone', 'lock_away', 'leave_room', 'cant_now'] as const;
export const CONTACTED = ['line', 'person', 'none', 'unknown'] as const;
export const EXITS = ['plan', 'contacted', 'stop', 'nav_away'] as const;
export const MORNING_CHECK = ['yes', 'no'] as const;
const COUNTRY = /^[A-Z]{2}$/;
const CONTACT_RANK: Record<(typeof CONTACTED)[number], number> = { none: 0, unknown: 0, line: 1, person: 1 };

export interface SafetyCheckInput {
  id: string;
  source: string;
  sourceSessionId: string | null;
  answer: SafetyAnswer;
  medical: (typeof MEDICAL)[number] | null;
  meansAsked: boolean;
  meansActions: Array<(typeof MEANS_ACTIONS)[number]>;
  contacted: (typeof CONTACTED)[number] | null;
  usedPlan: boolean;
  exit: (typeof EXITS)[number] | null;
  morningCheck: (typeof MORNING_CHECK)[number] | null;
  country: string | null;
}

const FIELDS = ['id', 'source', 'sourceSessionId', 'answer', 'medical', 'meansAsked', 'meansActions', 'contacted', 'usedPlan', 'exit', 'morningCheck', 'country'];

const opt = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (v == null ? null : oneOf(v, allowed));
const bool = (v: unknown, k: string): boolean => {
  if (v == null) return false;
  if (typeof v !== 'boolean') throw new ValidationError(`${k}: expected true or false`);
  return v;
};

export function validateSafetyCheck(raw: unknown): SafetyCheckInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!FIELDS.includes(k)) throw new ValidationError(`${k}: not accepted`);
  if (typeof o.source !== 'string' || !((SAFETY_SOURCES as readonly string[]).includes(o.source) || MODULE_SOURCE.test(o.source))) {
    throw new ValidationError('source: not a safety route entry');
  }
  if (o.meansActions != null && !Array.isArray(o.meansActions)) throw new ValidationError('meansActions: expected a list');
  const meansActions = [...new Set(((o.meansActions as unknown[] | undefined) ?? []).map((x) => oneOf(x, MEANS_ACTIONS)))];
  if (o.country != null && (typeof o.country !== 'string' || !COUNTRY.test(o.country))) throw new ValidationError('country: a two-letter code');
  return {
    id: uuid(o.id),
    source: o.source,
    sourceSessionId: o.sourceSessionId == null ? null : uuid(o.sourceSessionId),
    answer: oneOf(o.answer, SAFETY_ANSWERS),
    medical: opt(o.medical, MEDICAL),
    meansAsked: bool(o.meansAsked, 'meansAsked'),
    meansActions,
    contacted: opt(o.contacted, CONTACTED),
    usedPlan: bool(o.usedPlan, 'usedPlan'),
    exit: opt(o.exit, EXITS),
    morningCheck: opt(o.morningCheck, MORNING_CHECK),
    country: (o.country as string | null | undefined) ?? null,
  };
}

/** Create on the first call; afterwards only the forward moves above, under the guard. */
export const SAVE_SAFETY_CHECK_QUERY = `
  ${MERGE_USER}
  WITH u
  OPTIONAL MATCH (prev:SafetyCheck {key: $key})
  WITH u, prev
  WHERE prev IS NULL OR (prev.ownerId = $uid AND ${GUARDS.SafetyCheck.update('prev')})
  MERGE (s:SafetyCheck {key: $key})
  ON CREATE SET s:UserData:LogRecord, s.id = $id, s.ownerId = $uid, s.createdAt = datetime(), s.schemaVersion = 1,
    s.at = datetime(), s.status = 'open', s.source = $source, s.sourceSessionId = $sourceSessionId,
    s.answer = $answer, s.answerRank = $rank, s.meansActions = [], s.meansAsked = false, s.usedPlan = false
  MERGE (u)-[:HAS_SAFETY_CHECK]->(s)
  SET s.answer = CASE WHEN $rank > s.answerRank THEN $answer ELSE s.answer END,
      s.answerRank = CASE WHEN $rank > s.answerRank THEN $rank ELSE s.answerRank END,
      s.medical = coalesce(s.medical, $medical),
      s.country = coalesce(s.country, $country),
      s.morningCheck = coalesce(s.morningCheck, $morningCheck),
      s.meansAsked = s.meansAsked OR $meansAsked,
      s.usedPlan = s.usedPlan OR $usedPlan,
      s.meansActions = s.meansActions + [x IN $meansActions WHERE NOT x IN s.meansActions],
      s.contacted = CASE WHEN $contacted IS NULL THEN s.contacted
                         WHEN s.contacted IN ['line', 'person'] THEN s.contacted
                         WHEN $contactRank > 0 OR s.contacted IS NULL THEN $contacted
                         ELSE s.contacted END,
      s.exit = coalesce(s.exit, $exit),
      s.status = CASE WHEN $exit IS NULL THEN s.status ELSE 'closed' END,
      s.closedAt = CASE WHEN $exit IS NULL OR s.closedAt IS NOT NULL THEN s.closedAt ELSE datetime() END
  RETURN s.id AS id, s.answer AS answer, s.status AS status
`;

export interface SaveSafetyCheckResponse {
  id: string;
  /** false when the record was already closed or past its window: nothing changed. */
  saved: boolean;
  answer: SafetyAnswer | null;
}

export function saveSafetyCheckParams(uid: string, email: string | null, s: SafetyCheckInput): Record<string, unknown> {
  return {
    uid, email, key: userKey(uid, s.id), id: s.id, source: s.source, sourceSessionId: s.sourceSessionId,
    answer: s.answer, rank: ANSWER_RANK[s.answer], medical: s.medical, country: s.country, morningCheck: s.morningCheck,
    meansAsked: s.meansAsked, usedPlan: s.usedPlan, meansActions: s.meansActions,
    contacted: s.contacted, contactRank: s.contacted ? CONTACT_RANK[s.contacted] : 0, exit: s.exit,
  };
}

export async function saveSafetyCheckTx(tx: ManagedTransaction, uid: string, email: string | null, s: SafetyCheckInput): Promise<SaveSafetyCheckResponse> {
  const r = (await tx.run(SAVE_SAFETY_CHECK_QUERY, saveSafetyCheckParams(uid, email, s))).records[0];
  if (!r) return { id: s.id, saved: false, answer: null };
  return { id: s.id, saved: true, answer: r.get('answer') as SafetyAnswer };
}
