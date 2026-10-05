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
    if (/ASSOCIATED_WITH\]->\(e:Emotion\)\s+WHERE size\(signalled\) = 0 AND p\.id IN \$candidatePatterns/.test(q)) return extra.evidence ?? [];
    if (/MATCH \(p:ActivationPattern \{id: \$patternId\}\)\s+RETURN p\.id as id/.test(q)) return extra.detail ?? [PATTERN];
    if (/STARTS WITH 'dbt_'/.test(q)) {
      return [
        { id: 'dbt_opposite_action', appToolId: 'opposite-action', name: 'Opposite Action', description: 'oa', whenToUse: 'w', dbtBasis: null, relevanceScore: int(1) },
        { id: 'dbt_tipp', appToolId: 'cool-down', name: 'TIPP', description: 'tipp', whenToUse: 'w', dbtBasis: 'TIP', relevanceScore: int(2) },
      ];
    }
    if (/RAISES_SAFETY/.test(q)) return extra.raised ?? [];
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
  const f = fakeDriver(responder({ safety: [{ ...flag, withoutSignal: null }] }));
  setDriver(f.driver);
  const hu = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions: ['panic'] } }));
  assert.deepEqual(hu.safetyFlag, flag);
  const g = fakeDriver(responder({ safety: [{ ...flag, withoutSignal: null }] }));
  setDriver(g.driver);
  const lu = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'low-unpleasant', emotions: ['Empty'] } }));
  assert.equal(lu.safetyFlag, undefined);
  assert.ok(!g.calls.some((c) => /TRIGGERS_SAFETY/.test(c.query)));
});

test('getStateAndTools: the spiral path\'s safety answer (checkin-safety.cypher) decides banner vs calm line', async () => {
  const flag = { id: 'crisis_self_harm', type: 'crisis', trigger: 't', action: 'a' };
  const ask = (answers, quadrant = 'high-unpleasant') => ({ auth: { uid: 'u1' }, data: {
    quadrant, emotions: ['panic'], discriminatingAnswers: answers.map((responseId) => ({ questionId: 'q', responseId })),
  } });

  // No signal: flooding's edge says withoutSignal "line" → the calm line, and no answer query is run.
  let f = fakeDriver(responder({ safety: [{ ...flag, withoutSignal: 'line' }] }));
  setDriver(f.driver);
  let out = await quiet(() => fns.getStateAndTools.run(ask([])));
  assert.deepEqual(out.safetyFlag, { ...flag, level: 'line' });
  assert.ok(!f.calls.some((c) => /RAISES_SAFETY/.test(c.query)), 'no answers, no answer query');

  // Yes: the raised flag, as the banner (no level); the pattern's flag isn't even read.
  f = fakeDriver(responder({ raised: [{ ...flag, withoutSignal: null }], safety: [{ ...flag, withoutSignal: 'line' }] }));
  setDriver(f.driver);
  out = await quiet(() => fns.getStateAndTools.run(ask(['hu_exp_flooding', 'hu_safety_yes'])));
  assert.deepEqual(out.safetyFlag, flag);
  const raisedCall = f.calls.find((c) => /RAISES_SAFETY/.test(c.query));
  assert.deepEqual(raisedCall.params.responseIds, ['hu_exp_flooding', 'hu_safety_yes'], 'every answer as sent, including high-unpleasant ones the policy holds back');
  assert.ok(!f.calls.some((c) => /TRIGGERS_SAFETY/.test(c.query)));

  // A yes counts in low-unpleasant too (only pattern flags are skipped there).
  f = fakeDriver(responder({ raised: [{ ...flag, withoutSignal: null }] }));
  setDriver(f.driver);
  out = await quiet(() => fns.getStateAndTools.run(ask(['hu_safety_yes'], 'low-unpleasant')));
  assert.equal(out.safetyFlag?.type, 'crisis');

  // The log line says which: ids and enums only, never the answer.
  f = fakeDriver(responder({ safety: [{ ...flag, withoutSignal: 'line' }] }));
  setDriver(f.driver);
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try { await fns.getStateAndTools.run(ask(['hu_safety_no'])); } finally { console.log = orig; }
  const logged = JSON.parse(lines.find((l) => l.startsWith('getStateAndTools')).slice('getStateAndTools '.length));
  assert.equal(logged.safetyLevel, 'line');
  assert.ok(!lines.join('').includes('hu_safety'), 'the answer is never logged');
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
  const ev = f.calls.find((c) => /SCORES_AS/.test(c.query));
  assert.equal(ev.params.useAliases, true, 'aliases and reviewed patterns count once the policy is on');
  assert.ok(ev.params.candidatePatterns.includes('reactive_aggression'), 'Ready to fight is a candidate while the policy is on');
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

test('getStateAndTools: a words-gated row (Oct 2026 review) comes through the slice query and fires only on its words', async () => {
  const policy = [{
    policy: { version: 'rf-v2', enabled: true, maxCards: int(2), fallbackConceptId: 'se_orienting', defaultBand: 'stirred', floodedPatterns: ['emotional_flooding'] },
    fallback: concept('se_orienting', 'five-senses', TAGS),
  }];
  const wordRow = { ...edge('rf_acute_alarm_words_overwhelm_pause', ['steady', 'stirred'], 0.5), emotionGate: 'words', words: ['overwhelmed'] };
  const slice = [
    { patternId: 'acute_alarm', blank: false, patternEmotions: ['anxiety'], concept: concept('dbt_tipp', 'cool-down', { side: 'both', skillKind: 'body', direction: 'down' }),
      edge: edge('rf_acute_alarm_default_cool-down', ['steady', 'stirred'], 1), addresses: [], contraPatterns: [], contraFlags: [] },
    { patternId: 'acute_alarm', blank: false, patternEmotions: ['anxiety'], concept: concept('dbt_stop', 'pause', { side: 'both', skillKind: 'hold', direction: 'down' }),
      edge: wordRow, addresses: [], contraPatterns: [], contraFlags: [] },
  ];
  for (const [emotions, expected] of [[['Overwhelmed'], ['pause', 'cool-down']], [['Scared'], ['cool-down']]]) {
    const f = fakeDriver(responder({ policy, slice }));
    setDriver(f.driver);
    const out = await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions } }));
    assert.deepEqual(out.tools.map((t) => t.id), expected, emotions.join());
  }
});

test('getStateAndTools: policy off → Ready to fight is not a candidate (the kill switch keeps today\'s four)', async () => {
  const f = fakeDriver(responder({}));
  setDriver(f.driver);
  await quiet(() => fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant', emotions: ['Angry'] } }));
  const ev = f.calls.find((c) => /SCORES_AS/.test(c.query));
  assert.equal(ev.params.useAliases, false);
  assert.ok(!ev.params.candidatePatterns.includes('reactive_aggression'));
});
