/**
 * Do the Opposite on the skill runtime (ER-03, ER-B3; docs/design/opposite-action-v3.md): the projection that writes
 * one `OppositeActionSession` (schemaVersion 3) per feeling that reached its step, from the visit's `ext.run` at close
 * (skills/projections.ts, R14), so the readers of the hand-built page's record keep working: the parts stats' "what's
 * helped" (parts/statsQueries.ts STATS_STEPS_QUERY: `actionSize` in `dataJson`, `TARGETED_URGE`, `DETAIL`), the trails
 * records query and export. The hand-built page's own lists read schemaVersion 2 only, so a v3 record never shows there.
 *
 * Ids only: the person's own urge or step stays in `ext.run` (encrypted at close), never copied. Nothing is trusted from
 * the client beyond the ids: each pick must be a word that works on Opposite Action (`HAS_REGULATION_CONTENT`,
 * `oppositeActionApplicable`), its urge one of its parent's, and its route the graph's `opposite` (safe, and not the
 * repair rule), or the clarify route where Check the Facts, run inline (ER-B5), found it doesn't fit and nothing unsafe
 * was told (`checked`: the skill's own jump to the cue; recorded as `factsChecked`). A pick that fails is skipped, never
 * fatal: the close still saves.
 *
 * A reopened visit (the `oa_try` card: *Did you get to try it?*) doesn't write new records: it moves the first visit's
 * records on, planned → practiced or missed, as the hand-built page's follow-up did.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import type { ProjectionInput } from '../skills/projections';

interface RunAnswer { fieldId?: unknown; pick?: unknown; optionIds?: unknown; valueOwn?: unknown }

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const SIZES = ['small', 'medium', 'bigger'] as const;
const OUTCOMES = ['toward_goal', 'partial', 'unclear', 'unsafe'];
const MISSED = ['too_strong', 'no_moment', 'forgot', 'chose_not'];
const GOALS = ['connection', 'boundary', 'progress', 'repair', 'self_respect'];
const CUES = ['now', 'today', 'next_time'];

export interface OaPick {
  index: number;
  emotionId: string;
  urgeId: string; // an ActionUrge id, or 'custom' for own words
  actionSize: 'small' | 'medium' | 'bigger' | 'custom';
  facts: string;
  effectiveness: string;
  /** Check the Facts inline (ER-B5): `doesnt_fit` when its verdict sent this feeling to the cue, else null. */
  checked: 'doesnt_fit' | null;
  thenVsNowBody: string | null;
}

export interface OaRun {
  status: 'practiced' | 'planned' | null;
  goal: string | null;
  safety: string | null;
  cueId: string | null;
  outcome: string | null;
  predict: string | null;
  actual: string | null;
  picks: OaPick[];
  /** A reopened visit's answer (`back`): yes, or why not. */
  tried: string | null;
}

/** What a Do the Opposite run says, per pick and once (pure; the field ids are scripts/skills/opposite_action.py's). */
export function oaFromRun(run: Record<string, unknown>): OaRun {
  const answers = (Array.isArray(run.answers) ? run.answers : []) as RunAnswer[];
  const get = (id: string, pick?: string) => {
    const a = answers.find((x) => x && x.fieldId === id && (pick === undefined ? x.pick === undefined : x.pick === pick));
    return a ? { ids: strs(a.optionIds), own: typeof a.valueOwn === 'string' && a.valueOwn.trim() ? a.valueOwn : null } : null;
  };
  const one = (id: string, pick?: string) => get(id, pick)?.ids[0] ?? null;
  const path = strs(run.path);
  const feel = [...new Set(get('feel')?.ids ?? [])].slice(0, 3);
  const picks: OaPick[] = [];
  feel.forEach((emotionId, index) => {
    const size = get('size', emotionId);
    const urge = get('urge', emotionId);
    if (!size || !urge) return;
    const sizeId = size.ids[0] ?? null;
    const actionSize = sizeId ? (SIZES.find((s) => sizeId.endsWith(`:${s}`)) ?? null) : size.own ? 'custom' : null;
    const urgeId = urge.ids[0] ?? (urge.own ? 'custom' : null);
    const facts = one('fits', emotionId);
    const effectiveness = one('help', emotionId);
    if (!actionSize || !urgeId || !facts || !effectiveness) return;
    // The inline check's outcome ids: its verdict sent the feeling to the cue only when nothing unsafe came with it.
    const chk = get('checked', emotionId)?.ids ?? [];
    const checked = chk.includes('doesnt_fit') && !chk.includes('unsafe') && !chk.includes('stopped') ? 'doesnt_fit' : null;
    picks.push({ index, emotionId, urgeId, actionSize, facts, effectiveness, checked, thenVsNowBody: one('tvnb', emotionId) });
  });
  const goal = one('goal');
  const cueId = one('when');
  const outcome = one('outcome');
  return {
    status: path.includes('read') ? 'practiced' : path.includes('plan') ? 'planned' : null,
    goal: goal && GOALS.includes(goal) ? goal : null,
    safety: one('safety'),
    cueId: cueId && CUES.includes(cueId) ? cueId : null,
    outcome: outcome && OUTCOMES.includes(outcome) ? outcome : null,
    predict: one('predict'),
    actual: one('actual'),
    picks,
    tried: path.includes('back') ? one('tried') : null,
  };
}

/** The repair rule (H11; the skill's `repr` jump, ahead of the route table): guilt or shame that fits, goal repair. */
export const repairRule = (parentId: string, facts: string, goal: string | null) =>
  (parentId === 'guilt' || parentId === 'shame') && facts === 'fits' && goal === 'repair';

export const CHECK_PICK = `
  MATCH (e:Emotion {id: $emotionId})-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent)
  WHERE e.oppositeActionApplicable = true
  MATCH (p:OppositeActionFlow {id: 'opposite_action_flow'})
  OPTIONAL MATCH (c)-[:HAS_ACTION_URGE]->(urge:ActionUrge {id: $urgeId})
  RETURN c.dbtParent AS parentId, urge.id AS urgeId, p.contentJson AS flow
  LIMIT 1`;

export const WRITE_PICK = `
  MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MERGE (s:OppositeActionSession {key: $key})
  ON CREATE SET s:UserData:LogRecord, s.createdAt = datetime(), s.id = $id, s.ownerId = $uid
  SET s.updatedAt = datetime(), s.status = $status, s.emotionId = $emotionId, s.urgeId = $urgeId,
      s.contentVersion = $contentVersion, s.dataJson = $dataJson, s.outcome = $outcome,
      s.schemaVersion = $schemaVersion, s.cueId = $cueId, s.source = 'skill:opposite_action',
      s.intensityBefore = null, s.intensityAfter = null, s.urgeBefore = null, s.urgeAfterBody = null, s.urgeAfter = null
  MERGE (u)-[:COMPLETED_SESSION]->(s)
  MERGE (ts)-[:DETAIL]->(s)
  WITH s
  MATCH (e:Emotion {id: $emotionId})
  MERGE (s)-[:FOCUSED_ON]->(e)
  WITH s
  MATCH (p:OppositeActionFlow {id: 'opposite_action_flow'})
  MERGE (s)-[:USED_PROTOCOL]->(p)
  WITH s
  OPTIONAL MATCH (urge:ActionUrge {id: $urgeId})
  FOREACH (n IN CASE WHEN urge IS NULL THEN [] ELSE [urge] END | MERGE (s)-[:TARGETED_URGE]->(n))`;

/** The first visit's planned records, through the oa_try card that opened this visit (the caller's own only). */
export const FIRST_RECORDS = `
  MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MATCH (ts)-[:RESOLVING]->(:FollowUp {type: 'oa_try'})<-[:SCHEDULED]-(first:ToolSession)<-[:HAS_TOOL_SESSION]-(u)
  MATCH (first)-[:DETAIL]->(s:OppositeActionSession)<-[:COMPLETED_SESSION]-(u)
  WHERE s.schemaVersion = 3 AND s.status IN ['planned', 'missed']
  RETURN s.key AS key, s.dataJson AS dataJson`;

export const MOVE_ON = `
  MATCH (u:User {id: $uid})-[:COMPLETED_SESSION]->(s:OppositeActionSession {key: $key})
  WHERE s.status IN ['planned', 'missed']
  SET s.status = $status, s.outcome = $outcome, s.missedReason = $missedReason, s.dataJson = $dataJson, s.updatedAt = datetime()`;

export async function projectOppositeAction(tx: ManagedTransaction, { uid, toolSessionId, run }: ProjectionInput): Promise<void> {
  const oa = oaFromRun(run);
  const tsKey = `${uid}:${toolSessionId}`;
  if (oa.tried) {
    const practiced = oa.tried === 'yes' && oa.outcome;
    const missed = MISSED.includes(oa.tried);
    if (!practiced && !missed) return;
    const status = practiced ? 'practiced' : 'missed';
    const outcome = practiced ? oa.outcome ?? '' : '';
    const missedReason = missed ? oa.tried : '';
    const found = await tx.run(FIRST_RECORDS, { uid, tsKey });
    for (const r of found.records) {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(r.get('dataJson') as string) as Record<string, unknown>; } catch { data = {}; }
      const dataJson = JSON.stringify({ ...data, status, outcome, missedReason, actual: practiced ? oa.actual ?? '' : '' });
      await tx.run(MOVE_ON, { uid, key: r.get('key'), status, outcome, missedReason, dataJson });
    }
    return;
  }
  if (!oa.status || oa.safety !== 'safe') return;
  const contentVersion = typeof run.versionId === 'string' ? run.versionId : '';
  for (const p of oa.picks) {
    const res = await tx.run(CHECK_PICK, { emotionId: p.emotionId, urgeId: p.urgeId });
    const rec = res.records[0];
    if (!rec) continue;
    const parentId = rec.get('parentId') as string;
    if (p.urgeId !== 'custom' && !rec.get('urgeId')) continue;
    let flow: { routes?: Record<string, string> } = {};
    try { flow = JSON.parse(rec.get('flow') as string) as typeof flow; } catch { continue; }
    const route = flow.routes?.[`${p.facts}:${p.effectiveness}`];
    // The table's opposite, or its clarify where the inline check found it doesn't fit (the skill's `ctf` → `cue`).
    if (!(route === 'opposite' || (route === 'clarify' && p.checked === 'doesnt_fit')) || repairRule(parentId, p.facts, oa.goal)) continue;
    const id = `${toolSessionId}-${p.index + 1}`;
    const data = {
      schemaVersion: 3, id, status: oa.status, emotionId: p.emotionId, parentId, urgeId: p.urgeId,
      goal: oa.goal ?? '', safety: 'safe', facts: p.facts, effectiveness: p.effectiveness, actionSize: p.actionSize,
      ...(p.checked ? { factsChecked: p.checked } : {}),
      cueId: oa.cueId ?? '', outcome: oa.status === 'practiced' ? oa.outcome ?? '' : '', predict: oa.predict ?? '',
      actual: oa.status === 'practiced' ? oa.actual ?? '' : '', thenVsNowBody: p.thenVsNowBody ?? '', missedReason: '',
    };
    await tx.run(WRITE_PICK, {
      uid, tsKey, key: `${uid}:${id}`, id, status: oa.status, emotionId: p.emotionId, urgeId: p.urgeId, contentVersion,
      dataJson: JSON.stringify(data), outcome: data.outcome, schemaVersion: neo4j.int(3), cueId: data.cueId,
    });
  }
}
