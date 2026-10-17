/**
 * Wise mind content: the questions, what each mind says, the practices, the answers and the copy.
 * Read from the file the app ships (src/data/content/wise-mind.json, generated from the graph by
 * scripts/content-snapshot/build.mjs) instead of the getWiseMindContent Cloud Function.
 */
import type { WiseMindContent } from '../data/wiseMindTypes';

let cached: Promise<WiseMindContent> | null = null;

/** Fetched as its own chunk the first time it is needed, kept for the page's life; a failed fetch can be retried. */
export function getWiseMindContent(): Promise<WiseMindContent> {
  if (!cached) {
    cached = import('../data/content/wise-mind.json').then((m) => m.default.content as unknown as WiseMindContent).catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}
