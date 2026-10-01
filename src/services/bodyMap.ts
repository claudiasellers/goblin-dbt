/** Body map content (getBodyMapContent): pad words plus the body-mirror maps for the check-in's words. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { BodyMapContent } from '../data/bodyMapTypes';

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
