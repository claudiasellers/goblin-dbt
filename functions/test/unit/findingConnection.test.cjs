'use strict';
/**
 * Find your people on the skill player (IE-B5, docs/design/find-your-people.md): the run's projection
 * (findingConnection/projection.ts) into the Interaction log (`reach_out`), once the reach_out_outcome card's visit
 * says it was done or decided against, and the rep (*I did it*).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const P = require(path.join(LIB, 'findingConnection/projection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const TS = require(path.join(LIB, 'spine/toolSession.js'));
const TOOLS = require(path.join(LIB, 'spine/tools.js'));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const run = (answers) => ({ skillId: 'finding_connection', versionId: 'fc-v1', path: ['start'], answers, ctx: {} });
const FIRST = [ans('area', 'talk'), ans('step', 'talk_reply'), ans('predict', 'badly'), ans('liking', 'not_much'), ans('when', 'tomorrow'), ans('remind', 'yes')];

function fakeTx() {
  const calls = [];
  return { calls, run: async (query, params) => { calls.push({ query, params }); return { records: [].map(record) }; } };
}
const input = (r) => ({ uid: 'u1', toolSessionId: TSID, toolId: 'finding-connection', run: r });

test('fields: option ids only; nothing until the card\'s visit says done or decided against', () => {
  assert.equal(P.reachOutFields(run(FIRST)), null, 'a first visit logs nothing');
  assert.equal(P.reachOutFields(run([...FIRST, ans('happened', 'not_yet')])), null, 'not yet: a new time, nothing logged yet');
  assert.deepEqual(P.reachOutFields(run([...FIRST, ans('happened', 'did'), ans('went', 'well'), ans('liked', 'a_lot')])),
    { happened: 'did', area: 'talk', stepId: 'talk_reply', predicted: 'badly', likingPrediction: 'not_much', outcome: 'well', liked: 'a_lot' });
  assert.deepEqual(P.reachOutFields(run([...FIRST, ans('happened', 'decided_not'), ans('went', 'well')])),
    { happened: 'decided_not', area: 'talk', stepId: 'talk_reply', predicted: 'badly', likingPrediction: 'not_much', outcome: null, liked: null });
  const own = P.reachOutFields(run([ans('area', 'friend'), { fieldId: 'step', optionIds: [], valueOwn: 'Text Priya about the gig' }, ans('happened', 'did')]));
  assert.equal(own.stepId, null);
  assert.equal(JSON.stringify(own).includes('Priya'), false, 'own words never reach the Interaction');
});

test('the projection: one Interaction {kind: reach_out}, keyed by the visit, the caller\'s own; other skills untouched', async () => {
  const tx = fakeTx();
  await P.projectFindingConnection(tx, input(run([...FIRST, ans('happened', 'did'), ans('went', 'mixed')])));
  assert.equal(tx.calls.length, 1);
  const w = tx.calls[0];
  assert.equal(w.query, P.INTERACTION_REACH_OUT_WRITE);
  assert.deepEqual([w.params.uid, w.params.iKey, w.params.id, w.params.outcome, w.params.predicted], ['u1', `u1:${TSID}`, TSID, 'mixed', 'badly']);
  assert.match(w.query, /MERGE \(i:Interaction \{key: \$iKey\}\)\s*ON CREATE SET i:UserData:LogRecord/);
  assert.match(w.query, /i\.kind = 'reach_out'/);
  assert.match(w.query, /MERGE \(u\)-\[:HAS_INTERACTION\]->\(i\)/);
  const none = fakeTx();
  await P.projectFindingConnection(none, input(run(FIRST)));
  await P.projectFindingConnection(none, input({ ...run([...FIRST, ans('happened', 'did')]), skillId: 'give' }));
  assert.equal(none.calls.length, 0);
});

test('wiring: the projection, the rep, the card bound to the tool, opening resolves it, no close question', () => {
  assert.equal(S.PROJECTIONS['finding-connection'], P.projectFindingConnection);
  const ext = (answers) => JSON.stringify({ run: run(answers) });
  assert.deepEqual(S.runRep(ext([...FIRST, ans('happened', 'did')]), 'finding-connection'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext([...FIRST, ans('happened', 'not_yet')]), 'finding-connection'), { noRep: true });
  assert.deepEqual(S.runRep(ext([...FIRST, ans('happened', 'decided_not')]), 'finding-connection'), { noRep: true });
  assert.equal(S.runRep(ext(FIRST), 'finding-connection'), null, 'the first visit keeps the close\'s own');
  assert.equal(CA.FOLLOW_UP_SESSION_TOOL.reach_out_outcome, 'finding-connection');
  assert.ok(TS.OPEN_RESOLVES.includes('reach_out_outcome'));
  assert.deepEqual(TOOLS.SPINE_TOOLS['finding-connection'], { module: 'ie', closeKind: 'none' });
});
