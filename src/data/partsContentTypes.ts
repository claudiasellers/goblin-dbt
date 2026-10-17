/**
 * The parts copy the app ships (src/data/content/parts.json): signed-off rows of schema/parts.cypher
 * only, built by scripts/content-snapshot/build.mjs (`buildParts`) in the shape of
 * tests/fixtures/parts-content.json's moves / prompts / options / hurts. Everything here is approved by
 * construction, so no row carries a review status. Pure, no imports.
 *
 * The file ships an allowlist: exactly the fields declared here, which are the fields a screen or a client
 * gate reads (PARTS_FIELDS in scripts/content-snapshot/partsAllowlist.mjs; tests/content-snapshot.test.mjs
 * holds the two equal). A field added in scripts/parts/content.py stays on the server until a screen needs
 * it: then add it to both. Rows arrive in content order.
 */

/** A protective move a part may use (offerable moves only). Copy is second person. */
export interface PartsMove {
  id: string;
  label: string;
  /** Follows "A part of you …" (fills {move}). */
  unblendPhrase: string;
  /** A describing name suggestion ("the one who hides"), never an archetype. */
  nameHint: string;
  /** Picking a danger chip or own words on this move shows crisis resources alongside. */
  safetyLine: boolean;
}

/** One of the app's questions or statements in a parts flow. */
export interface PartsPrompt {
  copy: string;
}

/** What picking an option does (scripts/parts/content.py, `branch`). */
export type PartsBranch =
  | 'continue' | 'tender_offer' | 'tender_path' | 'grounding' | 'unblend' | 'conservative' | 'danger'
  | 'body_first' | 'candidate' | 'end' | 'keep' | 'own_words' | 'meet' | 'split' | 'new' | 'aftercare' | 'checkback';

/** A chip the person taps (at the voice step, what the part might say, in the person's pick). */
export interface PartsOption {
  id: string;
  label: string;
  flag: 'tender' | 'danger' | null;
  /** Feel-toward only: whether the answer is Self-like. */
  selfLike: boolean | null;
  branch: PartsBranch;
  order: number;
  /** Move ids it is offered for, in order; empty means every move. A listed move may not be signed off yet. */
  moves: string[];
}

/** A hurt a protective move may be guarding (a category, never a memory). */
export interface PartsHurt {
  id: string;
  label: string;
  feltPhrase: string;
  /** What the anger says matters (the angry card's vote of confidence, fills {matters}). */
  matters: string;
  order: number;
  /** Check-in words that name it. */
  namedAs: string[];
  /** Signed-off moves that often guard it, with their rank for that move. */
  guardedBy: { moveId: string; rank: number }[];
}

/**
 * Two pulls' pair (two offerable moves that pull against each other): ids only. Each chip list names
 * options in `options.pulls` (both_want, worry): what both want for the person, and each side's worry
 * about the other getting its way (worryA is A's), in order.
 */
export interface PartsPair {
  id: string;
  a: string;
  b: string;
  bothWant: string[];
  worryA: string[];
  worryB: string[];
}

export interface PartsContent {
  /** content.py's VERSION; null only when the graph has no parts content at all. */
  version: string | null;
  moves: PartsMove[];
  prompts: Record<string, PartsPrompt>;
  /** flow → step → options, in order. */
  options: Record<string, Record<string, PartsOption[]>>;
  hurts: PartsHurt[];
  /** Recover's "what happened" (InvalidationEvent id) → the hurts it can touch, in order (approved CAN_TOUCH). */
  canTouch: Record<string, string[]>;
  /**
   * Source label (ActionUrge, FeelingUrge, PullOption, …) → module id → the move it expresses: approved
   * EXPRESSES edges whose move ships (so never go_blank / zone_out). Feeds the in-the-moment unblend line.
   */
  expresses: Record<string, Record<string, string>>;
  /** Two pulls' signed-off pairs whose two moves ship (absent in an older file: none). */
  pairs?: PartsPair[];
  /**
   * PartsPolicy's two numbers a screen needs, only once the policy is signed off. Absent: the client's
   * pinned defaults (the server's), src/lib/meetAPartSave.ts.
   */
  limits?: { nameMaxChars: number; maxNonSelfAnswers: number };
}
