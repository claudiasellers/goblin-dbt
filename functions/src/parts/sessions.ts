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
  /**
   * `frontOfPartId`: the 5d pick asked about; `frontFound` is true only when it is the caller's own
   * active or resting part. `partId` and `storedFrontOfPartId` are the session's own.
   */
  saveState(id: string, frontOfPartId?: string | null): Promise<{
    partsOn: boolean; status: string | null; stepIdsJson: string | null;
    partId?: string | null; storedFrontOfPartId?: string | null; frontFound?: boolean;
  }>;
  /** The guarded write; the session's status after it, or null when the guard refused. */
  save(id: string, props: PatchProps, stepIdsJson: string | null, final: boolean): Promise<string | null>;
  /** 5d's thread (frontLink.ts): this visit's part in front of the one picked. */
  link?(frontId: string, behindId: string): Promise<boolean>;
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
  const asked = typeof input.props.frontOfPartId === 'string' ? input.props.frontOfPartId : null;
  const state = await deps.saveState(input.id, asked);
  if (!state.partsOn) throw partsOff();
  if (!state.status) throw new HttpsError('not-found', 'Session not found');
  if (state.status !== 'open') throw frozen();
  // 5d: only the caller's own active or resting part, never this visit's own. Anything else is dropped,
  // not refused: the rest of the visit is still saved.
  const props = { ...input.props };
  if (asked && (!state.frontFound || asked === state.partId)) delete props.frontOfPartId;
  const status = await deps.save(input.id, props, mergeStepIds(state.stepIdsJson, input.stepIds), input.final);
  if (status === null) throw frozen(); // saved in between: the guard held
  // A visit to a part already kept: its last save draws 5d's thread, from what is stored now.
  const front = 'frontOfPartId' in props ? (props.frontOfPartId as string | null) : state.storedFrontOfPartId ?? null;
  if (status === 'saved' && state.partId && front && front !== state.partId) await deps.link?.(state.partId, front);
  return { id: input.id, status: status === 'saved' ? 'saved' : 'open' };
}
