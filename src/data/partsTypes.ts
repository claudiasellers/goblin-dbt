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

// --- The angry-part card (src/lib/angryPart.ts, src/components/parts/AngryPartCard.tsx) ---

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
  /** CAN_TOUCH: Recover's "what happened" (its state id, an InvalidationEvent) → hurt ids, in order. */
  canTouch: Record<string, string[]>;
}
