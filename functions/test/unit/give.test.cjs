'use strict';
/**
 * Keep it warm on the skill player (IE-B4, docs/design/give.md): the run's projection (give/projection.ts) into the
 * Interaction log (`repair` or `break_return`), WITH the person, the safety recheck on *Did anyone get hurt, or are
 * you scared of them now?*, the person read from the first visit for a visit one of its cards reopened, and the rep.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const G = require(path.join(LIB, 'give/projection.js'));
const D = require(path.join(LIB, 'dearMan/debriefProjection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const TS = require(path.join(LIB, 'spine/toolSession.js'));
const TOOLS = require(path.join(LIB, 'spine/tools.js'));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PERSON = '7a2c9a0e-1b2c-4d5e-8f90-123456789abc';

const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const run = (answers, ctx = {}) => ({ skillId: 'give', versionId: 'give-v1', path: ['situation'], answers, ctx });

function fakeTx(respond = () => undefined) {
  const calls = [];
  return {
    calls,
    run: async (query, params) => {
      calls.push({ query, params });
      const rows = respond(query, params);
      if (rows === undefined && query === D.PERSON_RISK_QUERY) return { records: [record({ v: JSON.stringify({ risk: 'none' }) })] };
      return { records: (rows ?? []).map(record) };
    },
  };
}
const input = (r) => ({ uid: 'u1', toolSessionId: TSID, toolId: 'give', run: r });
const writes = (tx) => tx.calls.filter((c) => c.query === G.INTERACTION_GIVE_WRITE);

test('fields: option ids only; the kind comes from which afterwards was answered', () => {
  assert.deepEqual(G.giveFields(run([ans('situation', 'repair'), ans('guilt', 'partly'), ans('repaired', 'yes'), ans('between', 'shaky')])),
    { kind: 'repair', outcome: 'yes', between: 'shaky', guilt: 'partly', hurt: false });
  assert.deepEqual(G.giveFields(run([ans('situation', 'heated'), ans('back', 'yes'), ans('still_ok', 'yes')])),
    { kind: 'break_return', outcome: 'yes', between: 'yes', guilt: null, hurt: false });
  const own = G.giveFields(run([ans('repaired', 'yes'), { fieldId: 'ack', optionIds: [], valueOwn: 'I was cruel about her mum' }]));
  assert.equal(JSON.stringify(own).includes('mum'), false, 'own words never reach the Interaction');
  assert.equal(G.giveFields(run([ans('situation', 'brought')])).kind, null);
  for (const v of ['physical', 'scared']) assert.equal(G.giveFields(run([ans('fight', v)])).hurt, true, v);
  assert.equal(G.giveFields(run([ans('fight', 'no')])).hurt, false);
  assert.equal(G.giveFields(run([ans('brought', 'angry'), ans('angry_ok', 'scared')])).hurt, true);
  for (const r of [[ans('back', 'unsafe')], [ans('back', 'yes'), ans('still_ok', 'unsafe')], [ans('repaired', 'yes'), ans('between', 'unsafe')], [ans('repaired', 'unsafe')], [ans('situation', 'heated'), ans('not_safe', 'unsafe')]]) {
    const f = G.giveFields(run(r));
    assert.deepEqual([f.hurt, f.kind, f.outcome], [true, null, null], 'not safe with them: nothing logged');
  }
});

test('a first visit writes nothing (no afterwards yet, nobody hurt)', async () => {
  const tx = fakeTx();
  await G.projectGive(tx, input(run([ans('situation', 'repair'), ans('fight', 'no'), ans('guilt', 'mine')], { personId: PERSON })));
  assert.equal(tx.calls.length, 0);
});

test('hurt, or scared of them: the person\'s safety answer goes stale, and nothing is logged', async () => {
  const tx = fakeTx();
  await G.projectGive(tx, input(run([ans('situation', 'repair'), ans('fight', 'scared')], { personId: PERSON })));
  const re = tx.calls.filter((c) => c.query === D.SAFETY_RECHECK);
  assert.equal(re.length, 1);
  assert.equal(re[0].params.personKey, `u1:${PERSON}`);
  assert.equal(writes(tx).length, 0);
});

test('the reopened visit: one Interaction, WITH the person the first visit named', async () => {
  const src = JSON.stringify({ run: run([ans('situation', 'heated')], { personId: PERSON }) });
  const tx = fakeTx((q) => (q === G.SOURCE_RUN_QUERY ? [{ ext: src }] : undefined));
  await G.projectGive(tx, input(run([ans('back', 'yes'), ans('still_ok', 'shaky')])));
  assert.equal(tx.calls[0].query, G.SOURCE_RUN_QUERY);
  const w = writes(tx);
  assert.equal(w.length, 1);
  assert.deepEqual([w[0].params.kind, w[0].params.outcome, w[0].params.between, w[0].params.personKey], ['break_return', 'yes', 'shaky', `u1:${PERSON}`]);
  assert.match(G.INTERACTION_GIVE_WRITE, /i:UserData:LogRecord/);
  assert.match(G.SOURCE_RUN_QUERY, /src\.ownerId = \$uid AND src\.toolId = 'give'/, "only the caller's own Keep it warm session");
  assert.match(G.SOURCE_RUN_QUERY, /f\.type IN \['break_return', 'repair_outcome'\]/);
});

test('a reopened visit that carries its person reads no source run; the safety route is never linked', async () => {
  const tx = fakeTx();
  await G.projectGive(tx, input(run([ans('repaired', 'wait')], { personId: PERSON })));
  assert.equal(tx.calls.some((c) => c.query === G.SOURCE_RUN_QUERY), false);
  assert.equal(writes(tx)[0].params.kind, 'repair');
  const unsafe = fakeTx((q) => (q === D.PERSON_RISK_QUERY ? [{ v: JSON.stringify({ risk: 'harm' }) }] : undefined));
  await G.projectGive(unsafe, input(run([ans('repaired', 'yes')], { personId: PERSON })));
  assert.equal(writes(unsafe)[0].params.personKey, null);
  const broken = fakeTx((q) => (q === G.SOURCE_RUN_QUERY ? [{ ext: '{not json' }] : undefined));
  await G.projectGive(broken, input(run([ans('back', 'not_yet')])));
  assert.equal(writes(broken)[0].params.personKey, null);
});

test('a card\'s visit that says it isn\'t safe: the first visit\'s person goes stale, and nothing is logged', async () => {
  const src = JSON.stringify({ run: run([ans('situation', 'heated')], { personId: PERSON }) });
  const tx = fakeTx((q) => (q === G.SOURCE_RUN_QUERY ? [{ ext: src }] : undefined));
  await G.projectGive(tx, input(run([ans('back', 'unsafe')])));
  const re = tx.calls.filter((c) => c.query === D.SAFETY_RECHECK);
  assert.equal(re.length, 1);
  assert.equal(re[0].params.personKey, `u1:${PERSON}`);
  assert.equal(writes(tx).length, 0);
});

test('another skill is left alone; registered under give; no close question', async () => {
  const tx = fakeTx();
  await G.projectGive(tx, input({ skillId: 'say_no', answers: [ans('repaired', 'yes')] }));
  assert.equal(tx.calls.length, 0);
  assert.equal(S.PROJECTIONS.give, G.projectGive);
  assert.deepEqual(TOOLS.SPINE_TOOLS.give, { module: 'ie', closeKind: 'none' });
});

test('the rep: either afterwards answered yes is off the phone, anything else none; the first visit keeps its own', () => {
  const ext = (answers) => JSON.stringify({ run: run(answers) });
  assert.deepEqual(S.runRep(ext([ans('repaired', 'yes')]), 'give'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext([ans('back', 'yes')]), 'give'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext([ans('back', 'not_yet')]), 'give'), { noRep: true });
  assert.deepEqual(S.runRep(ext([ans('repaired', 'wait')]), 'give'), { noRep: true });
  assert.equal(S.runRep(ext([ans('situation', 'brought')]), 'give'), null);
  assert.equal(S.runRep(ext([ans('back', 'yes')]), 'say-no'), null, "only Keep it warm's own tool");
});

test('the two cards: only a Keep it warm session books them, and opening one resolves it', () => {
  for (const t of G.GIVE_CARDS) {
    assert.equal(CA.FOLLOW_UP_SESSION_TOOL[t], 'give');
    assert.ok(TS.OPEN_RESOLVES.includes(t));
  }
});
