/**
 * Problem Solve's "the part that doesn't want change" (docs/design/parts.md, "Meet a part → Entries"):
 * after the `cant-ambivalent` barrier ("Part of me doesn't actually want this to change.") and its
 * ambivalence answer, parts on, one quiet line offers to come back to that part another time. Tapping it
 * is the yes: a PartCandidate for put_it_off is queued (the candidate list in Me), and the line becomes
 * "It's in Me when you want it." It never opens a parts flow mid-tool or blocks the tool's next step.
 * Pure: the gate, the copy and the request.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { QueuePartCandidateRequest } from '../data/partsTypes';
import { surfaceReady, type SurfaceIds } from './partsContent';

/** The one barrier sub-response this line follows. */
export const PS_AMBIVALENCE_BARRIER = 'cant-ambivalent';
/** The move content.py maps cant-ambivalent to (EXPRESSES): explicit, since the visit isn't closed yet. */
export const PS_AMBIVALENCE_MOVE = 'put_it_off';
export const PS_LATER = 'ps_later';
export const PS_LATER_DONE = 'ps_later_done';

/** What the line's gate requires (scripts/parts/review.mjs reads it). */
export const PS_LATER_REQUIRED: SurfaceIds = { prompts: [PS_LATER_DONE], options: [PS_LATER] };

export interface PsLaterCopy { ask: string; done: string }

/** The line, or null: parts on, the cant-ambivalent barrier, and both lines shipped. */
export function psLaterCopy(content: PartsContent | null, partsOn: boolean, barrierSubId: string | null | undefined): PsLaterCopy | null {
  if (!partsOn || barrierSubId !== PS_AMBIVALENCE_BARRIER || !content) return null;
  if (!surfaceReady(content, PS_LATER_REQUIRED)) return null;
  const ask = Object.values(content.options.ps ?? {}).flat().find((o) => o.id === PS_LATER)?.label?.trim();
  const done = content.prompts[PS_LATER_DONE]?.copy?.trim();
  return ask && done ? { ask, done } : null;
}

/**
 * The yes. No `toolSessionId`: the visit's ToolSession is still open mid-tool (the server refuses an open
 * one), so the move is given explicitly instead of derived from the session.
 */
export const psLaterCandidate = (id: string): QueuePartCandidateRequest =>
  ({ id, origin: 'ps_ambivalence', moveIds: [PS_AMBIVALENCE_MOVE] });
