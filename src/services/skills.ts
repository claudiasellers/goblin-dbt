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
export function getSkillRun(sessionId: string, toolId: string): Promise<Record<string, unknown> | null> {
  // A page that checks the run before the player plays it (PersonFirstSkill's reopen gate) and the player read the
  // same answer: one read, kept a few seconds, so a blip between the two can't let the player start a fresh run
  // the gate didn't check. A failed read isn't kept.
  const key = `${toolId}:${sessionId}`;
  const hit = recentRuns.get(key);
  if (hit && Date.now() - hit.at < RUN_REUSE_MS) return hit.p;
  const p = readSkillRun(sessionId, toolId);
  recentRuns.set(key, { at: Date.now(), p });
  p.catch(() => { if (recentRuns.get(key)?.p === p) recentRuns.delete(key); });
  return p;
}

const RUN_REUSE_MS = 15_000;
const recentRuns = new Map<string, { at: number; p: Promise<Record<string, unknown> | null> }>();

async function readSkillRun(sessionId: string, toolId: string): Promise<Record<string, unknown> | null> {
  const [{ httpsCallable }, { functions }] = await Promise.all([import('firebase/functions'), import('./firebase')]);
  const fn = httpsCallable<{ sessionId: string; toolId: string }, { run: Record<string, unknown> | null }>(functions, 'getSkillRun');
  return (await fn({ sessionId, toolId })).data.run;
}
