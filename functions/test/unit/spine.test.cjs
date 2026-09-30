'use strict';
/** PR-S3: startToolSession / closeToolSession / recordToolSession / getSpineContent against the fake driver. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const CI = '11111111-1b2c-4d5e-8f90-123456789abc';

test('startToolSession: MERGE by key, links, compat ToolUsage once, FOLLOWED_CHECKIN to the given check-in', async () => {
  const f = fakeDriver((q) => (/RETURN tu\.id AS toolUsageId/.test(q) ? [{ toolUsageId: `${ID}:usage` }] : []));
  setDriver(f.driver);
  const out = await fns.startToolSession.run({ auth: auth(), data: { id: ID, toolId: 'cool-down', entry: 'checkin_result', checkInId: CI, followUpId: CI } });
  assert.deepEqual(out, { id: ID, toolUsageId: `${ID}:usage` });
  const [q1, q2] = f.calls;
  assert.match(q1.query, /^MERGE \(u:User \{id: \$uid\}\)[\s\S]*MERGE \(ts:ToolSession \{key: \$key\}\)[\s\S]*ts\.status = 'open'/);
  assert.match(q1.query, /ts:UserData:LogRecord/);
  assert.match(q1.query, /MERGE \(u\)-\[:HAS_TOOL_SESSION\]->\(ts\)/);
  assert.match(q1.query, /MERGE \(ts\)-\[:FROM_CHECKIN\]->\(x\)/);
  assert.match(q1.query, /MERGE \(ts\)-\[:RESOLVING\]->\(x\)/);
  assert.match(q1.query, /MERGE \(tu:ToolUsage \{key: \$usageKey\}\)/, 'idempotent compat row');
  assert.deepEqual([q1.params.key, q1.params.checkInKey, q1.params.module, q1.params.closeKind], [`u1:${ID}`, `u1:${CI}`, 'dt', 'regulation_down']);
  assert.match(q2.query, /WHERE NOT \(tu\)-\[:FOLLOWED_CHECKIN\]->\(\)[\s\S]*coalesce\(given, latest\)/);
  assert.ok(f.allClosed());
});

test('startToolSession rejects an unknown tool before any query', async () => {
  const f = fakeDriver();
  setDriver(f.driver);
  await assert.rejects(fns.startToolSession.run({ auth: auth(), data: { id: ID, toolId: 'nope' } }), (e) => e.code === 'invalid-argument');
  assert.equal(f.calls.length, 0);
});

function closeDriver({ open = true, closeKind = 'regulation_down', practiced = false, reps = [] } = {}) {
  return fakeDriver((q) => {
    if (/AS open/.test(q)) return [{ open, closeKind, practiced, reps }];
    if (/RETURN collect\(sp\.id\) AS ids/.test(q)) return [{ ids: [`${ID}:cold`] }];
    return [];
  });
}

test('closeToolSession: guarded close, canonical then-vs-now + direction, compat outcome, reps from defaultFor', async () => {
  const f = closeDriver();
  setDriver(f.driver);
  const out = await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', thenVsNow: 'much_better', practiced: true } });
  assert.deepEqual(out, { id: ID, skillPracticeIds: [`${ID}:cold`], followUpIds: [] });
  const set = f.calls[1];
  assert.match(set.query, /WHERE ts\.status = 'open'/);
  assert.deepEqual([set.params.thenVsNow, set.params.thenVsNowDir, set.params.answered, set.params.legacyOutcome], ['much_better', 'down', true, 'helped']);
  assert.match(set.query, /tu\.outcome IS NULL/);
  const reps = f.calls[2];
  assert.match(reps.query, /ts\.toolId IN coalesce\(k\.defaultFor, \[\]\)/);
  assert.match(reps.query, /MERGE \(sp:SkillPractice \{key: \$uid \+ ':' \+ \$id \+ ':' \+ k\.id\}\)/);
  assert.match(reps.query, /sp:UserData:LogRecord/);
  assert.match(reps.query, /MERGE \(sp\)-\[:PRACTICED\]->\(k\)/);
  assert.deepEqual([reps.params.logged, reps.params.offPhone], ['in_app', false]);
});

test('closeToolSession: an answer the stored kind does not ask is dropped; orienting maps to dir orient', async () => {
  let f = closeDriver({ closeKind: 'urge' });
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', thenVsNow: 'better' } });
  assert.deepEqual([f.calls[1].params.thenVsNow, f.calls[1].params.answered, f.calls[1].params.legacyOutcome], [null, false, null]);
  f = closeDriver({ closeKind: 'orienting' });
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', thenVsNow: 'better' } });
  assert.deepEqual([f.calls[1].params.thenVsNowDir, f.calls[1].params.legacyOutcome], ['orient', 'somewhat']);
});

test('closeToolSession: exited early without practice writes no rep; a replay returns the existing reps', async () => {
  let f = closeDriver();
  setDriver(f.driver);
  const early = await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early' } });
  assert.deepEqual(early.skillPracticeIds, []);
  assert.equal(f.calls.length, 2);
  f = closeDriver({ practiced: true });
  setDriver(f.driver);
  const practicedEarly = await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early' } });
  assert.equal(practicedEarly.skillPracticeIds.length, 1, 'practiced before leaving still counts');
  f = closeDriver({ open: false, reps: ['r1'] });
  setDriver(f.driver);
  const replay = await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', thenVsNow: 'worse' } });
  assert.deepEqual(replay.skillPracticeIds, ['r1']);
  assert.equal(f.calls.length, 1, 'finalised: nothing written');
});

test('closeToolSession: detail labels come from a whitelist, matched by the caller-scoped key', async () => {
  const f = closeDriver({ closeKind: 'none' });
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth('u9'), data: { id: ID, status: 'completed', detail: { kind: 'opposite_action', id: CI } } });
  assert.deepEqual([f.calls[1].params.detailLabel, f.calls[1].params.detailKey], ['OppositeActionSession', `u9:${CI}`]);
  assert.match(f.calls[1].query, /\(u\)-\[:COMPLETED_SESSION\]->\(d \{key: \$detailKey\}\)/);
});

test('closeToolSession on an unknown session is not-found', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed' } }), (e) => e.code === 'not-found');
});

test('recordToolSession runs start and close in one transaction', async () => {
  const f = fakeDriver((q) => {
    if (/RETURN tu\.id AS toolUsageId/.test(q)) return [{ toolUsageId: 'x' }];
    if (/AS open/.test(q)) return [{ open: true, closeKind: 'none', practiced: false, reps: [] }];
    return [{ ids: [] }];
  });
  setDriver(f.driver);
  const out = await fns.recordToolSession.run({ auth: auth(), data: { id: ID, toolId: 'micro-step', entry: 'checkin_result', checkInId: CI, status: 'completed', ext: { core: { microStepId: 'cold-water' } } } });
  assert.equal(out.id, ID);
  assert.equal(f.sessions.length, 1, 'one session / transaction');
  assert.equal(JSON.parse(f.calls.find((c) => 'ext' in c.params).params.ext).core.microStepId, 'cold-water');
});

test('getSpineContent parses the close flow and the non-reserved follow-up types', async () => {
  const f = fakeDriver((q) => {
    if (/SessionCloseFlow/.test(q)) return [{ version: 'spine-v1', content: JSON.stringify({ version: 'spine-v1', kinds: { urge: { question: 'Q', choices: [] } }, byTool: {}, skip: 'Skip', saved: 'Noted.' }) }];
    if (/FollowUpType/.test(q)) return [{ t: { id: 'recover_log', ownerModule: 'wmp', hierarchyTier: 'quality', resolveMode: 'inline', staleAfterHours: 72, missedPath: 'none', notifyPush: false, notifyInTab: true, notifyIcs: false, enabled: true, contentJson: JSON.stringify({ copy: { title: 'T' }, choices: [{ id: 'better', label: 'B', status: 'done' }], window: { kind: 'at_local' }, notification: 'N' }) } }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getSpineContent.run({ data: {} });
  assert.equal(out.closeFlow.kinds.urge.question, 'Q');
  assert.ok(!('version' in out.closeFlow));
  assert.deepEqual(out.followUpTypes[0].notify, { push: false, inTab: true, ics: false });
  assert.equal(out.followUpTypes[0].tier, 'quality');
  assert.match(f.calls[1].query, /coalesce\(t\.reserved, false\) = false/);
});
