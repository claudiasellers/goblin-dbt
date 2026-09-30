'use strict';
/**
 * PR-S1: generic export / delete over :UserData, Delete Account removes the Auth user (F2),
 * the onUserDeleted trigger, retention over log records (D-10), ownership labels on legacy writers.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const { setAuthAdminForTesting } = require(path.resolve(__dirname, '../../lib/shared/admin.js'));
const auth = (uid = 'user-1') => ({ uid, token: { email: `${uid}@example.test` } });

function authDouble() {
  const deleted = [];
  return { deleted, deleteUser: async (uid) => { deleted.push(uid); } };
}

test.after(() => { setDriver(null); setAuthAdminForTesting(null); });

test('deleteUserData deletes the whole :UserData subgraph in batches, the legacy labels, then the user', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  const a = authDouble();
  setAuthAdminForTesting(a);
  const out = await fns.deleteUserData.run({ auth: auth('u-del'), data: { deleteAuth: false } });
  assert.deepEqual(out, { success: true, authDeleted: false });
  assert.match(f.calls[0].query, /MATCH \(n:UserData \{ownerId: \$uid\}\)[\s\S]*IN TRANSACTIONS OF 500 ROWS/);
  assert.equal(f.calls[0].params.uid, 'u-del');
  const legacy = f.calls.slice(1, -1).map((c) => c.query).join('\n');
  for (const l of ['CheckIn', 'BodySensation', 'ToolUsage', 'OppositeActionSession', 'InvalidationRecoverySession', 'DearManSession', 'FindTheFeelingSession']) {
    assert.match(legacy, new RegExp(`:${l}\\b`), l);
  }
  assert.match(f.calls.at(-1).query, /MATCH \(u:User \{id: \$uid\}\) DETACH DELETE u/);
  assert.deepEqual(a.deleted, [], 'no Auth delete without deleteAuth');
  assert.ok(f.allClosed());
});

test('Delete Account (deleteAuth: true) removes the Firebase Auth user after the graph', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  const a = authDouble();
  setAuthAdminForTesting(a);
  const out = await fns.deleteUserData.run({ auth: auth('u-acct'), data: { deleteAuth: true } });
  assert.deepEqual(out, { success: true, authDeleted: true });
  assert.deepEqual(a.deleted, ['u-acct']);
});

test('an already-deleted Auth user is not an error; any other Auth failure is', async () => {
  setDriver(fakeDriver(() => []).driver);
  setAuthAdminForTesting({ deleteUser: async () => { const e = new Error('gone'); e.code = 'auth/user-not-found'; throw e; } });
  assert.deepEqual(await fns.deleteUserData.run({ auth: auth(), data: { deleteAuth: true } }), { success: true, authDeleted: true });
  setAuthAdminForTesting({ deleteUser: async () => { const e = new Error('boom'); e.code = 'auth/internal-error'; throw e; } });
  const orig = console.error; console.error = () => {};
  try {
    await assert.rejects(fns.deleteUserData.run({ auth: auth(), data: { deleteAuth: true } }), (e) => e.code === 'internal');
  } finally { console.error = orig; }
});

test('onUserDeleted runs the same graph delete for the deleted uid', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.onUserDeleted.run({ uid: 'console-deleted' }, {});
  assert.match(f.calls[0].query, /MATCH \(n:UserData \{ownerId: \$uid\}\)/);
  assert.ok(f.calls.every((c) => c.params.uid === 'console-deleted'));
  assert.ok(f.allClosed());
});

test('exportUserData adds formatVersion 2, records grouped by exportAs, and links with edge properties', async () => {
  const f = fakeDriver((q) => {
    if (/MATCH \(n:UserData \{ownerId: \$uid\}\) WHERE NOT n:System/.test(q)) {
      return [
        { labels: ['ToolSession', 'UserData', 'LogRecord'], props: { id: 't1', toolId: 'pause' } },
        { labels: ['CheckIn', 'UserData', 'LogRecord'], props: { id: 'c1', emotion: 'anxious' } },
        { labels: ['ProfileFact', 'UserData', 'ProfileItem'], props: { id: 'quiet_hours' } },
      ];
    }
    if (/UNION ALL/.test(q)) {
      return [
        { from: 'u:t1', type: 'FROM_CHECKIN', to: 'u:c1', props: {} },
        { from: 'user', type: 'FOUND_WORD', to: 'hurt', props: { count: 2 } },
      ];
    }
    return [];
  });
  setDriver(f.driver);
  const { data } = await fns.exportUserData.run({ auth: auth('u'), data: {} });
  assert.equal(data.formatVersion, 2);
  assert.deepEqual(Object.keys(data.records).sort(), ['checkIns', 'profileFacts', 'toolSessions']);
  assert.deepEqual(data.links[1], { from: 'user', type: 'FOUND_WORD', to: 'hurt', props: { count: 2 } });
  for (const k of ['checkIns', 'oppositeActionSessions', 'toolUsage', 'feelingCollection', 'profile']) assert.ok(k in data, `legacy key ${k}`);
  assert.ok(f.allClosed());
});

test('retention deletes log records only, never profile items (D-10)', async () => {
  const f = fakeDriver((q) => (/RETURN u \{\.\*\} AS user/.test(q) ? [{ user: { dataRetentionDays: 90 } }] : []));
  setDriver(f.driver);
  await fns.getUserProfile.run({ auth: auth(), data: {} });
  const retention = f.calls.map((c) => c.query).filter((q) => /DETACH DELETE/.test(q));
  assert.ok(retention.some((q) => /MATCH \(n:LogRecord \{ownerId: \$uid\}\)/.test(q)));
  assert.ok(retention.every((q) => !/ProfileItem/.test(q)));
});
