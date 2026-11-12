import type { ManagedTransaction } from 'neo4j-driver';
import { projectCopeAhead } from '../copeAhead/projection';
import { projectDearManDebrief } from '../dearMan/debriefProjection';
import { projectDearManOne } from '../dearMan/oneProjection';
import { projectDearManPrep } from '../dearMan/prepProjection';
import { projectSayNo } from '../sayNo/projection';

/**
 * The projection hook (docs/design/dbt-modules-plan.md C3a R14, C8.2): for a tool that moved onto the skill
 * player while other code still reads its old record, `project` writes that old shape from the run, in the
 * same transaction as the session's close, so the old readers keep working on the day it ports. A port PR that
 * C8 marks "projection" adds its tool here (Cope Ahead, ER-B2, was the first). A projection only ever writes the
 * caller's own records (`uid`), never reads another person's, and receives own words as plaintext: anything it
 * stores that the person wrote goes through `encryptOwn` (shared/crypto.ts).
 */
export interface ProjectionInput {
  uid: string;
  /** The closing ToolSession's id. */
  toolSessionId: string;
  toolId: string;
  /** `ext.run` as the client sent it (validated, not yet encrypted). */
  run: Record<string, unknown>;
}

export type Projection = (tx: ManagedTransaction, input: ProjectionInput) => Promise<void>;

/** DEAR MAN's skills: each projection acts on its own skill's run only and leaves the other's alone. */
export async function projectDearMan(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  await projectDearManDebrief(tx, input);
  await projectDearManOne(tx, input);
  await projectDearManPrep(tx, input);
}

export const PROJECTIONS: Readonly<Record<string, Projection>> = {
  // Cope Ahead (ER-B2): `ext.ca` for the after card, the part tag, Reflect and stats; the pull as urgeIds.
  'cope-ahead': projectCopeAhead,
  // DEAR MAN's debrief (IE-B2): the legacy DearManSession {type: 'debrief'}, the Interaction and the refusal counts.
  // One message (IE-B3): the DearManSession {type: 'prep', mode: 'one_message'} the debrief reads.
  'dear-man': projectDearMan,
  // Say no (IE-B3): the Interaction {kind: 'no'} once they've said how it went; a re-ask of the safety question.
  'say-no': projectSayNo,
};

/**
 * Skills whose rep is the person's own report of something done off the phone (PR-S4, D-09): the close logs it as
 * `followup_offphone` (self-reported), as DEAR MAN's hand-built debrief did. Only when the run says it happened.
 */
export const OFF_PHONE_SKILLS: Readonly<Record<string, { toolId: string; happenedField: string; yes: string; unansweredKeepsOwn?: boolean }>> = {
  dear_man_debrief: { toolId: 'dear-man', happenedField: 'happened', yes: 'yes' },
  // Say no's afterwards (the no_outcome card reopens the run at *Did you say no?*): said is the rep. The first visit,
  // which never asks it, keeps the close's own rep (`unansweredKeepsOwn`).
  say_no: { toolId: 'say-no', happenedField: 'said', yes: 'yes', unansweredKeepsOwn: true },
};

/** The rep a run's close logs: off the phone (it happened), none (it didn't), or the close's own (null). */
export function runRep(ext: string | null, toolId: string): { repSource: 'followup_offphone' } | { noRep: true } | null {
  if (!ext) return null;
  let run: unknown;
  try { run = (JSON.parse(ext) as { run?: unknown }).run; } catch { return null; }
  if (!run || typeof run !== 'object') return null;
  const r = run as { skillId?: unknown; answers?: unknown };
  const rule = typeof r.skillId === 'string' && Object.prototype.hasOwnProperty.call(OFF_PHONE_SKILLS, r.skillId) ? OFF_PHONE_SKILLS[r.skillId] : null;
  if (!rule || rule.toolId !== toolId) return null;
  const answers = Array.isArray(r.answers) ? r.answers as Array<{ fieldId?: unknown; optionIds?: unknown }> : [];
  const a = answers.find((x) => x && x.fieldId === rule.happenedField);
  if (!a && rule.unansweredKeepsOwn) return null;
  const ids = a && Array.isArray(a.optionIds) ? a.optionIds : [];
  return ids.includes(rule.yes) ? { repSource: 'followup_offphone' } : { noRep: true };
}

/** Run the tool's projection, if it has one and the close carried a run. */
export async function projectRun(tx: ManagedTransaction, uid: string, toolSessionId: string, toolId: string, ext: string | null): Promise<void> {
  const project = Object.prototype.hasOwnProperty.call(PROJECTIONS, toolId) ? PROJECTIONS[toolId] : undefined;
  if (!project || !ext) return;
  const run = (JSON.parse(ext) as { run?: unknown }).run;
  if (!run || typeof run !== 'object') return;
  await project(tx, { uid, toolSessionId, toolId, run: run as Record<string, unknown> });
}
