/**
 * The tools' seven-choice rule (Claudia, 18 Nov 2026; Miller's and Hick's laws): a tool screen offers at most
 * seven choices at once, and a longer set comes in chunks. Tools only: the check-in's word list, square and body
 * step are not chunked.
 *
 * Pure, so the skill player, the Tools page and the build check share one count. `reserved` is the controls that
 * sit beside the options and count as choices too (*add your own*, a picker's *more* chip). When the options don't
 * fit, one of the seven slots becomes the chunk control (*More options*), so a chunk holds `7 - reserved - 1`.
 */
export const MAX_CHOICES = 7;

/** How many options one chunk holds, given the controls beside them. All of them when they fit. */
export function chunkSize(total: number, reserved = 0): number {
  const slots = Math.max(1, MAX_CHOICES - reserved);
  return total <= slots ? total : Math.max(1, slots - 1);
}

export interface Chunk<T> {
  /** What to show: this chunk, plus anything already picked from another chunk (a pick never disappears). */
  shown: T[];
  /** Which chunk this is (wrapped into range). */
  page: number;
  /** How many chunks there are; 1 means no chunk control. */
  pages: number;
}

/**
 * One chunk of `items`, in their own order (the content's order decides what leads). Picked items from other
 * chunks stay in place in the original order, so a list never reorders and a pick is never hidden.
 */
export function chunkOf<T>(items: readonly T[], page: number, reserved = 0, kept: (item: T) => boolean = () => false): Chunk<T> {
  const size = chunkSize(items.length, reserved);
  if (size >= items.length) return { shown: [...items], page: 0, pages: 1 };
  const pages = Math.ceil(items.length / size);
  const p = ((page % pages) + pages) % pages;
  const lo = p * size;
  const hi = lo + size;
  return { shown: items.filter((item, i) => (i >= lo && i < hi) || kept(item)), page: p, pages };
}
