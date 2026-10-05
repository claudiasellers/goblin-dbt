#!/usr/bin/env node
/**
 * Refresh the app's content files from the live graph: a content-only export, then build.mjs.
 * scripts/load-graph.mjs runs this after every successful load, so the files the app ships always
 * match the graph that was just loaded. By hand: `npm run content:refresh`.
 *
 * Needs the same credentials as load-graph.mjs (env vars or the repo-root .env). The export only
 * reads; it never contains user data (graph-export.mjs --content-only), and build.mjs refuses one that does.
 * Afterwards: commit src/data/content/ with the content change, then `firebase deploy --only hosting`.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const run = (script, args = []) => spawnSync(process.execPath, [resolve(root, script), ...args], { stdio: 'inherit', cwd: root }).status;

if (run('scripts/graph-export.mjs', ['--content-only']) !== 0) {
  console.error('✗ Content-only export failed; the app content files were not changed.');
  process.exit(1);
}
const status = run('scripts/content-snapshot/build.mjs');
if (status !== 0) process.exit(status ?? 1);
console.log('\nNext: commit src/data/content/ with this content change, then `firebase deploy --only hosting`.');
