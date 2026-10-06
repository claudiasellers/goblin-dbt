/**
 * Do the Opposite's picker content: read from the file the app ships
 * (src/data/content/opposite-action-picker.json, generated from the graph by
 * scripts/content-snapshot/build.mjs), so the doors draw without waiting on a Cloud Function.
 */
import type { OppositeActionPickerContent } from '../data/oppositeActionPickerTypes';

let cached: Promise<OppositeActionPickerContent> | null = null;

/** Fetched as its own chunk the first time it is needed, kept for the page's life; a failed fetch can be retried. */
export function getOppositeActionPickerContent(): Promise<OppositeActionPickerContent> {
  if (!cached) {
    cached = import('../data/content/opposite-action-picker.json')
      .then((m) => m.default.content as unknown as OppositeActionPickerContent)
      .catch((e) => {
        cached = null;
        throw e;
      });
  }
  return cached;
}
