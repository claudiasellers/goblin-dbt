'use strict';
/** getBodyMapContent (public content; no user data): pad words and the body-mirror maps. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

const head = [{ version: 'body-map-v1', regions: ['chest', 'shoulders'] }];
const pad = [{ id: 'tension', label: 'Tight', zones: ['hu'], regions: [], energy: 'more' }];
const place = (region, sensationId, weight) => ({ region, sensationId, label: sensationId, energy: 'more', weight });

test('getBodyMapContent returns pad words, and maps in the order of the sent words, strongest place first', async () => {
  const f = fakeDriver((q, params) => {
    if (/BodyMapContent/.test(q)) return head;
    if (/padStatus/.test(q)) return pad;
    if (/BodyMap \{status: 'live'\}/.test(q)) {
      assert.deepEqual(params.ids, ['excited', 'anxious', 'worried']);
      return [
        { id: 'fear', label: 'Fear and worry', wordIds: ['anxious', 'worried', 'scared'], places: [place('hands', 'shaking', 0.6), place('chest', 'racing_heart', 1)] },
        { id: 'excitement', label: 'Excitement', wordIds: ['excited'], places: [place('stomach', 'fizzy', 1)] },
      ];
    }
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getBodyMapContent.run({ data: { emotionIds: ['excited', 'anxious', 'worried', 'anxious'] } });
  assert.equal(out.version, 'body-map-v1');
  assert.deepEqual(out.padWords, pad);
  assert.deepEqual(out.maps.map((m) => m.id), ['excitement', 'fear']);
  assert.deepEqual(out.maps[1].emotionIds, ['anxious', 'worried']);
  assert.deepEqual(out.maps[1].places.map((p) => p.region), ['chest', 'hands']);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getBodyMapContent without words returns pad words only and never queries maps', async () => {
  const f = fakeDriver((q) => {
    if (/BodyMapContent/.test(q)) return head;
    if (/padStatus/.test(q)) return pad;
    throw new Error('maps queried');
  });
  setDriver(f.driver);
  const out = await fns.getBodyMapContent.run({ data: {} });
  assert.deepEqual(out.maps, []);
  assert.equal(out.padWords.length, 1);
});

test('getBodyMapContent rejects bad word ids and fails with failed-precondition until the file is loaded', async () => {
  setDriver(fakeDriver(() => head).driver);
  await assert.rejects(fns.getBodyMapContent.run({ data: { emotionIds: ['Not An Id'] } }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.getBodyMapContent.run({ data: { emotionIds: 'anxious' } }), (e) => e.code === 'invalid-argument');
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getBodyMapContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});
