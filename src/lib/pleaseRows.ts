/**
 * Running low's rows the person can leave out (ER-07, kind `please_rows`, docs/design/running-low.md). Mirrors
 * functions/src/profile/kinds.ts PLEASE_HIDEABLE_ROWS and scripts/skills/please_skill.py HIDEABLE (a test keeps the
 * three equal). Sleep, the opening screen, is never one of them. Pure.
 */
export const PLEASE_HIDEABLE_ROWS = ['food', 'body', 'subs', 'moved'] as const;
export type PleaseRow = (typeof PLEASE_HIDEABLE_ROWS)[number];

/**
 * Me's words for the setting (presentation, like the rest of Me's chrome; the rows' own questions stay the skill's
 * graph copy). Kept here so Me never loads the skill catalogue for four labels.
 */
export const PLEASE_ROWS_COPY = {
  set: 'Leave rows out of Running low',
  hint: "Running low won't ask about the ones you pick. Sleep always comes first, and any row can be skipped.",
  none: 'Running low asks every row.',
  /** Shown while Body is picked: what leaving it out takes away (the only medication and pain prompts). */
  body: "Running low won't ask about pain or missed meds.",
  names: { food: 'Food', body: 'Body', subs: 'Alcohol or drugs', moved: 'Moving' } as Record<PleaseRow, string>,
};

/** The stored value's hidden rows (known ones only, in row order); anything unreadable is nothing hidden. */
export function pleaseRowsOf(value: unknown): PleaseRow[] {
  const hidden = value && typeof value === 'object' ? (value as { hidden?: unknown }).hidden : null;
  return Array.isArray(hidden) ? PLEASE_HIDEABLE_ROWS.filter((r) => hidden.includes(r)) : [];
}
