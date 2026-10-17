/**
 * DEAR MAN's debrief: who showed up? (docs/design/parts.md, the DEAR MAN row). One screen after
 * "Underneath that", parts on, at least one kept part, every line shipped. Two forms:
 * - named: prep's cope ahead chose a part (`copeAheadPartId`, this visit) that is still active or resting
 *   and has a name → "Did {name} show up?" with Yes / A bit / No / Skip;
 * - general: otherwise → "Was one of your parts there?" with the tag row's chips (PartTagRow).
 * Yes and A bit (or a picked part) write a PartTag with source 'debrief'; No and Skip write nothing.
 * Only the named form's answer is recorded (`ext.er.whoShowedUp`, an id, never the name). Pure.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { ProfileSlices } from '../data/profileTypes';
import type { TagPartRequest, TagStrength } from '../data/partsTypes';
import { fillParts, surfaceReady, type SurfaceIds } from './partsContent';
import { TAG_OPTIONS, TAG_PROMPTS, UNNAMED_PROMPTS } from './partTag';

export const DEBRIEF_PROMPTS = ['debrief_who', 'debrief_who_named'] as const;
export const DEBRIEF_OPTIONS = ['debrief_yes', 'debrief_a_bit', 'debrief_no'] as const;
export type WhoShowedUp = 'yes' | 'a_bit' | 'no';
const ANSWER: Record<(typeof DEBRIEF_OPTIONS)[number], WhoShowedUp> = { debrief_yes: 'yes', debrief_a_bit: 'a_bit', debrief_no: 'no' };

/** Both forms' lines: the screen's own, and the tag row's (reused, not duplicated) with the unnamed names. */
export const DEBRIEF_WHO_REQUIRED: SurfaceIds = {
  prompts: [...DEBRIEF_PROMPTS, ...TAG_PROMPTS, ...UNNAMED_PROMPTS],
  options: [...DEBRIEF_OPTIONS, ...TAG_OPTIONS],
};

export function debriefWhoReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, DEBRIEF_WHO_REQUIRED);
}

/** Parts on, at least one kept part (the slice holds active and resting only), the copy shipped, and not answered on this page (src/lib/tagRowOnce.ts). */
export function showDebriefWho(g: { partsOn: boolean; partCount: number; ready: boolean; answered?: boolean }): boolean {
  return g.partsOn && g.partCount > 0 && g.ready && !g.answered;
}

type SlicePart = Pick<ProfileSlices['parts'][number], 'id' | 'name' | 'status'>;
export type DebriefForm = { kind: 'named'; partId: string; name: string } | { kind: 'general' };

/** Named when this visit's prep chose a part that is still kept and has a name; else general. */
export function debriefForm(copeAheadPartId: string | null | undefined, parts: readonly SlicePart[] | null | undefined): DebriefForm {
  const p = copeAheadPartId ? (parts ?? []).find((x) => x.id === copeAheadPartId) : undefined;
  const name = p?.name?.trim();
  return p && name && (p.status === 'active' || p.status === 'resting') ? { kind: 'named', partId: p.id, name } : { kind: 'general' };
}

export interface NamedCopy { question: string; answers: { id: WhoShowedUp; label: string }[]; skip: string }

const optionLabel = (content: PartsContent, flow: string, step: string, id: string) =>
  content.options[flow]?.[step]?.find((o) => o.id === id)?.label ?? '';

/** "Did {name} show up?" (the name filled as typed), Yes / A bit / No, and the tag row's Skip. */
export function namedCopy(content: PartsContent, name: string): NamedCopy {
  return {
    question: fillParts(content.prompts.debrief_who_named?.copy ?? '', { name }),
    answers: DEBRIEF_OPTIONS.map((id) => ({ id: ANSWER[id], label: optionLabel(content, 'dearman', 'debrief', id) })),
    skip: optionLabel(content, 'tag', 'tag', 'tag_skip'),
  };
}

export const generalQuestion = (content: PartsContent): string => content.prompts.debrief_who?.copy ?? '';

/** The write for Yes / A bit (the named part, or the chip picked in the general form). */
export function debriefTag(id: string, partId: string, toolSessionId: string, strength: TagStrength): TagPartRequest {
  return { id, partId, toolSessionId, source: 'debrief', strength };
}
