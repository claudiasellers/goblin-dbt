/**
 * A body map's places, computed from FELT_AS (docs/design/body-map.md): the map stores none of its
 * own. Every live FELT_AS row of the emotions the map groups counts; per (place, sensation) the
 * highest weight, plus SHARED_BONUS for each further emotion that shares it (capped at 1), strongest
 * first. Pure; scripts/body-map/places.py does the same for the fixture (tests check they agree).
 */
import type { BodyEnergy, BodyMapPlace } from './types';

export const SHARED_BONUS = 0.1;

/** One FELT_AS row as the query returns it (an OPTIONAL MATCH gives all-null rows for a map with none). */
export interface FeltRow {
  emotionId: string | null;
  region: string | null;
  sensationId: string | null;
  label: string | null;
  energy: BodyEnergy | null;
  weight: number | null;
}

export function placesFromFelt(rows: FeltRow[]): BodyMapPlace[] {
  const agg = new Map<string, { place: BodyMapPlace; emotions: Set<string> }>();
  for (const r of rows) {
    if (!r.region || !r.sensationId || !r.label || !r.energy || typeof r.weight !== 'number') continue;
    const key = `${r.region}:${r.sensationId}`;
    const cur = agg.get(key);
    if (cur) {
      cur.place.weight = Math.max(cur.place.weight, r.weight);
      if (r.emotionId) cur.emotions.add(r.emotionId);
    } else {
      agg.set(key, {
        place: { region: r.region, sensationId: r.sensationId, label: r.label, energy: r.energy, weight: r.weight },
        emotions: new Set(r.emotionId ? [r.emotionId] : []),
      });
    }
  }
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...agg.values()]
    .map(({ place, emotions }) => ({
      ...place,
      weight: Math.round(Math.min(1, place.weight + SHARED_BONUS * Math.max(0, emotions.size - 1)) * 1000) / 1000,
    }))
    .sort((a, b) => b.weight - a.weight || cmp(a.region, b.region) || cmp(a.sensationId, b.sensationId));
}
