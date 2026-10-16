/**
 * answerPartCandidate (docs/design/parts.md, `PartCandidate`: "read in Me the way `PatternOffer` is"):
 * the person's answer to a part they said they'd come back to. Today only "Not any more" (`dismiss`):
 * open → dismissed, once, under GUARDS.PartCandidate.dismiss. "Get to know it" is Meet a part with the
 * candidate's id; keepPart accepts it there. Parts must be on; only the caller's own candidate.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { GUARDS } from '../userdata/lifecycle';
import { userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import type { AnswerPartCandidateRequest, AnswerPartCandidateResponse } from './keepTypes';

export type { AnswerPartCandidateRequest, AnswerPartCandidateResponse };

export const CANDIDATE_ANSWERS = ['dismiss'] as const;

export function validateCandidateAnswer(raw: unknown): AnswerPartCandidateRequest {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['candidateId', 'answer'].includes(k)) throw new ValidationError(`${k}: not accepted`);
  return { candidateId: uuid(o.candidateId), answer: oneOf(o.answer, CANDIDATE_ANSWERS) };
}

export const CANDIDATE_ANSWER_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART_CANDIDATE]->(c:PartCandidate {key: $key})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, c.status AS status
`;

export const CANDIDATE_DISMISS_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_PART_CANDIDATE]->(c:PartCandidate {key: $key})
  WHERE ${GUARDS.PartCandidate.dismiss('c')}
  SET c.status = 'dismissed', c.dismissedAt = datetime()
  RETURN c.status AS status
`;

export interface CandidateAnswerDeps {
  state(): Promise<{ partsOn: boolean; status: string | null }>;
  dismiss(): Promise<string | null>;
}

export async function answerPartCandidateHandler(input: AnswerPartCandidateRequest, deps: CandidateAnswerDeps): Promise<AnswerPartCandidateResponse> {
  const st = await deps.state();
  if (!st.partsOn) throw partsOff();
  if (!st.status) throw new HttpsError('not-found', 'Not found');
  // Already answered (dismissed, or accepted by keepPart): nothing changes, the same answer comes back.
  if (st.status !== 'open') return { id: input.candidateId, status: st.status };
  const status = await deps.dismiss();
  return { id: input.candidateId, status: status ?? 'dismissed' };
}

export function candidateAnswerDeps(tx: ManagedTransaction, uid: string, candidateId: string): CandidateAnswerDeps {
  const params = { uid, key: userKey(uid, candidateId) };
  return {
    async state() {
      const r = (await tx.run(CANDIDATE_ANSWER_STATE_QUERY, params)).records[0];
      const status = r?.get('status');
      return { partsOn: r?.get('partsOn') === true, status: typeof status === 'string' ? status : null };
    },
    async dismiss() {
      const r = (await tx.run(CANDIDATE_DISMISS_QUERY, params)).records[0];
      const status = r?.get('status');
      return typeof status === 'string' ? status : null;
    },
  };
}
