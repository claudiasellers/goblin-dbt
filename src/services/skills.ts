/**
 * The skill runtime's content (docs/design/skill-runtime.md): every skill the player runs and the shared
 * parentOf / fitsWhen tables. Read from the file the app ships (src/data/content/skills.json, generated from
 * the graph by scripts/content-snapshot/build.mjs) instead of the getSkillContent Cloud Function.
 */
import type { SkillsContent } from '../data/skillTypes';

let cached: Promise<SkillsContent> | null = null;
let loaded: SkillsContent | null = null;

/** The content if it has already loaded (the player loads it before any step renders), else null. */
export function peekSkillsContent(): SkillsContent | null {
  return loaded;
}

/** Fetched as its own chunk the first time it is needed, kept for the page's life; a failed fetch can be retried. */
export function getSkillsContent(): Promise<SkillsContent> {
  if (!cached) {
    cached = import('../data/content/skills.json').then((m) => (loaded = m.default.content as unknown as SkillsContent)).catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}

/**
 * Resume (plan C3a R9): the caller's own earlier run of this tool (its `ext.run`, own words readable), or null
 * when there is none to reopen (another person's, another tool's, older than the server's window).
 */
export async function getSkillRun(sessionId: string, toolId: string): Promise<Record<string, unknown> | null> {
  const [{ httpsCallable }, { functions }] = await Promise.all([import('firebase/functions'), import('./firebase')]);
  const fn = httpsCallable<{ sessionId: string; toolId: string }, { run: Record<string, unknown> | null }>(functions, 'getSkillRun');
  return (await fn({ sessionId, toolId })).data.run;
}
