/**
 * The integration readout per part (docs/design/parts.md, "The part card" and Reflect). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** The time-of-day bands of `when`, in the person's time zone: 05–12, 12–17, 17–22, 22–05. */
export type PartWhen = 'mornings' | 'afternoons' | 'evenings' | 'nights';
export const PART_WHENS: readonly PartWhen[] = ['mornings', 'afternoons', 'evenings', 'nights'];

/**
 * A part's lines, each null below its threshold (functions/src/parts/stats.ts STATS_THRESHOLDS).
 * Counts and ids: the app words them from the shipped parts copy (common/stats). The one exception is
 * `steps`, whose labels are graph content read in the same response (never the person's own words).
 */
export interface PartStats {
  /** Tools whose better closes the person tagged with this part, most first (ties: most recent), ≤ 3. */
  helped: { toolId: string; n: number }[] | null;
  /**
   * How they've felt toward it: the most common first feel-toward answer (a meet/feel option id) in the
   * earlier and the later half of their visits. `then` is null when the two are the same ("Since …").
   * `month` is the earlier half's first visit, `YYYY-MM` in the person's time zone.
   */
  felt: { month: string; then: string | null; now: string } | null;
  /** The band more than half of the tags fall in. */
  when: PartWhen | null;
  /**
   * The steps chosen in the tool sessions the person tagged with this part (a better close): Do the
   * Opposite's opposite step, Recover's path. Most used first (ties: most recent), ≤ 3, each with its
   * graph label (ActionUrge / EmotionRegulationContent step, RecoveryExit title). Own-words steps are
   * never counted. Null below 2 tagged sessions that have a step.
   */
  steps: { stepId: string; label: string; n: number }[] | null;
}

/** One part's block in Reflect: who it is (as the person kept it) and its lines (at least one is set). */
export interface PartReflect {
  id: string;
  name: string | null;
  /** The first body place id, for "The one in your {place}" when it has no name. */
  firstPlace: string | null;
  /** Shape it's five numbers (PartFigure); null is the plain round figure. */
  shapeSig: number[] | null;
  stats: PartStats;
}

/**
 * Reflect's line across all the person's parts: the most common FIRST feel-toward answer (a meet/feel
 * option id) of their Meet a part visits in the last 30 days (`now`) and in the 30 days before (`then`,
 * null unless it differs and is past its own threshold). Ids only; null below the threshold.
 */
export interface PartsFeel { now: string; then: string | null }
