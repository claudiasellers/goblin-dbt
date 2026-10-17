/**
 * Build-time pieces of the review harness (dev/vite.harness.config.ts):
 * - the app's src/data/content/parts.json is replaced by the fixture (tests/fixtures/parts-content.json)
 *   with every row treated as signed off, decorated with ids under ?ids=1 (./ids.ts), so the real
 *   components show today's draft copy;
 * - firebase/app, firebase/auth and firebase/functions resolve to ./stubs (no Firebase, no network);
 * - `virtual:review-pack`: the sign-off pack's surface list (scripts/parts/review.mjs, from the gates' own
 *   `*_REQUIRED` constants), so the index lists every surface the pack does and can't miss one;
 * - `virtual:review-host-copy`: the host copy the mocks sit in, read from the schema files that load it
 *   (Do the Opposite's flow JSON and urge labels, Problem Solve's ambivalence options), never retyped.
 * Harness builds only: the app's own vite.config.ts never sees any of this.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Alias, Plugin } from 'vite';
// @ts-expect-error: a plain .mjs helper shared with the tests (no types)
import { partsFromFixture } from '../../tests/lib/partsContentFixture.mjs';

const ROOT = resolve(__dirname, '../..');
const VIRTUAL = '\0review-parts-content';
const PACK = '\0review-pack';
const HOST = '\0review-host-copy';

/** Problem Solve's AmbivalenceOption rows (id, label, therapeuticFollow), Cypher-escaped quotes undone. */
function ambivalenceOptions(): { id: string; label: string; follow: string }[] {
  const cy = readFileSync(resolve(ROOT, 'schema/problem-solve-barriers.cypher'), 'utf8');
  const str = `'((?:[^'\\\\]|\\\\.)*)'`;
  const re = new RegExp(`MERGE \\(a:AmbivalenceOption \\{id: ${str}\\}\\)\\s*SET a\\.label = ${str},\\s*a\\.therapeuticFollow = ${str}`, 'g');
  const un = (t: string) => t.replace(/\\(.)/g, '$1');
  return [...cy.matchAll(re)].map((m) => ({ id: m[1], label: un(m[2]), follow: un(m[3]) }));
}

/** Do the Opposite's ActionUrge labels by id (schema/opposite-action-data.cypher), for evidence rows. */
function actionUrges(): Record<string, string> {
  const cy = readFileSync(resolve(ROOT, 'schema/opposite-action-data.cypher'), 'utf8');
  return Object.fromEntries([...cy.matchAll(/\{id: "([a-z-]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
}

/** Do the Opposite's flow content (copy and choices) as schema/opposite-action-flow.cypher loads it. */
function oaFlow(): { copy: Record<string, string>; choices: Record<string, { id: string; label: string }[]> } {
  const cy = readFileSync(resolve(ROOT, 'schema/opposite-action-flow.cypher'), 'utf8');
  const m = cy.match(/p\.contentJson = ("(?:[^"\\]|\\.)*")/);
  if (!m) throw new Error('review harness: no contentJson in schema/opposite-action-flow.cypher');
  return JSON.parse(JSON.parse(m[1]));
}

export function reviewPartsContent(): Plugin {
  return {
    name: 'review-parts-content',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'virtual:review-pack') return PACK;
      if (source === 'virtual:review-host-copy') return HOST;
      return /(^|\/)data\/content\/parts\.json$/.test(source) ? VIRTUAL : null;
    },
    async load(id) {
      if (id === PACK) {
        const pack = await import(resolve(ROOT, 'scripts/parts/review.mjs'));
        const list = pack.surfaces(await pack.loadGates()) as { id: string; title: string; where: string }[];
        return `export default ${JSON.stringify(list.map(({ id: sid, title, where }) => ({ id: sid, title, where })))};`;
      }
      if (id === HOST) {
        const oa = oaFlow();
        return `export default ${JSON.stringify({ oa: { copy: { effectiveness: oa.copy.effectiveness }, choices: { goal: oa.choices.goal, effectiveness: oa.choices.effectiveness } }, ambivalence: ambivalenceOptions(), actionUrges: actionUrges() })};`;
      }
      if (id !== VIRTUAL) return null;
      const fixture = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/parts-content.json'), 'utf8'));
      const content = partsFromFixture(fixture, () => true);
      return [
        `import { withIds } from ${JSON.stringify(resolve(ROOT, 'dev/review/ids.ts'))};`,
        `const content = ${JSON.stringify(content)};`,
        `export default { source: { file: 'tests/fixtures/parts-content.json, every row treated as signed off' }, content: withIds(content) };`,
      ].join('\n');
    },
  };
}

export const firebaseStubs: Alias[] = ['app', 'auth', 'functions'].map((m) => ({
  find: new RegExp(`^firebase/${m}$`), replacement: resolve(ROOT, `dev/review/stubs/firebase-${m}.ts`),
}));
