'use strict';
/**
 * Tier-2 golden suite: fixed calls against the emulators + a loaded local graph, compared with
 * __golden__/*.json after normalising ids and timestamps. Not part of `npm test`.
 *
 *   npm run graph:test:up && npm run graph:test:load        # local Neo4j with the schema
 *   cp functions/.secret.local.example functions/.secret.local
 *   UPDATE_GOLDEN=1 npm run test:emulator                   # record (then commit __golden__/)
 *   npm run test:emulator                                   # compare
 *
 * Goldens describe the graph they were recorded on (R5): A1-1 records them on a graph loaded
 * like live (old loader, twice), A1-4 re-records them on the converted, deduplicated schema.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { signUp, call, outcome, normalise } = require('./helpers.cjs');

const DIR = path.join(__dirname, '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

function golden(name, actual) {
  const file = path.join(DIR, `${name}.json`);
  const text = JSON.stringify(actual, null, 2) + '\n';
  if (UPDATE) { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(file, text); return; }
  assert.ok(fs.existsSync(file), `missing golden ${name}.json: record with UPDATE_GOLDEN=1 npm run test:emulator`);
  assert.equal(text, fs.readFileSync(file, 'utf8'), `golden ${name} changed`);
}

const STATE_INPUTS = {
  'high-unpleasant-anxious': { quadrant: 'high-unpleasant', emotions: ['anxious'] },
  'high-unpleasant-panic-related': { quadrant: 'high-unpleasant', emotions: ['panic', 'overwhelm'] },
  'low-unpleasant-lonely': { quadrant: 'low-unpleasant', emotions: ['lonely'] },
  'low-unpleasant-numb-related': { quadrant: 'low-unpleasant', emotions: ['numbness', 'emptiness'] },
  'high-pleasant-excited': { quadrant: 'high-pleasant', emotions: ['excited'] },
  'low-pleasant-calm': { quadrant: 'low-pleasant', emotions: ['calm'] },
};

test('content and recommendation callables (public)', async (t) => {
  for (const [name, input] of Object.entries(STATE_INPUTS)) {
    await t.test(`getStateAndTools ${name}`, async () => golden(`getStateAndTools.${name}`, normalise(await outcome('getStateAndTools', input))));
  }
  for (const q of ['high-unpleasant', 'low-unpleasant']) {
    await t.test(`getDiscriminatingQuestions ${q}`, async () => golden(`getDiscriminatingQuestions.${q}`, normalise(await outcome('getDiscriminatingQuestions', { quadrant: q }))));
  }
  await t.test('getRelatedEmotions', async () => golden('getRelatedEmotions.anxiety', normalise(await outcome('getRelatedEmotions', { emotionId: 'anxiety', quadrant: 'high-unpleasant' }))));
  const content = {
    'getOppositeActionContent.anger': ['getOppositeActionContent', { emotionIds: ['anger'] }],
    'getDearManContent': ['getDearManContent', {}],
    'getDearManDebriefContent': ['getDearManDebriefContent', {}],
    'getProblemSolveContent.sadness': ['getProblemSolveContent', { emotionIds: ['sadness'] }],
    'getInvalidationRecoveryContent': ['getInvalidationRecoveryContent', {}],
    'getFindTheFeelingContent': ['getFindTheFeelingContent', {}],
  };
  for (const [g, [fn, data]] of Object.entries(content)) {
    await t.test(g, async () => golden(g, normalise(await outcome(fn, data))));
  }
});

test('user lifecycle and sessions (authed)', async (t) => {
  const email = `golden-${Date.now()}@example.test`;
  const { idToken, uid } = await signUp(email);
  const ctx = { uid, email };
  const step = async (g, fn, data = {}) => {
    const out = normalise(await outcome(fn, data, idToken), ctx);
    golden(g, out);
    return out;
  };

  await t.test('ensureUserExists', () => step('user.ensureUserExists', 'ensureUserExists'));
  await t.test('saveCheckIn (no body data)', () => step('user.saveCheckIn.noBody', 'saveCheckIn', {
    emotion: 'anxious', quadrant: 'high-unpleasant', intensity: { x: 0.6, y: 0.7 }, bodySensations: [], note: '',
    timestamp: '2026-09-30T10:00:00.000Z', activationPatternId: 'acute_alarm', confidence: 0.5,
  }));
  await t.test('saveCheckIn (with body data)', () => step('user.saveCheckIn.body', 'saveCheckIn', {
    emotion: 'lonely', quadrant: 'low-unpleasant', intensity: { x: -0.4, y: -0.5 },
    bodySensations: [{ x: 0.5, y: 0.3, region: 'chest', intensity: { x: 0.2, y: 0.4 }, tags: ['heavy'] }],
    note: '', timestamp: '2026-09-30T11:00:00.000Z', activationPatternId: 'conservation_freeze', confidence: 0.4,
  }));
  await t.test('getCheckInsByUser', () => step('user.getCheckInsByUser', 'getCheckInsByUser', { limit: 10 }));
  await t.test('trackToolUsage', () => step('user.trackToolUsage', 'trackToolUsage', { toolId: 'cool-down' }));
  await t.test('recordToolOutcome', () => step('user.recordToolOutcome', 'recordToolOutcome', { outcome: 'somewhat' }));
  await t.test('getUserProfile', () => step('user.getUserProfile', 'getUserProfile'));
  await t.test('updateUserProfile', () => step('user.updateUserProfile', 'updateUserProfile', { theme: 'dark' }));
  await t.test('saveDearManSession', () => step('user.saveDearManSession', 'saveDearManSession', {
    type: 'prep', relationshipType: 'friend', situationType: 'ask', priorities: [], barriers: [], barriersCustom: '',
    describeId: null, describeCustom: '', feelings: [], assertId: null, assertIds: [], assertDetails: {}, assertCustom: '',
    reinforceIds: [], anchorPhrase: '', middleGroundId: null, middleGroundCustom: '', walkAwayId: null, walkAwayCustom: '',
    debriefOverall: null, debriefWentWell: [], debriefToChange: [], debriefCurrentFeelings: [],
  }));
  await t.test('getDearManSessions', () => step('user.getDearManSessions', 'getDearManSessions', { limit: 5 }));
  await t.test('saveInvalidationRecoverySession', () => step('user.saveInvalidationRecoverySession', 'saveInvalidationRecoverySession', {
    schemaVersion: 1, id: '3f2c9a0e-1b2c-4d5e-8f90-123456789abc', contentVersion: 'recovery-v1',
    stateId: 'brushed', pull: 'fight', gate: 'downshift', emotionId: 'hurt', needId: 'heard',
    exitId: 'ask', zone: 'both', safe: 'yes', asks: 1, startIntensity: 8, startUrge: 9,
    readings: [8, 6, 4, 3], endIntensity: 3, endUrge: 2, skills: ['stop', 'sigh'], followUps: ['tomorrow'],
  }));
  await t.test('getInvalidationRecoveryProgress', () => step('user.getInvalidationRecoveryProgress', 'getInvalidationRecoveryProgress'));
  await t.test('getOppositeActionSessions', () => step('user.getOppositeActionSessions', 'getOppositeActionSessions', { limit: 5 }));
  await t.test('getOppositeActionFollowUps', () => step('user.getOppositeActionFollowUps', 'getOppositeActionFollowUps'));
  await t.test('getFeelingCollection', () => step('user.getFeelingCollection', 'getFeelingCollection'));
  await t.test('getInsightsData', () => step('user.getInsightsData', 'getInsightsData', { timeRange: '30d' }));
  await t.test('exportUserData', () => step('user.exportUserData', 'exportUserData'));
  await t.test('deleteUserData', () => step('user.deleteUserData', 'deleteUserData', { deleteAuth: false }));
  await t.test('getCheckInsByUser after delete', () => step('user.getCheckInsByUser.afterDelete', 'getCheckInsByUser', { limit: 10 }));
  await t.test('unauthenticated call is rejected', async () => {
    await assert.rejects(call('getCheckInsByUser', {}), (e) => e.status === 'UNAUTHENTICATED');
  });
});
