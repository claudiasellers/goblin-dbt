'use strict';
/**
 * One message on the skill player (IE-01 Mode A, IE-B3; docs/design/one-message.md): the run's projection
 * (dearMan/oneProjection.ts) into the DearManSession {type: 'prep', mode: 'one_message'} the debrief reads, WITH the
 * person; the person read from the first visit for a visit its ask_delayed card reopened; never the message's words.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const O = require(path.join(LIB, 'dearMan/oneProjection.js'));
const D = require(path.join(LIB, 'dearMan/debriefProjection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));
const CA = require(path.join(LIB, 'spine/copeAheadAfter.js'));
const TS = require(path.join(LIB, 'spine/toolSession.js'));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PERSON = '7a2c9a0e-1b2c-4d5e-8f90-123456789abc';

const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const run = (answers, ctx = {}) => ({ skillId: 'dear_man_one', versionId: 'dm-one-v1', path: ['source'], answers, ctx });

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
const input = (r) => ({ uid: 'u1', toolSessionId: TSID, toolId: 'dear-man', run: r });
const writes = (tx) => tx.calls.filter((c) => c.query === O.ONE_PREP_WRITE);
const SENT = [
  ans('source', 'hot'), ans('about', 'address'), { fieldId: 'fact', optionIds: [], valueOwn: 'You missed my birthday dinner' },
  ans('felt', 'let_down'), ans('ask', 'a_hear_me'), ans('cool', 'aloud'), ans('predict', 'mixed'), ans('sure', 'think_so'),
  ans('sent_how', 'copied', 'dropped_sorry'),
];

test('fields: option ids only; own words become own and are never copied', () => {
  const f = O.oneFields(run(SENT));
  assert.equal(f.situationType, 'address');
  assert.equal(f.factId, 'own');
  assert.deepEqual([f.feelingId, f.assertId, f.coolId, f.prediction, f.predictionConfidence], ['let_down', 'a_hear_me', 'aloud', 'mixed', 'think_so']);
  assert.deepEqual(f.sentHow, ['copied', 'dropped_sorry']);
  assert.equal(JSON.stringify(f).includes('birthday'), false);
  assert.equal(O.oneFields(run([ans('about', 'boundary')])).situationType, null, 'only the situations the debrief counts');
});

test('refusals count by the ask, not by what it was about (Gate 1): heard → address/pattern, practical → ask', () => {
  const st = (...xs) => O.oneFields(run(xs)).situationType;
  assert.equal(st(ans('about', 'address'), ans('ask', 'a_follow_through')), 'ask', 'a practical ask about something that happened');
  assert.equal(st(ans('about', 'ask'), ans('ask', 'a_support')), 'address', 'an ask to be heard about something I need');
  assert.equal(st(ans('about', 'pattern'), ans('ask', 'a_hear_me')), 'pattern');
  assert.equal(st(ans('about', 'pattern'), { fieldId: 'ask', optionIds: [], valueOwn: 'x' }), 'pattern', 'own words: what it was about');
  assert.equal(O.oneFields(run([ans('about', 'address'), ans('ask', 'a_help')])).aboutId, 'address');
  assert.deepEqual([...D.VALIDATION_SITUATIONS].sort(), ['address', 'pattern']);
  // The skill's asks to be heard are exactly these.
  const fx = require(path.resolve(__dirname, '../../../tests/fixtures/skills-content.json'));
  const asks = fx.skills.find((k) => k.id === 'dear_man_one').options.ask;
  assert.deepEqual(asks.filter((o) => o.validation).map((o) => o.value).sort(), [...O.VALIDATION_ASKS].sort());
});

test('a message that reached the prediction: one prep, WITH the person, keyed by the visit', async () => {
  const tx = fakeTx();
  await S.PROJECTIONS['dear-man'](tx, input(run(SENT, { personId: PERSON })));
  const w = writes(tx);
  assert.equal(w.length, 1);
  assert.equal(w[0].params.sKey, `u1:${TSID}`);
  assert.equal(w[0].params.personKey, `u1:${PERSON}`);
  assert.equal(w[0].params.props.situationType, 'address');
  assert.match(O.ONE_PREP_WRITE, /s\.type = 'prep', s\.mode = 'one_message'/);
  assert.match(O.ONE_PREP_WRITE, /MERGE \(ts\)-\[:DETAIL\]->\(s\)/, 'the debrief finds it through the card this visit booked');
  assert.match(D.DEBRIEF_PREP_QUERY, /\(:ToolSession\)-\[:DETAIL\]->\(viaCard:DearManSession \{type: 'prep'\}\)/);
  assert.ok(!JSON.stringify(tx.calls.map((c) => c.params)).includes('birthday'));
  assert.equal(tx.calls.some((c) => c.query === D.DEBRIEF_WRITE), false, "the debrief's projection leaves a One message run alone");
});

test('not as far as the prediction (saved for later, dropped): nothing written', async () => {
  const tx = fakeTx();
  await O.projectDearManOne(tx, input(run([ans('source', 'hot'), ans('cool', 'later')], { personId: PERSON })));
  assert.equal(tx.calls.length, 0);
});

test('the reopened visit: the person the first visit named; nobody, the safety route or a broken run links no one', async () => {
  const src = JSON.stringify({ run: run([ans('ask', 'a_help')], { personId: PERSON }) });
  const tx = fakeTx((q) => (q === O.ONE_SOURCE_RUN_QUERY ? [{ ext: src }] : undefined));
  await O.projectDearManOne(tx, input(run(SENT, {})));
  assert.equal(tx.calls[0].query, O.ONE_SOURCE_RUN_QUERY);
  assert.equal(writes(tx)[0].params.personKey, `u1:${PERSON}`);
  assert.match(O.ONE_SOURCE_RUN_QUERY, /\{type: 'ask_delayed'\}/);
  assert.match(O.ONE_SOURCE_RUN_QUERY, /src\.ownerId = \$uid AND src\.toolId = 'dear-man'/);
  const none = fakeTx();
  await O.projectDearManOne(none, input(run(SENT, { personId: 'none' })));
  assert.equal(none.calls.some((c) => c.query === O.ONE_SOURCE_RUN_QUERY), false, 'nobody kept: never the first visit\'s person');
  assert.equal(writes(none)[0].params.personKey, null);
  const unsafe = fakeTx((q) => (q === D.PERSON_RISK_QUERY ? [{ v: JSON.stringify({ risk: 'harm' }) }] : undefined));
  await O.projectDearManOne(unsafe, input(run(SENT, { personId: PERSON })));
  assert.equal(writes(unsafe)[0].params.personKey, null);
  const broken = fakeTx((q) => (q === O.ONE_SOURCE_RUN_QUERY ? [{ ext: '{nope' }] : undefined));
  await O.projectDearManOne(broken, input(run(SENT)));
  assert.equal(writes(broken)[0].params.personKey, null);
});

test('the debrief run is still the debrief projection\'s; ask_delayed is DEAR MAN\'s and resolves on open', async () => {
  const tx = fakeTx();
  await O.projectDearManOne(tx, input({ skillId: 'dear_man_debrief', answers: [ans('predict', 'well')] }));
  assert.equal(tx.calls.length, 0);
  assert.equal(CA.FOLLOW_UP_SESSION_TOOL.ask_delayed, 'dear-man');
  assert.ok(TS.OPEN_RESOLVES.includes('ask_delayed'));
});
