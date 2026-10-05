'use strict';
/** Reflect R1: getInsightsData over the fake driver (the pure numbers are pinned in tests/reflect-insights.test.mjs). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });

const daysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

/** Route each query to its rows by what it reads. */
function insightsDriver(rows) {
  return fakeDriver((q) => {
    if (/\[:LOGGED\]->\(c:CheckIn\)/.test(q)) return rows.checkIns ?? [];
    if (/\[:HAS_TOOL_SESSION\]->\(ts:ToolSession\)/.test(q)) return rows.sessions ?? [];
    if (/\[:USED_TOOL\]->\(tu:ToolUsage\)/.test(q)) return rows.legacy ?? [];
    if (/CO_OCCURS_WITH/.test(q)) return rows.co ?? [];
    if (/p\.formulation_headline/.test(q)) return rows.formulation ?? [];
    if (/CAN_ESCALATE_TO/.test(q)) return rows.escalation ?? [];
    if (/SomaticQuadrantNarrative/.test(q)) return rows.somatic ?? [];
    return [];
  });
}

const ci = (o) => ({
  id: o.id, timestamp: o.timestamp, emotion: o.emotion ?? 'anxious', emotionIds: o.emotionIds ?? ['anxious'],
  quadrant: o.quadrant ?? 'high-unpleasant', intensityX: 0.2, intensityY: 0.8, band: null,
  activationPatternId: o.pattern ?? 'acute_alarm', bodyRegions: o.regions ?? [], tagArrays: [], families: ['fear'],
});
const ts = (o) => ({
  id: o.id, toolId: o.toolId, patternId: o.pattern ?? null, checkInId: o.checkInId ?? null, at: o.at,
  closeKind: o.closeKind ?? null, thenVsNow: o.tvn ?? null, actedOnUrge: o.acted ?? null,
});

test('getInsightsData requires sign-in, before any query', async () => {
  const f = insightsDriver({});
  setDriver(f.driver);
  await assert.rejects(fns.getInsightsData.run({ data: {} }), (e) => e.code === 'unauthenticated');
  assert.equal(f.calls.length, 0);
});

test('the range is a parameter (never interpolated): 7d → 7, all → null, anything else → 30', async () => {
  for (const [timeRange, days] of [['7d', 7], ['all', null], ['30d', 30], ['1y', 30], [undefined, 30]]) {
    const f = insightsDriver({});
    setDriver(f.driver);
    await fns.getInsightsData.run({ auth: auth(), data: timeRange === undefined ? null : { timeRange } });
    const reads = f.calls.filter((c) => /\$days/.test(c.query));
    assert.equal(reads.length, 3, 'check-ins, sessions, legacy usages');
    for (const r of reads) {
      assert.doesNotMatch(r.query, /duration\(\{days: \d/, 'no literal day count in the query');
      const got = r.params.days;
      assert.equal(got === null ? null : got.toNumber(), days, String(timeRange));
      assert.equal(r.params.userId, 'u1');
    }
    assert.ok(f.allClosed());
  }
});

test('the three user-data reads each get their own read session (they run in parallel)', async () => {
  const f = insightsDriver({});
  setDriver(f.driver);
  await fns.getInsightsData.run({ auth: auth(), data: {} });
  const reads = f.calls.filter((c) => /\$days/.test(c.query));
  assert.equal(new Set(reads.map((r) => r.session)).size, 3);
});

test('sessions: the pattern falls back to the linked check-in; the check-in link is explicit only', async () => {
  const f = insightsDriver({});
  setDriver(f.driver);
  await fns.getInsightsData.run({ auth: auth(), data: {} });
  const q = f.calls.find((c) => /ToolSession/.test(c.query)).query;
  assert.match(q, /coalesce\(ts\.patternId, c\.activationPatternId\) AS patternId/);
  assert.match(q, /\[:FROM_CHECKIN\]->\(c:CheckIn\)/);
  assert.match(q, /coalesce\(c\.id, ts\.checkInId\) AS checkInId/);
  assert.doesNotMatch(q, /FOLLOWED_CHECKIN/, 'never the compat row\'s latest-check-in guess');
  const legacy = f.calls.find((c) => /ToolUsage/.test(c.query)).query;
  assert.match(legacy, /WHERE NOT \(\)-\[:COMPAT_USAGE\]->\(tu\)/, 'only pre-spine rows; spine rows are read as sessions');
});

test('a month of log → the payload: outcomes from the spine, urge tools on their own measure, reserved ids skipped', async () => {
  const f = insightsDriver({
    checkIns: [
      ci({ id: 'c3', timestamp: daysAgo(1), emotion: 'anxious, let down', emotionIds: ['anxious', 'let_down'] }),
      ci({ id: 'c2', timestamp: daysAgo(3) }),
      ci({ id: 'c1', timestamp: daysAgo(8), pattern: 'rumination_loop', quadrant: 'low-unpleasant' }),
    ],
    sessions: [
      ts({ id: 's1', toolId: 'cool-down', pattern: 'acute_alarm', checkInId: 'c3', at: daysAgo(1), closeKind: 'regulation_down', tvn: 'better' }),
      ts({ id: 's2', toolId: 'cool-down', pattern: 'acute_alarm', at: daysAgo(2), closeKind: 'regulation_down', tvn: 'much_better' }),
      ts({ id: 's3', toolId: 'cool-down', pattern: 'acute_alarm', at: daysAgo(3), closeKind: 'regulation_down', tvn: 'same' }),
      ts({ id: 's4', toolId: 'pause', at: daysAgo(4), closeKind: 'urge', acted: 'no' }),
      ts({ id: 's5', toolId: 'pause', at: daysAgo(5), closeKind: 'urge', acted: 'yes' }),
      ts({ id: 's6', toolId: 'micro-step', checkInId: 'c2', at: daysAgo(3), tvn: 'much_better' }),
      ts({ id: 's7', toolId: 'opposite-action', at: daysAgo(6), closeKind: 'none' }),
    ],
    formulation: [{ headline: 'H', body: 'B', mechanism: 'M' }],
  });
  setDriver(f.driver);
  const out = await fns.getInsightsData.run({ auth: auth(), data: { timeRange: '30d' } });

  assert.equal(out.continuityPrompt, null);
  assert.equal(out.totalCheckIns, 3);
  assert.deepEqual(out.patternFrequencies, [{ patternId: 'acute_alarm', count: 2 }, { patternId: 'rumination_loop', count: 1 }]);
  assert.deepEqual(out.toolEffectiveness.tools, [
    { toolId: 'cool-down', measure: 'then_vs_now', direction: 'down', answered: 3, wentWell: 2, helpedPct: 67, totalUses: 3 },
    { toolId: 'pause', measure: 'urge', direction: null, answered: 2, wentWell: 1, helpedPct: 50, totalUses: 2 },
  ], 'better counts as went well; micro-step (reserved) and unanswered OA are not ranked');
  assert.equal(out.formulation.type, 'single');
  assert.equal(out.formulation.primaryPatternId, 'acute_alarm');
  assert.deepEqual(out.formulation.effectiveTools, ['cool-down']);
  const fq = f.calls.find((c) => /p\.formulation_headline/.test(c.query));
  assert.deepEqual(fq.params, { patternId: 'acute_alarm' });
  assert.ok(f.allClosed());
});

test('pre-spine ratings read back through D-03: somewhat counts as went well, not really does not', async () => {
  const f = insightsDriver({
    legacy: [
      { toolId: 'five-senses', outcome: 'helped', timestamp: daysAgo(10), patternId: null, checkInId: null },
      { toolId: 'five-senses', outcome: 'somewhat', timestamp: daysAgo(11), patternId: null, checkInId: null },
      { toolId: 'five-senses', outcome: 'not_really', timestamp: daysAgo(12), patternId: null, checkInId: null },
      { toolId: 'five-senses', outcome: null, timestamp: daysAgo(13), patternId: null, checkInId: null },
    ],
  });
  setDriver(f.driver);
  const out = await fns.getInsightsData.run({ auth: auth(), data: {} });
  assert.deepEqual(out.toolEffectiveness.tools, [
    { toolId: 'five-senses', measure: 'then_vs_now', direction: null, answered: 3, wentWell: 2, helpedPct: 67, totalUses: 3 },
  ]);
});

test('a failing read surfaces as internal with the old message, and closes its session', async () => {
  const f = fakeDriver((q) => (/ToolSession/.test(q) ? new Error('boom') : []));
  setDriver(f.driver);
  await assert.rejects(fns.getInsightsData.run({ auth: auth(), data: {} }), (e) => e.code === 'internal' && /Failed to get insights data/.test(e.message));
  assert.ok(f.allClosed());
});
