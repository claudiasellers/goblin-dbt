#!/usr/bin/env node
/**
 * Rebuild the Goblin knowledge graph in Neo4j from schema/*.cypher.
 *
 * Every schema file uses MERGE + SET, so this is idempotent: safe to run
 * against an empty Aura instance or an existing one.
 *
 * Usage:
 *   NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io NEO4J_USER=neo4j NEO4J_PASSWORD=... \
 *     node scripts/load-graph.mjs            # load everything
 *   node scripts/load-graph.mjs --dry-run    # only parse + count statements
 *   node scripts/load-graph.mjs --only dear-man-content   # one file (substring match)
 *
 * Credentials are read from env vars, or from a .env file in the repo root
 * (NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD). Uses functions/node_modules/neo4j-driver.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'functions/package.json'));

// ---- Load order: derived from which labels each file MATCHes vs MERGEs ----
const LOAD_ORDER = [
  'knowledge-graph.cypher',                       // all base nodes
  'relationships.cypher',                         // base relationships
  'incremental-update.cypher',                    // extra Emotion nodes + OPPOSITE_OF
  'emotion-wheel-sync.cypher',                    // wheel vocabulary sync (Emotion)
  'low-unpleasant-associations-patch.cypher',     // Emotion ↔ ActivationPattern patch
  'emotion-regulation-content.cypher',            // EmotionRegulationContent (per DBT parent)
  'opposite-action-data.cypher',                  // ActionUrge + OA protocol metadata
  'remove-deprecated-regulation-properties.cypher',
  'problem-solve-data.cypher',                    // ProblemType / SolutionDirection / protocol
  'problem-solve-barriers.cypher',                // BarrierType / sub-responses / ambivalence
  'dear-man-content.cypher',
  'dear-man-debrief-content.cypher',
  'discriminating-questions.cypher',
  'pattern-co-occurrence.cypher',
  'insight-narratives.cypher',
  'somatic-narratives.cypher',
];

// Constraints/indexes the app relies on (mirrors the initializeSchema Cloud Function).
const CONSTRAINTS = [
  'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
  'CREATE CONSTRAINT checkin_id IF NOT EXISTS FOR (c:CheckIn) REQUIRE c.id IS UNIQUE',
  'CREATE INDEX checkin_timestamp IF NOT EXISTS FOR (c:CheckIn) ON (c.timestamp)',
  'CREATE CONSTRAINT emotion_id IF NOT EXISTS FOR (e:Emotion) REQUIRE e.id IS UNIQUE',
  'CREATE CONSTRAINT brain_id IF NOT EXISTS FOR (b:BrainStructure) REQUIRE b.id IS UNIQUE',
  'CREATE CONSTRAINT therapy_concept_id IF NOT EXISTS FOR (c:TherapyConcept) REQUIRE c.id IS UNIQUE',
  'CREATE CONSTRAINT activation_pattern_id IF NOT EXISTS FOR (a:ActivationPattern) REQUIRE a.id IS UNIQUE',
];

/**
 * Split a .cypher file into statements on ';' — but only outside of
 * string literals ('…' / "…" / `…`) and comments (// … / /* … *\/).
 */
function splitStatements(source) {
  const out = [];
  let cur = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {                  // line comment → drop
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {                  // block comment → drop
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {      // string literal → copy verbatim
      const quote = ch;
      cur += ch; i++;
      while (i < n) {
        const c = source[i];
        cur += c;
        if (c === '\\') { cur += source[i + 1] ?? ''; i += 2; continue; }
        i++;
        if (c === quote) break;
      }
      continue;
    }
    if (ch === ';') {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = '';
      i++;
      continue;
    }
    cur += ch; i++;
  }
  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD;
  return { uri, user, password };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

  const files = LOAD_ORDER.filter(f => !only || f.includes(only));
  const plan = files.map(f => ({ file: f, statements: splitStatements(readFileSync(resolve(root, 'schema', f), 'utf8')) }));

  let total = 0;
  for (const p of plan) { total += p.statements.length; console.log(`${p.file.padEnd(48)} ${String(p.statements.length).padStart(4)} statements`); }
  console.log(`${'TOTAL'.padEnd(48)} ${String(total).padStart(4)} statements`);
  if (dryRun) return;

  const { uri, user, password } = loadEnv();
  if (!uri || !password) {
    console.error('\nMissing NEO4J_URI / NEO4J_PASSWORD (set env vars or a .env file in the repo root).');
    process.exit(1);
  }

  const neo4j = require('neo4j-driver');
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  await driver.verifyConnectivity();
  console.log(`\nConnected to ${uri}\n`);

  const session = driver.session();
  const failures = [];
  try {
    console.log('Constraints & indexes');
    for (const c of CONSTRAINTS) {
      try { await session.run(c); } catch (e) { console.warn(`  skipped: ${c}\n    ${e.message}`); }
    }

    for (const p of plan) {
      // knowledge-graph.cypher uses CREATE (one large query of base nodes). It is
      // only safe on an empty graph; skip it when base nodes already exist.
      if (p.file === 'knowledge-graph.cypher') {
        const existing = await session.run('MATCH (b:BrainStructure) RETURN count(b) AS c');
        const c = existing.records[0].get('c').toNumber();
        if (c > 0) {
          console.log(`↷ ${p.file.padEnd(46)} skipped (${c} BrainStructure nodes already exist)`);
          continue;
        }
      }
      const t0 = Date.now();
      let ok = 0;
      for (let k = 0; k < p.statements.length; k++) {
        const stmt = p.statements[k];
        try {
          await session.run(stmt);
          ok++;
        } catch (e) {
          failures.push({ file: p.file, index: k + 1, message: e.message, preview: stmt.slice(0, 120).replace(/\s+/g, ' ') });
          console.error(`  ✗ ${p.file} #${k + 1}: ${e.message.split('\n')[0]}`);
        }
      }
      console.log(`✓ ${p.file.padEnd(46)} ${ok}/${p.statements.length} ok  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }

    console.log('\nNode counts by label:');
    const res = await session.run('MATCH (n) UNWIND labels(n) AS l RETURN l AS label, count(*) AS c ORDER BY c DESC');
    for (const r of res.records) console.log(`  ${r.get('label').padEnd(32)} ${r.get('c').toString()}`);
    const rels = await session.run('MATCH ()-[r]->() RETURN count(r) AS c');
    console.log(`  relationships${' '.repeat(19)} ${rels.records[0].get('c').toString()}`);
  } finally {
    await session.close();
    await driver.close();
  }

  if (failures.length) {
    console.error(`\n${failures.length} statement(s) failed:`);
    for (const f of failures) console.error(`  ${f.file} #${f.index}: ${f.message.split('\n')[0]}\n    ${f.preview}…`);
    process.exit(2);
  }
  console.log('\nDone. Graph rebuilt.');
}

main().catch(e => { console.error(e); process.exit(1); });
