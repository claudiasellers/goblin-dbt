/**
 * Everything Two pulls shows, from the parts copy the app ships (signed-off rows only). Null when any of
 * it isn't ready, so neither ToolPage nor the page ever shows half a flow.
 */
import type { PartsContent } from '../data/partsContentTypes';
import { twoPullsReady } from '../lib/twoPullsSave';
import { getPartsContent } from './partsContent';

export async function loadTwoPullsContent(): Promise<PartsContent | null> {
  const parts = await getPartsContent();
  return twoPullsReady(parts) ? parts : null;
}
