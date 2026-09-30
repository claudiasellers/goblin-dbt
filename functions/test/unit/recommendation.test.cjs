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

test('getStateAndTools: missing quadrant → invalid-argument before any session; missing pattern → not-found', async () => {
  const f = fakeDriver(responder());
  setDriver(f.driver);
  await assert.rejects(fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: {} }), (e) => e.code === 'invalid-argument');
  assert.equal(f.sessions.length, 0);
  const g = fakeDriver(responder({ detail: [] }));
  setDriver(g.driver);
  await assert.rejects(fns.getStateAndTools.run({ auth: { uid: 'u1' }, data: { quadrant: 'high-unpleasant' } }), (e) => e.code === 'not-found');
  assert.ok(g.allClosed());
});
