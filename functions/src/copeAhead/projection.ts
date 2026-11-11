/**
 * Cope Ahead on the skill runtime (ER-B2; docs/design/cope-ahead.md, *On the skill runtime*): the projection that
 * writes `ext.ca` from the visit's `ext.run` at close (skills/projections.ts, R14), so every reader of the hand-built
 * page's record keeps working unchanged: the after card (spine/copeAheadAfter.ts `planIdsFromExt`), the part tag on
 * *Used it, it helped* (`partIdFromExt`), Reflect and the parts stats.
 *
 * `caFromRun` is pure (the field ids are the skill's, scripts/skills/cope_ahead.py); the projection validates the
 * slice against `ext.ca`'s schema, encrypts its own words like every ext own-words value (spine/extOwn.ts) and merges
 * it into the session's stored ext, in the close's transaction. It also sets the session's `urgeIds` to the pull
 * picked in this visit, as the page did (ask-fresh: this visit's answer, never reloaded), when the close sent none.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { encryptExtOwn } from '../spine/extOwn';
import { validateExt } from '../spine/extSchemas';
import type { ProjectionInput } from '../skills/projections';

const PULLS = ['fight', 'chase', 'hide', 'blank'] as const;
const WHEN = ['today', 'tomorrow', 'this_week', 'later'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RunAnswer { fieldId?: unknown; optionIds?: unknown; valueOwn?: unknown }

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** `ext.ca` from a Cope Ahead run (plaintext own words; unanswered keys left out). */
export function caFromRun(run: Record<string, unknown>): Record<string, unknown> {
  const answers = (Array.isArray(run.answers) ? run.answers : []) as RunAnswer[];
  const get = (id: string) => {
    const a = answers.find((x) => x && x.fieldId === id);
    return a ? { ids: strs(a.optionIds), own: typeof a.valueOwn === 'string' && a.valueOwn.trim() ? a.valueOwn : null } : null;
  };
  const ca: Record<string, unknown> = {};
  const sit = get('situation');
  if (sit) {
    const id = sit.ids[0] ?? (sit.own ? 'other' : null);
    if (id) ca.situationId = id;
    if (sit.own) ca.situationOwn = sit.own;
  }
  const when = get('when')?.ids[0];
  if (when && (WHEN as readonly string[]).includes(when)) ca.when = when;
  const feel = answers.filter((x) => typeof x?.fieldId === 'string' && (x.fieldId as string).startsWith('feel_')).flatMap((x) => strs(x.optionIds));
  if (feel.length) ca.feelIds = [...new Set(feel)].slice(0, 2);
  const pull = (get('pull')?.ids ?? []).filter((p) => (PULLS as readonly string[]).includes(p));
  if (pull.length) ca.pullIds = pull.slice(0, 1);
  const part = get('part')?.ids[0];
  if (part && UUID.test(part)) ca.partId = part;
  const moment = get('moment');
  if (moment?.ids[0]) ca.hardMomentId = moment.ids[0];
  if (moment?.own) ca.hardMomentOwn = moment.own;
  const moves = get('moves');
  if (moment || moves) ca.ifFrom = get('forpull')?.ids.includes('pull') && pull.length ? 'pull' : 'moment';
  if (moves?.ids.length) ca.moveIds = moves.ids.slice(0, 2);
  if (moves?.own) ca.moveOwn = moves.own;
  if (get('rehearsed2')) ca.rehearsed = 2;
  else if (get('rehearsed')) ca.rehearsed = 1;
  const nm = get('new_moment');
  if (nm?.ids[0]) ca.newMomentId = nm.ids[0];
  if (nm?.own) ca.newMomentOwn = nm.own;
  if (get('change_move')?.ids[0] === 'change') {
    const nmv = get('new_moves');
    if (nmv?.ids.length) ca.newMoveIds = nmv.ids.slice(0, 2);
    if (nmv?.own) ca.newMoveOwn = nmv.own;
  }
  const settle = get('settle')?.ids[0];
  if (run.exitId === 'five_senses') ca.settle = 'five_senses';
  else if (settle === 'breath' || settle === 'ok') ca.settle = settle;
  // The keep step's taps: what the runtime kept (R4) and scheduled (R5), once the person answered them.
  if (get('keepit')) ca.kept = strs(run.kept).includes('cope_ahead_plan');
  if (get('ask')) ca.followUp = strs(run.scheduled).includes('cope_ahead_after');
  return ca;
}

/** The projection: `ext.ca` merged into the closing session's ext, and the visit's pull as its urgeIds. */
export async function projectCopeAhead(tx: ManagedTransaction, { uid, toolSessionId, run }: ProjectionInput): Promise<void> {
  const ca = caFromRun(run);
  const checked = validateExt({ ca });
  if (!checked) return;
  const enc = await encryptExtOwn(tx, uid, checked);
  const slice = enc ? (JSON.parse(enc) as { ca?: unknown }).ca : null;
  if (!slice) return;
  const key = `${uid}:${toolSessionId}`;
  const head = await tx.run(
    `MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key}) WHERE ts.toolId = 'cope-ahead' RETURN ts.ext AS ext`,
    { uid, key },
  );
  const rec = head.records[0];
  if (!rec) return;
  let ext: Record<string, unknown> = {};
  try {
    const raw = rec.get('ext');
    if (typeof raw === 'string' && raw) ext = JSON.parse(raw) as Record<string, unknown>;
  } catch { ext = {}; }
  const pull = Array.isArray(ca.pullIds) ? (ca.pullIds as string[]) : [];
  await tx.run(
    `MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
     SET ts.ext = $ext,
         ts.urgeIds = CASE WHEN size(coalesce(ts.urgeIds, [])) = 0 AND size($pull) > 0 THEN $pull ELSE ts.urgeIds END`,
    { uid, key, ext: JSON.stringify({ ...ext, ca: slice }), pull },
  );
}
