'use strict';
/**
 * DEAR MAN's debrief on the skill player (IE-B2, docs/design/dear-man-debrief.md): the run's projection into the
 * legacy DearManSession {type: 'debrief'}, the Interaction and the person's refusal counts
 * (dearMan/debriefProjection.ts), the off-phone rep, and the ask_outcome follow-up's wiring.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const P = require(path.join(LIB, 'dearMan/debriefProjection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));
const C = require(path.join(LIB, 'shared/crypto.js'));
const TS = require(path.join(LIB, 'spine/toolSession.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const MASTER = randomBytes(32);
C.setKeyProviderForTesting(C.secretKeyProvider(() => MASTER));
test.after(() => C.setKeyProviderForTesting(null));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PERSON = '7a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PREP = '9b2c9a0e-1b2c-4d5e-8f90-123456789abc';

const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const run = (answers, extra = {}) => ({ skillId: 'dear_man_debrief', versionId: 'dm-debrief-v1', path: ['feel'], answers, ...extra });

/** A fake transaction: the responder's rows for each query, and every call kept. */
function fakeTx(respond) {
  const keys = new Map();
  const calls = [];
  return {
    calls,
    run: async (query, params) => {
      calls.push({ query, params });
      if (query === C.READ_KEY_QUERY) return { records: [record({ w: keys.get(params.uid) ?? null })] };
      if (query === C.ENSURE_KEY_QUERY) { if (!keys.has(params.uid)) keys.set(params.uid, params.w); return { records: [record({ w: keys.get(params.uid) })] }; }
      return { records: (respond(query, params) ?? []).map(record) };
    },
  };
}

test('fields: the old debrief shape from the run; *look* is never a factor; not yet → didnt_have', () => {
  const f = P.debriefFields(run([
    ans('feel', 'drained', 'hurt'), ans('happened', 'yes'), ans('outcome', 'no'), ans('between', 'shaky'), ans('proud', 'sort_of'),
    ans('factor', 'look'), ans('moment', 'tp_defensive'), ans('response', 'mr_froze'), ans('body', 'bs_chest'),
    { fieldId: 'thought', optionIds: ['thought_not_worth'], valueOwn: 'they never listen' }, ans('underneath', 'under_hurt'),
    ans('landed', 'yes'), ans('cope', 'ca_pause_phrase'),
  ]));
  assert.equal(f.debriefOverall, 'not_well');
  assert.equal(f.outcome, 'no');
  assert.equal(f.factorId, null, 'look first is a way in, not a factor');
  assert.deepEqual(f.debriefCurrentFeelings, ['drained', 'hurt']);
  assert.deepEqual(f.turningPointIds, ['tp_defensive']);
  assert.deepEqual(f.momentResponseIds, ['mr_froze']);
  assert.equal(f.copeAheadId, 'ca_pause_phrase');
  assert.equal(f.reflectionLanded, 'yes');
  assert.equal(f.thoughtOwn, 'they never listen');
  const notYet = P.debriefFields(run([ans('feel', 'okay'), ans('happened', 'not_yet'), ans('outcome', 'got_it')]));
  assert.equal(notYet.debriefOverall, 'didnt_have');
  assert.equal(notYet.outcome, null, 'an outcome only when it happened');
  for (const [o, overall] of Object.entries({ got_it: 'better', partly: 'mixed', no: 'not_well', no_answer: 'not_well' })) {
    assert.equal(P.debriefFields(run([ans('happened', 'yes'), ans('outcome', o)])).debriefOverall, overall, o);
  }
});

test('refusals: a refused ask adds one to its kind; landing resets it; no prep, nothing', () => {
  assert.deepEqual(P.refusalChange('address', 'no'), { field: 'refusalsValidation', op: 'add' });
  assert.equal(P.refusalChange('pattern', 'no_answer'), null, 'no answer yet is not a refusal');
  assert.deepEqual(P.refusalChange('pattern', 'partly'), { field: 'refusalsValidation', op: 'reset' });
  assert.deepEqual(P.refusalChange('ask', 'no'), { field: 'refusalsPractical', op: 'add' });
  assert.deepEqual(P.refusalChange('boundary', 'got_it'), { field: 'refusalsPractical', op: 'reset' });
  assert.equal(P.refusalChange(null, 'no'), null);
  assert.equal(P.refusalChange('', 'no'), null);
  assert.equal(P.refusalChange('address', null), null);
  assert.equal(P.refusalChange('something_else', 'no'), null);
  assert.match(P.refusalWrite('refusalsValidation', 'add'), /SET p\.refusalsValidation = coalesce\(p\.refusalsValidation, 0\) \+ 1$/);
  assert.match(P.refusalWrite('refusalsPractical', 'reset'), /SET p\.refusalsPractical = 0$/);
  assert.match(P.refusalWrite('refusalsValidation', 'add'), /\(:User \{id: \$uid\}\)-\[:HAS_PERSON\]->\(p:Person \{key: \$personKey\}\)/, "the caller's own person only");
});

test('projection: the debrief, the Interaction WITH the person, then one refusal; own words encrypted', async () => {
  const tx = fakeTx((q) => {
    if (q === P.DEBRIEF_PREP_QUERY) return [{ prepId: PREP, situationType: 'address', personId: PERSON }];
    if (q === P.DEBRIEF_WRITE) return [{ id: TSID }];
    if (q === P.INTERACTION_WRITE) return [{ created: true, withPerson: true }];
    return [];
  });
  await S.PROJECTIONS['dear-man'](tx, {
    uid: 'u1', toolSessionId: TSID, toolId: 'dear-man',
    run: run([ans('happened', 'yes'), ans('outcome', 'no'), ans('between', 'yes'), ans('proud', 'yes'), ans('factor', 'belief'),
      { fieldId: 'thought', optionIds: ['thought_something_else'], valueOwn: 'my own words here' }], { ctx: { personId: PERSON } }),
  });
  const q = (x) => tx.calls.filter((c) => c.query === x);
  assert.equal(q(P.DEBRIEF_PREP_QUERY)[0].params.personId, PERSON);
  const w = q(P.DEBRIEF_WRITE)[0].params;
  assert.equal(w.sKey, `u1:${TSID}`, 'one debrief per visit, keyed by the ToolSession');
  assert.equal(w.personKey, `u1:${PERSON}`);
  assert.equal(w.prepKey, `u1:${PREP}`);
  assert.equal(w.props.situationType, 'address');
  assert.equal(w.props.factorId, 'belief');
  assert.notEqual(w.props.thoughtOwn, 'my own words here', 'own words never stored as plaintext');
  assert.ok(C.isEncrypted(w.props.thoughtOwn));
  assert.ok(!JSON.stringify(tx.calls.map((c) => c.params)).includes('my own words here'));
  const i = q(P.INTERACTION_WRITE)[0].params;
  assert.deepEqual([i.outcome, i.situationType, i.relationshipOk, i.selfRespect, i.factorId], ['no', 'address', 'yes', 'yes', 'belief']);
  const counted = tx.calls.filter((c) => /SET p\.refusals/.test(c.query));
  assert.equal(counted.length, 1);
  assert.match(counted[0].query, /refusalsValidation = coalesce/);
  assert.deepEqual(counted[0].params, { uid: 'u1', personKey: `u1:${PERSON}` });
});

test('projection: a re-close never counts twice; no person, no count; not yet, no Interaction; other runs, nothing', async () => {
  const again = fakeTx((q) => (q === P.DEBRIEF_PREP_QUERY ? [{ prepId: PREP, situationType: 'pattern', personId: PERSON }]
    : q === P.INTERACTION_WRITE ? [{ created: false, withPerson: true }] : []));
  await P.projectDearManDebrief(again, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: run([ans('happened', 'yes'), ans('outcome', 'no')]) });
  assert.equal(again.calls.filter((c) => /SET p\.refusals/.test(c.query)).length, 0);

  const nobody = fakeTx((q) => (q === P.DEBRIEF_PREP_QUERY ? [{ prepId: null, situationType: null, personId: null }]
    : q === P.INTERACTION_WRITE ? [{ created: true, withPerson: false }] : []));
  await P.projectDearManDebrief(nobody, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: run([ans('happened', 'yes'), ans('outcome', 'no')]) });
  assert.equal(nobody.calls.find((c) => c.query === P.DEBRIEF_WRITE).params.personKey, null);
  assert.equal(nobody.calls.filter((c) => /SET p\.refusals/.test(c.query)).length, 0);

  const notYet = fakeTx((q) => (q === P.DEBRIEF_PREP_QUERY ? [{ prepId: null, situationType: null, personId: null }] : []));
  await P.projectDearManDebrief(notYet, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: run([ans('happened', 'not_yet')]) });
  assert.ok(notYet.calls.some((c) => c.query === P.DEBRIEF_WRITE), 'the debrief is still recorded');
  assert.ok(!notYet.calls.some((c) => c.query === P.INTERACTION_WRITE));

  const prep = fakeTx(() => []);
  await P.projectDearManDebrief(prep, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: { skillId: 'something_else', answers: [ans('happened', 'yes')] } });
  await P.projectDearManDebrief(prep, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: run([ans('feel', 'okay')]) });
  assert.equal(prep.calls.length, 0, 'another skill, or a run that never said whether it happened: nothing');

  const badId = fakeTx((q) => (q === P.DEBRIEF_PREP_QUERY ? [{ prepId: null, situationType: null, personId: null }] : []));
  await P.projectDearManDebrief(badId, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: run([ans('happened', 'decided_not')], { ctx: { personId: "x' OR 1=1" } }) });
  assert.equal(badId.calls[0].params.personId, null, 'only a uuid is a person id');
});

test("queries: only the caller's own records; the prep via the ask_outcome card, else the person's latest in 14 days", () => {
  assert.match(P.DEBRIEF_PREP_QUERY, /\(ts\)-\[:RESOLVING\]->\(:FollowUp \{type: 'ask_outcome'\}\)<-\[:SCHEDULED\]-\(:ToolSession\)-\[:DETAIL\]->\(viaCard:DearManSession \{type: 'prep'\}\)/);
  assert.match(P.DEBRIEF_PREP_QUERY, /WHERE viaCard\.ownerId = \$uid/);
  assert.match(P.DEBRIEF_PREP_QUERY, /\(u\)-\[:COMPLETED_SESSION\]->\(recent:DearManSession \{type: 'prep'\}\)/);
  assert.match(P.DEBRIEF_PREP_QUERY, /duration\(\{days: 14\}\)/);
  assert.match(P.DEBRIEF_WRITE, /MERGE \(s:DearManSession \{key: \$sKey\}\)/);
  assert.match(P.DEBRIEF_WRITE, /MERGE \(ts\)-\[:DETAIL\]->\(s\)/);
  assert.match(P.DEBRIEF_WRITE, /\(u\)-\[:HAS_PERSON\]->\(p:Person \{key: \$personKey\}\)/);
  assert.match(P.DEBRIEF_WRITE, /MERGE \(s\)-\[:DEBRIEFS\]->\(x\)/);
  assert.match(P.INTERACTION_WRITE, /MERGE \(i:Interaction \{key: \$iKey\}\)/);
  assert.match(P.INTERACTION_WRITE, /ON CREATE SET i:UserData:LogRecord/);
  assert.match(P.INTERACTION_WRITE, /MERGE \(u\)-\[:HAS_INTERACTION\]->\(i\)/);
  assert.match(P.INTERACTION_WRITE, /MERGE \(i\)-\[:WITH\]->\(x\)/);
  for (const q of [P.DEBRIEF_PREP_QUERY, P.DEBRIEF_WRITE, P.INTERACTION_WRITE]) assert.doesNotMatch(q, /thoughtOwn/, 'own words never in a query');
});

test("unsafe with them: the person's safety answer goes stale (asked again next time); nothing else about it changes", async () => {
  const tx = fakeTx((q) => (q === P.DEBRIEF_PREP_QUERY ? [{ prepId: null, situationType: null, personId: null }]
    : q === P.INTERACTION_WRITE ? [{ created: true, withPerson: true }] : []));
  await P.projectDearManDebrief(tx, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man',
    run: run([ans('happened', 'yes'), ans('outcome', 'no'), ans('between', 'unsafe')], { ctx: { personId: PERSON } }) });
  const re = tx.calls.filter((c) => c.query === P.SAFETY_RECHECK);
  assert.equal(re.length, 1);
  assert.deepEqual(re[0].params, { uid: 'u1', personKey: `u1:${PERSON}` });
  assert.doesNotMatch(P.SAFETY_RECHECK, /valueJson|risk/);
  const safe = fakeTx((q) => (q === P.DEBRIEF_PREP_QUERY ? [{ prepId: null, situationType: null, personId: null }] : []));
  await P.projectDearManDebrief(safe, { uid: 'u1', toolSessionId: TSID, toolId: 'dear-man',
    run: run([ans('happened', 'yes'), ans('outcome', 'no'), ans('between', 'shaky')], { ctx: { personId: PERSON } }) });
  assert.ok(!safe.calls.some((c) => c.query === P.SAFETY_RECHECK));
});

test('rep: a debrief that happened is a self-reported off-phone rep; one that did not, none; other runs keep their own', () => {
  const ext = (answers, skillId = 'dear_man_debrief') => JSON.stringify({ run: { skillId, answers } });
  assert.deepEqual(S.runRep(ext([ans('happened', 'yes')])), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext([ans('happened', 'not_yet')])), { noRep: true });
  assert.deepEqual(S.runRep(ext([])), { noRep: true });
  assert.equal(S.runRep(ext([ans('happened', 'yes')], 'check_the_facts')), null);
  assert.equal(S.runRep(null), null);
  assert.equal(S.runRep('not json'), null);
  assert.equal(S.runRep(JSON.stringify({ er: {} })), null);
});

test('ask_outcome: opening it resolves it, and only a DEAR MAN visit schedules one', () => {
  assert.ok(TS.OPEN_RESOLVES.includes('ask_outcome'));
  assert.equal(CA.FOLLOW_UP_SESSION_TOOL.ask_outcome, 'dear-man');
});
