#!/usr/bin/env node
/**
 * Load the Goblin knowledge graph into Neo4j from schema/*.cypher.
 *
 * Every loaded schema file is MERGE-only (tests/schema-idempotency.test.mjs), so a full load is
 * idempotent: safe against an empty instance or an existing one, and two runs in a row give the
 * same totals. constraints.cypher loads first; a constraint that can't be created stops the load
 * (exit 3), because MERGE against duplicated nodes would multiply edges.
 *
 * Usage:
 *   NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io NEO4J_USER=neo4j NEO4J_PASSWORD=... \
 *     node scripts/load-graph.mjs            # load everything in LOAD_ORDER
 *   node scripts/load-graph.mjs --verify     # load everything, then fail (exit 4) on duplicates
 *   node scripts/load-graph.mjs --dry-run    # only parse + count statements
 *   node scripts/load-graph.mjs --only dear-man-content   # files whose name contains this
 *   node scripts/load-graph.mjs --file schema/maintenance/x.cypher  # one file outside LOAD_ORDER (prints results)
 *
 * `--only knowledge-graph` refuses without --force: later files override Emotion / TherapyConcept
 * properties, so the base file alone would revert them until a full load.
 * Exit codes: 1 setup, 2 statement failures, 3 constraint failure, 4 duplicates after --verify.
 *
 * Credentials are read from env vars, or from a .env file in the repo root
 * (NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD). Uses functions/node_modules/neo4j-driver.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCHEMA_REL_TYPES, DUPLICATE_NODES_QUERY, DUPLICATE_RELS_QUERY } from './lib/schemaDuplicates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'functions/package.json'));

// ---- Load order: derived from which labels each file MATCHes vs MERGEs ----
export const LOAD_ORDER = [
  'constraints.cypher',                           // every constraint + index; first (R13)
  'knowledge-graph.cypher',                       // all base nodes
  'relationships.cypher',                         // base relationships
  'emotion-wheel-sync.cypher',                    // wheel vocabulary sync (Emotion)
  'low-unpleasant-associations-patch.cypher',     // Emotion ↔ ActivationPattern patch
  'emotion-regulation-content.cypher',            // EmotionRegulationContent (per DBT parent)
  'opposite-action-data.cypher',                  // ActionUrge + OA protocol metadata
  'opposite-action-flow.cypher',                  // OA guided-v2 flow document + somatic cues (needs OA data above)
  'remove-deprecated-regulation-properties.cypher',
  'problem-solve-data.cypher',                    // ProblemType / SolutionDirection / protocol
  'problem-solve-barriers.cypher',                // BarrierType / sub-responses / ambivalence
  'dear-man-content.cypher',
  'dear-man-content-v2.cypher',            // feeling groups, mirroring, anchor generator
  'dear-man-debrief-content.cypher',
  'discriminating-questions.cypher',
  'pattern-co-occurrence.cypher',
  'insight-narratives.cypher',
  'somatic-narratives.cypher',
  'invalidation-recovery.cypher',                    // "Recover from a hurtful moment": events / protocols / exits / skill deck / skill deck
  'dear-man-safety-gates.cypher',                  // DEAR MAN arousal-gate copy (reads gates from the recovery flow)
  'app-tool-ids.cypher',                           // TherapyConcept.appToolId join keys (fixes tipp/stop/problem-solving cards)
  'find-the-feeling.cypher',                       // Find the feeling (Shape it / Tune it): word signatures, urge routing, appToolId join keys
  'practice-spine.cypher',                         // FollowUpType, SessionCloseFlow, PracticeSkill defaultFor (needs urge_surfing above)
  'profile-layer.cypher',                          // ProfileArea / ProfileKind / PatternRule (Me surface content)
  'capacity.cypher',                               // Capacity probe, hand-off primitives, band rules (needs Recover's cyclic_sighing)
  'witness.cypher',                                // Witness corpus: ValidationLine, ToolMoment, VoiceRule (needs Recover, OA, DEAR MAN debrief, regulation content)
  'recommended-for.cypher',                        // Check-in routing: RECOMMENDED_FOR pattern × band, concept tags, RoutingPolicy (needs urge_surfing, dbt_find_the_feeling)
];

// schema/*.cypher files that are deliberately never loaded (reference queries, not data).
// One-off migrations (schema/migrations/) and maintenance queries (schema/maintenance/) are
// never in LOAD_ORDER; run them with --file.
export const NOT_LOADED = [
  'validation-queries.cypher',
];

/** A schema DDL statement (CREATE/DROP CONSTRAINT/INDEX). */
export const isDdl = (stmt) => /^\s*(CREATE|DROP)\s+(CONSTRAINT|INDEX|RANGE INDEX|TEXT INDEX|POINT INDEX|FULLTEXT INDEX|LOOKUP INDEX|VECTOR INDEX)\b/i.test(stmt);

/**
 * Split a .cypher file into statements on ';' — but only outside of
 * string literals ('…' / "…" / `…`) and comments (// … / /* … *\/).
 */
export function splitStatements(source) {
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

/**
 * Which files a run loads. `only` is a substring filter on LOAD_ORDER; `file` is one path
 * outside it. Throws (message for the user) on an unsafe or empty selection.
 */
export function selectFiles({ only = null, file = null, force = false } = {}) {
  if (file) return [{ name: file, path: resolve(process.cwd(), file) }];
  const names = LOAD_ORDER.filter(f => !only || f.includes(only));
  if (!names.length) throw new Error(`--only ${only} matches no file in LOAD_ORDER`);
  if (only && names.includes('knowledge-graph.cypher') && !force) {
    throw new Error('--only selects knowledge-graph.cypher: later files (emotion-wheel-sync, the low-unpleasant patch, '
      + 'find-the-feeling, invalidation-recovery, …) override its Emotion / TherapyConcept properties, so loading it '
      + 'alone reverts them. Run a full load, or pass --force if you really mean it.');
  }
  return names.map(name => ({ name, path: resolve(root, 'schema', name) }));
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const value = (f) => (args.indexOf(f) >= 0 ? args[args.indexOf(f) + 1] : null);
  const dryRun = flag('--dry-run');
  const verify = flag('--verify');
  const printResults = Boolean(value('--file'));

  let files;
  try {
    files = selectFiles({ only: value('--only'), file: value('--file'), force: flag('--force') });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const plan = files.map(f => ({ file: f.name, statements: splitStatements(readFileSync(f.path, 'utf8')) }));

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
  console.log(`\nConnected to ${uri.replace(/^(\w+(\+\w+)?:\/\/)([^.:]{3})[^.:]*/, '$1$3…')}\n`);

  const session = driver.session();
  const failures = [];
  let exitCode = 0;
  try {
    for (const p of plan) {
      const t0 = Date.now();
      let ok = 0;
      for (let k = 0; k < p.statements.length; k++) {
        const stmt = p.statements[k];
        try {
          const res = await session.run(stmt);
          ok++;
          if (printResults && res.records.length) {
            // --file runs (maintenance / migration queries): show what each query returned
            const toPlain = (_k, v) => (v && typeof v === 'object' && typeof v.toNumber === 'function' && 'low' in v ? v.toString() : v);
            console.log(`  #${k + 1} → ${res.records.length} row(s)`);
            for (const r of res.records.slice(0, 50)) console.log(`    ${JSON.stringify(r.toObject(), toPlain)}`);
          }
        } catch (e) {
          if (isDdl(stmt)) {
            // Never MERGE on top of duplicates: a missing uniqueness constraint lets MERGE match
            // several copies and cross-multiply edges.
            console.error(`\n✗ ${p.file} #${k + 1}: could not create a constraint/index:\n  ${e.message.split('\n')[0]}`);
            console.error('  Duplicates probably exist. Run schema/maintenance/dedupe-dry-run.cypher, then the dedupe, then load again.');
            exitCode = 3;
            return;
          }
          failures.push({ file: p.file, index: k + 1, message: e.message, preview: stmt.slice(0, 120).replace(/\s+/g, ' ') });
          console.error(`  ✗ ${p.file} #${k + 1}: ${e.message.split('\n')[0]}`);
        }
      }
      console.log(`✓ ${p.file.padEnd(46)} ${ok}/${p.statements.length} ok  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }

    console.log('\nNode counts by label:');
    const res = await session.run('MATCH (n) UNWIND labels(n) AS l RETURN l AS label, count(*) AS c ORDER BY c DESC, label');
    for (const r of res.records) console.log(`  ${r.get('label').padEnd(32)} ${r.get('c').toString()}`);
    const totals = await session.run('MATCH (n) WITH count(n) AS nodes OPTIONAL MATCH ()-[r]->() RETURN nodes, count(r) AS rels');
    const nodes = totals.records[0].get('nodes').toString();
    const rels = totals.records[0].get('rels').toString();
    console.log(`  relationships${' '.repeat(19)} ${rels}`);
    console.log(`\nTOTALS nodes=${nodes} relationships=${rels}`);

    if (verify) {
      console.log('\nVerify: duplicates');
      const dupNodes = (await session.run(DUPLICATE_NODES_QUERY)).records.map(r => r.toObject());
      const dupRels = (await session.run(DUPLICATE_RELS_QUERY)).records.map(r => r.toObject());
      const schemaDupRels = dupRels.filter(r => SCHEMA_REL_TYPES.includes(r.type));
      const otherDupRels = dupRels.filter(r => !SCHEMA_REL_TYPES.includes(r.type));
      for (const r of dupNodes) console.error(`  ✗ nodes ${r.label}: ${r.extraNodes} extra (${r.sampleKeys.join(', ')})`);
      for (const r of schemaDupRels) console.error(`  ✗ relationships ${r.type}: ${r.extraRels} extra (worst ×${r.worstMultiplicity})`);
      for (const r of otherDupRels) console.warn(`  ! relationships ${r.type} (not a schema type; not deduplicated): ${r.extraRels} extra`);
      if (dupNodes.length || schemaDupRels.length) {
        console.error('\nDuplicates remain. See schema/maintenance/ (dry run, then dedupe-apply-rels.cypher).');
        exitCode = 4;
      } else {
        console.log('  none for schema types ✓');
      }
    }
  } finally {
    await session.close();
    await driver.close();
    // Report statement failures even when a constraint (3) or --verify (4) failure decides the exit code.
    if (failures.length) {
      console.error(`\n${failures.length} statement(s) failed:`);
      for (const f of failures) console.error(`  ${f.file} #${f.index}: ${f.message.split('\n')[0]}\n    ${f.preview}…`);
    }
    if (exitCode) process.exit(exitCode);
  }

  if (failures.length) process.exit(2);
  console.log(verify ? '\nDone. Graph loaded and verified.' : '\nDone. Graph loaded.');
}

// Run only when executed directly, so tests can import LOAD_ORDER / splitStatements.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(e => { console.error(e); process.exit(1); });
}
