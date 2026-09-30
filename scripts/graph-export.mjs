#!/usr/bin/env node
/**
 * READ-ONLY backup of the whole graph to a local JSON file (plan D-05 / runbook R-7), for when
 * the Aura tier has no on-demand snapshot. Run it before A1-5's dedupe.
 *
 *   node scripts/graph-export.mjs                 # → backups/graph-<YYYY-MM-DD>.json
 *   node scripts/graph-export.mjs --out file.json
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

async function main() {
  const args = process.argv.slice(2);
  const out = args.includes('--out') ? resolve(process.cwd(), args[args.indexOf('--out') + 1])
    : resolve(root, 'backups', `graph-${new Date().toISOString().slice(0, 10)}.json`);
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
    const nodes = await session.executeRead((tx) => tx.run(
      'MATCH (n) RETURN elementId(n) AS elementId, labels(n) AS labels, properties(n) AS props ORDER BY elementId'));
    const rels = await session.executeRead((tx) => tx.run(
      'MATCH (a)-[r]->(b) RETURN elementId(r) AS elementId, type(r) AS type, elementId(a) AS start, elementId(b) AS end, properties(r) AS props ORDER BY elementId'));
    const data = {
      exportedAt: new Date().toISOString(),
      nodes: nodes.records.map((r) => toJson(r.toObject(), neo4j)),
      relationships: rels.records.map((r) => toJson(r.toObject(), neo4j)),
    };
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(data));
    console.log(`Exported ${data.nodes.length} nodes and ${data.relationships.length} relationships to ${out}`);
    console.log('Contains user data: keep it local (backups/ is gitignored) and delete it after M1.');
  } finally {
    await session.close();
    await driver.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
