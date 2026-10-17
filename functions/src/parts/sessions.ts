/**
 * startPartSession / savePartSession as functions of an injected query layer bound to one write
 * transaction (sessionQueries.ts in production, plain functions in tests). The checks run before
 * any write: parts must be on, a named part or candidate must be the caller's own, and a saved
 * session is frozen (finalise-once, GUARDS.PartSession.save).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { DEFAULT_MAX_NON_SELF, mergeStepIds, validateSavePartSession, type PatchProps, type StartInput } from './validation';
import type { PartSessionResponse } from './sessionTypes';

export interface PartSessionDeps {
  /** PartsPolicy.maxNonSelfAnswers (null when the policy is missing). */
  maxNonSelfAnswers(): Promise<unknown>;
  startState(s: StartInput): Promise<StartState>;
  create(s: StartInput): Promise<void>;
  saveState(id: string): Promise<{ partsOn: boolean; status: string | null; stepIdsJson: string | null }>;
  /** The guarded write; the session's status after it, or null when the guard refused. */
  save(id: string, props: PatchProps, stepIdsJson: string | null, final: boolean): Promise<string | null>;
}

export interface StartState {
  partsOn: boolean;
  partFound: boolean;
  candidateFound: boolean;
  /** The caller's own trail offer, answered Yes, of shape A–C (rule D's yes tags instead). */
  offerFound?: boolean;
  /** That offer's moves (sorted). */
  offerMoves?: string[];
  status: string | null;
}

const partsOff = () => new HttpsError('failed-precondition', 'Parts are off');
const frozen = () => new HttpsError('failed-precondition', 'This session is already saved');

/** `s` is already validated (validateStartPartSession, before any transaction opens). */
export async function startPartSessionHandler(s: StartInput, deps: PartSessionDeps): Promise<PartSessionResponse> {
  const state = await deps.startState(s);
  if (!state.partsOn) throw partsOff();
  // Another person's part or candidate has a different key: it simply isn't found.
  if ((s.partId && !state.partFound) || (s.candidateId && !state.candidateFound) || (s.offerId && !state.offerFound)) {
    throw new HttpsError('not-found', 'Not found');
  }
  if (state.status === 'open') return { id: s.id, status: 'open' }; // a repeat start: nothing to write
  if (state.status) throw frozen();
  // A trail offer's moves are the visit's from the start (pre-selected at Find, as a candidate's move is),
  // after the client's own, so keepPart's USES edges carry the whole trail.
  await deps.create(s.offerId ? { ...s, moveIds: [...new Set([...s.moveIds, ...(state.offerMoves ?? [])])] } : s);
  return { id: s.id, status: 'open' };
}

export async function savePartSessionHandler(raw: unknown, deps: PartSessionDeps): Promise<PartSessionResponse> {
  const policy = await deps.maxNonSelfAnswers();
  const max = typeof policy === 'number' && Number.isInteger(policy) && policy >= 0 ? policy : DEFAULT_MAX_NON_SELF;
  const input = validateSavePartSession(raw, max);
  const state = await deps.saveState(input.id);
  if (!state.partsOn) throw partsOff();
  if (!state.status) throw new HttpsError('not-found', 'Session not found');
  if (state.status !== 'open') throw frozen();
  const status = await deps.save(input.id, input.props, mergeStepIds(state.stepIdsJson, input.stepIds), input.final);
  if (status === null) throw frozen(); // saved in between: the guard held
  return { id: input.id, status: status === 'saved' ? 'saved' : 'open' };
}
