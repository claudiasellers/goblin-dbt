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

test('saveInvalidationRecoverySession accepts an ask above askMax (IE-B4: never a lock) and still refuses deliberate caricature', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cypher = fs.readFileSync(path.join(__dirname, '../../../schema/invalidation-recovery.cypher'), 'utf8');
  const flowJson = JSON.parse(cypher.match(/f\.contentJson = (".*");/)[1]);
  const askMax = JSON.parse(flowJson).gates.askMax;
  const respond = (highRisk) => (q) => (/f\.contentJson AS flow/.test(q)
    ? [{ flow: flowJson, highRisk, lowArousal: false, knownSkills: 1 }]
    : /AS created/.test(q) ? [{ created: 1 }] : []);
  const data = {
    schemaVersion: 1, id: '3f2c9a0e-1b2c-4d5e-8f90-123456789abd', contentVersion: 'recovery-v1',
    stateId: 'brushed', pull: 'chase', gate: 'none', emotionId: 'hurt', needId: 'heard',
    exitId: 'ask', zone: 'both', safe: 'yes', asks: 0, startIntensity: 6, startUrge: 6,
    readings: [6, askMax + 2, askMax + 2], endIntensity: askMax + 2, endUrge: 5,
    skills: ['request'], followUps: [],
  };
  let f = fakeDriver(respond(false));
  setDriver(f.driver);
  assert.deepEqual(await fns.saveInvalidationRecoverySession.run({ auth: auth(), data }), { success: true }, 'a hot ask is saved');
  assert.ok(f.allClosed());
  f = fakeDriver(respond(true));
  setDriver(f.driver);
  await assert.rejects(
    fns.saveInvalidationRecoverySession.run({ auth: auth(), data: { ...data, zone: 'real' } }),
    (e) => e.code === 'invalid-argument',
    'deliberate caricature still refuses the ask',
  );
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
