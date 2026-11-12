'use strict';
/**
 * Do the Opposite on the skill player (ER-B3, docs/design/opposite-action-v3.md): the run's projection
 * (oppositeAction/projection.ts) into OppositeActionSession v3, ids only and each pick re-checked against the graph;
 * a reopened visit (oa_try) moving the first visit's records on; the off-phone rep.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const P = require(path.join(LIB, 'oppositeAction/projection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const TS = require(path.join(LIB, 'spine/toolSession.js'));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const FLOW = JSON.stringify({ routes: { 'not_fit:unhelpful': 'opposite', 'fits:unhelpful': 'opposite', 'fits:helpful': 'problem' } });

const ans = (fieldId, ids, extra = {}) => ({ fieldId, optionIds: ids, ...extra });
const at = (fieldId, pick, ids, extra = {}) => ({ fieldId, pick, optionIds: ids, ...extra });
/** A first visit, tried now: one feeling (sad) on the opposite route, with own words where the person wrote them. */
const sadRun = (over = {}) => ({
  skillId: 'opposite_action', versionId: 'skills-v1:opposite_action', path: ['door', 'goal', 'pred', 'when', 'try', 'aftr', 'read'],
  answers: [
    ans('feel', ['sad']), ans('goal', ['connection']), ans('safety', ['safe']),
    at('urge', 'sad', ['sad-bed']), at('fits', 'sad', ['not_fit']), at('help', 'sad', ['unhelpful']),
    at('size', 'sad', ['sad-bed:small']), at('tvnb', 'sad', ['better']),
    ans('predict', ['badly']), ans('when', ['now']), ans('outcome', ['toward_goal']), ans('actual', ['nothing'], { valueOwn: 'They smiled back' }),
  ],
  ...over,
});

/** A fake transaction: the responder's rows for each query (a valid sad pick by default), every call kept. */
function fakeTx(respond = () => undefined) {
  const calls = [];
  return {
    calls,
    run: async (query, params) => {
      calls.push({ query, params });
      const rows = respond(query, params);
      if (rows === undefined && query === P.CHECK_PICK) return { records: [record({ parentId: 'sadness', urgeId: params.urgeId, flow: FLOW })] };
      return { records: (rows ?? []).map(record) };
    },
  };
}
const input = (run) => ({ uid: 'u1', toolSessionId: TSID, toolId: 'opposite-action', run });
const writes = (tx) => tx.calls.filter((c) => c.query === P.WRITE_PICK);

test('a feeling that reached its step: one v3 record, ids only (own words stay in ext.run), linked to the visit', async () => {
  const tx = fakeTx();
  await P.projectOppositeAction(tx, input(sadRun()));
  const [w] = writes(tx);
  assert.ok(w, 'a record is written');
  assert.equal(w.params.key, `u1:${TSID}-1`);
  assert.equal(w.params.tsKey, `u1:${TSID}`, 'hung off the caller\'s own ToolSession (DETAIL)');
  assert.equal(w.params.status, 'practiced');
  assert.equal(w.params.emotionId, 'sad');
  assert.equal(w.params.urgeId, 'sad-bed');
  assert.equal(w.params.schemaVersion.toNumber(), 3);
  const data = JSON.parse(w.params.dataJson);
  assert.equal(data.actionSize, 'small', 'the parts stats read actionSize');
  assert.equal(data.parentId, 'sadness', 'the parent comes from the graph, never the client');
  assert.ok(!w.params.dataJson.includes('smiled'), 'own words never copied into the record');
  assert.match(P.WRITE_PICK, /MERGE \(ts\)-\[:DETAIL\]->\(s\)/);
  assert.match(P.WRITE_PICK, /TARGETED_URGE/);
});

test('the old readers read a v3 record: the parts stats\' size and parent strings, DETAIL, FOCUSED_ON, TARGETED_URGE', async () => {
  const Q = require(path.join(LIB, 'parts/statsQueries.js'));
  const tx = fakeTx();
  await P.projectOppositeAction(tx, input(sadRun()));
  const data = writes(tx)[0].params.dataJson;
  // STATS_STEPS_QUERY matches these exact substrings inside dataJson (no spaces: JSON.stringify).
  assert.ok(Q.STATS_STEPS_QUERY.includes(`d.dataJson CONTAINS '"actionSize":"small"'`));
  assert.ok(data.includes('"actionSize":"small"'));
  assert.ok(Q.STATS_STEPS_QUERY.includes(`d.dataJson CONTAINS ('"parentId":"' + c.dbtParent + '"')`));
  assert.ok(data.includes('"parentId":"sadness"'));
  assert.match(Q.STATS_STEPS_QUERY, /\(ts\)-\[:DETAIL\]->\(d:OppositeActionSession\)<-\[:COMPLETED_SESSION\]-\(u\)/);
  for (const edge of ['MERGE (u)-[:COMPLETED_SESSION]->(s)', 'MERGE (ts)-[:DETAIL]->(s)', 'MERGE (s)-[:FOCUSED_ON]->(e)', 'MERGE (s)-[:TARGETED_URGE]->(n)']) {
    assert.ok(P.WRITE_PICK.includes(edge), edge);
  }
  // An urge in the person's own words: urgeId custom, the parent in dataJson (the stats' default-step branch).
  const own = fakeTx((q) => (q === P.CHECK_PICK ? [{ parentId: 'sadness', urgeId: null, flow: FLOW }] : undefined));
  await P.projectOppositeAction(own, input(sadRun({ answers: sadRun().answers.map((a) => (a.fieldId === 'urge' ? { ...a, optionIds: [], valueOwn: 'Stay in bed all day' }
    : a.fieldId === 'size' ? { ...a, optionIds: ['sadness:small'] } : a)) })));
  const w = writes(own)[0];
  assert.equal(w.params.urgeId, 'custom');
  assert.ok(w.params.dataJson.includes('"actionSize":"small"') && !w.params.dataJson.includes('Stay in bed'));
});

test('nothing is trusted beyond the ids: unsafe, no status, a word the graph refuses, a foreign urge, a non-opposite route', async () => {
  const none = async (run, respond) => { const tx = fakeTx(respond); await P.projectOppositeAction(tx, input(run)); return writes(tx).length; };
  const swap = (fieldId, ids, pick) => sadRun().answers.map((a) => (a.fieldId === fieldId && (pick === undefined || a.pick === pick) ? { ...a, optionIds: ids } : a));
  assert.equal(await none(sadRun({ answers: swap('safety', ['unsafe']) })), 0, 'unsafe never writes');
  assert.equal(await none(sadRun({ path: ['door', 'goal'] })), 0, 'a run that neither tried nor planned writes nothing');
  assert.equal(await none(sadRun(), (q) => (q === P.CHECK_PICK ? [] : undefined)), 0, 'a word Opposite Action does not work on is skipped');
  assert.equal(await none(sadRun(), (q) => (q === P.CHECK_PICK ? [{ parentId: 'sadness', urgeId: null, flow: FLOW }] : undefined)), 0,
    'an urge that is not its parent\'s is skipped');
  assert.equal(await none(sadRun({ answers: swap('help', ['helpful'], 'sad') })), 0, 'the graph\'s route must be opposite');
});

test('the repair rule: guilt that fits with the goal repair never becomes an opposite-action record', async () => {
  const guilt = sadRun({ answers: [
    ans('feel', ['guilty']), ans('goal', ['repair']), ans('safety', ['safe']),
    at('urge', 'guilty', ['guilt-hide']), at('fits', 'guilty', ['fits']), at('help', 'guilty', ['unhelpful']),
    at('size', 'guilty', ['guilt-hide:small']), ans('when', ['now']), ans('outcome', ['toward_goal']),
  ] });
  const tx = fakeTx((q, p) => (q === P.CHECK_PICK ? [{ parentId: 'guilt', urgeId: p.urgeId, flow: FLOW }] : undefined));
  await P.projectOppositeAction(tx, input(guilt));
  assert.equal(writes(tx).length, 0);
  assert.equal(P.repairRule('guilt', 'fits', 'repair'), true);
  assert.equal(P.repairRule('sadness', 'fits', 'repair'), false);
});

test('the inline check (ER-B5): its verdict stands in for *does it fit?* in the table; left early or unsafe records nothing', async () => {
  const FLOW2 = JSON.stringify({ routes: { 'unsure:unhelpful': 'clarify', 'not_fit:unhelpful': 'opposite', 'fits:unhelpful': 'opposite', 'excessive:unhelpful': 'opposite', 'excessive:helpful': 'problem' } });
  const withCheck = (ids, help = 'unhelpful') => sadRun({ answers: sadRun().answers.map((x) =>
    x.fieldId === 'fits' ? at('fits', 'sad', ['unsure']) : x.fieldId === 'help' ? at('help', 'sad', [help]) : x).concat([at('checked', 'sad', ids)]) });
  const runIt = async (run) => {
    const tx = fakeTx((q, params) => (q === P.CHECK_PICK ? [{ parentId: 'sadness', urgeId: params.urgeId, flow: FLOW2 }] : undefined));
    await P.projectOppositeAction(tx, input(run));
    return writes(tx).map((w) => JSON.parse(w.params.dataJson));
  };
  for (const v of ['fits', 'partly', 'doesnt_fit']) {
    const [d] = await runIt(withCheck(['finished', v]));
    assert.ok(d, `${v} on the opposite route is recorded`);
    assert.equal(d.factsChecked, v);
    assert.equal(d.facts, 'unsure', 'the answer as given stays');
  }
  assert.deepEqual(await runIt(withCheck(['finished', 'partly'], 'helpful')), [], 'partly + helpful is the table\'s problem route');
  assert.deepEqual(await runIt(withCheck(['left', 'doesnt_fit'])), [], 'a check left early never counts');
  assert.deepEqual(await runIt(withCheck(['finished', 'doesnt_fit', 'unsafe'])), [], 'unsafe told: nothing');
  assert.deepEqual(await runIt(withCheck(['finished', 'unsure'])), [], 'not sure stays clarify');
});

test('a reopened visit moves the first visit\'s records on, never writes new ones: tried → practiced, not → missed', async () => {
  const reopened = (tried, extra = []) => sadRun({ path: ['back', tried === 'yes' ? 'aft2' : 'miss'], answers: [...sadRun().answers.filter((a) => !['outcome', 'actual'].includes(a.fieldId)), ans('tried', [tried]), ...extra] });
  const first = [{ key: `u1:first-1`, dataJson: JSON.stringify({ schemaVersion: 3, status: 'planned', urgeId: 'sad-bed' }) }];
  const respond = (q) => (q === P.FIRST_RECORDS ? first : undefined);

  let tx = fakeTx(respond);
  await P.projectOppositeAction(tx, input(reopened('yes', [ans('outcome', ['partial'])])));
  assert.equal(writes(tx).length, 0);
  let move = tx.calls.find((c) => c.query === P.MOVE_ON);
  assert.equal(move.params.status, 'practiced');
  assert.equal(move.params.outcome, 'partial');
  assert.equal(JSON.parse(move.params.dataJson).urgeId, 'sad-bed', 'the first visit\'s data is kept');
  assert.match(P.FIRST_RECORDS, /RESOLVING\]->\(:FollowUp \{type: 'oa_try'\}\)/, 'only through the card that opened this visit');

  tx = fakeTx(respond);
  await P.projectOppositeAction(tx, input(reopened('forgot')));
  move = tx.calls.find((c) => c.query === P.MOVE_ON);
  assert.equal(move.params.status, 'missed');
  assert.equal(move.params.missedReason, 'forgot');
});

test('the rep: tried is off the phone, not tried none, the first visit keeps the close\'s own; oa_try belongs to the tool', () => {
  const ext = (answers) => JSON.stringify({ run: { skillId: 'opposite_action', answers } });
  assert.deepEqual(S.runRep(ext([ans('tried', ['yes'])]), 'opposite-action'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext([ans('tried', ['forgot'])]), 'opposite-action'), { noRep: true });
  assert.deepEqual(S.runRep(ext([ans('tried', ['chose_not'])]), 'opposite-action'), { noRep: true });
  assert.equal(S.runRep(ext([ans('when', ['now'])]), 'opposite-action'), null);
  assert.equal(S.PROJECTIONS['opposite-action'], P.projectOppositeAction);
  assert.equal(CA.FOLLOW_UP_SESSION_TOOL.oa_try, 'opposite-action');
  assert.ok(TS.OPEN_RESOLVES.includes('oa_try'));
});
