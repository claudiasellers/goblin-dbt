import type { ManagedTransaction } from 'neo4j-driver';
import { answersOf } from '../dearMan/debriefProjection';
import type { ProjectionInput } from '../skills/projections';

/**
 * Find your people on the skill player (IE-09, IE-B5; docs/design/find-your-people.md): the run (`ext.run`, skill
 * `finding_connection`) projected, in the close's transaction (plan C3a R14), into IE-03's interaction log:
 *
 *   - one `Interaction {kind: 'reach_out'}` (log) once the `reach_out_outcome` card's visit has answered *Did you do
 *     it?* with *I did it* or *I decided not to* (*Not yet* books a new time and logs nothing yet); the prediction
 *     (`predicted`, `likingPrediction`) comes from the first visit's answers, which the reopened run reads back;
 *   - option ids only: the area, the step (null when the person wrote their own), how it went and how much they
 *     seemed to like the person. Own words never reach it. No person: the skill has no picker (part 2).
 *
 * The caller's own records only.
 */

export const INTERACTION_REACH_OUT_WRITE = `
  MATCH (u:User {id: $uid})
  MERGE (i:Interaction {key: $iKey})
  ON CREATE SET i:UserData:LogRecord, i.id = $id, i.ownerId = $uid, i.schemaVersion = 1, i.createdAt = datetime(),
    i.at = datetime(), i.source = 'finding-connection', i.kind = 'reach_out', i.area = $area, i.stepId = $stepId,
    i.happened = $happened, i.predicted = $predicted, i.likingPrediction = $likingPrediction, i.outcome = $outcome,
    i.liked = $liked
  MERGE (u)-[:HAS_INTERACTION]->(i)
`;

/** What the Interaction keeps, or null when there's nothing to log yet. */
export function reachOutFields(run: Record<string, unknown>) {
  const a = answersOf(run);
  const one = (f: string) => a[f]?.ids[0] ?? null;
  const happened = one('happened');
  if (happened !== 'did' && happened !== 'decided_not') return null;
  const did = happened === 'did';
  return {
    happened,
    area: one('area'),
    stepId: one('step'),
    predicted: one('predict'),
    likingPrediction: one('liking'),
    outcome: did ? one('went') : null,
    liked: did ? one('liked') : null,
  };
}

export async function projectFindingConnection(tx: ManagedTransaction, input: ProjectionInput): Promise<void> {
  const { uid, toolSessionId, run } = input;
  if (run.skillId !== 'finding_connection') return;
  const f = reachOutFields(run);
  if (!f) return;
  await tx.run(INTERACTION_REACH_OUT_WRITE, { uid, iKey: `${uid}:${toolSessionId}`, id: toolSessionId, ...f });
}
