'use strict';
/** part-checkback: the next-day check-back after a meeting (docs/design/parts.md, Meet a part step 10). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const CB = require('../../lib/parts/checkback');
const K = require('../../lib/parts/keep');
const { DELETE_FOLLOW_UPS, PARTS_FOLLOW_UP_TYPES } = require('../../lib/parts/delete');
const { PART_CHECKBACK_TYPE } = require('../../lib/parts/checkbackTypes');

const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;
const FID = '8e2c9a0e-1b2c-4d5e-8f90-123456789abc';
const SID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PID = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const inH = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

function fakeSchedule(o = {}) {
  const log = [];
  const st = { partsOn: true, sessionFound: true, partId: PID, partStatus: 'active', paused: false, openId: null, ...o };
  return {
    log,
    deps: {
      state: async (sid) => { log.push(['state', sid]); return st; },
      schedule: async (input, partId) => { log.push(['schedule', input, partId]); return input.item.id; },
    },
  };
}
const scheduleIn = () => CB.validateScheduleCheckback({ id: FID, sessionId: SID, dueAt: inH(20) }, new Date());

test('schedule: parts off, no session, nothing kept, set aside, paused by Louder: refused before any write', async () => {
  for (const [o, c] of [
    [{ partsOn: false }, 'failed-precondition'], [{ sessionFound: false }, 'not-found'], [{ partId: null }, 'failed-precondition'],
    [{ partStatus: 'set_aside' }, 'failed-precondition'], [{ paused: true }, 'failed-precondition'],
  ]) {
    const f = fakeSchedule(o);
    await assert.rejects(CB.schedulePartCheckbackHandler(scheduleIn(), f.deps), code(c), JSON.stringify(o));
    assert.ok(!f.log.some(([k]) => k === 'schedule'), JSON.stringify(o));
  }
});

test('schedule: one open check-back per part (a second schedule returns the open one and writes nothing)', async () => {
  const f = fakeSchedule();
  assert.deepEqual(await CB.schedulePartCheckbackHandler(scheduleIn(), f.deps), { id: FID });
  const [, input, partId] = f.log.find(([k]) => k === 'schedule');
  assert.deepEqual([input.item.type, partId], [PART_CHECKBACK_TYPE, PID]);
  const again = fakeSchedule({ openId: 'already-open' });
  assert.deepEqual(await CB.schedulePartCheckbackHandler(scheduleIn(), again.deps), { id: 'already-open' });
  assert.ok(!again.log.some(([k]) => k === 'schedule'));
  assert.match(CB.SCHEDULE_STATE_QUERY, /\(open:FollowUp \{type: 'part_checkback'\}\)-\[:CHECKS_BACK\]->\(pt\)\s+WHERE open\.status = 'scheduled'/);
  assert.match(CB.SCHEDULE_STATE_QUERY, /coalesce\(pt\.pausedUntil > datetime\(\), false\) AS paused/);
});

test('validateScheduleCheckback: ids, dueAt in range, nothing else (the type is fixed server-side)', () => {
  assert.equal(scheduleIn().item.type, PART_CHECKBACK_TYPE);
  for (const bad of [{ type: 'recover_log' }, { dueAt: inH(24 * 15) }, { sessionId: 'x' }, { partId: PID }]) {
    assert.throws(() => CB.validateScheduleCheckback({ id: FID, sessionId: SID, dueAt: inH(20), ...bad }, new Date()), JSON.stringify(bad));
  }
});

test('schedulePartCheckback over the fake driver: the spine scheduler, then linked to the part and its visit', async () => {
  const f = fakeDriver((q) => {
    if (q === CB.SCHEDULE_STATE_QUERY) return [{ partsOn: true, sessionFound: true, partId: PID, partStatus: 'active', paused: false, openId: null }];
    if (/RETURN collect\(f\.id\) AS ids/.test(q)) return [{ ids: [FID] }];
    if (q === CB.LINK_CHECKBACK_QUERY) return [{ id: FID }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.schedulePartCheckback.run({ auth: auth('u9'), data: { id: FID, sessionId: SID, dueAt: inH(20) } }), { id: FID });
  const sched = f.calls.find((c) => /RETURN collect\(f\.id\) AS ids/.test(c.query));
  assert.deepEqual([sched.params.items[0].type, sched.params.sourceToolId], ['part_checkback', 'meet-a-part']);
  const link = f.calls.find((c) => c.query === CB.LINK_CHECKBACK_QUERY);
  assert.deepEqual([link.params.followUpKey, link.params.partKey, link.params.sessionKey], [`u9:${FID}`, `u9:${PID}`, `u9:${SID}`]);
  assert.match(CB.LINK_CHECKBACK_QUERY, /MERGE \(f\)-\[:CHECKS_BACK\]->\(pt\)\s+MERGE \(ps\)-\[:SCHEDULED\]->\(f\)/);
  assert.equal(f.sessions.length, 1, 'one transaction');
});

function fakeAnswer(o = {}) {
  const log = [];
  const st = { partsOn: true, type: PART_CHECKBACK_TYPE, status: 'scheduled', open: true, partId: PID, pauseHours: 72, ...o };
  return {
    log,
    deps: {
      state: async () => st,
      resolve: async (id, status, answer) => { log.push(['resolve', status, answer]); return true; },
      pause: async (partId, hours) => { log.push(['pause', partId, hours]); return true; },
    },
  };
}

test('answer: Settled / Same → done, Skip → dismissed, no pause; Louder → done, the part paused for the policy hours', async () => {
  for (const [answer, status] of [['settled', 'done'], ['same', 'done'], ['skip', 'dismissed']]) {
    const f = fakeAnswer();
    assert.deepEqual(await CB.answerPartCheckbackHandler({ id: FID, answer }, f.deps), { status, aftercare: false });
    assert.deepEqual(f.log, [['resolve', status, answer]]);
  }
  const f = fakeAnswer({ pauseHours: 96 });
  assert.deepEqual(await CB.answerPartCheckbackHandler({ id: FID, answer: 'louder' }, f.deps), { status: 'done', aftercare: true });
  assert.deepEqual(f.log, [['resolve', 'done', 'louder'], ['pause', PID, 96]]);
});

test('answer: parts off, not found, another type refused; already answered is a no-op', async () => {
  await assert.rejects(CB.answerPartCheckbackHandler({ id: FID, answer: 'same' }, fakeAnswer({ partsOn: false }).deps), code('failed-precondition'));
  await assert.rejects(CB.answerPartCheckbackHandler({ id: FID, answer: 'same' }, fakeAnswer({ type: null }).deps), code('not-found'));
  await assert.rejects(CB.answerPartCheckbackHandler({ id: FID, answer: 'same' }, fakeAnswer({ type: 'recover_log' }).deps), code('invalid-argument'));
  const done = fakeAnswer({ open: false, status: 'done' });
  assert.deepEqual(await CB.answerPartCheckbackHandler({ id: FID, answer: 'louder' }, done.deps), { status: 'done', aftercare: false });
  assert.deepEqual(done.log, [], 'nothing written, nothing paused');
  assert.throws(() => CB.validateAnswerCheckback({ id: FID, answer: 'fine' }));
});

test('answerPartCheckback over the fake driver: one transaction, the spine guard, Louder pauses atomically', async () => {
  const f = fakeDriver((q) => {
    if (q === CB.ANSWER_STATE_QUERY) return [{ partsOn: true, type: 'part_checkback', status: 'scheduled', open: true, partId: PID, louderPauseHours: 72 }];
    if (q === CB.RESOLVE_CHECKBACK_QUERY) return [{ id: FID }];
    if (q === K.PAUSE_PART_QUERY) return [{ id: PID }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.answerPartCheckback.run({ auth: auth('u9'), data: { id: FID, answer: 'louder' } }), { status: 'done', aftercare: true });
  assert.equal(f.sessions.length, 1, 'resolve and pause in one write transaction');
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  const r = f.calls.find((c) => c.query === CB.RESOLVE_CHECKBACK_QUERY);
  assert.deepEqual([r.params.key, r.params.status, JSON.parse(r.params.outcome), r.params.harmSignal], [`u9:${FID}`, 'done', { choiceId: 'louder' }, true]);
  assert.match(CB.RESOLVE_CHECKBACK_QUERY, /WHERE f\.type = 'part_checkback' AND f\.status = 'scheduled'/, "spine's GUARDS.FollowUp.update");
  const p = f.calls.find((c) => c.query === K.PAUSE_PART_QUERY);
  assert.deepEqual([p.params.partKey, p.params.hours], [`u9:${PID}`, 72]);
  assert.match(K.PAUSE_PART_QUERY, /SET p\.pausedUntil = datetime\(\) \+ duration\(\{hours: \$hours\}\)/);
  // A pause failure fails the answer too: the transaction is one unit.
  const g = fakeDriver((q) => {
    if (q === CB.ANSWER_STATE_QUERY) return [{ partsOn: true, type: 'part_checkback', status: 'scheduled', open: true, partId: PID, louderPauseHours: null }];
    if (q === CB.RESOLVE_CHECKBACK_QUERY) return [{ id: FID }];
    return new Error('pause failed');
  });
  setDriver(g.driver);
  await assert.rejects(fns.answerPartCheckback.run({ auth: auth(), data: { id: FID, answer: 'louder' } }));
  assert.equal(g.calls.find((c) => c.query === K.PAUSE_PART_QUERY).params.hours, K.DEFAULT_LOUDER_PAUSE_HOURS, 'no policy: 72 h');
});

test('resolveFollowUp refuses a check-back: its answer can pause a part, so only parts answers it', async () => {
  setDriver(fakeDriver((q) => (/AS open/.test(q) ? [{ type: 'part_checkback', status: 'scheduled', open: true, content: '{}' }] : [])).driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: FID, status: 'done' } }), code('failed-precondition'));
});

const TYPE = (id, o = {}) => ({ t: { id, ownerModule: 'mf', hierarchyTier: 'quality', resolveMode: 'inline', staleAfterHours: 36, missedPath: 'none',
  notifyPush: false, notifyInTab: false, notifyIcs: false, enabled: true, deepLinkTemplate: null,
  contentJson: JSON.stringify({ copy: { title: "How's {name} today?" }, choices: [{ id: 'settled', label: 'Settled', status: 'done' }, { id: 'skip', label: 'Skip', status: 'dismissed' }], window: {}, notification: '' }), ...o } });

function todayDriver({ partsOn = true, parts = [{ id: PID, name: 'the watcher', tender: true }] } = {}) {
  return fakeDriver((q, params) => {
    if (/MATCH \(t:FollowUpType\) WHERE/.test(q)) return [TYPE('part_checkback')];
    if (q === CB.CHECKBACK_ITEMS_QUERY) return partsOn ? [{ id: FID, dueAt: inH(-1), partId: PID }, { id: 'gone', dueAt: inH(-1), partId: 'set-aside-part' }] : [];
    if (/MATCH \(u\)-\[:HAS_PART\]->\(p:Part\) WHERE p\.status IN \['active', 'resting'\]\s+OPTIONAL MATCH \(p\)-\[:USES\]/.test(q)) {
      return partsOn ? parts.map((p) => ({ p: { ...p, kind: 'part', area: 'my_parts', status: 'active', source: 'made', confirmedAt: null, revisitAt: null }, moveIds: [] })) : [];
    }
    if (/HAS_FOLLOW_UP/.test(q)) {
      // The generic read must leave part_checkback to parts.
      assert.ok(params.owned.includes('part_checkback'));
      return [];
    }
    return [];
  });
}

test("getToday: the check-back card with the part's name from the 'today' slice; parts off, no card", async () => {
  const f = todayDriver();
  setDriver(f.driver);
  const out = await fns.getToday.run({ auth: auth(), data: {} });
  const all = [...out.items, ...out.more];
  assert.deepEqual(all.map((i) => [i.id, i.type, i.kind, i.state]), [[FID, 'part_checkback', 'follow_up', 'due']]);
  assert.deepEqual(all[0].part, { id: PID, name: 'the watcher', tender: true });
  assert.equal(out.nextInTab, null, 'no reminder of any kind');
  assert.match(f.calls.find((c) => /HAS_FOLLOW_UP\]->\(f:FollowUp \{status: 'scheduled'\}\)/.test(c.query)).query, /AND NOT t\.id IN \$owned/);
  assert.match(CB.CHECKBACK_ITEMS_QUERY, /WHERE coalesce\(u\.partsEnabled, false\)/);

  setDriver(todayDriver({ partsOn: false }).driver);
  const off = await fns.getToday.run({ auth: auth(), data: {} });
  assert.equal([...off.items, ...off.more].filter((i) => i.type === 'part_checkback').length, 0);

  setDriver(todayDriver({ parts: [{ id: PID, name: null, tender: false }] }).driver);
  const unnamed = await fns.getToday.run({ auth: auth(), data: {} });
  assert.deepEqual([...unnamed.items, ...unnamed.more][0].part, { id: PID, name: null, tender: false });
});

test('deleteMyParts removes open check-backs: the type the scheduler writes, only while scheduled', () => {
  assert.ok(PARTS_FOLLOW_UP_TYPES.includes(PART_CHECKBACK_TYPE));
  assert.match(DELETE_FOLLOW_UPS, /WHERE f\.type IN \$types AND f\.status = 'scheduled'/);
  assert.equal(CB.validateScheduleCheckback({ id: FID, sessionId: SID, dueAt: inH(20) }, new Date()).item.type, PARTS_FOLLOW_UP_TYPES[0]);
});
