/**
 * Two pulls (docs/design/parts.md, "Two pulls (polarities)"): its session record, the keepsake and the
 * week check-back. Pure, no imports. Mirrored in src/data/partsTypes.ts (tests/two-pulls.test.mjs
 * asserts the text appears there).
 */

/** The tool's spine id and its ToolSession DETAIL kind. */
export const TWO_PULLS_TOOL = 'two-pulls';
/** The FollowUpType id (scripts/practice-spine/content.py): a week after, for both kept parts. */
export const TWO_PULLS_CHECKBACK_TYPE = 'two_pulls_checkback';

/**
 * Open a visit. Either two kept parts (`aId` and `bId`, both the caller's own, different; from the den;
 * with `pairId` when their moves form a PolarityPair, `moveA` its `a`) or a pair alone (`pairId`; from a
 * rule C trail's More than one, with that `offerId`).
 * `moveA` / `moveB`: the move each side is about (a pair's sides; for a part, one it USES), so a side
 * with no name can be called by it.
 */
export interface StartPullsSessionRequest {
  id: string;
  aId?: string;
  bId?: string;
  pairId?: string;
  offerId?: string;
  moveA: string;
  moveB: string;
}

/** The screens a visit can stop on (exitStep), plus the blending check and the entry. */
export type PullsExitStep =
  | 'entry' | 'blend' | 'place' | 'feel' | 'unblend' | 'needs_time' | 'step_back' | 'worry_a' | 'worry_b' | 'stop'
  | 'both_want' | 'keepsake' | 'close';
export const PULLS_EXIT_STEPS: readonly PullsExitStep[] = [
  'entry', 'blend', 'place', 'feel', 'unblend', 'needs_time', 'step_back', 'worry_a', 'worry_b', 'stop',
  'both_want', 'keepsake', 'close',
];

/**
 * Why a visit stopped: one side needed its own time (`not_self`), own words at a worry (`own_words`,
 * the conservative branch), danger, P2's come back later, or done.
 */
export type PullsStopReason = 'not_self' | 'own_words' | 'danger' | 'later' | 'done';
export const PULLS_STOP_REASONS: readonly PullsStopReason[] = ['not_self', 'own_words', 'danger', 'later', 'done'];

export type PullsSide = 'a' | 'b';

/**
 * What a save may set. Every key is optional; a key that is present replaces the stored value
 * (`null` or '' clears an own-words field).
 */
export interface PullsSessionPatch {
  /** Where the person put their light on the stage, x then y, each 0–1. A log field only. */
  lightAt?: number[];
  /** Ask-fresh: how they felt toward each side, in the order asked; `feelTowardSides` says whose. */
  feelTowardIds?: string[];
  feelTowardSides?: PullsSide[];
  blendCheck?: 'notice' | 'running' | 'not_sure';
  /** The P2 hand-offs, in DEAR MAN's `ext.er.handoffs` shape (≤ 4). */
  handoffs?: Array<{ primitiveId?: string; completed?: boolean; durationSec?: number; thenVsNow?: string; resumed?: boolean; overridden?: boolean }>;
  /** A non-Self-like answer was given and the unblend asked. */
  steppedBack?: boolean;
  /** The side that needed its own time. */
  needsTimeSide?: PullsSide | null;
  /** Held breaths at Step back (0–5). */
  stepBackHolds?: number;
  /** Each side's worry: a chip id, or the person's own words (kept as written, never read). */
  worryA?: string | null;
  worryB?: string | null;
  ownWorryA?: string | null;
  ownWorryB?: string | null;
  /** What they both want (a pair's bothWant chip): fills the keepsake. */
  bothWantId?: string | null;
  stopReason?: PullsStopReason;
  exitStep?: PullsExitStep;
}

export interface SavePullsSessionRequest {
  id: string;
  patch: PullsSessionPatch;
  /** Finalise: the record is frozen after this. */
  final?: boolean;
}
export interface PullsSessionResponse { id: string; status: 'open' | 'saved' }

/**
 * "Keep this": the keepsake, built on the server from the stored visit (the two names, what they both
 * want, the signed-off keepsake lines), saved to My words as an OwnLine (`source: 'two_pulls'`).
 * `lineId` is a client UUID for the line. With two kept parts it also links them in the den
 * (PartLink `kind: 'two_pulls'`, `linkId`).
 */
export interface KeepPullsKeepsakeRequest { sessionId: string; lineId: string }
export interface KeepPullsKeepsakeResponse { lineId: string; text: string; version: number; linkId?: string }

/** On the close's yes: check back with both kept parts in a week (the type's window, computed on the device). */
export interface SchedulePullsCheckbackRequest { id: string; sessionId: string; dueAt: string }
export interface SchedulePullsCheckbackResponse { id: string | null }
