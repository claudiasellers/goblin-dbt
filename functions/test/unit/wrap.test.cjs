'use strict';
/** PR-S4: wrapping the four existing session types (OA FollowUp mirror, DEAR MAN id, rep overrides). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const OA = '12345678-1234-4234-8234-123456789012';

const oaBase = () => ({
  id: OA, schemaVersion: 2, contentVersion: 'oa-guided-v2', emotionId: 'anxious', parentId: 'fear', urgeId: 'fear-avoid',
  urgeLabel: 'Avoid it entirely', customUrge: '', situation: '', observation: '', interpretation: '', goal: 'progress',
  safety: 'safe', facts: 'excessive', effectiveness: 'unhelpful', urgeBefore: 8, urgeAfterBody: 6, urgeAfter: null,
  intensityBefore: null, intensityAfter: null, bodyCues: ['Drop your shoulders away from your ears'], actionSize: 'small', action: 'Stay in the room 2 more minutes',
  cueId: 'today', cue: 'At the next opportunity today', dueAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  barrier: '', backup: '', status: 'planned', outcome: '', missedReason: '', reflection: '', sourceIds: [],
});

function oaDriver(existingStatus = null) {
  return fakeDriver((q) => {
    if (/OppositeActionFlow \{id: 'opposite_action_flow', version: \$contentVersion\}/.test(q)) {
      return [{ applicable: true, urgeId: 'fear-avoid', flow: JSON.stringify({ routes: { 'excessive:unhelpful': 'opposite' }, sourceIds: [] }) }];
    }
    if (/RETURN s\.status AS status/.test(q)) return existingStatus ? [{ status: existingStatus }] : [];
    return [];
  });
}

test('an OA plan is mirrored as FollowUp oa_plan in the same transaction', async () => {
  const f = oaDriver();
  setDriver(f.driver);
  await fns.saveOppositeActionSession.run({ auth: auth(), data: oaBase() });
  const mirror = f.calls.find((c) => /MERGE \(f:FollowUp \{key: \$key\}\)/.test(c.query));
  assert.ok(mirror, 'mirror query ran');
  assert.match(mirror.query, /f\.type = 'oa_plan'/);
  assert.match(mirror.query, /MERGE \(f\)-\[:DETAIL\]->\(s\)/);
  assert.match(mirror.query, /WHEN 'planned' THEN 'scheduled'[\s\S]*WHEN 'partial' THEN 'partly'[\s\S]*ELSE 'didnt'/);
  assert.deepEqual([mirror.params.key, mirror.params.status], [`u1:${OA}`, 'planned']);
  assert.equal(f.sessions.length, 1, 'one transaction');
});

test('practiced and missed map through (OA stays the source of truth)', async () => {
  let f = oaDriver('planned');
  setDriver(f.driver);
  await fns.saveOppositeActionSession.run({ auth: auth(), data: { ...oaBase(), status: 'practiced', urgeAfter: 2, outcome: 'partial' } });
  let m = f.calls.find((c) => /FollowUp \{key: \$key\}/.test(c.query));
  assert.deepEqual([m.params.status, m.params.outcome], ['practiced', 'partial']);
  f = oaDriver('planned');
  setDriver(f.driver);
  await fns.saveOppositeActionSession.run({ auth: auth(), data: { ...oaBase(), status: 'missed', missedReason: 'no_moment' } });
  m = f.calls.find((c) => /FollowUp \{key: \$key\}/.test(c.query));
  assert.deepEqual([m.params.status, m.params.missedReason], ['missed', 'no_moment']);
});

test('saveDearManSession returns its id (the ToolSession links to it)', async () => {
  setDriver(fakeDriver((q) => (/RETURN s\.id AS id/.test(q) ? [{ id: 'dm-1' }] : [])).driver);
  assert.deepEqual(await fns.saveDearManSession.run({ auth: auth(), data: { type: 'prep' } }), { success: true, id: 'dm-1' });
});

function closeDriver() {
  return fakeDriver((q) => {
    if (/AS open/.test(q)) return [{ open: true, closeKind: 'regulation_down', practiced: true, reps: [], toolId: 'find-the-feeling', followUps: [] }];
    if (/RETURN collect\(sp\.id\) AS ids/.test(q)) return [{ ids: ['r'] }];
    return [];
  });
}
const TS = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';

test('rep overrides: absent = defaultFor; [] = no rep (FTF without a word, an OA plan); ids = those skills', async () => {
  let f = closeDriver();
  setDriver(f.driver);
  assert.deepEqual((await fns.closeToolSession.run({ auth: auth(), data: { id: TS, status: 'completed' } })).skillPracticeIds, ['r']);
  assert.equal(f.calls.at(-1).params.skillIds, null);
  f = closeDriver();
  setDriver(f.driver);
  assert.deepEqual((await fns.closeToolSession.run({ auth: auth(), data: { id: TS, status: 'completed', skillIds: [] } })).skillPracticeIds, []);
  assert.ok(!f.calls.some((c) => /MERGE \(sp:SkillPractice/.test(c.query)), 'no rep query');
  f = closeDriver();
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: TS, status: 'completed', skillIds: ['stop', 'sigh'], repSource: 'followup_offphone' } });
  assert.deepEqual([f.calls.at(-1).params.skillIds, f.calls.at(-1).params.offPhone, f.calls.at(-1).params.logged], [['stop', 'sigh'], true, 'self_report']);
});
