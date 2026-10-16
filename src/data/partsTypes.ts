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
