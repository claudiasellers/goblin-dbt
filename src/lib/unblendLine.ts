/**
 * The in-the-moment unblend line (docs/design/parts.md, "How parts show up in the moment"): with parts
 * on, right after a pull or urge the person picked, "A part of you {move} right now." built from the move
 * the pick expresses. It names no particular part, asks nothing and adds no step. Pure.
 *
 * Everything comes from the shipped parts content: the prompt `unblend_line`, the move's
 * `unblendPhrase`, and `expresses` (approved EXPRESSES edges to moves that ship, so a shutdown pick,
 * go_blank / zone_out, never has a line). Hosts decide when (parts on, never while P2 is open).
 */
import type { PartsContent, PartsMove } from '../data/partsContentTypes';
import { promptCopy, surfaceReady, type SurfaceIds } from './partsContent';

export const UNBLEND_PROMPT = 'unblend_line';
/** What the line requires of the copy (the move's phrase and the EXPRESSES edge come from the vocabulary). */
export const UNBLEND_REQUIRED: SurfaceIds = { prompts: [UNBLEND_PROMPT], options: [] };

/** Each host's picks, by the label their ids live on in `expresses` (scripts/parts/content.py EXPRESSES). */
export const UNBLEND_SOURCES = {
  /** Find the feeling's pull (fight / chase / hide / blank). */
  ftf: 'FeelingUrge',
  /** Do the Opposite's urge (ActionUrge ids). */
  oa: 'ActionUrge',
  /** Recover's pull, as its PullOption id (recoverPullOption). */
  recover: 'PullOption',
} as const;
export type UnblendSource = keyof typeof UNBLEND_SOURCES;

/** Recover's pull id → its PullOption id (content.py PULL_OPTIONS: `recover_<pull>`; a test pins it). */
export const recoverPullOption = (pull: string): string => `recover_${pull}`;

/**
 * The move the host's pick(s) express, or null: an approved EXPRESSES edge to a move that ships (so an
 * offerable one: shutdown moves never ship). Several picks give a move only when every one has an edge and
 * all share it, never a guess between moves. Also read by Do the Opposite's goal line (src/lib/oaGoalLine.ts).
 */
export function expressedMove(content: PartsContent | null, source: UnblendSource, ids: string | readonly string[] | null): PartsMove | null {
  if (!content || ids === null) return null;
  const picks = typeof ids === 'string' ? [ids] : [...ids];
  if (picks.length === 0) return null;
  const table = content.expresses?.[UNBLEND_SOURCES[source]] ?? {};
  const moves = new Set(picks.map((id) => (Object.hasOwn(table, id) ? table[id] : null)));
  if (moves.size !== 1 || moves.has(null)) return null;
  const [moveId] = moves;
  return content.moves.find((m) => m.id === moveId) ?? null;
}

/**
 * The filled line, or null: no edge for the pick, no phrase, or the line not shipped. Several picks give
 * a line only when every one of them has an edge and all share one move (then it is that move's line);
 * otherwise null, never a guess between moves.
 */
export function unblendLine(content: PartsContent | null, source: UnblendSource, ids: string | readonly string[] | null): string | null {
  if (!content || !surfaceReady(content, UNBLEND_REQUIRED)) return null;
  const phrase = expressedMove(content, source, ids)?.unblendPhrase;
  const copy = promptCopy(content, UNBLEND_PROMPT);
  if (!phrase || !copy || !copy.includes('{move}')) return null;
  return copy.replace('{move}', phrase);
}

/** Where each host records that the line showed: its ToolSession's ext namespace (functions/src/spine/tools.ts). */
export const UNBLEND_EXT_NS: Record<UnblendSource, 'er' | 'wmp'> = { ftf: 'er', oa: 'er', recover: 'wmp' };
