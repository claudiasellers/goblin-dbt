#!/usr/bin/env node
/**
 * READ-ONLY trails dry run (docs/design/parts.md, "Discovery: trails"): what each TrailRule WOULD find,
 * with every rule treated as enabled, so the thresholds can be tuned on real data before any is
 * switched on. Never writes, never offers: it opens a READ session (like verify-live-routing.mjs), and
 * the engine it runs is the functions' own (functions/src/parts/trails), loaded from the BUILD:
 *
 *   npm --prefix functions run build      # first, every time the trails code changes
 *
 * What it reads (one person at a time, their own records only, through the functions' query layer,
 * parts/trails/queries.ts): ToolSessions (urge ids, Problem Solve's barrier id, their detail session),
 * Find the feeling / Recover / DEAR MAN sessions (ids and the set-off / event / pull values only),
 * check-ins (follow-up answer ids), PartTags, User.timeZone, the profile `parts` slice (ids, status,
 * moves, last visit, Louder pause), and the trail content (TrailRule, TrailContext, ProtectiveMove,
 * PolarityPair, PartsPolicy). Never any free text: sources print as their graph label, a part by id.
 * Credentials come from .env (NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD), never printed.
 *
 *   node scripts/parts/trails-dry-run.mjs --uid <uid>          one person: episodes, candidates, statements, evidence
 *   node scripts/parts/trails-dry-run.mjs --all                aggregates only (no uid is printed)
 *   ... --drafts                                               count draft EXPRESSES edges too (says so first)
 *   ... --set trail_move_in_context.minEpisodes=3              try a threshold (repeatable)
 *   node scripts/parts/trails-dry-run.mjs --records <file.json> [--content tests/fixtures/parts-content.json] [--now <iso>]
 *                                                              offline, on a TrailRecord[] (or { records, timeZone, parts })
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USAGE, parseArgs, applySets, contentFromFixture, recordsFile, personReport, allReport } from '../lib/trailsDryRun.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(root, 'functions/package.json'));

let opts;
try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`${e.message}\n${USAGE}`); process.exit(2); }

const libPath = resolve(root, 'functions/lib/parts/trails/index.js');
if (!existsSync(libPath)) { console.error(`No build at ${libPath}: run npm --prefix functions run build first.`); process.exit(2); }
const engine = require(libPath);
const now = opts.now ? Date.parse(opts.now) : Date.now();
const print = (lines) => console.log(lines.join('\n'));

if (opts.records) {
  const content = contentFromFixture(JSON.parse(readFileSync(resolve(process.cwd(), opts.content ?? resolve(root, 'tests/fixtures/parts-content.json')), 'utf8')));
  try { applySets(content.rules, opts.sets); } catch (e) { console.error(e.message); process.exit(2); }
  const file = recordsFile(JSON.parse(readFileSync(resolve(process.cwd(), opts.records), 'utf8')));
  const state = { ...content, partsOn: file.parts.length > 0, timeZone: file.timeZone, records: file.records, parts: file.parts };
  print(personReport({ engine, state, now, opts, who: `records file ${opts.records}` }).lines);
  process.exit(0);
}

for (const line of (existsSync(resolve(root, '.env')) ? readFileSync(resolve(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { NEO4J_URI: uri, NEO4J_USER: user = 'neo4j', NEO4J_PASSWORD: pw } = process.env;
if (!uri || !pw) { console.error('Missing NEO4J_URI / NEO4J_PASSWORD in .env'); process.exit(1); }
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(uri, neo4j.auth.basic(user, pw));
const session = driver.session({ defaultAccessMode: neo4j.session.READ });
const read = (fn) => session.executeRead(fn);

try {
  await driver.verifyConnectivity();
  const content = await read((tx) => engine.readTrailContent(tx));
  applySets(content.rules, opts.sets);
  if (opts.uid) {
    const state = await read((tx) => engine.readTrailState(tx, opts.uid, { drafts: opts.drafts, now }));
    // Source display: the graph node's own label property (content, never user text).
    const wanted = new Map();
    for (const r of state.records) for (const s of r.sources) (wanted.get(s.label) ?? wanted.set(s.label, new Set()).get(s.label)).add(s.id);
    const text = new Map();
    for (const [label, ids] of wanted) {
      if (!engine.SOURCE_LABELS.includes(label)) continue;
      const rows = await read((tx) => tx.run(`MATCH (n:${label}) WHERE n.id IN $ids RETURN n.id AS id, n.label AS label`, { ids: [...ids] }));
      for (const r of rows.records) text.set(`${label}:${r.get('id')}`, r.get('label'));
    }
    const sourceText = (l, id) => (text.get(`${l}:${id}`) ? `${l}: ${text.get(`${l}:${id}`)}` : `${l}:${id}`);
    print(personReport({ engine, state, now, opts, who: opts.uid, sourceText }).lines);
  } else {
    const ids = (await read((tx) => tx.run(`MATCH (u:User) WHERE u.id IS NOT NULL RETURN u.id AS id ORDER BY id`))).records.map((r) => r.get('id'));
    const people = [];
    for (const id of ids) people.push({ state: await read((tx) => engine.readTrailState(tx, id, { drafts: opts.drafts, now })) });
    print(allReport({ engine, people, now, opts, rules: content.rules }).lines);
  }
} catch (e) {
  console.error(`Dry run failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await session.close();
  await driver.close();
}
