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

function closeDriver({ open = true, closeKind = 'regulation_down', practiced = false, reps = [], toolId = 'cool-down' } = {}) {
  return fakeDriver((q) => {
    if (/AS open/.test(q)) return [{ open, closeKind, practiced, reps, toolId, followUps: [] }];
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

test('closeToolSession never overwrites an answer given in Today before the (late) close (R2)', async () => {
  const f = closeDriver();
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early' } });
  const set = f.calls[1].query;
  for (const field of ['thenVsNow', 'thenVsNowDir', 'actedOnUrge']) {
    assert.match(set, new RegExp(`ts\\.${field} = CASE WHEN ts\\.answeredAt IS NULL THEN \\$${field} ELSE ts\\.${field} END`), field);
  }
  assert.match(set, /ts\.answeredAt = CASE WHEN ts\.answeredAt IS NULL AND \$answered THEN datetime\(\) ELSE ts\.answeredAt END/);
  assert.ok(set.indexOf('ts.answeredAt = ') > set.indexOf('ts.actedOnUrge = '), 'answeredAt is set last (the lines above read the old value)');
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
  // The wrapped tools' sessions hang off COMPLETED_SESSION, Meet a part's off HAS_PART_SESSION.
  assert.match(f.calls[1].query, /\(u\)-\[:COMPLETED_SESSION\|HAS_PART_SESSION\|HAS_PULLS_SESSION\]->\(d \{key: \$detailKey\}\)/);
});

test("closeToolSession: Meet a part links its PartSession; its \"more here\" is kept but never a compat outcome", async () => {
  const f = closeDriver({ closeKind: 'orienting', toolId: 'meet-a-part' });
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth('u9'), data: { id: ID, status: 'completed', thenVsNow: 'better', detail: { kind: 'meet_a_part', id: CI } } });
  const set = f.calls[1];
  assert.deepEqual([set.params.detailLabel, set.params.detailKey], ['PartSession', `u9:${CI}`]);
  assert.deepEqual([set.params.thenVsNow, set.params.thenVsNowDir, set.params.legacyOutcome], ['better', 'orient', null]);
});

test('closeToolSession: a band asked after the open is set once, only when the start had none (A4-4)', async () => {
  const f = closeDriver({ closeKind: 'plan' });
  setDriver(f.driver);
  const at = new Date().toISOString();
  const reading = { id: CI, value: 'flooded', viaCantTell: false, source: 'probe', framing: 'now', wording: 'relational',
    context: 'dear-man', probeVersion: 'capacity-v1', at };
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early', bandAtStart: reading,
    ext: { er: { handoffs: [{ primitiveId: 'sigh', completed: true, durationSec: 30, thenVsNow: 'better', resumed: true, overridden: false }] } } } });
  const close = f.calls.find((c) => /SET ts\.status = \$status/.test(c.query));
  assert.match(close.query, /WHEN \$bandAtStart IS NULL OR ts\.bandAtStart IS NOT NULL THEN \[\] ELSE \[1\]/);
  assert.equal(close.params.bandAtStart, 'flooded');
  assert.equal(close.params.bandAtStartSource, 'probe');
  assert.equal(JSON.parse(close.params.ext).er.handoffs[0].primitiveId, 'sigh');
  // No band given: nothing to set.
  const g = closeDriver({ closeKind: 'plan' });
  setDriver(g.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early' } });
  assert.equal(g.calls.find((c) => /SET ts\.status = \$status/.test(c.query)).params.bandAtStart, null);
});

test('closeToolSession: emotions picked in the tool are set once, only when the start had none (parts data fix 5)', async () => {
  const f = closeDriver();
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', emotionIds: ['hurt', 'anxious'] } });
  const close = f.calls.find((c) => /SET ts\.status = \$status/.test(c.query));
  assert.match(close.query, /WHERE ts\.status = 'open'/, 'inside the close guard (finalise-once)');
  assert.match(close.query, /ts\.emotionIds = CASE WHEN size\(coalesce\(ts\.emotionIds, \[\]\)\) = 0 AND size\(\$emotionIds\) > 0\s+THEN \$emotionIds ELSE ts\.emotionIds END/);
  assert.deepEqual(close.params.emotionIds, ['hurt', 'anxious']);
  // None given: [] (the CASE keeps what the start stored).
  const g = closeDriver();
  setDriver(g.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed' } });
  assert.deepEqual(g.calls.find((c) => /SET ts\.status = \$status/.test(c.query)).params.emotionIds, []);
  // An already-closed session is a no-op: nothing is set.
  const h = closeDriver({ open: false });
  setDriver(h.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', emotionIds: ['hurt'] } });
  assert.ok(!h.calls.some((c) => /SET ts\.status = \$status/.test(c.query)));
  // Junk ids are refused.
  await assert.rejects(fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', emotionIds: ['I feel awful'] } }), (e) => e.code === 'invalid-argument');
});

test('closeToolSession: Do the Opposite keeps the urge and the check result as ids, with no rep (parts data fix 3)', async () => {
  const f = closeDriver({ closeKind: 'none' });
  setDriver(f.driver);
  // Route `problem` (the urge fits and would help): left without a plan, so exited early.
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early', exitStep: 'result_problem', urgeIds: ['fear-avoid'],
    ext: { er: { oaFacts: 'fits', oaEffect: 'helpful', oaRoute: 'problem' } } } });
  const close = f.calls.find((c) => /SET ts\.status = \$status/.test(c.query));
  assert.deepEqual(close.params.urgeIds, ['fear-avoid']);
  assert.deepEqual(JSON.parse(close.params.ext), { er: { oaFacts: 'fits', oaEffect: 'helpful', oaRoute: 'problem' } });
  assert.ok(!f.calls.some((c) => /MERGE \(sp:SkillPractice/.test(c.query)), 'not a practised rep');
  // Free text is refused before any query.
  const g = closeDriver({ closeKind: 'none' });
  setDriver(g.driver);
  await assert.rejects(fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early', ext: { er: { oaFacts: 'it fits, mostly' } } } }),
    (e) => e.code === 'invalid-argument');
  assert.equal(g.calls.length, 0);
});

test('startToolSession stores the hand-off emotion ids', async () => {
  const f = fakeDriver((q) => (/RETURN tu\.id AS toolUsageId/.test(q) ? [{ toolUsageId: `${ID}:usage` }] : []));
  setDriver(f.driver);
  await fns.startToolSession.run({ auth: auth(), data: { id: ID, toolId: 'problem-solve', entry: 'checkin_result', emotionIds: ['anxious', 'hurt'] } });
  assert.match(f.calls[0].query, /ts\.emotionIds = \$emotionIds/);
  assert.deepEqual(f.calls[0].params.emotionIds, ['anxious', 'hurt']);
});

test('closeToolSession on an unknown session is not-found', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed' } }), (e) => e.code === 'not-found');
});

test('recordToolSession runs start and close in one transaction', async () => {
  const f = fakeDriver((q) => {
    if (/RETURN tu\.id AS toolUsageId/.test(q)) return [{ toolUsageId: 'x' }];
    if (/AS open/.test(q)) return [{ open: true, closeKind: 'none', practiced: false, reps: [], toolId: 'micro-step', followUps: [] }];
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

test('startToolSession survives the render-save race: claims its check-in, never falls back to the previous one (Codex, PR #16)', async () => {
  const f = fakeDriver((q) => (/RETURN tu\.id AS toolUsageId/.test(q) ? [{ toolUsageId: `${ID}:usage` }] : []));
  setDriver(f.driver);
  await fns.startToolSession.run({ auth: auth(), data: { id: ID, toolId: 'cool-down', entry: 'checkin_result', checkInId: CI } });
  const [q1, q2] = f.calls;
  assert.match(q1.query, /ts\.checkInId = \$checkInId/);
  assert.equal(q1.params.checkInId, CI);
  // An FTF session the check-in already embedded (saved first) is linked from this side.
  assert.match(q1.query, /\$id IN coalesce\(ec\.embeddedToolSessionIds, \[\]\)[\s\S]*MERGE \(x\)-\[:EMBEDDED\]->\(ts\)/);
  // The latest-check-in fallback only applies to sessions that name no check-in.
  assert.match(q2.query, /given IS NULL AND ts\.checkInId IS NULL AND latest\.timestamp <= tu\.timestamp/);
});

test('startToolSession resolves a resume_skill or Ending check-in follow-up when its link is opened; other types are left to their tool (Codex, PR #17; IE-08)', async () => {
  const f = fakeDriver((q) => (/RETURN tu\.id AS toolUsageId/.test(q) ? [{ toolUsageId: `${ID}:usage` }] : []));
  setDriver(f.driver);
  await fns.startToolSession.run({ auth: auth(), data: { id: ID, toolId: 'dear-man', entry: 'today', followUpId: CI } });
  const q1 = f.calls[0].query;
  assert.match(q1, /f\.type IN \$openResolves AND f\.status = 'scheduled' THEN \[f\][\s\S]*SET x\.status = 'done', x\.resolvedAt = datetime\(\)/);
  assert.deepEqual(f.calls[0].params.openResolves, ['resume_skill', 'nightmare_rehearse', 'ending_after', 'ending_again', 'ending_revisit', 'hold_come_back', 'ps_review', 'ask_outcome', 'no_outcome', 'ask_delayed', 'mind_job_back', 'lid_reopen', 'oa_try']);
  assert.equal(f.calls[0].params.followUpKey, `u1:${CI}`);
});
