'use strict';
/** getCopeAheadContent (public content; no user data). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

const flow = {
  version: 'cope-ahead-v1', ownMax: 140, moveOwnMax: 90, sourceIds: ['linehan_skills_2015'],
  when: [{ id: 'today', key: 'when_today' }], copy: { what_title: "What's coming up?" },
  pullIf: { blank: 'I start to shut down' }, after: { after_q: 'How did {afterName} go?' },
};

test('getCopeAheadContent: flow copy, situations, moments, moves and beats off dbt_cope_ahead, read-only', async () => {
  const f = fakeDriver((q) => {
    if (/CopeAheadFlow/.test(q)) return [{ version: 'cope-ahead-v1', content: JSON.stringify(flow) }];
    if (/CopeSituation/.test(q)) return [{
      id: 'conversation', label: "A conversation I'm dreading", afterName: 'the conversation', likelyFeelings: ['anxious'],
      hardMoments: ['go_blank', 'might_hurt'], dangerMomentIds: ['might_hurt'], order: 0,
    }];
    if (/HardMoment/.test(q)) return [{ id: 'go_blank', label: 'I go blank', ifText: 'I go blank', order: 1 }];
    if (/CopeMove/.test(q)) return [
      { id: 'leave_safe', kind: 'action', label: 'Leave and get somewhere safe', line: 'leave and get somewhere safe', forPulls: [], general: false, appToolId: null, forMoments: ['might_hurt'], order: 12 },
      { id: 'pause', kind: 'tool', label: 'Pause', line: 'open Pause', forPulls: ['fight'], general: null, appToolId: 'pause', forMoments: null, order: 14 },
    ];
    if (/RehearsalBeat/.test(q)) return [{ id: 'arrive', text: "You're arriving.", order: 1 }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getCopeAheadContent.run({ data: {} });
  assert.equal(out.version, 'cope-ahead-v1');
  assert.deepEqual([out.ownMax, out.moveOwnMax], [140, 90]);
  assert.deepEqual(out.copy, flow.copy);
  assert.deepEqual(out.pullIf, flow.pullIf);
  assert.deepEqual(out.after, flow.after);
  assert.deepEqual(out.when, flow.when);
  assert.ok(!('sourceIds' in out), 'the served shape: no sources');
  assert.deepEqual(out.situations[0].dangerMomentIds, ['might_hurt']);
  assert.deepEqual(out.hardMoments, [{ id: 'go_blank', label: 'I go blank', ifText: 'I go blank', order: 1 }]);
  assert.deepEqual(out.moves[1], { id: 'pause', kind: 'tool', label: 'Pause', line: 'open Pause', forPulls: ['fight'], general: false, appToolId: 'pause', forMoments: [], order: 14 });
  assert.equal(out.moves[0].appToolId, null);
  assert.deepEqual(out.beats, [{ id: 'arrive', text: "You're arriving.", order: 1 }]);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getCopeAheadContent fails with failed-precondition until schema/cope-ahead.cypher is loaded', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getCopeAheadContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});
