import type { ManagedTransaction } from 'neo4j-driver';
import { answersOf, PERSON_RISK_QUERY, SAFETY_RECHECK, UUID } from '../dearMan/debriefProjection';
import { personRoute, storedRisk } from '../safety/personSafety';
import type { ProjectionInput } from '../skills/projections';

/**
 * Keep it warm on the skill player (IE-06, IE-B4; docs/design/give.md): the run (`ext.run`, skill `give`) projected,
 * in the close's transaction (plan C3a R14):
 *
 *   - the `Interaction` (log, IE-03's interaction log), once the person has said how it went: `kind: 'repair'` when
 *     the `repair_outcome` card's visit answered *Did you get to say it?*, `kind: 'break_return'` when the
 *     `break_return` card's visit answered *Did you go back?*; `WITH` the person, ids only, never their words;
 *   - any answer that says it isn't safe with them (*It got physical* or *I'm scared of them* after a fight, *I'm
 *     scared of how angry they are*, *I don't feel safe going back* / *with them* on a card's visit): that person's
 *     safety answer goes stale (`safetyRecheckAt`), so the next visit with them asks the safety question again (as
 *     Say no's *scared*), and nothing is logged for the visit.
 *
 * The person is the run's own `$ctx.personId` (a reopened visit carries the first visit's), or, failing that, the one
 * the first visit named (its session SCHEDULED the card this visit is RESOLVING). Someone on the safety route is never
 * linked. Only the caller's own records.
 */

export const GIVE_CARDS = ['break_return', 'repair_outcome'] as const;

/** The first visit's run, for a visit one of its cards opened. */
export const SOURCE_RUN_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MATCH (ts)-[:RESOLVING]->(f:FollowUp)<-[:SCHEDULED]-(src:ToolSession)
  WHERE f.type IN ['break_return', 'repair_outcome'] AND f.ownerId = $uid AND src.ownerId = $uid AND src.toolId = 'give'
  RETURN src.ext AS ext LIMIT 1
`;

export const INTERACTION_GIVE_WRITE = `
  MATCH (u:User {id: $uid})
  MERGE (i:Interaction {key: $iKey})
  ON CREATE SET i:UserData:LogRecord, i.id = $id, i.ownerId = $uid, i.schemaVersion = 1, i.createdAt = datetime(),
    i.at = datetime(), i.source = 'give', i.kind = $kind, i.outcome = $outcome, i.between = $between, i.guilt = $guilt
  MERGE (u)-[:HAS_INTERACTION]->(i)
  WITH u, i
  OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END | MERGE (i)-[:WITH]->(x))
  RETURN p IS NOT NULL AS withPerson
`;

/** What the Interaction keeps: option ids only (own words never reach it; none of these fields take any). */
export function giveFields(run: Record<string, unknown>) {
  const a = answersOf(run);
  const one = (f: string) => a[f]?.ids[0] ?? null;
  const repaired = one('repaired');
  const back = one('back');
  const hurt = ['physical', 'scared'].includes(one('fight') ?? '') || one('angry_ok') === 'scared'
    || [one('back'), one('between'), one('still_ok')].includes('unsafe');
  const kind: 'repair' | 'break_return' | null = hurt ? null : repaired ? 'repair' : back ? 'break_return' : null;
  return {
    kind,
    outcome: kind ? repaired ?? back : null,
    between: kind === 'repair' ? one('between') : kind === 'break_return' ? one('still_ok') : null,
    guilt: one('guilt'),
    hurt,
  };
}

function ctxPerson(run: Record<string, unknown>): string | null {
  const ctx = (run.ctx && typeof run.ctx === 'object' ? run.ctx : {}) as Record<string, unknown>;
  return typeof ctx.personId === 'string' && UUID.test(ctx.personId) ? ctx.personId : null;
}

export async function projectGive(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  const { uid, toolSessionId, run } = input;
  if (run.skillId !== 'give') return;
  const f = giveFields(run);
  if (!f.kind && !f.hurt) return;
  let personId = ctxPerson(run);
  if (!personId) {
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
  if (personKey && f.hurt) await tx.run(SAFETY_RECHECK, { uid, personKey });
  if (!f.kind) return;
  await tx.run(INTERACTION_GIVE_WRITE, {
    uid, iKey: `${uid}:${toolSessionId}`, id: toolSessionId, personKey,
    kind: f.kind, outcome: f.outcome, between: f.between, guilt: f.guilt,
  });
}
