/**
 * Body-first suggestions (docs/design/body-map.md, step 2): which body-mirror maps the marked places
 * look like. Pure, no imports beyond types, so tests can load it directly.
 */
import type { BodySuggestion, BodySuggestMark } from './types';

export interface ScorablePlace { region: string; sensationId: string; label: string; weight: number }
export interface ScorableMap { id: string; label: string; wordIds: string[]; places: ScorablePlace[] }

/** How much a mark counts against one place: same place and word > same word elsewhere > same place only. */
export const MATCH = { exact: 1, wordElsewhere: 0.4, placeOnly: 0.25 } as const;

export const MAX_SUGGESTIONS = 3;

/**
 * Each mark counts once per map, against that map's best-matching place (times the place's weight).
 * Maps with no match are dropped; the rest come back strongest first, at most MAX_SUGGESTIONS, each
 * with the places that matched (for "often felt as …").
 */
export function scoreBodyMaps(marks: BodySuggestMark[], maps: ScorableMap[]): BodySuggestion[] {
  const out: BodySuggestion[] = [];
  for (const m of maps) {
    let score = 0;
    const because: Array<{ region: string; label: string }> = [];
    for (const mark of marks) {
      let best = 0;
      let hit: ScorablePlace | null = null;
      for (const p of m.places) {
        const samePlace = p.region === mark.region;
        const sameWord = mark.sensationIds.includes(p.sensationId);
        const f = samePlace && sameWord ? MATCH.exact : sameWord ? MATCH.wordElsewhere : samePlace ? MATCH.placeOnly : 0;
        if (f * p.weight > best) { best = f * p.weight; hit = p; }
      }
      if (hit) {
        score += best;
        if (!because.some((b) => b.region === hit!.region && b.label === hit!.label)) because.push({ region: hit.region, label: hit.label });
      }
    }
    if (score > 0) out.push({ mapId: m.id, label: m.label, wordIds: m.wordIds, score: Math.round(score * 1000) / 1000, because });
  }
  return out.sort((a, b) => b.score - a.score || a.mapId.localeCompare(b.mapId)).slice(0, MAX_SUGGESTIONS);
}
