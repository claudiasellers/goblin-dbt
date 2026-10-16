/**
 * Parts types the app shares with functions/src/parts/ (docs/design/parts.md). Pure, no imports.
 * Each block mirrors its server file; the tests assert the server text appears here unchanged.
 */

// --- Entry gate: mirror of functions/src/parts/types.ts (tests/parts-entry.test.mjs) ---
/** What the client opens first. Every outcome lets the person continue: none of them locks. */
export type PartsEntryOpen = 'p2' | 'far_away' | 'clear';

/** Why, as ids, for logging and tests; never shown. */
export type PartsEntryReason = 'checkin_flooding' | 'checkin_crisis' | 'recover_loud' | 'dissociation_history';

export type PartsEntry =
  /** The P2 body hand-off first (Keep going anyway stays), with the crisis banner alongside when `crisis`. */
  | { open: 'p2'; band: 'flooded'; crisis: boolean; reasons: PartsEntryReason[] }
  /** The far-away heads-up, then the choice. */
  | { open: 'far_away'; reasons: PartsEntryReason[] }
  | { open: 'clear'; reasons: PartsEntryReason[] };

// --- Meet a part's session: mirror of functions/src/parts/sessionTypes.ts (tests/parts-entry.test.mjs) ---
/** Where the visit came from (parts.md "Entries"). */
export type TrailheadKind = 'offer' | 'me' | 'candidate' | 'settings' | 'angry_card' | 'problem_solve';
export const TRAILHEAD_KINDS: readonly TrailheadKind[] = ['offer', 'me', 'candidate', 'settings', 'angry_card', 'problem_solve'];

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
}

export interface SavePartSessionRequest {
  id: string;
  patch: PartSessionPatch;
  /** Finalise: the record is frozen after this. */
  final?: boolean;
}

export interface PartSessionResponse { id: string; status: 'open' | 'saved' }
