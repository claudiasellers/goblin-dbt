import type { ManagedTransaction } from 'neo4j-driver';
import { personRoute, storedRisk } from '../safety/personSafety';
import type { ProjectionInput } from '../skills/projections';
import { answersOf, PERSON_RISK_QUERY, UUID } from './debriefProjection';

/**
 * One message on the skill player (IE-01 Mode A, IE-B3; docs/design/one-message.md): the run (`ext.run`, skill
 * `dear_man_one`) projected, in the close's transaction (plan C3a R14), into the legacy
 * `DearManSession {type: 'prep', mode: 'one_message'}` (id = the ToolSession's, `DETAIL` from it, `WITH_PERSON`), once
 * the message reached its *How will they take it?* answer. That is what DEAR MAN's debrief reads: the `ask_outcome`
 * card this visit booked opens the debrief, which finds this record through it (debriefProjection.ts
 * DEBRIEF_PREP_QUERY), so the person and what was asked (`situationType`, for the refusal counts) carry over.
 *
 * Ids only, never the message's words. The person is the run's own `$ctx.personId`, or, for a visit its `ask_delayed`
 * card reopened, the one the first visit named (its session SCHEDULED the card this visit is RESOLVING). Someone on
 * the safety route is never linked. Only the caller's own records.
 */

/** The first visit's run, for a visit its `ask_delayed` card opened. */
export const ONE_SOURCE_RUN_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MATCH (ts)-[:RESOLVING]->(f:FollowUp {type: 'ask_delayed'})<-[:SCHEDULED]-(src:ToolSession)
  WHERE f.ownerId = $uid AND src.ownerId = $uid AND src.toolId = 'dear-man'
  RETURN src.ext AS ext LIMIT 1
`;

export const ONE_PREP_WRITE = `
  MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MERGE (s:DearManSession {key: $sKey})
  ON CREATE SET s:UserData:LogRecord, s.id = $id, s.ownerId = $uid, s.schemaVersion = 1, s.createdAt = datetime()
  SET s.type = 'prep', s.mode = 'one_message', s.source = 'skill:dear_man_one', s += $props
  MERGE (u)-[:COMPLETED_SESSION]->(s)
  MERGE (ts)-[:DETAIL]->(s)
  WITH u, s
  OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END |
    SET s.personId = x.id, x.lastUsedAt = datetime()
    MERGE (s)-[:WITH_PERSON]->(x))
`;

/** DEAR MAN's situation types the message can be about. */
const SITUATIONS = new Set(['ask', 'address', 'pattern']);

/**
 * The asks to be heard (`validation` on the skill's ask options, scripts/skills/dear_man_one.py; test-pinned). The
 * debrief counts a refusal by the prep's `situationType`, so it is set from the ask itself (Gate 1): an ask to be heard
 * counts as one (`address`, or `pattern` when it was about something that keeps happening), a practical ask as `ask`,
 * whatever the message was about. Own words fall back to what it was about.
 */
export const VALIDATION_ASKS: readonly string[] = ['a_hear_me', 'a_acknowledge', 'a_support'];

function refusalSituation(about: string | null, ask: string | null): string | null {
  if (ask && ask !== 'own') {
    if (VALIDATION_ASKS.includes(ask)) return about === 'pattern' ? 'pattern' : 'address';
    return 'ask';
  }
  return about && SITUATIONS.has(about) ? about : null;
}

/** The prep's fields from a One message run: option ids only (own words become `own`, and are never copied). */
export function oneFields(run: Record<string, unknown>) {
  const a = answersOf(run);
  const one = (f: string) => {
    const x = a[f];
    if (!x) return null;
    return x.ids[0] ?? (x.own ? 'own' : null);
  };
  const about = one('about');
  return {
    situationType: refusalSituation(about, one('ask')),
    aboutId: about && SITUATIONS.has(about) ? about : null,
    factId: one('fact'),
    feelingId: one('felt'),
    giveId: one('give'),
    assertId: one('ask'),
    reinforceId: one('why'),
    coolId: one('cool'),
    prediction: one('predict'),
    predictionConfidence: one('sure'),
    // How the message was handed over on the card (copied, opened): what was done, never the words.
    sentHow: [...new Set([...(a.sent_how?.ids ?? []), ...(a.aloud_how?.ids ?? []), ...(a.resend_how?.ids ?? [])])].slice(0, 3),
  };
}

function ctxPerson(run: Record<string, unknown>): string | null {
  const ctx = (run.ctx && typeof run.ctx === 'object' ? run.ctx : {}) as Record<string, unknown>;
  return typeof ctx.personId === 'string' && UUID.test(ctx.personId) ? ctx.personId : null;
}

/** `none` in the run's context: the picker was used and nobody kept. Never fall back to the first visit's person then. */
function nobody(run: Record<string, unknown>): boolean {
  const ctx = (run.ctx && typeof run.ctx === 'object' ? run.ctx : {}) as Record<string, unknown>;
  return ctx.personId === 'none';
}

export async function projectDearManOne(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  const { uid, toolSessionId, run } = input;
  if (run.skillId !== 'dear_man_one') return;
  const f = oneFields(run);
  // Only a message that got as far as the prediction is a prep the debrief can look back on.
  if (!f.prediction) return;
  const tsKey = `${uid}:${toolSessionId}`;
  let personId = ctxPerson(run);
  if (!personId && !nobody(run)) {
    const src = (await tx.run(ONE_SOURCE_RUN_QUERY, { uid, tsKey })).records[0];
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
  await tx.run(ONE_PREP_WRITE, {
    uid, tsKey, sKey: tsKey, id: toolSessionId, personKey: personId ? `${uid}:${personId}` : null,
    props: { ...f, situationType: f.situationType ?? '' },
  });
}
