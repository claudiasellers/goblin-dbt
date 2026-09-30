// Pins the safety rules of the Phase A rehearsal (scripts/rehearsal/): it only ever writes to a Neo4j on this
// machine, and it only accepts the one routing change M4 makes on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isLocalUri, assertLocalUri, ident, groupBy, chunks, dedupeAllowList, fingerprintDiff, unexpectedRoutingChanges, parseEnv,
  isPositiveStateStub,
} from '../scripts/rehearsal/lib.mjs';

test('only a Neo4j on this machine counts as local', () => {
  for (const u of ['bolt://127.0.0.1:7687', 'bolt://localhost:7687', 'neo4j://localhost', 'bolt://127.0.0.1:7687/', ' bolt://localhost:7687 ']) assert.equal(isLocalUri(u), true, u);
  for (const u of [
    'neo4j+s://abcd1234.databases.neo4j.io', 'neo4j+s://localhost:7687', 'bolt+s://127.0.0.1:7687',
    'bolt://127.0.0.1.evil.io:7687', 'bolt://localhost.databases.neo4j.io', 'bolt://10.0.0.5:7687',
    'bolt://127.0.0.1:7687@abcd.databases.neo4j.io', 'http://localhost:7474', '', undefined, null,
  ]) assert.equal(isLocalUri(u), false, String(u));
});

test('assertLocalUri refuses Aura and says why', () => {
  assert.doesNotThrow(() => assertLocalUri('bolt://127.0.0.1:7687'));
  assert.throws(() => assertLocalUri('neo4j+s://abcd1234.databases.neo4j.io', 'load'), /Refusing to load against .*only ever writes to a local Neo4j/);
  assert.throws(() => assertLocalUri(undefined), /Refusing/);
});

test('ident backtick-escapes labels and types', () => {
  assert.equal(ident('UserData'), '`UserData`');
  assert.equal(ident('we`ird'), '`we``ird`');
  assert.throws(() => ident(''));
  assert.throws(() => ident(undefined));
});

test('groupBy keeps order; chunks splits evenly', () => {
  const g = groupBy([{ t: 'a', i: 1 }, { t: 'b', i: 2 }, { t: 'a', i: 3 }], (r) => r.t);
  assert.deepEqual([...g.keys()], ['a', 'b']);
  assert.deepEqual(g.get('a').map((r) => r.i), [1, 3]);
  assert.deepEqual(chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunks([], 500), []);
});

test('dedupeAllowList reads the relationship types the dedupe may touch', () => {
  assert.deepEqual(dedupeAllowList('MATCH (a)-[r]->(b) WHERE type(r) IN ["FELT_AS", \'MODULATES\' ,"ADDRESSES"] RETURN r'), ['FELT_AS', 'MODULATES', 'ADDRESSES']);
  assert.throws(() => dedupeAllowList('MATCH (n) RETURN n'), /allow-list/);
});

test('the real dedupe file has an allow-list with no user-data relationship in it', () => {
  const allow = dedupeAllowList(readFileSync(new URL('../schema/maintenance/dedupe-apply-rels.cypher', import.meta.url), 'utf8'));
  assert.ok(allow.length > 10, `${allow.length} types`);
  for (const t of ['LOGGED', 'COMPLETED_SESSION', 'PRACTICED', 'FOUND_WORD', 'DETAIL', 'SHOWED_LINE', 'SAVED_LINE']) assert.ok(!allow.includes(t), t);
});

test('fingerprintDiff reports every count that moved, and nothing when equal', () => {
  const a = { labels: { A: 2, B: 1 }, types: { R: 3 }, nodeProps: 10, relProps: 4 };
  assert.deepEqual(fingerprintDiff(a, structuredClone(a)), []);
  const b = { labels: { A: 2, C: 1 }, types: { R: 2 }, nodeProps: 11, relProps: 4 };
  assert.deepEqual(fingerprintDiff(a, b), ['labels.B: 1 → 0', 'labels.C: 0 → 1', 'types.R: 3 → 2', 'nodeProps: 10 → 11']);
});

test('M4: only numb moving from high- to low-unpleasant is expected', () => {
  const numbMove = [
    { what: 'grid.winnerDistribution', before: { 'high-unpleasant → acute_alarm': 49, 'low-unpleasant → conservation_freeze': 36 }, after: { 'high-unpleasant → acute_alarm': 48, 'low-unpleasant → conservation_freeze': 37 } },
    { what: 'grid.winner high-unpleasant:numb', before: 'acute_alarm', after: null },
    { what: 'grid.winner low-unpleasant:numb', before: null, after: 'conservation_freeze' },
  ];
  assert.deepEqual(unexpectedRoutingChanges(numbMove), []);
  // Anything else is unexpected: another word moving, numb landing elsewhere, a distribution that moved more.
  const other = { what: 'grid.winner high-unpleasant:angry', before: 'acute_alarm', after: 'emotional_flooding' };
  assert.deepEqual(unexpectedRoutingChanges([...numbMove, other]), [other]);
  const wrongLanding = { what: 'grid.winner low-unpleasant:numb', before: null, after: 'dissociation_overmodulation' };
  assert.deepEqual(unexpectedRoutingChanges([wrongLanding]), [wrongLanding]);
  const bigger = { what: 'grid.winnerDistribution', before: { 'high-unpleasant → acute_alarm': 49 }, after: { 'high-unpleasant → acute_alarm': 47, 'low-unpleasant → conservation_freeze': 2 } };
  assert.deepEqual(unexpectedRoutingChanges([bigger]), [bigger]);
  const safety = { what: 'safetyTriggers', before: [], after: ['x'] };
  assert.deepEqual(unexpectedRoutingChanges([safety]), [safety]);
});

test('M1: the positive_state stub is the only extra pattern allowed, and only when asked for', () => {
  const live = ['acute_alarm', 'chronic_vigilance', 'conservation_freeze'];
  const stub = { what: 'patterns', before: live, after: [...live, 'positive_state'].sort() };
  assert.equal(isPositiveStateStub(stub), true);
  assert.deepEqual(unexpectedRoutingChanges([stub], { numbMove: false, positiveStateStub: true }), []);
  assert.deepEqual(unexpectedRoutingChanges([stub], { numbMove: false }), [stub]);
  assert.deepEqual(unexpectedRoutingChanges([stub]), [stub], 'M4 no longer allows it: M2 removes the stub');
  const other = { what: 'patterns', before: live, after: [...live, 'grief_yearning'] };
  const lost = { what: 'patterns', before: [...live, 'positive_state'], after: live };
  const both = { what: 'patterns', before: live, after: [...live, 'positive_state', 'x'] };
  for (const c of [other, lost, both]) assert.deepEqual(unexpectedRoutingChanges([c], { numbMove: false, positiveStateStub: true }), [c]);
  // The numb move is not allowed at M1.
  const numb = { what: 'grid.winner high-unpleasant:numb', before: 'acute_alarm', after: null };
  assert.deepEqual(unexpectedRoutingChanges([numb], { numbMove: false, positiveStateStub: true }), [numb]);
});

test('the committed live baseline vs the schema view differs only by the numb move', async () => {
  const { diffRouting, parseGrid } = await import('../scripts/lib/liveRoutingReport.mjs');
  const live = JSON.parse(readFileSync(new URL('./fixtures/live-routing-2026-09-30.json', import.meta.url), 'utf8'));
  const schema = JSON.parse(readFileSync(new URL('./fixtures/recommendation-graph.json', import.meta.url), 'utf8'));
  const grid = parseGrid(readFileSync(new URL('../src/data/emotions.ts', import.meta.url), 'utf8'));
  const { changes } = diffRouting(live, schema, { grid });
  assert.deepEqual(unexpectedRoutingChanges(changes), []);
});

test('parseEnv reads KEY=value lines without touching process.env', () => {
  const before = process.env.NEO4J_URI;
  const env = parseEnv('# comment\nNEO4J_URI="neo4j+s://x.databases.neo4j.io"\n NEO4J_USER = neo4j \nNEO4J_PASSWORD=\'p=w\'\nlower=ignored\n');
  assert.deepEqual(env, { NEO4J_URI: 'neo4j+s://x.databases.neo4j.io', NEO4J_USER: 'neo4j', NEO4J_PASSWORD: 'p=w' });
  assert.equal(process.env.NEO4J_URI, before);
});

test('the rehearsal pins every child process and write session to the local URI', () => {
  const src = readFileSync(new URL('../scripts/rehearsal/rehearse-phase-a.mjs', import.meta.url), 'utf8');
  assert.match(src, /function run\([^)]*\)[^{]*\{\s*assertLocalUri\(env\.NEO4J_URI/);
  assert.match(src, /function localDriver\(\) \{ assertLocalUri\(LOCAL\.uri/);
  // Aura is opened once, with a READ session, and never handed to q() (which writes).
  assert.equal((src.match(/neo4j\.driver\(/g) || []).length, 2);
  assert.match(src, /aura\.session\(\{ defaultAccessMode: neo4j\.session\.READ \}\)/);
  assert.doesNotMatch(src, /q\(aura/);
  assert.doesNotMatch(src, /aura\.session\(\s*\)/);
});
