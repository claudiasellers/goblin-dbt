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

// ------------------------------------------------------------------ Meet a part's session record

const { validateStartPartSession, validateSavePartSession, mergeStepIds, OWN_WORDS_MAX } = require('../../lib/parts/validation');
const { startPartSessionHandler, savePartSessionHandler } = require('../../lib/parts/sessions');
const Q = require('../../lib/parts/sessionQueries');

const SID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PID = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const CID = '5b2c9a0e-1b2c-4d5e-8f90-123456789abc';
const bad = (fn) => assert.throws(fn, (e) => e.name === 'ValidationError');

test('validateStartPartSession: closed trailhead set, uuids, move ids, nothing else', () => {
  assert.deepEqual(validateStartPartSession({ id: SID, trailheadKind: 'me' }),
    { id: SID, trailheadKind: 'me', partId: null, candidateId: null, moveIds: [] });
  assert.deepEqual(validateStartPartSession({ id: SID, trailheadKind: 'candidate', candidateId: CID, moveIds: ['hide'] }).moveIds, ['hide']);
  for (const k of ['offer', 'me', 'candidate', 'settings', 'angry_card', 'problem_solve']) validateStartPartSession({ id: SID, trailheadKind: k });
  bad(() => validateStartPartSession({ id: SID, trailheadKind: 'checkin' }));
  bad(() => validateStartPartSession({ id: 'nope', trailheadKind: 'me' }));
  bad(() => validateStartPartSession({ id: SID, trailheadKind: 'me', partId: 'not-a-uuid' }));
  bad(() => validateStartPartSession({ id: SID, trailheadKind: 'me', moveIds: ['Hide me!'] }));
  bad(() => validateStartPartSession({ id: SID, trailheadKind: 'me', moveIds: ['a', 'b', 'c', 'd', 'e'] }));
  bad(() => validateStartPartSession({ id: SID, trailheadKind: 'me', ownerId: 'someone' }));
});

test('validateSavePartSession: every field accepted in its shape', () => {
  const out = validateSavePartSession({
    id: SID, final: true,
    patch: {
      stepIds: { find: ['pull_hide'], feel_toward: ['curious'] }, feelTowardIds: ['annoyed', 'curious'], blendCheck: 'not_sure',
      handoffs: [{ primitiveId: 'sigh', completed: true, durationSec: 40, thenVsNow: 'better', resumed: true, overridden: false }],
      steppedBack: true, stopReason: 'tender', exitStep: 'fear',
      ownVoice: '  get out first  ', ownJob: '', ownFear: null, ownUpdate: 'I have people now',
      bodyPlaces: ['chest', 'throat'], shapeSig: [0, 0.5, 1, 0.25, 0.75], soundSig: [0.1, 0.2, 0.3, 0.4],
    },
  });
  assert.equal(out.final, true);
  assert.deepEqual(out.stepIds, { find: ['pull_hide'], feel_toward: ['curious'] });
  assert.deepEqual(out.props, {
    feelTowardIds: ['annoyed', 'curious'], blendCheck: 'not_sure',
    handoffsJson: JSON.stringify([{ primitiveId: 'sigh', completed: true, durationSec: 40, thenVsNow: 'better', resumed: true, overridden: false }]),
    steppedBack: true, stopReason: 'tender', exitStep: 'fear',
    ownVoice: 'get out first', ownJob: null, ownFear: null, ownUpdate: 'I have people now',
    bodyPlaces: ['chest', 'throat'], shapeSig: [0, 0.5, 1, 0.25, 0.75], soundSig: [0.1, 0.2, 0.3, 0.4],
  });
  assert.deepEqual(validateSavePartSession({ id: SID, patch: {} }), { id: SID, stepIds: null, props: {}, final: false });
  for (const s of ['blend', 'entry', 'tender', 'nothing']) assert.equal(validateSavePartSession({ id: SID, patch: { exitStep: s } }).props.exitStep, s);
});

test('validateSavePartSession: refuses unknown keys, bad ids, over-long own words, wrong shapes', () => {
  const save = (patch, extra = {}) => validateSavePartSession({ id: SID, patch, ...extra });
  bad(() => save({ partName: 'x' }));
  bad(() => save({}, { status: 'saved' }));
  bad(() => save({}, { final: 'yes' }));
  bad(() => save({ stepIds: { memory: ['x'] } }));
  bad(() => save({ stepIds: { find: ['Not an id'] } }));
  bad(() => save({ stepIds: { find: 'pull_hide' } }));
  bad(() => save({ feelTowardIds: ['a', 'b', 'c', 'd', 'e'] }), 'default cap 2 + 2');
  assert.equal(validateSavePartSession({ id: SID, patch: { feelTowardIds: ['a', 'b', 'c', 'd', 'e'] } }, 3).props.feelTowardIds.length, 5);
  bad(() => save({ feelTowardIds: ['curious', 42] }));
  bad(() => save({ blendCheck: 'running_things' }));
  bad(() => save({ handoffs: [{ primitiveId: 'sigh', note: 'free text' }] }));
  bad(() => save({ handoffs: [{ durationSec: 4000 }] }));
  bad(() => save({ handoffs: [{}, {}, {}, {}, {}] }));
  bad(() => save({ steppedBack: 'yes' }));
  bad(() => save({ stopReason: 'bored' }));
  bad(() => save({ exitStep: 'step_99' }));
  bad(() => save({ ownFear: 'x'.repeat(OWN_WORDS_MAX + 1) }));
  assert.equal(save({ ownFear: ` ${'x'.repeat(OWN_WORDS_MAX)} ` }).props.ownFear.length, OWN_WORDS_MAX, 'trimmed before the check');
  bad(() => save({ ownJob: 7 }));
  bad(() => save({ bodyPlaces: ['chest', 'throat', 'belly', 'jaw'] }));
  bad(() => save({ shapeSig: [0, 0, 0, 0] }));
  bad(() => save({ shapeSig: [0, 0, 0, 0, 1.5] }));
  bad(() => save({ soundSig: [0, 0, 0] }));
});

test('mergeStepIds: later answers to a step replace earlier ones; other steps stay', () => {
  assert.equal(mergeStepIds(null, { find: ['a'] }), JSON.stringify({ find: ['a'] }));
  assert.equal(mergeStepIds(JSON.stringify({ find: ['a'], where: ['chest'] }), { find: ['b'] }), JSON.stringify({ find: ['b'], where: ['chest'] }));
  assert.equal(mergeStepIds(JSON.stringify({ find: ['a'] }), null), JSON.stringify({ find: ['a'] }));
  assert.equal(mergeStepIds(null, null), null);
});

/** A fake session query layer: state in memory, every call logged. */
function fakeSessions({ partsOn = true, parts = [], candidates = [], sessions = {}, policy = null } = {}) {
  const log = [];
  const deps = {
    maxNonSelfAnswers: async () => { log.push(['policy']); return policy; },
    startState: async (s) => {
      log.push(['startState', s.id]);
      return { partsOn, partFound: parts.includes(s.partId), candidateFound: candidates.includes(s.candidateId), status: sessions[s.id]?.status ?? null };
    },
    create: async (s) => { log.push(['create', s.id]); sessions[s.id] = { status: 'open', stepIdsJson: null }; },
    saveState: async (id) => { log.push(['saveState', id]); return { partsOn, status: sessions[id]?.status ?? null, stepIdsJson: sessions[id]?.stepIdsJson ?? null }; },
    save: async (id, props, stepIdsJson, final) => {
      log.push(['save', id, props, stepIdsJson, final]);
      if (sessions[id]?.status !== 'open') return null;
      Object.assign(sessions[id], props, { stepIdsJson }, final ? { status: 'saved' } : {});
      return sessions[id].status;
    },
  };
  return { deps, log, sessions };
}
const writes = (log) => log.filter(([k]) => k === 'create' || k === 'save');
const code = (c) => (e) => e.code === c;

test('start: creates once; a repeat while open writes nothing; after saving, refused', async () => {
  const f = fakeSessions();
  const s = validateStartPartSession({ id: SID, trailheadKind: 'me' });
  assert.deepEqual(await startPartSessionHandler(s, f.deps), { id: SID, status: 'open' });
  assert.deepEqual(await startPartSessionHandler(s, f.deps), { id: SID, status: 'open' });
  assert.equal(writes(f.log).length, 1);
  f.sessions[SID].status = 'saved';
  await assert.rejects(startPartSessionHandler(s, f.deps), code('failed-precondition'));
  assert.equal(writes(f.log).length, 1);
});

test("start: a part or candidate that isn't the caller's own is not-found, before any write", async () => {
  const f = fakeSessions({ parts: [PID], candidates: [CID] });
  await startPartSessionHandler(validateStartPartSession({ id: SID, trailheadKind: 'me', partId: PID }), f.deps);
  const other = fakeSessions();
  await assert.rejects(startPartSessionHandler(validateStartPartSession({ id: SID, trailheadKind: 'me', partId: PID }), other.deps), code('not-found'));
  await assert.rejects(startPartSessionHandler(validateStartPartSession({ id: SID, trailheadKind: 'candidate', candidateId: CID }), other.deps), code('not-found'));
  assert.equal(writes(other.log).length, 0);
});

test('parts off: both writers refuse before any write', async () => {
  const f = fakeSessions({ partsOn: false, sessions: { [SID]: { status: 'open' } } });
  await assert.rejects(startPartSessionHandler(validateStartPartSession({ id: SID, trailheadKind: 'settings' }), f.deps), code('failed-precondition'));
  await assert.rejects(savePartSessionHandler({ id: SID, patch: { blendCheck: 'notice' } }, f.deps), code('failed-precondition'));
  assert.equal(writes(f.log).length, 0);
});

test('save: merges while open, final freezes it, and every later save is refused', async () => {
  const f = fakeSessions({ sessions: { [SID]: { status: 'open', stepIdsJson: JSON.stringify({ find: ['a'] }) } } });
  assert.deepEqual(await savePartSessionHandler({ id: SID, patch: { stepIds: { where: ['chest'] }, blendCheck: 'notice' } }, f.deps), { id: SID, status: 'open' });
  assert.equal(f.sessions[SID].stepIdsJson, JSON.stringify({ find: ['a'], where: ['chest'] }));
  assert.deepEqual(await savePartSessionHandler({ id: SID, patch: { stopReason: 'done' }, final: true }, f.deps), { id: SID, status: 'saved' });
  await assert.rejects(savePartSessionHandler({ id: SID, patch: { stopReason: 'later' } }, f.deps), code('failed-precondition'));
  await assert.rejects(savePartSessionHandler({ id: SID, patch: {}, final: true }, f.deps), code('failed-precondition'));
  assert.equal(writes(f.log).length, 2);
  await assert.rejects(savePartSessionHandler({ id: PID, patch: {} }, f.deps), code('not-found'));
});

test("save: feelTowardIds' cap follows PartsPolicy.maxNonSelfAnswers (+2), default 2", async () => {
  const five = { id: SID, patch: { feelTowardIds: ['a', 'b', 'c', 'd', 'e'] } };
  await assert.rejects(savePartSessionHandler(five, fakeSessions({ sessions: { [SID]: { status: 'open' } } }).deps), (e) => e.name === 'ValidationError');
  const f = fakeSessions({ policy: 3, sessions: { [SID]: { status: 'open' } } });
  await savePartSessionHandler(five, f.deps);
  assert.deepEqual(f.sessions[SID].feelTowardIds, ['a', 'b', 'c', 'd', 'e']);
});

test('startPartSession / savePartSession over the fake driver: own records only, guard in the write, layer labels', async () => {
  const f = fakeDriver((q, p) => {
    if (q === Q.START_STATE_QUERY) return [{ partsOn: true, partFound: p.partKey === `real-user:${PID}`, candidateFound: false, status: null }];
    if (q === Q.CREATE_QUERY) return [];
    return new Error(`unexpected query: ${q.slice(0, 60)}`);
  });
  setDriver(f.driver);
  const out = await fns.startPartSession.run({ auth: auth('real-user'), data: { id: SID, trailheadKind: 'me', partId: PID } });
  assert.deepEqual(out, { id: SID, status: 'open' });
  for (const c of f.calls) {
    assert.equal(c.params.uid, 'real-user');
    assert.equal(c.params.key, `real-user:${SID}`);
  }
  assert.match(Q.CREATE_QUERY, /MERGE \(ps:PartSession \{key: \$key\}\)\s+ON CREATE SET ps:UserData:LogRecord/);
  assert.match(Q.CREATE_QUERY, /MERGE \(u\)-\[:HAS_PART_SESSION\]->\(ps\)/);
  assert.match(Q.SAVE_QUERY, /WHERE ps\.status = 'open'/);
  assert.ok(f.allClosed());

  const g = fakeDriver((q) => {
    if (q === Q.POLICY_QUERY) return [{ maxNonSelfAnswers: 2 }];
    if (q === Q.SAVE_STATE_QUERY) return [{ partsOn: true, status: 'open', stepIdsJson: null }];
    if (q === Q.SAVE_QUERY) return [{ status: 'saved' }];
    return new Error('unexpected');
  });
  setDriver(g.driver);
  const saved = await fns.savePartSession.run({ auth: auth('real-user'), data: { id: SID, patch: { ownJob: 'keep me out of sight' }, final: true } });
  assert.deepEqual(saved, { id: SID, status: 'saved' });
  const w = g.calls.find((c) => c.query === Q.SAVE_QUERY);
  assert.deepEqual([w.params.uid, w.params.key, w.params.final, w.params.props], ['real-user', `real-user:${SID}`, true, { ownJob: 'keep me out of sight' }]);
});

test('startPartSession / savePartSession reject bad input as invalid-argument, never touching the session', async () => {
  const f = fakeDriver((q) => (q === Q.POLICY_QUERY ? [{ maxNonSelfAnswers: 2 }] : new Error('no write expected')));
  setDriver(f.driver);
  await assert.rejects(fns.startPartSession.run({ auth: auth(), data: { id: SID, trailheadKind: 'nope' } }), code('invalid-argument'));
  assert.equal(f.calls.length, 0, 'start validates before any query');
  await assert.rejects(fns.savePartSession.run({ auth: auth(), data: { id: SID, patch: { secret: 'x' } } }), code('invalid-argument'));
  assert.ok(f.calls.every((c) => c.query === Q.POLICY_QUERY));
});

// ------------------------------------------------------------------ keepPart and queuePartCandidate

const plan = require('../../lib/parts/keepPlan');
const K = require('../../lib/parts/keep');
const C = require('../../lib/parts/candidate');

const NEW_PART = '6c2c9a0e-1b2c-4d5e-8f90-123456789abc';
const stored = (o = {}) => ({
  trailheadKind: 'me', candidateId: null, partId: null, moveIds: ['hide'], keepable: true,
  stepIdsJson: JSON.stringify({
    find: ['pull_hide'], age: ['age_teen'], voice: ['hide_voice_see', 'own_words'], job: ['hide_job_out_of_sight'],
    guards: ['left_out', 'guards_not_sure'], fear: ['hide_fear_too_much'], would_rather: ['rather_not_sure'],
    feel_toward: ['feel_curious'],
  }),
  stopReason: 'done', bodyPlaces: ['chest'], shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5], soundSig: null,
  ownVoice: 'get out first', ownJob: null, ownFear: null, ...o,
});

test('validateKeep: only the session id, the part id and the name; any part field is refused', () => {
  assert.deepEqual(plan.validateKeep({ sessionId: SID, partId: NEW_PART, name: 'the one who hides' }),
    { sessionId: SID, partId: NEW_PART, name: 'the one who hides' });
  for (const extra of [{ tender: false }, { jobIds: ['x'] }, { feelTowardIds: ['feel_curious'] }, { ownJob: 'x' }, { status: 'active' }]) {
    bad(() => plan.validateKeep({ sessionId: SID, partId: NEW_PART, ...extra }));
  }
  bad(() => plan.validateKeep({ sessionId: SID, partId: 'part-1' }));
  bad(() => plan.validateKeep({ sessionId: SID, partId: NEW_PART, name: 7 }));
});

test('keptName: trimmed, ≤ the policy max, empty is "Not yet", never interpreted', () => {
  assert.equal(plan.keptName('  the one who hides ', 40), 'the one who hides');
  assert.equal(plan.keptName('', 40), null);
  assert.equal(plan.keptName(null, 40), null);
  assert.equal(plan.keptName(undefined, 40), undefined);
  assert.equal(plan.keptName('x'.repeat(40), 40).length, 40);
  bad(() => plan.keptName('x'.repeat(41), 40));
});

test('partFromSession: built from the stored session; non-answers dropped; never an ask-fresh field', () => {
  const p = plan.partFromSession(stored());
  assert.deepEqual(p, {
    tender: false, places: ['chest'], shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5], soundSig: null, ageId: 'age_teen',
    voiceIds: ['hide_voice_see'], jobIds: ['hide_job_out_of_sight'], fearIds: ['hide_fear_too_much'], preferredRoleIds: [],
    ownVoice: 'get out first', ownJob: null, ownFear: null, guardIds: ['left_out'],
  });
  for (const k of ['feelTowardIds', 'blendCheck', 'handoffs', 'handoffsJson', 'band']) assert.ok(!(k in p), k);
  assert.equal(plan.partFromSession(stored({ stepIdsJson: JSON.stringify({ age: ['age_cant_tell'] }) })).ageId, null);
  assert.equal(plan.partFromSession(stored({ stepIdsJson: '{not json' })).jobIds.length, 0);
});

test('tender: the tender path, little + keep it gentle, or a tender / own-words stop', () => {
  const t = (steps, stopReason = 'done') => plan.isTender({ stepIdsJson: JSON.stringify(steps), stopReason });
  assert.equal(t({ tender: ['tender_hold'] }), true);
  assert.equal(t({ age: ['age_little', 'young_gentle'] }), true);
  assert.equal(t({ age: ['age_little', 'young_go_on'] }), false, 'little, but they chose to go on');
  assert.equal(t({}, 'tender'), true);
  assert.equal(t({}, 'own_words'), true, 'unread text is the riskier case');
  assert.equal(t({ age: ['age_now'] }, 'danger'), false);
});

test('partSource: candidate, offer or made', () => {
  assert.equal(plan.partSource({ trailheadKind: 'candidate', candidateId: null }), 'candidate');
  assert.equal(plan.partSource({ trailheadKind: 'me', candidateId: CID }), 'candidate');
  assert.equal(plan.partSource({ trailheadKind: 'offer', candidateId: null }), 'offer');
  for (const k of ['me', 'settings', 'angry_card', 'problem_solve']) assert.equal(plan.partSource({ trailheadKind: k, candidateId: null }), 'made');
});

test('mergeRevisit: unions ids, replaces own words only where given, never removes or un-tenders', () => {
  const existing = {
    tender: true, places: ['chest'], shapeSig: [0, 0, 0, 0, 0], ageId: 'age_teen', voiceIds: ['a'], jobIds: ['j1'],
    fearIds: ['f1'], preferredRoleIds: ['r1'], ownVoice: 'old voice', ownJob: 'old job', ownFear: null,
  };
  const visit = { ...plan.partFromSession(stored({ stopReason: 'done', ownVoice: null, ownJob: 'new job', bodyPlaces: ['throat', 'chest'] })) };
  delete visit.guardIds;
  const m = plan.mergeRevisit(existing, visit);
  assert.equal(m.tender, true);
  assert.deepEqual(m.places, ['chest', 'throat']);
  assert.deepEqual(m.voiceIds, ['a', 'hide_voice_see']);
  assert.deepEqual(m.jobIds, ['j1', 'hide_job_out_of_sight']);
  assert.deepEqual(m.preferredRoleIds, ['r1']);
  assert.equal(m.ageId, 'age_teen');
  assert.deepEqual([m.ownVoice, m.ownJob, m.ownFear], ['old voice', 'new job', null]);
  assert.deepEqual(m.shapeSig, [0.1, 0.2, 0.3, 0.4, 0.5], 'the new figure replaces the old');
  for (const k of Object.keys(existing)) if (Array.isArray(existing[k])) for (const x of existing[k]) assert.ok(m[k].includes(x) || k === 'shapeSig', `${k} lost ${x}`);
});

function fakeKeep({ partsOn = true, session = stored(), part = null, linkedPartId = null, writeOk = true } = {}) {
  const log = [];
  const deps = {
    state: async (input) => { log.push(['state', input]); return { partsOn, session, part, linkedPartId, nameMax: 40, revisitDays: 30 }; },
    create: async (w) => { log.push(['create', w]); return writeOk; },
    revisit: async (w) => { log.push(['revisit', w]); return writeOk; },
  };
  return { deps, log };
}
const keepIn = (o = {}) => plan.validateKeep({ sessionId: SID, partId: NEW_PART, ...o });

test('keepPart: a new part from the session, its moves, guards and source; own words copied only here', async () => {
  const f = fakeKeep({ session: stored({ candidateId: CID, trailheadKind: 'candidate', ownFear: 'that I would be too much' }) });
  assert.deepEqual(await K.keepPartHandler(keepIn({ name: ' the one who hides ' }), f.deps), { partId: NEW_PART, created: true });
  const [, w] = f.log.find(([k]) => k === 'create');
  assert.equal(w.name, 'the one who hides');
  assert.equal(w.source, 'candidate');
  assert.equal(w.candidateId, CID);
  assert.deepEqual(w.moveIds, ['hide']);
  assert.deepEqual(w.guardIds, ['left_out']);
  assert.equal(w.fields.ownFear, 'that I would be too much');
  assert.ok(!('feelTowardIds' in w.fields) && !('blendCheck' in w.fields) && !('handoffs' in w.fields));
  assert.ok(!('guardIds' in w.fields), 'guards are edges, not fields');
});

test('keepPart: parts off, someone else\'s session, a closed visit, an id taken by another part', async () => {
  await assert.rejects(K.keepPartHandler(keepIn(), fakeKeep({ partsOn: false }).deps), code('failed-precondition'));
  await assert.rejects(K.keepPartHandler(keepIn(), fakeKeep({ session: null }).deps), code('not-found'));
  await assert.rejects(K.keepPartHandler(keepIn(), fakeKeep({ session: stored({ keepable: false }) }).deps), code('failed-precondition'));
  await assert.rejects(K.keepPartHandler(keepIn(), fakeKeep({ part: { tender: false } }).deps), code('failed-precondition'));
  await assert.rejects(K.keepPartHandler(keepIn(), fakeKeep({ linkedPartId: PID }).deps), code('failed-precondition'));
  await assert.rejects(K.keepPartHandler(keepIn({ name: 'x'.repeat(41) }), fakeKeep().deps), (e) => e.name === 'ValidationError');
  for (const f of [fakeKeep({ partsOn: false }), fakeKeep({ session: null })]) {
    await K.keepPartHandler(keepIn(), f.deps).catch(() => {});
    assert.ok(!f.log.some(([k]) => k !== 'state'), 'no write');
  }
});

test('keepPart: a revisit updates that part only (merged, never fewer), and a repeat keep is a revisit', async () => {
  const existing = { tender: true, places: ['jaw'], voiceIds: ['a'], jobIds: [], fearIds: [], preferredRoleIds: [], ownVoice: 'old', ageId: 'age_now' };
  const f = fakeKeep({ session: stored({ partId: PID }), part: existing });
  assert.deepEqual(await K.keepPartHandler(keepIn({ partId: PID }), f.deps), { partId: PID, created: false });
  const [, w] = f.log.find(([k]) => k === 'revisit');
  assert.deepEqual(w.fields.places, ['jaw', 'chest']);
  assert.equal(w.fields.tender, true);
  assert.equal(w.fields.ownVoice, 'get out first');
  assert.equal(w.fields.ageId, 'age_now');
  assert.equal(w.name, null, 'no new name: the old one stays');
  await assert.rejects(K.keepPartHandler(keepIn({ partId: NEW_PART }), fakeKeep({ session: stored({ partId: PID }), part: existing }).deps),
    code('invalid-argument'));
  await assert.rejects(K.keepPartHandler(keepIn({ partId: PID }), fakeKeep({ session: stored({ partId: PID }), part: null }).deps), code('not-found'));
  // After the first keep the session carries the new part's id: the same call again lands as a revisit.
  const again = fakeKeep({ session: stored({ partId: NEW_PART }), part: { places: ['chest'] }, linkedPartId: NEW_PART });
  assert.deepEqual(await K.keepPartHandler(keepIn(), again.deps), { partId: NEW_PART, created: false });
  assert.ok(!again.log.some(([k]) => k === 'create'));
});

test('keepPart over the fake driver: caller-scoped keys, guarded writes, profile labels and edges', async () => {
  const f = fakeDriver((q, p) => {
    if (q === K.KEEP_STATE_QUERY) {
      return [{ partsOn: true, session: { ...stored(), keepable: true }, part: null, linkedPartId: null, nameMaxChars: 40, revisitAfterDays: 30 }];
    }
    if (q === K.KEEP_NEW_QUERY) return [{ id: p.partId }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  const out = await fns.keepPart.run({ auth: auth('real-user'), data: { sessionId: SID, partId: NEW_PART, name: 'the one who hides' } });
  assert.deepEqual(out, { partId: NEW_PART, created: true });
  const w = f.calls.find((c) => c.query === K.KEEP_NEW_QUERY);
  assert.deepEqual([w.params.uid, w.params.sessionKey, w.params.partKey], ['real-user', `real-user:${SID}`, `real-user:${NEW_PART}`]);
  assert.equal(w.params.revisitDays, 30);
  assert.match(K.KEEP_NEW_QUERY, /WHERE coalesce\(u\.partsEnabled, false\) AND \(ps\.status = 'open' OR \(ps\.status = 'saved'/);
  assert.match(K.KEEP_NEW_QUERY, /MERGE \(u\)-\[:HAS_PART\]->\(p\)/);
  assert.match(K.KEEP_NEW_QUERY, /MERGE \(ps\)-\[:OF_PART\]->\(p\)/);
  assert.match(K.KEEP_NEW_QUERY, /MERGE \(p\)-\[r:USES\]->\(x\) ON CREATE SET r\.confirmedAt = datetime\(\), r\.source = \$source/);
  assert.match(K.KEEP_NEW_QUERY, /MERGE \(p\)-\[r:GUARDS\]->\(x\)/);
  assert.match(K.KEEP_NEW_QUERY, /MERGE \(p\)-\[r:ACCEPTED_FROM\]->\(x\)[\s\S]*x\.status = CASE WHEN x\.status = 'open' THEN 'accepted'/);
  for (const k of ['feelTowardIds', 'blendCheck', 'handoffs']) assert.doesNotMatch(K.KEEP_NEW_QUERY + K.KEEP_REVISIT_QUERY, new RegExp(k));
  await assert.rejects(fns.keepPart.run({ auth: auth(), data: { sessionId: SID, partId: NEW_PART, tender: false } }), code('invalid-argument'));
});

test('validateCandidate: origin set, move ids, uuids, nothing else', () => {
  assert.deepEqual(C.validateCandidate({ id: CID, origin: 'worried_part', moveIds: ['hide'], sessionId: SID }),
    { id: CID, origin: 'worried_part', moveIds: ['hide'], sessionId: SID });
  for (const o of ['new_one', 'worried_part', 'split', 'ps_ambivalence', 'angry_card']) C.validateCandidate({ id: CID, origin: o, moveIds: [] });
  bad(() => C.validateCandidate({ id: CID, origin: 'checkin', moveIds: [] }));
  bad(() => C.validateCandidate({ id: CID, origin: 'split', moveIds: ['Hide!'] }));
  bad(() => C.validateCandidate({ id: CID, origin: 'split', moveIds: ['a', 'b', 'c', 'd', 'e'] }));
  bad(() => C.validateCandidate({ id: CID, origin: 'split', moveIds: ['hide', 'hide'] }));
  bad(() => C.validateCandidate({ id: 'x', origin: 'split', moveIds: [] }));
  bad(() => C.validateCandidate({ id: CID, origin: 'split', moveIds: [], note: 'free text' }));
});

test('queuePartCandidate: parts off refused for every origin; moves must exist; the session must be the caller\'s', async () => {
  const fake = (st) => {
    const log = [];
    return { log, deps: { state: async () => st, write: async (c) => { log.push(c); } } };
  };
  for (const origin of ['new_one', 'angry_card', 'ps_ambivalence']) {
    const f = fake({ partsOn: false, sessionFound: false, knownMoves: 0 });
    await assert.rejects(C.queuePartCandidateHandler(C.validateCandidate({ id: CID, origin, moveIds: [] }), f.deps), code('failed-precondition'));
    assert.equal(f.log.length, 0);
  }
  const unknown = fake({ partsOn: true, sessionFound: true, knownMoves: 1 });
  await assert.rejects(C.queuePartCandidateHandler(C.validateCandidate({ id: CID, origin: 'split', moveIds: ['hide', 'made_up'] }), unknown.deps), code('invalid-argument'));
  const noSession = fake({ partsOn: true, sessionFound: false, knownMoves: 1 });
  await assert.rejects(C.queuePartCandidateHandler(C.validateCandidate({ id: CID, origin: 'worried_part', moveIds: ['hide'], sessionId: SID }), noSession.deps), code('not-found'));
  const ok = fake({ partsOn: true, sessionFound: true, knownMoves: 1 });
  assert.deepEqual(await C.queuePartCandidateHandler(C.validateCandidate({ id: CID, origin: 'worried_part', moveIds: ['hide'], sessionId: SID }), ok.deps), { id: CID });
  assert.equal(ok.log.length, 1);
});

test('queuePartCandidate over the fake driver: one write, MERGE on key (idempotent), log layer, QUEUED from the session', async () => {
  const f = fakeDriver((q) => {
    if (q === C.CANDIDATE_STATE_QUERY) return [{ partsOn: true, sessionFound: true, knownMoves: 1 }];
    if (q === C.CANDIDATE_QUERY) return [{ id: CID }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await fns.queuePartCandidate.run({ auth: auth('real-user'), data: { id: CID, origin: 'angry_card', moveIds: ['hit_back'], sessionId: SID } }), { id: CID });
  }
  const writes = f.calls.filter((c) => c.query === C.CANDIDATE_QUERY);
  assert.equal(writes.length, 2);
  assert.deepEqual([writes[0].params.key, writes[0].params.sessionKey], [`real-user:${CID}`, `real-user:${SID}`]);
  assert.match(C.CANDIDATE_QUERY, /MERGE \(c:PartCandidate \{key: \$key\}\)\s+ON CREATE SET c:UserData:LogRecord/);
  assert.match(C.CANDIDATE_QUERY, /c\.status = 'open'/);
  assert.match(C.CANDIDATE_QUERY, /MERGE \(x\)-\[:QUEUED\]->\(c\)/);
});
