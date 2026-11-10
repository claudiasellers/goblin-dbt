#!/usr/bin/env node
/**
 * The Slack crew's own copy of the knowledge graph (docs/design/user-profile.md §3.3, §8 #2). The crew
 * (`@graph`, `@lit`, `@goblin`, `@pulse`; /mnt/project-files/knowledge/claude/specs) never gets a
 * credential to the production database, which holds people's data. It reads a separate Neo4j database
 * (an Aura Free instance is enough) loaded from a content-only export:
 *
 *   node scripts/graph-export.mjs --content-only --out backups/content.json      # prod, read-only
 *   CREW_NEO4J_URI=neo4j+s://<crew>.databases.neo4j.io CREW_NEO4J_USER=neo4j CREW_NEO4J_PASSWORD=… \
 *     node scripts/crew/load-content-copy.mjs backups/content.json --replace
 *
 * Refuses: an export that isn't `--content-only` or holds any user-data node; a target whose URI is the
 * production NEO4J_URI (env or the repo-root .env); and, before wiping, a target that holds any `User` or
 * `:UserData` node (that would be production, or a copy of it). `--replace` is required because the
 * target is emptied first: it is a copy, rebuilt whole each time. `--dry-run` checks everything and writes nothing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { USER_LABELS } from '../content-snapshot/build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(root, 'functions/package.json'));

/** The same user-data labels the content snapshot refuses (scripts/content-snapshot/build.mjs). */
export { USER_LABELS };
const BATCH = 500;

/** Throws unless `exp` is a content-only export with no user data and no dangling relationships. */
export function assertCrewExport(exp) {
  if (exp?.scope !== 'content-only') throw new Error(`Expected a --content-only export, got scope "${exp?.scope}"`);
  const personal = exp.nodes.filter((n) => n.labels.some((l) => USER_LABELS.includes(l)));
  if (personal.length) throw new Error(`Export contains ${personal.length} user-data node(s); refusing to load it for the crew`);
  const ids = new Set(exp.nodes.map((n) => n.elementId));
  const dangling = exp.relationships.filter((r) => !ids.has(r.start) || !ids.has(r.end));
  if (dangling.length) throw new Error(`Export has ${dangling.length} relationship(s) to nodes it doesn't contain`);
}

/** A URI's host, lower-cased, so `neo4j+s://x` and `neo4j://x/` compare equal. */
export function hostOf(uri) {
  try { return new URL(uri.replace(/^neo4j(\+s|\+ssc)?:|^bolt(\+s|\+ssc)?:/, 'http:')).host.toLowerCase(); } catch { return String(uri).toLowerCase(); }
}

/** Throws when the crew target is (or looks like) production. */
export function assertNotProduction(target, prodUri) {
  if (!target) throw new Error('Set CREW_NEO4J_URI to the crew database');
  if (prodUri && hostOf(target) === hostOf(prodUri)) throw new Error('CREW_NEO4J_URI is the production database; refusing');
}

const labelList = (labels) => labels.map((l) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(l)) throw new Error(`Unexpected label ${JSON.stringify(l)}`);
  return `:${l}`;
}).join('');

/** Node rows grouped by their label set (labels can't be parameters in Cypher). */
export function nodeBatches(nodes) {
  const groups = new Map();
  for (const n of nodes) {
    const k = labelList([...n.labels].sort());
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ eid: n.elementId, props: n.props });
  }
  return [...groups].map(([labels, rows]) => ({ labels, rows }));
}

export function relBatches(rels) {
  const groups = new Map();
  for (const r of rels) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(r.type)) throw new Error(`Unexpected relationship type ${JSON.stringify(r.type)}`);
    if (!groups.has(r.type)) groups.set(r.type, []);
    groups.get(r.type).push({ s: r.start, e: r.end, props: r.props });
  }
  return [...groups].map(([type, rows]) => ({ type, rows }));
}

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  if (!file) throw new Error('Usage: node scripts/crew/load-content-copy.mjs <content-only export.json> --replace [--dry-run]');
  if (!args.includes('--replace') && !dryRun) throw new Error('Pass --replace: the crew database is emptied and rebuilt from the export');
  loadEnv();
  const exp = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
  assertCrewExport(exp);
  const target = process.env.CREW_NEO4J_URI;
  assertNotProduction(target, process.env.NEO4J_URI);
  const neo4j = require('neo4j-driver');
  const driver = neo4j.driver(target, neo4j.auth.basic(process.env.CREW_NEO4J_USER || 'neo4j', process.env.CREW_NEO4J_PASSWORD || ''));
  const session = driver.session();
  try {
    const people = (await session.run('MATCH (n) WHERE n:User OR n:UserData RETURN count(n) AS c')).records[0].get('c').toNumber();
    if (people > 0) throw new Error(`The target holds ${people} user node(s): that is production or a copy of it. Refusing.`);
    const nodes = nodeBatches(exp.nodes);
    const rels = relBatches(exp.relationships);
    console.log(`${exp.nodes.length} nodes in ${nodes.length} label sets, ${exp.relationships.length} relationships`);
    if (dryRun) { console.log('Dry run: nothing written.'); return; }
    await session.run('MATCH (n) CALL { WITH n DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS');
    for (const { labels, rows } of nodes) {
      for (let i = 0; i < rows.length; i += BATCH) {
        await session.run(`UNWIND $rows AS r CREATE (n${labels}) SET n = r.props, n._eid = r.eid`, { rows: rows.slice(i, i + BATCH) });
      }
    }
    await session.run('CREATE INDEX crew_eid IF NOT EXISTS FOR (n:_Crew) ON (n._eid)');
    await session.run('MATCH (n) WHERE n._eid IS NOT NULL SET n:_Crew');
    for (const { type, rows } of rels) {
      for (let i = 0; i < rows.length; i += BATCH) {
        await session.run(`UNWIND $rows AS r MATCH (a:_Crew {_eid: r.s}), (b:_Crew {_eid: r.e}) CREATE (a)-[x:${type}]->(b) SET x = r.props`,
          { rows: rows.slice(i, i + BATCH) });
      }
    }
    await session.run('MATCH (n:_Crew) REMOVE n:_Crew, n._eid');
    console.log(`Loaded. Exported at ${exp.exportedAt}.`);
  } finally {
    await session.close();
    await driver.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
