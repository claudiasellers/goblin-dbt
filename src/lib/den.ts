/**
 * The den (docs/design/parts.md, "The den"): Me → Parts of me → See them together. Pure: the copy gate,
 * where each part stands (the person's place, or the edge of the light for one not placed yet), how much
 * light a figure gets, the keyboard and tap machines, the thread requests and the then-and-now months.
 * The room itself is src/components/parts/den/.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { DenPart, DenRecency, DenSnapshotRef, LinkPartsRequest } from '../data/partsTypes';
import { surfaceReady, type SurfaceIds } from './partsContent';

export const DEN_PROMPTS = [
  'den_link', 'den_room', 'den_unnamed', 'den_move_help', 'den_move_keys', 'den_one_part', 'den_list',
  'den_pull_against', 'den_stands_front', 'den_which_front', 'den_thread_cancel', 'den_remove', 'den_then', 'den_now',
  'den_back_now',
] as const;
export type DenPromptId = (typeof DEN_PROMPTS)[number];
/** What the den's gate requires (scripts/parts/review.mjs reads it). */
export const DEN_REQUIRED: SurfaceIds = { prompts: DEN_PROMPTS, options: [] };
export type DenCopy = Record<DenPromptId, string>;

/** The den's copy, or null while any of it is missing (no link, no room). */
export function denCopy(content: PartsContent | null): DenCopy | null {
  if (!content || !surfaceReady(content, DEN_REQUIRED)) return null;
  return Object.fromEntries(DEN_PROMPTS.map((id) => [id, content.prompts[id].copy])) as DenCopy;
}

/** The route. */
export const DEN_PATH = '/me/parts/den';
/**
 * "See them together" sits above the cards from the first kept part: the room already says so when
 * there's one ("When you get to know another part, it will be here too.").
 */
export const DEN_MIN_PARTS = 1;
export const showDenLink = (liveParts: number, copy: DenCopy | null): boolean => !!copy && liveParts >= DEN_MIN_PARTS;

// ---- Where each part stands ----

export interface Spot { x: number; y: number }
/** The centre of the light (the person). Never a part's place: nobody stands on the lamp. */
export const LIGHT: Spot = { x: 0.5, y: 0.5 };
/** Where a part not placed yet arrives: the edge of the light. */
export const ARRIVE_RADIUS = 0.32;
/** Closer than this, two figures overlap. */
export const MIN_GAP = 0.26;
/** A figure stays this far inside the room's edge. */
export const EDGE = 0.06;

export const clamp = (v: number): number => Math.min(1 - EDGE, Math.max(EDGE, v));

/**
 * A figure and its name as boxes, in shares of the room at its narrowest (a 390 px phone: about 320 px
 * square), round its spot (as DenRoom draws it): the figure above, up to two lines of name (6.5rem wide)
 * below. Two parts are clear when no box of one comes within MARGIN of a box of the other.
 */
const FIG_HALF = 0.085;
const FIG_TOP = 0.145;
const FIG_BOTTOM = 0.02;
const NAME_HALF = 0.17;
const NAME_BOTTOM = 0.125;
const MARGIN = 0.02;
/** Two names keep further apart (about 13 px), and a name over a name counts most when a room is full. */
const NAME_MARGIN = 0.04;
const NAME_WEIGHT = 10;
type Box = readonly [left: number, right: number, top: number, bottom: number];
const boxes = (s: Spot): Box[] => [
  [s.x - FIG_HALF, s.x + FIG_HALF, s.y - FIG_TOP, s.y + FIG_BOTTOM],
  [s.x - NAME_HALF, s.x + NAME_HALF, s.y + FIG_BOTTOM, s.y + NAME_BOTTOM],
];
const overlap = (a: Box, b: Box, m: number): number =>
  Math.max(0, Math.min(a[1], b[1]) + m - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) + m - Math.max(a[2], b[2]));
/** How much two parts' figures and names would cover each other (0: clear); a name over a name weighs most. */
export const crowding = (a: Spot, b: Spot): number => {
  const [fa, na] = boxes(a);
  const [fb, nb] = boxes(b);
  return NAME_WEIGHT * overlap(na, nb, NAME_MARGIN) + overlap(fa, fb, MARGIN) + overlap(fa, nb, MARGIN) + overlap(na, fb, MARGIN);
};
/** Two names never touch: the first thing a full room keeps. */
export const namesClear = (a: Spot, b: Spot): boolean => overlap(boxes(a)[1], boxes(b)[1], NAME_MARGIN) === 0;
/** No figure or name of one comes near a figure or name of the other. */
export const clearOf = (a: Spot, b: Spot): boolean => crowding(a, b) === 0;

/** Where an arriving part tries, in order: the edge of the light, then a ring further out, then nearer. */
const ARRIVE_RINGS = [ARRIVE_RADIUS, 0.42, 0.24];
/** An arriving part stands this far in, so its figure and its name are whole inside the room. */
const ARRIVE_IN = { left: 0.18, right: 0.82, top: 0.16, bottom: 0.86 };

/**
 * Every part's spot: its own place when the person put it somewhere; otherwise round the edge of the
 * light, spread evenly from the top, each nudged round until it is clear of everyone (`clearOf`); when
 * the edge of the light is full, a ring further out, then one nearer. A room too full for any clear spot
 * gets the one that crowds the others least. No auto-layout of placed parts, ever.
 */
export function placeParts(parts: ReadonlyArray<{ id: string; mapX: number | null; mapY: number | null }>): Map<string, Spot> {
  const out = new Map<string, Spot>();
  const taken: Spot[] = [];
  for (const p of parts) {
    if (p.mapX !== null && p.mapY !== null) {
      const s = { x: clamp(p.mapX), y: clamp(p.mapY) };
      out.set(p.id, s);
      taken.push(s);
    }
  }
  const free = parts.filter((p) => !out.has(p.id));
  const step = (2 * Math.PI) / Math.max(free.length, 6);
  free.forEach((p, i) => {
    let found: Spot | null = null;
    let least: { s: Spot; n: number } | null = null;
    for (const r of ARRIVE_RINGS) {
      for (let k = 0; k < 24 && !found; k++) {
        const a = -Math.PI / 2 + i * step + (k * Math.PI) / 12;
        const s = {
          x: Math.min(ARRIVE_IN.right, Math.max(ARRIVE_IN.left, LIGHT.x + r * Math.cos(a))),
          y: Math.min(ARRIVE_IN.bottom, Math.max(ARRIVE_IN.top, LIGHT.y + r * Math.sin(a))),
        };
        const n = taken.reduce((sum, t) => sum + crowding(t, s), 0);
        if (n === 0) found = s;
        else if (!least || n < least.n) least = { s, n };
      }
      if (found) break;
    }
    const s = found ?? least!.s;
    out.set(p.id, s);
    taken.push(s);
  });
  return out;
}

// ---- Light on a figure: how recently the person spent time with it. Never a score, ring or number. ----

export interface FigureLight {
  /** The warm pool under the figure, 0 (none: the dusk) to 1. */
  glow: number;
  /** The figure's own opacity: resting parts sit a little dimmer, the dusk dimmer still. */
  opacity: number;
}

export function figureLight(recency: DenRecency, resting: boolean): FigureLight {
  const base = recency === 'near' ? { glow: 0.55, opacity: 1 } : recency === 'a_while' ? { glow: 0.25, opacity: 0.85 } : { glow: 0, opacity: 0.62 };
  return resting ? { glow: base.glow * 0.6, opacity: Math.round(base.opacity * 0.8 * 100) / 100 } : base;
}

// ---- Keyboard: focus a figure, Enter or Space picks it up, arrows move it, Enter or Space puts it down ----

export const KEY_STEP = 0.04;
export interface Held { id: string; from: Spot; at: Spot }
export type KeyResult =
  | { kind: 'none' }
  | { kind: 'pick'; held: Held }
  | { kind: 'move'; held: Held }
  /** Put down where it moved to: save. */
  | { kind: 'drop'; id: string; at: Spot }
  /** Put down where it was picked up: the same as a tap (choose it for a thread). */
  | { kind: 'tap'; id: string }
  /** Escape: back where it was, nothing saved. */
  | { kind: 'cancel'; id: string; at: Spot };

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function denKey(key: string, id: string, spot: Spot, held: Held | null): KeyResult {
  const mine = held && held.id === id ? held : null;
  if (key === 'Enter' || key === ' ') {
    if (!mine) return { kind: 'pick', held: { id, from: spot, at: spot } };
    return mine.at.x === mine.from.x && mine.at.y === mine.from.y ? { kind: 'tap', id } : { kind: 'drop', id, at: mine.at };
  }
  if (key === 'Escape') return mine ? { kind: 'cancel', id, at: mine.from } : { kind: 'none' };
  const d = ARROWS[key];
  if (d && mine) {
    const at = { x: clamp(round(mine.at.x + d[0] * KEY_STEP)), y: clamp(round(mine.at.y + d[1] * KEY_STEP)) };
    return { kind: 'move', held: { ...mine, at } };
  }
  return { kind: 'none' };
}
const round = (v: number) => Math.round(v * 1000) / 1000;

// ---- Taps: one figure, then another, opens the thread sheet ----

export interface Selection { first: string | null; pair: [string, string] | null }
export const NO_SELECTION: Selection = { first: null, pair: null };

export function tapFigure(sel: Selection, id: string): Selection {
  if (sel.pair) return { first: id, pair: null };
  if (!sel.first) return { first: id, pair: null };
  if (sel.first === id) return NO_SELECTION;
  return { first: null, pair: [sel.first, id] };
}

/** "This one stands in front of that one", once the person says which: `aId` stands in front. */
export function coversForRequest(frontId: string, pair: readonly [string, string]): LinkPartsRequest {
  const behind = pair[0] === frontId ? pair[1] : pair[0];
  return { kind: 'covers_for', aId: frontId, bId: behind };
}

/** "These two pull against each other": Two pulls (lane 3's tool page) with both parts. */
export function twoPullsLink(pair: readonly [string, string]): { pathname: string; search: string } {
  return { pathname: '/tool/two-pulls', search: `?a=${encodeURIComponent(pair[0])}&b=${encodeURIComponent(pair[1])}` };
}

// ---- Names ----

export const denName = (p: Pick<DenPart, 'name'>, copy: Pick<DenCopy, 'den_unnamed'>): string => p.name ?? copy.den_unnamed;

// ---- Then and now ----

/** `YYYY-MM` in the person's own time zone. */
export function localMonth(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The months there is a past layout for, newest first: each month's latest snapshot, never this month's
 * (that one is how it looks now), at most `max`.
 */
export function pastMonths(snapshots: readonly DenSnapshotRef[], now: Date, max = 6): Array<{ id: string; month: string }> {
  const thisMonth = localMonth(now.toISOString());
  const seen = new Set<string>();
  const out: Array<{ id: string; month: string }> = [];
  for (const s of [...snapshots].sort((a, b) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0))) {
    const m = localMonth(s.takenAt);
    if (!m || m === thisMonth || seen.has(m)) continue;
    seen.add(m);
    out.push({ id: s.id, month: m });
    if (out.length >= max) break;
  }
  return out;
}

/** "How it looked in {month}". */
export const thenLabel = (copy: Pick<DenCopy, 'den_then'>, monthWords: string): string => copy.den_then.replace('{month}', monthWords);
