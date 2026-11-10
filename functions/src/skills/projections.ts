import type { ManagedTransaction } from 'neo4j-driver';

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

export const PROJECTIONS: Readonly<Record<string, Projection>> = {};

/** Run the tool's projection, if it has one and the close carried a run. */
export async function projectRun(tx: ManagedTransaction, uid: string, toolSessionId: string, toolId: string, ext: string | null): Promise<void> {
  const project = Object.prototype.hasOwnProperty.call(PROJECTIONS, toolId) ? PROJECTIONS[toolId] : undefined;
  if (!project || !ext) return;
  const run = (JSON.parse(ext) as { run?: unknown }).run;
  if (!run || typeof run !== 'object') return;
  await project(tx, { uid, toolSessionId, toolId, run: run as Record<string, unknown> });
}
