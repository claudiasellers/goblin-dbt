/**
 * Meet a part's session record (docs/design/parts.md, "Meet a part → What's saved"). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** Where the visit came from (parts.md "Entries"). */
/** Where a Meet a part visit started; `tools`: the Tools list (Mindfulness), with parts on. */
export type TrailheadKind = 'offer' | 'me' | 'candidate' | 'settings' | 'angry_card' | 'problem_solve' | 'tools';
export const TRAILHEAD_KINDS: readonly TrailheadKind[] = ['offer', 'me', 'candidate', 'settings', 'angry_card', 'problem_solve', 'tools'];

/** The steps table's ids, plus the tender path's one screen and the "nothing there" branch. */
export type PartStepId =
  | 'find' | 'where' | 'shape' | 'age' | 'voice' | 'feel_toward' | 'unblend' | 'job' | 'job_like' | 'guards'
  | 'fear' | 'update' | 'thanks' | 'would_rather' | 'name' | 'keep' | 'tender' | 'nothing';
export const PART_STEP_IDS: readonly PartStepId[] = [
  'find', 'where', 'shape', 'age', 'voice', 'feel_toward', 'unblend', 'job', 'job_like', 'guards',
  'fear', 'update', 'thanks', 'would_rather', 'name', 'keep', 'tender', 'nothing',
];

/** Where the visit ended: a step, the blending check, or before the first step. */
export type PartExitStep = PartStepId | 'blend' | 'entry';

/** The blending check (ask-fresh). */
export type BlendCheck = 'notice' | 'running' | 'not_sure';
export const BLEND_CHECKS: readonly BlendCheck[] = ['notice', 'running', 'not_sure'];

export type PartStopReason = 'tender' | 'own_words' | 'danger' | 'not_self' | 'nothing' | 'later' | 'done';
export const PART_STOP_REASONS: readonly PartStopReason[] = ['tender', 'own_words', 'danger', 'not_self', 'nothing', 'later', 'done'];

/** One P2 hand-off entry, exactly as DEAR MAN stores them in `ext.er.handoffs` (≤ 4). */
export interface PartHandoffEntry {
  primitiveId?: string;
  completed?: boolean;
  durationSec?: number;
  thenVsNow?: string;
  resumed?: boolean;
  overridden?: boolean;
}

export interface StartPartSessionRequest {
  id: string;
  trailheadKind: TrailheadKind;
  partId?: string;
  candidateId?: string;
  /** trailheadKind 'offer' only (and required there): the trail offer answered "Yes, a part of me". */
  offerId?: string;
  moveIds?: string[];
}

/**
 * What a save may set. Every key is optional; a key that is present replaces the stored value
 * (`stepIds` merges per step; `null` or '' clears an own-words field).
 */
export interface PartSessionPatch {
  stepIds?: Partial<Record<PartStepId, string[]>>;
  /** In the order asked. Ask-fresh: never pre-filled. */
  feelTowardIds?: string[];
  blendCheck?: BlendCheck;
  handoffs?: PartHandoffEntry[];
  steppedBack?: boolean;
  stopReason?: PartStopReason;
  exitStep?: PartExitStep;
  /** The person's own words: kept as written, never linted, parsed or logged. */
  ownVoice?: string | null;
  ownJob?: string | null;
  ownFear?: string | null;
  ownUpdate?: string | null;
  /** Body figure place ids, at most 3. */
  bodyPlaces?: string[];
  /** Shape it's five values, each 0–1. */
  shapeSig?: number[];
  /** Tune it's four values, each 0–1. */
  soundSig?: number[];
  /**
   * 5d: the caller's own active or resting part this one stands in front of (not ask-fresh); `null`
   * clears it. The thread is written from the stored session, on the keep or a kept part's last save.
   */
  frontOfPartId?: string | null;
}

export interface SavePartSessionRequest {
  id: string;
  patch: PartSessionPatch;
  /** Finalise: the record is frozen after this. */
  final?: boolean;
}

export interface PartSessionResponse { id: string; status: 'open' | 'saved' }
