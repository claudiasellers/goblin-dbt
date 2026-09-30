/**
 * Check-in result card labels (WMP-04 v0 side labels, plan E4-4). Presentation only: which label a
 * card gets is decided in src/lib/recommendation.ts from the `side` the engine returns.
 * Draft wording (reviewStatus: 'draft'); moves to the graph if Claudia wants it voice-linted there.
 */
export const ROUTING_LABELS = {
  reviewStatus: 'draft',
  /** Two cards, one change skill and one acceptance skill: each gets its side's label. */
  change: 'Change what you can',
  acceptance: "Make room for what you can't",
  /** Two cards on the same side (or a `both` tool): only the swap gets a heading. */
  swap: 'Or try this',
  /** A swap that only makes sense after the first card (`requiresPrior`). */
  afterPrimary: "Once you've moved a little",
} as const;
