'use strict';
/**
 * Two pulls (docs/design/parts.md, "Two pulls (polarities)"): the visit's PullsSession, the keepsake kept
 * to My words, the week check-back for both kept parts, Today's card and the rule C trail's More than one.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const V = require('../../lib/parts/pulls/validation');
const S = require('../../lib/parts/pulls/session');
const KS = require('../../lib/parts/pulls/keepsake');
const CB = require('../../lib/parts/pulls/checkback');
const PCB = require('../../lib/parts/checkback');
const TY = require('../../lib/parts/pulls/types');
const A = require('../../lib/parts/offers/answer');
const L = require('../../lib/parts/links');
const { writable: guardAllows } = require('../../lib/userdata/lifecycle');
const { USER_DATA } = require('../../lib/userdata/layers');

const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;
const SID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PA = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PB = '5b2c9a0e-1b2c-4d5e-8f90-123456789abc';
const LID = '6c2c9a0e-1b2c-4d5e-8f90-123456789abc';
const FID = '7d2c9a0e-1b2c-4d5e-8f90-123456789abc';
const OID = 'rule_c:hide+push:none';
const inH = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

// ------------------------------------------------------------------ validation

test('validateStartPulls: two different kept parts, or a pair (with its offer); two different moves; nothing else', () => {
  assert.deepEqual(V.validateStartPulls({ id: SID, aId: PA, bId: PB, moveA: 'hide', moveB: 'push' }),
    { id: SID, aId: PA, bId: PB, pairId: null, offerId: null, moveA: 'hide', moveB: 'push' });
  assert.equal(V.validateStartPulls({ id: SID, aId: PA, bId: PB, pairId: 'pair_hide_push', moveA: 'hide', moveB: 'push' }).pairId, 'pair_hide_push');
  assert.deepEqual(V.validateStartPulls({ id: SID, pairId: 'pair_hide_push', offerId: OID, moveA: 'hide', moveB: 'push' }).offerId, OID);
  const bad = [
    { id: SID, aId: PA, moveA: 'hide', moveB: 'push' }, // one part
    { id: SID, aId: PA, bId: PA, moveA: 'hide', moveB: 'push' }, // the same part twice
    { id: SID, moveA: 'hide', moveB: 'push' }, // neither
    { id: SID, aId: PA, bId: PB, offerId: OID, pairId: 'p', moveA: 'hide', moveB: 'push' }, // an offer with parts
    { id: SID, offerId: OID, moveA: 'hide', moveB: 'push' }, // an offer without a pair
    { id: SID, pairId: 'p', moveA: 'hide', moveB: 'hide' }, // one move
    { id: SID, pairId: 'p', moveA: 'Hide!', moveB: 'push' },
    { id: SID, pairId: 'p', moveA: 'hide', moveB: 'push', name: 'x' }, // an unknown key
    { id: 'nope', pairId: 'p', moveA: 'hide', moveB: 'push' },
  ];
  for (const b of bad) assert.throws(() => V.validateStartPulls(b), /./, JSON.stringify(b));
});

test('validateSavePulls: the light is a 0–1 point, feelings come with their sides, own words length-checked only', () => {
  const out = V.validateSavePulls({ id: SID, final: true, patch: {
    lightAt: [0.25, 0.75], feelTowardIds: ['feel_curious', 'feel_angry'], feelTowardSides: ['a', 'b'], blendCheck: 'notice',
    steppedBack: true, needsTimeSide: 'b', stepBackHolds: 3, worryA: 'worry_alone', ownWorryB: '  they would go  ', bothWantId: 'want_safe',
    stopReason: 'done', exitStep: 'close', handoffs: [],
  } });
  assert.equal(out.final, true);
  assert.deepEqual(out.props.lightAt, [0.25, 0.75]);
  assert.equal(out.props.ownWorryB, 'they would go');
  assert.equal(out.props.handoffsJson, null);
  assert.equal(V.validateSavePulls({ id: SID, patch: { ownWorryA: '   ' } }).props.ownWorryA, null, 'blank clears');
  const bad = [
    { lightAt: [1.5, 0] }, { lightAt: [0.5] },
    { feelTowardIds: ['feel_curious'] }, // no sides
    { feelTowardIds: ['feel_curious'], feelTowardSides: ['a', 'b'] },
    { feelTowardSides: ['c'], feelTowardIds: ['x'] },
    { feelTowardIds: Array(7).fill('x'), feelTowardSides: Array(7).fill('a') },
    { stepBackHolds: 6 }, { blendCheck: 'maybe' }, { stopReason: 'won' }, { exitStep: 'winner' },
    { ownWorryA: 'x'.repeat(2000) }, { winner: 'a' },
  ];
  for (const patch of bad) assert.throws(() => V.validateSavePulls({ id: SID, patch }), /./, JSON.stringify(patch));
  assert.throws(() => V.validateSavePulls({ id: SID, patch: {}, final: 'yes' }));
});

// ------------------------------------------------------------------ session

const startDeps = (o = {}) => {
  const created = [];
  return {
    created,
    deps: {
      startState: async () => ({ partsOn: true, aFound: true, bFound: true, aMoves: ['hide'], bMoves: ['push'], pair: null,
        offerFound: false, offerPairId: null, status: null, ...o }),
      create: async (s) => { created.push(s); },
      saveState: async () => ({ partsOn: true, status: 'open', ...o }),
      save: async (_id, _p, final) => (o.guard === false ? null : final ? 'saved' : 'open'),
    },
  };
};
const parts = V.validateStartPulls({ id: SID, aId: PA, bId: PB, moveA: 'hide', moveB: 'push' });
const pair = V.validateStartPulls({ id: SID, pairId: 'pair_hide_push', offerId: OID, moveA: 'hide', moveB: 'push' });

test('startPullsSession: parts on; both parts kept and using their side\'s move; the pair\'s sides in order; open once', async () => {
  const a = startDeps();
  assert.deepEqual(await S.startPullsSessionHandler(parts, a.deps), { id: SID, status: 'open' });
  assert.equal(a.created.length, 1);
  await assert.rejects(S.startPullsSessionHandler(parts, startDeps({ partsOn: false }).deps), code('failed-precondition'));
  await assert.rejects(S.startPullsSessionHandler(parts, startDeps({ bFound: false }).deps), code('not-found'), 'set aside or not theirs');
  await assert.rejects(S.startPullsSessionHandler(parts, startDeps({ bMoves: ['hide'] }).deps), code('invalid-argument'));
  const p = startDeps({ aFound: false, bFound: false, pair: { a: 'hide', b: 'push' }, offerFound: true, offerPairId: 'pair_hide_push' });
  assert.deepEqual(await S.startPullsSessionHandler(pair, p.deps), { id: SID, status: 'open' });
  await assert.rejects(S.startPullsSessionHandler(pair, startDeps({ pair: { a: 'push', b: 'hide' }, offerFound: true, offerPairId: 'pair_hide_push' }).deps), code('invalid-argument'));
  await assert.rejects(S.startPullsSessionHandler(pair, startDeps({ pair: null }).deps), code('not-found'));
  await assert.rejects(S.startPullsSessionHandler(pair, startDeps({ pair: { a: 'hide', b: 'push' }, offerFound: true, offerPairId: 'other' }).deps), code('not-found'), 'another pair\'s offer');
  const again = startDeps({ status: 'open' });
  assert.deepEqual(await S.startPullsSessionHandler(parts, again.deps), { id: SID, status: 'open' });
  assert.equal(again.created.length, 0, 'idempotent while open');
  await assert.rejects(S.startPullsSessionHandler(parts, startDeps({ status: 'saved' }).deps), code('failed-precondition'), 'finalise-once');
});

test('savePullsSession: finalise-once; parts on; the guarded write', async () => {
  assert.deepEqual(await S.savePullsSessionHandler({ id: SID, patch: { stepBackHolds: 2 } }, startDeps().deps), { id: SID, status: 'open' });
  assert.deepEqual(await S.savePullsSessionHandler({ id: SID, patch: {}, final: true }, startDeps().deps), { id: SID, status: 'saved' });
  await assert.rejects(S.savePullsSessionHandler({ id: SID, patch: {} }, startDeps({ status: 'saved' }).deps), code('failed-precondition'));
  await assert.rejects(S.savePullsSessionHandler({ id: SID, patch: {} }, startDeps({ status: null }).deps), code('not-found'));
  await assert.rejects(S.savePullsSessionHandler({ id: SID, patch: {} }, startDeps({ partsOn: false }).deps), code('failed-precondition'));
  await assert.rejects(S.savePullsSessionHandler({ id: SID, patch: {} }, startDeps({ guard: false }).deps), code('failed-precondition'), 'saved in between');
  assert.match(S.PULLS_SAVE_QUERY, /WHERE ps\.status = 'open'/);
  assert.ok(guardAllows('PullsSession', 'save', { status: 'open' }));
  assert.ok(!guardAllows('PullsSession', 'save', { status: 'saved', savedAt: new Date().toISOString() }));
  assert.ok(guardAllows('PullsSession', 'keep', { status: 'saved', savedAt: new Date().toISOString() }));
  assert.ok(!guardAllows('PullsSession', 'keep', { status: 'saved', savedAt: inH(-13) }));
});

test('the callables write one log record per visit, keyed by the caller, ask-fresh fields on it only', async () => {
  const f = fakeDriver((q) => {
    if (q === S.PULLS_START_STATE_QUERY) return [{ partsOn: true, aFound: true, bFound: true, aMoves: ['hide'], bMoves: ['push'], pairA: null, pairB: null, status: null, offerFound: false, offerPairId: null }];
    if (q === S.PULLS_SAVE_STATE_QUERY) return [{ partsOn: true, status: 'open' }];
    if (q === S.PULLS_SAVE_QUERY) return [{ status: 'saved' }];
    return [];
  });
  setDriver(f.driver);
  await fns.startPullsSession.run({ auth: auth('u4'), data: { id: SID, aId: PA, bId: PB, moveA: 'hide', moveB: 'push' } });
  const c = f.calls.find((x) => x.query === S.PULLS_CREATE_QUERY);
  assert.deepEqual([c.params.key, c.params.aKey, c.params.bKey, c.params.entry], [`u4:${SID}`, `u4:${PA}`, `u4:${PB}`, 'parts']);
  assert.match(S.PULLS_CREATE_QUERY, /ON CREATE SET ps:UserData:LogRecord/);
  assert.match(S.PULLS_CREATE_QUERY, /MERGE \(u\)-\[:HAS_PULLS_SESSION\]->\(ps\)/);
  await fns.savePullsSession.run({ auth: auth('u4'), data: { id: SID, final: true, patch: { feelTowardIds: ['feel_curious'], feelTowardSides: ['a'], blendCheck: 'notice' } } });
  const s = f.calls.find((x) => x.query === S.PULLS_SAVE_QUERY);
  assert.deepEqual(s.params.props, { feelTowardIds: ['feel_curious'], feelTowardSides: ['a'], blendCheck: 'notice' });
  assert.ok(!f.calls.some((x) => /:Part\b[^]*SET [^]*feelToward/.test(x.query)), 'never on a part');
  assert.deepEqual(USER_DATA.PullsSession, { layer: 'log', rel: 'HAS_PULLS_SESSION', exportAs: 'pullsSessions' });
  for (const n of ['startPullsSession', 'savePullsSession', 'keepPullsKeepsake', 'schedulePullsCheckback']) {
    await assert.rejects(fns[n].run({ data: {} }), code('unauthenticated'));
  }
});

// ------------------------------------------------------------------ keepsake

const COPY = {
  keepsake_both_want: '{A} and {B} both want {want}.', keepsake_choose: 'I get to choose what happens next.',
  pulls_pair_name: 'the part that {move}',
};
const ksState = (o = {}) => ({
  partsOn: true, sessionFound: true, keepable: true, entry: 'parts', stopReason: 'done', aId: PA, bId: PB,
  a: { found: true, name: 'the watcher', unblendPhrase: 'keeps watch' }, b: { found: true, name: 'Rocket', unblendPhrase: 'pushes on' },
  want: 'to keep you safe', bothWantId: 'want_safe', copy: COPY, existing: null, ...o,
});
const ksDeps = (o = {}) => {
  const writes = [];
  const links = [];
  return { writes, links, deps: { state: async () => ksState(o), write: async (w) => { writes.push(w); return 9; }, version: async () => 8,
    link: async (l) => { links.push(l); return { id: 'link1', version: 10 }; } } };
};
const KEEP = { sessionId: SID, lineId: LID };

test('keepsake: built on the server from the stored visit, both names and what they both want, kept once', async () => {
  const k = ksDeps();
  // A kept name that opens the line takes a capital in the line only ("the watcher" stays as kept).
  assert.deepEqual(await KS.keepPullsKeepsakeHandler(KEEP, k.deps),
    { lineId: LID, text: 'The watcher and Rocket both want to keep you safe. I get to choose what happens next.', version: 10, linkId: 'link1' });
  assert.deepEqual(k.writes[0].partIds, [PA, PB], 'two kept parts');
  assert.deepEqual(k.links, [{ aId: PA, bId: PB, bothWantId: 'want_safe' }], 'the same yes links them in the den');
  // Pair only: the generated names, the lead capitalised; no part ids.
  const p = ksDeps({ entry: 'pair', aId: null, bId: null, a: { found: false, name: null, unblendPhrase: 'keeps watch' }, b: { found: false, name: null, unblendPhrase: 'pushes on' } });
  const out = await KS.keepPullsKeepsakeHandler(KEEP, p.deps);
  assert.equal(out.text, 'The part that keeps watch and the part that pushes on both want to keep you safe. I get to choose what happens next.');
  assert.deepEqual(p.writes[0].partIds, []);
  assert.equal(p.links.length, 0, 'pair only: no parts to link');
  assert.equal(out.linkId, undefined);
  // A repeat returns the line, writes nothing.
  const r = ksDeps({ existing: { text: 'kept before' } });
  assert.deepEqual(await KS.keepPullsKeepsakeHandler(KEEP, r.deps), { lineId: LID, text: 'kept before', version: 8 });
  assert.equal(r.writes.length + r.links.length, 0);
});

test('keepsake refusals: parts off, not found, past keeping, a conservative stop, no want, a part gone, copy not signed off', async () => {
  const refuse = async (o, c) => assert.rejects(KS.keepPullsKeepsakeHandler(KEEP, ksDeps(o).deps), code(c), JSON.stringify(o));
  await refuse({ partsOn: false }, 'failed-precondition');
  await refuse({ sessionFound: false }, 'not-found');
  await refuse({ keepable: false }, 'failed-precondition');
  for (const stopReason of ['own_words', 'danger', 'not_self']) await refuse({ stopReason }, 'failed-precondition');
  await refuse({ want: null }, 'failed-precondition');
  await refuse({ b: { found: false, name: null, unblendPhrase: 'pushes on' } }, 'failed-precondition');
  await refuse({ copy: { keepsake_both_want: COPY.keepsake_both_want } }, 'failed-precondition');
  await refuse({ entry: 'pair', a: { found: false, name: null, unblendPhrase: null } }, 'failed-precondition');
});

test('keepsake write: an OwnLine in My words (profile), the visit\'s KEPT_LINE under the keep guard, a profile version', async () => {
  assert.match(KS.KEEPSAKE_WRITE_QUERY, /MERGE \(o:OwnLine \{key: \$lineKey\}\)/);
  assert.match(KS.KEEPSAKE_WRITE_QUERY, /o:UserData:ProfileItem/);
  assert.match(KS.KEEPSAKE_WRITE_QUERY, /o\.area = 'my_words'/);
  assert.match(KS.KEEPSAKE_WRITE_QUERY, /o\.source = 'two_pulls'/);
  assert.match(KS.KEEPSAKE_WRITE_QUERY, /MERGE \(x\)-\[:KEPT_LINE\]->\(o\)/);
  assert.match(KS.KEEPSAKE_WRITE_QUERY, /u\.profileVersion = coalesce\(u\.profileVersion, 0\) \+ 1/);
  assert.match(KS.KEEPSAKE_STATE_QUERY, /reviewStatus = 'approved'/, 'signed-off copy only');
  const f = fakeDriver((q) => {
    if (q === KS.KEEPSAKE_STATE_QUERY) {
      return [{ partsOn: true, sessionFound: true, keepable: true, entry: 'parts', stopReason: 'done', aId: PA, bId: PB,
        aFound: true, aName: 'Watcher', aPhrase: 'keeps watch', bFound: true, bName: 'Rocket', bPhrase: 'pushes on',
        want: 'rest', bothWantId: 'want_rest', existingText: null, copy: Object.entries(COPY).map(([id, copy]) => ({ id, copy })) }];
    }
    if (q === KS.KEEPSAKE_WRITE_QUERY) return [{ version: 3 }];
    if (q === L.LINK_STATE_QUERY) return [{ partsOn: true, version: 3, aFound: true, bFound: true, linked: false, bothWantKnown: true }];
    if (q === L.WRITE_PART_LINK_QUERY) return [{ version: 4 }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.keepPullsKeepsake.run({ auth: auth('u5'), data: KEEP });
  const linkId = L.partLinkId('two_pulls', PA, PB);
  assert.deepEqual(out, { lineId: LID, text: 'Watcher and Rocket both want rest. I get to choose what happens next.', version: 4, linkId });
  const w = f.calls.find((c) => c.query === KS.KEEPSAKE_WRITE_QUERY);
  assert.deepEqual([w.params.lineKey, w.params.sessionKey], [`u5:${LID}`, `u5:${SID}`]);
  const lw = f.calls.find((c) => c.query === L.WRITE_PART_LINK_QUERY);
  assert.deepEqual([lw.params.kind, lw.params.aId, lw.params.bId, lw.params.bothWantId, lw.params.source], ['two_pulls', PA, PB, 'want_rest', 'two_pulls']);
  assert.equal(f.sessions.length, 1, 'the line and the link in one write transaction');
  await assert.rejects(fns.keepPullsKeepsake.run({ auth: auth('u5'), data: { ...KEEP, text: 'mine' } }), code('invalid-argument'), 'never client text');
});

test('keepsake for any two parts: a general want (no pair of their own) is accepted by the keepsake and the link', async () => {
  // The state query matches a general both-want chip whatever the pair; a pair's own only through its pair.
  assert.match(KS.KEEPSAKE_STATE_QUERY, /\(w\.flow = 'pulls' AND w\.step = 'both_want_general'\)\s+OR EXISTS \{ MATCH \(:PolarityPair \{id: ps\.pairId\}\)-\[bw:BOTH_WANT\]->\(w\)/);
  assert.equal(KS.GENERAL_WANT('w'), "(w.flow = 'pulls' AND w.step = 'both_want_general')");
  assert.match(L.LINK_STATE_QUERY, /OR \(bw\.flow = 'pulls' AND bw\.step = 'both_want_general'\)/);
  const f = fakeDriver((q) => {
    if (q === KS.KEEPSAKE_STATE_QUERY) {
      return [{ partsOn: true, sessionFound: true, keepable: true, entry: 'parts', stopReason: 'done', aId: PA, bId: PB,
        aFound: true, aName: 'Watcher', aPhrase: 'keeps watch', bFound: true, bName: null, bPhrase: 'pushes on',
        want: 'to be safe', bothWantId: 'pulls_want_safe', existingText: null, copy: Object.entries(COPY).map(([id, copy]) => ({ id, copy })) }];
    }
    if (q === KS.KEEPSAKE_WRITE_QUERY) return [{ version: 3 }];
    if (q === L.LINK_STATE_QUERY) return [{ partsOn: true, version: 3, aFound: true, bFound: true, linked: false, bothWantKnown: true }];
    if (q === L.WRITE_PART_LINK_QUERY) return [{ version: 4 }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.keepPullsKeepsake.run({ auth: auth('u5'), data: KEEP });
  assert.equal(out.linkId, L.partLinkId('two_pulls', PA, PB));
  assert.match(out.text, /^Watcher and .* both want to be safe\./);
  const lw = f.calls.find((c) => c.query === L.WRITE_PART_LINK_QUERY);
  assert.equal(lw.params.bothWantId, 'pulls_want_safe');
  assert.equal(f.calls.find((c) => c.query === L.LINK_STATE_QUERY).params.bothWantId, 'pulls_want_safe');
});

// ------------------------------------------------------------------ check-back

test('schedulePullsCheckback: two kept parts only, one per visit, parts on', async () => {
  const input = V.validatePullsCheckback({ id: FID, sessionId: SID, dueAt: inH(24 * 7) }, new Date());
  assert.equal(input.item.type, TY.TWO_PULLS_CHECKBACK_TYPE);
  const st = (o = {}) => ({ partsOn: true, sessionFound: true, entry: 'parts', aId: PA, bId: PB, bothKept: true, openId: null, ...o });
  const scheduled = [];
  const deps = (o) => ({ state: async () => st(o), schedule: async (_i, ids) => { scheduled.push(ids); return FID; } });
  assert.deepEqual(await CB.schedulePullsCheckbackHandler(input, deps()), { id: FID });
  assert.deepEqual(scheduled[0], [PA, PB]);
  assert.deepEqual(await CB.schedulePullsCheckbackHandler(input, deps({ openId: 'open1' })), { id: 'open1' }, 'a repeat returns the open one');
  await assert.rejects(CB.schedulePullsCheckbackHandler(input, deps({ partsOn: false })), code('failed-precondition'));
  await assert.rejects(CB.schedulePullsCheckbackHandler(input, deps({ sessionFound: false })), code('not-found'));
  await assert.rejects(CB.schedulePullsCheckbackHandler(input, deps({ entry: 'pair', aId: null, bId: null })), code('failed-precondition'), 'pair only: nothing to check back with');
  await assert.rejects(CB.schedulePullsCheckbackHandler(input, deps({ bothKept: false })), code('failed-precondition'));
  assert.throws(() => V.validatePullsCheckback({ id: FID, sessionId: SID, dueAt: inH(24 * 7), type: 'part_checkback' }, new Date()));
  assert.match(CB.LINK_PULLS_CHECKBACK_QUERY, /MERGE \(f\)-\[:CHECKS_BACK\]->\(pa\)\s+MERGE \(f\)-\[:CHECKS_BACK\]->\(pb\)/);
});

test('answerPartCheckback answers a two-pulls check-back too; Louder records the harm signal and pauses nothing', async () => {
  const f = fakeDriver((q) => {
    if (q === PCB.ANSWER_STATE_QUERY) return [{ partsOn: true, type: 'two_pulls_checkback', status: 'scheduled', open: true, partId: PA, louderPauseHours: 72 }];
    if (q === PCB.RESOLVE_CHECKBACK_QUERY) return [{ id: FID }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.answerPartCheckback.run({ auth: auth('u9'), data: { id: FID, answer: 'louder' } });
  assert.deepEqual(out, { status: 'done', aftercare: true });
  assert.equal(f.calls.find((c) => c.query === PCB.RESOLVE_CHECKBACK_QUERY).params.harmSignal, true);
  assert.ok(!f.calls.some((c) => /pausedUntil/.test(c.query)), 'no new pause');
});

test('Today: the two-pulls card with both names from the today slice; one part gone, no card', async () => {
  const TYPE = { t: { id: TY.TWO_PULLS_CHECKBACK_TYPE, ownerModule: 'mf', hierarchyTier: 'quality', resolveMode: 'inline', staleAfterHours: 72, missedPath: 'none',
    notifyPush: false, notifyInTab: false, notifyIcs: false, enabled: true, deepLinkTemplate: null,
    contentJson: JSON.stringify({ copy: { title: 'How are {A} and {B} today?' }, choices: [{ id: 'settled', label: 'Settled', status: 'done' }], window: {}, notification: '' }) } };
  const drive = (partIds) => fakeDriver((q, params) => {
    if (/MATCH \(t:FollowUpType\) WHERE/.test(q)) return [TYPE];
    if (q === CB.PULLS_CHECKBACK_ITEMS_QUERY) return [{ id: FID, dueAt: inH(-1), partIds }];
    if (/MATCH \(u\)-\[:HAS_PART\]->\(p:Part\) WHERE p\.status IN \['active', 'resting'\]\s+OPTIONAL MATCH \(p\)-\[:USES\]/.test(q)) {
      return [{ id: PA, name: 'Watcher', tender: false }, { id: PB, name: 'Rocket', tender: true }]
        .map((p) => ({ p: { ...p, kind: 'part', area: 'my_parts', status: 'active', source: 'made', confirmedAt: null, revisitAt: null }, moveIds: [] }));
    }
    if (/HAS_FOLLOW_UP/.test(q) && params.owned) { assert.ok(params.owned.includes(TY.TWO_PULLS_CHECKBACK_TYPE), 'parts owns its card'); return []; }
    return [];
  });
  const f = drive([PA, PB]);
  setDriver(f.driver);
  const out = await fns.getToday.run({ auth: auth(), data: {} });
  const all = [...out.items, ...out.more].filter((i) => i.type === TY.TWO_PULLS_CHECKBACK_TYPE);
  assert.equal(all.length, 1);
  assert.deepEqual(all[0].parts.map((p) => [p.id, p.name, p.tender]), [[PA, 'Watcher', false], [PB, 'Rocket', true]]);
  setDriver(drive([PA, 'gone']).driver);
  const none = await fns.getToday.run({ auth: auth(), data: {} });
  assert.equal([...none.items, ...none.more].filter((i) => i.type === TY.TWO_PULLS_CHECKBACK_TYPE).length, 0);
  assert.match(CB.PULLS_CHECKBACK_ITEMS_QUERY, /WHERE coalesce\(u\.partsEnabled, false\)/);
});

// ------------------------------------------------------------------ rule C trail

test('answerTrailOffer More than one on a rule C trail with a pair: final, no candidates, opens Two pulls on the pair', async () => {
  const f = fakeDriver((q) => {
    if (q === A.ANSWER_STATE_QUERY) return [{ partsOn: true, offer: { shape: 'C', moveIds: ['hide', 'push'], pullIds: [], status: 'seen', answer: null, open: true, pairId: 'pair_hide_push' }, cooldownDays: 28 }];
    if (q === A.ANSWER_FINAL_QUERY) return [{ status: 'answered' }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  const out = await fns.answerTrailOffer.run({ auth: auth(), data: { offerId: OID, answer: 'more_than_one' } });
  assert.deepEqual(out, { offerId: OID, answer: 'more_than_one', status: 'answered', next: 'two_pulls', pairId: 'pair_hide_push' });
  assert.equal(f.calls.find((c) => c.query === A.ANSWER_FINAL_QUERY).params.split, null);
  assert.ok(!f.calls.some((c) => c.query === A.SPLIT_CANDIDATES_QUERY));
  // Another shape still needs its split.
  const g = fakeDriver((q) => (q === A.ANSWER_STATE_QUERY
    ? [{ partsOn: true, offer: { shape: 'A', moveIds: ['hide'], pullIds: [], status: 'seen', answer: null, open: true }, cooldownDays: 28 }] : []));
  setDriver(g.driver);
  await assert.rejects(fns.answerTrailOffer.run({ auth: auth(), data: { offerId: OID, answer: 'more_than_one' } }), code('invalid-argument'));
});
