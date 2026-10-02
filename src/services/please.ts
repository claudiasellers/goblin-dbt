/** PLEASE ("Running low") flow content (getPleaseContent), cached per page load. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { PleaseContent } from '../data/pleaseTypes';

const getPleaseContentFn = httpsCallable<void, PleaseContent>(functions, 'getPleaseContent', { timeout: 20_000 });

let cached: Promise<PleaseContent> | null = null;

export function getPleaseContent(): Promise<PleaseContent> {
  if (!cached) {
    cached = getPleaseContentFn().then((r) => r.data).catch((e) => {
      cached = null; // a failed load can be retried
      throw e;
    });
  }
  return cached;
}
