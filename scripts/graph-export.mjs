#!/usr/bin/env node
/**
 * READ-ONLY backup of the whole graph to a local JSON file (plan D-05 / runbook R-7), for when
 * the Aura tier has no on-demand snapshot. Run it before A1-5's dedupe.
 *
 *   node scripts/graph-export.mjs                 # → backups/graph-<YYYY-MM-DD>.json
 *   node scripts/graph-export.mjs --out file.json
 *   node scripts/graph-export.mjs --no-profile    # everything except the profile layer
 *   node scripts/graph-export.mjs --content-only  # the knowledge graph only: no User, no user data
 *   add --pretty for indented JSON
 *
 * Scopes (`EXPORT_SCOPES`): `all` (the default, a restorable backup); `no-profile` leaves out
 * `:ProfileItem` nodes (ProfileFact, MyPattern, OwnLine), the profile edges to graph content
 * (`SAVED_LINE`, `PROFILE_EDGES` in functions/src/userdata/layers.ts) and every relationship that
 * touches a ProfileItem; `content-only` leaves out `:User` and `:UserData` nodes and every
 * relationship that touches one, so nothing in the file belongs to a person. The output file name
 * carries the scope (graph-<scope>-<date>.json) unless --out is given.
 *
 * The file contains user data (Claudia's own, pre-launch): backups/ is gitignored; keep it local
 * and delete it after M1. Credentials come from env vars or the repo-root .env (as load-graph.mjs).
 * Shape: { exportedAt, nodes: [{ elementId, labels, props }], relationships: [{ elementId, type,
 * start, end, props }] } with Neo4j integers as numbers (strings if unsafe) and temporals as ISO strings.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'functions/package.json'));

/** Mirrors PROFILE_EDGES in functions/src/userdata/layers.ts (tests/graph-dedupe.test.mjs pins it). */
export const PROFILE_EDGES = ['SAVED_LINE'];

/**
 * What each scope leaves out, as Cypher predicates on a node `n` and on a relationship `r` from `a`
 * to `b`. Relationships are filtered by their endpoints too, so every exported relationship's
 * endpoints are exported nodes.
 */
export const EXPORT_SCOPES = {
  all: { node: 'true', rel: 'true' },
  'no-profile': {
    node: 'NOT n:ProfileItem',
    rel: 'NOT a:ProfileItem AND NOT b:ProfileItem AND NOT type(r) IN $profileEdges',
  },
  'content-only': {
    node: 'NOT (n:User OR n:UserData)',
    rel: 'NOT (a:User OR a:UserData OR b:User OR b:UserData)',
  },
};

/** The scope named by the CLI flags (--no-profile, --content-only; at most one). */
export function scopeFromArgs(args) {
  const named = [['--no-profile', 'no-profile'], ['--content-only', 'content-only']].filter(([f]) => args.includes(f));
  if (named.length > 1) throw new Error('Pick one of --no-profile or --content-only');
  return named.length ? named[0][1] : 'all';
}

/** Neo4j driver values → plain JSON. */
export function toJson(v, neo4j) {
  if (v === null || v === undefined) return null;
  if (neo4j.isInt(v)) return neo4j.integer.inSafeRange(v) ? v.toNumber() : v.toString();
  if (Array.isArray(v)) return v.map((x) => toJson(x, neo4j));
  if (typeof v === 'object') {
    const temporal = ['isDate', 'isDateTime', 'isLocalDateTime', 'isLocalTime', 'isTime', 'isDuration']
      .some((k) => typeof neo4j[k] === 'function' && neo4j[k](v));
    if (temporal) return v.toString();
    if (typeof neo4j.isPoint === 'function' && neo4j.isPoint(v)) return { srid: toJson(v.srid, neo4j), x: v.x, y: v.y, z: v.z };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJson(x, neo4j)]));
  }
  return v;
}

/** Relationship endpoints that aren't among the exported nodes (a restorable backup has none). */
export function missingEndpoints(nodes, relationships) {
  const have = new Set(nodes.map((n) => n.elementId));
  const out = new Set();
  for (const r of relationships) for (const id of [r.start, r.end]) if (!have.has(id)) out.add(id);
  return [...out];
}

async function main() {
  const args = process.argv.slice(2);
  const scope = scopeFromArgs(args);
  const { node: nodeWhere, rel: relWhere } = EXPORT_SCOPES[scope];
  const params = { profileEdges: PROFILE_EDGES };
  const day = new Date().toISOString().slice(0, 10);
  const out = args.includes('--out') ? resolve(process.cwd(), args[args.indexOf('--out') + 1])
    : resolve(root, 'backups', scope === 'all' ? `graph-${day}.json` : `graph-${scope}-${day}.json`);
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const { NEO4J_URI: uri, NEO4J_USER: user = 'neo4j', NEO4J_PASSWORD: pw } = process.env;
  if (!uri || !pw) { console.error('Missing NEO4J_URI / NEO4J_PASSWORD (env or .env)'); process.exit(1); }

  const neo4j = require('neo4j-driver');
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pw));
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const NODE_COLS = 'elementId(n) AS elementId, labels(n) AS labels, properties(n) AS props';
    const nodes = await session.executeRead((tx) => tx.run(
      `MATCH (n) WHERE ${nodeWhere} RETURN ${NODE_COLS} ORDER BY elementId`, params));
    const rels = await session.executeRead((tx) => tx.run(
      `MATCH (a)-[r]->(b) WHERE ${relWhere} RETURN elementId(r) AS elementId, type(r) AS type, elementId(a) AS start, elementId(b) AS end, properties(r) AS props ORDER BY elementId`,
      params));
    const data = {
      exportedAt: new Date().toISOString(),
      scope,
      nodes: nodes.records.map((r) => toJson(r.toObject(), neo4j)),
      relationships: rels.records.map((r) => toJson(r.toObject(), neo4j)),
    };
    // The two reads aren't one snapshot: a node written between them (a check-in saved mid-export)
    // can appear as a relationship endpoint without being in `nodes`. Fetch any such endpoints so
    // every relationship in the backup can be restored. (A node deleted in between takes its
    // relationships with it, so the reverse can't happen.)
    const missing = missingEndpoints(data.nodes, data.relationships);
    if (missing.length) {
      const extra = await session.executeRead((tx) => tx.run(
        `MATCH (n) WHERE elementId(n) IN $ids AND ${nodeWhere} RETURN ${NODE_COLS}`, { ...params, ids: missing }));
      data.nodes.push(...extra.records.map((r) => toJson(r.toObject(), neo4j)));
    }
    const still = missingEndpoints(data.nodes, data.relationships);
    if (still.length) throw new Error(`backup incomplete: ${still.length} relationship endpoint(s) missing; run it again`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, args.includes('--pretty') ? JSON.stringify(data, null, 2) : JSON.stringify(data));
    console.log(`Exported ${data.nodes.length} nodes and ${data.relationships.length} relationships (scope: ${scope}) to ${out}`);
    console.log(scope === 'content-only'
      ? 'No user data in this file.'
      : 'Contains user data: keep it local (backups/ is gitignored).');
  } finally {
    await session.close();
    await driver.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
