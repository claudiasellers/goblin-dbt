/**
 * The body mirror (docs/design/body-map.md, steps 4 and 5; canvas rows Y and Z). Pure.
 *
 * "Not sure? See where *anxious* often shows up" draws the typical places for the check-in's words
 * as a ghost layer: hatched, dashed, never yours until tapped. The maps come from the graph
 * (`FELT_AS` through `BodyMap`, in `src/data/content/body-map.json`); this file only picks what to
 * draw and how to name it.
 *
 * - One tab per map, at most three, in check-in order (the first word picked leads). Words of one
 *   family share a map (*anxious* and *overwhelmed* are both fear and worry).
 * - A Together tab stripes the places two maps share.
 * - Tabs are hint views only. A mark never belongs to a tab or a feeling, and never takes a tab's
 *   colour: its colour still comes from its words.
 */
import type { BodyMirrorMap, PadZone } from '../data/bodyMapTypes';
import { isRegionId, type RegionId, type Side } from '../data/bodyFigure';

export const MAX_TABS = 3;
/** Typical places drawn per map: the strongest few, one per place. */
export const MAX_GHOSTS = 5;

/** One typical place on the figure: the map's strongest sensation there. */
export interface Ghost {
  region: RegionId;
  sensationId: string;
  label: string;
  weight: number;
}

/** A map as the mirror shows it. */
export interface MirrorTab {
  map: BodyMirrorMap;
  /** The square quarter of the map's first sent word: the tab's colour. */
  zone: PadZone;
  /** The check-in's words this map answers, lower case, in check-in order. */
  words: string[];
  ghosts: Ghost[];
}

/** A place two or more tabs share (the Together tab). */
export interface SharedPlace {
  region: RegionId;
  zones: PadZone[];
}

const QUADRANT_ZONE: Record<string, PadZone> = {
  'high-unpleasant': 'hu',
  'low-unpleasant': 'lu',
  'high-pleasant': 'hp',
  'low-pleasant': 'lp',
};

export function zoneOfQuadrant(quadrant: string | undefined): PadZone | null {
  return (quadrant && QUADRANT_ZONE[quadrant]) || null;
}

/** The strongest place per region (the map's places come strongest first), at most `max`. */
export function ghostsFor(map: BodyMirrorMap, max = MAX_GHOSTS): Ghost[] {
  const seen = new Set<string>();
  const out: Ghost[] = [];
  for (const p of map.places) {
    if (!isRegionId(p.region) || seen.has(p.region)) continue;
    seen.add(p.region);
    out.push({ region: p.region, sensationId: p.sensationId, label: p.label, weight: p.weight });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The tabs for the check-in's maps (already in check-in order). `lookup(id)` gives a word's name and
 * quadrant; a map whose first word has no known quadrant falls back to its other words, then to `hu`.
 */
export function mirrorTabs(
  maps: BodyMirrorMap[],
  lookup: (id: string) => { name: string; quadrant: string } | undefined,
): MirrorTab[] {
  return maps
    .map((map) => {
      const known = map.emotionIds.map(lookup).filter((e): e is { name: string; quadrant: string } => Boolean(e));
      const zone = known.map((e) => zoneOfQuadrant(e.quadrant)).find((z): z is PadZone => Boolean(z)) ?? 'hu';
      const words = known.length ? known.map((e) => e.name.toLowerCase()) : map.emotionIds.map((id) => id.replace(/_/g, ' '));
      return { map, zone, words, ghosts: ghostsFor(map) };
    })
    .filter((t) => t.ghosts.length > 0)
    .slice(0, MAX_TABS);
}

/** Places that two or more tabs draw, each with the zones of the tabs that share it (in tab order). */
export function sharedPlaces(tabs: MirrorTab[]): SharedPlace[] {
  const by = new Map<RegionId, PadZone[]>();
  for (const t of tabs) {
    for (const g of t.ghosts) by.set(g.region, [...(by.get(g.region) ?? []), t.zone]);
  }
  return [...by.entries()].filter(([, z]) => z.length > 1).map(([region, zones]) => ({ region, zones }));
}

/** What a tapped ghost fills in: its word picked, both sides, and the strength from the map's weight
 *  when the strength bar is on (null when it's hidden, as for any place). */
export function prefillFrom(ghost: Ghost, barOn: boolean): { side: Side; strength: number | null; sensationIds: string[] } {
  return {
    side: 'both',
    strength: barOn ? Math.round(Math.max(0, Math.min(1, ghost.weight)) * 100) / 100 : null,
    sensationIds: [ghost.sensationId],
  };
}

/** "anxious", "anxious and excited", "anxious, excited and tired". */
export function listWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** The words the mirror's entry names: the check-in's words with a map (however the maps group
 *  them), one or two of them; more is "your feelings" (null). */
export function entryWords(tabs: MirrorTab[]): string[] | null {
  const words = [...new Set(tabs.flatMap((t) => t.words))].filter(Boolean);
  return words.length === 0 || words.length > 2 ? null : words;
}
