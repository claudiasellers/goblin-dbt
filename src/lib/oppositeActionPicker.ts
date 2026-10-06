/**
 * Do the Opposite's picker logic (pure). A pick is one DBT parent ("door") plus the word that
 * names it: the door's anchor word when the door itself was tapped, or the word someone chose
 * (from the check-in, the body map, the square or the full list). One pick per parent, at most
 * MAX_FEELINGS, kept in the order they were added until the person puts them in order.
 */
import { MAX_FEELINGS, OPPOSITE_ACTION_DOORS, type OppositeActionDoor } from '../data/oppositeActionDoors';
import type { OppositeActionPickerContent, PickerUrge } from '../data/oppositeActionPickerTypes';

export interface Door extends OppositeActionDoor {
  label: string;
  acknowledgment: string;
  urges: PickerUrge[];
  wordIds: string[];
}

export interface Pick {
  parent: string;
  wordId: string;
  /** True while the word is only the door's anchor; a chosen word replaces it. */
  fromDoor: boolean;
}

/** The doors to show: every presentation door whose parent the graph gives words and urges, in door order. */
export function doorsFrom(content: OppositeActionPickerContent): Door[] {
  return OPPOSITE_ACTION_DOORS.flatMap((d) => {
    const p = content.parents.find((x) => x.id === d.parent);
    if (!p || !p.wordIds.length || !p.urges.length) return [];
    const anchorWordId = p.wordIds.includes(d.anchorWordId) ? d.anchorWordId : p.wordIds[0];
    return [{ ...d, anchorWordId, label: p.label, acknowledgment: p.acknowledgment, urges: p.urges, wordIds: p.wordIds }];
  });
}

/** The parent a word works on, or null when Opposite Action isn't the skill for it. */
export function parentOfWord(content: OppositeActionPickerContent, wordId: string): string | null {
  const w = content.words[wordId];
  return w?.applicable && w.parent ? w.parent : null;
}

/** Tap a door: pick it (as its anchor word) or put it back. A fourth door is refused. */
export function toggleDoor(picks: Pick[], door: Door): Pick[] {
  if (picks.some((p) => p.parent === door.parent)) return picks.filter((p) => p.parent !== door.parent);
  if (picks.length >= MAX_FEELINGS) return picks;
  return [...picks, { parent: door.parent, wordId: door.anchorWordId, fromDoor: true }];
}

/**
 * Add chosen words. A word whose parent is already picked through its door replaces the anchor;
 * a parent that already has a chosen word keeps it. Words Opposite Action doesn't work on, and words
 * past the limit, come back in `skipped` / `overflow` so the screen can say so.
 */
export function addWords(
  picks: Pick[],
  content: OppositeActionPickerContent,
  wordIds: string[],
): { picks: Pick[]; skipped: string[]; overflow: string[] } {
  const next = [...picks];
  const skipped: string[] = [];
  const overflow: string[] = [];
  for (const id of wordIds) {
    const parent = parentOfWord(content, id);
    if (!parent) {
      skipped.push(id);
      continue;
    }
    const i = next.findIndex((p) => p.parent === parent);
    if (i >= 0) {
      if (next[i].fromDoor) next[i] = { parent, wordId: id, fromDoor: false };
      continue;
    }
    if (next.length >= MAX_FEELINGS) {
      overflow.push(id);
      continue;
    }
    next.push({ parent, wordId: id, fromDoor: false });
  }
  return { picks: next, skipped, overflow };
}

/** Change the word for a picked parent (the "closer word" chips). */
export function setWord(picks: Pick[], parent: string, wordId: string): Pick[] {
  return picks.map((p) => (p.parent === parent ? { parent, wordId, fromDoor: false } : p));
}

/**
 * Loudest first: tapping a pick gives it the next rank; tapping a ranked one takes it (and the
 * ones after it) back out. When one pick is left unranked it takes the last place by itself.
 */
export function tapRank(ranked: string[], parent: string, all: string[]): string[] {
  const at = ranked.indexOf(parent);
  if (at >= 0) return ranked.slice(0, at);
  const next = [...ranked, parent];
  const rest = all.filter((p) => !next.includes(p));
  return rest.length === 1 ? [...next, rest[0]] : next;
}

/** Picks in rank order; anything unranked follows in the order it was picked. */
export function inRankOrder(picks: Pick[], ranked: string[]): Pick[] {
  const pos = (p: Pick) => {
    const i = ranked.indexOf(p.parent);
    return i < 0 ? ranked.length + picks.indexOf(p) : i;
  };
  return [...picks].sort((a, b) => pos(a) - pos(b));
}

/** Of words sorted nearest-first (wordsNear), the first `n` Opposite Action works on. */
export function nearestApplicable(sortedIds: string[], content: OppositeActionPickerContent, n: number): string[] {
  return sortedIds.filter((id) => parentOfWord(content, id)).slice(0, n);
}

/** Reorder a parent's urges by the graph's order (the picker file), for content that arrives unordered. */
export function orderUrges<T extends { id: string }>(urges: T[], order: PickerUrge[] | undefined): T[] {
  if (!order?.length) return urges;
  const at = (id: string) => {
    const i = order.findIndex((u) => u.id === id);
    return i < 0 ? order.length : i;
  };
  return [...urges].sort((a, b) => at(a.id) - at(b.id));
}
