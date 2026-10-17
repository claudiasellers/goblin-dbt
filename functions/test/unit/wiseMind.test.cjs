'use strict';
/** getWiseMindContent (public content; no user data). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

const flow = { version: 'wise-mind-v1', ownMax: 140, sourceIds: ['linehan_skills_2015'], copy: { question: { prompt: 'p' } } };

test('getWiseMindContent: flow copy, questions with each mind\'s voices, practices and answers, read-only', async () => {
  const f = fakeDriver((q) => {
    if (/WiseMindFlow/.test(q)) return [{ version: 'wise-mind-v1', content: JSON.stringify(flow) }];
    if (/WiseMindQuestion/.test(q)) return [{
      id: 'wm_q_say', label: 'Whether to say something', order: 1, defaultPracticeId: 'wm_ask',
      voices: [{ id: 'e1', label: 'Say it now', mind: 'emotion' }, { id: 'r1', label: 'Get the facts first', mind: 'reason' }],
    }];
    if (/WiseMindPractice/.test(q)) return [
      { id: 'wm_stone', name: 'Stone', sub: 's', kind: 'drift', lines: ['a'], breaths: null, seconds: 40, order: 0 },
      { id: 'wm_breath', name: 'Breath', sub: 's', kind: 'hold', lines: ['b'], breaths: 5, seconds: null, order: 1 },
    ];
    if (/WiseMindAnswer/.test(q)) return [
      { id: 'wm_a_wait', label: 'Wait, not now', order: 1, nextToolIds: ['pause'], kind: null },
      { id: 'wm_a_nothing', label: 'Nothing yet', order: 6, nextToolIds: [], kind: 'quiet' },
    ];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getWiseMindContent.run({ data: {} });
  assert.equal(out.version, 'wise-mind-v1');
  assert.equal(out.ownMax, 140);
  assert.deepEqual(out.copy, flow.copy);
  assert.ok(!('sourceIds' in out), 'the served shape: copy only');
  assert.deepEqual(out.questions[0].voices, { emotion: [{ id: 'e1', label: 'Say it now' }], reason: [{ id: 'r1', label: 'Get the facts first' }] });
  assert.deepEqual(out.practices.map((p) => [p.id, p.breaths, p.seconds]), [['wm_stone', null, 40], ['wm_breath', 5, null]]);
  assert.deepEqual(out.answers[1], { id: 'wm_a_nothing', label: 'Nothing yet', order: 6, nextToolIds: [], kind: 'quiet' });
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getWiseMindContent fails with failed-precondition until schema/wise-mind.cypher is loaded', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getWiseMindContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});
