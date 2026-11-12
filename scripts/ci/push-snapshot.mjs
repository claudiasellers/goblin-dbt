#!/usr/bin/env node
/**
 * Push the deploy's "Content snapshots from the live graph" commit to main, even when main moved while
 * the graph loaded (back-to-back merges: the next merge lands during this run's ~10-minute load, and a
 * plain `git push origin HEAD:main` is rejected, which used to skip functions and hosting).
 *
 * The snapshot commit C sits on top of the commit this run checked out. If main is still that commit, C
 * is pushed as it is. Otherwise C's src/data/content changes are applied to main's tip as a new commit
 * (generated files only: C's version of each file C changed wins, every other path is main's), without
 * touching the working tree, which stays at what this run built, tested and deploys. Retries on a
 * rejected push, re-reading main each time.
 *
 * CLI (in deploy.yml): node scripts/ci/push-snapshot.mjs <commit> [--remote origin] [--branch main]
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT_DIR = 'src/data/content/';

function gitIn(cwd, env = {}) {
  return (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * The commit to push so main gets C's content files on top of `tip`: C itself when C's parent is the tip,
 * null when the tip already has every one of those files as C has them, else a new commit on the tip.
 */
export function snapshotOnto({ cwd = process.cwd(), commit, tip }) {
  const git = gitIn(cwd);
  const c = git('rev-parse', `${commit}^{commit}`);
  if (git('rev-parse', `${c}^`) === tip) return c;

  const changed = git('diff', '--name-only', '--no-renames', `${c}^`, c).split('\n').filter(Boolean);
  const outside = changed.filter((p) => !p.startsWith(CONTENT_DIR));
  if (outside.length) throw new Error(`The snapshot commit changes more than ${CONTENT_DIR}: ${outside.join(', ')}`);

  const dir = mkdtempSync(join(tmpdir(), 'snapshot-index-'));
  try {
    const idx = gitIn(cwd, { GIT_INDEX_FILE: join(dir, 'index') });
    idx('read-tree', tip);
    for (const path of changed) {
      const entry = git('ls-tree', c, '--', path); // "<mode> blob <sha>\t<path>", empty when C deleted it
      if (entry) {
        const [mode, , sha] = entry.split(/\s+/);
        idx('update-index', '--add', '--cacheinfo', `${mode},${sha},${path}`);
      } else {
        idx('update-index', '--force-remove', '--', path);
      }
    }
    const tree = idx('write-tree');
    if (tree === git('rev-parse', `${tip}^{tree}`)) return null;
    const message = git('log', '-1', '--format=%B', c);
    return git('commit-tree', tree, '-p', tip, '-m', message);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function pushSnapshot({ cwd = process.cwd(), commit, remote = 'origin', branch = 'main', attempts = 5, log = console }) {
  const git = gitIn(cwd);
  for (let i = 1; i <= attempts; i++) {
    git('fetch', '-q', remote, branch);
    const tip = git('rev-parse', 'FETCH_HEAD');
    const push = snapshotOnto({ cwd, commit, tip });
    if (push === null) {
      log.log(`${branch} (${tip.slice(0, 7)}) already has these content files; nothing to push.`);
      return null;
    }
    try {
      git('push', '-q', remote, `${push}:refs/heads/${branch}`);
      log.log(push === git('rev-parse', `${commit}^{commit}`)
        ? `Pushed the content snapshot to ${branch}.`
        : `${branch} moved during the load; pushed the content snapshot on top of ${tip.slice(0, 7)} as ${push.slice(0, 7)}.`);
      return push;
    } catch (e) {
      if (i === attempts) throw e;
      log.log(`Push rejected (attempt ${i} of ${attempts}); ${branch} moved again, retrying.`);
    }
  }
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
  const commit = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) ?? 'HEAD';
  try {
    pushSnapshot({ commit, remote: opt('--remote', 'origin'), branch: opt('--branch', 'main') });
  } catch (e) {
    console.error(`::error::Could not push the content snapshot: ${e.stderr?.toString().trim() || e.message}`);
    process.exit(1);
  }
}
