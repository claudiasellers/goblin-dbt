'use strict';
/**
 * Parts records and the way out (parts-security-review, item 6). The parts labels come from the
 * registry (functions/src/userdata/layers.ts), never from a hand list here, and each one must be:
 * deleted by deleteMyParts, exported by exportUserData under its `exportAs`, and removed by the
 * account delete. Export and account delete find a node by `:UserData {ownerId}`, so every parts
 * writer must put that label and that owner on the node it creates.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');
const { USER_DATA, LAYER_LABEL, exportKeyFor } = require('../../lib/userdata/layers');
const { PARTS_LABELS } = require('../../lib/parts/delete');

const { setAuthAdminForTesting } = require(path.resolve(__dirname, '../../lib/shared/admin.js'));

const { fns, setDriver } = loadFunctions();
test.after(() => { setDriver(null); setAuthAdminForTesting(null); });
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });

/** Every registered parts label: the parts design's prefixes (parts.md, Data model → User data). */
const PARTS_FROM_LAYERS = Object.keys(USER_DATA).filter((l) => /^(Part|Trail|DenSnapshot)/.test(l)).sort();

const SRC = path.resolve(__dirname, '../../src');
const tsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return tsFiles(p);
  return e.name.endsWith('.ts') ? [p] : [];
});
const SOURCES = tsFiles(SRC).map((f) => ({ f: path.relative(SRC, f), src: fs.readFileSync(f, 'utf8') }));
const CONSTRAINTS = fs.readFileSync(path.resolve(__dirname, '../../../schema/constraints.cypher'), 'utf8');

test('the parts labels: registered in layers.ts, and the list is not empty', () => {
  assert.ok(PARTS_FROM_LAYERS.length >= 5, PARTS_FROM_LAYERS.join(', '));
  for (const l of ['Part', 'PartSession', 'PartCandidate', 'PartTag', 'PartRevisit']) assert.ok(PARTS_FROM_LAYERS.includes(l), l);
});

test('deleteMyParts covers every parts label in layers.ts, and nothing else', () => {
  assert.deepEqual([...PARTS_LABELS].sort(), PARTS_FROM_LAYERS);
});

test('every parts label: a non-system layer, an exportAs, and a unique key constraint', () => {
  for (const l of PARTS_FROM_LAYERS) {
    const d = USER_DATA[l];
    assert.notEqual(d.layer, 'system', `${l} would be skipped by export`);
    assert.ok(typeof d.exportAs === 'string' && d.exportAs.length > 0, `${l} has an exportAs`);
    assert.equal(exportKeyFor([l, 'UserData', LAYER_LABEL[d.layer]]), d.exportAs, `${l} exports under its own key`);
    assert.match(CONSTRAINTS, new RegExp(`FOR \\(n:${l}\\) REQUIRE n\\.key IS UNIQUE`), `${l} key constraint`);
  }
});

test('every parts writer creates its node as :UserData with the caller as owner, merged on key', () => {
  for (const l of PARTS_FROM_LAYERS) {
    const layer = LAYER_LABEL[USER_DATA[l].layer];
    const sites = [];
    for (const { f, src } of SOURCES) {
      assert.doesNotMatch(src, new RegExp(`\\bCREATE \\(\\w*:${l}\\b`), `${f}: ${l} is never CREATEd (MERGE on key)`);
      for (const m of src.matchAll(new RegExp(`MERGE \\((\\w+):${l} \\{(\\w+): [^}]+\\}\\)\\s*\\n\\s*ON CREATE SET ([^\\n]+)`, 'g'))) {
        sites.push(f);
        const [, v, keyProp, set] = m;
        assert.match(keyProp, /^\w*[kK]ey$/, `${f}: ${l} merges on its key, never on id`);
        assert.ok(set.includes(`${v}:UserData:${layer}`), `${f}: ${l} gets :UserData:${layer} on create`);
        assert.ok(set.includes(`${v}.ownerId = $uid`), `${f}: ${l} gets ownerId = $uid on create`);
      }
      // A MERGE of the label that is not followed by the ON CREATE SET above is a writer this test misses.
      const all = [...src.matchAll(new RegExp(`MERGE \\(\\w+:${l} \\{`, 'g'))].length;
      const seen = sites.filter((x) => x === f).length;
      assert.equal(all, seen, `${f}: every MERGE of ${l} creates with :UserData and ownerId`);
    }
    assert.ok(sites.length > 0, `${l} has a writer`);
  }
});

test('exportUserData: one record of every parts label lands under its exportAs', async () => {
  const f = fakeDriver((q) => {
    if (/MATCH \(n:UserData \{ownerId: \$uid\}\) WHERE NOT n:System/.test(q)) {
      return PARTS_FROM_LAYERS.map((l) => ({ labels: [l, 'UserData', LAYER_LABEL[USER_DATA[l].layer]], props: { id: `${l}-1`, ownerId: 'u-exp' } }));
    }
    return [];
  });
  setDriver(f.driver);
  const { data } = await fns.exportUserData.run({ auth: auth('u-exp'), data: {} });
  for (const l of PARTS_FROM_LAYERS) {
    assert.deepEqual(data.records[USER_DATA[l].exportAs]?.map((r) => r.id), [`${l}-1`], l);
  }
  assert.ok(!('unregistered' in data.records));
  assert.ok(f.calls.every((c) => (c.params.uid ?? c.params.userId) === 'u-exp'), 'the caller only');
  assert.ok(f.allClosed());
});

test('account delete removes every parts node: the :UserData {ownerId} sweep comes first, then the user', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  setAuthAdminForTesting({ deleteUser: async () => {} });
  await fns.deleteUserData.run({ auth: auth('u-gone'), data: { deleteAuth: true } });
  assert.match(f.calls[0].query, /MATCH \(n:UserData \{ownerId: \$uid\}\)\s*CALL \{ WITH n DETACH DELETE n \}/);
  assert.doesNotMatch(f.calls[0].query, /WHERE/, 'no filter: every label the writers above create');
  assert.ok(f.calls.every((c) => c.params.uid === 'u-gone'));
  assert.match(f.calls.at(-1).query, /MATCH \(u:User \{id: \$uid\}\) DETACH DELETE u/);
});
