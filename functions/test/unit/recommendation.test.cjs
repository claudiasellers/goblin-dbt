'use strict';
/**
 * getStateAndTools through the real callable and query layer (fake driver). The routing logic
 * itself is pinned by the root golden tests (tests/recommendation-*.test.mjs) over the schema
 * fixture; this file pins the query → row mapping and the callable's error contract.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const int = (n) => ({ low: n, high: 0, toNumber: () => n });
const quiet = async (fn) => {
  const orig = console.log;
  console.log = () => {};
  try { return await fn(); } finally { console.log = orig; }
};

const PATTERN = {
  id: 'acute_alarm', userFacingLabel: 'Your alarm system is firing', description: 'd', evidenceGrade: 'Strong',
  safetyConstraints: null, clinicalNotes: null,
};

function responder(extra = {}) {
  return (q) => {
    if (/ASSOCIATED_WITH\]->\(e:Emotion\)\s+WHERE p\.id IN \$candidatePatterns/.test(q)) return extra.evidence ?? [];
    if (/MATCH \(p:ActivationPattern \{id: \$patternId\}\)\s+RETURN p\.id as id/.test(q)) return extra.detail ?? [PATTERN];
    if (/STARTS WITH 'dbt_'/.test(q)) {
      return [
        { id: 'dbt_opposite_action', appToolId: 'opposite-action', name: 'Opposite Action', description: 'oa', whenToUse: 'w', dbtBasis: null, relevanceScore: int(1) },
        { id: 'dbt_tipp', appToolId: 'cool-down', name: 'TIPP', description: 'tipp', whenToUse: 'w', dbtBasis: 'TIP', relevanceScore: int(2) },
      ];
    }
    if (/TRIGGERS_SAFETY/.test(q)) return extra.safety ?? [];
    if (/RoutingPolicy \{id: 'checkin_result'\}/.test(q)) return extra.policy ?? [];
    if (/RECOMMENDED_FOR/.test(q)) return extra.slice ?? [];
    return [];
  };
}

test('getStateAndTools: one read transaction; legacy tools ranked by score; relevance words kept', async () => {
  const f = fakeDriver(responder());
  setDriver(f.driver);
  const out = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions: ['Anxious'] } }));
  assert.equal(out.pattern.id, 'acute_alarm');
  assert.equal(out.pattern.confidence, 0.25);
  assert.deepEqual(out.pattern.safetyConstraints, []);
  assert.deepEqual(out.tools.map((t) => [t.id, t.relevance, t.dbtBasis]), [['cool-down', 'medium', 'TIP'], ['opposite-action', 'relevant', null]]);
  assert.equal(out.safetyFlag, undefined);
  assert.equal(f.sessions.length, 1);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
  const ev = f.calls.find((c) => /candidatePatterns/.test(c.query) && /ASSOCIATED_WITH/.test(c.query));
  assert.deepEqual(ev.params.emotionIds, ['anxious'], 'display names are normalised');
  assert.equal(ev.params.useAliases, false, 'no SCORES_AS aliases while the policy is off (E4-6 reach follows the kill switch)');
});

test('getStateAndTools: the safety seam queries only for non-low-unpleasant results', async () => {
  const flag = { id: 'crisis_self_harm', type: 'crisis', trigger: 't', action: 'a' };
  const f = fakeDriver(responder({ safety: [flag] }));
  setDriver(f.driver);
  const hu = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions: ['panic'] } }));
  assert.deepEqual(hu.safetyFlag, flag);
  const g = fakeDriver(responder({ safety: [flag] }));
  setDriver(g.driver);
  const lu = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'low-unpleasant', emotions: ['Empty'] } }));
  assert.equal(lu.safetyFlag, undefined);
  assert.ok(!g.calls.some((c) => /TRIGGERS_SAFETY/.test(c.query)));
});

test('getStateAndTools { warm: true }: one trivial read, answers { warm: true }, routes and logs nothing; still needs sign-in', async () => {
  const f = fakeDriver(responder());
  setDriver(f.driver);
  const logged = [];
  const orig = console.log;
  console.log = (...a) => logged.push(a);
  let out;
  try { out = await fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { warm: true } }); } finally { console.log = orig; }
  assert.deepEqual(out, { warm: true });
  assert.deepEqual(f.calls.map((c) => c.query), ['RETURN 1 AS ok']);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
  assert.ok(!logged.some((a) => a[0] === 'getStateAndTools'), 'no routing log line for a warm-up');
  await assert.rejects(fns.getStateAndTools.run({ data: { warm: true } }), (e) => e.code === 'unauthenticated');
  // Only the exact warm request: anything with it still has to be a valid check-in.
  await assert.rejects(fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { warm: true, emotions: ['Anxious'] } }), (e) => e.code === 'invalid-argument');
});

test('getStateAndTools: signed out, missing quadrant or a bad band → rejected before any session; missing pattern → not-found', async () => {
  const f = fakeDriver(responder());
  setDriver(f.driver);
  await assert.rejects(fns.getStateAndTools.run({ data: { quadrant: 'high-unpleasant' } }), (e) => e.code === 'unauthenticated');
  await assert.rejects(fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: {} }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', band: 'calm' } }), (e) => e.code === 'invalid-argument');
  assert.equal(f.sessions.length, 0);
  const g = fakeDriver(responder({ detail: [] }));
  setDriver(g.driver);
  await assert.rejects(fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant' } }), (e) => e.code === 'not-found');
  assert.ok(g.allClosed());
});

const TAGS = { side: 'acceptance', skillKind: 'orient', direction: 'orient' };
const concept = (id, appToolId, tags) => ({ id, appToolId, name: id, description: 'd', whenToUse: 'w', dbtBasis: null, ...tags });
const edge = (id, bands, priority) => ({ id, bands, direction: null, side: null, requiresPrior: null, emotionGate: null, active: true, priority });

test('getStateAndTools: policy missing → legacy ranker, routing version legacy', async () => {
  const f = fakeDriver(responder());
  setDriver(f.driver);
  const out = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions: ['Anxious'] } }));
  assert.equal(out.routing.version, 'legacy');
  assert.deepEqual(out.routing.recommendedToolIds, ['cool-down', 'opposite-action']);
  assert.deepEqual([out.routing.band, out.routing.bandSource], ['stirred', 'inferred']);
  assert.ok(!f.calls.some((c) => /RECOMMENDED_FOR/.test(c.query)), 'no slice query while the switch is off');
});

test('getStateAndTools: policy on → pattern × band rows from the slice query (Integer priorities, tags)', async () => {
  const policy = [{
    policy: { version: 'rf-v1', enabled: true, maxCards: int(2), fallbackConceptId: 'se_orienting', defaultBand: 'stirred', floodedPatterns: ['emotional_flooding'] },
    fallback: concept('se_orienting', 'five-senses', TAGS),
  }];
  const slice = [
    { patternId: 'acute_alarm', blank: false, patternEmotions: ['anxiety'], concept: concept('se_orienting', 'five-senses', TAGS),
      edge: edge('rf_acute_alarm_steady_five-senses', ['steady'], 2), addresses: [], contraPatterns: [], contraFlags: [] },
    { patternId: 'acute_alarm', blank: false, patternEmotions: ['anxiety'], concept: concept('dbt_opposite_action', 'opposite-action', { side: 'change', skillKind: 'change', direction: 'neutral' }),
      edge: edge('rf_acute_alarm_steady_opposite-action', ['steady'], 1), addresses: ['fear'], contraPatterns: [], contraFlags: [] },
  ];
  const f = fakeDriver(responder({ policy, slice }));
  setDriver(f.driver);
  const out = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions: ['Anxious'], band: 'steady', bandSource: 'probe', surface: 'checkin' } }));
  assert.equal(f.calls.find((c) => /SCORES_AS/.test(c.query)).params.useAliases, true, 'aliases count once the policy is on');
  assert.deepEqual(out.tools.map((t) => [t.id, t.slot, t.side, t.ruleId]), [
    ['opposite-action', 'primary', 'change', 'rf_acute_alarm_steady_opposite-action'],
    ['five-senses', 'swap', 'acceptance', 'rf_acute_alarm_steady_five-senses'],
  ]);
  assert.deepEqual(out.routing, {
    version: 'rf-v1', band: 'steady', bandSource: 'probe', blank: false,
    recommendedToolIds: ['opposite-action', 'five-senses'], ruleIds: ['rf_acute_alarm_steady_opposite-action', 'rf_acute_alarm_steady_five-senses'],
    filtered: [], receiveFirst: true, surface: 'checkin',
  });
  const sliceCall = f.calls.find((c) => /RECOMMENDED_FOR/.test(c.query));
  assert.deepEqual(sliceCall.params.patternIds, ['acute_alarm']);
  assert.equal(f.sessions.length, 1);
});
