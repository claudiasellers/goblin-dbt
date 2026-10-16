/**
 * Build-time pieces of the review harness (dev/vite.harness.config.ts):
 * - the app's src/data/content/parts.json is replaced by the fixture (tests/fixtures/parts-content.json)
 *   with every row treated as signed off, decorated with ids under ?ids=1 (./ids.ts), so the real
 *   components show today's draft copy;
 * - firebase/app, firebase/auth and firebase/functions resolve to ./stubs (no Firebase, no network).
 * Harness builds only: the app's own vite.config.ts never sees any of this.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Alias, Plugin } from 'vite';
// @ts-expect-error: a plain .mjs helper shared with the tests (no types)
import { partsFromFixture } from '../../tests/lib/partsContentFixture.mjs';

const ROOT = resolve(__dirname, '../..');
const VIRTUAL = '\0review-parts-content';

export function reviewPartsContent(): Plugin {
  return {
    name: 'review-parts-content',
    enforce: 'pre',
    resolveId(source) {
      return /(^|\/)data\/content\/parts\.json$/.test(source) ? VIRTUAL : null;
    },
    load(id) {
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
