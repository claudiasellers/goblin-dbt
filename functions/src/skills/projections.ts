import type { ManagedTransaction } from 'neo4j-driver';
import { projectDearManDebrief } from '../dearMan/debriefProjection';

/**
 * The projection hook (docs/design/dbt-modules-plan.md C3a R14, C8.2): for a tool that moved onto the skill
 * player while other code still reads its old record, `project` writes that old shape from the run, in the
 * same transaction as the session's close, so the old readers keep working on the day it ports. Empty in the
 * foundation; a port PR that C8 marks "projection" adds its tool here. A projection only ever writes the
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

export const PROJECTIONS: Readonly<Record<string, Projection>> = {
  // DEAR MAN's debrief (IE-B2): the legacy DearManSession {type: 'debrief'}, the Interaction and the refusal counts.
  'dear-man': projectDearManDebrief,
};

/**
 * Skills whose rep is the person's own report of something done off the phone (PR-S4, D-09): the close logs it as
 * `followup_offphone` (self-reported), as DEAR MAN's hand-built debrief did. Only when the run says it happened.
 */
export const OFF_PHONE_SKILLS: Readonly<Record<string, { toolId: string; happenedField: string; yes: string }>> = {
  dear_man_debrief: { toolId: 'dear-man', happenedField: 'happened', yes: 'yes' },
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
