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
const { POLICY_QUERY, RECENT_QUERY, DISSOCIATION_QUERY, PARTS_MADE_QUERY, recoverDownshiftAt } = require('../../lib/parts/queries');

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

test('resolveEntryPolicy: a missing policy or bad values take the defaults (2 h, 2 in 14 days, Recover 7, 3 parts in 7 days)', () => {
  assert.deepEqual(DEFAULT_ENTRY_POLICY, { floodGateHours: 2, dissociationCount: 2, dissociationDays: 14, recoverDownshiftAt: 7, tooManyPartsCount: 3, tooManyPartsDays: 7 });
  assert.deepEqual(resolveEntryPolicy(null), DEFAULT_ENTRY_POLICY);
  assert.deepEqual(resolveEntryPolicy({ floodGateHours: 0, dissociationCount: 'x', dissociationDays: -1, recoverDownshiftAt: null }),
    DEFAULT_ENTRY_POLICY);
  assert.deepEqual(resolveEntryPolicy({ floodGateHours: 3, dissociationCount: 4, dissociationDays: 21, recoverDownshiftAt: 8, tooManyPartsCount: 5, tooManyPartsDays: 10 }),
    { floodGateHours: 3, dissociationCount: 4, dissociationDays: 21, recoverDownshiftAt: 8, tooManyPartsCount: 5, tooManyPartsDays: 10 });
});

test("recoverDownshiftAt reads the flow's gates, or null", () => {
  assert.equal(recoverDownshiftAt(JSON.stringify({ gates: { downshiftAt: 7, askMax: 5 } })), 7);
  for (const bad of [null, '', '{', '{}', JSON.stringify({ gates: { downshiftAt: '7' } })]) assert.equal(recoverDownshiftAt(bad), null);
});

// ------------------------------------------------------------------ handler (fake query layer)

test('handler: the policy windows reach the queries; a missing policy uses the defaults', async () => {
  const seen = [];
  const deps = (policy, recent = quiet, n = 0, made = 0) => ({
    policy: async () => policy,
    recent: async (hours, downshiftAt) => { seen.push(['recent', hours, downshiftAt]); return recent; },
    dissociation: async (days) => { seen.push(['dissociation', days]); return n; },
    partsMade: async (days) => { seen.push(['partsMade', days]); return made; },
  });
  assert.deepEqual(await getPartsEntryHandler(deps({ floodGateHours: 3, dissociationCount: 2, dissociationDays: 21, recoverDownshiftAt: 8 })),
    { open: 'clear', reasons: [] });
  assert.deepEqual(seen.splice(0), [['recent', 3, 8], ['dissociation', 21], ['partsMade', 7]]);
  const out = await getPartsEntryHandler(deps(null, { ...quiet, checkinCrisis: true }, 5));
  assert.deepEqual(seen.splice(0), [['recent', 2, 7], ['dissociation', 14], ['partsMade', 7]]);
  assert.deepEqual(out, { open: 'p2', band: 'flooded', crisis: true, reasons: ['checkin_crisis', 'dissociation_history'] });
});

test('handler: tooMany only at PartsPolicy.tooManyPartsCount parts in its window, alongside any outcome, never a lock', async () => {
  const deps = (made, policy = null, recent = quiet) => ({
    policy: async () => policy, recent: async () => recent, dissociation: async () => 0, partsMade: async () => made,
  });
  assert.deepEqual(await getPartsEntryHandler(deps(2)), { open: 'clear', reasons: [] }, 'under the line: no key at all');
  assert.deepEqual(await getPartsEntryHandler(deps(3)), { open: 'clear', reasons: [], tooMany: true });
  assert.deepEqual(await getPartsEntryHandler(deps(3, { tooManyPartsCount: 4 })), { open: 'clear', reasons: [] });
  assert.deepEqual(await getPartsEntryHandler(deps(5, null, { ...quiet, checkinFlooding: true })),
    { open: 'p2', band: 'flooded', crisis: false, reasons: ['checkin_flooding'], tooMany: true });
});

// ------------------------------------------------------------------ callable (fake driver)

function partsDriver({ policy = null, recent = null, n = 0, made = 0 } = {}) {
  return fakeDriver((q) => {
    if (q === PARTS_MADE_QUERY) return [{ n: made }];
    if (q === POLICY_QUERY) return policy ? [policy] : [];
    if (q === RECENT_QUERY) return [recent ?? { checkinFlooding: false, checkinCrisis: false, recoverLoud: false }];
    if (q === DISSOCIATION_QUERY) return [{ n }];
    return new Error(`unexpected query: ${q.slice(0, 60)}`);
  });
}

test("getPartsEntry reads only the caller's own records, in read transactions, with windows as parameters", async () => {
  const f = partsDriver({
    policy: { floodGateHours: 2, dissociationCount: 2, dissociationDays: 14, tooManyPartsCount: 3, tooManyPartsDays: 7, recoverFlow: JSON.stringify({ gates: { downshiftAt: 7 } }) },
    n: 2,
  });
  setDriver(f.driver);
  const out = await fns.getPartsEntry.run({ auth: auth('real-user'), data: { uid: 'someone-else', userId: 'someone-else' } });
  assert.deepEqual(out, { open: 'far_away', reasons: ['dissociation_history'] });
  assert.equal(f.calls.length, 4);
  const user = f.calls.filter((c) => c.query !== POLICY_QUERY);
  assert.equal(user.length, 3);
  for (const c of user) {
    assert.equal(c.params.uid, 'real-user');
    assert.ok(!('userId' in c.params));
    for (const m of c.query.matchAll(/\((\w+):(CheckIn|InvalidationRecoverySession|Part)\b([^)]*)\)/g)) {
      assert.match(m[3], /\{ownerId: \$uid\}/, `${m[2]} is read by owner`);
    }
  }
  const recent = f.calls.find((c) => c.query === RECENT_QUERY);
  assert.deepEqual([Number(recent.params.hours), Number(recent.params.downshiftAt)], [2, 7]);
  assert.equal(Number(f.calls.find((c) => c.query === DISSOCIATION_QUERY).params.days), 14);
  assert.equal(Number(f.calls.find((c) => c.query === PARTS_MADE_QUERY).params.days), 7);
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
  // Parts made: a count of the caller's own Part rows in the window, and only with parts on.
  assert.match(PARTS_MADE_QUERY, /MATCH \(u:User \{id: \$uid\}\) WHERE coalesce\(u\.partsEnabled, false\)/);
  assert.match(PARTS_MADE_QUERY, /p\.createdAt >= datetime\(\) - duration\(\{days: \$days\}\)/);
  assert.match(PARTS_MADE_QUERY, /RETURN count\(p\) AS n\s*$/);
});

test('getPartsEntry: three parts made lately add tooMany, and nothing else', async () => {
  setDriver(partsDriver({ made: 3 }).driver);
  const out = await fns.getPartsEntry.run({ auth: auth(), data: {} });
  assert.deepEqual(out, { open: 'clear', reasons: [], tooMany: true });
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

// ------------------------------------------------------------------ deleteMyParts

const { PARTS_LABELS, PARTS_FOLLOW_UP_TYPES } = require('../../lib/parts/delete');
const { USER_DATA } = require('../../lib/userdata/layers');

test('PARTS_LABELS: every registered parts label, nothing else (later phases join by registering)', () => {
  assert.deepEqual([...PARTS_LABELS].sort(), ['Part', 'PartCandidate', 'PartRevisit', 'PartSession', 'PartTag']);
  const partsLike = Object.keys(USER_DATA).filter((l) => /^(Part|Den|Trail)/.test(l));
  assert.deepEqual([...PARTS_LABELS].sort(), partsLike.sort(), 'a registered parts label deleteMyParts would miss');
  for (const l of ['ToolSession', 'CheckIn', 'FollowUp', 'SkillPractice', 'ProfileFact', 'OwnLine']) assert.ok(!PARTS_LABELS.includes(l), l);
});

test('deleteMyParts: the caller\'s parts records and open parts follow-ups, one write, counts only; parts off too', async () => {
  const counts = { Part: 2, PartSession: 3, PartCandidate: 0, PartRevisit: 4, PartTag: 5 };
  const f = fakeDriver((q) => {
    const label = /MATCH \(n:(\w+) \{ownerId: \$uid\}\)/.exec(q)?.[1];
    if (label) return [{ n: counts[label] }];
    if (/MATCH \(f:FollowUp \{ownerId: \$uid\}\)/.test(q)) return [{ n: 1 }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.deleteMyParts.run({ auth: auth('u7'), data: {} });
  assert.deepEqual(out, { deleted: { Part: 2, PartSession: 3, PartCandidate: 0, PartRevisit: 4, PartTag: 5, FollowUp: 1 } });
  assert.equal(f.sessions.length, 1, 'one transaction');
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  for (const c of f.calls) {
    assert.equal(c.params.uid, 'u7');
    assert.doesNotMatch(c.query, /partsEnabled/, 'works with parts off');
    assert.doesNotMatch(c.query, /ToolSession|CheckIn|SkillPractice|PatternOffer/, 'never touches other records');
  }
  const deletes = f.calls.filter((c) => /DETACH DELETE/.test(c.query));
  assert.equal(deletes.length, 6);
  const fu = f.calls.find((c) => /FollowUp/.test(c.query));
  assert.match(fu.query, /WHERE f\.type IN \$types AND f\.status = 'scheduled'/, 'open parts follow-ups only');
  assert.deepEqual(fu.params.types, PARTS_FOLLOW_UP_TYPES);
  assert.ok(f.calls.some((c) => /u\.profileVersion = coalesce\(u\.profileVersion, 0\) \+ 1/.test(c.query)), 'cached slices drop the deleted parts');
  assert.ok(f.allClosed());

  // Nothing kept: nothing deleted, no profile version bump.
  const g = fakeDriver((q) => (/RETURN size/.test(q) ? [{ n: 0 }] : []));
  setDriver(g.driver);
  assert.deepEqual((await fns.deleteMyParts.run({ auth: auth(), data: {} })).deleted, { Part: 0, PartSession: 0, PartCandidate: 0, PartRevisit: 0, PartTag: 0, FollowUp: 0 });
  assert.ok(!g.calls.some((c) => /profileVersion/.test(c.query)));
});

test('deleteMyParts needs sign-in (before any query)', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  await assert.rejects(fns.deleteMyParts.run({ data: {} }), (e) => e.code === 'unauthenticated');
  assert.equal(f.calls.length, 0);
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
  assert.equal(plan.mergeRevisit({ ...existing, ageId: 'age_now' }, visit).ageId, 'age_teen', 'a newer real age answer replaces the stored one');
  assert.equal(plan.mergeRevisit({ ...existing, ageId: 'age_now' }, { ...visit, ageId: null }).ageId, 'age_now', 'a non-answer keeps it');
  const cantTell = { ...plan.partFromSession(stored({ stepIdsJson: JSON.stringify({ age: ['age_cant_tell'] }) })) };
  assert.equal(cantTell.ageId, null);
  assert.equal(plan.mergeRevisit({ ...existing, ageId: 'age_now' }, cantTell).ageId, 'age_now', "can't tell keeps the stored age");
  assert.equal(plan.mergeRevisit({ ...existing, tender: true }, { ...visit, tender: false }).tender, true);
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
  assert.equal(w.fields.ageId, 'age_teen', 'the newer age answer replaces age_now');
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

// ------------------------------------------------------------------ queuePartCandidate from a tool session

const TSID = '7d2c9a0e-1b2c-4d5e-8f90-123456789abc';

test('validateCandidate: toolSessionId is a uuid, only present when given', () => {
  assert.deepEqual(C.validateCandidate({ id: CID, origin: 'new_one', moveIds: [], toolSessionId: TSID }),
    { id: CID, origin: 'new_one', moveIds: [], sessionId: null, toolSessionId: TSID });
  assert.ok(!('toolSessionId' in C.validateCandidate({ id: CID, origin: 'new_one', moveIds: [] })));
  bad(() => C.validateCandidate({ id: CID, origin: 'new_one', moveIds: [], toolSessionId: 'x' }));
});

test('candidateMoves: client ids first, then the session\'s sorted, each once, at most 4', () => {
  assert.deepEqual(C.candidateMoves([], ['hide', 'chase']), ['chase', 'hide']);
  assert.deepEqual(C.candidateMoves(['hide'], ['hide', 'chase']), ['hide', 'chase']);
  assert.deepEqual(C.candidateMoves(['a', 'b'], ['e', 'd', 'c']), ['a', 'b', 'c', 'd']);
});

test('queuePartCandidate with toolSessionId: the caller\'s own closed session; moves derived through EXPRESSES', async () => {
  const fake = (st) => {
    const log = [];
    return { log, deps: { state: async () => st, write: async (c) => { log.push(c); } } };
  };
  const input = (extra = {}) => C.validateCandidate({ id: CID, origin: 'new_one', moveIds: [], toolSessionId: TSID, ...extra });
  const base = { partsOn: true, sessionFound: false, knownMoves: 0 };
  const off = fake({ ...base, partsOn: false, toolSessionFound: true, toolSessionStatus: 'completed', derivedMoves: ['hide'] });
  await assert.rejects(C.queuePartCandidateHandler(input(), off.deps), code('failed-precondition'));
  const other = fake({ ...base, toolSessionFound: false, derivedMoves: [] });
  await assert.rejects(C.queuePartCandidateHandler(input(), other.deps), code('not-found'), 'someone else\'s session is not found');
  const open = fake({ ...base, toolSessionFound: true, toolSessionStatus: 'open', derivedMoves: ['hide'] });
  await assert.rejects(C.queuePartCandidateHandler(input(), open.deps), code('failed-precondition'));
  assert.equal(other.log.length + open.log.length + off.log.length, 0);
  const ok = fake({ ...base, knownMoves: 1, toolSessionFound: true, toolSessionStatus: 'completed', derivedMoves: ['keep_watch', 'hide', 'chase', 'hit_back'] });
  await C.queuePartCandidateHandler(input({ moveIds: ['hide'] }), ok.deps);
  assert.deepEqual(ok.log[0].moveIds, ['hide', 'chase', 'hit_back', 'keep_watch'], 'union, capped at 4');
});

test('queuePartCandidate over the fake driver: one state read derives the moves; FROM_SESSION out of the candidate', async () => {
  const f = fakeDriver((q) => {
    if (q === C.CANDIDATE_STATE_QUERY) return [{ partsOn: true, sessionFound: false, knownMoves: 0, toolSessionFound: true, toolSessionStatus: 'completed', derivedMoves: ['hide'] }];
    if (q === C.CANDIDATE_QUERY) return [{ id: CID }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  await fns.queuePartCandidate.run({ auth: auth('real-user'), data: { id: CID, origin: 'new_one', moveIds: [], toolSessionId: TSID } });
  const reads = f.calls.filter((c) => c.query === C.CANDIDATE_STATE_QUERY);
  assert.equal(reads.length, 1);
  assert.equal(reads[0].params.toolSessionKey, `real-user:${TSID}`);
  const write = f.calls.find((c) => c.query === C.CANDIDATE_QUERY);
  assert.deepEqual(write.params.moveIds, ['hide']);
  assert.match(C.CANDIDATE_STATE_QUERY, /x\.reviewStatus = 'approved'/, 'approved EXPRESSES edges only');
  assert.match(C.CANDIDATE_STATE_QUERY, /\(u\)-\[:HAS_TOOL_SESSION\]->\(ts:ToolSession \{key: \$toolSessionKey\}\)/, 'the caller\'s own');
  assert.match(C.CANDIDATE_QUERY, /MERGE \(c\)-\[:FROM_SESSION\]->\(x\)/);
  assert.doesNotMatch(C.CANDIDATE_QUERY, /MERGE \(\w*\)-\[:\w+\]->\(c\)[\s\S]*FROM_SESSION[\s\S]*SET ts|SET ts\./, 'the ToolSession is never written');
});

// ------------------------------------------------------------------ tagPart

const T = require('../../lib/parts/tag');
const TAG = '8e2c9a0e-1b2c-4d5e-8f90-123456789abc';
const TAG2 = '9f2c9a0e-1b2c-4d5e-8f90-123456789abc';

test('validateTag: three uuids, nothing else', () => {
  assert.deepEqual(T.validateTag({ id: TAG, partId: PID, toolSessionId: TSID }), { id: TAG, partId: PID, toolSessionId: TSID });
  bad(() => T.validateTag({ id: TAG, partId: PID }));
  bad(() => T.validateTag({ id: TAG, partId: 'hide', toolSessionId: TSID }));
  bad(() => T.validateTag({ id: TAG, partId: PID, toolSessionId: TSID, thenVsNow: 'better' }));
});

test('tagPart: refusals before any write; one tag per session', async () => {
  const good = { partsOn: true, partStatus: 'active', sessionFound: true, sessionStatus: 'completed', thenVsNow: 'better', toolId: 'five-senses', existingId: null };
  const fake = (st, wrote = true) => {
    const log = [];
    return { log, deps: { state: async () => ({ ...good, ...st }), write: async (t) => { log.push(t); return wrote; } } };
  };
  const req = T.validateTag({ id: TAG, partId: PID, toolSessionId: TSID });
  const refused = [
    [{ partsOn: false }, 'failed-precondition'],
    [{ partStatus: null }, 'not-found'],              // not the caller's part
    [{ partStatus: 'set_aside' }, 'not-found'],
    [{ sessionFound: false }, 'not-found'],           // not the caller's session
    [{ sessionStatus: 'open' }, 'failed-precondition'],
    [{ thenVsNow: 'same' }, 'failed-precondition'],
    [{ thenVsNow: 'worse' }, 'failed-precondition'],
    [{ thenVsNow: null }, 'failed-precondition'],     // Help now, a micro-step, an urge close: no then-vs-now
    [{ toolId: 'meet-a-part', thenVsNow: 'much_better' }, 'failed-precondition'],
  ];
  for (const [st, c] of refused) {
    const f = fake(st);
    await assert.rejects(T.tagPartHandler(req, f.deps), code(c), JSON.stringify(st));
    assert.equal(f.log.length, 0, JSON.stringify(st));
  }
  for (const thenVsNow of ['better', 'much_better']) {
    const f = fake({ thenVsNow, partStatus: 'resting' });
    assert.deepEqual(await T.tagPartHandler(req, f.deps), { id: TAG, created: true });
    assert.equal(f.log.length, 1);
  }
  // Already tagged (any id, any part): the first tag, nothing written.
  const again = fake({ existingId: TAG });
  assert.deepEqual(await T.tagPartHandler(T.validateTag({ id: TAG2, partId: NEW_PART, toolSessionId: TSID }), again.deps), { id: TAG, created: false });
  assert.equal(again.log.length, 0);
  // The guarded write stopped (state changed under it): refused.
  await assert.rejects(T.tagPartHandler(req, fake({}, false).deps), code('failed-precondition'));
});

test('tagPart over the fake driver: log layer, incoming edges only on the ToolSession, a lost race returns the first tag', async () => {
  assert.match(T.TAG_QUERY, /MERGE \(t:PartTag \{key: \$key\}\)\s+ON CREATE SET t:UserData:LogRecord/);
  assert.match(T.TAG_QUERY, /t\.source = 'close', t\.taggedKey = \$sessionKey/);
  for (const e of ['MERGE \\(u\\)-\\[:HAS_PART_TAG\\]->\\(t\\)', 'MERGE \\(t\\)-\\[:TAGS\\]->\\(ts\\)', 'MERGE \\(t\\)-\\[:OF_PART\\]->\\(pt\\)']) {
    assert.match(T.TAG_QUERY, new RegExp(e));
  }
  assert.doesNotMatch(T.TAG_QUERY, /\(ts\)-\[[^\]]*\]->|SET ts\b|SET pt\b|ts\.\w+ =|pt\.\w+ =/, 'nothing out of or onto the ToolSession or the Part');
  assert.match(T.TAG_QUERY, /ts\.status <> 'open' AND ts\.thenVsNow IN \$closes AND NOT ts\.toolId IN \$never/);
  assert.match(T.TAG_QUERY, /pt\.status IN \['active', 'resting'\]/);
  assert.match(T.TAG_QUERY, /coalesce\(u\.partsEnabled, false\)/);

  let reads = 0;
  const f = fakeDriver((q) => {
    if (q === T.TAG_STATE_QUERY) {
      reads += 1;
      return [{ partsOn: true, partStatus: 'active', sessionFound: true, sessionStatus: 'completed', thenVsNow: 'better', toolId: 'five-senses', existingId: reads > 1 ? TAG : null }];
    }
    if (q === T.TAG_QUERY) {
      const e = new Error('Node(1) already exists with label `PartTag` and property `taggedKey` = ...');
      e.code = 'Neo.ClientError.Schema.ConstraintValidationFailed';
      throw e;
    }
    return new Error('unexpected');
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.tagPart.run({ auth: auth('real-user'), data: { id: TAG2, partId: PID, toolSessionId: TSID } }), { id: TAG, created: false });
  const st = f.calls.find((c) => c.query === T.TAG_STATE_QUERY);
  assert.deepEqual([st.params.uid, st.params.partKey, st.params.sessionKey], ['real-user', `real-user:${PID}`, `real-user:${TSID}`]);
  await assert.rejects(fns.tagPart.run({ auth: auth(), data: { id: TAG, partId: PID } }), code('invalid-argument'));
});

// ---- The part card writers (keep.ts): rename, rest, set aside, restore, tender, still-true ----

const E = require('../../lib/parts/editPlan');
const RID = '7d2c9a0e-1b2c-4d5e-8f90-123456789abc';

function fakeEdit({ partsOn = true, part = { status: 'active', tender: false, name: 'the hider' }, revisitLogged = false,
  knownRather = null, version = 7, writeVersion = 8, nameMax = 40, revisitDays = 30 } = {}) {
  const log = [];
  const deps = {
    state: async (q) => {
      log.push(['state', q]);
      return { partsOn, version, part, revisitLogged, knownRather: knownRather ?? (q.ratherIds ?? []).length, nameMax, revisitDays };
    },
    write: async (query, params) => { log.push(['write', query, params]); return writeVersion; },
  };
  return { deps, log, writes: () => log.filter(([k]) => k === 'write') };
}

const WRITERS = [
  ['rename', (d) => K.renamePartHandler({ partId: PID, name: 'new' }, d)],
  ['rest', (d) => K.restPartHandler({ partId: PID, resting: true }, d)],
  ['setAside', (d) => K.setAsidePartHandler({ partId: PID }, d)],
  ['restore', (d) => K.restorePartHandler({ partId: PID }, d)],
  ['tender', (d) => K.setPartTenderHandler({ partId: PID }, d)],
  ['revisit', (d) => K.answerPartRevisitHandler({ id: RID, partId: PID, answer: 'same', ratherIds: [] }, d)],
];

test('part writers: parts off is failed-precondition and another person\'s (or no) part is not-found, before any write', async () => {
  for (const [name, run] of WRITERS) {
    const off = fakeEdit({ partsOn: false });
    await assert.rejects(run(off.deps), code('failed-precondition'), name);
    const none = fakeEdit({ part: null });
    await assert.rejects(run(none.deps), code('not-found'), name);
    assert.equal(off.writes().length + none.writes().length, 0, name);
  }
});

test('part writers: a write its guard stopped (the part changed under it) is failed-precondition', async () => {
  const f = fakeEdit({ writeVersion: null });
  await assert.rejects(K.setAsidePartHandler({ partId: PID }, f.deps), code('failed-precondition'));
});

test('renamePart: keptName rules (trim, ≤ policy max, empty is "Not yet"); the same name is a no-op', async () => {
  const f = fakeEdit();
  assert.deepEqual(await K.renamePartHandler(E.validateRename({ partId: PID, name: '  the watcher ' }), f.deps), { version: 8 });
  assert.equal(f.writes()[0][1], K.RENAME_PART_QUERY);
  assert.equal(f.writes()[0][2].name, 'the watcher');
  const empty = fakeEdit();
  await K.renamePartHandler(E.validateRename({ partId: PID, name: '' }), empty.deps);
  assert.equal(empty.writes()[0][2].name, null);
  const same = fakeEdit();
  assert.deepEqual(await K.renamePartHandler({ partId: PID, name: 'the hider' }, same.deps), { version: 7 });
  assert.equal(same.writes().length, 0);
  await assert.rejects(K.renamePartHandler({ partId: PID, name: 'x'.repeat(13) }, fakeEdit({ nameMax: 12 }).deps), (e) => e.name === 'ValidationError');
  assert.throws(() => E.validateRename({ partId: PID }), /name/);
  assert.throws(() => E.validateRename({ partId: PID, name: 'a', tender: true }), /tender/);
});

test('restPart: active ⇄ resting; repeats are no-ops; a set-aside part is refused; revisitAt untouched', async () => {
  const f = fakeEdit();
  await K.restPartHandler({ partId: PID, resting: true }, f.deps);
  assert.deepEqual([f.writes()[0][1], f.writes()[0][2].from, f.writes()[0][2].to], [K.REST_PART_QUERY, 'active', 'resting']);
  const wake = fakeEdit({ part: { status: 'resting' } });
  await K.restPartHandler({ partId: PID, resting: false }, wake.deps);
  assert.deepEqual([wake.writes()[0][2].from, wake.writes()[0][2].to], ['resting', 'active']);
  for (const [status, resting] of [['resting', true], ['active', false]]) {
    const again = fakeEdit({ part: { status } });
    assert.deepEqual(await K.restPartHandler({ partId: PID, resting }, again.deps), { version: 7 });
    assert.equal(again.writes().length, 0);
  }
  for (const resting of [true, false]) {
    await assert.rejects(K.restPartHandler({ partId: PID, resting }, fakeEdit({ part: { status: 'set_aside' } }).deps), code('failed-precondition'));
  }
  assert.match(K.REST_PART_QUERY, /WHERE coalesce\(u\.partsEnabled, false\) AND p\.status = \$from/);
  assert.doesNotMatch(K.REST_PART_QUERY, /revisitAt/);
  assert.throws(() => E.validateRest({ partId: PID, resting: 'yes' }), /resting/);
});

test('setAsidePart / restorePart: like the profile items (status, lastReviewedAt; restore confirms and re-dates)', async () => {
  const f = fakeEdit({ part: { status: 'resting' } });
  await K.setAsidePartHandler({ partId: PID }, f.deps);
  assert.equal(f.writes()[0][1], K.SET_ASIDE_PART_QUERY);
  assert.match(K.SET_ASIDE_PART_QUERY, /SET p\.status = 'set_aside', p\.lastReviewedAt = datetime\(\)/);
  assert.doesNotMatch(K.SET_ASIDE_PART_QUERY, /DELETE|REMOVE/, 'every field and edge stays');
  const again = fakeEdit({ part: { status: 'set_aside' } });
  assert.deepEqual(await K.setAsidePartHandler({ partId: PID }, again.deps), { version: 7 });
  assert.equal(again.writes().length, 0);

  const r = fakeEdit({ part: { status: 'set_aside' }, revisitDays: 45 });
  await K.restorePartHandler({ partId: PID }, r.deps);
  assert.deepEqual([r.writes()[0][1], r.writes()[0][2].revisitDays], [K.RESTORE_PART_QUERY, 45]);
  assert.match(K.RESTORE_PART_QUERY, /p\.status = 'active', p\.confirmedAt = datetime\(\), p\.lastReviewedAt = datetime\(\), p\.revisitAt = datetime\(\) \+ duration\(\{days: \$revisitDays\}\)/);
  for (const status of ['active', 'resting']) {
    const no = fakeEdit({ part: { status } });
    assert.deepEqual(await K.restorePartHandler({ partId: PID }, no.deps), { version: 7 });
    assert.equal(no.writes().length, 0, `restore leaves a ${status} part as it is`);
  }
});

test('setPartTender: true only, idempotent; no query ever sets it false', async () => {
  const f = fakeEdit();
  await K.setPartTenderHandler({ partId: PID }, f.deps);
  assert.equal(f.writes()[0][1], K.SET_PART_TENDER_QUERY);
  const again = fakeEdit({ part: { status: 'active', tender: true } });
  assert.deepEqual(await K.setPartTenderHandler({ partId: PID }, again.deps), { version: 7 });
  assert.equal(again.writes().length, 0);
  const src = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../src/parts/keep.ts'), 'utf8');
  assert.doesNotMatch(src, /tender = false/);
  assert.throws(() => E.validatePartRef({ partId: PID, tender: false }), /tender/);
});

test('validateRevisit: the answer set; ratherIds 1–3 only with new, no non-answers or duplicates', () => {
  assert.deepEqual(E.validateRevisit({ id: RID, partId: PID, answer: 'same' }), { id: RID, partId: PID, answer: 'same', ratherIds: [] });
  assert.deepEqual(E.validateRevisit({ id: RID, partId: PID, answer: 'new', ratherIds: ['hide_rather_break'] }).ratherIds, ['hide_rather_break']);
  for (const bad of [
    { answer: 'maybe' }, { answer: 'new' }, { answer: 'new', ratherIds: [] }, { answer: 'new', ratherIds: ['a', 'b', 'c', 'd'] },
    { answer: 'new', ratherIds: ['rather_not_sure'] }, { answer: 'new', ratherIds: ['own_words'] }, { answer: 'new', ratherIds: ['a', 'a'] },
    { answer: 'same', ratherIds: ['a'] }, { answer: 'same', note: 'x' },
  ]) assert.throws(() => E.validateRevisit({ id: RID, partId: PID, ...bad }), JSON.stringify(bad));
});

test('answerPartRevisit: each answer for an active part, then for a resting part; wrong-status answers refused', async () => {
  const cases = [
    ['active', 'same', 'active'], ['active', 'less', 'active'], ['active', 'resting', 'resting'],
    ['resting', 'still_quiet', 'resting'], ['resting', 'back', 'active'],
  ];
  for (const [from, answer, to] of cases) {
    const f = fakeEdit({ part: { status: from }, revisitDays: 30 });
    assert.deepEqual(await K.answerPartRevisitHandler({ id: RID, partId: PID, answer, ratherIds: [] }, f.deps), { version: 8 });
    const [, q, p] = f.writes()[0];
    assert.equal(q, K.ANSWER_PART_REVISIT_QUERY);
    assert.deepEqual([p.from, p.to, p.answer, p.revisitDays, p.jobFields], [from, to, answer, 30, {}], answer);
  }
  for (const [status, answer] of [['active', 'still_quiet'], ['active', 'back'], ['resting', 'same'], ['resting', 'less'],
    ['resting', 'resting'], ['set_aside', 'same'], ['set_aside', 'back']]) {
    const f = fakeEdit({ part: { status } });
    await assert.rejects(K.answerPartRevisitHandler({ id: RID, partId: PID, answer, ratherIds: [] }, f.deps), code('failed-precondition'), `${status}/${answer}`);
    assert.equal(f.writes().length, 0);
  }
  const q = K.ANSWER_PART_REVISIT_QUERY;
  assert.match(q, /p\.confirmedAt = datetime\(\), p\.lastReviewedAt = datetime\(\),\s+p\.reviewCount = coalesce\(p\.reviewCount, 0\) \+ 1, p\.revisitAt = datetime\(\) \+ duration\(\{days: \$revisitDays\}\)/);
  assert.match(q, /WHERE coalesce\(u\.partsEnabled, false\) AND p\.status = \$from/);
});

test('answerPartRevisit new: the old job to the history (newest 10), rather ids become the job and leave preferredRoleIds', async () => {
  const old = Array.from({ length: 10 }, (_, i) => ({ jobIds: [`j${i}`], ownJob: null, until: '2026-01-01' }));
  const part = { status: 'active', jobIds: ['hide_job_out_of_sight'], ownJob: 'keeps me out of sight', jobHistoryJson: JSON.stringify(old),
    preferredRoleIds: ['hide_rather_break', 'hide_rather_need_someone'] };
  const f = fakeEdit({ part });
  await K.answerPartRevisitHandler({ id: RID, partId: PID, answer: 'new', ratherIds: ['hide_rather_break'] }, f.deps, '2026-10-16');
  const jf = f.writes()[0][2].jobFields;
  assert.deepEqual(jf.jobIds, ['hide_rather_break']);
  assert.equal(jf.ownJob, null);
  assert.deepEqual(jf.preferredRoleIds, ['hide_rather_need_someone']);
  const h = JSON.parse(jf.jobHistoryJson);
  assert.equal(h.length, 10, 'capped at the newest 10');
  assert.deepEqual(h.at(-1), { jobIds: ['hide_job_out_of_sight'], ownJob: 'keeps me out of sight', until: '2026-10-16' });
  assert.equal(h[0].jobIds[0], 'j1', 'the oldest dropped');
  assert.deepEqual(f.log[0][1].ratherIds, ['hide_rather_break'], 'the rather ids are checked in the state read');

  const unknown = fakeEdit({ part, knownRather: 0 });
  await assert.rejects(K.answerPartRevisitHandler({ id: RID, partId: PID, answer: 'new', ratherIds: ['made_up'] }, unknown.deps), code('invalid-argument'));
  assert.equal(unknown.writes().length, 0);
  assert.deepEqual(JSON.parse(E.newJob({ jobIds: [], ownJob: null }, ['a'], '2026-10-16').jobHistoryJson), [], 'an empty job is not recorded');
  assert.match(K.PART_STATE_QUERY, /OPTIONAL MATCH \(o:PartOption \{flow: 'meet', step: 'rather'\}\) WHERE o\.id IN \$ratherIds/);
});

test('answerPartRevisit: logged once per id; a repeat applies nothing twice', async () => {
  const f = fakeEdit({ revisitLogged: true, part: { status: 'resting' } });
  assert.deepEqual(await K.answerPartRevisitHandler({ id: RID, partId: PID, answer: 'resting', ratherIds: [] }, f.deps), { version: 7 });
  assert.equal(f.writes().length, 0);
  const q = K.ANSWER_PART_REVISIT_QUERY;
  assert.match(q, /AND NOT EXISTS \{ MATCH \(:PartRevisit \{key: \$revisitKey\}\) \}\s+MERGE \(r:PartRevisit \{key: \$revisitKey\}\)\s+ON CREATE SET r:UserData:LogRecord/);
  assert.match(q, /MERGE \(u\)-\[:HAS_PART_REVISIT\]->\(r\)\s+MERGE \(r\)-\[:OF_PART\]->\(p\)/);
});

test('part writers over the fake driver: caller-scoped keys, signed in, profile version returned', async () => {
  const f = fakeDriver((q, p) => {
    if (q === K.PART_STATE_QUERY) return [{ partsOn: true, version: 3, part: { status: 'active' }, revisitLogged: false, nameMaxChars: 40, revisitAfterDays: 30, knownRather: p.ratherIds.length }];
    if (q === K.ANSWER_PART_REVISIT_QUERY) return [{ version: 4 }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  const out = await fns.answerPartRevisit.run({ auth: auth('real-user'), data: { id: RID, partId: PID, answer: 'less' } });
  assert.deepEqual(out, { version: 4 });
  const w = f.calls.find((c) => c.query === K.ANSWER_PART_REVISIT_QUERY);
  assert.deepEqual([w.params.uid, w.params.partKey, w.params.revisitKey, w.params.id], ['real-user', `real-user:${PID}`, `real-user:${RID}`, RID]);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  for (const name of ['renamePart', 'restPart', 'setAsidePart', 'restorePart', 'setPartTender', 'answerPartRevisit']) {
    await assert.rejects(fns[name].run({ auth: auth(), data: { partId: 'not-a-uuid' } }), code('invalid-argument'), name);
  }
});

// ---- DEAR MAN's cope ahead: the part's anchor (keep.ts, the only Part writer) ----

const OWN_LINE = '1b2c3d4e-5f60-4718-9a0b-c1d2e3f4a5b6';

function fakeAnchor({ lineOwned = true, ...rest } = {}) {
  const f = fakeEdit(rest);
  const state = f.deps.state;
  f.deps.state = async (q) => ({ ...(await state(q)), lineOwned: q.lineId ? lineOwned : false });
  return f;
}

test('validateAnchor: exactly one of lineId or own; own trimmed, 1–90 characters, never linted; nothing else', () => {
  assert.deepEqual(E.validateAnchor({ partId: PID, lineId: 'wit_l1_flat_01' }), { partId: PID, lineId: 'wit_l1_flat_01', own: null });
  assert.deepEqual(E.validateAnchor({ partId: PID, lineId: OWN_LINE, own: null }), { partId: PID, lineId: OWN_LINE, own: null });
  assert.deepEqual(E.validateAnchor({ partId: PID, own: "  You just should calm down, it's fine!  " }),
    { partId: PID, lineId: null, own: "You just should calm down, it's fine!" }, 'own words are never linted');
  assert.equal(E.validateAnchor({ partId: PID, own: 'x'.repeat(90) }).own.length, 90);
  for (const bad of [
    {}, { lineId: 'l1', own: 'both' }, { own: '' }, { own: '   ' }, { own: 'x'.repeat(91) }, { own: 7 },
    { lineId: 'Not An Id!' }, { lineId: 5 }, { own: 'ok', text: 'x' },
  ]) assert.throws(() => E.validateAnchor({ partId: PID, ...bad }), (e) => e.name === 'ValidationError', JSON.stringify(bad));
  assert.throws(() => E.validateAnchor({ partId: 'nope', own: 'ok' }), (e) => e.name === 'ValidationError');
});

test('setPartAnchor: a kept line sets anchorLineId and clears anchorOwn; own words the reverse; version bumped', async () => {
  const line = fakeAnchor();
  assert.deepEqual(await K.setPartAnchorHandler({ partId: PID, lineId: OWN_LINE, own: null }, line.deps), { version: 8 });
  assert.deepEqual(line.log[0], ['state', { partId: PID, lineId: OWN_LINE }]);
  assert.deepEqual(line.writes()[0].slice(1), [K.SET_PART_ANCHOR_QUERY, { partId: PID, lineId: OWN_LINE, own: null }]);
  const own = fakeAnchor({ part: { status: 'resting', anchorLineId: OWN_LINE } });
  await K.setPartAnchorHandler({ partId: PID, lineId: null, own: 'I can come back to this' }, own.deps);
  assert.deepEqual(own.log[0], ['state', { partId: PID }], 'own words need no line check');
  assert.deepEqual(own.writes()[0][2], { partId: PID, lineId: null, own: 'I can come back to this' });
  assert.match(K.SET_PART_ANCHOR_QUERY, /WHERE coalesce\(u\.partsEnabled, false\) AND p\.status IN \['active', 'resting'\]/);
  assert.match(K.SET_PART_ANCHOR_QUERY, /SET p\.anchorLineId = \$lineId, p\.anchorOwn = \$own/);
  assert.match(K.SET_PART_ANCHOR_QUERY, /u\.profileVersion = coalesce\(u\.profileVersion, 0\) \+ 1/);
});

test('setPartAnchor: the line must be the caller\'s own (OwnLine they have, ValidationLine they kept); idempotent', async () => {
  const notMine = fakeAnchor({ lineOwned: false });
  await assert.rejects(K.setPartAnchorHandler({ partId: PID, lineId: 'wit_l1_flat_01', own: null }, notMine.deps), code('not-found'));
  assert.equal(notMine.writes().length, 0);
  assert.match(K.PART_STATE_QUERY, /OPTIONAL MATCH \(u\)-\[:HAS_OWN_LINE\]->\(ol:OwnLine \{key: \$lineKey\}\) WHERE ol\.status = 'active'/);
  assert.match(K.PART_STATE_QUERY, /OPTIONAL MATCH \(u\)-\[:SAVED_LINE\]->\(vl:ValidationLine \{id: \$lineId\}\)/);
  for (const [part, input] of [
    [{ status: 'active', anchorLineId: OWN_LINE, anchorOwn: null }, { partId: PID, lineId: OWN_LINE, own: null }],
    [{ status: 'active', anchorOwn: 'breathe first' }, { partId: PID, lineId: null, own: 'breathe first' }],
  ]) {
    const same = fakeAnchor({ part });
    assert.deepEqual(await K.setPartAnchorHandler(input, same.deps), { version: 7 });
    assert.equal(same.writes().length, 0);
  }
});

test('setPartAnchor: parts off, no part, a set-aside part: refused before any write', async () => {
  const run = (d) => K.setPartAnchorHandler({ partId: PID, lineId: null, own: 'ok' }, d);
  const off = fakeAnchor({ partsOn: false });
  await assert.rejects(run(off.deps), code('failed-precondition'));
  const none = fakeAnchor({ part: null });
  await assert.rejects(run(none.deps), code('not-found'));
  const aside = fakeAnchor({ part: { status: 'set_aside' } });
  await assert.rejects(run(aside.deps), code('failed-precondition'));
  assert.equal(off.writes().length + none.writes().length + aside.writes().length, 0);
});

test('setPartAnchor over the fake driver: caller-scoped part and line keys, signed in, invalid input refused', async () => {
  const f = fakeDriver((q, p) => {
    if (q === K.PART_STATE_QUERY) return [{ partsOn: true, version: 3, part: { status: 'active' }, revisitLogged: false, nameMaxChars: 40, revisitAfterDays: 30, knownRather: 0, lineOwned: p.lineKey === `real-user:${OWN_LINE}` }];
    if (q === K.SET_PART_ANCHOR_QUERY) return [{ version: 4 }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.setPartAnchor.run({ auth: auth('real-user'), data: { partId: PID, lineId: OWN_LINE } }), { version: 4 });
  const s = f.calls.find((c) => c.query === K.PART_STATE_QUERY);
  assert.deepEqual([s.params.partKey, s.params.lineId, s.params.lineKey], [`real-user:${PID}`, OWN_LINE, `real-user:${OWN_LINE}`]);
  const w = f.calls.find((c) => c.query === K.SET_PART_ANCHOR_QUERY);
  assert.deepEqual([w.params.uid, w.params.partKey, w.params.lineId, w.params.own], ['real-user', `real-user:${PID}`, OWN_LINE, null]);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  await assert.rejects(fns.setPartAnchor.run({ auth: auth('real-user'), data: { partId: PID, lineId: OWN_LINE, own: 'both' } }), code('invalid-argument'));
  await assert.rejects(fns.setPartAnchor.run({ auth: auth('real-user'), data: { partId: PID, own: 'x'.repeat(91) } }), code('invalid-argument'));
  await assert.rejects(fns.setPartAnchor.run({ data: { partId: PID, own: 'ok' } }), code('unauthenticated'));
});
