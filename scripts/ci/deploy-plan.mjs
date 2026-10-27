#!/usr/bin/env node
/**
 * What `.github/workflows/deploy.yml` deploys. Each target remembers the commit it last went out
 * from as a tag (`deploy/functions`, `deploy/hosting`), so a run deploys exactly what changed since,
 * whatever runs were skipped or failed in between.
 *
 * A push to main holds the whole deploy while `schema/` has changed since a target's last deploy:
 * those PRs need a graph load (or a migration) on Claudia's Mac first, in the order the PR's Deploy
 * section gives. She releases it by running the workflow by hand (workflow_dispatch), which never
 * holds. A target with no tag yet also holds a push: the first run is by hand.
 *
 * CLI (in the workflow): node scripts/ci/deploy-plan.mjs <event> <only>
 * writes `functions` / `hosting` (true|false) to $GITHUB_OUTPUT and a summary to $GITHUB_STEP_SUMMARY.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const TARGETS = ['functions', 'hosting'];

const ROOT_BUILD_FILES = new Set(['index.html', 'vite.config.ts', 'package.json', 'package-lock.json', 'firebase.json', '.firebaserc']);

/** Does a changed path need this target redeployed? */
export function touches(target, path) {
  if (path === 'firebase.json' || path === '.firebaserc') return true;
  if (target === 'functions') {
    return path.startsWith('functions/') && !path.startsWith('functions/test/') && !path.endsWith('.md');
  }
  // The app imports from functions/src (shared types, body-map scoring), so those count for hosting too.
  return path.startsWith('src/') || path.startsWith('public/') || path.startsWith('functions/src/')
    || ROOT_BUILD_FILES.has(path) || /^tsconfig[^/]*\.json$/.test(path);
}

export const needsGraphFirst = (path) => path.startsWith('schema/');

/**
 * @param {{ event: 'push' | 'workflow_dispatch', only: 'changed' | 'functions' | 'hosting' | 'both',
 *   changed: Record<string, string[] | null> }} input  changed[target]: paths since its tag, null when it has no tag
 * @returns {{ deploy: Record<string, boolean>, hold: string | null, reasons: Record<string, string> }}
 */
export function planDeploy({ event, only, changed }) {
  const deploy = Object.fromEntries(TARGETS.map((t) => [t, false]));
  const reasons = {};

  if (event === 'push') {
    const untagged = TARGETS.filter((t) => changed[t] === null);
    if (untagged.length) {
      return { deploy, reasons, hold: `no previous deploy recorded for ${untagged.join(' and ')}: run this workflow by hand once to set the baseline` };
    }
    const schema = [...new Set(TARGETS.flatMap((t) => changed[t].filter(needsGraphFirst)))];
    if (schema.length) {
      return { deploy, reasons, hold: `schema changed since the last deploy (${schema.slice(0, 5).join(', ')}${schema.length > 5 ? ', …' : ''}): run the graph load / migration from the PR's Deploy section, then run this workflow by hand` };
    }
  }

  for (const t of TARGETS) {
    if (only === t || only === 'both') {
      deploy[t] = true;
      reasons[t] = 'asked for by hand';
    } else if (only === 'changed') {
      if (changed[t] === null) {
        deploy[t] = true;
        reasons[t] = 'no previous deploy recorded';
      } else {
        const hits = changed[t].filter((p) => touches(t, p));
        deploy[t] = hits.length > 0;
        reasons[t] = hits.length ? `${hits.length} changed file(s), e.g. ${hits[0]}` : 'nothing changed';
      }
    } else {
      reasons[t] = 'not asked for';
    }
  }
  return { deploy, reasons, hold: null };
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function changedSinceTag(target) {
  let base;
  try {
    base = git('rev-parse', '--verify', '-q', `refs/tags/deploy/${target}^{commit}`);
  } catch {
    return null;
  }
  const out = git('diff', '--name-only', base, 'HEAD');
  return out ? out.split('\n') : [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [event = 'push', only = 'changed'] = process.argv.slice(2);
  const changed = Object.fromEntries(TARGETS.map((t) => [t, changedSinceTag(t)]));
  const { deploy, hold, reasons } = planDeploy({ event, only, changed });

  const lines = ['## Deploy plan', ''];
  if (hold) {
    lines.push(`**Held:** ${hold}.`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Deploy held::${hold}`);
  }
  else for (const t of TARGETS) lines.push(`- **${t}**: ${deploy[t] ? 'deploy' : 'skip'} (${reasons[t]})`);
  const summary = lines.join('\n');
  console.log(summary);

  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, TARGETS.map((t) => `${t}=${deploy[t]}`).join('\n') + `\nany=${TARGETS.some((t) => deploy[t])}\n`);
  }
}
