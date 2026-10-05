/**
 * Body map content: pad words plus the body-mirror maps for the check-in's words, and the body-first
 * suggestions. Read from the file the app ships (src/data/content/body-map.json, generated from the
 * graph by scripts/content-snapshot/build.mjs) instead of the getBodyMapContent /
 * suggestEmotionsFromBody Cloud Functions, so the body step never waits on one. The file holds every
 * live map; picking and ordering them for the words, and the suggestion scoring, are the same logic
 * the functions ran (scoring is the functions' own scoreBodyMaps).
 */
import type { BodyMapContent, BodyMirrorMap, BodySuggestion, BodySuggestMark } from '../data/bodyMapTypes';
import { scoreBodyMaps } from '../../functions/src/bodyMap/suggest';

interface ShippedMap extends Omit<BodyMirrorMap, 'emotionIds'> { wordIds: string[] }
interface ShippedBodyMap extends Omit<BodyMapContent, 'maps'> { maps: ShippedMap[] }

// Fetched the first time it is needed and kept for the page's life; a failed fetch can be retried.
let file: Promise<ShippedBodyMap> | null = null;
function bodyMapFile(): Promise<ShippedBodyMap> {
  return (file ??= import('../data/content/body-map.json')
    .then((m) => m.default.content as ShippedBodyMap)
    .catch((e) => { file = null; throw e; }));
}

/** `emotionIds`: the check-in's grid word ids, in check-in order (maps come back in that order). */
export async function getBodyMapContent(emotionIds: string[] = []): Promise<BodyMapContent> {
  const { maps: all, ...rest } = await bodyMapFile();
  const ids = [...new Set(emotionIds)];
  const first = (wordIds: string[]) => Math.min(...wordIds.map((w) => ids.indexOf(w)).filter((i) => i >= 0));
  const maps = all
    .filter((m) => m.places.length > 0 && m.wordIds.some((w) => ids.includes(w)))
    .map((m) => ({ map: { id: m.id, label: m.label, emotionIds: ids.filter((w) => m.wordIds.includes(w)), places: m.places }, order: first(m.wordIds) }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.map);
  return { ...rest, maps };
}

/** Body-first entry: the body-mirror maps the marked places look like (strongest first, at most 3). */
export async function suggestEmotionsFromBody(marks: BodySuggestMark[]): Promise<BodySuggestion[]> {
  if (marks.length === 0) return [];
  const { maps } = await bodyMapFile();
  return scoreBodyMaps(marks, maps);
}
