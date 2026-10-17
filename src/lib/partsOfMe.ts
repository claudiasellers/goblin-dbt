/**
 * Parts of me in Me (docs/design/parts.md, "Parts of me (Me)", "The part card"): which signed-off
 * prompts the area, its candidate list and its 30-day check-back need, their copy, and the links into
 * Meet a part. Pure, and read eagerly by Me's gate; what each card shows and does is ./partCard.ts,
 * which loads with the card (the stats readout is src/lib/partStats.ts).
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { AnswerPartCandidateRequest, PartRevisitAnswer } from '../data/partsTypes';
import { MEET_NAME_MAX } from './partNameMax';
import { stepOptions, surfaceReady, type SurfaceIds } from './partsContent';

/** Every line the area uses. It renders only when all are signed off. */
export const PARTS_OF_ME_PROMPTS = [
  'me_get_to_know', 'card_where', 'card_job', 'card_job_own', 'card_fear', 'card_rather', 'card_visit', 'card_resting',
  // The card's actions (lane 2's part writers) and the set-aside row.
  'card_rename', 'card_rest', 'card_back', 'card_set_aside', 'card_restore', 'card_tender', 'card_rename_save', 'card_cancel',
] as const;
export type PartsOfMePromptId = (typeof PARTS_OF_ME_PROMPTS)[number];
/** What the area's gate requires (scripts/parts/review.mjs reads it). */
export const PARTS_OF_ME_REQUIRED: SurfaceIds = { prompts: PARTS_OF_ME_PROMPTS, options: [] };

/** The area's copy by id, or null while any of it is missing (Me then renders as before). */
export function partsOfMeCopy(content: PartsContent | null): Record<PartsOfMePromptId, string> | null {
  if (!content || !surfaceReady(content, PARTS_OF_ME_REQUIRED)) return null;
  return Object.fromEntries(PARTS_OF_ME_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartsOfMePromptId, string>;
}

export interface MeetAPartLink {
  pathname: '/tool/meet-a-part';
  state: { parts: { trailheadKind: 'me' | 'candidate' | 'settings' | 'tools'; partId?: string; candidateId?: string; moveId?: string } };
}

/** "Get to know a part" (no partId) or "Spend time with it" (this part). */
export function meetAPartLink(partId?: string): MeetAPartLink {
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'me', ...(partId ? { partId } : {}) } } };
}

/** Meet a part's card in the Tools list (listed with parts on): a visit that starts there. */
export function toolsMeetLink(): MeetAPartLink {
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'tools' } } };
}

/** Settings' one-time "Get to know a part", right after turning parts on. */
export function settingsMeetLink(): MeetAPartLink {
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'settings' } } };
}

// ---- To come back to (open PartCandidates, after the cards) ----

export const PART_CANDIDATE_PROMPTS = [
  'candidate_title', 'candidate_line', 'candidate_line_plain', 'candidate_go', 'candidate_dismiss',
] as const;
export type PartCandidatePromptId = (typeof PART_CANDIDATE_PROMPTS)[number];
/** What the list's gate requires. */
export const PART_CANDIDATE_REQUIRED: SurfaceIds = { prompts: PART_CANDIDATE_PROMPTS, options: [] };

/** The list's copy, or null while any of it is missing (the list then isn't shown). */
export function partCandidateCopy(content: PartsContent | null): Record<PartCandidatePromptId, string> | null {
  if (!content || !surfaceReady(content, PART_CANDIDATE_REQUIRED)) return null;
  return Object.fromEntries(PART_CANDIDATE_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartCandidatePromptId, string>;
}

/** "Not any more". */
export function dismissCandidateRequest(candidateId: string): AnswerPartCandidateRequest {
  return { candidateId, answer: 'dismiss' };
}

/** Rename's limit: Meet a part's (PartsPolicy.nameMaxChars, the server's DEFAULT_NAME_MAX). */
export const PART_NAME_MAX = MEET_NAME_MAX;

// ---- The 30-day check-back on the card ("Is {name} still doing the same job?") ----

export const PART_REVISIT_PROMPTS = [
  'revisit_title', 'revisit_title_noname', 'revisit_resting', 'revisit_resting_noname', 'revisit_new_title',
] as const;
export type PartRevisitPromptId = (typeof PART_REVISIT_PROMPTS)[number];

/** Each option and the answer it sends: an active part's four, then a resting part's two. */
export const PART_REVISIT_ANSWERS = {
  active: [['revisit_same', 'same'], ['revisit_less', 'less'], ['revisit_new', 'new'], ['revisit_resting_opt', 'resting']],
  resting: [['revisit_still_quiet', 'still_quiet'], ['revisit_back', 'back']],
} as const satisfies Record<'active' | 'resting', readonly (readonly [string, PartRevisitAnswer])[]>;
export const PART_REVISIT_OPTIONS: readonly string[] = [...PART_REVISIT_ANSWERS.active, ...PART_REVISIT_ANSWERS.resting].map(([id]) => id);
/** What the check-back's gate requires. */
export const PART_REVISIT_REQUIRED: SurfaceIds = { prompts: PART_REVISIT_PROMPTS, options: PART_REVISIT_OPTIONS };

export interface PartRevisitChoice { id: string; answer: PartRevisitAnswer; label: string }
export interface PartRevisitCopy {
  prompts: Record<PartRevisitPromptId, string>;
  active: PartRevisitChoice[];
  resting: PartRevisitChoice[];
}

/** The check-back's copy, or null while any of it is missing (the card then asks nothing yet). */
export function partRevisitCopy(content: PartsContent | null): PartRevisitCopy | null {
  if (!content || !surfaceReady(content, PART_REVISIT_REQUIRED)) return null;
  const label = new Map(stepOptions(content, 'me', 'revisit').map((o) => [o.id, o.label]));
  const choices = (rows: readonly (readonly [string, PartRevisitAnswer])[]) =>
    rows.map(([id, answer]) => ({ id, answer, label: label.get(id)! }));
  return {
    prompts: Object.fromEntries(PART_REVISIT_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartRevisitPromptId, string>,
    active: choices(PART_REVISIT_ANSWERS.active),
    resting: choices(PART_REVISIT_ANSWERS.resting),
  };
}
