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
  STATS_THRESHOLDS, helpedFor, feltFor, whenFor, whenBand, localTime, partStats, statsByPart, partsReflect, hasLine, stepsFor,
  feelAcross, partsFeel,
} = require('../../lib/parts/stats');
const {
  STATS_USER_QUERY, STATS_PARTS_QUERY, STATS_TAGS_QUERY, STATS_SESSIONS_QUERY, STATS_STEPS_QUERY, readStatsRows,
} = require('../../lib/parts/statsQueries');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });

/** An instant on 1 July 2026 at an hour (UTC), plus minutes for ordering. */
const at = (hour, min = 0, day = 1, month = 7) => new Date(Date.UTC(2026, month - 1, day, hour, min)).toISOString();
const tag = (toolId, a, partId = 'p1') => ({ partId, toolId, at: a });
const visit = (firstFeel, day, month = 7, partId = 'p1') => ({ partId, at: at(10, 0, day, month), firstFeel });

test('the thresholds are the agreed numbers', () => {
  assert.deepEqual({ ...STATS_THRESHOLDS }, {
    helpedMinTags: 3, helpedMaxTools: 3, feltMinPerHalf: 3, whenMinTags: 3, stepsMinSessions: 2, stepsMaxSteps: 3,
    feelDays: 30, feelMinPerHalf: 4, feelMinShare: 0.4,
  });
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
  steps: [],
  ...o,
});

test('per part: only its own rows; parts off nothing; set-aside and unknown parts left out; no line, no block', () => {
  const s = statsByPart(rows());
  assert.deepEqual(s.get('p1'), { helped: [{ toolId: 'pause', n: 2 }, { toolId: 'cool-down', n: 1 }], felt: null, when: 'evenings', steps: null });
  assert.deepEqual(s.get('p2'), { helped: null, felt: null, when: null, steps: null }, "p2's one tag isn't p1's");
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
  assert.deepEqual(Object.keys(partStats([], [], null)).sort(), ['felt', 'helped', 'steps', 'when']);
});

test('reads: through the caller\'s own User and edges, active or resting parts, parts on, first answer only', () => {
  for (const q of [STATS_PARTS_QUERY, STATS_TAGS_QUERY, STATS_SESSIONS_QUERY, STATS_STEPS_QUERY]) {
    assert.match(q, /^\s*MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART(_TAG|_SESSION)?\]->/);
    assert.match(q, /coalesce\(u\.partsEnabled, false\)/);
    assert.match(q, /pt\.status IN \['active', 'resting'\]/);
    assert.doesNotMatch(q, /\b(MERGE|CREATE|SET|DELETE)\b/, 'read-only');
  }
  assert.match(STATS_TAGS_QUERY, /\(u\)-\[:HAS_PART\]->\(pt\)/);
  // helped counts close and cope_ahead tags (when: close only, stats.ts): a DEAR MAN debrief tag says the part was there, not that a tool helped
  assert.match(STATS_TAGS_QUERY, /AND coalesce\(t\.source, 'close'\) IN \['close', 'cope_ahead'\]/);
  assert.match(STATS_TAGS_QUERY, /coalesce\(t\.source, 'close'\) AS source/);
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
  assert.deepEqual(await readStatsRows(off.tx, 'u1'), { partsOn: false, timeZone: null, parts: [], tags: [], sessions: [], steps: [] });
  assert.equal(off.f.calls.length, 1);
  const on = fakeTx((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: true, timeZone: 'Europe/London' }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return [{ id: 'p1', name: 'The guard', status: 'active', firstPlace: 'chest', shapeSig: [0.5, 0.5, 0.5, 0.5, 0.5] }];
    if (/AS stepId/.test(q)) return [
      { partId: 'p1', stepId: 'recover:park', label: 'Park the replay', at: at(9) },
      { partId: 'p1', stepId: null, label: 'x', at: at(9) }, { partId: 'p1', stepId: 'recover:land', label: '', at: at(9) },
    ];
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
    steps: [{ partId: 'p1', stepId: 'recover:park', label: 'Park the replay', at: at(9) }],
  });
  assert.ok(on.f.calls.every((c) => c.params.uid === 'u1'));
});

/** getInsightsData's reads, with the parts stats reads routed by what they read. */
function reflectDriver(parts) {
  return fakeDriver((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: parts.on, timeZone: null }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return parts.parts ?? [];
    if (/AS stepId/.test(q)) return parts.steps ?? [];
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
    stats: { helped: [{ toolId: 'pause', n: 2 }, { toolId: 'cool-down', n: 1 }], felt: null, when: 'evenings', steps: null },
  }]);
  const reads = f.calls.filter((c) => /HAS_PART|AS timeZone/.test(c.query));
  assert.equal(reads.length, 5);
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

test('helped ignores debrief tags: the tags read filters them out before the compute', async () => {
  // A responder that applies the query's own source filter to mixed rows, as the graph would.
  const all = [
    { partId: 'p1', toolId: 'dear-man', at: at(18), source: 'debrief' },
    { partId: 'p1', toolId: 'dear-man', at: at(19), source: 'debrief' },
    { partId: 'p1', toolId: 'dear-man', at: at(20), source: 'debrief' },
    { partId: 'p1', toolId: 'pause', at: at(9), source: 'close' },
  ];
  const tx = fakeTx((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: true, timeZone: null }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return [{ id: 'p1', name: 'The guard', status: 'active', firstPlace: null, shapeSig: null }];
    if (/AS stepId/.test(q)) return [];
    if (/HAS_PART_TAG/.test(q)) {
      const counted = /coalesce\(t\.source, 'close'\) IN \['close', 'cope_ahead'\]/.test(q);
      return all.filter((r) => !counted || r.source === 'close' || r.source === 'cope_ahead');
    }
    return [];
  }).tx;
  const rows = await readStatsRows(tx, 'u1');
  assert.deepEqual(rows.tags.map((t) => t.toolId), ['pause']);
  assert.deepEqual(partsReflect(rows), [], 'one close tag: below every threshold, no block');
});

const step = (stepId, a, label = stepId, partId = 'p1') => ({ partId, stepId, label, at: a });

test('steps: 1 tagged session says nothing, 2 do; most used first, ties to the most recent, at most 3', () => {
  assert.equal(stepsFor([]), null);
  assert.equal(stepsFor([step('recover:park', at(9))]), null, '1 session');
  assert.deepEqual(stepsFor([step('recover:park', at(9)), step('oa:fear_avoid:small', at(10))]),
    [{ stepId: 'oa:fear_avoid:small', label: 'oa:fear_avoid:small', n: 1 }, { stepId: 'recover:park', label: 'recover:park', n: 1 }],
    '2 sessions, one each: the more recent first');
  const rows = [
    step('recover:park', at(9)), step('oa:fear_avoid:small', at(8)), step('oa:fear_avoid:small', at(7)),
    step('recover:land', at(12)), step('recover:land', at(6)), step('oa:sad_withdraw:medium', at(13)),
  ];
  assert.deepEqual(stepsFor(rows).map((s) => [s.stepId, s.n]),
    [['recover:land', 2], ['oa:fear_avoid:small', 2], ['oa:sad_withdraw:medium', 1]], 'twice before once; a tie to the latest; ≤ 3');
  // the label is the latest row's (the graph's wording can change between sessions)
  assert.equal(stepsFor([step('recover:park', at(9), 'Park it'), step('recover:park', at(10), 'Park the replay')])[0].label, 'Park the replay');
  // a row with no id, no label or no time never counts toward the threshold
  assert.equal(stepsFor([step('recover:park', at(9)), step('', at(10)), step('recover:land', at(11), '')]), null);
  assert.equal(stepsFor([step('recover:park', at(9)), step('recover:land', 'not a time')]), null);
});

test('steps: per part, a line of its own (a part with only steps has a Reflect block)', () => {
  const r = rows({ tags: [], steps: [step('recover:park', at(9), 'Park the replay', 'p3'), step('recover:park', at(10), 'Park the replay', 'p3'), step('recover:land', at(9), 'x', 'p2')] });
  const s = statsByPart(r);
  assert.deepEqual(s.get('p3'), { helped: null, felt: null, when: null, steps: [{ stepId: 'recover:park', label: 'Park the replay', n: 2 }] });
  assert.equal(s.get('p2').steps, null, "p3's steps aren't p2's");
  assert.equal(hasLine(s.get('p3')), true);
  assert.deepEqual(partsReflect(r).map((p) => p.id), ['p3']);
  assert.equal(partsReflect(rows({ partsOn: false, steps: r.steps })), null, 'parts off: nothing');
});

/**
 * The graph as the steps query sees it, for a fake driver: every session the caller tagged, with the
 * snapshot OA stores. The responder applies the query's own filters (the tools it names, the sizes it
 * tests with CONTAINS), so a change to the query that lets own words or another tool through fails here.
 */
function stepsGraph(q) {
  const tools = [...q.matchAll(/ToolSession \{toolId: '([\w-]+)'\}/g)].map((m) => m[1]);
  const sizes = [...q.matchAll(/CONTAINS '"actionSize":"(\w+)"'/g)].map((m) => m[1]);
  const tagged = [
    { toolId: 'opposite-action', at: at(9), urge: { id: 'fear_avoid', small: 'Stay in the room for five minutes' },
      dataJson: JSON.stringify({ urgeId: 'fear_avoid', parentId: 'fear', actionSize: 'small', action: 'Stay in the room for five minutes' }) },
    { toolId: 'opposite-action', at: at(10), urge: { id: 'fear_avoid', small: 'Stay in the room for five minutes' },
      dataJson: JSON.stringify({ urgeId: 'fear_avoid', parentId: 'fear', actionSize: 'custom', action: 'call my sister Jo' }) },
    { toolId: 'opposite-action', at: at(11), urge: null, erc: { dbtParent: 'sadness', defaultOppositeMedium: 'Reach out to one person' },
      dataJson: JSON.stringify({ urgeId: 'custom', customUrge: 'hide under "actionSize":"small"', parentId: 'sadness', actionSize: 'medium', action: 'Reach out to one person' }) },
    { toolId: 'recovering-from-invalidation', at: at(12), exit: { id: 'park', title: 'Park the replay' } },
    { toolId: 'pause', at: at(13) },
    { toolId: 'dear-man', at: at(14), exit: { id: 'ask', title: 'Ask them to hear you' } },
  ];
  return tagged.filter((t) => tools.includes(t.toolId)).flatMap((t) => {
    if (t.toolId === 'recovering-from-invalidation') return [{ partId: 'p1', stepId: `recover:${t.exit.id}`, label: t.exit.title, at: t.at }];
    if (t.toolId !== 'opposite-action') return [];
    const size = sizes.find((z) => t.dataJson.includes(`"actionSize":"${z}"`));
    if (!size) return [];
    if (t.urge) return [{ partId: 'p1', stepId: `oa:${t.urge.id}:${size}`, label: t.urge[size], at: t.at }];
    const key = `defaultOpposite${size[0].toUpperCase()}${size.slice(1)}`;
    return [{ partId: 'p1', stepId: `oa:default_${t.erc.dbtParent}:${size}`, label: t.erc[key], at: t.at }];
  });
}

test('steps query: Do the Opposite and Recover only, the step picked by id, own words never counted or returned', async () => {
  const tx = fakeTx((q) => {
    if (/AS timeZone/.test(q)) return [{ partsOn: true, timeZone: null }];
    if (/pt\.shapeSig AS shapeSig/.test(q)) return [{ id: 'p1', name: null, status: 'active', firstPlace: null, shapeSig: null }];
    if (/AS stepId/.test(q)) return stepsGraph(q);
    return [];
  });
  const r = await readStatsRows(tx.tx, 'u1');
  assert.deepEqual(r.steps.map((s) => s.stepId), ['oa:fear_avoid:small', 'oa:default_sadness:medium', 'recover:park'],
    "own words (actionSize custom) drop out; Pause and DEAR MAN aren't read; a custom urge's text can't fake a size");
  assert.deepEqual(statsByPart(r).get('p1').steps.map((s) => s.label),
    ['Park the replay', 'Reach out to one person', 'Stay in the room for five minutes']);
  assert.ok(!JSON.stringify(r).includes('call my sister'), 'the person\'s own words never leave the read');
  const call = tx.f.calls.find((c) => /AS stepId/.test(c.query));
  assert.deepEqual(call.params, { uid: 'u1' });
  // the query itself: ids and graph labels out, never the snapshot or the person's text
  const q = STATS_STEPS_QUERY;
  assert.match(q, /AND coalesce\(t\.source, 'close'\) = 'close'/, 'close tags only');
  assert.match(q, /\(ts\)-\[:DETAIL\]->\(d:OppositeActionSession\)<-\[:COMPLETED_SESSION\]-\(u\)/, "the caller's own OA record");
  assert.match(q, /\(ts\)-\[:DETAIL\]->\(d:InvalidationRecoverySession\)<-\[:COMPLETED_SESSION\]-\(u\)/, "the caller's own Recover record");
  assert.doesNotMatch(q, /"actionSize":"custom"/, 'own words are never a step');
  const returns = [...q.matchAll(/RETURN ([^\n]+)/g)].map((m) => m[1]);
  assert.equal(returns.length, 2);
  for (const ret of returns) {
    assert.doesNotMatch(ret, /dataJson|\.action\b|customUrge/, 'no snapshot text returned');
    assert.match(ret, /AS partId, .*stepId, .*label, .*AS at$/);
  }
  assert.deepEqual([...q.matchAll(/toolId: '([\w-]+)'/g)].map((m) => m[1]), ['opposite-action', 'recovering-from-invalidation']);
});

// ------------------------------------------------------------------ Reflect: how they've met their parts lately, across all of them

const NOW = new Date(Date.UTC(2026, 9, 17, 12)); // 17 Oct 2026
/** A first feel-toward answer `daysAgo` days before NOW, of any part. */
const ago = (firstFeel, daysAgo, partId = 'p1') => ({ partId, at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(), firstFeel });

test('feelAcross: the last 30 days, at least 4 answers, the most common holding 40%; else nothing', () => {
  const later = [ago('feel_curious', 1), ago('feel_curious', 3, 'p2'), ago('feel_tired', 5, 'p3'), ago('feel_steady', 8)];
  assert.deepEqual(feelAcross(later, NOW), { now: 'feel_curious', then: null }, '2 of 4 = 50%, across three parts');
  assert.equal(feelAcross(later.slice(0, 3), NOW), null, 'three answers: no line');
  // 2 of 6 = 33% < 40%: no clear answer, no line
  const spread = [...later, ago('feel_open', 9), ago('feel_warm', 10)];
  assert.equal(feelAcross(spread, NOW), null);
  // exactly 40%: 2 of 5
  assert.deepEqual(feelAcross([...later, ago('feel_open', 9)], NOW), { now: 'feel_curious', then: null });
  // older than 30 days, or in the future, isn't "lately"
  assert.equal(feelAcross([ago('feel_curious', 31), ago('feel_curious', 32), ago('feel_curious', 33), ago('feel_curious', 34)], NOW), null);
  assert.equal(feelAcross([ago('feel_curious', -1), ago('feel_curious', 2), ago('feel_curious', 3), ago('feel_curious', 4)], NOW), null);
});

test('feelAcross: the earlier line only when the 30 days before have their own clear answer and it differs', () => {
  const later = [ago('feel_curious', 1), ago('feel_curious', 2), ago('feel_warm', 3), ago('feel_curious', 4)];
  const earlier = [ago('feel_scared', 31), ago('feel_scared', 40), ago('feel_annoyed', 45), ago('feel_scared', 59)];
  assert.deepEqual(feelAcross([...earlier, ...later], NOW), { now: 'feel_curious', then: 'feel_scared' });
  assert.deepEqual(feelAcross([...earlier.map((e) => ({ ...e, firstFeel: 'feel_curious' })), ...later], NOW), { now: 'feel_curious', then: null }, 'the same: no earlier line');
  assert.deepEqual(feelAcross([...earlier.slice(0, 3), ...later], NOW), { now: 'feel_curious', then: null }, 'three earlier answers: not enough');
  assert.deepEqual(feelAcross([...earlier, ago('feel_scared', 61), ...later], NOW), { now: 'feel_curious', then: 'feel_scared' }, 'older than 60 days ignored');
  assert.equal(feelAcross(earlier, NOW), null, 'nothing lately: no line at all, not even the earlier one');
});

test('feelAcross: non-answers never count; a tie goes to the most recent answer', () => {
  const later = [ago('feel_curious', 1), ago('feel_curious', 2), ago('feel_warm', 3), ago('feel_curious', 4)];
  for (const non of ['feel_not_sure', 'feel_nothing']) {
    assert.equal(feelAcross([ago(non, 1), ago(non, 2), ago(non, 3), ago('feel_curious', 4)], NOW), null, `${non} is not an answer`);
    assert.deepEqual(feelAcross([...later, ago(non, 0.5), ago(non, 0.6), ago(non, 0.7)], NOW), { now: 'feel_curious', then: null }, `${non} doesn't dilute`);
  }
  // 2 and 2: the one given most recently wins, whichever way the rows arrive
  const tie = [ago('feel_steady', 2), ago('feel_tired', 6), ago('feel_tired', 4), ago('feel_steady', 8)];
  assert.deepEqual(feelAcross(tie, NOW), { now: 'feel_steady', then: null });
  assert.deepEqual(feelAcross([...tie].reverse(), NOW), { now: 'feel_steady', then: null });
});

test('partsFeel: parts off nothing; active and resting parts only; ids only', () => {
  const sessions = [ago('feel_curious', 1), ago('feel_curious', 2, 'p2'), ago('feel_curious', 3, 'p3'), ago('feel_open', 4, 'p1')];
  assert.deepEqual(partsFeel(rows({ sessions }), NOW), { now: 'feel_curious', then: null });
  assert.equal(partsFeel(rows({ sessions, partsOn: false }), NOW), null);
  const aside = rows({ sessions, parts: rows().parts.map((p) => (p.id === 'p3' ? { ...p, status: 'set_aside' } : p)) });
  assert.equal(partsFeel(aside, NOW), null, "a set-aside part's visit isn't counted: three answers left");
  assert.equal(partsFeel(rows({ sessions: sessions.map((s) => ({ ...s, partId: 'stranger' })) }), NOW), null);
});

test('getInsightsData: partsFeel from the same read; null with parts off', async () => {
  const day = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
  let f = reflectDriver({ on: false });
  setDriver(f.driver);
  let out = await fns.getInsightsData.run({ auth: auth(), data: {} });
  assert.equal(out.partsFeel, null);
  f = reflectDriver({
    on: true,
    parts: [{ id: 'p1', name: 'The guard', status: 'active', firstPlace: null, shapeSig: null }],
    sessions: [1, 2, 3, 4].map((d) => ({ partId: 'p1', at: day(d), firstFeel: d === 4 ? 'feel_open' : 'feel_curious' })),
  });
  setDriver(f.driver);
  out = await fns.getInsightsData.run({ auth: auth(), data: {} });
  assert.deepEqual(out.partsFeel, { now: 'feel_curious', then: null });
  assert.equal(f.calls.filter((c) => /HAS_PART_SESSION/.test(c.query)).length, 1, 'one read for both');
  assert.ok(!JSON.stringify(out.partsFeel).includes('feel_open'), 'only the most common id leaves the server');
});

test('cope_ahead tags (Cope Ahead\'s "Used it, it helped") count with the close tags for helped, never for when', async () => {
  const tags = [
    { partId: 'p1', toolId: 'cope-ahead', at: at(21), source: 'cope_ahead' },
    { partId: 'p1', toolId: 'cope-ahead', at: at(21, 30), source: 'cope_ahead' },
    { partId: 'p1', toolId: 'pause', at: at(9), source: 'close' },
  ];
  const s = partStats(tags, [], null);
  assert.deepEqual(s.helped, [{ toolId: 'cope-ahead', n: 2 }, { toolId: 'pause', n: 1 }]);
  assert.equal(s.when, null, 'one close tag: when says nothing (the after card\'s time is not the moment)');
  // The read keeps the source: a row without one is a close tag (older rows, the fake driver's).
  const tx = { run: async (q) => ({ records: /HAS_PART_TAG/.test(q) && !/AS stepId/.test(q)
    ? tags.map((r) => ({ has: (k) => k in r, get: (k) => r[k] }))
    : /AS timeZone/.test(q) ? [{ has: () => true, get: (k) => ({ partsOn: true, timeZone: null })[k] }] : [] }) };
  const rows = await readStatsRows(tx, 'u1');
  assert.deepEqual(rows.tags.map((t) => t.source), ['cope_ahead', 'cope_ahead', 'close']);
});
