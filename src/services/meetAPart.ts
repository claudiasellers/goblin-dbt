/**
 * Everything Meet a part shows, from the files the app ships: the parts copy (signed-off rows only) and
 * Shape it's words a round (Find the feeling's signed-off copy). Null when any of it isn't ready, so
 * neither ToolPage nor the page ever shows half a flow.
 */
import type { PartsContent } from '../data/partsContentTypes';
import { meetReady, type ShapeRoundLabels } from '../lib/meetAPartSave';
import { getPartsContent } from './partsContent';
import { getFindTheFeelingContent } from './neo4j';

export interface MeetAPartContent { parts: PartsContent; rounds: ShapeRoundLabels }

export async function loadMeetAPartContent(): Promise<MeetAPartContent | null> {
  const [parts, ftf] = await Promise.all([getPartsContent(), getFindTheFeelingContent()]);
  const rounds = ftf.flow.copy.shape.rounds;
  return meetReady(parts, rounds) ? { parts, rounds } : null;
}
