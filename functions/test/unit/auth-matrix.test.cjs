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
  'startToolSession', 'closeToolSession', 'recordToolSession', 'answerToolOutcome',
  'scheduleFollowUp', 'resolveFollowUp', 'snoozeFollowUp', 'getToday',
  'getProfileContext', 'getMe', 'upsertProfileFact', 'keepProfileItem', 'editProfileItem', 'deleteProfileItem',
  'confirmProfileItem', 'setAsideProfileItem',
  'restoreProfileItem', 'answerPatternOffer', 'recordWitnessBeat',
  'getPartsEntry', // reads the caller's own check-ins and Recover sessions
  'deleteMyParts', 'countMyPartsLines', // deletes (counts) the caller's own parts records
  'startPartSession', 'savePartSession', 'keepPart', 'queuePartCandidate',
  'answerPartCandidate', // the caller's own candidate (Me: "Not any more")
  'renamePart', 'restPart', 'setAsidePart', 'restorePart', 'setPartTender', 'answerPartRevisit',
  'tagPart',
  'sayToPart', // a message to the caller's own part
  'schedulePartCheckback', 'answerPartCheckback', 'setPartAnchor', 'setPartShape',
  'startPullsSession', 'savePullsSession', 'keepPullsKeepsake', 'schedulePullsCheckback', // Two pulls: the caller's own visit
  'getTrailOfferEvidence', 'answerTrailOffer', // the caller's own trail offer (Phase 4, built off)
  'getReflectTrails', 'answerKnownPartReview', 'removeTrailPattern', // Reflect: the caller's own rule D batch and plain patterns
  'getDen', 'getDenSnapshot', 'updatePartLayout', 'linkParts', 'unlinkParts', // the den: the caller's own parts and links
  'getPartStory', // a part's story: the caller's own part
  'saveDearManSession', 'saveFindTheFeelingSession', 'saveInvalidationRecoverySession',
  'saveOppositeActionSession', 'trackToolUsage', 'updateUserProfile',
  'getStateAndTools', // E4-3: requireUid (plan F9, D-12); every caller is signed in
];
const PUBLIC = [
  'getDearManContent', 'getDearManDebriefContent', 'getDearManReflection', 'getDiscriminatingQuestions',
  'getFindTheFeelingContent', 'getInvalidationRecoveryContent', 'getOppositeActionContent',
  'getProblemSolveContent', 'getRelatedEmotions', 'getCapacityContent', 'getWiseMindContent', 'getCopeAheadContent', 'getSpineContent', 'getBodyMapContent', 'suggestEmotionsFromBody',
  'getWitnessLines', // public content; reads the caller's own lines only when signed in
];

// Background triggers (not callables): auth lifecycle events carry their own uid; the daily retention job
// reads every user's own setting.
const TRIGGERS = ['onUserCreated', 'onUserDeleted', 'applyRetentionDaily'];

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
