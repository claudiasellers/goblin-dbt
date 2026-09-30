'use strict';
/** PR-S5: follow-ups (schedule / resolve / snooze), getToday, answerToolOutcome, recordToolOutcome by id. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const TS = '22222222-1b2c-4d5e-8f90-123456789abc';
const inH = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

test('scheduleFollowUp: only enabled types, MERGE by key, dueAt bounded, SCHEDULED from its session', async () => {
  const f = fakeDriver((q) => (/RETURN collect\(f\.id\) AS ids/.test(q) ? [{ ids: [ID] }] : []));
  setDriver(f.driver);
  const out = await fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'recover_log', dueAt: inH(72), sourceSessionId: TS, sourceToolId: 'recovering-from-invalidation' } });
  assert.deepEqual(out, { ids: [ID] });
  const q = f.calls.at(-1);
  assert.match(q.query, /MATCH \(t:FollowUpType \{id: it\.type\}\) WHERE t\.enabled = true/);
  assert.match(q.query, /MERGE \(f:FollowUp \{key: \$uid \+ ':' \+ it\.id\}\)[\s\S]*f:UserData:LogRecord[\s\S]*f\.status = 'scheduled'/);
  assert.match(q.query, /MERGE \(x\)-\[:SCHEDULED\]->\(f\)/);
  assert.equal(q.params.sourceSessionKey, `u1:${TS}`);
  await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'recover_log', dueAt: inH(24 * 15) } }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'recover_log', dueAt: inH(1), sourceToolId: 'nope' } }), (e) => e.code === 'invalid-argument');
});

function resolveDriver({ type = 'recover_log', open = true, status = 'scheduled', choices } = {}) {
  const content = JSON.stringify({ dir: 'down', choices: choices ?? [
    { id: 'better', label: 'B', status: 'done' }, { id: 'not_yet', label: 'N', snoozeHours: 24 }, { id: 'quieter', label: 'Q', status: 'done', thenVsNow: 'better' },
  ] });
  return fakeDriver((q) => (/AS open/.test(q) ? [{ type, status, open, content }] : []));
}

test('resolveFollowUp: the type\'s choice decides the status; then-vs-now answers keep the direction', async () => {
  let f = resolveDriver();
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better' } }), { next: null, status: 'done' });
  assert.match(f.calls[1].query, /WHERE f\.status = 'scheduled'[\s\S]*SET f\.status = \$status/);
  assert.equal(JSON.parse(f.calls[1].params.outcome).choiceId, 'better');
  f = resolveDriver();
  setDriver(f.driver);
  await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'quieter' } });
  assert.deepEqual(JSON.parse(f.calls[1].params.outcome), { choiceId: 'quieter', thenVsNow: 'better', thenVsNowDir: 'down' });
});

test('resolveFollowUp: a snooze choice moves snoozedUntil; unknown choice, OA plans and finalised follow-ups', async () => {
  let f = resolveDriver();
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'not_yet' } }), { next: null, status: 'scheduled' });
  assert.match(f.calls[1].query, /SET f\.snoozedUntil = datetime\(\) \+ duration\(\{hours: \$hours\}\)/);
  assert.equal(f.calls[1].params.hours, 24);
  setDriver(resolveDriver().driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'made_up' } }), (e) => e.code === 'invalid-argument');
  setDriver(resolveDriver({ type: 'oa_plan' }).driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'done' } }), (e) => e.code === 'failed-precondition');
  f = resolveDriver({ open: false, status: 'done' });
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'dismissed' } }), { next: null, status: 'done' });
  assert.equal(f.calls.length, 1, 'finalised: nothing written');
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'done' } }), (e) => e.code === 'not-found');
});

test('snoozeFollowUp: at most 7 days, only while scheduled', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.snoozeFollowUp.run({ auth: auth(), data: { id: ID, until: inH(3) } });
  assert.match(f.calls[0].query, /WHERE f\.status = 'scheduled'/);
  await assert.rejects(fns.snoozeFollowUp.run({ auth: auth(), data: { id: ID, until: inH(24 * 8) } }), (e) => e.code === 'invalid-argument');
});

const TYPE = (id, o = {}) => ({ t: { id, ownerModule: 'wmp', hierarchyTier: 'quality', resolveMode: 'inline', staleAfterHours: 36, missedPath: 'none',
  notifyPush: false, notifyInTab: true, notifyIcs: false, enabled: true, deepLinkTemplate: null,
  contentJson: JSON.stringify({ copy: { title: id }, choices: [{ id: 'done', label: 'Done', status: 'done' }], window: {}, notification: 'Ready.' }), ...o } });

test('getToday: derived states, one tool_outcome from the close question, OA reminder left to OA, flooded collapse', async () => {
  const f = fakeDriver((q) => {
    if (/MATCH \(t:FollowUpType\) WHERE/.test(q)) return [TYPE('recover_next_day'), TYPE('recover_log'), TYPE('tool_outcome', { hierarchyTier: 'skills' }),
      TYPE('oa_plan', { resolveMode: 'deeplink', deepLinkTemplate: '/tool/opposite-action?followUp={detailId}' })];
    if (/SessionCloseFlow/.test(q)) return [{ content: JSON.stringify({ kinds: { regulation_down: { question: 'Compared…', choices: [{ id: 'better', label: 'Quieter' }] } }, byTool: {} }) }];
    if (/HAS_FOLLOW_UP/.test(q)) return [
      { id: 'a', type: 'recover_next_day', dueAt: inH(-1), sourceToolId: null, sourceSessionId: null, notifyInTab: true, detailId: null },
      { id: 'b', type: 'oa_plan', dueAt: inH(-50), sourceToolId: 'opposite-action', sourceSessionId: null, notifyInTab: true, detailId: 'oa1' },
      { id: 'c', type: 'recover_log', dueAt: inH(1), sourceToolId: null, sourceSessionId: null, notifyInTab: true, detailId: null },
      { id: 'd', type: 'recover_log', dueAt: inH(10), sourceToolId: null, sourceSessionId: null, notifyInTab: true, detailId: null },
    ];
    if (/HAS_TOOL_SESSION/.test(q)) return [{ id: TS, toolId: 'cool-down', closeKind: 'regulation_down', at: inH(-0.5) }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getToday.run({ auth: auth(), data: {} });
  assert.deepEqual(out.items.map((i) => [i.id, i.state]), [['a', 'due'], ['b', 'stale'], ['c', 'upcoming']]);
  assert.deepEqual(out.more.map((i) => [i.id, i.kind]), [[TS, 'tool_outcome']]);
  assert.equal(out.items[1].deepLink, '/tool/opposite-action?followUp=oa1');
  assert.equal(out.more[0].copy.body, 'Compared…');
  assert.deepEqual(out.nextInTab, { at: out.nextInTab.at, body: 'Ready.', deepLink: '/' });
  assert.ok(Date.parse(out.nextInTab.at) > Date.now(), 'the next reminder is in the future and never an OA plan');
  assert.equal(out.holding, false);
  const flooded = await fns.getToday.run({ auth: auth(), data: { band: 'flooded' } });
  assert.deepEqual([flooded.items.length, flooded.more.length, flooded.holding], [0, 4, true]);
  assert.match(f.calls.find((c) => /HAS_TOOL_SESSION/.test(c.query)).query, /ts\.answeredAt IS NULL AND coalesce\(ts\.outcomeAskDismissed, false\) = false/);
});

test('answerToolOutcome: by tool session id, guarded, compat outcome; dismissal remembered', async () => {
  const f = fakeDriver(() => [{ id: TS }]);
  setDriver(f.driver);
  assert.deepEqual(await fns.answerToolOutcome.run({ auth: auth(), data: { toolSessionId: TS, thenVsNow: 'much_better' } }), { ok: true, recorded: true });
  const q = f.calls[0];
  assert.equal(q.params.key, `u1:${TS}`);
  assert.match(q.query, /ts\.answeredAt IS NULL AND coalesce\(ts\.outcomeAskDismissed, false\) = false/);
  assert.match(q.query, /WHEN 'much_better' THEN 'helped'/);
  await fns.answerToolOutcome.run({ auth: auth(), data: { toolSessionId: TS, dismissed: true } });
  assert.equal(f.calls[1].params.dismissed, true);
  await assert.rejects(fns.answerToolOutcome.run({ auth: auth(), data: { toolSessionId: TS } }), (e) => e.code === 'invalid-argument');
});

test('recordToolOutcome with a toolUsageId answers exactly that row', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.recordToolOutcome.run({ auth: auth(), data: { outcome: 'helped', toolUsageId: `${TS}:usage` } });
  assert.match(f.calls[0].query, /ToolUsage \{id: \$toolUsageId\}[\s\S]*tu\.outcome IS NULL/);
  await assert.rejects(fns.recordToolOutcome.run({ auth: auth(), data: { outcome: 'helped', toolUsageId: 'x; MATCH' } }), (e) => e.code === 'invalid-argument');
});

test('closeToolSession schedules its follow-ups in the same transaction (Problem Solve ps_step)', async () => {
  const f = fakeDriver((q) => {
    if (/AS open/.test(q)) return [{ open: true, closeKind: 'plan', practiced: true, reps: [], toolId: 'problem-solve', followUps: [] }];
    if (/RETURN collect\(f\.id\) AS ids/.test(q)) return [{ ids: [ID] }];
    return [{ ids: [] }];
  });
  setDriver(f.driver);
  const out = await fns.closeToolSession.run({ auth: auth(), data: { id: TS, status: 'completed', schedule: [{ id: ID, type: 'ps_step', dueAt: inH(20), window: 'tomorrow' }] } });
  assert.deepEqual(out.followUpIds, [ID]);
  const sched = f.calls.find((c) => /FollowUpType \{id: it\.type\}/.test(c.query));
  assert.deepEqual([sched.params.sourceToolId, sched.params.sourceSessionId], ['problem-solve', TS]);
  assert.equal(f.sessions.length, 1);
});
