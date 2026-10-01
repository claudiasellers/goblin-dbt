/** Body map content (getBodyMapContent): pad words plus the body-mirror maps for the check-in's words. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { BodyMapContent, BodySuggestion, BodySuggestMark } from '../data/bodyMapTypes';

const getBodyMapContentFn = httpsCallable<{ emotionIds?: string[] }, BodyMapContent>(
  functions, 'getBodyMapContent', { timeout: 20_000 });

// Cached per page load and per word list (a failed load can be retried).
const cache = new Map<string, Promise<BodyMapContent>>();

/** `emotionIds`: the check-in's grid word ids, in check-in order (maps come back in that order). */
export function getBodyMapContent(emotionIds: string[] = []): Promise<BodyMapContent> {
  const key = emotionIds.join('|');
  let p = cache.get(key);
  if (!p) {
    p = getBodyMapContentFn({ emotionIds }).then((r) => r.data).catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, p);
  }
  return p;
}

const suggestFn = httpsCallable<{ marks: BodySuggestMark[] }, { suggestions: BodySuggestion[] }>(
  functions, 'suggestEmotionsFromBody', { timeout: 20_000 });

/** Body-first entry: the body-mirror maps the marked places look like (strongest first, at most 3). */
export async function suggestEmotionsFromBody(marks: BodySuggestMark[]): Promise<BodySuggestion[]> {
  if (marks.length === 0) return [];
  const r = await suggestFn({ marks });
  return r.data.suggestions;
}
