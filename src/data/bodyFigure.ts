/**
 * The body figure: presentation only (docs/design/body-map.md). The place ids are the shared
 * vocabulary with the graph (`BodyMapContent.regions`, scripts/body-map/content.py REGIONS);
 * tests/body-map-figure.test.mjs keeps the two identical. What a place *feels like* (pad words,
 * typical maps) is graph content and never lives here.
 *
 * Geometry is in the figure's viewBox (-10 -6 220 432), drawn facing you: the person's left is on
 * the figure's right.
 */

export const REGION_IDS = [
  'head', 'face', 'jaw', 'throat', 'neck', 'shoulders', 'chest', 'upper_back',
  'stomach', 'lower_back', 'arms', 'hands', 'legs', 'feet', 'body',
] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Side = 'both' | 'left' | 'right';

export const FIGURE_VIEWBOX = '-10 -6 220 432';

/** A tappable shape on the figure. */
export type HitShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number }
  | { kind: 'path'; d: string };

export interface RegionDef {
  id: RegionId;
  /** "My ___ feel(s)…" */
  label: string;
  /** Plural places read "feel", singular "feels". */
  plural: boolean;
  /** Shoulders, arms, hands, legs, feet: Both / Left / Right is offered. */
  paired: boolean;
  /** Tap targets on the front view; empty = offered under "More places" instead. */
  hits: HitShape[];
  /** Where a mark glows: one centre, or [person's left, person's right] for paired places. */
  glow: { cx: number; cy: number; rx: number; ry: number }[];
}

const pairHits = (l: HitShape, r: HitShape) => [r, l]; // figure's left side is the person's right

export const REGIONS: Record<RegionId, RegionDef> = {
  head: { id: 'head', label: 'Head', plural: false, paired: false,
    hits: [{ kind: 'ellipse', cx: 100, cy: 30, rx: 27, ry: 17 }], glow: [{ cx: 100, cy: 28, rx: 24, ry: 16 }] },
  face: { id: 'face', label: 'Face', plural: false, paired: false,
    hits: [{ kind: 'ellipse', cx: 100, cy: 56, rx: 22, ry: 13 }], glow: [{ cx: 100, cy: 52, rx: 20, ry: 14 }] },
  jaw: { id: 'jaw', label: 'Jaw', plural: false, paired: false, hits: [], glow: [{ cx: 100, cy: 66, rx: 16, ry: 7 }] },
  throat: { id: 'throat', label: 'Throat', plural: false, paired: false,
    hits: [{ kind: 'rect', x: 86, y: 70, w: 28, h: 20, r: 8 }], glow: [{ cx: 100, cy: 80, rx: 12, ry: 10 }] },
  neck: { id: 'neck', label: 'Neck', plural: false, paired: false, hits: [], glow: [{ cx: 100, cy: 80, rx: 14, ry: 10 }] },
  shoulders: { id: 'shoulders', label: 'Shoulders', plural: true, paired: true,
    hits: pairHits({ kind: 'ellipse', cx: 64, cy: 97, rx: 18, ry: 13 }, { kind: 'ellipse', cx: 136, cy: 97, rx: 18, ry: 13 }),
    glow: [{ cx: 136, cy: 98, rx: 20, ry: 14 }, { cx: 64, cy: 98, rx: 20, ry: 14 }] },
  chest: { id: 'chest', label: 'Chest', plural: false, paired: false,
    hits: [{ kind: 'rect', x: 66, y: 110, w: 68, h: 52, r: 12 }], glow: [{ cx: 100, cy: 130, rx: 40, ry: 28 }] },
  upper_back: { id: 'upper_back', label: 'Upper back', plural: false, paired: false, hits: [], glow: [{ cx: 100, cy: 118, rx: 48, ry: 30 }] },
  stomach: { id: 'stomach', label: 'Stomach', plural: false, paired: false,
    hits: [{ kind: 'rect', x: 64, y: 164, w: 72, h: 86, r: 14 }], glow: [{ cx: 100, cy: 198, rx: 32, ry: 24 }] },
  lower_back: { id: 'lower_back', label: 'Lower back', plural: false, paired: false, hits: [], glow: [{ cx: 100, cy: 228, rx: 40, ry: 20 }] },
  arms: { id: 'arms', label: 'Arms', plural: true, paired: true,
    hits: pairHits({ kind: 'path', d: 'M40 110 L66 112 L50 236 L22 232 Z' }, { kind: 'path', d: 'M160 110 L134 112 L150 236 L178 232 Z' }),
    glow: [{ cx: 155, cy: 168, rx: 13, ry: 44 }, { cx: 45, cy: 168, rx: 13, ry: 44 }] },
  hands: { id: 'hands', label: 'Hands', plural: true, paired: true,
    hits: pairHits({ kind: 'ellipse', cx: 34, cy: 248, rx: 17, ry: 17 }, { kind: 'ellipse', cx: 166, cy: 248, rx: 17, ry: 17 }),
    glow: [{ cx: 166, cy: 246, rx: 14, ry: 14 }, { cx: 34, cy: 246, rx: 14, ry: 14 }] },
  legs: { id: 'legs', label: 'Legs', plural: true, paired: true,
    hits: pairHits({ kind: 'path', d: 'M64 254 L99 254 L96 384 L62 384 Z' }, { kind: 'path', d: 'M101 254 L136 254 L138 384 L104 384 Z' }),
    glow: [{ cx: 120, cy: 318, rx: 16, ry: 56 }, { cx: 80, cy: 318, rx: 16, ry: 56 }] },
  feet: { id: 'feet', label: 'Feet', plural: true, paired: true,
    hits: pairHits({ kind: 'ellipse', cx: 80, cy: 402, rx: 18, ry: 16 }, { kind: 'ellipse', cx: 121, cy: 402, rx: 18, ry: 16 }),
    glow: [{ cx: 121, cy: 402, rx: 15, ry: 12 }, { cx: 80, cy: 402, rx: 15, ry: 12 }] },
  body: { id: 'body', label: 'Whole body', plural: false, paired: false, hits: [], glow: [{ cx: 100, cy: 210, rx: 70, ry: 200 }] },
};

/** Places with no tap target on the front view, offered as chips. */
export const MORE_PLACES: RegionId[] = REGION_IDS.filter((id) => REGIONS[id].hits.length === 0);

export function isRegionId(v: unknown): v is RegionId {
  return typeof v === 'string' && (REGION_IDS as readonly string[]).includes(v);
}

/** Display name for any stored region (new ids; anything else is shown as stored). */
const ONE_SIDE: Partial<Record<RegionId, string>> = {
  shoulders: 'shoulder', arms: 'arm', hands: 'hand', legs: 'leg', feet: 'foot',
};

export function regionLabel(region: string, side?: Side | null): string {
  if (!isRegionId(region)) return region;
  const def = REGIONS[region];
  const one = ONE_SIDE[region];
  if (one && side === 'left') return `Left ${one}`;
  if (one && side === 'right') return `Right ${one}`;
  return def.label;
}

/** The glow ellipses for a mark (both sides, or one). */
export function glowFor(region: RegionId, side: Side = 'both') {
  const g = REGIONS[region].glow;
  if (g.length === 2 && side === 'left') return [g[0]];
  if (g.length === 2 && side === 'right') return [g[1]];
  return g;
}

/**
 * Which place is under a point on the figure (viewBox units), for the drag. Where two tap targets
 * overlap, the smaller, more specific place wins (a hand over the end of an arm, a face under the
 * head). Off every target, the nearest one within `SNAP` units is taken, so the seams between
 * targets and the silhouette's edges still land somewhere; further out is nothing.
 */
const HIT_PRIORITY: RegionId[] = ['hands', 'feet', 'face', 'throat', 'shoulders', 'head', 'chest', 'stomach', 'arms', 'legs'];
export const SNAP = 14;

function polygon(d: string): [number, number][] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}

function segDist(px: number, py: number, [ax, ay]: [number, number], [bx, by]: [number, number]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance from a point to a shape's edge; 0 inside. */
export function distanceToShape(s: HitShape, x: number, y: number): number {
  if (s.kind === 'ellipse') {
    const k = Math.hypot((x - s.cx) / s.rx, (y - s.cy) / s.ry);
    return k <= 1 ? 0 : (k - 1) * Math.min(s.rx, s.ry);
  }
  if (s.kind === 'rect') {
    const dx = Math.max(s.x - x, 0, x - (s.x + s.w));
    const dy = Math.max(s.y - y, 0, y - (s.y + s.h));
    return Math.hypot(dx, dy);
  }
  const pts = polygon(s.d);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  if (inside) return 0;
  return Math.min(...pts.map((p, i) => segDist(x, y, p, pts[(i + 1) % pts.length])));
}

export function regionAt(x: number, y: number): RegionId | null {
  let best: RegionId | null = null;
  let bestD = SNAP;
  for (const id of HIT_PRIORITY) {
    const d = Math.min(...REGIONS[id].hits.map((s) => distanceToShape(s, x, y)));
    if (d === 0) return id;
    if (d < bestD) { best = id; bestD = d; }
  }
  return best;
}

/** The figure itself: silhouette shapes (also used as the clip path for the glow). */
export const SILHOUETTE = {
  head: { cx: 100, cy: 44, rx: 26, ry: 30 },
  neck: { x: 89, y: 66, w: 22, h: 24, r: 9 },
  torso: 'M70 86 Q100 78 130 86 Q151 90 152 108 L145 200 Q141 232 139 254 L61 254 Q59 232 55 200 L48 108 Q49 90 70 86 Z',
  limbs: [
    'M44 102 L65 106 L47 238 L25 234 Z', 'M156 102 L135 106 L153 238 L175 234 Z',
    'M66 250 L98 250 L95 404 L63 404 Z', 'M102 250 L134 250 L137 404 L105 404 Z',
  ],
  joints: [
    { cx: 34, cy: 246, r: 12 }, { cx: 166, cy: 246, r: 12 },
    { cx: 80, cy: 402, r: 16 }, { cx: 121, cy: 402, r: 16 },
  ],
} as const;
