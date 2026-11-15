'use strict';
/**
 * The Practice home's read (MF-02, MF-B3, docs/design/practice-home.md): getPracticeHome, signed in only, three
 * queries in one read transaction (the MF skills by `mfOrder`, the caller's own reps, a waiting daily card), shaped
 * by practice/compute.ts.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();

test('getPracticeHome: the caller\'s own reps, the MF sequence in order, a fresh daily card counts as waiting', async () => {
  const at = new Date(Date.now() - 86_400_000).toISOString();
  const f = fakeDriver((query) => {
    if (query.includes('k.mfOrder AS mfOrder')) return [
      { id: 'describe', label: 'Name', mfOrder: 2, tools: ['notice-and-name'] },
      { id: 'observe', label: 'Notice', mfOrder: 1, tools: ['notice-and-name', 'five-senses'] },
    ];
    if (query.includes('HAS_SKILL_PRACTICE')) return [
      { skillId: 'observe', sessionKey: 'u1:s1', practiceId: 'notice-and-name', at, offPhone: false, source: 'in_app' },
      { skillId: 'describe', sessionKey: 'u1:s1', practiceId: 'notice-and-name', at, offPhone: false, source: 'in_app' },
    ];
    if (query.includes("type: 'practice_daily'")) return [{ pending: true }];
    return [];
  });
  setDriver(f.driver);
  const r = await fns.getPracticeHome.run({ auth: { uid: 'u1' }, data: {} });
  assert.deepEqual(r.skills.map((s) => [s.id, s.reps]), [['observe', 1], ['describe', 1]]);
  assert.equal(r.weekReps, 1, 'one visit, one rep on the ring');
  assert.deepEqual(r.recentTools, ['notice-and-name']);
  assert.equal(r.dailyPending, true);
  for (const c of f.calls.filter((c) => c.params && 'uid' in c.params)) assert.equal(c.params.uid, 'u1');
  const daily = f.calls.find((c) => c.query.includes("type: 'practice_daily'"));
  assert.match(daily.query, /f\.dueAt > datetime\(\) - duration\(\{hours: 12\}\)/, 'a stale card never blocks the next');
});

test('getPracticeHome: signed out is refused', async () => {
  await assert.rejects(() => fns.getPracticeHome.run({ data: {} }), /unauthenticated|logged in/i);
});
