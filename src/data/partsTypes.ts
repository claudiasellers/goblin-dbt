/**
 * Parts content types (docs/design/parts.md). Pure. The shape a future getPartsContent returns, as far
 * as the app reads it today: the angry-part card. tests/fixtures/parts-content.json (scripts/parts/fixture.py)
 * has this shape; the copy itself lives in the graph (scripts/parts/content.py), never here.
 */

/** The angry card's lines. Each exists twice in the content: `id` (parts on) and `id_plain` (parts off). */
export const ANGRY_LINES = [
  'angry_unblend', 'angry_unblend_sub', 'angry_protects',
  'angry_vote', 'angry_vote_noname', 'angry_vote_unsure', 'angry_vote_unsure_noname',
  'angry_vote_2', 'angry_vote_3', 'angry_vote_3_noname', 'angry_hold',
  'angry_speak', 'angry_speak_unsure', 'angry_speak_line',
] as const;
export type AngryLineId = (typeof ANGRY_LINES)[number];

/** The angry card's options (one wording: none of them names a part). */
export const ANGRY_OPTIONS = ['angry_next', 'angry_not_sure', 'angry_done'] as const;
export type AngryOptionId = (typeof ANGRY_OPTIONS)[number];

/** Every prompt (both wordings) and option of the angry flow, by id, as plain strings. */
export type AngryCardCopy = Record<AngryLineId | `${AngryLineId}_plain` | AngryOptionId, string>;

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

/** A ProtectedHurt as the content serves it. */
export interface PartsHurt {
  id: string; label: string; hurtPhrase: string; feltPhrase: string; matters: string; namedAs: string[]; order: number;
  /** OFTEN_GUARDS: the moves that may guard it, with the hurt's rank in each move's chip order. */
  guardedBy: { moveId: string; rank: number }[];
}

/** The slice of the parts content the angry card is built from. */
export interface AngryCardContent {
  prompts: Record<string, { flow: string; step: string; copy: string }>;
  options: Record<string, Record<string, { id: string; label: string }[]>>;
  hurts: PartsHurt[];
  /** CAN_TOUCH: Recover's "what happened" (its state id, an InvalidationEvent) → hurt ids, in order. */
  canTouch: Record<string, string[]>;
}
