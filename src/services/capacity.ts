/** Capacity band content (getCapacityContent), cached per page load. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { CapacityContent } from '../data/capacityTypes';

const getCapacityContentFn = httpsCallable<void, CapacityContent>(functions, 'getCapacityContent', { timeout: 20_000 });

let cached: Promise<CapacityContent> | null = null;

export function getCapacityContent(): Promise<CapacityContent> {
  if (!cached) {
    cached = getCapacityContentFn().then((r) => r.data).catch((e) => {
      cached = null; // a failed load can be retried
      throw e;
    });
  }
  return cached;
}
