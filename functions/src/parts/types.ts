/**
 * Parts entry gate types (docs/design/parts.md, "The flood signal" and "Meet a part → Gates").
 * Mirrored in src/data/partsTypes.ts.
 */

/** What the client opens first. Every outcome lets the person continue: none of them locks. */
export type PartsEntryOpen = 'p2' | 'far_away' | 'clear';

/** Why, as ids, for logging and tests; never shown. */
export type PartsEntryReason = 'checkin_flooding' | 'checkin_crisis' | 'recover_loud' | 'dissociation_history';

export type PartsEntry = (
  /** The P2 body hand-off first (Keep going anyway stays), with the crisis banner alongside when `crisis`. */
  | { open: 'p2'; band: 'flooded'; crisis: boolean; reasons: PartsEntryReason[] }
  /** The far-away heads-up, then the choice. */
  | { open: 'far_away'; reasons: PartsEntryReason[] }
  | { open: 'clear'; reasons: PartsEntryReason[] }
) & {
  /**
   * Present (true) only when the caller made PartsPolicy.tooManyPartsCount parts or more within
   * tooManyPartsDays: Meet a part says "You don't need to get to know everyone at once." once. Never blocks.
   */
  tooMany?: true;
  /**
   * Present (true) only when the request named one of the caller's own parts and its pausedUntil (set
   * when the next-day check-back said Louder) is still ahead: Meet a part goes gently. Never blocks.
   */
  paused?: true;
};
