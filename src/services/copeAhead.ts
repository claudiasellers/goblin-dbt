/**
 * Cope Ahead content: the situations, the hardest moments, the moves, the rehearsal and the copy.
 * Read from the file the app ships (src/data/content/cope-ahead.json, generated from the graph by
 * scripts/content-snapshot/build.mjs) instead of the getCopeAheadContent Cloud Function.
 */
import type { CopeAheadContent } from '../data/copeAheadTypes';

let cached: Promise<CopeAheadContent> | null = null;

/** Fetched as its own chunk the first time it is needed, kept for the page's life; a failed fetch can be retried. */
export function getCopeAheadContent(): Promise<CopeAheadContent> {
  if (!cached) {
    cached = import('../data/content/cope-ahead.json').then((m) => m.default.content as unknown as CopeAheadContent).catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}
