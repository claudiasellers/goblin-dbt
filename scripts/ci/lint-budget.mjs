#!/usr/bin/env node
/**
 * Fails when ESLint reports more errors than the pre-existing baseline. `npm test` excludes lint
 * because the repo still carries 7 old errors; this keeps the number from growing.
 * Lower LINT_ERROR_BUDGET when an old error is fixed.
 */
import { execFileSync } from 'node:child_process';

const LINT_ERROR_BUDGET = 5; // PR-C1 removed the 2 unused ensureUserExists params

let out;
try {
  out = execFileSync('npx', ['eslint', '.', '-f', 'json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = e.stdout; // eslint exits 1 when it finds errors; the JSON is still on stdout
  if (!out) throw e;
}
const results = JSON.parse(out);
const errors = results.flatMap((r) => r.messages.filter((m) => m.severity === 2).map((m) => `${r.filePath}:${m.line} ${m.ruleId}`));
console.log(`eslint errors: ${errors.length} (budget ${LINT_ERROR_BUDGET})`);
if (errors.length > LINT_ERROR_BUDGET) {
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
