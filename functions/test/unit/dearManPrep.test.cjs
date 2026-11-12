'use strict';
/**
 * DEAR MAN's prep on the skill player (IE-01 Mode B, IE-B4; docs/design/dear-man-prep.md): the run's projection
 * (dearMan/prepProjection.ts) into the DearManSession {type: 'prep', mode: 'plan'} the debrief and History read,
 * WITH the person; option ids only, never own words; nothing until the plan reached its pocket card.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');

const LIB = path.resolve(__dirname, '../../lib');
const P = require(path.join(LIB, 'dearMan/prepProjection.js'));
const D = require(path.join(LIB, 'dearMan/debriefProjection.js'));
const O = require(path.join(LIB, 'dearMan/oneProjection.js'));
const S = require(path.join(LIB, 'skills/projections.js'));

const TSID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PERSON = '7a2c9a0e-1b2c-4d5e-8f90-123456789abc';

const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const PATH = ['situation', 'matters', 'hard', 'describe', 'express', 'assert', 'reinforce', 'mindful', 'phrase', 'confident', 'middle', 'walk', 'card', 'when'];
const run = (answers, ctx = {}, p = PATH) => ({ skillId: 'dear_man_prep', versionId: 'dm-prep-v1', path: p, answers, ctx });

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
const writes = (tx) => tx.calls.filter((c) => c.query === P.PREP_WRITE);
const PLAN = [
  ans('situation', 'address'), ans('matters', 'relationship'), { fieldId: 'hard', optionIds: ['barrier_guilt'], valueOwn: 'My sister always cries' },
  ans('describe', 'addr_broke_promise'), ans('express', 'feel_hurt', 'feel_sad'), ans('assert', 'addr_follow_through'),
  { fieldId: 'fill', optionIds: [], valueOwn: 'pick the kids up on Friday' }, ans('reinforce', 'reinf_trust'), ans('need', 'need_permission'),
  ans('phrase', 'anchor_allowed'), ans('confident', 'cue_feet'), ans('middle', 'neg_sometimes'), ans('walk', 'walk_later'),
  ans('card_how', 'seen_all', 'copied'),
];

test('fields: the old prep\'s names, option ids only; own words become own and are never copied', () => {
  const f = P.prepFields(run(PLAN));
  assert.equal(f.situationPicked, 'address');
  assert.equal(f.situationType, 'ask', 'a practical ask about something that happened is counted as practical');
  assert.deepEqual(f.priorities, ['relationship']);
  assert.deepEqual(f.barriers, ['barrier_guilt'], 'lists: ids only (History humanizes each)');
  assert.equal(P.prepFields(run([{ fieldId: 'walk', optionIds: [], valueOwn: 'x' }])).walkAwayId, 'own');
  assert.deepEqual([f.describeId, f.assertId, f.anchorNeedId, f.anchorId, f.confidenceCueId, f.middleGroundId, f.walkAwayId],
    ['addr_broke_promise', 'addr_follow_through', 'need_permission', 'anchor_allowed', 'cue_feet', 'neg_sometimes', 'walk_later']);
  assert.deepEqual(f.feelings, ['feel_hurt', 'feel_sad']);
  assert.equal(f.assertFilled, true, 'whether the blank was filled, never the words');
  assert.deepEqual(f.cardHow, ['seen_all', 'copied']);
  assert.equal(f.hotChoice, null);
  const s = JSON.stringify(f);
  assert.equal(s.includes('sister') || s.includes('Friday'), false);
  assert.equal(P.prepFields(run([ans('situation', 'nope')])).situationType, '', 'only the four situations');
});

test('refusals count by the ask, as One message does (Gate 1): heard → address / pattern, practical → ask', () => {
  const st = (sit, ask) => P.refusalSituation(sit, ask);
  assert.equal(st('ask', 'ask_just_listen'), 'address', 'an ask to be heard about something I need');
  assert.equal(st('pattern', 'patt_stay_in_it'), 'pattern');
  assert.equal(st('address', 'addr_follow_through'), 'ask');
  assert.equal(st('boundary', 'bound_stop_behavior'), 'boundary', 'a limit stays a limit (History labels it)');
  assert.equal(st('address', 'own'), 'address', 'own words: the situation picked');
  assert.equal(st('address', null), 'address');
  assert.deepEqual([...D.VALIDATION_SITUATIONS].sort(), ['address', 'pattern']);
  const fx = require(path.resolve(__dirname, '../../../tests/fixtures/skills-content.json'));
  const asks = fx.skills.find((k) => k.id === 'dear_man_prep').options.assert;
  assert.deepEqual(asks.filter((o) => o.heard).map((o) => o.value).sort(), [...P.HEARD_ASKS].sort(), 'the skill\'s asks to be heard are exactly these');
});

test('a plan that reached its card: one prep, WITH the person, keyed by the visit, found through DETAIL', async () => {
  const tx = fakeTx();
  await S.PROJECTIONS['dear-man'](tx, input(run(PLAN, { personId: PERSON })));
  const w = writes(tx);
  assert.equal(w.length, 1);
  assert.equal(w[0].params.sKey, `u1:${TSID}`);
  assert.equal(w[0].params.id, TSID);
  assert.equal(w[0].params.personKey, `u1:${PERSON}`);
  assert.equal(w[0].params.props.situationPicked, 'address');
  assert.match(P.PREP_WRITE, /s\.type = 'prep', s\.mode = 'plan'/);
  assert.match(P.PREP_WRITE, /MERGE \(ts\)-\[:DETAIL\]->\(s\)/, 'the debrief finds it through the ask_outcome card this visit booked');
  assert.match(P.PREP_WRITE, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_TOOL_SESSION\]->\(ts:ToolSession \{key: \$tsKey\}\)/, 'only the caller\'s own visit');
  assert.ok(!JSON.stringify(tx.calls.map((c) => c.params)).includes('sister'));
  assert.equal(tx.calls.some((c) => c.query === D.DEBRIEF_WRITE || c.query === O.ONE_PREP_WRITE), false, 'the other projections leave a prep alone');
});

test('not as far as the card: nothing written', async () => {
  const tx = fakeTx();
  await P.projectDearManPrep(tx, input(run(PLAN.slice(0, 4), { personId: PERSON }, ['situation', 'matters', 'hard', 'describe'])));
  assert.equal(tx.calls.length, 0);
  assert.equal(P.prepReachedCard({ path: 'card' }), false);
});

test('nobody, the safety route or a malformed id links no one; another skill\'s run is not a prep', async () => {
  const none = fakeTx();
  await P.projectDearManPrep(none, input(run(PLAN, { personId: 'none' })));
  assert.equal(none.calls.some((c) => c.query === D.PERSON_RISK_QUERY), false);
  assert.equal(writes(none)[0].params.personKey, null);
  for (const risk of ['harm', 'unstated']) {
    const unsafe = fakeTx((q) => (q === D.PERSON_RISK_QUERY ? [{ v: JSON.stringify({ risk }) }] : undefined));
    await P.projectDearManPrep(unsafe, input(run(PLAN, { personId: PERSON })));
    assert.equal(writes(unsafe)[0].params.personKey, null, risk);
  }
  const bad = fakeTx();
  await P.projectDearManPrep(bad, input(run(PLAN, { personId: 'not-a-uuid' })));
  assert.equal(writes(bad)[0].params.personKey, null);
  const other = fakeTx();
  await P.projectDearManPrep(other, input({ ...run(PLAN), skillId: 'dear_man_one' }));
  assert.equal(other.calls.length, 0);
});
