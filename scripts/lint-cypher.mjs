#!/usr/bin/env node
/**
 * Syntax-lint schema/*.cypher statement by statement with Neo4j's own Cypher linter.
 * Not a devDependency (the package is ~124 MB), so run it by hand on schema PRs:
 *
 *   npx -y -p @neo4j-cypher/language-support@2.0.0-next.6 node scripts/lint-cypher.mjs [files…]
 *   NODE_PATH=/path/with/node_modules node scripts/lint-cypher.mjs      # an existing install
 *
 * Prints one line per file (statements, syntax errors, first error) and exits 1 on any error.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitStatements } from './load-graph.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = '@neo4j-cypher/language-support';

function loadLinter() {
  const bases = [import.meta.url, join(process.cwd(), 'noop.js'), ...(process.env.NODE_PATH || '').split(delimiter).filter(Boolean).map((d) => join(d, '..', 'noop.js'))];
  for (const b of bases) {
    try { return createRequire(b)(PKG); } catch { /* try the next base */ }
  }
  console.error(`${PKG} is not installed. Run:\n  npx -y -p ${PKG}@2.0.0-next.6 node scripts/lint-cypher.mjs`);
  process.exit(2);
}

const { lintCypherQuery } = loadLinter();
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(resolve(root, 'schema')).filter((f) => f.endsWith('.cypher')).map((f) => `schema/${f}`);

let failed = 0;
for (const f of files) {
  const stmts = splitStatements(readFileSync(resolve(root, f), 'utf8'));
  let errors = 0;
  let first = null;
  for (const [i, s] of stmts.entries()) {
    const res = lintCypherQuery(s, {});
    const diags = (Array.isArray(res) ? res : res.diagnostics || []).filter((d) => d.severity === 1);
    if (diags.length) {
      errors++;
      first ??= { statement: i + 1, message: diags[0].message, text: s.slice(0, 160) };
    }
  }
  failed += errors;
  console.log(`${f.padEnd(56)} statements ${String(stmts.length).padStart(4)}  syntax errors ${errors}${first ? `  ${JSON.stringify(first)}` : ''}`);
}
process.exit(failed ? 1 : 0);
