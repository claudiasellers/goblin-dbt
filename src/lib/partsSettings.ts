/**
 * The Parts block in Privacy & Data (docs/design/parts.md, "The switch" and "Deleting"): which
 * signed-off prompts it needs. It renders only when every one is in the shipped content, so nothing
 * shows until Claudia signs the settings copy off. Pure.
 */
import type { PartsContent } from '../data/partsContentTypes';
import { surfaceReady, type SurfaceIds } from './partsContent';

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

/** The block's copy by id, or null while any of it is missing (render nothing then). */
export function partsSettingsCopy(content: PartsContent | null): Record<PartsSettingsPromptId, string> | null {
  if (!content || !surfaceReady(content, PARTS_SETTINGS_REQUIRED)) return null;
  return Object.fromEntries(PARTS_SETTINGS_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartsSettingsPromptId, string>;
}
