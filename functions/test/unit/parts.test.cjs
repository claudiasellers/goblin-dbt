'use strict';
/**
 * Parts foundation: the entry gate (pure), getPartsEntry over a fake query layer and over the fake
 * driver (uid scoping, windows as parameters, nothing but the decision returned), and the
 * partsEnabled setting's round trip.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');
const { entryGate, resolveEntryPolicy, DEFAULT_ENTRY_POLICY } = require('../../lib/parts/gate');
const { getPartsEntryHandler } = require('../../lib/parts/handler');
const { POLICY_QUERY, RECENT_QUERY, DISSOCIATION_QUERY, recoverDownshiftAt } = require('../../lib/parts/queries');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });

const quiet = { checkinFlooding: false, checkinCrisis: false, recoverLoud: false, dissociationCount: 0 };

// ------------------------------------------------------------------ gate

test('entryGate: flooding in the window opens P2, no crisis banner', () => {
  assert.deepEqual(entryGate({ ...quiet, checkinFlooding: true }),
    { open: 'p2', band: 'flooded', crisis: false, reasons: ['checkin_flooding'] });
});

test('entryGate: a crisis flag opens P2 with the banner alongside', () => {
  assert.deepEqual(entryGate({ ...quiet, checkinCrisis: true }),
    { open: 'p2', band: 'flooded', crisis: true, reasons: ['checkin_crisis'] });
});

test('entryGate: flooding and crisis together; P2 wins over dissociation, which is still a reason', () => {
  assert.deepEqual(entryGate({ checkinFlooding: true, checkinCrisis: true, recoverLoud: false, dissociationCount: 3 }),
    { open: 'p2', band: 'flooded', crisis: true, reasons: ['checkin_flooding', 'checkin_crisis', 'dissociation_history'] });
});

test('entryGate: a loud Recover alone opens P2', () => {
  assert.deepEqual(entryGate({ ...quiet, recoverLoud: true }),
    { open: 'p2', band: 'flooded', crisis: false, reasons: ['recover_loud'] });
});

test('entryGate: dissociation at the threshold is the heads-up; under it is clear', () => {
  assert.deepEqual(entryGate({ ...quiet, dissociationCount: 2 }), { open: 'far_away', reasons: ['dissociation_history'] });
  assert.deepEqual(entryGate({ ...quiet, dissociationCount: 1 }), { open: 'clear', reasons: [] });
  const strict = { ...DEFAULT_ENTRY_POLICY, dissociationCount: 4 };
  assert.equal(entryGate({ ...quiet, dissociationCount: 3 }, strict).open, 'clear');
  assert.equal(entryGate({ ...quiet, dissociationCount: 4 }, strict).open, 'far_away');
});

test('entryGate: nothing recent is clear, and no outcome is a lock', () => {
  assert.deepEqual(entryGate(quiet), { open: 'clear', reasons: [] });
  for (const s of [quiet, { ...quiet, checkinCrisis: true }, { ...quiet, dissociationCount: 9 }]) {
    assert.ok(['p2', 'far_away', 'clear'].includes(entryGate(s).open));
  }
});

test('resolveEntryPolicy: a missing policy or bad values take the defaults (2 h, 2 in 14 days, Recover 7)', () => {
  assert.deepEqual(DEFAULT_ENTRY_POLICY, { floodGateHours: 2, dissociationCount: 2, dissociationDays: 14, recoverDownshiftAt: 7 });
  assert.deepEqual(resolveEntryPolicy(null), DEFAULT_ENTRY_POLICY);
  assert.deepEqual(resolveEntryPolicy({ floodGateHours: 0, dissociationCount: 'x', dissociationDays: -1, recoverDownshiftAt: null }),
    DEFAULT_ENTRY_POLICY);
  assert.deepEqual(resolveEntryPolicy({ floodGateHours: 3, dissociationCount: 4, dissociationDays: 21, recoverDownshiftAt: 8 }),
    { floodGateHours: 3, dissociationCount: 4, dissociationDays: 21, recoverDownshiftAt: 8 });
});

test("recoverDownshiftAt reads the flow's gates, or null", () => {
  assert.equal(recoverDownshiftAt(JSON.stringify({ gates: { downshiftAt: 7, askMax: 5 } })), 7);
  for (const bad of [null, '', '{', '{}', JSON.stringify({ gates: { downshiftAt: '7' } })]) assert.equal(recoverDownshiftAt(bad), null);
});

// ------------------------------------------------------------------ handler (fake query layer)

test('handler: the policy windows reach the queries; a missing policy uses the defaults', async () => {
  const seen = [];
  const deps = (policy, recent = quiet, n = 0) => ({
    policy: async () => policy,
    recent: async (hours, downshiftAt) => { seen.push(['recent', hours, downshiftAt]); return recent; },
    dissociation: async (days) => { seen.push(['dissociation', days]); return n; },
  });
  assert.deepEqual(await getPartsEntryHandler(deps({ floodGateHours: 3, dissociationCount: 2, dissociationDays: 21, recoverDownshiftAt: 8 })),
    { open: 'clear', reasons: [] });
  assert.deepEqual(seen.splice(0), [['recent', 3, 8], ['dissociation', 21]]);
  const out = await getPartsEntryHandler(deps(null, { ...quiet, checkinCrisis: true }, 5));
  assert.deepEqual(seen.splice(0), [['recent', 2, 7], ['dissociation', 14]]);
  assert.deepEqual(out, { open: 'p2', band: 'flooded', crisis: true, reasons: ['checkin_crisis', 'dissociation_history'] });
});

// ------------------------------------------------------------------ callable (fake driver)

function partsDriver({ policy = null, recent = null, n = 0 } = {}) {
  return fakeDriver((q) => {
    if (q === POLICY_QUERY) return policy ? [policy] : [];
    if (q === RECENT_QUERY) return [recent ?? { checkinFlooding: false, checkinCrisis: false, recoverLoud: false }];
    if (q === DISSOCIATION_QUERY) return [{ n }];
    return new Error(`unexpected query: ${q.slice(0, 60)}`);
  });
}

test("getPartsEntry reads only the caller's own records, in read transactions, with windows as parameters", async () => {
  const f = partsDriver({
    policy: { floodGateHours: 2, dissociationCount: 2, dissociationDays: 14, recoverFlow: JSON.stringify({ gates: { downshiftAt: 7 } }) },
    n: 2,
  });
  setDriver(f.driver);
  const out = await fns.getPartsEntry.run({ auth: auth('real-user'), data: { uid: 'someone-else', userId: 'someone-else' } });
  assert.deepEqual(out, { open: 'far_away', reasons: ['dissociation_history'] });
  assert.equal(f.calls.length, 3);
  const user = f.calls.filter((c) => c.query !== POLICY_QUERY);
  assert.equal(user.length, 2);
  for (const c of user) {
    assert.equal(c.params.uid, 'real-user');
    assert.ok(!('userId' in c.params));
    for (const m of c.query.matchAll(/\((\w+):(CheckIn|InvalidationRecoverySession)\b([^)]*)\)/g)) {
      assert.match(m[3], /\{ownerId: \$uid\}/, `${m[2]} is read by owner`);
    }
  }
  const recent = f.calls.find((c) => c.query === RECENT_QUERY);
  assert.deepEqual([Number(recent.params.hours), Number(recent.params.downshiftAt)], [2, 7]);
  assert.equal(Number(f.calls.find((c) => c.query === DISSOCIATION_QUERY).params.days), 14);
  assert.ok(f.sessions.every((s) => s.config.defaultAccessMode === 'READ'));
  assert.ok(f.allClosed());
});

test('getPartsEntry returns the decision only: no ids, timestamps or emotion data', async () => {
  setDriver(partsDriver({ recent: { checkinFlooding: true, checkinCrisis: true, recoverLoud: false } }).driver);
  const out = await fns.getPartsEntry.run({ auth: auth(), data: {} });
  assert.deepEqual(out, { open: 'p2', band: 'flooded', crisis: true, reasons: ['checkin_flooding', 'checkin_crisis'] });
  assert.deepEqual(Object.keys(out).sort(), ['band', 'crisis', 'open', 'reasons']);
});

test('the reads match what the spec counts (flooding, the spiraling answer, crisis, Recover at downshiftAt, dissociation)', () => {
  assert.match(RECENT_QUERY, /c\.activationPatternId = 'emotional_flooding'/);
  assert.match(RECENT_QUERY, /'hu_exp_flooding' IN coalesce\(c\.discResponseIds, \[\]\)/);
  assert.match(RECENT_QUERY, /c\.safetyFlagId IS NOT NULL/);
  assert.match(RECENT_QUERY, /duration\(\{hours: \$hours\}\)/);
  assert.match(RECENT_QUERY, /s\.startIntensity >= \$downshiftAt OR s\.endIntensity >= \$downshiftAt/);
  assert.match(DISSOCIATION_QUERY, /duration\(\{days: \$days\}\)/);
  assert.match(DISSOCIATION_QUERY, /IN \['dissociation_overmodulation', 'conservation_freeze'\]/);
  assert.match(POLICY_QUERY, /PartsPolicy \{id: 'parts'\}/);
});

// ------------------------------------------------------------------ partsEnabled (a setting)

test('partsEnabled: false by default, true only when stored true', async () => {
  for (const [stored, want] of [[undefined, false], [true, true], [false, false], ['true', false]]) {
    const user = { id: 'u1', theme: 'dark' };
    if (stored !== undefined) user.partsEnabled = stored;
    setDriver(fakeDriver((q) => (/RETURN u \{\.\*\} AS user/.test(q) ? [{ user }] : [])).driver);
    const { profile } = await fns.getUserProfile.run({ auth: auth(), data: {} });
    assert.equal(profile.partsEnabled, want, String(stored));
  }
});

test('partsEnabled: updateUserProfile writes a boolean and rejects anything else before any query', async () => {
  for (const v of [true, false]) {
    const f = fakeDriver(() => []);
    setDriver(f.driver);
    await fns.updateUserProfile.run({ auth: auth(), data: { partsEnabled: v } });
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].params.partsEnabled, v);
    assert.match(f.calls[0].query, /u\.partsEnabled = \$partsEnabled/);
  }
  for (const bad of ['true', 1, null, {}]) {
    const f = fakeDriver(() => []);
    setDriver(f.driver);
    await assert.rejects(fns.updateUserProfile.run({ auth: auth(), data: { partsEnabled: bad } }), (e) => e.code === 'invalid-argument', String(bad));
    assert.equal(f.calls.length, 0);
  }
});
