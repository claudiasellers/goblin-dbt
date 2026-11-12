'use strict';
/**
 * Say no on the skill player (IE-B3, docs/design/say-no.md): the run's projection (sayNo/projection.ts) into the
 * Interaction log, WITH the person, the safety recheck on *I'm scared of what they'd do*, the person read from the
 * first visit for a visit its no_outcome card reopened, and the off-phone rep.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const N = require(path.join(LIB, 'sayNo/projection.js'));
const D = require(path.join(LIB, 'dearMan/debriefProjection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const TS = require(path.join(LIB, 'spine/toolSession.js'));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PERSON = '7a2c9a0e-1b2c-4d5e-8f90-123456789abc';

const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const run = (answers, ctx = {}, extra = {}) => ({ skillId: 'say_no', versionId: 'say-no-v1', path: ['ask'], answers, ctx, ...extra });

/** A fake transaction: the responder's rows for each query (a safe person by default), every call kept. */
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
const input = (r) => ({ uid: 'u1', toolSessionId: TSID, toolId: 'say-no', run: r });
const writes = (tx) => tx.calls.filter((c) => c.query === N.INTERACTION_NO_WRITE);

test('fields: option ids only; own words become own and are never copied', () => {
  const f = N.noFields(run([
    ans('asking', 'favour'), ans('pressure', 'disappointed', 'push'), ans('predict', 'push'),
    { fieldId: 'said', optionIds: [], valueOwn: 'I told them over dinner' }, ans('held', 'yes'), ans('proud', 'sort_of'),
  ]));
  assert.deepEqual(f, {
    requestKind: 'favour', pressureIds: ['disappointed', 'push'], prediction: 'push', said: 'own', held: 'yes', proud: 'sort_of', scared: false,
  });
  assert.equal(JSON.stringify(f).includes('dinner'), false);
  assert.equal(N.noFields(run([ans('pressure', 'scared')])).scared, true);
  assert.equal(N.noFields(run([])).said, null);
});

test('the first visit (no said yet): nothing logged; a safe person is checked, never rechecked', async () => {
  const tx = fakeTx();
  await N.projectSayNo(tx, input(run([ans('asking', 'time'), ans('pressure', 'push')], { personId: PERSON })));
  assert.equal(writes(tx).length, 0);
  assert.equal(tx.calls.some((c) => c.query === D.SAFETY_RECHECK), false);
});

test("*I'm scared of what they'd do*: the person's safety answer goes stale, whatever else happens", async () => {
  const tx = fakeTx();
  await N.projectSayNo(tx, input(run([ans('asking', 'time'), ans('pressure', 'scared')], { personId: PERSON })));
  const re = tx.calls.filter((c) => c.query === D.SAFETY_RECHECK);
  assert.equal(re.length, 1);
  assert.equal(re[0].params.personKey, `u1:${PERSON}`);
});

test('the reopened visit: said answered → one Interaction, WITH the person the first visit named', async () => {
  const src = JSON.stringify({ run: run([ans('asking', 'favour')], { personId: PERSON }) });
  const tx = fakeTx((q) => (q === N.SOURCE_RUN_QUERY ? [{ ext: src }] : undefined));
  await N.projectSayNo(tx, input(run([ans('said', 'yes'), ans('held', 'no_push'), ans('proud', 'yes')], {})));
  assert.equal(tx.calls[0].query, N.SOURCE_RUN_QUERY);
  assert.equal(tx.calls[0].params.tsKey, `u1:${TSID}`);
  const w = writes(tx);
  assert.equal(w.length, 1);
  assert.equal(w[0].params.iKey, `u1:${TSID}`);
  assert.equal(w[0].params.personKey, `u1:${PERSON}`);
  assert.equal(w[0].params.said, 'yes');
  assert.equal(w[0].params.held, 'no_push');
  assert.equal(w[0].params.proud, 'yes');
  assert.match(N.INTERACTION_NO_WRITE, /i\.kind = 'no'/);
  assert.match(N.INTERACTION_NO_WRITE, /i:UserData:LogRecord/);
  assert.match(N.SOURCE_RUN_QUERY, /src\.ownerId = \$uid AND src\.toolId = 'say-no'/, "only the caller's own Say no session");
});

test('someone on the safety route is never linked; nobody, or a broken source run, logs without a person', async () => {
  const unsafe = fakeTx((q) => (q === D.PERSON_RISK_QUERY ? [{ v: JSON.stringify({ risk: 'harm' }) }] : undefined));
  await N.projectSayNo(unsafe, input(run([ans('said', 'yes')], { personId: PERSON })));
  assert.equal(writes(unsafe)[0].params.personKey, null);
  const none = fakeTx();
  await N.projectSayNo(none, input(run([ans('said', 'no')], { personId: 'none' })));
  assert.equal(writes(none)[0].params.personKey, null);
  const broken = fakeTx((q) => (q === N.SOURCE_RUN_QUERY ? [{ ext: '{not json' }] : undefined));
  await N.projectSayNo(broken, input(run([ans('said', 'partly')])));
  assert.equal(writes(broken)[0].params.personKey, null);
  const missing = fakeTx((q) => (q === D.PERSON_RISK_QUERY ? [] : undefined));
  await N.projectSayNo(missing, input(run([ans('said', 'yes')], { personId: PERSON })));
  assert.equal(writes(missing)[0].params.personKey, null, 'a person not the caller\'s is not linked');
});

test('another skill on the tool is left alone; the projection is registered under say-no', async () => {
  const tx = fakeTx();
  await N.projectSayNo(tx, input({ skillId: 'fast_review', answers: [ans('said', 'yes')] }));
  assert.equal(tx.calls.length, 0);
  assert.equal(S.PROJECTIONS['say-no'], N.projectSayNo);
});

test('the rep: said yes is off the phone, no or partly none; the first visit keeps the close\'s own', () => {
  const ext = (answers) => JSON.stringify({ run: run(answers) });
  assert.deepEqual(S.runRep(ext([ans('said', 'yes')]), 'say-no'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext([ans('said', 'no')]), 'say-no'), { noRep: true });
  assert.deepEqual(S.runRep(ext([ans('said', 'partly')]), 'say-no'), { noRep: true });
  assert.equal(S.runRep(ext([ans('asking', 'time')]), 'say-no'), null);
  assert.equal(S.runRep(ext([ans('said', 'yes')]), 'dear-man'), null, "only Say no's own tool");
});

test('the no_outcome card: only a Say no session books it, and opening it resolves it', () => {
  assert.equal(CA.FOLLOW_UP_SESSION_TOOL.no_outcome, 'say-no');
  assert.ok(TS.OPEN_RESOLVES.includes('no_outcome'));
});
