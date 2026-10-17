/**
 * The Parts block in Privacy & Data (docs/design/parts.md, "The switch" and "Deleting"): which
 * signed-off prompts it needs. It renders only when every one is in the shipped content, so nothing
 * shows until Claudia signs the settings copy off. Pure.
 */
import type { PartsContent } from '../data/partsContentTypes';
import { surfaceReady, type SurfaceIds } from './partsContent';
import { PARTS_OF_ME_REQUIRED } from './partsOfMe';

/** The switch, its description and small print, the About lines, then Delete your parts. */
export const PARTS_SETTINGS_PROMPTS = [
  'settings_label', 'settings_blurb', 'settings_dissociation', 'settings_off', 'settings_about_1', 'settings_about_2',
  'settings_delete', 'settings_delete_confirm', 'settings_delete_yes', 'settings_delete_no', 'settings_delete_done',
  'settings_delete_failed',
] as const;

/** What the block's gate requires (scripts/parts/review.mjs reads it). */
export const PARTS_SETTINGS_REQUIRED: SurfaceIds = { prompts: PARTS_SETTINGS_PROMPTS, options: [] };

/** The one-time "Get to know a part" under the switch, right after turning parts on (also Meet a part's own gate). */
export const SETTINGS_LINK_REQUIRED: SurfaceIds = { prompts: ['me_get_to_know'], options: [] };

export type PartsSettingsPromptId = (typeof PARTS_SETTINGS_PROMPTS)[number];

/**
 * Optional, under the confirm (parts.md "Deleting"): "Also remove 2 kept lines that name your parts?",
 * asked only when there are some and the line ships; without it nothing extra is asked or deleted.
 */
export const SETTINGS_LINES_ONE = 'settings_delete_lines_one';
export const SETTINGS_LINES_MANY = 'settings_delete_lines';
export const SETTINGS_LINES_REQUIRED: SurfaceIds = { prompts: [SETTINGS_LINES_ONE, SETTINGS_LINES_MANY], options: [] };

/** The question for `n` kept lines, or null (none, or its copy not signed off). */
export function keptLinesQuestion(content: PartsContent | null, n: number): string | null {
  if (!content || !Number.isInteger(n) || n < 1) return null;
  const id = n === 1 ? SETTINGS_LINES_ONE : SETTINGS_LINES_MANY;
  const copy = content.prompts[id]?.copy;
  return copy ? copy.replace('{n}', String(n)) : null;
}

/** The block's copy by id, or null while any of it is missing (render nothing then). */
export function partsSettingsCopy(content: PartsContent | null): Record<PartsSettingsPromptId, string> | null {
  if (!content || !surfaceReady(content, PARTS_SETTINGS_REQUIRED)) return null;
  return Object.fromEntries(PARTS_SETTINGS_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartsSettingsPromptId, string>;
}

/**
 * Me with parts off: a quiet card where Parts of me would be, with the switch's own lines (its label as
 * the title, the blurb beside the switch, then the small print). One write, `partsEnabled`.
 */
export const PARTS_ME_OFF_PROMPTS = ['settings_label', 'settings_blurb', 'settings_dissociation', 'settings_off'] as const;
export type PartsMeOffPromptId = (typeof PARTS_ME_OFF_PROMPTS)[number];
/**
 * What the card's gate requires (scripts/parts/review.mjs reads it): its own lines and Parts of me's, so
 * turning parts on there always shows Parts of me in its place.
 */
export const PARTS_ME_OFF_REQUIRED: SurfaceIds = {
  prompts: [...PARTS_ME_OFF_PROMPTS, ...PARTS_OF_ME_REQUIRED.prompts], options: [...PARTS_OF_ME_REQUIRED.options],
};

/** The card's copy by id, or null while any line it or Parts of me needs is missing (render nothing then). */
export function partsMeOffCopy(content: PartsContent | null): Record<PartsMeOffPromptId, string> | null {
  if (!content || !surfaceReady(content, PARTS_ME_OFF_REQUIRED)) return null;
  return Object.fromEntries(PARTS_ME_OFF_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartsMeOffPromptId, string>;
}

/**
 * Whether Me shows the switch card: its copy (and Parts of me's) shipped, parts off or just turned on from
 * the card this visit, and Parts of me not on screen yet (getMe brings the area once parts are on; the
 * card keeps its place, switch on, until then).
 */
export function partsOffCardShown(s: { copyReady: boolean; partsOn: boolean; turnedOnHere: boolean; partsAreaShown: boolean }): boolean {
  return s.copyReady && (!s.partsOn || s.turnedOnHere) && !s.partsAreaShown;
}
