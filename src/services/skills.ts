/**
 * The skill runtime's content (docs/design/skill-runtime.md): every skill the player runs and the shared
 * parentOf / fitsWhen tables. Read from the file the app ships (src/data/content/skills.json, generated from
 * the graph by scripts/content-snapshot/build.mjs) instead of the getSkillContent Cloud Function.
 */
import type { SkillsContent } from '../data/skillTypes';

let cached: Promise<SkillsContent> | null = null;

/** Fetched as its own chunk the first time it is needed, kept for the page's life; a failed fetch can be retried. */
export function getSkillsContent(): Promise<SkillsContent> {
  if (!cached) {
    cached = import('../data/content/skills.json').then((m) => m.default.content as unknown as SkillsContent).catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}
