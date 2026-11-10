#!/usr/bin/env node
/**
 * What `.github/workflows/deploy.yml` does after a merge, in the order a PR's Deploy section always
 * gives: graph load → functions → migrations → hosting. Each step remembers the commit it last ran
 * from as a tag (`deploy/graph`, `deploy/functions`, `deploy/migrations`, `deploy/hosting`), so a run
 * does exactly what changed since, whatever runs were skipped or failed in between.
 *
 * - graph: a full `load-graph.mjs --verify` (MERGE-only, so safe to re-run) when a loaded schema file
 *   changed. The load refreshes src/data/content/, so hosting follows it.
 * - migrations: each schema/migrations/*.cypher *added* since the tag, once, after functions.
 *   With no tag yet nothing runs: the migrations already in the repo ran by hand long ago.
 * - functions / hosting: when their files changed.
 *
 * CLI (in the workflow): node scripts/ci/deploy-plan.mjs <changed|all>
 * writes graph / functions / hosting (true|false), migrations (space-separated paths) and any to
 * $GITHUB_OUTPUT, and a summary to $GITHUB_STEP_SUMMARY.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const STEPS = ['graph', 'functions', 'migrations', 'hosting'];

const ROOT_BUILD_FILES = new Set(['index.html', 'vite.config.ts', 'package.json', 'package-lock.json', 'firebase.json', '.firebaserc']);

/** Does a changed path need this step? (migrations go by added files, not here) */
export function touches(step, path) {
  if (step === 'graph') {
    return path.startsWith('schema/') && path.endsWith('.cypher')
      && !path.startsWith('schema/migrations/') && !path.startsWith('schema/maintenance/');
  }
  if (path === 'firebase.json' || path === '.firebaserc') return true;
  if (step === 'functions') {
    return path.startsWith('functions/') && !path.startsWith('functions/test/') && !path.endsWith('.md');
  }
  // The app imports from functions/src (shared types, body-map scoring), so those count for hosting too.
  return path.startsWith('src/') || path.startsWith('public/') || path.startsWith('functions/src/')
    || ROOT_BUILD_FILES.has(path) || /^tsconfig[^/]*\.json$/.test(path);
}

export const isMigration = (path) => /^schema\/migrations\/[^/]+\.cypher$/.test(path);

/**
 * @param {{ only: 'changed' | 'all',
 *   changed: Record<'graph'|'functions'|'hosting', string[] | null>,
 *   addedMigrations: string[] | null }} input
 *   changed[step]: paths since its tag, null when it has none; addedMigrations: files added since
 *   `deploy/migrations`, null when it has none
 */
export function planDeploy({ only, changed, addedMigrations }) {
  const run = { graph: false, functions: false, hosting: false };
  const reasons = {};
  for (const step of ['graph', 'functions', 'hosting']) {
    if (only === 'all') {
      run[step] = true;
      reasons[step] = 'everything asked for by hand';
    } else if (changed[step] === null) {
      run[step] = true;
      reasons[step] = 'no previous run recorded';
    } else {
      const hits = changed[step].filter((p) => touches(step, p));
      run[step] = hits.length > 0;
      reasons[step] = hits.length ? `${hits.length} changed file(s), e.g. ${hits[0]}` : 'nothing changed';
    }
  }
  if (run.graph && !run.hosting) {
    run.hosting = true;
    reasons.hosting = 'follows the graph load (its content files)';
  }
  const migrations = (addedMigrations ?? []).filter(isMigration).sort();
  reasons.migrations = addedMigrations === null ? 'first run: the ones already in the repo are taken as done'
    : migrations.length ? migrations.join(', ') : 'none new';
  return { run, migrations, reasons };
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function tag(step) {
  try {
    return git('rev-parse', '--verify', '-q', `refs/tags/deploy/${step}^{commit}`);
  } catch {
    return null;
  }
}

const lines = (out) => (out ? out.split('\n') : []);

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2] === 'all' ? 'all' : 'changed';
  const changed = {};
  for (const step of ['graph', 'functions', 'hosting']) {
    const base = tag(step);
    changed[step] = base === null ? null : lines(git('diff', '--name-only', base, 'HEAD'));
  }
  const mBase = tag('migrations');
  const addedMigrations = mBase === null ? null : lines(git('diff', '--name-only', '--diff-filter=A', mBase, 'HEAD', '--', 'schema/migrations'));
  const { run, migrations, reasons } = planDeploy({ only, changed, addedMigrations });

  const summary = ['## Deploy plan', '', ...STEPS.map((s) => {
    const doing = s === 'migrations' ? migrations.length > 0 : run[s];
    return `- **${s}**: ${doing ? 'run' : 'skip'} (${reasons[s]})`;
  })].join('\n');
  console.log(summary);

  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  if (process.env.GITHUB_OUTPUT) {
    const any = run.graph || run.functions || run.hosting || migrations.length > 0;
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `graph=${run.graph}`, `functions=${run.functions}`, `hosting=${run.hosting}`,
      `migrations=${migrations.join(' ')}`, `any=${any}`, '',
    ].join('\n'));
  }
}
