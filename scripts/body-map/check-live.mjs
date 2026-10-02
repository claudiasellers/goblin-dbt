#!/usr/bin/env node
/**
 * READ-ONLY check of the live body map content: what getBodyMapContent reads, and whether the
 * body-map.cypher load (body-map-v2) landed. Opens a READ session; never writes. Credentials come
 * from .env in the repo root (same as load-graph.mjs / verify-live-routing.mjs); never printed.
 *
 *   node scripts/body-map/check-live.mjs
 *
 * Exit 0: the head check getBodyMapContent runs would pass (version body-map-v2). Exit 2: it would
 * throw failed-precondition ("Body map content migration is required"). Exit 1: setup / connection.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(root, 'functions/package.json'));
const neo4j = require('neo4j-driver');

/** What functions/src/bodyMap/index.ts BODY_MAP_VERSION expects (scripts/body-map/content.py VERSION). */
const EXPECTED = 'body-map-v2';

for (const line of (existsSync(resolve(root, '.env')) ? readFileSync(resolve(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { NEO4J_URI: uri, NEO4J_USER: user = 'neo4j', NEO4J_PASSWORD: pw } = process.env;
if (!uri || !pw) { console.error('Missing NEO4J_URI / NEO4J_PASSWORD in .env'); process.exit(1); }

const plain = (v) => (v && typeof v === 'object' && typeof v.toNumber === 'function' ? v.toNumber() : v);
const driver = neo4j.driver(uri, neo4j.auth.basic(user, pw));
const session = driver.session({ defaultAccessMode: neo4j.session.READ });
const q = async (cypher) => (await session.executeRead((tx) => tx.run(cypher))).records
  .map((r) => Object.fromEntries(r.keys.map((k) => [k, plain(r.get(k))])));

let code = 0;
try {
  await driver.verifyConnectivity();
  // The function's head query, verbatim.
  const head = await q(`MATCH (c:BodyMapContent {id: 'body_map'}) RETURN c.version AS version, c.regions AS regions`);
  const COUNTS = {
    bodyMapContent: `MATCH (c:BodyMapContent) RETURN count(c) AS n`,
    padWords: `MATCH (s:SensationType) WHERE s.padStatus IS NOT NULL RETURN count(s) AS n`,
    livePadWords: `MATCH (s:SensationType) WHERE s.padStatus = 'live' RETURN count(s) AS n`,
    feltAs: `MATCH ()-[f:FELT_AS]->() RETURN count(f) AS n`,
    liveFeltAs: `MATCH ()-[f:FELT_AS]->() WHERE f.status = 'live' RETURN count(f) AS n`,
    bodyMaps: `MATCH (m:BodyMap) RETURN count(m) AS n`,
    liveBodyMaps: `MATCH (m:BodyMap) WHERE m.status = 'live' RETURN count(m) AS n`,
    mirrors: `MATCH (:BodyMap)-[r:MIRRORS]->() RETURN count(r) AS n`,
    groups: `MATCH (:BodyMap)-[r:GROUPS]->() RETURN count(r) AS n`,
    v1Places: `MATCH (p:BodyMapPlace) RETURN count(p) AS n`,
    bodyRegions: `MATCH (r:BodyRegion) RETURN count(r) AS n`,
  };
  const counts = {};
  for (const [k, cypher] of Object.entries(COUNTS)) counts[k] = (await q(cypher))[0].n;
  // The function's pad-word query, verbatim: an error here is an `internal` in production.
  const words = await q(`MATCH (s:SensationType) WHERE s.padStatus = 'live'
         RETURN s.id AS id, s.padLabel AS label, s.zones AS zones, s.regions AS regions, s.energy AS energy
         ORDER BY s.padRank`);

  const version = head[0]?.version ?? null;
  console.log(`BodyMapContent.version   ${JSON.stringify(version)}   (function expects "${EXPECTED}")`);
  console.log(`BodyMapContent.regions   ${head[0]?.regions?.length ?? 0}`);
  for (const [k, v] of Object.entries(counts)) console.log(`${k.padEnd(24)} ${v}`);
  console.log(`pad-word query           ${words.length} row(s), ran without error`);
  console.log('');
  if (!head.length) {
    console.log('VERDICT: no BodyMapContent node. getBodyMapContent throws failed-precondition. Load body-map.cypher.');
    code = 2;
  } else if (version !== EXPECTED) {
    console.log(`VERDICT: graph is at ${JSON.stringify(version)}. getBodyMapContent (${EXPECTED}) throws failed-precondition. Load body-map.cypher.`);
    code = 2;
  } else {
    console.log('VERDICT: graph is at body-map-v2; the head check passes. If the app still fails, the deployed function is not the #34 build (or it fails elsewhere: see firebase functions:log).');
    if (counts.livePadWords === 0) console.log('NOTE: 0 live pad words (SIGNED_OFF is empty): the body step shows no words, without the "Couldn\'t load" error.');
  }
} catch (e) {
  console.error(`Query failed: ${e.code ?? ''} ${e.message.split('\n')[0]}`);
  code = 1;
} finally {
  await session.close();
  await driver.close();
}
process.exit(code);
