'use strict';
/** functions/src/shared/*: the helpers new callables are built from (A1-3). */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { fakeDriver, neo4jError } = require('./fakeDriver.cjs');
const endpoints = require('../fixtures/endpoints.json');

const LIB = path.resolve(__dirname, '../../lib/shared');
const v = require(path.join(LIB, 'validate.js'));
const { invalid, parseOrInvalid, toHttpsError } = require(path.join(LIB, 'errors.js'));
const { requireUid } = require(path.join(LIB, 'auth.js'));
const { callable } = require(path.join(LIB, 'callable.js'));
const db = require(path.join(LIB, 'neo4j.js'));

const quiet = async (fn) => {
  const orig = console.error;
  const logged = [];
  console.error = (...a) => logged.push(a);
  try { await fn(); } finally { console.error = orig; }
  return logged;
};
const isValidation = (e) => e instanceof v.ValidationError;

test.after(() => db.setDriverForTesting(null));

test('validate: obj / str / optStr', () => {
  assert.deepEqual(v.obj({ a: 1 }), { a: 1 });
  for (const bad of [null, undefined, [], 'x', 3]) assert.throws(() => v.obj(bad), isValidation);
  assert.equal(v.str('hi'), 'hi');
  assert.throws(() => v.str(''), isValidation);
  assert.throws(() => v.str('x'.repeat(1001)), isValidation);
  assert.throws(() => v.str(3), isValidation);
  assert.equal(v.str('ab', { min: 2, max: 2, pattern: /^a/ }), 'ab');
  assert.throws(() => v.str('ba', { pattern: /^a/ }), isValidation);
  assert.equal(v.optStr(undefined), null);
  assert.equal(v.optStr(''), null);
  assert.equal(v.optStr(null), null);
  assert.equal(v.optStr('x', { max: 1 }), 'x');
  assert.throws(() => v.optStr('xy', { max: 1 }), isValidation);
});

test('validate: ids', () => {
  for (const ok of ['anxiety', 'dbt_tipp', 'cool-down', '5-4-3-2-1']) assert.equal(v.graphId(ok), ok);
  for (const bad of ['Anxiety', '_x', '', 'a b', 'x'.repeat(101), "x'); DROP", null]) assert.throws(() => v.graphId(bad), isValidation);
  assert.equal(v.uuid('3f2c9a0e-1b2c-4d5e-8f90-123456789abc'), '3f2c9a0e-1b2c-4d5e-8f90-123456789abc');
  for (const bad of ['3f2c9a0e', 'z'.repeat(36), 42]) assert.throws(() => v.uuid(bad), isValidation);
});

test('validate: oneOf / strArray / intIn / isoDateTime', () => {
  assert.equal(v.oneOf('b', ['a', 'b']), 'b');
  assert.throws(() => v.oneOf('c', ['a', 'b']), isValidation);
  assert.throws(() => v.oneOf(1, ['a']), isValidation);
  assert.deepEqual(v.strArray(['a', 'b']), ['a', 'b']);
  assert.deepEqual(v.strArray(['fear'], { item: v.graphId }), ['fear']);
  assert.throws(() => v.strArray(['Fear'], { item: v.graphId }), isValidation);
  assert.throws(() => v.strArray(['a', 'b'], { max: 1 }), isValidation);
  assert.throws(() => v.strArray('a'), isValidation);
  assert.equal(v.intIn(3, { min: 1, max: 3 }), 3);
  for (const bad of [0, 4, 1.5, '2', NaN]) assert.throws(() => v.intIn(bad, { min: 1, max: 3 }), isValidation);
  assert.equal(v.isoDateTime('2026-09-30T10:00:00.000Z'), '2026-09-30T10:00:00.000Z');
  assert.equal(v.isoDateTime('2026-09-30T10:00+02:00'), '2026-09-30T10:00+02:00');
  for (const bad of ['2026-09-30', '2026-13-45T99:00:00Z', 'yesterday', 0]) assert.throws(() => v.isoDateTime(bad), isValidation);
});

test('validation messages never echo the value', () => {
  const secret = 'my private therapy note';
  for (const fn of [() => v.graphId(secret), () => v.oneOf(secret, ['a']), () => v.str(secret, { max: 3 }), () => v.isoDateTime(secret)]) {
    assert.throws(fn, (e) => isValidation(e) && !e.message.includes(secret));
  }
});

test('errors: invalid, parseOrInvalid, toHttpsError', async () => {
  assert.equal(invalid().code, 'invalid-argument');
  assert.equal(parseOrInvalid(() => 5, 'bad'), 5);
  assert.throws(() => parseOrInvalid(() => v.graphId('X'), 'Invalid emotion'), (e) => e.code === 'invalid-argument' && e.message === 'Invalid emotion');
  assert.throws(() => parseOrInvalid(() => { throw new TypeError('boom'); }, 'x'), TypeError);

  const h = invalid('keep');
  assert.equal(toHttpsError(h, { message: 'm', label: 'l' }), h);
  assert.equal(toHttpsError(new v.ValidationError('Expected a list'), { message: 'm', label: 'l' }).code, 'invalid-argument');
  assert.equal(toHttpsError(neo4jError('Neo.ClientError.Schema.ConstraintValidationFailed'), { message: 'm', label: 'l' }).code, 'already-exists');
  let mapped;
  const logged = await quiet(async () => { mapped = toHttpsError(Object.assign(new Error('payload: my note'), { code: 'Neo.X' }), { message: 'Could not save', label: 'saveThing' }); });
  assert.equal(mapped.code, 'internal');
  assert.equal(mapped.message, 'Could not save');
  assert.deepEqual(logged, [['saveThing', 'Neo.X']], 'logs label + code only');
  const logged2 = await quiet(async () => { toHttpsError(new Error('x'), { message: 'm', label: 'l' }); });
  assert.deepEqual(logged2, [['l', 'unknown']]);
});

test('auth: requireUid', () => {
  assert.equal(requireUid({ auth: { uid: 'u1' }, data: {} }), 'u1');
  assert.throws(() => requireUid({ data: {} }), (e) => e.code === 'unauthenticated' && e.message === 'User must be logged in');
  assert.throws(() => requireUid({ data: {} }, 'Sign in to save'), (e) => e.message === 'Sign in to save');
});

test('withSession closes the session when fn throws; readTx / writeTx use managed transactions', async () => {
  const f = fakeDriver(() => [{ n: 1 }]);
  db.setDriverForTesting(f.driver);
  await assert.rejects(db.withSession(async () => { throw new Error('boom'); }), /boom/);
  assert.equal(f.sessions.length, 1);
  assert.ok(f.allClosed());

  const out = await db.readTx(async (tx) => (await tx.run('RETURN 1 AS n')).records[0].get('n'));
  assert.equal(out, 1);
  assert.equal(f.sessions[1].config.defaultAccessMode, 'READ');
  await db.writeTx(async (tx) => tx.run('RETURN 1 AS n'));
  assert.equal(f.sessions[2].config.defaultAccessMode, 'WRITE');
  assert.ok(f.allClosed());
});

test('callable: same deploy manifest as the existing callables, auth enforced, errors mapped', async () => {
  const authed = callable({ auth: 'required', label: 'probe' }, async ({ uid, data }) => ({ uid, data }));
  const open = callable({ auth: 'public', label: 'probe' }, async ({ uid }) => ({ uid }));
  const failing = callable({ auth: 'public', label: 'probe', errorMessage: 'Could not load' }, async () => { throw new Error('x'); });
  const invalidInput = callable({ auth: 'public', label: 'probe' }, async ({ data }) => v.graphId(data.id));

  assert.deepEqual(JSON.parse(JSON.stringify(authed.__endpoint)), endpoints.saveCheckIn);
  assert.deepEqual(JSON.parse(JSON.stringify(open.__endpoint)), endpoints.getStateAndTools);

  assert.deepEqual(await authed.run({ auth: { uid: 'u1' }, data: { a: 1 } }), { uid: 'u1', data: { a: 1 } });
  await assert.rejects(authed.run({ data: {} }), (e) => e.code === 'unauthenticated');
  assert.deepEqual(await open.run({ data: {} }), { uid: null });
  await quiet(() => assert.rejects(failing.run({ data: {} }), (e) => e.code === 'internal' && e.message === 'Could not load'));
  await assert.rejects(invalidInput.run({ data: { id: 'NOPE' } }), (e) => e.code === 'invalid-argument');
});
