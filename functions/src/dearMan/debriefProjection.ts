import type { ManagedTransaction } from 'neo4j-driver';
import { encryptOwn } from '../shared/crypto';
import { GUARDS } from '../userdata/lifecycle';
import { personRoute, storedRisk } from '../safety/personSafety';
import type { ProjectionInput } from '../skills/projections';

/**
 * DEAR MAN's debrief on the skill player (IE-B2, docs/design/dear-man-debrief.md): the run (`ext.run`, skill
 * `dear_man_debrief`) projected into the records other code reads, in the close's transaction (plan C3a R14):
 *
 *   - the legacy `DearManSession {type: 'debrief'}` (id = the ToolSession's, `DETAIL` from it), which history, the
 *     parts moves (parts/sessionMoves.ts) and trails read;
 *   - the `Interaction` (log; IE-03's interaction log), when the outcome was answered, `WITH` the person;
 *   - the person's refusal counts (`Person.refusalsValidation` / `refusalsPractical`), written only when the
 *     Interaction is first created (a re-close never counts twice), and only with a prep to say what was asked;
 *   - `DEBRIEFS` to the prep it debriefs: the prep whose `ask_outcome` card opened this visit, else the person's
 *     latest prep in the last 14 days.
 *
 * Pure parts (`debriefFields`, `refusalChange`) are exported for the unit tests. Only the caller's own records.
 */

type Answer = { fieldId?: unknown; optionIds?: unknown; valueOwn?: unknown };

/** The run's answers by field: option ids, and own words. */
export function answersOf(run: Record<string, unknown>): Record<string, { ids: string[]; own: string | null }> {
  const out: Record<string, { ids: string[]; own: string | null }> = {};
  const list = Array.isArray(run.answers) ? (run.answers as Answer[]) : [];
  for (const a of list) {
    if (!a || typeof a.fieldId !== 'string') continue;
    const ids = Array.isArray(a.optionIds) ? a.optionIds.filter((x): x is string => typeof x === 'string') : [];
    out[a.fieldId] = { ids, own: typeof a.valueOwn === 'string' && a.valueOwn.trim() ? a.valueOwn : null };
  }
  return out;
}

/** The old debrief's one-word overall, from the outcome (getDearManSessions' readers know these four). */
export const OVERALL_OF: Readonly<Record<string, string>> = {
  got_it: 'better', partly: 'mixed', no: 'not_well', no_answer: 'not_well',
};

export interface DebriefFields {
  happened: string | null;
  outcome: string | null;
  relationshipOk: string | null;
  selfRespect: string | null;
  factorId: string | null;
  debriefOverall: string | null;
  debriefCurrentFeelings: string[];
  turningPointIds: string[];
  momentResponseIds: string[];
  bodySignalIds: string[];
  thoughtPatternIds: string[];
  underneathIds: string[];
  copeAheadId: string | null;
  reflectionLanded: string | null;
  /** Own words ("Something else" on the thoughts), plaintext here: encrypted before it is stored. */
  thoughtOwn: string | null;
}

/** The DearManSession fields from a debrief run. */
export function debriefFields(run: Record<string, unknown>): DebriefFields {
  const a = answersOf(run);
  const one = (f: string) => a[f]?.ids[0] ?? null;
  const many = (f: string) => a[f]?.ids ?? [];
  const happened = one('happened');
  const outcome = happened === 'yes' ? one('outcome') : null;
  const factor = one('factor');
  return {
    happened,
    outcome,
    relationshipOk: one('between'),
    selfRespect: one('proud'),
    factorId: factor && factor !== 'look' ? factor : null,
    debriefOverall: happened === 'not_yet' || happened === 'decided_not' ? 'didnt_have' : outcome ? OVERALL_OF[outcome] ?? null : null,
    debriefCurrentFeelings: many('feel'),
    turningPointIds: many('moment'),
    momentResponseIds: many('response'),
    bodySignalIds: many('body'),
    thoughtPatternIds: many('thought'),
    underneathIds: many('underneath'),
    copeAheadId: one('cope'),
    reflectionLanded: one('landed'),
    thoughtOwn: a.thought?.own ?? null,
  };
}

/** Situations where the ask was to be heard (DEAR MAN's situation types), against practical asks. */
export const VALIDATION_SITUATIONS: readonly string[] = ['address', 'pattern'];
export const PRACTICAL_SITUATIONS: readonly string[] = ['ask', 'boundary'];

/**
 * What one answered outcome does to the person's counts, given the prep's situation (null: no prep, nothing
 * changes). A refusal (*No*) adds one to its kind; *I got what I asked for* or *Partly* sets that
 * kind back to zero; *No answer yet* changes nothing. The validation count is the one the prep reads (a refused ask to be heard → Let go, FAST).
 */
export function refusalChange(situationType: string | null, outcome: string | null): { field: 'refusalsValidation' | 'refusalsPractical'; op: 'add' | 'reset' } | null {
  if (!situationType || !outcome) return null;
  const field = VALIDATION_SITUATIONS.includes(situationType) ? 'refusalsValidation'
    : PRACTICAL_SITUATIONS.includes(situationType) ? 'refusalsPractical' : null;
  if (!field) return null;
  // *No answer yet* isn't a refusal: nothing has been said yet (Gate 3). Only a *No* counts.
  if (outcome === 'no') return { field, op: 'add' };
  if (outcome === 'got_it' || outcome === 'partly') return { field, op: 'reset' };
  return null;
}

/** The page's "the picker was used, nobody kept" (src/lib/dearManDebrief.ts debriefCtx). */
export const NOBODY = 'none';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The prep this debrief is about: via the ask_outcome card that opened it, else the person's latest in 14 days. */
export const DEBRIEF_PREP_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  OPTIONAL MATCH (ts)-[:RESOLVING]->(:FollowUp {type: 'ask_outcome'})<-[:SCHEDULED]-(:ToolSession)-[:DETAIL]->(viaCard:DearManSession {type: 'prep'})
  WHERE viaCard.ownerId = $uid AND ($personId IS NULL OR viaCard.personId = $personId) AND NOT $nobody
  WITH u, ts, head(collect(viaCard)) AS viaCard
  OPTIONAL MATCH (u)-[:COMPLETED_SESSION]->(recent:DearManSession {type: 'prep'})
  WHERE $personId IS NOT NULL AND recent.personId = $personId AND recent.createdAt > datetime() - duration({days: 14})
  WITH viaCard, recent ORDER BY recent.createdAt DESC
  WITH viaCard, head(collect(recent)) AS recent
  WITH coalesce(viaCard, recent) AS prep
  RETURN prep.id AS prepId, prep.situationType AS situationType, prep.personId AS personId
`;

export const DEBRIEF_WRITE = `
  MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MERGE (s:DearManSession {key: $sKey})
  ON CREATE SET s:UserData:LogRecord, s.id = $id, s.ownerId = $uid, s.schemaVersion = 1, s.createdAt = datetime()
  SET s.type = 'debrief', s.source = 'skill:dear_man_debrief', s += $props
  MERGE (u)-[:COMPLETED_SESSION]->(s)
  MERGE (ts)-[:DETAIL]->(s)
  WITH u, s
  OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END |
    SET s.personId = x.id, x.lastUsedAt = datetime()
    MERGE (s)-[:WITH_PERSON]->(x))
  WITH u, s
  OPTIONAL MATCH (u)-[:COMPLETED_SESSION]->(prep:DearManSession {key: $prepKey})
  FOREACH (x IN CASE WHEN prep IS NULL THEN [] ELSE [prep] END | MERGE (s)-[:DEBRIEFS]->(x))
  RETURN s.id AS id
`;

/**
 * The Interaction, once: `created` says whether this close wrote it (only then do the counts move). One per
 * debrief (id = the ToolSession's). Ids only: the outcome, the situation, whether it is still okay between you.
 */
export const INTERACTION_WRITE = `
  MATCH (u:User {id: $uid})
  MERGE (i:Interaction {key: $iKey})
  ON CREATE SET i:UserData:LogRecord, i.id = $id, i.ownerId = $uid, i.schemaVersion = 1, i.createdAt = datetime(),
    i.at = datetime(), i.source = 'dear-man', i.outcome = $outcome, i.situationType = $situationType,
    i.relationshipOk = $relationshipOk, i.selfRespect = $selfRespect, i.factorId = $factorId, i.fresh = true
  WITH u, i, coalesce(i.fresh, false) AS created
  REMOVE i.fresh
  MERGE (u)-[:HAS_INTERACTION]->(i)
  WITH u, i, created
  OPTIONAL MATCH (u)-[:COMPLETED_SESSION]->(s:DearManSession {key: $sKey})
  FOREACH (x IN CASE WHEN s IS NULL THEN [] ELSE [s] END | MERGE (i)-[:FROM_SESSION]->(x))
  WITH u, i, created
  OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END | MERGE (i)-[:WITH]->(x))
  RETURN created, p IS NOT NULL AS withPerson
`;

/** The person's stored safety answer: a debrief never links or counts against someone on the safety route. */
export const PERSON_RISK_QUERY = `MATCH (:User {id: $uid})-[:HAS_PERSON]->(p:Person {key: $personKey}) RETURN p.valueJson AS v`;

/**
 * The prep's "How did it go?" card, when this debrief came another way (the summary link, *I just had a
 * conversation*): done, so Today doesn't ask about a conversation already looked back on.
 */
export const RESOLVE_PREP_CARD = `
  MATCH (u:User {id: $uid})-[:COMPLETED_SESSION]->(prep:DearManSession {key: $prepKey})
  MATCH (u)-[:HAS_TOOL_SESSION]->(prepTs:ToolSession)-[:DETAIL]->(prep)
  MATCH (prepTs)-[:SCHEDULED]->(f:FollowUp {type: 'ask_outcome'})
  WHERE f.ownerId = $uid AND ${GUARDS.FollowUp.update('f')}
  SET f.status = 'done', f.resolvedAt = datetime(), f.updatedAt = datetime()
`;

/** A refusal count on the caller's own person. `field` is whitelisted (refusalChange), never user input. */
export function refusalWrite(field: 'refusalsValidation' | 'refusalsPractical', op: 'add' | 'reset'): string {
  const value = op === 'add' ? `coalesce(p.${field}, 0) + 1` : '0';
  return `MATCH (:User {id: $uid})-[:HAS_PERSON]->(p:Person {key: $personKey}) SET p.${field} = ${value}`;
}

/**
 * *I don't feel safe with them* (the debrief's `between`): the person's safety answer is stale from now, so the next
 * prep or debrief asks again (src/lib/personSafety.ts needsSafetyAsk reads `safetyRecheckAt`). The person's own
 * answer is the yes; nothing about the answer itself is changed here, only that it must be asked again.
 */
export const SAFETY_RECHECK = `MATCH (:User {id: $uid})-[:HAS_PERSON]->(p:Person {key: $personKey}) SET p.safetyRecheckAt = toString(datetime())`;

/** The projection (PROJECTIONS['dear-man']): only a debrief run; the prep saves through saveDearManSession. */
export async function projectDearManDebrief(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  const { uid, toolSessionId, run } = input;
  if (run.skillId !== 'dear_man_debrief') return;
  const f = debriefFields(run);
  if (!f.happened) return;
  const ctx = (run.ctx && typeof run.ctx === 'object' ? run.ctx : {}) as Record<string, unknown>;
  // `none`: the picker was used and nobody kept (someone new, unnamed). Never fall back to a prep's person then.
  const nobody = ctx.personId === NOBODY;
  const ctxPerson = typeof ctx.personId === 'string' && UUID.test(ctx.personId) ? ctx.personId : null;
  const tsKey = `${uid}:${toolSessionId}`;
  const prepRow = (await tx.run(DEBRIEF_PREP_QUERY, { uid, tsKey, personId: ctxPerson, nobody })).records[0];
  const prepId = (prepRow?.get('prepId') as string | null | undefined) ?? null;
  const situationType = (prepRow?.get('situationType') as string | null | undefined) || null;
  let personId = nobody ? null : ctxPerson ?? ((prepRow?.get('personId') as string | null | undefined) || null);
  // As saveDearManSession refuses a plan: someone on the safety route is never linked or counted here (D4).
  if (personId) {
    const risk = (await tx.run(PERSON_RISK_QUERY, { uid, personKey: `${uid}:${personId}` })).records[0];
    if (!risk || personRoute(storedRisk(risk.get('v'))) === 'safety') personId = null;
  }
  const personKey = personId ? `${uid}:${personId}` : null;
  const sKey = `${uid}:${toolSessionId}`;
  const { thoughtOwn, ...ids } = f;
  await tx.run(DEBRIEF_WRITE, {
    uid, tsKey, sKey, id: toolSessionId, personKey, prepKey: prepId ? `${uid}:${prepId}` : null,
    props: { ...ids, thoughtOwn: await encryptOwn(tx, uid, thoughtOwn), situationType: situationType ?? '' },
  });
  if (prepId) await tx.run(RESOLVE_PREP_CARD, { uid, prepKey: `${uid}:${prepId}` });
  if (personKey && f.relationshipOk === 'unsafe') await tx.run(SAFETY_RECHECK, { uid, personKey });
  if (!f.outcome) return;
  const r = (await tx.run(INTERACTION_WRITE, {
    uid, iKey: `${uid}:${toolSessionId}`, id: toolSessionId, sKey, personKey,
    outcome: f.outcome, situationType, relationshipOk: f.relationshipOk, selfRespect: f.selfRespect, factorId: f.factorId,
  })).records[0];
  if (!r?.get('created') || !r.get('withPerson')) return;
  const change = refusalChange(situationType, f.outcome);
  if (change) await tx.run(refusalWrite(change.field, change.op), { uid, personKey });
}
