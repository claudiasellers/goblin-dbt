/**
 * DEAR MAN's P2 resume draft (A4-4, E3 §A4.2.6). Pure. The draft is the plan so far; it may hold
 * the user's own words, so it lives only in this device's localStorage (resumeToken.ts) and is
 * never sent to the server.
 */

/** The plan steps "This is too much right now" is offered on (and that a draft can resume to). */
export const TOO_MUCH_PHASES = ['scene', 'describe', 'express', 'assert', 'reinforce', 'mindful', 'confident', 'negotiate', 'summary'] as const;
export type DearManPlanPhase = (typeof TOO_MUCH_PHASES)[number];

export interface DearManStep { phase: DearManPlanPhase; sceneStep: number }

export interface DearManDraft {
  v: 1;
  relationshipType: string | null;
  situationType: string | null;
  priorities: string[];
  barriers: string[];
  barriersCustom: string;
  describeId: string | null;
  describeCustom: string;
  feelings: string[];
  feelingCustom: string;
  assertIds: string[];
  assertDetails: Record<string, string>;
  assertCustom: string;
  reinforceIds: string[];
  reinforceCustom: string;
  anchorPhrase: string;
  middleGroundId: string | null;
  middleGroundCustom: string;
  walkAwayId: string | null;
  walkAwayCustom: string;
}

export function dearManStepId(s: DearManStep): string {
  return s.phase === 'scene' ? `scene:${s.sceneStep}` : s.phase;
}

/** A stored step id back to a step; anything unknown resumes at the start of the scene. */
export function dearManStepFromId(id: string | null | undefined): DearManStep {
  const m = /^scene:([0-3])$/.exec(id ?? '');
  if (m) return { phase: 'scene', sceneStep: Number(m[1]) };
  if (id && (TOO_MUCH_PHASES as readonly string[]).includes(id) && id !== 'scene') return { phase: id as DearManPlanPhase, sceneStep: 0 };
  return { phase: 'scene', sceneStep: 0 };
}

const str = (v: unknown) => typeof v === 'string';
const strOrNull = (v: unknown) => v === null || typeof v === 'string';
const strs = (v: unknown) => Array.isArray(v) && v.every(str);

export function isDearManDraft(x: unknown): x is DearManDraft {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return d.v === 1
    && strOrNull(d.relationshipType) && strOrNull(d.situationType) && strs(d.priorities) && strs(d.barriers)
    && str(d.barriersCustom) && strOrNull(d.describeId) && str(d.describeCustom) && strs(d.feelings) && str(d.feelingCustom)
    && strs(d.assertIds) && !!d.assertDetails && typeof d.assertDetails === 'object' && str(d.assertCustom)
    && strs(d.reinforceIds) && str(d.reinforceCustom) && str(d.anchorPhrase)
    && strOrNull(d.middleGroundId) && str(d.middleGroundCustom) && strOrNull(d.walkAwayId) && str(d.walkAwayCustom);
}

export function dearManDraftOf(s: Omit<DearManDraft, 'v'>): DearManDraft {
  return { v: 1, ...s };
}
