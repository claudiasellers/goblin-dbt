import type { ManagedTransaction } from 'neo4j-driver';
import { personRoute, storedRisk } from '../safety/personSafety';
import type { ProjectionInput } from '../skills/projections';
import { answersOf, NOBODY, PERSON_RISK_QUERY, UUID } from './debriefProjection';

/**
 * DEAR MAN's prep on the skill player (IE-01 Mode B, IE-B4; docs/design/dear-man-prep.md): the run (`ext.run`, skill
 * `dear_man_prep`) projected, in the close's transaction (plan C3a R14), into the legacy
 * `DearManSession {type: 'prep', mode: 'plan'}` (id = the ToolSession's, `DETAIL` from it, `WITH_PERSON`) that
 * saveDearManSession used to write, once the plan reached its pocket card. The debrief reads it through the
 * `ask_outcome` card this visit booked (debriefProjection.ts DEBRIEF_PREP_QUERY): the person and `situationType` (for
 * the refusal counts) carry over; History lists it.
 *
 * Option ids only, never own words (an own-words answer is stored as `own`). Someone on the safety route is never linked
 * (as saveDearManSession refused them, D4). Only the caller's own records.
 */
export const PREP_WRITE = `
  MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MERGE (s:DearManSession {key: $sKey})
  ON CREATE SET s:UserData:LogRecord, s.id = $id, s.ownerId = $uid, s.schemaVersion = 1, s.createdAt = datetime()
  SET s.type = 'prep', s.mode = 'plan', s.source = 'skill:dear_man_prep', s += $props
  MERGE (u)-[:COMPLETED_SESSION]->(s)
  MERGE (ts)-[:DETAIL]->(s)
  WITH u, s
  OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END |
    SET s.personId = x.id, x.lastUsedAt = datetime()
    MERGE (s)-[:WITH_PERSON]->(x))
`;

const SITUATIONS = new Set(['ask', 'boundary', 'address', 'pattern']);
/** The prep's asks to be heard (scripts/skills/dear_man_prep.py HEARD_ASKS; the skill's `heard` option prop). */
export const HEARD_ASKS: readonly string[] = ['ask_just_listen', 'addr_acknowledge', 'addr_hear_me', 'patt_stay_in_it'];

/**
 * The situation the debrief counts a refusal by (`refusalChange`: address / pattern are asks to be heard), from the
 * ask, as One message does: an ask to be heard → address (pattern when it was one); a practical ask about something
 * that happened or keeps happening → ask. Otherwise (own words, ask, boundary) the situation picked, which History
 * also labels.
 */
export function refusalSituation(situation: string | null, ask: string | null): string {
  const sit = situation && SITUATIONS.has(situation) ? situation : '';
  if (!ask || ask === 'own') return sit;
  if (HEARD_ASKS.includes(ask)) return sit === 'pattern' ? 'pattern' : 'address';
  return sit === 'address' || sit === 'pattern' ? 'ask' : sit;
}

/** The prep's fields from a run: the old prep's names where it had them (History and the debrief read those). */
export function prepFields(run: Record<string, unknown>) {
  const a = answersOf(run);
  // Lists hold option ids only (History humanizes each); a single answer in own words is `own`.
  const many = (f: string) => (a[f]?.ids ?? []).slice(0, 12);
  const one = (f: string) => many(f)[0] ?? (a[f]?.own ? 'own' : null);
  const situation = one('situation');
  return {
    situationType: refusalSituation(situation, one('assert')),
    // What the person picked, kept apart from the refusal class above.
    situationPicked: situation && SITUATIONS.has(situation) ? situation : '',
    priorities: many('matters'),
    barriers: many('hard'),
    // IE-12's myths about asking, kept apart from the barriers (History labels barriers by id).
    myths: many('myth'),
    describeId: one('describe'),
    feelings: many('express'),
    assertId: one('assert'),
    assertIds: many('assert'),
    // Whether the ask's blank was filled (the words themselves stay in the run, encrypted).
    assertFilled: !!a.fill,
    reinforceIds: many('reinforce'),
    anchorNeedId: one('need'),
    anchorId: one('phrase'),
    confidenceCueId: one('confident'),
    middleGroundId: one('middle'),
    walkAwayId: one('walk'),
    cardHow: many('card_how'),
    hotChoice: one('hot'),
  };
}

/** Whether the plan reached its pocket card: only then is it a plan the debrief can look back on. */
export function prepReachedCard(run: Record<string, unknown>): boolean {
  return Array.isArray(run.path) && run.path.includes('card');
}

export async function projectDearManPrep(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  const { uid, toolSessionId, run } = input;
  if (run.skillId !== 'dear_man_prep' || !prepReachedCard(run)) return;
  const ctx = (run.ctx && typeof run.ctx === 'object' ? run.ctx : {}) as Record<string, unknown>;
  let personId = ctx.personId !== NOBODY && typeof ctx.personId === 'string' && UUID.test(ctx.personId) ? ctx.personId : null;
  if (personId) {
    const risk = (await tx.run(PERSON_RISK_QUERY, { uid, personKey: `${uid}:${personId}` })).records[0];
    if (!risk || personRoute(storedRisk(risk.get('v'))) === 'safety') personId = null;
  }
  const tsKey = `${uid}:${toolSessionId}`;
  await tx.run(PREP_WRITE, {
    uid, tsKey, sKey: tsKey, id: toolSessionId, personKey: personId ? `${uid}:${personId}` : null, props: prepFields(run),
  });
}
