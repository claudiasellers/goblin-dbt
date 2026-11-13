'use strict';
/**
 * Cope Ahead's after card (docs/design/cope-ahead.md, "Today, afterwards"; functions/src/spine/copeAheadAfter.ts):
 * scheduled only on the caller's own cope-ahead visit; both answers in one resolve (howItWent, planHelped);
 * It hasn't happened yet snoozes and stores nothing; finalise-once; "Used it, it helped" tags the visit's
 * part (parts on) through tag.ts, one per session; getToday sends the plan's ids, never a stored string.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const LIB = path.resolve(__dirname, '../../lib');
const { scheduleTx } = require(path.join(LIB, 'spine/followUp.js'));
const { validateResolve } = require(path.join(LIB, 'spine/validation.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const { validateTag } = require(path.join(LIB, 'parts/tag.js'));
test.after(() => setDriver(null));

const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const TS = '22222222-1b2c-4d5e-8f90-123456789abc';
const PART = '44444444-1b2c-4d5e-8f90-123456789abc';
const inH = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
const code = (c) => (e) => e.code === c;

// ------------------------------------------------------------------ schedule

test('scheduleFollowUp: cope_ahead_after only on the caller\'s own cope-ahead session (the later chip is a window)', async () => {
  const f = fakeDriver((q) => {
    if (/RETURN ts\.toolId AS toolId/.test(q)) return [{ toolId: 'cope-ahead' }];
    if (/RETURN collect\(f\.id\) AS ids/.test(q)) return [{ ids: [ID] }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'cope_ahead_after', dueAt: inH(24 * 7), window: 'later', sourceSessionId: TS } });
  assert.deepEqual(out, { ids: [ID] });
  const head = f.calls.find((c) => /RETURN ts\.toolId AS toolId/.test(c.query));
  assert.match(head.query, /MATCH \(:User \{id: \$uid\}\)-\[:HAS_TOOL_SESSION\]->\(ts:ToolSession \{key: \$key\}\)/);
  assert.equal(head.params.key, `u1:${TS}`);
  const w = f.calls.at(-1);
  assert.equal(w.params.sourceToolId, 'cope-ahead', 'the session\'s own tool, whatever the client sent');
  assert.equal(w.params.sourceSessionKey, `u1:${TS}`, 'SCHEDULED from that session');
  assert.equal(w.params.items[0].window, 'later');
});

test('scheduleFollowUp: no session, someone else\'s or a missing one, or another tool\'s: refused before any write', async () => {
  let f = fakeDriver(() => []);
  setDriver(f.driver);
  await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'cope_ahead_after', dueAt: inH(20) } }), code('invalid-argument'));
  assert.equal(f.calls.length, 0);
  await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'cope_ahead_after', dueAt: inH(20), sourceSessionId: TS } }), code('not-found'));
  assert.ok(!f.calls.some((c) => /MERGE/.test(c.query)), 'nothing written');
  f = fakeDriver((q) => (/RETURN ts\.toolId AS toolId/.test(q) ? [{ toolId: 'wise-mind' }] : []));
  setDriver(f.driver);
  await assert.rejects(fns.scheduleFollowUp.run({ auth: auth(), data: { id: ID, type: 'cope_ahead_after', dueAt: inH(20), sourceSessionId: TS } }), code('failed-precondition'));
  assert.ok(!f.calls.some((c) => /MERGE/.test(c.query)), 'nothing written');
});

test('a close\'s schedule: another tool\'s session skips cope_ahead_after (like an unknown type); its own keeps it', async () => {
  const runs = [];
  const tx = { run: async (query, params) => { runs.push({ query, params }); return { records: [{ get: () => params.items.map((i) => i.id) }] }; } };
  const item = { id: ID, type: 'cope_ahead_after', dueAt: inH(20), window: 'today', cueId: null, notify: { push: null, inTab: null, ics: null } };
  assert.deepEqual(await scheduleTx(tx, 'u1', [item], { sourceSessionId: TS, sourceToolId: 'wise-mind' }), []);
  assert.deepEqual(await scheduleTx(tx, 'u1', [item], { sourceSessionId: null, sourceToolId: 'cope-ahead' }), []);
  assert.equal(runs.length, 0);
  assert.deepEqual(await scheduleTx(tx, 'u1', [item], { sourceSessionId: TS, sourceToolId: 'cope-ahead' }), [ID]);
  assert.deepEqual(CA.FOLLOW_UP_SESSION_TOOL, {
    cope_ahead_after: 'cope-ahead',
    ending_after: 'ending-relationships', ending_again: 'ending-relationships', ending_revisit: 'ending-relationships', ask_outcome: 'dear-man', no_outcome: 'say-no',
    ask_delayed: 'dear-man',
    oa_try: 'opposite-action',
    break_return: 'give', repair_outcome: 'give',
    habit_renew: 'habit-plan',
    please_fix: 'please-skill',
    good_thing: 'good-things',
    value_step: 'values-clarification',
    mastery_step: 'build-mastery',
    reach_out_outcome: 'finding-connection',
    notice_back: 'mindfulness-of-others',
    sleep_morning: 'sleep-reset',
  });
  const ending = { ...item, type: 'ending_after' };
  assert.deepEqual(await scheduleTx(tx, 'u1', [ending], { sourceSessionId: TS, sourceToolId: 'cope-ahead' }), [], 'an Ending check-in only from an Ending session');
});

// ------------------------------------------------------------------ resolve

const CHOICES = [
  { id: 'better', label: 'Better than I feared', status: 'done' },
  { id: 'as_expected', label: 'About what I expected', status: 'done' },
  { id: 'harder', label: 'Harder than I expected', status: 'done' },
  { id: 'not_yet', label: 'It hasn\'t happened yet', snoozeHours: 24 },
];
const EXT = (ca) => JSON.stringify({ ca });

function resolveDriver({ type = 'cope_ahead_after', open = true, ext = EXT({ partId: PART, hardMomentId: 'go_blank', moveIds: ['long_out'] }),
  partsOn = true, partStatus = 'active', existingId = null, visit = true } = {}) {
  return fakeDriver((q) => {
    if (/AS open/.test(q)) return [{ type, status: 'scheduled', open, content: JSON.stringify({ choices: CHOICES }), partsOn }];
    if (/RETURN ts\.id AS sessionId, ts\.ext AS ext/.test(q)) return visit ? [{ sessionId: TS, ext }] : [];
    if (/AS existingId/.test(q)) return [{ partsOn, partStatus, idTaken: false, sessionFound: true, sessionStatus: 'completed', thenVsNow: null, actedOnUrge: null, toolId: 'cope-ahead', existingId }];
    if (/MERGE \(t:PartTag/.test(q)) return [{ id: 'tag' }];
    return [];
  });
}
const write = (f) => f.calls.find((c) => /SET f\.status = \$status/.test(c.query));
const tagWrite = (f) => f.calls.find((c) => /MERGE \(t:PartTag/.test(c.query));

test('resolveFollowUp: both answers in one resolve, as log fields on the follow-up (finalise-once)', async () => {
  const f = resolveDriver();
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'harder', planHelped: 'unsure' } }), { next: null, status: 'done' });
  const w = write(f);
  assert.match(w.query, /WHERE f\.status = 'scheduled'[\s\S]*SET f\.status = \$status[\s\S]*FOREACH \(_ IN CASE WHEN \$after THEN \[1\] ELSE \[\] END \| SET f\.howItWent = \$howItWent, f\.planHelped = \$planHelped\)/);
  assert.equal(w.params.after, true);
  assert.equal(w.params.howItWent, 'harder');
  assert.equal(w.params.planHelped, 'unsure');
  assert.ok(!tagWrite(f), 'only "Used it, it helped" tags');
});

test('resolveFollowUp: the first answer alone (Skip, or the person left): planHelped null', async () => {
  const f = resolveDriver();
  setDriver(f.driver);
  await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better' } });
  assert.equal(write(f).params.howItWent, 'better');
  assert.equal(write(f).params.planHelped, null);
  assert.ok(!f.calls.some((c) => /ts\.ext AS ext/.test(c.query)), 'no visit read without helped');
});

test('resolveFollowUp: It hasn\'t happened yet snoozes 24 h and stores nothing; a plan answer with it is refused', async () => {
  let f = resolveDriver();
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'not_yet' } }), { next: null, status: 'scheduled' });
  assert.match(f.calls[1].query, /SET f\.snoozedUntil = datetime\(\) \+ duration\(\{hours: \$hours\}\), f\.updatedAt = datetime\(\)$/m);
  assert.equal(f.calls[1].params.hours, 24);
  assert.ok(!write(f), 'nothing stored');
  f = resolveDriver();
  setDriver(f.driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'not_yet', planHelped: 'helped' } }), code('invalid-argument'));
  assert.equal(f.calls.length, 1, 'nothing written');
});

test('resolveFollowUp: planHelped on any other type, or as a bare status, is refused', async () => {
  let f = fakeDriver((q) => (/AS open/.test(q) ? [{ type: 'recover_log', status: 'scheduled', open: true, content: JSON.stringify({ choices: [{ id: 'better', label: 'B', status: 'done' }] }), partsOn: false }] : []));
  setDriver(f.driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better', planHelped: 'helped' } }), code('invalid-argument'));
  assert.equal(f.calls.length, 1);
  f = resolveDriver();
  setDriver(f.driver);
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, status: 'done', planHelped: 'helped' } }), code('invalid-argument'));
  await assert.rejects(fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better', planHelped: 'loved_it' } }), code('invalid-argument'));
  // Another type's write never takes the after fields.
  f = fakeDriver((q) => (/AS open/.test(q) ? [{ type: 'recover_log', status: 'scheduled', open: true, content: JSON.stringify({ choices: [{ id: 'better', label: 'B', status: 'done' }] }), partsOn: false }] : []));
  setDriver(f.driver);
  await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better' } });
  assert.equal(write(f).params.after, false);
  assert.equal(write(f).params.howItWent, null);
});

test('resolveFollowUp: a finalised after card takes nothing', async () => {
  const f = resolveDriver({ open: false });
  setDriver(f.driver);
  assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better', planHelped: 'helped' } }), { next: null, status: 'scheduled' });
  assert.equal(f.calls.length, 1);
});

test('"Used it, it helped": PartTag {source: cope_ahead} on the visit for its part, through tag.ts', async () => {
  const f = resolveDriver();
  setDriver(f.driver);
  await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'as_expected', planHelped: 'helped' } });
  const visit = f.calls.find((c) => /ts\.ext AS ext/.test(c.query));
  assert.match(visit.query, /\(f:FollowUp \{key: \$key\}\)<-\[:SCHEDULED\]-\(ts:ToolSession\)<-\[:HAS_TOOL_SESSION\]-\(u\)/);
  assert.match(visit.query, /f\.type = 'cope_ahead_after' AND ts\.toolId = 'cope-ahead'/);
  const t = tagWrite(f);
  assert.ok(t, 'tagged');
  assert.ok(f.calls.indexOf(t) > f.calls.indexOf(write(f)), 'after the answer is stored (the guard reads it)');
  assert.equal(t.params.source, 'cope_ahead');
  assert.equal(t.params.partKey, `u1:${PART}`, 'the part from the visit\'s ext.ca, never from the client');
  assert.equal(t.params.sessionKey, `u1:${TS}`);
  assert.equal(t.params.taggedKey, `u1:${TS}:cope_ahead`, 'one per session');
  assert.match(t.query, /\$source = 'cope_ahead' AND ts\.toolId IN \$copeAheadTools\s+AND EXISTS \{ MATCH \(f:FollowUp \{type: 'cope_ahead_after'\}\)<-\[:SCHEDULED\]-\(ts\) WHERE f\.planHelped = 'helped' \}/);
  assert.deepEqual(t.params.copeAheadTools, ['cope-ahead']);
});

test('"Used it, it helped": no tag with parts off, no part, a part set aside, or a tag already there; the answer still saves', async () => {
  for (const o of [{ partsOn: false }, { ext: EXT({ hardMomentId: 'go_blank' }) }, { ext: EXT({ partId: 'not-a-uuid' }) }, { partStatus: 'set_aside' },
    { existingId: 'earlier' }, { visit: false }, { ext: 'not json' }]) {
    const f = resolveDriver(o);
    setDriver(f.driver);
    assert.deepEqual(await fns.resolveFollowUp.run({ auth: auth(), data: { id: ID, choiceId: 'better', planHelped: 'helped' } }), { next: null, status: 'done' }, JSON.stringify(o));
    assert.equal(write(f).params.planHelped, 'helped');
    assert.ok(!tagWrite(f), JSON.stringify(o));
  }
});

test('tagPart never writes a cope_ahead tag (only the after card\'s resolve does)', () => {
  assert.throws(() => validateTag({ id: ID, partId: PART, toolSessionId: TS, source: 'cope_ahead' }), /source/);
});

test('validateResolve: planHelped is helped, unsure or unused, with a choice', () => {
  assert.equal(validateResolve({ id: ID, choiceId: 'better', planHelped: 'unused' }).planHelped, 'unused');
  assert.equal(validateResolve({ id: ID, choiceId: 'better', planHelped: null }).planHelped, null);
  assert.equal(validateResolve({ id: ID, choiceId: 'better' }).planHelped, null);
  assert.throws(() => validateResolve({ id: ID, choiceId: 'better', planHelped: 'skip' }));
  assert.throws(() => validateResolve({ id: ID, status: 'done', planHelped: 'helped' }));
});

// ------------------------------------------------------------------ getToday

const TYPE = (id) => ({ t: { id, ownerModule: 'er', hierarchyTier: 'quality', resolveMode: 'inline', staleAfterHours: 72, missedPath: 'none',
  notifyPush: false, notifyInTab: true, notifyIcs: false, enabled: true, deepLinkTemplate: null,
  contentJson: JSON.stringify({ copy: { title: 'How did it go?' }, choices: CHOICES, window: {}, notification: 'A plan you made is ready.' }) } });

test('getToday: the after card carries the plan\'s ids from the visit; never own situation words, the part or a plan string', async () => {
  const ext = EXT({ situationId: 'other', situationOwn: 'my cousin\'s wedding', partId: PART, hardMomentOwn: 'Mum asks about work', ifFrom: 'moment',
    pullIds: ['hide'], moveIds: ['long_out', 'give_minute', 'extra'], moveOwn: null, when: 'tomorrow', kept: true });
  const f = fakeDriver((q) => {
    if (/MATCH \(t:FollowUpType\) WHERE/.test(q)) return [TYPE('cope_ahead_after'), TYPE('recover_log')];
    if (/HAS_FOLLOW_UP/.test(q) && /planExt/.test(q)) return [
      { id: 'a', type: 'cope_ahead_after', dueAt: inH(-1), sourceToolId: 'cope-ahead', sourceSessionId: TS, notifyInTab: true, detailId: null, planExt: ext },
      { id: 'b', type: 'recover_log', dueAt: inH(-1), sourceToolId: null, sourceSessionId: null, notifyInTab: true, detailId: null, planExt: null },
    ];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getToday.run({ auth: auth(), data: {} });
  const all = [...out.items, ...out.more];
  const a = all.find((i) => i.id === 'a');
  assert.deepEqual(a.plan, { situationId: 'other', hardMomentId: null, hardMomentOwn: 'Mum asks about work', ifFrom: 'moment', pullIds: ['hide'], moveIds: ['long_out', 'give_minute'], moveOwn: null });
  assert.ok(!('plan' in all.find((i) => i.id === 'b')), 'other types carry no plan');
  const s = JSON.stringify(a);
  assert.doesNotMatch(s, /wedding/, 'the situation\'s own words never leave the visit');
  assert.doesNotMatch(s, new RegExp(PART), 'nor the part');
  const q = f.calls.find((c) => /planExt/.test(c.query)).query;
  assert.match(q, /head\(\[\(f\)<-\[:SCHEDULED\]-\(ts:ToolSession \{toolId: 'cope-ahead'\}\)\s+WHERE f\.type = 'cope_ahead_after' AND ts\.ownerId = \$uid \| ts\.ext\]\) AS planExt/);
});

test('planIdsFromExt: nothing stored, no ca, or a broken ext → null', () => {
  assert.equal(CA.planIdsFromExt(null), null);
  assert.equal(CA.planIdsFromExt('{"wm":{}}'), null);
  assert.equal(CA.planIdsFromExt('{'), null);
  assert.deepEqual(CA.planIdsFromExt(EXT({ moveIds: ['a b', 'ok'], ifFrom: 'nope' })),
    { situationId: null, hardMomentId: null, hardMomentOwn: null, ifFrom: null, pullIds: [], moveIds: ['ok'], moveOwn: null });
});
