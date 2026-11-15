/**
 * The thought's own words, held further off (DT-08 part 2, docs/design/thoughts-passing.md): the rules behind the
 * `thoughtDrift` embed, pure. *Slow it down* shows the thought a word at a time, the gaps wide; *Set it on a leaf*
 * puts it on a leaf that floats across a stream at its own pace, and *Another leaf* puts it on the next one. Nothing
 * here pushes the thought away: the leaf drifts, it is never thrown, and a thought that comes back gets a new leaf.
 */

/** Words shown at most when slowed down: a long paragraph would turn the exercise into reading. */
export const MAX_WORDS = 24;
/** Characters on a leaf at most; longer thoughts end in an ellipsis (the person knows the rest). */
export const LEAF_CHARS = 48;
/** The share of the dose the words take to arrive; the whole line then sits for the rest. */
export const ARRIVE_SHARE = 0.8;
/** How long one leaf takes to cross the stream. Slow on purpose: the pace is the leaf's, not the person's. */
export const LEAF_CROSS_MS = 18_000;

/** The thought as one line: the field's picks (labels, own words last), the first that has words. */
export function thoughtLine(picks: readonly string[] | undefined): string {
  return (picks ?? []).map((p) => p.replace(/\s+/g, ' ').trim()).find((p) => p.length > 0) ?? '';
}

/** The words to slow down, at most MAX_WORDS (the rest end in an ellipsis on the last one). */
export function thoughtWords(line: string, max = MAX_WORDS): string[] {
  const words = line.split(' ').filter(Boolean);
  if (words.length <= max) return words;
  const kept = words.slice(0, max);
  kept[max - 1] = `${kept[max - 1]}…`;
  return kept;
}

/** How many words are showing at `fraction` of the dose: the first at once, the last by ARRIVE_SHARE. */
export function wordsShown(fraction: number, n: number): number {
  if (n <= 0) return 0;
  if (fraction >= ARRIVE_SHARE) return n;
  return Math.min(n, Math.max(1, Math.floor((Math.max(0, fraction) / ARRIVE_SHARE) * n) + 1));
}

/** The leaf's words: the line, cut at a word boundary to LEAF_CHARS with an ellipsis. */
export function leafLabel(line: string, max = LEAF_CHARS): string {
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Where a leaf is across the stream (0 upstream, 1 gone downstream), `ms` after it was set down. */
export function leafAt(ms: number, crossMs = LEAF_CROSS_MS): number {
  return Math.min(1, Math.max(0, ms / crossMs));
}
