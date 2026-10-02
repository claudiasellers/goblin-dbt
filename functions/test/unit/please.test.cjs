'use strict';
/** getPleaseContent (public content; no user data): the PLEASE flow document. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

test('getPleaseContent returns the flow document from a read session', async () => {
  const doc = { version: 'please-v1', areas: [], factors: [], check: [], now: [], later: [], copy: {} };
  const f = fakeDriver((q) => (/PleaseFlow/.test(q) ? [{ version: 'please-v1', content: JSON.stringify(doc) }] : []));
  setDriver(f.driver);
  const out = await fns.getPleaseContent.run({ data: {} });
  assert.deepEqual(out, doc);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getPleaseContent fails with failed-precondition until please.cypher is loaded (or is stale)', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getPleaseContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
  setDriver(fakeDriver(() => [{ version: 'please-v0', content: '{}' }]).driver);
  await assert.rejects(fns.getPleaseContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});
