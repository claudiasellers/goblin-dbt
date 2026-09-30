#!/usr/bin/env node
/**
 * Phase A rehearsal: every graph step of the merge runbook, run against a LOCAL COPY of production,
 * before anything touches Aura. Needs Docker Desktop running.
 *
 *   1. Starts a fresh local Neo4j (functions/test/neo4j/docker-compose.yml).
 *   2. Copies production into it: READ-ONLY on Aura, driver to driver, so dates, integers and every
 *      property keep their real types (graph-export.mjs turns temporals into strings; this doesn't).
 *      Also copies Aura's constraints and indexes, and reports both Neo4j versions.
 *   3. Replays the runbook on the copy, milestone by milestone, each with THAT milestone's own files
 *      (a detached git worktree per branch under .rehearsal/):
 *        M1  dedupe dry run + apply, full load twice (must be identical), routing unchanged (the
 *            positive_state stub the old saveCheckIn created is the one allowed difference)
 *        M2  constraints, backfill twice (second run must change nothing), full load, goal-field
 *            cleanup, positive_state stub removed (twice, second changes nothing), backfill again;
 *            every legacy user record adopted
 *        M3  full load (voice lint included)
 *        M4  full load twice; routing identical to live except numb's intended move; policy off;
 *            differences from the schema-only view recorded for review
 *      After every milestone: no user record lost.
 *   4. --goldens: records the Tier-2 emulator goldens on a fresh, schema-only local graph (M4 tip).
 *
 * Safety: Aura is only ever opened with a READ session. Every write and every child process is pinned
 * to bolt://127.0.0.1:7687 (assertLocalUri); milestone worktrees have no .env, so nothing can fall back
 * to production. The copy holds your data: it lives in the local Docker volume and is deleted at the end
 * (`docker compose down -v`) unless you pass --keep (with --goldens, what's kept is the schema-only goldens graph).
 * It stops at the first failed check; the report says which one and what it saw.
 *
 * Usage (runbook §0b): from a worktree of phase-a/m4-engine inside the repo,
 *   node scripts/rehearsal/rehearse-phase-a.mjs [--goldens] [--keep]
 * Writes .rehearsal/report.json and .rehearsal/rehearsal.log in the main repo (no credentials).
 */
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, symlinkSync, rmSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertLocalUri, chunks, dedupeAllowList, fingerprintDiff, groupBy, ident, parseEnv, unexpectedRoutingChanges } from './lib.mjs';

const RUNNER = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(RUNNER, 'functions', 'package.json'));
const argv = process.argv.slice(2);
const WANT_GOLDENS = argv.includes('--goldens');
const KEEP = argv.includes('--keep');

const MAIN = dirname(execFileSync('git', ['-C', RUNNER, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim());
const REH = join(MAIN, '.rehearsal');
const LOG = join(REH, 'rehearsal.log');
const COMPOSE = join(RUNNER, 'functions', 'test', 'neo4j', 'docker-compose.yml');
const LOCAL = { uri: 'bolt://127.0.0.1:7687', user: 'neo4j', password: 'goblin-test-pw' };
const LOCAL_ENV = { ...process.env, NEO4J_URI: LOCAL.uri, NEO4J_USER: LOCAL.user, NEO4J_PASSWORD: LOCAL.password };
const MILESTONES = [
  ['m1', 'phase-a/m1-foundations'],
  ['m2', 'phase-a/m2-platform'],
  ['m3', 'phase-a/m3-band-witness'],
  ['m4', 'phase-a/m4-engine'],
];
const LEGACY = ['User', 'CheckIn', 'BodySensation', 'ToolUsage', 'OppositeActionSession', 'InvalidationRecoverySession', 'DearManSession', 'FindTheFeelingSession'];
const ADOPTED = LEGACY.filter((l) => l !== 'User');

const neo4j = require('neo4j-driver');
const report = { startedAt: new Date().toISOString(), steps: [], versions: {}, result: 'running' };
mkdirSync(REH, { recursive: true });
writeFileSync(LOG, `Phase A rehearsal ${report.startedAt}\n`);
try { const ex = join(MAIN, '.git', 'info', 'exclude'); if (!readFileSync(ex, 'utf8').includes('.rehearsal/')) appendFileSync(ex, '\n.rehearsal/\n'); } catch { /* not critical */ }

const log = (s) => { process.stdout.write(s + '\n'); appendFileSync(LOG, s + '\n'); };
function step(name, ok, detail = '') {
  report.steps.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) throw new StopError(name, detail);
}
class StopError extends Error { constructor(name, detail) { super(`${name}${detail ? `: ${detail}` : ''}`); this.stop = true; } }

/** Run a child process pinned to the local Neo4j. Returns { status, out }. */
function run(cmd, args, { cwd = RUNNER, env = LOCAL_ENV, allow = [0] } = {}) {
  assertLocalUri(env.NEO4J_URI, `run ${cmd} ${args.join(' ')}`);
  log(`$ (${cwd.replace(MAIN, '.')}) ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  appendFileSync(LOG, out + '\n');
  return { status: r.status, out, allowed: allow.includes(r.status) };
}
const tail = (s, n = 12) => s.trim().split('\n').slice(-n).join(' | ');

function localDriver() { assertLocalUri(LOCAL.uri, 'open a write session'); return neo4j.driver(LOCAL.uri, neo4j.auth.basic(LOCAL.user, LOCAL.password)); }
const num = (v) => (neo4j.isInt(v) ? v.toNumber() : Number(v));
async function q(driver, cypher, params = {}) {
  const s = driver.session();
  try { return (await s.run(cypher, params)).records.map((r) => r.toObject()); } finally { await s.close(); }
}

async function waitForLocal(timeoutMs = 180000) {
  const t0 = Date.now();
  for (;;) {
    const d = localDriver();
    try { await d.verifyConnectivity(); await d.close(); return; } catch (e) {
      await d.close();
      if (Date.now() - t0 > timeoutMs) throw new Error(`local Neo4j did not come up in ${timeoutMs / 1000}s: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

function freshLocalNeo4j() {
  const info = spawnSync('docker', ['info'], { encoding: 'utf8' });
  step('Docker is running', info.status === 0, info.status === 0 ? '' : 'start Docker Desktop and run this again');
  spawnSync('docker', ['compose', '-f', COMPOSE, 'down', '-v'], { encoding: 'utf8' });
  const up = spawnSync('docker', ['compose', '-f', COMPOSE, 'up', '-d'], { encoding: 'utf8' });
  appendFileSync(LOG, `${up.stdout}${up.stderr}\n`);
  step('Local Neo4j container started', up.status === 0, up.status === 0 ? '' : tail(`${up.stdout}${up.stderr}`, 4));
}

async function fingerprint(d) {
  const labels = Object.fromEntries((await q(d, 'MATCH (n) UNWIND labels(n) AS l RETURN l, count(*) AS c')).map((r) => [r.l, num(r.c)]));
  const types = Object.fromEntries((await q(d, 'MATCH ()-[r]->() RETURN type(r) AS t, count(*) AS c')).map((r) => [r.t, num(r.c)]));
  const [np] = await q(d, 'MATCH (n) RETURN coalesce(sum(size(keys(n))), 0) AS c');
  const [rp] = await q(d, 'MATCH ()-[r]->() RETURN coalesce(sum(size(keys(r))), 0) AS c');
  return { labels, types, nodeProps: num(np.c), relProps: num(rp.c) };
}

async function userDataCounts(d) {
  const out = {};
  for (const l of LEGACY) out[l] = num((await q(d, `MATCH (n:${ident(l)}) RETURN count(n) AS c`))[0].c);
  return out;
}
function sameOrMore(before, after) { return Object.entries(before).filter(([k, v]) => (after[k] ?? 0) < v).map(([k, v]) => `${k} ${v} → ${after[k] ?? 0}`); }

/** Copy production into the local Neo4j. Aura: READ session only. */
async function copyProduction() {
  const env = parseEnv(existsSync(join(MAIN, '.env')) ? readFileSync(join(MAIN, '.env'), 'utf8') : '');
  step('Production credentials found in the repo .env', Boolean(env.NEO4J_URI && env.NEO4J_PASSWORD));
  const aura = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER || 'neo4j', env.NEO4J_PASSWORD));
  const local = localDriver();
  const read = aura.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const comp = async (drv, mode) => { const s = drv.session({ defaultAccessMode: mode }); try { return (await s.run('CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition')).records.map((r) => r.toObject()); } finally { await s.close(); } };
    report.versions.aura = await comp(aura, neo4j.session.READ);
    report.versions.local = await comp(local, neo4j.session.WRITE);
    log(`Aura: ${JSON.stringify(report.versions.aura)}  Local: ${JSON.stringify(report.versions.local)}`);

    const nodes = (await read.run('MATCH (n) RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props')).records.map((r) => r.toObject());
    const rels = (await read.run('MATCH (a)-[r]->(b) RETURN elementId(a) AS s, elementId(b) AS e, type(r) AS type, properties(r) AS props')).records.map((r) => r.toObject());
    const schema = [
      ...(await read.run('SHOW CONSTRAINTS YIELD createStatement RETURN createStatement AS s')).records.map((r) => r.get('s')),
      ...(await read.run("SHOW INDEXES YIELD createStatement, type, owningConstraint WHERE type <> 'LOOKUP' AND owningConstraint IS NULL RETURN createStatement AS s")).records.map((r) => r.get('s')),
    ];
    log(`Read ${nodes.length} nodes, ${rels.length} relationships, ${schema.length} constraints/indexes from production (read-only)`);

    // Empty the local database, including its schema.
    await q(local, 'MATCH (n) CALL { WITH n DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS');
    for (const r of await q(local, 'SHOW CONSTRAINTS YIELD name RETURN name')) await q(local, `DROP CONSTRAINT ${ident(r.name)} IF EXISTS`);
    for (const r of await q(local, "SHOW INDEXES YIELD name, type, owningConstraint WHERE type <> 'LOOKUP' AND owningConstraint IS NULL RETURN name")) await q(local, `DROP INDEX ${ident(r.name)} IF EXISTS`);

    await q(local, 'CREATE INDEX rehearsal_copy_src IF NOT EXISTS FOR (n:`__Copy`) ON (n.`__src`)');
    await q(local, 'CALL db.awaitIndexes(300)');
    for (const [key, group] of groupBy(nodes, (n) => [...n.labels].sort().join('\u0000'))) {
      const labels = key ? key.split('\u0000').map(ident).join(':') : '';
      for (const c of chunks(group, 500)) {
        await q(local, `UNWIND $rows AS r CREATE (n:\`__Copy\`${labels ? ':' + labels : ''}) SET n = r.props SET n.\`__src\` = r.id`, { rows: c.map((n) => ({ id: n.id, props: n.props })) });
      }
    }
    for (const [type, group] of groupBy(rels, (r) => r.type)) {
      for (const c of chunks(group, 500)) {
        await q(local, `UNWIND $rows AS r MATCH (a:\`__Copy\` {\`__src\`: r.s}) MATCH (b:\`__Copy\` {\`__src\`: r.e}) CREATE (a)-[x:${ident(type)}]->(b) SET x = r.props`,
          { rows: c.map((r) => ({ s: r.s, e: r.e, props: r.props })) });
      }
    }
    await q(local, 'MATCH (n:`__Copy`) CALL { WITH n REMOVE n.`__src` REMOVE n:`__Copy` } IN TRANSACTIONS OF 1000 ROWS');
    await q(local, 'DROP INDEX rehearsal_copy_src IF EXISTS');
    const schemaFailures = [];
    for (const s of schema) { try { await q(local, s); } catch (e) { schemaFailures.push(`${s.slice(0, 80)}… ${e.message.split('\n')[0]}`); } }
    if (schemaFailures.length) log(`Note: ${schemaFailures.length} production constraint/index statement(s) could not be recreated locally (edition differences): ${schemaFailures.join(' ; ')}`);
    report.copySchemaNotRecreated = schemaFailures;

    // The copy must match production exactly.
    const prodFp = { labels: {}, types: {} };
    for (const n of nodes) for (const l of n.labels) prodFp.labels[l] = (prodFp.labels[l] || 0) + 1;
    for (const r of rels) prodFp.types[r.type] = (prodFp.types[r.type] || 0) + 1;
    const localFp = await fingerprint(local);
    const diff = fingerprintDiff({ ...prodFp, nodeProps: 0, relProps: 0 }, { ...localFp, nodeProps: 0, relProps: 0 });
    step('Local copy matches production (every label and relationship type)', diff.length === 0, diff.slice(0, 5).join('; '));
    report.production = { nodes: nodes.length, relationships: rels.length };
  } finally {
    await read.close(); await aura.close(); await local.close();
  }
}

function worktree(tag, branch) {
  const dir = join(REH, tag);
  if (existsSync(dir)) { spawnSync('git', ['-C', MAIN, 'worktree', 'remove', '--force', dir]); rmSync(dir, { recursive: true, force: true }); }
  const ref = `origin/${branch}`;
  const has = spawnSync('git', ['-C', MAIN, 'rev-parse', '--verify', '--quiet', ref]);
  step(`${tag}: ${ref} exists`, has.status === 0, has.status === 0 ? '' : 'already merged and deleted? rehearse before merging, or ask Claude to pin the commit');
  const add = spawnSync('git', ['-C', MAIN, 'worktree', 'add', '--force', '--detach', dir, ref], { encoding: 'utf8' });
  step(`${tag}: worktree at ${ref}`, add.status === 0, add.status === 0 ? '' : tail(add.stderr, 3));
  for (const nm of ['node_modules', join('functions', 'node_modules')]) {
    if (!existsSync(join(dir, nm)) && existsSync(join(RUNNER, nm))) symlinkSync(join(RUNNER, nm), join(dir, nm), 'dir');
  }
  if (existsSync(join(dir, '.env'))) throw new Error(`${dir} has a .env: refusing (children must never see production credentials)`);
  return dir;
}

async function rehearseM1(d, dir) {
  const [dupNodes] = await q(d, 'MATCH (n) WHERE n.id IS NOT NULL WITH labels(n) AS l, n.id AS id, count(*) AS c WHERE c > 1 RETURN count(*) AS groups');
  step('M1 dedupe precondition: no duplicate nodes', num(dupNodes.groups) === 0, `${num(dupNodes.groups)} duplicate node groups`);
  const allow = dedupeAllowList(readFileSync(join(dir, 'schema', 'maintenance', 'dedupe-apply-rels.cypher'), 'utf8'));
  const extras = async () => num((await q(d, `MATCH (a)-[r]->(b) WHERE type(r) IN $allow WITH a, b, type(r) AS t, CASE type(r) WHEN 'FELT_AS' THEN r.region END AS k, count(*) AS c WHERE c > 1 RETURN coalesce(sum(c - 1), 0) AS x`, { allow }))[0].x);
  const before = await extras();
  const dry = run('node', ['scripts/load-graph.mjs', '--file', 'schema/maintenance/dedupe-dry-run.cypher'], { cwd: dir });
  step('M1 dedupe dry run runs', dry.allowed, dry.allowed ? `${before} extra schema relationships` : tail(dry.out));
  const typesBefore = (await fingerprint(d)).types;
  const apply = run('node', ['scripts/load-graph.mjs', '--file', 'schema/maintenance/dedupe-apply-rels.cypher'], { cwd: dir });
  step('M1 dedupe apply runs', apply.allowed, tail(apply.out, 3));
  const after = await extras();
  step('M1 dedupe removed every extra schema relationship', after === 0, `${before} → ${after}`);
  const typesAfter = (await fingerprint(d)).types;
  const touched = Object.keys({ ...typesBefore, ...typesAfter }).filter((t) => (typesBefore[t] ?? 0) !== (typesAfter[t] ?? 0) && !allow.includes(t));
  step('M1 dedupe touched only allow-listed relationship types', touched.length === 0, touched.join(', '));
  const fpBeforeSecond = await fingerprint(d);
  const again = run('node', ['scripts/load-graph.mjs', '--file', 'schema/maintenance/dedupe-apply-rels.cypher'], { cwd: dir });
  const secondDiff = fingerprintDiff(fpBeforeSecond, await fingerprint(d));
  step('M1 dedupe is idempotent (second apply deletes nothing)', again.allowed && secondDiff.length === 0,
    again.allowed ? secondDiff.slice(0, 5).join('; ') : `exit ${again.status}: ${tail(again.out)}`);
  await fullLoadTwice(d, dir, 'M1');
  await routingCompare(dir, 'M1', 'tests/fixtures/live-routing-2026-09-30.json', { allowPositiveStateStub: true });
}

async function fullLoadTwice(d, dir, tag) {
  const a = run('node', ['scripts/load-graph.mjs', '--verify'], { cwd: dir });
  step(`${tag} full load --verify`, a.allowed, a.allowed ? '' : `exit ${a.status}: ${tail(a.out)}`);
  const fp1 = await fingerprint(d);
  const b = run('node', ['scripts/load-graph.mjs', '--verify'], { cwd: dir });
  step(`${tag} full load --verify (second run)`, b.allowed, b.allowed ? '' : `exit ${b.status}: ${tail(b.out)}`);
  const diff = fingerprintDiff(fp1, await fingerprint(d));
  step(`${tag} loading twice gives an identical graph`, diff.length === 0, diff.slice(0, 5).join('; '));
}

/** verify-live-routing.mjs against the local copy (the child only ever sees LOCAL_ENV). Exit 3 = routing differs. */
/** The same diff verify-live-routing.mjs prints, recomputed from the report it just wrote (that milestone's code). */
async function routingDiff(dir, baseline) {
  // Each milestone's own library: M1–M3's diffRouting(baseline, current) predates parseGrid (E4-6).
  const lib = await import(pathToFileURL(join(dir, 'scripts', 'lib', 'liveRoutingReport.mjs')).href);
  const current = JSON.parse(readFileSync(join(dir, 'scripts', '.verify-live-routing-report.json'), 'utf8'));
  const base = JSON.parse(readFileSync(join(dir, baseline), 'utf8'));
  const opts = typeof lib.parseGrid === 'function'
    ? { grid: lib.parseGrid(readFileSync(join(dir, 'src', 'data', 'emotions.ts'), 'utf8')) }
    : undefined;
  const { changes, warnings = [] } = lib.diffRouting(base, current, opts);
  return { changes, warnings };
}

async function routingCompare(dir, tag, baseline, { allowNumbMove = false, allowPositiveStateStub = false, info = false } = {}) {
  const r = run('node', ['scripts/verify-live-routing.mjs', '--compare', baseline], { cwd: dir, allow: [0, 3] });
  if (!r.allowed) return step(`${tag} routing check runs`, false, `exit ${r.status}: ${tail(r.out)}`);
  const { changes, warnings } = await routingDiff(dir, baseline);
  report.routing = { ...(report.routing || {}), [`${tag} vs ${baseline}`]: { changes, warnings } };
  if (info) {
    log(`${tag} (information only) vs ${baseline}: ${changes.length ? changes.map((c) => c.what).join(', ') : 'identical'}`);
    return undefined;
  }
  if (r.status === 0) return step(`${tag} routing identical to ${baseline}`, true, warnings.length ? `${warnings.length} tie-order warning(s), see report` : '');
  const allowed = [allowNumbMove && "numb's intended move", allowPositiveStateStub && 'the positive_state stub (removed after M2)'].filter(Boolean);
  const bad = unexpectedRoutingChanges(changes, { numbMove: allowNumbMove, positiveStateStub: allowPositiveStateStub });
  return step(`${tag} routing identical to ${baseline}${allowed.length ? ` except ${allowed.join(' and ')}` : ''}`, bad.length === 0,
    bad.length ? JSON.stringify(bad).slice(0, 600) : `${changes.length} expected change(s): ${changes.map((c) => c.what).join(', ')}`);
}

async function rehearseM2(d, dir) {
  const c = run('node', ['scripts/load-graph.mjs', '--only', 'constraints'], { cwd: dir });
  step('M2 constraints', c.allowed, c.allowed ? '' : tail(c.out));
  const b1 = run('node', ['scripts/load-graph.mjs', '--file', 'schema/migrations/2026-10-user-data-backfill.cypher'], { cwd: dir });
  step('M2 backfill', b1.allowed, b1.allowed ? '' : tail(b1.out));
  const fp1 = await fingerprint(d);
  const b2 = run('node', ['scripts/load-graph.mjs', '--file', 'schema/migrations/2026-10-user-data-backfill.cypher'], { cwd: dir });
  const diff = fingerprintDiff(fp1, await fingerprint(d));
  step('M2 backfill second run changes nothing', b2.allowed && diff.length === 0, diff.slice(0, 5).join('; '));
  const load = run('node', ['scripts/load-graph.mjs', '--verify'], { cwd: dir });
  step('M2 full load --verify', load.allowed, load.allowed ? '' : `exit ${load.status}: ${tail(load.out)}`);
  const g = run('node', ['scripts/load-graph.mjs', '--file', 'schema/migrations/2026-10-remove-goal-fields.cypher'], { cwd: dir });
  step('M2 remove goal fields', g.allowed, g.allowed ? '' : tail(g.out));
  const stubFile = 'schema/migrations/2026-10-remove-positive-state-stub.cypher';
  const st1 = run('node', ['scripts/load-graph.mjs', '--file', stubFile], { cwd: dir });
  step('M2 remove the positive_state stub', st1.allowed, st1.allowed ? tail(st1.out, 4) : tail(st1.out));
  const [stub] = await q(d, "MATCH (p:ActivationPattern {id: 'positive_state'}) RETURN count(p) AS c");
  step('M2 no positive_state pattern left', num(stub.c) === 0, `${num(stub.c)} left`);
  const fpStub = await fingerprint(d);
  const st2 = run('node', ['scripts/load-graph.mjs', '--file', stubFile], { cwd: dir });
  const stubDiff = fingerprintDiff(fpStub, await fingerprint(d));
  step('M2 stub cleanup second run changes nothing', st2.allowed && stubDiff.length === 0, stubDiff.slice(0, 5).join('; '));
  const b3 = run('node', ['scripts/load-graph.mjs', '--file', 'schema/migrations/2026-10-user-data-backfill.cypher'], { cwd: dir });
  step('M2 backfill after deploy', b3.allowed, b3.allowed ? '' : tail(b3.out));
  const [un] = await q(d, 'MATCH (n) WHERE any(l IN labels(n) WHERE l IN $adopted) AND (n.ownerId IS NULL OR n.key IS NULL OR NOT n:UserData) RETURN count(n) AS c', { adopted: ADOPTED });
  step('M2 every legacy user record adopted (UserData, ownerId, key)', num(un.c) === 0, `${num(un.c)} not adopted`);
  const [dupKeys] = await q(d, 'MATCH (n:UserData) WITH labels(n) AS l, n.key AS k, count(*) AS c WHERE c > 1 RETURN count(*) AS g');
  step('M2 no duplicate user-data keys', num(dupKeys.g) === 0);
}

async function main() {
  log(`Main repo: ${MAIN}\nRunner:    ${RUNNER}`);
  step('Runner dependencies installed (npm ci in the runner and in its functions/)',
    existsSync(join(RUNNER, 'node_modules')) && existsSync(join(RUNNER, 'functions', 'node_modules', 'neo4j-driver')));
  const fetched = spawnSync('git', ['-C', MAIN, 'fetch', '--quiet', 'origin'], { encoding: 'utf8' });
  step('git fetch origin', fetched.status === 0, tail(fetched.stderr || '', 2));
  freshLocalNeo4j();
  await waitForLocal();
  step('Local Neo4j accepts connections', true, LOCAL.uri);
  await copyProduction();

  const d = localDriver();
  try {
    const start = await userDataCounts(d);
    report.userDataAtStart = start;
    log(`User data in the copy: ${JSON.stringify(start)}`);
    const check = async (tag) => {
      const lost = sameOrMore(start, await userDataCounts(d));
      step(`${tag}: no user record lost`, lost.length === 0, lost.join(', '));
    };
    report.rehearsedCommits = {};
    for (const [tag, branch] of MILESTONES) {
      const dir = worktree(tag, branch);
      report.rehearsedCommits[tag] = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      log(`\n— ${tag.toUpperCase()} at ${branch} ${report.rehearsedCommits[tag].slice(0, 7)} —`);
      if (tag === 'm1') await rehearseM1(d, dir);
      if (tag === 'm2') await rehearseM2(d, dir);
      if (tag === 'm3') {
        const r = run('node', ['scripts/load-graph.mjs', '--verify'], { cwd: dir });
        step('M3 full load --verify (voice lint included)', r.allowed, r.allowed ? '' : `exit ${r.status}${r.status === 5 ? ' (voice lint)' : ''}: ${tail(r.out)}`);
      }
      if (tag === 'm4') {
        await fullLoadTwice(d, dir, 'M4');
        await routingCompare(dir, 'M4', 'tests/fixtures/live-routing-2026-09-30.json', { allowNumbMove: true });
        // What the schema files alone say. Differences here are production-only leftovers that a MERGE-only
        // load never removes; recorded for review, not a failure (the live comparison above is the gate).
        await routingCompare(dir, 'M4', 'tests/fixtures/recommendation-graph.json', { info: true });
        const [pol] = await q(d, "MATCH (p:RoutingPolicy {id: 'checkin_result'}) RETURN p.enabled AS e");
        step('M4 routing policy loads switched off', pol && pol.e === false, pol ? `enabled = ${pol.e}` : 'no RoutingPolicy node');
      }
      await check(tag.toUpperCase());
    }
    report.userDataAtEnd = await userDataCounts(d);
  } finally { await d.close(); }

  if (WANT_GOLDENS) {
    // Recorded in the runner itself (a worktree of phase-a/m4-engine with its own node_modules), so the
    // emulator never resolves packages through a symlink.
    log('\n— Tier-2 goldens on a fresh, schema-only local graph (runner = M4) —');
    freshLocalNeo4j();
    await waitForLocal();
    const dir = RUNNER;
    if (existsSync(join(dir, '.env')) || existsSync(join(dir, 'functions', '.env'))) throw new Error('the runner has a .env: refusing (the emulator must never see production credentials)');
    const load = run('node', ['scripts/load-graph.mjs', '--verify'], { cwd: dir });
    step('Goldens: schema loaded into a fresh local graph', load.allowed, tail(load.out, 3));
    const secret = join(dir, 'functions', '.secret.local');
    if (!existsSync(secret)) copyFileSync(join(dir, 'functions', '.secret.local.example'), secret);
    assertLocalUri(parseEnv(readFileSync(secret, 'utf8')).NEO4J_URI, 'point the Functions emulator (functions/.secret.local)');
    const fb = spawnSync('firebase', ['--version'], { encoding: 'utf8' });
    step('Goldens: firebase CLI available', fb.status === 0, fb.status === 0 ? fb.stdout.trim() : 'npm i -g firebase-tools@latest');
    const rec = run('npm', ['run', 'test:emulator'], { cwd: dir, env: { ...LOCAL_ENV, UPDATE_GOLDEN: '1' } });
    step('Goldens: recorded', rec.allowed, rec.allowed ? '' : tail(rec.out, 15));
    const wipe = localDriver();
    try { await q(wipe, 'MATCH (n) WHERE n:UserData OR n:User DETACH DELETE n'); } finally { await wipe.close(); }
    const cmp = run('npm', ['run', 'test:emulator'], { cwd: dir });
    step('Goldens: stable on a second run', cmp.allowed, cmp.allowed ? '' : tail(cmp.out, 15));
    report.goldensDir = join(dir, 'functions', 'test', 'emulator', '__golden__').replace(MAIN, '.');
  }
  report.result = 'pass';
}

main().catch((e) => {
  report.result = 'fail';
  report.error = e.message;
  log(`\nSTOPPED: ${e.message}`);
  if (!e.stop) log(e.stack || '');
}).finally(() => {
  if (!KEEP) spawnSync('docker', ['compose', '-f', COMPOSE, 'down', '-v'], { encoding: 'utf8' });
  report.finishedAt = new Date().toISOString();
  report.localCopyDeleted = !KEEP;
  writeFileSync(join(REH, 'report.json'), JSON.stringify(report, null, 2));
  log(`\n${report.result === 'pass' ? 'ALL PASSED' : 'FAILED'} — ${report.steps.filter((s) => s.ok).length} steps passed. Report: .rehearsal/report.json`);
  process.exitCode = report.result === 'pass' ? 0 : 1;
});
