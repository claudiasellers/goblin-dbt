'use strict';
/**
 * Behaviour pins, one or two per domain, run against the fake driver. These describe today's
 * behaviour (including known bugs the plan fixes later, e.g. PR-C1's saveCheckIn rewrite); a
 * change here should be a deliberate part of the PR that changes the behaviour.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver, neo4jError } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const auth = (uid = 'user-1') => ({ uid, token: { email: `${uid}@example.test` } });
const quiet = async (fn) => {
  const orig = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = orig; }
};

test.after(() => setDriver(null));

test('saveCheckIn takes the user id from auth, never from the payload, and always returns an id', async () => {
  const f = fakeDriver((q) => (/RETURN .* AS open/s.test(q) ? [{ open: true }] : []));
  setDriver(f.driver);
  const out = await fns.saveCheckIn.run({
    auth: auth('real-user'),
    data: { emotion: 'anxious', quadrant: 'high-unpleasant', userId: 'someone-else', bodySensations: [] },
  });
  assert.match(out.id, /^[0-9a-f-]{36}$/, 'PR-C1: non-empty even without body data (F3)');
  assert.ok(f.calls.every((c) => !('userId' in c.params) || c.params.userId === 'real-user'));
  assert.equal(f.calls[0].params.uid, 'real-user');
  assert.equal(f.calls[0].params.key, `real-user:${out.id}`);
  assert.ok(f.allClosed());
});

test('saveCheckIn rejects a payload without emotion or quadrant before any query', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  await assert.rejects(fns.saveCheckIn.run({ auth: auth(), data: { emotion: 'anxious' } }), (e) => e.code === 'invalid-argument');
  assert.equal(f.calls.length, 0);
});

test('getStateAndTools answers high-pleasant with positive_state without querying', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  const out = await fns.getStateAndTools.run({ auth: auth(), data: { quadrant: 'high-pleasant', emotionIds: ['joyful'] } });
  assert.equal(out.pattern.id, 'positive_state');
  assert.equal(f.calls.length, 0);
});

test('saveOppositeActionSession rejects an invalid payload as invalid-argument before any query', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  await assert.rejects(
    fns.saveOppositeActionSession.run({ auth: auth(), data: { id: 'not-a-uuid', schemaVersion: 2 } }),
    (e) => e.code === 'invalid-argument',
  );
  assert.equal(f.calls.length, 0);
});

test('getOppositeActionSessions rejects limit 0', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  await assert.rejects(fns.getOppositeActionSessions.run({ auth: auth(), data: { limit: 0 } }), (e) => e.code === 'invalid-argument');
  assert.equal(f.calls.length, 0);
});

test('saveInvalidationRecoverySession maps a uniqueness-constraint race to already-exists', async () => {
  const f = fakeDriver(() => neo4jError('Neo.ClientError.Schema.ConstraintValidationFailed'));
  setDriver(f.driver);
  const data = {
    schemaVersion: 1, id: '3f2c9a0e-1b2c-4d5e-8f90-123456789abc', contentVersion: 'recovery-v1',
    stateId: 'brushed', pull: 'fight', gate: 'downshift', emotionId: 'hurt', needId: 'heard',
    exitId: 'ask', zone: 'both', safe: 'yes', asks: 1, startIntensity: 8, startUrge: 9,
    readings: [8, 6, 4, 3], endIntensity: 3, endUrge: 2,
    skills: ['stop', 'sigh'], followUps: ['tomorrow'],
  };
  await quiet(() => assert.rejects(
    fns.saveInvalidationRecoverySession.run({ auth: auth(), data }),
    (e) => e.code === 'already-exists',
  ));
  assert.equal(f.calls.length, 1);
  assert.ok(f.allClosed());
});

test('updateUserProfile rejects an unknown palette before any query', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  await assert.rejects(
    fns.updateUserProfile.run({ auth: auth(), data: { palette: 'neon-dreams' } }),
    (e) => e.code === 'invalid-argument',
  );
  assert.equal(f.calls.length, 0);
});

test('a failing query surfaces as internal and still closes the session', async () => {
  const f = fakeDriver(() => neo4jError('Neo.TransientError.General.DatabaseUnavailable'));
  setDriver(f.driver);
  await quiet(() => assert.rejects(fns.getCheckInsByUser.run({ auth: auth(), data: {} }), (e) => e.code === 'internal'));
  assert.ok(f.allClosed());
});
