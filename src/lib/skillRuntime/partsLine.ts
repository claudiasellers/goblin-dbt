/**
 * A parts line inside a skill (the `partsLine` embed, docs/design/skill-runtime.md): one signed-off prompt,
 * shown only with parts on and only when its copy ships in parts.json. It names no part. Pure.
 */
import type { PartsContent } from '../../data/partsContentTypes';
import { promptCopy, surfaceReady, type SurfaceIds } from '../partsContent';

/** Check the Facts' line under the story chips (screen 3). */
export const CF_UNBLEND_REQUIRED: SurfaceIds = { prompts: ['cf_unblend'], options: [] };

/** The line's text, or null: parts content not loaded, or the line not shipped. */
export function partsLineText(content: PartsContent | null, promptId: string): string | null {
  if (!content || !surfaceReady(content, { prompts: [promptId], options: [] })) return null;
  return promptCopy(content, promptId);
}
