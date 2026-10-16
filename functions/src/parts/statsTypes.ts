/**
 * The integration readout per part (docs/design/parts.md, "The part card" and Reflect). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** The time-of-day bands of `when`, in the person's time zone: 05–12, 12–17, 17–22, 22–05. */
export type PartWhen = 'mornings' | 'afternoons' | 'evenings' | 'nights';
export const PART_WHENS: readonly PartWhen[] = ['mornings', 'afternoons', 'evenings', 'nights'];

/**
 * A part's lines, each null below its threshold (functions/src/parts/stats.ts STATS_THRESHOLDS).
 * Counts and ids only: the app words them from the shipped parts copy (common/stats).
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
