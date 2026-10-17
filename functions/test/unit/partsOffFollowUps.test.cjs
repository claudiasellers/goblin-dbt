'use strict';
/**
 * Parts follow-ups through spine's generic callables while parts are off (parts-off-followups):
 * scheduleFollowUp, resolveFollowUp and snoozeFollowUp answer not-found, the same as a missing or
 * someone else's follow-up, and write nothing. Parts on, and every other type, are unchanged.
 * Also: account/ logs an error's code and name only.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');
const { PARTS_FOLLOW_UP_TYPES, isPartsFollowUpType } = require('../../lib/parts/followUpTypes');
const SP = require('../../lib/spine/followUp');
const { errorTag } = require('../../lib/shared/errors');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const inH = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
const notFound = (e) => e.code === 'not-found' && e.message === 'Follow-up not found';
const writes = (f) => f.calls.filter((c) => /\b(MERGE|SET|DELETE)\b/.test(c.query));

test('the parts follow-up types', () => {
  assert.deepEqual([...PARTS_FOLLOW_UP_TYPES], ['part_checkback', 'two_pulls_checkback']);
  assert.ok(isPartsFollowUpType('part_checkback') && !isPartsFollowUpType('recover_log') && !isPartsFollowUpType(null));
  assert.deepEqual([...require('../../lib/parts/delete').PARTS_FOLLOW_UP_TYPES], [...PARTS_FOLLOW_UP_TYPES], 'one list');
});

// ------------------------------------------------------------------ scheduleFollowUp

for (const type of PARTS_FOLLOW_UP_TYPES) {
  test(`scheduleFollowUp: ${type} with parts off is not-found, before any write`, async () => {
    const f = fakeDriver((q) => (q === SP.FOLLOW_UP_PARTS_ON_QUERY ? [{ partsOn: false }] : new Error('unexpected')));
    setDriver(f.driver);
    await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type, dueAt: inH(20) } }), notFound);
    assert.deepEqual(writes(f), []);
    // A batch with one parts item among others: the whole batch is refused.
    const g = fakeDriver((q) => (q === SP.FOLLOW_UP_PARTS_ON_QUERY ? [] : new Error('unexpected')));
    setDriver(g.driver);
    await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { items: [
      { id: ID, type: 'recover_log', dueAt: inH(20) }, { id: '4f2c9a0e-1b2c-4d5e-8f90-123456789abc', type, dueAt: inH(20) },
    ] } }), notFound, 'no User node: off');
    assert.deepEqual(writes(g), []);
  });
}

test('scheduleFollowUp: parts on schedules as before; other types never read the setting', async () => {
  const f = fakeDriver((q) => {
    if (q === SP.FOLLOW_UP_PARTS_ON_QUERY) return [{ partsOn: true }];
    if (/RETURN collect\(f\.id\) AS ids/.test(q)) return [{ ids: [ID] }];
    return [];
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'part_checkback', dueAt: inH(20) } }), { ids: [ID] });
  const g = fakeDriver((q) => (/RETURN collect\(f\.id\) AS ids/.test(q) ? [{ ids: [ID] }] : []));
  setDriver(g.driver);
  assert.deepEqual(await fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'recover_log', dueAt: inH(20) } }), { ids: [ID] });
  assert.ok(!g.calls.some((c) => c.query === SP.FOLLOW_UP_PARTS_ON_QUERY));
});

// ------------------------------------------------------------------ resolveFollowUp

const resolveDriver = (row) => fakeDriver((q) => (/AS open/.test(q) ? [{ status: 'scheduled', open: true, content: '{}', ...row }] : []));

test('resolveFollowUp: a parts follow-up with parts off is not-found (ahead of "Answered in parts"), nothing written', async () => {
  for (const type of PARTS_FOLLOW_UP_TYPES) {
    const f = resolveDriver({ type, partsOn: false });
    setDriver(f.driver);
    await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'done' } }), notFound, type);
    assert.equal(f.calls.length, 1, `${type}: the head read only`);
    assert.match(f.calls[0].query, /coalesce\(u\.partsEnabled, false\) AS partsOn/);
  }
  // Parts on: the check-back is still parts' own to answer.
  setDriver(resolveDriver({ type: 'part_checkback', partsOn: true }).driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'done' } }), (e) => e.code === 'failed-precondition');
  // Another parts type, parts on: resolved, and the write repeats the condition.
  const f = resolveDriver({ type: 'two_pulls_checkback', partsOn: true });
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'dismissed' } }), { next: null, status: 'dismissed' });
  const w = f.calls[1];
  assert.match(w.query, /AND \(NOT f\.type IN \$partsTypes OR coalesce\(u\.partsEnabled, false\)\)\s+SET f\.status = \$status/);
  assert.deepEqual(w.params.partsTypes, [...PARTS_FOLLOW_UP_TYPES]);
});

test('resolveFollowUp: other types never read the setting off the record', async () => {
  // The strict fake record has no partsOn: reading it would throw.
  setDriver(fakeDriver((q) => (/AS open/.test(q) ? [{ type: 'recover_log', status: 'scheduled', open: true, content: '{}' }] : [])).driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'done' } }), { next: null, status: 'done' });
});

// ------------------------------------------------------------------ snoozeFollowUp

test('snoozeFollowUp: a parts follow-up with parts off is not-found, nothing written; on, or another type, snoozes', async () => {
  for (const type of PARTS_FOLLOW_UP_TYPES) {
    const f = fakeDriver((q) => (q === SP.SNOOZE_HEAD_QUERY ? [{ type, partsOn: false }] : []));
    setDriver(f.driver);
    await assert.rejects(fns.snoozeFollowUp.run({ auth: auth(), data: { id: ID, until: inH(3) } }), notFound, type);
    assert.ok(!f.calls.some((c) => c.query === SP.SNOOZE_QUERY), `${type}: no write`);
  }
  for (const row of [{ type: 'part_checkback', partsOn: true }, { type: 'recover_log', partsOn: false }]) {
    const f = fakeDriver((q) => (q === SP.SNOOZE_HEAD_QUERY ? [row] : []));
    setDriver(f.driver);
    assert.deepEqual(await fns.snoozeFollowUp.run({ auth: auth('u5'), data: { id: ID, until: inH(3) } }), { ok: true });
    const w = f.calls.find((c) => c.query === SP.SNOOZE_QUERY);
    assert.deepEqual([w.params.key, w.params.partsTypes], [`u5:${ID}`, [...PARTS_FOLLOW_UP_TYPES]]);
  }
  assert.match(SP.SNOOZE_QUERY, /WHERE f\.status = 'scheduled' AND \(NOT f\.type IN \$partsTypes OR coalesce\(u\.partsEnabled, false\)\)/,
    'the write repeats the condition (a race with turning parts off)');
  assert.match(SP.SNOOZE_HEAD_QUERY, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_FOLLOW_UP\]->\(f:FollowUp \{key: \$key\}\)/, 'the caller\'s own, by key');
});

// ------------------------------------------------------------------ account logging

test('errorTag: code and name only, never the message', () => {
  const e = Object.assign(new Error('Property values can only be of primitive types: "my secret words"'), { code: 'Neo.ClientError.Statement.TypeError' });
  assert.deepEqual(errorTag(e), { code: 'Neo.ClientError.Statement.TypeError', name: 'Error' });
  assert.deepEqual(errorTag(null), { code: 'unknown', name: 'unknown' });
  assert.deepEqual(errorTag('a string'), { code: 'unknown', name: 'unknown' });
  assert.deepEqual(errorTag({ code: 42, name: { toString: () => 'x' } }), { code: '42', name: 'unknown' });
});

test('account/ never logs a caught error itself, only errorTag(...)', () => {
  const dir = path.resolve(__dirname, '../../src/account');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/console\.(?:error|warn|log|info)\(([^;]*)\);/g)) {
      const args = m[1].split(',').slice(1).map((a) => a.trim());
      for (const a of args) assert.match(a, /^errorTag\(\w+\)$/, `${f}: ${m[0]}`);
    }
  }
});

test('account callables: a failing driver logs the callable, code and name, never the message', async () => {
  const SECRET = 'my secret words';
  const err = Object.assign(new Error(`bad value "${SECRET}"`), { code: 'Neo.ClientError.Statement.SyntaxError' });
  const logged = [];
  const orig = { error: console.error, warn: console.warn };
  console.error = (...a) => logged.push(a);
  console.warn = (...a) => logged.push(a);
  try {
    for (const [name, data] of [['ensureUserExists', {}], ['getUserProfile', {}], ['updateUserProfile', { displayName: 'A' }], ['exportUserData', {}], ['deleteUserData', {}]]) {
      setDriver(fakeDriver(() => err).driver);
      await assert.rejects(fns[name].run({ auth: auth(), data }), (e) => e.code === 'internal', name);
    }
  } finally {
    console.error = orig.error;
    console.warn = orig.warn;
  }
  assert.ok(logged.length >= 5);
  for (const a of logged) {
    assert.doesNotMatch(JSON.stringify(a), new RegExp(SECRET), 'never the message');
    assert.ok(a.slice(1).every((x) => x && typeof x === 'object' && Object.keys(x).sort().join() === 'code,name'), JSON.stringify(a));
  }
  assert.ok(logged.some((a) => a[1].code === 'Neo.ClientError.Statement.SyntaxError'));
});
