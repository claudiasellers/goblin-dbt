'use strict';
/**
 * Pins which callables require sign-in. A request without `auth` must be rejected with
 * `unauthenticated` (before any query) by exactly the AUTHED set, and never by the PUBLIC set.
 * Tightening a public callable (E4-3 puts requireUid on getStateAndTools) is a deliberate edit here.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const AUTHED = [
  'deleteUserData', 'ensureUserExists', 'exportUserData', 'getCheckInsByUser',
  'getDearManSessions', 'getFeelingCollection', 'getInsightsData', 'getInvalidationRecoveryProgress',
  'getOppositeActionFollowUps', 'getOppositeActionSession', 'getOppositeActionSessions', 'getUserProfile',
  'recordToolOutcome', 'saveCheckIn', 'setCheckInNextAction',
  'startToolSession', 'closeToolSession', 'recordToolSession',
  'saveDearManSession', 'saveFindTheFeelingSession', 'saveInvalidationRecoverySession',
  'saveOppositeActionSession', 'trackToolUsage', 'updateUserProfile',
];
const PUBLIC = [
  'getDearManContent', 'getDearManDebriefContent', 'getDearManReflection', 'getDiscriminatingQuestions',
  'getFindTheFeelingContent', 'getInvalidationRecoveryContent', 'getOppositeActionContent',
  'getProblemSolveContent', 'getRelatedEmotions', 'getStateAndTools', 'getCapacityContent', 'getSpineContent',
];

// Background triggers (not callables): auth lifecycle events carry their own uid.
const TRIGGERS = ['onUserCreated', 'onUserDeleted'];

const { fns, setDriver } = loadFunctions();

test('the matrix covers every export exactly once', () => {
  assert.deepEqual([...AUTHED, ...PUBLIC, ...TRIGGERS].sort(), Object.keys(fns).sort());
  assert.equal(new Set([...AUTHED, ...PUBLIC, ...TRIGGERS]).size, AUTHED.length + PUBLIC.length + TRIGGERS.length);
});

for (const name of AUTHED) {
  test(`${name} rejects an unauthenticated request before touching Neo4j`, async () => {
    const f = fakeDriver(() => []);
    setDriver(f.driver);
    await assert.rejects(fns[name].run({ data: {} }), (e) => e.code === 'unauthenticated');
    assert.equal(f.calls.length, 0);
    assert.equal(f.sessions.length, 0);
  });
}

for (const name of PUBLIC) {
  test(`${name} does not require sign-in`, async () => {
    const f = fakeDriver(() => []);
    setDriver(f.driver);
    // Empty graph answers may make a content callable fail (internal / not-found / invalid-argument);
    // what is pinned is that it never fails for lack of auth.
    try { await fns[name].run({ data: {} }); } catch (e) { assert.notEqual(e.code, 'unauthenticated', `${name}: ${e.message}`); }
  });
}

test.after(() => setDriver(null));
