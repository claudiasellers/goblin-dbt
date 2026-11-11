import type { ManagedTransaction } from 'neo4j-driver';
import { answersOf, PERSON_RISK_QUERY, SAFETY_RECHECK } from '../dearMan/debriefProjection';
import { personRoute, storedRisk } from '../safety/personSafety';
import type { ProjectionInput } from '../skills/projections';

/**
 * Say no on the skill player (IE-04, IE-B3; docs/design/say-no.md): the run (`ext.run`, skill `say_no`) projected,
 * in the close's transaction (plan C3a R14):
 *
 *   - the `Interaction` (log, IE-03's interaction log; `kind: 'no'`), once the person has said how it went (the
 *     `no_outcome` card reopens the run at *Did you say no?*), `WITH` the person: ids only, never their words;
 *   - *I'm scared of what they'd do*: that person's safety answer goes stale (`safetyRecheckAt`), so the next visit
 *     with them asks the safety question again (as the debrief's *I don't feel safe with them*).
 *
 * The person is the run's own `$ctx.personId` (the first visit), or, for a visit the card reopened, the one the
 * first visit named (its session SCHEDULED the card this visit is RESOLVING). Someone on the safety route is never
 * linked. Only the caller's own records.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The first visit's run, for a visit its `no_outcome` card opened. */
export const SOURCE_RUN_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MATCH (ts)-[:RESOLVING]->(f:FollowUp {type: 'no_outcome'})<-[:SCHEDULED]-(src:ToolSession)
  WHERE f.ownerId = $uid AND src.ownerId = $uid AND src.toolId = 'say-no'
  RETURN src.ext AS ext LIMIT 1
`;

export const INTERACTION_NO_WRITE = `
  MATCH (u:User {id: $uid})
  MERGE (i:Interaction {key: $iKey})
  ON CREATE SET i:UserData:LogRecord, i.id = $id, i.ownerId = $uid, i.schemaVersion = 1, i.createdAt = datetime(),
    i.at = datetime(), i.source = 'say-no', i.kind = 'no', i.requestKind = $requestKind, i.pressureIds = $pressureIds,
    i.prediction = $prediction, i.said = $said, i.held = $held, i.selfRespect = $proud
  MERGE (u)-[:HAS_INTERACTION]->(i)
  WITH u, i
  OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END | MERGE (i)-[:WITH]->(x))
  RETURN p IS NOT NULL AS withPerson
`;

/** The fields the Interaction keeps: option ids only (own words become `own`, and are never copied). */
export function noFields(run: Record<string, unknown>) {
  const a = answersOf(run);
  const one = (f: string) => {
    const x = a[f];
    if (!x) return null;
    return x.ids[0] ?? (x.own ? 'own' : null);
  };
  return {
    requestKind: one('asking'),
    pressureIds: (a.pressure?.ids ?? []).slice(0, 5),
    prediction: one('predict'),
    said: one('said'),
    held: one('held'),
    proud: one('proud'),
    scared: (a.pressure?.ids ?? []).includes('scared'),
  };
}

function ctxPerson(run: Record<string, unknown>): string | null {
  const ctx = (run.ctx && typeof run.ctx === 'object' ? run.ctx : {}) as Record<string, unknown>;
  return typeof ctx.personId === 'string' && UUID.test(ctx.personId) ? ctx.personId : null;
}

export async function projectSayNo(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  const { uid, toolSessionId, run } = input;
  if (run.skillId !== 'say_no') return;
  const f = noFields(run);
  let personId = ctxPerson(run);
  if (!personId && f.said) {
    const src = (await tx.run(SOURCE_RUN_QUERY, { uid, tsKey: `${uid}:${toolSessionId}` })).records[0];
    try {
      const srcRun = (JSON.parse(String(src?.get('ext') ?? 'null')) as { run?: unknown } | null)?.run;
      if (srcRun && typeof srcRun === 'object') personId = ctxPerson(srcRun as Record<string, unknown>);
    } catch { personId = null; }
  }
  if (personId) {
    // As saveDearManSession refuses a plan: someone on the safety route is never linked here (D4).
    const risk = (await tx.run(PERSON_RISK_QUERY, { uid, personKey: `${uid}:${personId}` })).records[0];
    if (!risk || personRoute(storedRisk(risk.get('v'))) === 'safety') personId = null;
  }
  const personKey = personId ? `${uid}:${personId}` : null;
  if (personKey && f.scared) await tx.run(SAFETY_RECHECK, { uid, personKey });
  if (!f.said) return;
  await tx.run(INTERACTION_NO_WRITE, {
    uid, iKey: `${uid}:${toolSessionId}`, id: toolSessionId, personKey,
    requestKind: f.requestKind, pressureIds: f.pressureIds, prediction: f.prediction, said: f.said, held: f.held, proud: f.proud,
  });
}
