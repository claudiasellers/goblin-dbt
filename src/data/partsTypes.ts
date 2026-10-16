/**
 * Parts types (docs/design/parts.md). Pure, no imports.
 * The entry gate mirrors functions/src/parts/; each mirrored block's server text appears here unchanged
 * (the tests assert it). The angry-part card's types are the client's own: the shape of the parts content
 * it reads (tests/fixtures/parts-content.json, scripts/parts/fixture.py); its copy lives in the graph
 * (scripts/parts/content.py), never here.
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

// --- The angry-part card (src/lib/angryPart.ts, src/components/parts/AngryPartCard.tsx) ---

/** The angry card's lines. Each exists twice in the content: `id` (parts on) and `id_plain` (parts off). */
export const ANGRY_LINES = [
  'angry_unblend', 'angry_unblend_sub', 'angry_protects',
  'angry_vote', 'angry_vote_noname', 'angry_vote_unsure', 'angry_vote_unsure_noname',
  'angry_vote_2', 'angry_vote_3', 'angry_vote_3_noname', 'angry_hold',
  'angry_speak', 'angry_speak_unsure', 'angry_speak_line',
] as const;
export type AngryLineId = (typeof ANGRY_LINES)[number];

/** The angry card's options shared by both wordings (none of them names a part). */
export const ANGRY_OPTIONS = ['angry_next', 'angry_not_sure', 'angry_done'] as const;
export type AngryOptionId = (typeof ANGRY_OPTIONS)[number];

/**
 * The card's own way past on its first screen, one per wording (the card is offered, never imposed;
 * its host shows it as the skip link). Both read "Not now" today; each wording is reviewed on its own.
 */
export const ANGRY_NOT_NOW = 'angry_not_now';
export type AngryNotNowId = typeof ANGRY_NOT_NOW | `${typeof ANGRY_NOT_NOW}_plain`;

/** Every prompt and option of the angry flow (both wordings), by id, as plain strings. */
export type AngryCardCopy = Record<AngryLineId | `${AngryLineId}_plain` | AngryOptionId | AngryNotNowId, string>;

export type AngryStep = 'unblend' | 'protects' | 'vote' | 'speak';

/** A hurt chip as the card shows it, in the order to offer. */
export interface AngryHurt { id: string; label: string; matters: string; feltPhrase: string }

/** What the card hands back to its host. Nothing is saved by the card itself. */
export interface AngryCardResult {
  /** The hurt picked at "What it protects"; null for "Not sure". */
  hurtId: string | null;
  /** True only when the 4 s hold completed. */
  voteHeld: boolean;
  exitStep: AngryStep;
}

/**
 * A ProtectedHurt as the card reads it (the fixture's and parts.json's `hurts`; PartsHurt in
 * partsContentTypes.ts fits). A hurt without its label, matters or feltPhrase is never offered.
 */
export interface AngryContentHurt {
  id: string; label: string; feltPhrase: string; matters?: string; order: number;
  /** OFTEN_GUARDS: the moves that may guard it, with the hurt's rank in each move's chip order. */
  guardedBy: { moveId: string; rank: number }[];
}

/** The slice of the parts content the angry card is built from (the fixture's shape; the harness reads it). */
export interface AngryCardContent {
  prompts: Record<string, { flow: string; step: string; copy: string }>;
  options: Record<string, Record<string, { id: string; label: string }[]>>;
  hurts: AngryContentHurt[];
}
