/**
 * Running low's rows the person can leave out (ER-07, kind `please_rows`, docs/design/running-low.md). Mirrors
 * functions/src/profile/kinds.ts PLEASE_HIDEABLE_ROWS and scripts/skills/please_skill.py HIDEABLE (a test keeps the
 * three equal). Sleep, the opening screen, is never one of them. Pure.
 */
export const PLEASE_HIDEABLE_ROWS = ['food', 'body', 'subs', 'moved'] as const;

/** The stored value's hidden rows (known ones only, in row order); anything unreadable is nothing hidden. */
export function pleaseRowsOf(value: unknown): string[] {
  const hidden = value && typeof value === 'object' ? (value as { hidden?: unknown }).hidden : null;
  return Array.isArray(hidden) ? PLEASE_HIDEABLE_ROWS.filter((r) => hidden.includes(r)) : [];
}

/** Each row's name from the skill's copy (`me_rows_names`, split on " · ", in PLEASE_HIDEABLE_ROWS order). */
export function pleaseRowNames(copy: Readonly<Record<string, string>>): Record<string, string> {
  const names = (copy.me_rows_names ?? '').split(' · ');
  return Object.fromEntries(PLEASE_HIDEABLE_ROWS.map((r, i) => [r, names[i] ?? r]));
}
