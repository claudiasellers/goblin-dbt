'use strict';
/** A4-1: getCapacityContent (public content; no user data). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

const content = { version: 'capacity-v1', freshMinutes: 20, bandIntensity: { steady: 0.35, stirred: 0.6, flooded: 0.85 },
  probe: { wordings: {}, cantTell: "I can't tell" }, handoff: {} };

test('getCapacityContent returns probe copy, primitives by rank and band rules with heads-up', async () => {
  const f = fakeDriver((q) => {
    if (/CapacityProbe/.test(q)) return [{ version: 'capacity-v1', content: JSON.stringify(content) }];
    if (/HandoffPrimitive/.test(q)) return [{ id: 'sigh', component: 'breath_orb', direction: 'calm', bands: ['flooded'], blank: 'any', rank: 0, conceptId: 'cyclic_sighing', copy: '{"title":"t"}' }];
    if (/BandRule/.test(q)) return [
      { skillId: 'dear-man', band: 'flooded', mode: 'handoff', copy: '{}' },
      { skillId: 'dear-man', band: 'stirred', mode: 'full', copy: '{"headsUp":"summary"}' },
    ];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getCapacityContent.run({ data: {} });
  assert.equal(out.version, 'capacity-v1');
  assert.equal(out.freshMinutes, 20);
  assert.deepEqual(out.primitives[0].copy, { title: 't' });
  assert.equal(out.primitives[0].rank, 0);
  assert.deepEqual(out.bandRules, [
    { skillId: 'dear-man', band: 'flooded', mode: 'handoff' },
    { skillId: 'dear-man', band: 'stirred', mode: 'full', headsUp: 'summary' },
  ]);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getCapacityContent fails with failed-precondition until the capacity file is loaded', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getCapacityContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});
