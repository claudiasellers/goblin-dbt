'use strict';
/**
 * The parts stats (functions/src/parts/stats.ts): every threshold edge, the first-answer rule, the
 * time-zone bands, and what never counts (parts off, someone else's records, set-aside parts); the
 * reads (statsQueries.ts); and Reflect's `parts` section through getInsightsData's query layer.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');
const {
  STATS_THRESHOLDS, helpedFor, feltFor, whenFor, whenBand, localTime, partStats, statsByPart, partsReflect, hasLine,
} = require('../../lib/parts/stats');
const {
  STATS_USER_QUERY, STATS_PARTS_QUERY, STATS_TAGS_QUERY, STATS_SESSIONS_QUERY, readStatsRows,
} = require('../../lib/parts/statsQueries');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });

/** An instant on 1 July 2026 at an hour (UTC), plus minutes for ordering. */
const at = (hour, min = 0, day = 1, month = 7) => new Date(Date.UTC(2026, month - 1, day, hour, min)).toISOString();
const tag = (toolId, a, partId = 'p1') => ({ partId, toolId, at: a });
const visit = (firstFeel, day, month = 7, partId = 'p1') => ({ partId, at: at(10, 0, day, month), firstFeel });

test('the thresholds are the agreed numbers', () => {
  assert.deepEqual({ ...STATS_THRESHOLDS }, { helpedMinTags: 3, helpedMaxTools: 3, feltMinPerHalf: 3, whenMinTags: 3 });
});

test('helped: 2 tags say nothing, 3 do; a count per tool, most first, ties to the most recent, at most 3', () => {
  assert.equal(helpedFor([tag('pause', at(9)), tag('pause', at(10))]), null, '2 tags');
  assert.deepEqual(helpedFor([tag('pause', at(9)), tag('pause', at(10)), tag('cool-down', at(11))]),
    [{ toolId: 'pause', n: 2 }, { toolId: 'cool-down', n: 1 }]);
  // a tie: the tool tagged most recently first
  assert.deepEqual(helpedFor([tag('pause', at(9)), tag('cool-down', at(10)), tag('five-senses', at(8)), tag('pause', at(7)), tag('cool-down', at(6))]),
    [{ toolId: 'cool-down', n: 2 }, { toolId: 'pause', n: 2 }, { toolId: 'five-senses', n: 1 }]);
  const four = ['a', 'b', 'c', 'd'].map((t, i) => tag(t, at(9 + i)));
  assert.deepEqual(helpedFor(four).map((h) => h.toolId), ['d', 'c', 'b'], 'at most 3 tools');
  assert.equal(helpedFor([]), null);
});

test('felt: 5 visits say nothing, 6 do; each half needs 3; the most common first answer per half', () => {
  const five = ['feel_tired', 'feel_tired', 'feel_tired', 'feel_curious', 'feel_curious'].map((f, i) => visit(f, i + 1));
  assert.equal(feltFor(five, null), null, '5 visits: one half has 2');
  const six = ['feel_tired', 'feel_tired', 'feel_annoyed', 'feel_curious', 'feel_curious', 'feel_steady'].map((f, i) => visit(f, i + 1));
  assert.deepEqual(feltFor(six, null), { month: '2026-07', then: 'feel_tired', now: 'feel_curious' });
  // odd: the earlier half is the smaller (3 and 4)
  const seven = ['feel_tired', 'feel_tired', 'feel_tired', 'feel_curious', 'feel_curious', 'feel_tired', 'feel_curious'].map((f, i) => visit(f, i + 1));
  assert.deepEqual(feltFor(seven, null), { month: '2026-07', then: 'feel_tired', now: 'feel_curious' });
  // the rows' order doesn't matter: oldest first by time
  assert.deepEqual(feltFor([...six].reverse(), null), feltFor(six, null));
});

test('felt: a tie goes to the later answer; the same answer both halves is "since"; month from the earlier half', () => {
  const tie = ['feel_tired', 'feel_annoyed', 'feel_steady', 'feel_open', 'feel_curious', 'feel_open'].map((f, i) => visit(f, i + 1));
  // earlier: tired / annoyed / steady, one each → steady (the latest); later: open twice
  assert.deepEqual(feltFor(tie, null), { month: '2026-07', then: 'feel_steady', now: 'feel_open' });
  const same = ['feel_curious', 'feel_curious', 'feel_tired', 'feel_curious', 'feel_open', 'feel_curious'].map((f, i) => visit(f, i + 1, i < 3 ? 6 : 9));
  assert.deepEqual(feltFor(same, null), { month: '2026-06', then: null, now: 'feel_curious' });
  // the month is the person's: 00:30 UTC on 1 July is still June in New York
  const six = ["feel_tired", "feel_tired", "feel_annoyed", "feel_curious", "feel_curious", "feel_steady"].map((f, i) => visit(f, i + 2));
  const late = [{ partId: "p1", at: "2026-07-01T00:30:00.000Z", firstFeel: "feel_tired" }, ...six.slice(1)];
  assert.equal(feltFor(late, 'America/New_York').month, '2026-06');
  assert.equal(feltFor(late, null).month, '2026-07', 'no time zone: UTC');
});

test('when: bands 05–12, 12–17, 17–22, 22–05 in the person\'s time zone; more than half, at least 3 tags', () => {
  assert.deepEqual([4, 5, 11, 12, 16, 17, 21, 22, 0].map(whenBand),
    ['nights', 'mornings', 'mornings', 'afternoons', 'afternoons', 'evenings', 'evenings', 'nights', 'nights']);
  assert.equal(whenFor([tag('x', at(18)), tag('x', at(19))], null), null, '2 tags');
  assert.equal(whenFor([tag('x', at(18)), tag('x', at(19)), tag('x', at(9))], null), 'evenings', '2 of 3 is more than half');
  assert.equal(whenFor([tag('x', at(18)), tag('x', at(19)), tag('x', at(9)), tag('x', at(10))], null), null, '50 / 50 says nothing');
  assert.equal(whenFor([tag('x', at(18)), tag('x', at(9)), tag('x', at(13))], null), null, 'no band over half');
  // 23:30 UTC is 19:30 in New York (evenings), nights in UTC
  const late = [tag('x', at(23, 30)), tag('x', at(23, 40)), tag('x', at(23, 50))];
  assert.equal(whenFor(late, 'America/New_York'), 'evenings');
  assert.equal(whenFor(late, null), 'nights');
  assert.equal(whenFor(late, 'Not/A_Zone'), 'nights', 'an unknown zone falls back to UTC');
  assert.deepEqual(localTime('2026-07-01T23:30:00.000000000Z', 'Europe/London'), { hour: 0, month: '2026-07' });
});

const rows = (o = {}) => ({
  partsOn: true, timeZone: null,
  parts: [
    { id: 'p1', name: 'The guard', status: 'active', firstPlace: 'chest', shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5] },
    { id: 'p2', name: null, status: 'resting', firstPlace: null, shapeSig: null },
    { id: 'p3', name: 'Quiet one', status: 'active', firstPlace: null, shapeSig: null },
  ],
  tags: [tag('pause', at(18)), tag('pause', at(19)), tag('cool-down', at(20)), tag('pause', at(9), 'p2')],
  sessions: [],
  ...o,
});

test('per part: only its own rows; parts off nothing; set-aside and unknown parts left out; no line, no block', () => {
  const s = statsByPart(rows());
  assert.deepEqual(s.get('p1'), { helped: [{ toolId: 'pause', n: 2 }, { toolId: 'cool-down', n: 1 }], felt: null, when: 'evenings' });
  assert.deepEqual(s.get('p2'), { helped: null, felt: null, when: null }, "p2's one tag isn't p1's");
  assert.equal(hasLine(s.get('p2')), false);
  assert.deepEqual(partsReflect(rows()).map((p) => p.id), ['p1'], 'only parts with a line');
  assert.deepEqual(partsReflect(rows())[0], {
    id: 'p1', name: 'The guard', firstPlace: 'chest', shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5], stats: s.get('p1'),
  });
  // parts off: nothing at all, whatever the rows say
  assert.equal(partsReflect(rows({ partsOn: false })), null);
  assert.equal(statsByPart(rows({ partsOn: false })).size, 0);
  // a set-aside part (or a row for a part that isn't the caller's) is never counted
  const aside = rows({ parts: [{ id: 'p1', name: 'The guard', status: 'set_aside', firstPlace: null, shapeSig: null }] });
  assert.deepEqual(partsReflect(aside), []);
  const stranger = rows({ tags: [tag('pause', at(18), 'someone-elses'), tag('pause', at(19), 'someone-elses'), tag('pause', at(20), 'someone-elses')] });
  assert.deepEqual(partsReflect(stranger), []);
  // the result never carries the raw feel answers
  assert.deepEqual(Object.keys(partStats([], [], null)).sort(), ['felt', 'helped', 'when']);
});

test('reads: through the caller\'s own User and edges, active or resting parts, parts on, first answer only', () => {
  for (const q of [STATS_PARTS_QUERY, STATS_TAGS_QUERY, STATS_SESSIONS_QUERY]) {
    assert.match(q, /^\s*MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART(_TAG|_SESSION)?\]->/);
    assert.match(q, /coalesce\(u\.partsEnabled, false\)/);
    assert.match(q, /pt\.status IN \['active', 'resting'\]/);
    assert.doesNotMatch(q, /\b(MERGE|CREATE|SET|DELETE)\b/, 'read-only');
  }
  assert.match(STATS_TAGS_QUERY, /\(u\)-\[:HAS_PART\]->\(pt\)/);
  assert.match(STATS_TAGS_QUERY, /\(t\)-\[:TAGS\]->\(ts:ToolSession\)<-\[:HAS_TOOL_SESSION\]-\(u\)/, "the tagged session is the caller's");
  assert.match(STATS_SESSIONS_QUERY, /\(u\)-\[:HAS_PART\]->\(pt\)/);
  assert.match(STATS_SESSIONS_QUERY, /ps\.feelTowardIds\[0\] AS firstFeel/, 'the first answer only');
  assert.doesNotMatch(STATS_SESSIONS_QUERY, /AS feelTowardIds/, 'never the raw list');
  assert.match(STATS_USER_QUERY, /u\.timeZone AS timeZone/);
});

/** A transaction look-alike over one responder (fakeDriver's records). */
function fakeTx(responder) {
  const f = fakeDriver(responder);
  const session = f.driver.session();
  return { tx: { run: (q, p) => session.run(q, p) }, f };
}

test('readStatsRows: parts off stops after the user read; on, it maps every row', async () => {
  const off = fakeTx((q) => (/AS timeZone/.test(q) ? [{ partsOn: false, timeZone: 'Europe/London' }] : []));
  assert.deepEqual(await readStatsRows(off.tx, 'u1'), { partsOn: false, timeZone: null, parts: [], tags: [], sessions: [] });
  assert.equal(off.f.calls.length, 1);
  const on = fakeTx((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: true, timeZone: 'Europe/London' }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return [{ id: 'p1', name: 'The guard', status: 'active', firstPlace: 'chest', shapeSig: [0.5, 0.5, 0.5, 0.5, 0.5] }];
    if (/HAS_PART_TAG/.test(q)) return [{ partId: 'p1', toolId: 'pause', at: at(9) }, { partId: 'p1', toolId: null, at: at(10) }];
    if (/HAS_PART_SESSION/.test(q)) return [{ partId: 'p1', at: at(9), firstFeel: 'feel_tired' }, { partId: 'p1', at: at(9), firstFeel: null }];
    return [];
  });
  const r = await readStatsRows(on.tx, 'u1');
  assert.deepEqual(r, {
    partsOn: true, timeZone: 'Europe/London',
    parts: [{ id: 'p1', name: 'The guard', status: 'active', firstPlace: 'chest', shapeSig: [0.5, 0.5, 0.5, 0.5, 0.5] }],
    tags: [{ partId: 'p1', toolId: 'pause', at: at(9) }],
    sessions: [{ partId: 'p1', at: at(9), firstFeel: 'feel_tired' }],
  });
  assert.ok(on.f.calls.every((c) => c.params.uid === 'u1'));
});

/** getInsightsData's reads, with the parts stats reads routed by what they read. */
function reflectDriver(parts) {
  return fakeDriver((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: parts.on, timeZone: null }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return parts.parts ?? [];
    if (/HAS_PART_TAG/.test(q)) return parts.tags ?? [];
    if (/HAS_PART_SESSION/.test(q)) return parts.sessions ?? [];
    return [];
  });
}

test('getInsightsData: `parts` null with parts off; with parts on, the parts that have a line, all time', async () => {
  let f = reflectDriver({ on: false });
  setDriver(f.driver);
  let out = await fns.getInsightsData.run({ auth: auth(), data: { timeRange: '7d' } });
  assert.equal(out.parts, null);
  assert.ok(!f.calls.some((c) => /HAS_PART_TAG|HAS_PART_SESSION/.test(c.query)), 'parts off: no parts read');

  f = reflectDriver({
    on: true,
    parts: [
      { id: 'p1', name: 'The guard', status: 'active', firstPlace: 'chest', shapeSig: null },
      { id: 'p2', name: null, status: 'resting', firstPlace: null, shapeSig: null },
    ],
    tags: [tag('pause', at(18)), tag('pause', at(19)), tag('cool-down', at(20))],
  });
  setDriver(f.driver);
  out = await fns.getInsightsData.run({ auth: auth(), data: { timeRange: '7d' } });
  assert.deepEqual(out.parts, [{
    id: 'p1', name: 'The guard', firstPlace: 'chest', shapeSig: null,
    stats: { helped: [{ toolId: 'pause', n: 2 }, { toolId: 'cool-down', n: 1 }], felt: null, when: 'evenings' },
  }]);
  const reads = f.calls.filter((c) => /HAS_PART|AS timeZone/.test(c.query));
  assert.equal(reads.length, 4);
  assert.ok(reads.every((c) => !('days' in c.params) && c.params.uid === 'u1'), 'not the range: all time, the caller');
  assert.equal(new Set(reads.map((c) => c.session)).size, 1, 'one read transaction');
  assert.ok(f.allClosed());
});

test('felt: a visit whose first answer is a non-answer (keepPlan NON_ANSWER) is not a visit', () => {
  const six = ['feel_tired', 'feel_tired', 'feel_annoyed', 'feel_curious', 'feel_curious', 'feel_steady'].map((f, i) => visit(f, i + 1));
  assert.ok(feltFor(six, null));
  // one non-answer in place of a real one: 5 visits count, not enough
  for (const non of ['feel_not_sure', 'feel_nothing', 'feel_cant_tell', 'own_words']) {
    const withNon = [...six.slice(0, 5), visit(non, 6)];
    assert.equal(feltFor(withNon, null), null, non);
  }
  // non-answers never become then or now, and don't shift the halves
  const padded = [visit('feel_not_sure', 1), ...six.map((s, i) => ({ ...s, at: at(10, 0, i + 2) })), visit('feel_nothing', 9)];
  assert.deepEqual(feltFor(padded, null), { month: '2026-07', then: 'feel_tired', now: 'feel_curious' });
  const { NON_ANSWER } = require('../../lib/parts/keepPlan');
  assert.ok(NON_ANSWER.test('feel_not_sure') && NON_ANSWER.test('feel_nothing') && !NON_ANSWER.test('feel_tired'), 'the shared rule');
});

test('getInsightsData: a failed parts read logs and returns parts null; the rest of Reflect renders', async () => {
  const f = fakeDriver((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: true, timeZone: null }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return new Error('boom');
    if (/\[:LOGGED\]->\(c:CheckIn\)/.test(q)) return [{
      id: 'c1', timestamp: new Date().toISOString(), emotion: 'anxious', emotionIds: ['anxious'], quadrant: 'high-unpleasant',
      intensityX: 0.2, intensityY: 0.8, band: null, activationPatternId: 'acute_alarm', bodyRegions: [], tagArrays: [], families: ['fear'],
    }];
    return [];
  });
  setDriver(f.driver);
  const logged = [];
  const orig = console.error;
  console.error = (...a) => logged.push(a);
  let out;
  try {
    out = await fns.getInsightsData.run({ auth: auth(), data: {} });
  } finally {
    console.error = orig;
  }
  assert.equal(out.parts, null);
  assert.equal(out.totalCheckIns, 1, 'the rest is there');
  assert.ok(logged.some((a) => a[0] === 'getInsightsData parts failed'));
  assert.ok(f.allClosed());
});
