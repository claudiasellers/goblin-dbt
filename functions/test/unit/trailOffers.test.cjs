'use strict';
/**
 * Trail offers (Phase 4, built off): the TrailOffer record, what answers block, the offer gate, Today's
 * source and prepare step, getTrailOfferEvidence, answerTrailOffer, the offer trailhead in Meet a part
 * (keepPart's ACCEPTED_FROM), the shared weekly budget with what_helps, and deleting.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver, record } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const B = require('../../lib/parts/offers/blocked');
const R = require('../../lib/parts/offers/record');
const G = require('../../lib/parts/offers/gate');
const Q = require('../../lib/parts/offers/queries');
const TD = require('../../lib/parts/offers/today');
const A = require('../../lib/parts/offers/answer');
const TY = require('../../lib/parts/offers/types');
const K = require('../../lib/parts/keep');
const SQ = require('../../lib/parts/sessionQueries');
const T = require('../../lib/parts/tag');
const { HARM_ROWS_QUERY } = require('../../lib/parts/harmRows');
const { GUARDS, writable } = require('../../lib/userdata/lifecycle');
const { USER_DATA } = require('../../lib/userdata/layers');
const { PARTS_LABELS } = require('../../lib/parts/delete');
const offers = require('../../lib/profile/patternOffers');
const { OFFER_EVERY_DAYS, offerBudgetSpent } = require('../../lib/profile/offerBudget');
const { orderToday } = require('../../lib/spine/todayOrder');

const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;
const H = 3_600_000;
const DAY = 24 * H;
const NOW = new Date('2026-10-16T12:00:00Z');
const ago = (h) => new Date(NOW.getTime() - h * H).toISOString();
const SID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const PID = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const C1 = '6c2c9a0e-1b2c-4d5e-8f90-123456789abc';
const C2 = '7d2c9a0e-1b2c-4d5e-8f90-123456789abc';

const trail = (o = {}) => ({
  ruleId: 'trail_two_pulls', shape: 'C', moveIds: ['hide', 'chase'], contextId: 'ctx_event_leaving', pairId: 'chase_hide', partId: null,
  evidence: [
    { at: ago(200), toolIds: ['find-the-feeling'], recordKeys: ['u1:r2', 'u1:r1'], moveIds: ['hide'], contextIds: ['ctx_event_leaving'] },
    { at: ago(100), toolIds: ['recovering-from-invalidation'], recordKeys: ['u1:r3'], moveIds: ['chase'], contextIds: ['ctx_trigger_someone', 'ctx_event_leaving'] },
  ],
  strength: { episodes: 2, spanDays: 4, tools: 2, share: null, lift: null },
  ...o,
});
const OID = 'trail_two_pulls:chase+hide:ctx_event_leaving';

// ------------------------------------------------------------------ the record

test('TrailOffer: a registered log record, exported, deleted with parts; constraint by key', () => {
  assert.deepEqual(USER_DATA.TrailOffer, { layer: 'log', rel: 'HAS_TRAIL_OFFER', exportAs: 'trailOffers' });
  assert.ok(PARTS_LABELS.includes('TrailOffer'), 'deleteMyParts removes TrailOffers');
  const ddl = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../../schema/constraints.cypher'), 'utf8');
  assert.match(ddl, /^CREATE CONSTRAINT trail_offer_key IF NOT EXISTS FOR \(n:TrailOffer\) REQUIRE n\.key IS UNIQUE;$/m);
});

test('the id: rule, sorted moves, context (or none), and for D the part; the same trail is the same id', () => {
  assert.equal(B.trailOfferId(trail()), OID);
  assert.equal(B.trailOfferId(trail({ moveIds: ['chase', 'hide'] })), OID, 'order does not matter');
  assert.equal(B.trailOfferId(trail({ ruleId: 'trail_sequence', shape: 'B', contextId: null })), 'trail_sequence:chase+hide:none');
  assert.equal(B.trailOfferId(trail({ ruleId: 'trail_known_part', shape: 'D', contextId: null, partId: PID, moveIds: ['go_blank'] })),
    `trail_known_part:go_blank:none:${PID}`);
  for (const id of [OID, 'trail_sequence:chase+hide:none', `trail_known_part:go_blank:none:${PID}`]) assert.match(id, B.TRAIL_OFFER_ID);
  for (const id of ['DROP', 'a:b', 'A:b:c', 'a:b:c:not-a-uuid!']) assert.doesNotMatch(id, B.TRAIL_OFFER_ID);
});

test('writeTrailOffer: params (sorted moves, statement order, keys), create once, parts on, edges out of the offer only', async () => {
  const p = R.trailOfferParams('u1', trail());
  assert.equal(p.id, OID);
  assert.equal(p.key, `u1:${OID}`);
  assert.deepEqual(p.moveIds, ['chase', 'hide']);
  assert.deepEqual(p.pullIds, ['hide', 'chase'], 'the statement keeps the candidate\'s order');
  assert.deepEqual(p.evidenceKeys, ['u1:r1', 'u1:r2', 'u1:r3']);
  assert.equal(p.partKey, null);
  assert.deepEqual(JSON.parse(p.evidenceJson)[1].contextIds, ['ctx_trigger_someone', 'ctx_event_leaving']);
  assert.doesNotMatch(p.evidenceJson, /"(label|text|own\w*)"/, 'ids only');
  assert.equal(R.trailOfferParams('u1', trail({ shape: 'D', partId: PID })).partKey, `u1:${PID}`);

  const q = R.WRITE_TRAIL_OFFER_QUERY;
  assert.match(q, /WHERE coalesce\(u\.partsEnabled, false\)\s+AND NOT EXISTS \{ MATCH \(:TrailOffer \{key: \$key\}\) \}/, 'an existing offer is never touched');
  assert.match(q, /MERGE \(o:TrailOffer \{key: \$key\}\)\s+ON CREATE SET o:UserData:LogRecord, o\.id = \$id, o\.ownerId = \$uid/);
  assert.match(q, /o\.status = 'offered', o\.offeredAt = datetime\(\)/);
  assert.match(q, /OPTIONAL MATCH \(r:LogRecord \{ownerId: \$uid\}\) WHERE r\.key IN \$evidenceKeys/, 'only the caller\'s records');
  assert.match(q, /MERGE \(o\)-\[:EVIDENCE\]->\(x\)/);
  assert.match(q, /MERGE \(o\)-\[:ABOUT_PART\]->\(x\)/);
  assert.match(q, /OPTIONAL MATCH \(u\)-\[:HAS_PART\]->\(pt:Part \{key: \$partKey\}\)\s+WITH u, pt WHERE \$partKey IS NULL OR pt IS NOT NULL/);
  assert.doesNotMatch(q, /\(r\)-\[|\(x\)-\[|SET (r|x|pt)\./, 'nothing out of or onto the records or the part');

  const f = fakeDriver((query) => (query === q ? [{ id: OID }] : []));
  setDriver(f.driver);
  const { writeTx } = require('../../lib/shared/neo4j');
  assert.equal(await writeTx((tx) => R.writeTrailOffer(tx, 'u1', trail())), OID);
  setDriver(fakeDriver(() => []).driver);
  assert.equal(await writeTx((tx) => R.writeTrailOffer(tx, 'u1', trail())), null, 'nothing written');
});

test('lifecycle: see once (offered → seen); answer while open and not cooling down', () => {
  assert.equal(GUARDS.TrailOffer.see('o'), "o.status = 'offered'");
  assert.equal(GUARDS.TrailOffer.answer('o'), "(o.status IN ['offered', 'seen'] AND (o.cooldownUntil IS NULL OR o.cooldownUntil <= datetime()))");
  const now = NOW.getTime();
  assert.equal(writable('TrailOffer', 'see', { status: 'offered' }, now), true);
  assert.equal(writable('TrailOffer', 'see', { status: 'seen' }, now), false);
  for (const s of ['offered', 'seen']) assert.equal(writable('TrailOffer', 'answer', { status: s }, now), true);
  assert.equal(writable('TrailOffer', 'answer', { status: 'answered' }, now), false);
  assert.equal(writable('TrailOffer', 'answer', { status: 'seen', cooldownUntil: new Date(now + H).toISOString() }, now), false, 'cooling down');
  assert.equal(writable('TrailOffer', 'answer', { status: 'seen', cooldownUntil: new Date(now - H).toISOString() }, now), true, 'back after it');
});

// ------------------------------------------------------------------ blockedTrails

test('blockedTrails: Not me / Yes / More than one / how it goes for good, Not now until its cooldown, open while open', () => {
  const o = (x) => ({ ruleId: 'trail_two_pulls', moveIds: ['hide', 'chase'], contextId: 'ctx_event_leaving', partId: null, status: 'answered', answer: 'not_me', cooldownUntil: null, ...x });
  for (const answer of ['not_me', 'yes', 'more_than_one', 'how_it_goes']) {
    const [b] = B.blockedTrails([o({ answer })], NOW);
    assert.deepEqual(b, { ruleId: 'trail_two_pulls', moveIds: ['chase', 'hide'], contextId: 'ctx_event_leaving', partId: null, until: null }, answer);
    assert.equal(B.isBlocked(trail(), [b], NOW.getTime() + 400 * DAY), true, `${answer}: for good`);
  }
  const later = new Date(NOW.getTime() + 10 * DAY).toISOString();
  const cooling = B.blockedTrails([o({ status: 'seen', answer: 'not_now', cooldownUntil: later })], NOW);
  assert.deepEqual(cooling.map((b) => b.until), [later]);
  assert.equal(B.isBlocked(trail(), cooling, NOW), true, 'cooling');
  assert.equal(B.isBlocked(trail(), cooling, NOW.getTime() + 11 * DAY), false, 'expired');
  assert.deepEqual(B.blockedTrails([o({ status: 'seen', answer: 'not_now', cooldownUntil: ago(1) })], NOW), [], 'a past cooldown blocks nothing');
  assert.deepEqual(B.blockedTrails([o({ status: 'offered', answer: null })], NOW).map((b) => b.until), [null], 'open: blocked while open');
  // Only the same rule + moves + context + part.
  const [nm] = B.blockedTrails([o({})], NOW);
  assert.equal(B.isBlocked(trail({ contextId: 'ctx_trigger_someone' }), [nm], NOW), false);
  assert.equal(B.isBlocked(trail({ ruleId: 'trail_move_in_context', moveIds: ['hide'] }), [nm], NOW), false);
  assert.equal(B.isBlocked(trail({ partId: PID }), [nm], NOW), false);
  assert.equal(B.isBlocked(trail({ moveIds: ['chase', 'hide'] }), [nm], NOW), true, 'moves sorted');
});

// ------------------------------------------------------------------ the gate

const quiet = () => ({
  partsOn: true, offersEnabled: true, ruleEnabled: true, checkIns: [],
  harm: { checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] }, offers: [],
});
const gate = (o = {}) => G.offerGate({ ...quiet(), ...o }, G.DEFAULT_OFFER_POLICY, NOW);
const ci = (h, o = {}) => ({ at: ago(h), flooding: false, crisis: false, dissociation: false, ...o });

test('gate: open when everything is quiet; parts off, offers off, rule off each close it', () => {
  assert.deepEqual(gate(), { open: true, reasons: [] });
  assert.deepEqual(gate({ partsOn: false }).reasons, ['parts_off']);
  assert.deepEqual(gate({ offersEnabled: false }).reasons, ['offers_off']);
  assert.deepEqual(gate({ ruleEnabled: false }).reasons, ['rule_off']);
});

test('gate: flooding / spiraling / crisis check-in within floodGateHours (2 h), both ends in', () => {
  assert.deepEqual(gate({ checkIns: [ci(2, { flooding: true })] }).reasons, ['flooding'], 'exactly 2 h ago: still held');
  assert.equal(gate({ checkIns: [ci(2.01, { flooding: true })] }).open, true, 'just over 2 h: open');
  assert.ok(gate({ checkIns: [ci(0, { flooding: true })] }).reasons.includes('flooding'), 'now');
  assert.equal(gate({ checkIns: [ci(-1, { flooding: true })] }).open, true, 'a future timestamp is not in the window');
  assert.deepEqual(gate({ checkIns: [ci(1, { crisis: true })] }).reasons, ['flooding', 'crisis'], 'a crisis flag counts for both');
});

test('gate: crisis flag within crisisPauseHours (48 h)', () => {
  assert.deepEqual(gate({ checkIns: [ci(48, { crisis: true })] }).reasons, ['crisis'], 'exactly 48 h');
  assert.equal(gate({ checkIns: [ci(48.01, { crisis: true })] }).open, true);
  const policy = G.resolveOfferPolicy({ crisisPauseHours: 72 });
  assert.equal(G.offerGate({ ...quiet(), checkIns: [ci(60, { crisis: true })] }, policy, NOW).open, false, 'the policy\'s number');
});

test('gate: dissociationCount (2) dissociation / freeze results within dissociationDays (14)', () => {
  assert.equal(gate({ checkIns: [ci(24, { dissociation: true })] }).open, true, 'one is not history');
  assert.deepEqual(gate({ checkIns: [ci(24, { dissociation: true }), ci(14 * 24, { dissociation: true })] }).reasons, ['dissociation'], 'the 14th day is in');
  assert.equal(gate({ checkIns: [ci(24, { dissociation: true }), ci(14 * 24 + 0.1, { dissociation: true })] }).open, true, 'one outside');
  assert.equal(G.offerGate({ ...quiet(), checkIns: [ci(24, { dissociation: true }), ci(30, { dissociation: true })] },
    G.resolveOfferPolicy({ dissociationCount: 3 }), NOW).open, true, 'the policy\'s count');
});

test('gate: a harm signal for the person closes it (harm.ts definitions)', () => {
  const harm = { checkbacks: [{ at: ago(24 * 20), harmSignal: true }], sessions: [], crisisCheckIns: [], partsMade: [] };
  assert.deepEqual(gate({ harm }).reasons, ['harm'], 'a Louder in the last 28 days');
  assert.equal(gate({ harm: { ...harm, checkbacks: [{ at: ago(24 * 29), harmSignal: true }] } }).open, true, 'outside the window');
  const tender = { checkbacks: [], crisisCheckIns: [], partsMade: [], sessions: [
    { at: ago(48), stopReason: 'tender', blendCheck: null, p2: false }, { at: ago(24), stopReason: 'own_words', blendCheck: null, p2: false }] };
  assert.deepEqual(gate({ harm: tender }).reasons, ['harm'], 'tender stops twice');
  assert.equal(gate({ harm: { ...tender, sessions: tender.sessions.slice(0, 1) } }).open, true, 'once is not a repeat');
});

test('gate: one offer a week shared with what_helps, both ways', () => {
  assert.deepEqual(gate({ offers: [{ id: 'what_helps_better:cool-down:acute_alarm', offeredAt: ago(24 * 6) }] }).reasons, ['budget'], 'a what_helps offer holds a trail offer');
  assert.equal(gate({ offers: [{ id: 'x', offeredAt: ago(24 * 7) }] }).open, true, 'exactly a week ago no longer counts');
  assert.equal(gate({ offers: [{ id: OID, offeredAt: ago(1) }], offerId: OID }).open, true, 'the offer being shown does not count against itself');
  assert.equal(gate({ offers: [{ id: OID, offeredAt: ago(1) }, { id: 'other', offeredAt: ago(2) }], offerId: OID }).open, false);
  // …and the other way: what_helps counts trail offers.
  const rule = { id: 'what_helps_better', patternKind: 'what_helps', windowDays: 30, minEvidence: 3, ofLast: 4, cooldownDays: 14, enabled: true, statementTemplate: '', offerCopy: '' };
  const ses = (id, d) => ({ id, toolId: 'cool-down', patternId: 'acute_alarm', thenVsNow: 'better', at: new Date(NOW.getTime() - d * DAY).toISOString() });
  const good = [ses('a', 1), ses('b', 2), ses('c', 3)];
  assert.ok(offers.evaluateRule(good, rule, [], NOW.getTime()));
  assert.equal(offers.evaluateRule(good, rule, [], NOW.getTime(), [ago(24 * 3)]), null, 'a trail offer this week holds what_helps');
  assert.ok(offers.evaluateRule(good, rule, [], NOW.getTime(), [ago(24 * 8)]), 'not after a week');
  assert.equal(offers.OFFER_EVERY_DAYS, OFFER_EVERY_DAYS, 'one number');
  assert.equal(offerBudgetSpent([ago(1)], NOW.getTime()), true);
  assert.equal(offerBudgetSpent([null, 'garbage'], NOW.getTime()), false);
});

test('evaluatePatternOffers reads the trail offers\' times into the shared budget', async () => {
  const f = fakeDriver((q) => {
    if (/MATCH \(p:PatternRule\)/.test(q)) return [{ p: { id: 'what_helps_better', windowDays: 30, minEvidence: 3, ofLast: 4, cooldownDays: 14, enabled: true } }];
    if (/patternsEvaluatedAt\) AS at/.test(q)) return [{ at: null }];
    if (/HAS_TOOL_SESSION\]->\(ts:ToolSession\)\s+WHERE ts\.thenVsNow/.test(q)) {
      return ['a', 'b', 'c'].map((id, i) => ({ id, toolId: 'cool-down', patternId: 'acute_alarm', thenVsNow: 'better', at: ago(24 * (i + 1)) }));
    }
    if (q === offers.TRAIL_OFFER_TIMES_QUERY) return [{ offeredAt: ago(24 * 2) }];
    return [];
  });
  setDriver(f.driver);
  await offers.evaluatePatternOffers('u1', new Date());
  const t = f.calls.find((c) => c.query === offers.TRAIL_OFFER_TIMES_QUERY);
  assert.ok(t, 'read');
  assert.equal(t.params.days, OFFER_EVERY_DAYS);
  assert.ok(!f.calls.some((c) => /MERGE \(o:PatternOffer/.test(c.query)), 'held by the trail offer this week');
  assert.ok(f.calls.some((c) => /patternsEvaluatedAt = datetime\(\)/.test(c.query)));
});

test('the gate reads the caller\'s own check-ins, both offer kinds and the harm rows; no own words', async () => {
  const state = { partsOn: true, offersEnabled: true, policy: G.DEFAULT_OFFER_POLICY, rules: [{ id: 'trail_two_pulls', enabled: true }] };
  const f = fakeDriver((q) => {
    if (q === Q.GATE_CHECKINS_QUERY) return [{ at: ago(1), flooding: true, crisis: false, dissociation: false }];
    if (q === Q.OFFER_TIMES_QUERY) return [];
    if (q === HARM_ROWS_QUERY) return [{ checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] }];
    return new Error(`unexpected ${q}`);
  });
  setDriver(f.driver);
  const { readTx } = require('../../lib/shared/neo4j');
  const g = await readTx((tx) => Q.checkOfferGate(tx, 'u9', state, 'trail_two_pulls', NOW));
  assert.deepEqual(g.reasons, ['flooding']);
  const c = f.calls.find((x) => x.query === Q.GATE_CHECKINS_QUERY);
  assert.equal(c.params.uid, 'u9');
  assert.equal(Number(c.params.hours), 14 * 24, 'the longest window');
  assert.deepEqual(c.params.dissociation, ['dissociation_overmodulation', 'conservation_freeze']);
  assert.match(Q.GATE_CHECKINS_QUERY, /MATCH \(c:CheckIn \{ownerId: \$uid\}\)/);
  assert.match(Q.OFFER_TIMES_QUERY, /\(:User \{id: \$uid\}\)-\[:HAS_PATTERN_OFFER\|HAS_TRAIL_OFFER\]->\(o\)/);
  for (const x of f.calls) {
    assert.equal(x.params.uid, 'u9');
    assert.doesNotMatch(x.query, /\bown(Voice|Job|Fear|Update|Words)\b|\.text\b|\.note\b/, 'no own-words property');
  }
});

// ------------------------------------------------------------------ Today

const OPEN = { id: OID, ruleId: 'trail_two_pulls', shape: 'C', pullIds: ['hide', 'chase'], contextId: 'ctx_event_leaving', offeredAt: ago(3) };
const POLICY_ROW = (o = {}) => ({
  partsOn: true, offersEnabled: true, policy: null,
  rules: [{ id: 'trail_two_pulls', shape: 'C', enabled: true, cooldownDays: 28, statementTemplate: 'When {context}, two pulls: to {pull} and to {pull2}.', approved: true }],
  ...o,
});
function todayFake({ open = OPEN, policy = POLICY_ROW(), checkIns = [], times = [], phrases = { moves: [{ id: 'hide', trailPhrase: 'hide' }, { id: 'chase', trailPhrase: 'chase it' }], context: 'someone pulls away' } } = {}) {
  return fakeDriver((q, p) => {
    if (q === Q.OPEN_OFFER_QUERY) {
      assert.deepEqual(p.shapes, ['A', 'B', 'C'], 'Today shapes only');
      return open && p.shapes.includes(open.shape) ? [open] : [];
    }
    if (q === Q.OFFER_POLICY_QUERY) return [policy];
    if (q === Q.GATE_CHECKINS_QUERY) return checkIns;
    if (q === Q.OFFER_TIMES_QUERY) return times;
    if (q === HARM_ROWS_QUERY) return [{ checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] }];
    if (q === Q.PHRASES_QUERY) return [phrases];
    return [];
  });
}
const items = async (f) => {
  setDriver(f.driver);
  const { readTx } = require('../../lib/shared/neo4j');
  return readTx((tx) => TD.trailOfferItems(tx, 'u1', NOW));
};

test('Today source: one trail_offer card, its statement\'s signed-off pieces, through the gate', async () => {
  const [it, ...rest] = await items(todayFake());
  assert.equal(rest.length, 0);
  assert.deepEqual([it.id, it.kind, it.type, it.state, it.resolveMode, it.deepLink], [OID, 'trail_offer', 'trail_offer', 'due', 'inline', null]);
  assert.deepEqual(it.trail, { ruleId: 'trail_two_pulls', shape: 'C', template: 'When {context}, two pulls: to {pull} and to {pull2}.', pulls: ['hide', 'chase it'], context: 'someone pulls away' });
  assert.equal(it.part, undefined);
  assert.match(Q.OPEN_OFFER_QUERY, /WHERE coalesce\(u\.partsEnabled, false\) AND o\.status IN \['offered', 'seen'\] AND o\.shape IN \$shapes/);
  assert.match(Q.OPEN_OFFER_QUERY, /o\.cooldownUntil IS NULL OR o\.cooldownUntil <= datetime\(\)/);
  assert.match(Q.OPEN_OFFER_QUERY, /pol\.offersEnabled = true/);
  assert.match(Q.OPEN_OFFER_QUERY, /ORDER BY o\.offeredAt DESC LIMIT 1/, 'at most one');
});

test('Today source: nothing when the gate is closed when it renders, a phrase is a draft, the rule is a draft or off, or the offer is rule D', async () => {
  assert.deepEqual(await items(todayFake({ checkIns: [{ at: ago(1), flooding: true, crisis: false, dissociation: false }] })), [], 'flooding just now');
  assert.deepEqual(await items(todayFake({ times: [{ id: 'what_helps_better:x:y', offeredAt: ago(30) }] })), [], 'a what_helps offer this week');
  assert.equal((await items(todayFake({ times: [{ id: OID, offeredAt: ago(3) }] }))).length, 1, 'its own time does not count');
  assert.deepEqual(await items(todayFake({ phrases: { moves: [{ id: 'hide', trailPhrase: 'hide' }], context: 'someone pulls away' } })), [], 'a move phrase not signed off');
  assert.deepEqual(await items(todayFake({ phrases: { moves: [{ id: 'hide', trailPhrase: 'hide' }, { id: 'chase', trailPhrase: 'chase it' }], context: null } })), [], 'the context phrase not signed off');
  assert.deepEqual(await items(todayFake({ policy: POLICY_ROW({ rules: [{ ...POLICY_ROW().rules[0], approved: false }] }) })), [], 'the template a draft');
  assert.deepEqual(await items(todayFake({ policy: POLICY_ROW({ rules: [{ ...POLICY_ROW().rules[0], enabled: false }] }) })), [], 'rule off');
  assert.deepEqual(await items(todayFake({ policy: POLICY_ROW({ offersEnabled: false }) })), [], 'offers off');
  assert.deepEqual(await items(todayFake({ open: { ...OPEN, shape: 'D' } })), [], 'rule D is Reflect\'s');
  const none = todayFake({ open: null });
  assert.deepEqual(await items(none), []);
  assert.equal(none.calls.length, 1, 'no open offer: nothing else is read');
});

test('Today order: at most one trail offer; a flooded band drops it altogether', () => {
  const it = (id, dueAt) => ({ id, kind: 'trail_offer', type: 'trail_offer', tier: 'skills', state: 'due', dueAt, resolveMode: 'inline', deepLink: null, choices: [], copy: { title: '' } });
  const fu = { id: 'f', kind: 'follow_up', type: 'x', tier: 'quality', state: 'due', dueAt: ago(1), resolveMode: 'inline', deepLink: null, choices: [], copy: { title: 't' } };
  const out = orderToday([it('a', ago(5)), it('b', ago(2)), fu]);
  assert.deepEqual(out.items.filter((x) => x.kind === 'trail_offer').map((x) => x.id), ['b'], 'the newest only');
  const flooded = orderToday([it('a', ago(5)), fu], 'flooded');
  assert.deepEqual([flooded.items, flooded.more.map((x) => x.id), flooded.holding], [[], ['f'], true], 'not held for later: gone');
  assert.deepEqual(orderToday([it('a', ago(5))], 'flooded'), { items: [], more: [], holding: false });
});

test('getToday with offers off reads nothing past the open-offer query and shows no trail offer', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  const out = await fns.getToday.run({ auth: auth(), data: {} });
  assert.equal([...out.items, ...out.more].filter((i) => i.kind === 'trail_offer').length, 0);
  assert.ok(f.calls.some((c) => c.query === Q.OPEN_OFFER_QUERY));
  assert.ok(!f.calls.some((c) => c.query === Q.GATE_CHECKINS_QUERY || c.query === HARM_ROWS_QUERY));
  assert.ok(!f.calls.some((c) => c.query === R.WRITE_TRAIL_OFFER_QUERY), 'the evaluator is not wired: nothing is written');
});

// ------------------------------------------------------------------ the prepare step

function prepareFake({ policy = POLICY_ROW(), last = null, states = [], gateCheckIns = [] } = {}) {
  return fakeDriver((q) => {
    if (q === Q.OFFER_POLICY_QUERY) return [policy];
    if (q === TD.EVALUATED_AT_QUERY) return [{ at: last }];
    if (q === Q.OFFER_STATES_QUERY) return states;
    if (q === Q.GATE_CHECKINS_QUERY) return gateCheckIns;
    if (q === Q.OFFER_TIMES_QUERY) return [];
    if (q === HARM_ROWS_QUERY) return [{ checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] }];
    if (q === R.WRITE_TRAIL_OFFER_QUERY) return [{ id: 'written' }];
    return [];
  });
}

test('prepare: a no-op until trails-engine lands (TODO(trails-engine))', async () => {
  assert.equal(TD.TRAIL_EVALUATOR, null);
  const f = prepareFake();
  setDriver(f.driver);
  assert.equal(await TD.prepareTrailOffers('u1', NOW), null);
  assert.equal(f.calls.length, 0);
});

test('prepare: the top enabled A–C candidate that is new and not blocked, through the gate; D never; once a day', async () => {
  const D = trail({ ruleId: 'trail_known_part', shape: 'D', contextId: null, partId: PID, moveIds: ['go_blank'] });
  const policy = POLICY_ROW({ rules: [...POLICY_ROW().rules, { id: 'trail_known_part', shape: 'D', enabled: true, cooldownDays: 14, statementTemplate: 'Was this {name}?', approved: true }, { id: 'trail_sequence', shape: 'B', enabled: false }] });
  const seen = [];
  const evaluate = async (_tx, uid, blocked) => { seen.push([uid, blocked]); return [D, trail({ ruleId: 'trail_sequence', shape: 'B', contextId: null }), trail()]; };
  const f = prepareFake({ policy });
  setDriver(f.driver);
  assert.equal(await TD.prepareTrailOffers('u1', NOW, evaluate), 'written');
  const w = f.calls.find((c) => c.query === R.WRITE_TRAIL_OFFER_QUERY);
  assert.equal(w.params.id, OID, 'D skipped (Reflect\'s), B skipped (rule off), C written');
  assert.ok(f.calls.some((c) => c.query === TD.STAMP_EVALUATED_QUERY));
  assert.deepEqual(seen[0], ['u1', []]);

  // Blocked or already offered: the next one, or nothing.
  const states = [{ id: OID, ruleId: 'trail_two_pulls', moveIds: ['chase', 'hide'], contextId: 'ctx_event_leaving', partId: null, status: 'answered', answer: 'not_me', cooldownUntil: null }];
  const g = prepareFake({ policy, states });
  setDriver(g.driver);
  assert.equal(await TD.prepareTrailOffers('u1', NOW, evaluate), null);
  assert.ok(!g.calls.some((c) => c.query === R.WRITE_TRAIL_OFFER_QUERY));
  assert.ok(g.calls.some((c) => c.query === TD.STAMP_EVALUATED_QUERY), 'still evaluated today');

  // A closed gate: nothing written, evaluated for the day.
  const h = prepareFake({ policy, gateCheckIns: [{ at: ago(1), flooding: false, crisis: true, dissociation: false }] });
  setDriver(h.driver);
  assert.equal(await TD.prepareTrailOffers('u1', NOW, evaluate), null);
  assert.ok(!h.calls.some((c) => c.query === R.WRITE_TRAIL_OFFER_QUERY));

  // Once a day; and nothing at all with offers off.
  for (const fake of [prepareFake({ policy, last: ago(3) }), prepareFake({ policy: { ...policy, offersEnabled: false } }), prepareFake({ policy: { ...policy, partsOn: false } })]) {
    setDriver(fake.driver);
    assert.equal(await TD.prepareTrailOffers('u1', NOW, evaluate), null);
    assert.ok(!fake.calls.some((c) => c.query === R.WRITE_TRAIL_OFFER_QUERY || c.query === TD.STAMP_EVALUATED_QUERY));
  }
});

// ------------------------------------------------------------------ getTrailOfferEvidence

function evidenceFake({ partsOn = true, offer = {}, labels = null } = {}) {
  const stored = {
    shape: 'C', moveIds: ['chase', 'hide'], pullIds: ['hide', 'chase'], contextId: 'ctx_event_leaving',
    evidenceJson: R.evidenceJson(trail()), status: 'offered', open: true, ...offer,
  };
  return fakeDriver((q) => {
    if (q === A.EVIDENCE_STATE_QUERY) return [{ partsOn, offer: offer === null ? null : stored }];
    if (q === A.MARK_SEEN_QUERY) return [{ status: 'seen' }];
    if (q === A.EVIDENCE_LABELS_QUERY) {
      return [labels ?? {
        records: [{ key: 'u1:r1', labels: ['Hide away'] }, { key: 'u1:r2', labels: [] }, { key: 'u1:r3', labels: ['Chase them down'] }],
        contexts: [{ id: 'ctx_event_leaving', phrase: 'someone pulls away' }, { id: 'ctx_trigger_someone', phrase: "it's about someone" }],
      }];
    }
    return new Error('unexpected');
  });
}

test('getTrailOfferEvidence: own offer, marked seen once, rows of dates / tool ids / context phrase / graph labels', async () => {
  const f = evidenceFake();
  setDriver(f.driver);
  const out = await fns.getTrailOfferEvidence.run({ auth: auth('u1'), data: { offerId: OID } });
  assert.deepEqual(out, {
    offerId: OID, shape: 'C', moveIds: ['hide', 'chase'],
    rows: [
      { at: ago(200), toolIds: ['find-the-feeling'], context: 'someone pulls away', sources: ['Hide away'] },
      { at: ago(100), toolIds: ['recovering-from-invalidation'], context: 'someone pulls away', sources: ['Chase them down'] },
    ],
  });
  assert.ok(f.calls.some((c) => c.query === A.MARK_SEEN_QUERY));
  for (const c of f.calls) assert.equal(c.params.key, `u1:${OID}`, 'the caller\'s own offer only');
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  assert.match(A.MARK_SEEN_QUERY, /WHERE o\.status = 'offered'\s+SET o\.status = 'seen', o\.seenAt = datetime\(\)/);
  assert.match(A.EVIDENCE_LABELS_QUERY, /x\.reviewStatus = 'approved'/);
  assert.match(A.EVIDENCE_LABELS_QUERY, /c\.reviewStatus = 'approved'/);
  assert.match(A.EVIDENCE_LABELS_QUERY, /\(o\)-\[:EVIDENCE\]->\(r:LogRecord \{ownerId: \$uid\}\)/);
  assert.doesNotMatch(A.EVIDENCE_LABELS_QUERY + A.EVIDENCE_STATE_QUERY, /\bown(Voice|Job|Fear|Update|Words)\b|\.text\b|\.note\b/);

  const seen = evidenceFake({ offer: { status: 'seen' } });
  setDriver(seen.driver);
  await fns.getTrailOfferEvidence.run({ auth: auth('u1'), data: { offerId: OID } });
  assert.ok(!seen.calls.some((c) => c.query === A.MARK_SEEN_QUERY), 'seen stays seen');

  for (const [fake, c] of [[evidenceFake({ offer: null }), 'not-found'], [evidenceFake({ offer: { status: 'answered', open: false } }), 'failed-precondition'],
    [evidenceFake({ partsOn: false }), 'failed-precondition']]) {
    setDriver(fake.driver);
    await assert.rejects(fns.getTrailOfferEvidence.run({ auth: auth('u1'), data: { offerId: OID } }), code(c));
    assert.ok(!fake.calls.some((x) => x.query === A.MARK_SEEN_QUERY));
  }
  await assert.rejects(fns.getTrailOfferEvidence.run({ auth: auth('u1'), data: { offerId: 'nope' } }), code('invalid-argument'));
  await assert.rejects(fns.getTrailOfferEvidence.run({ auth: auth('u1'), data: { offerId: OID, uid: 'u2' } }), code('invalid-argument'));
});

test('evidence rows: a row\'s context falls back to its first signed-off one, or none', async () => {
  const deps = {
    state: async () => ({ partsOn: true, offer: { shape: 'A', moveIds: ['hide'], pullIds: ['hide'], contextId: 'ctx_event_leaving', status: 'seen', open: true,
      evidence: [{ at: ago(5), toolIds: ['checkin'], recordKeys: ['k'], moveIds: ['hide'], contextIds: ['ctx_time_night', 'ctx_trigger_body'] },
        { at: ago(9), toolIds: [], recordKeys: [], moveIds: [], contextIds: ['ctx_time_morning'] }] } }),
    markSeen: async () => { throw new Error('not again'); },
    labels: async () => ({ records: new Map(), contexts: new Map([['ctx_trigger_body', 'it starts in your body']]) }),
  };
  const out = await A.getTrailOfferEvidenceHandler({ offerId: 'x' }, deps);
  assert.deepEqual(out.rows.map((r) => [r.context, r.sources]), [[null, []], ['it starts in your body', []]], 'oldest first; drafts never shown');
});

// ------------------------------------------------------------------ answerTrailOffer

function answerFake({ partsOn = true, offer = {}, cooldownDays = 28, guardHolds = true } = {}) {
  const stored = { shape: 'C', moveIds: ['chase', 'hide'], pullIds: ['hide', 'chase'], status: 'seen', answer: null, open: true, ...offer };
  return fakeDriver((q, p) => {
    if (q === A.ANSWER_STATE_QUERY) return [{ partsOn, offer: offer === null ? null : stored, cooldownDays }];
    if (q === A.ANSWER_NOT_NOW_QUERY || q === A.ANSWER_FINAL_QUERY) return guardHolds ? [{ status: q === A.ANSWER_FINAL_QUERY ? 'answered' : stored.status }] : [];
    if (q === A.SPLIT_CANDIDATES_QUERY) return [{ ids: p.candidates.map((c) => c.id) }];
    return new Error('unexpected');
  });
}
const answer = async (f, data, uid = 'u1') => { setDriver(f.driver); return fns.answerTrailOffer.run({ auth: auth(uid), data }); };

test('answerTrailOffer Not now: a cooldown from the rule (default 28), the offer stays open', async () => {
  const f = answerFake({ cooldownDays: 14 });
  assert.deepEqual(await answer(f, { offerId: OID, answer: 'not_now' }), { offerId: OID, answer: 'not_now', status: 'seen', next: 'none' });
  const w = f.calls.find((c) => c.query === A.ANSWER_NOT_NOW_QUERY);
  assert.equal(w.params.cooldownDays, 14);
  assert.match(A.ANSWER_NOT_NOW_QUERY, /WHERE \(o\.status IN \['offered', 'seen'\] AND \(o\.cooldownUntil IS NULL OR o\.cooldownUntil <= datetime\(\)\)\)/);
  assert.match(A.ANSWER_NOT_NOW_QUERY, /o\.cooldownUntil = datetime\(\) \+ duration\(\{days: \$cooldownDays\}\)/);
  assert.doesNotMatch(A.ANSWER_NOT_NOW_QUERY, /o\.status =/, 'not answered for good');
  const g = answerFake({ cooldownDays: null });
  await answer(g, { offerId: OID, answer: 'not_now' });
  assert.equal(g.calls.find((c) => c.query === A.ANSWER_NOT_NOW_QUERY).params.cooldownDays, A.DEFAULT_COOLDOWN_DAYS);
});

test('answerTrailOffer Not me / It\'s how things go: final, recorded only (blocked for good)', async () => {
  for (const a of ['not_me', 'how_it_goes']) {
    const f = answerFake();
    assert.deepEqual(await answer(f, { offerId: OID, answer: a }), { offerId: OID, answer: a, status: 'answered', next: 'none' });
    const w = f.calls.find((c) => c.query === A.ANSWER_FINAL_QUERY);
    assert.deepEqual([w.params.answer, w.params.split], [a, null]);
    assert.equal(f.calls.length, 2, 'nothing else written');
    assert.deepEqual(B.blockedTrails([{ ruleId: 'r', moveIds: ['m'], contextId: null, partId: null, status: 'answered', answer: a, cooldownUntil: null }], NOW)[0].until, null);
  }
  assert.match(A.ANSWER_FINAL_QUERY, /SET o\.status = 'answered', o\.answer = \$answer, o\.answeredAt = datetime\(\), o\.cooldownUntil = null/);
});

test('answerTrailOffer Yes: final; the client opens Meet a part on the offer with its moves in order', async () => {
  const f = answerFake();
  assert.deepEqual(await answer(f, { offerId: OID, answer: 'yes' }), { offerId: OID, answer: 'yes', status: 'answered', next: 'meet', moveIds: ['hide', 'chase'] });
  assert.ok(!f.calls.some((c) => /PartTag|PartCandidate|:Part\b/.test(c.query)), 'no part, tag or candidate here: keepPart makes the part');
});

test('answerTrailOffer More than one: a PartCandidate (origin trail) per kept move, FROM_OFFER the offer', async () => {
  const f = answerFake();
  const out = await answer(f, { offerId: OID, answer: 'more_than_one', split: ['hide', 'chase'], candidateIds: [C1, C2] });
  assert.deepEqual(out, { offerId: OID, answer: 'more_than_one', status: 'answered', next: 'candidates', candidateIds: [C1, C2] });
  assert.deepEqual(f.calls.find((c) => c.query === A.ANSWER_FINAL_QUERY).params.split, ['hide', 'chase']);
  const w = f.calls.find((c) => c.query === A.SPLIT_CANDIDATES_QUERY);
  assert.equal(w.params.origin, TY.TRAIL_CANDIDATE_ORIGIN);
  assert.equal(TY.TRAIL_CANDIDATE_ORIGIN, 'trail');
  assert.deepEqual(w.params.candidates, [{ id: C1, moveId: 'hide', key: `u1:${C1}` }, { id: C2, moveId: 'chase', key: `u1:${C2}` }]);
  assert.match(A.SPLIT_CANDIDATES_QUERY, /ON CREATE SET c:UserData:LogRecord, [^\n]*\n\s+c\.origin = \$origin, c\.moveIds = \[cand\.moveId\], c\.status = 'open'/);
  assert.match(A.SPLIT_CANDIDATES_QUERY, /MERGE \(c\)-\[:FROM_OFFER\]->\(o\)/);
  assert.match(A.SPLIT_CANDIDATES_QUERY, /WHERE coalesce\(u\.partsEnabled, false\)/);
  // Only the offer's own moves; one id per move.
  await assert.rejects(answer(answerFake(), { offerId: OID, answer: 'more_than_one', split: ['hit_back'], candidateIds: [C1] }), code('invalid-argument'));
  await assert.rejects(answer(answerFake(), { offerId: OID, answer: 'more_than_one', split: ['hide'], candidateIds: [] }), code('invalid-argument'));
  await assert.rejects(answer(answerFake(), { offerId: OID, answer: 'more_than_one', split: ['hide', 'hide'], candidateIds: [C1, C2] }), code('invalid-argument'));
  await assert.rejects(answer(answerFake(), { offerId: OID, answer: 'yes', split: ['hide'] }), code('invalid-argument'), 'split is More than one\'s');
});

test('answerTrailOffer: own offers only, open only, parts on, never rule D, a closed set of answers', async () => {
  const f = answerFake();
  await answer(f, { offerId: OID, answer: 'not_me' }, 'someone');
  for (const c of f.calls) assert.equal(c.params.key, `someone:${OID}`, 'keyed by the caller');
  await assert.rejects(answer(answerFake({ offer: null }), { offerId: OID, answer: 'yes' }), code('not-found'), 'someone else\'s offer is not found');
  await assert.rejects(answer(answerFake({ offer: { status: 'answered', open: false } }), { offerId: OID, answer: 'yes' }), code('failed-precondition'));
  await assert.rejects(answer(answerFake({ guardHolds: false }), { offerId: OID, answer: 'yes' }), code('failed-precondition'), 'answered in between');
  await assert.rejects(answer(answerFake({ partsOn: false }), { offerId: OID, answer: 'not_me' }), code('failed-precondition'));
  const d = answerFake({ offer: { shape: 'D' } });
  await assert.rejects(answer(d, { offerId: OID, answer: 'yes' }), code('failed-precondition'), 'rule D is answered in Reflect');
  assert.ok(!d.calls.some((c) => c.query !== A.ANSWER_STATE_QUERY));
  for (const bad of [{ offerId: OID, answer: 'maybe' }, { offerId: OID }, { offerId: 'x', answer: 'yes' }, { offerId: OID, answer: 'yes', ownerId: 'u2' }]) {
    await assert.rejects(answer(answerFake(), bad), code('invalid-argument'));
  }
  assert.deepEqual([...TY.TRAIL_OFFER_ANSWERS], ['not_now', 'not_me', 'yes', 'more_than_one', 'how_it_goes']);
});

// ------------------------------------------------------------------ Yes → Meet a part → keepPart

test('the offer trailhead: startPartSession needs the caller\'s offer answered Yes (A–C) and pre-selects its moves', async () => {
  const f = fakeDriver((q) => {
    if (q === SQ.START_STATE_QUERY) return [{ partsOn: true, partFound: false, candidateFound: false, status: null, offerFound: true, offerMoves: ['chase', 'hide'] }];
    return [];
  });
  setDriver(f.driver);
  await fns.startPartSession.run({ auth: auth('u1'), data: { id: SID, trailheadKind: 'offer', offerId: OID, moveIds: ['hide'] } });
  const st = f.calls.find((c) => c.query === SQ.START_STATE_QUERY);
  assert.equal(st.params.offerKey, `u1:${OID}`);
  const c = f.calls.find((x) => x.query === SQ.CREATE_QUERY);
  assert.deepEqual([c.params.offerId, c.params.moveIds], [OID, ['hide', 'chase']]);
  assert.match(SQ.START_STATE_QUERY, /OPTIONAL MATCH \(u\)-\[:HAS_TRAIL_OFFER\]->\(o:TrailOffer \{key: \$offerKey\}\)\s+WHERE o\.answer = 'yes' AND o\.shape <> 'D'/);
  assert.match(SQ.CREATE_QUERY, /ps\.offerId = \$offerId/);
  assert.match(SQ.CREATE_QUERY, /MERGE \(ps\)-\[:FROM_OFFER\]->\(x\)/);

  setDriver(fakeDriver((q) => (q === SQ.START_STATE_QUERY ? [{ partsOn: true, partFound: false, candidateFound: false, status: null, offerFound: false, offerMoves: [] }] : [])).driver);
  await assert.rejects(fns.startPartSession.run({ auth: auth('u1'), data: { id: SID, trailheadKind: 'offer', offerId: OID } }), code('not-found'));
});

test('keepPart from an offer: source offer, ACCEPTED_FROM the offer (an edge into it)', async () => {
  const stored = { trailheadKind: 'offer', candidateId: null, offerId: OID, partId: null, moveIds: ['chase', 'hide'], keepable: true,
    stepIdsJson: '{}', stopReason: 'done', bodyPlaces: [], shapeSig: null, soundSig: null, ownVoice: null, ownJob: null, ownFear: null };
  const f = fakeDriver((q, p) => {
    if (q === K.KEEP_STATE_QUERY) return [{ partsOn: true, session: stored, part: null, linkedPartId: null, nameMaxChars: 40, revisitAfterDays: 30 }];
    if (q === K.KEEP_NEW_QUERY) return [{ id: p.partId }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  await fns.keepPart.run({ auth: auth('u1'), data: { sessionId: SID, partId: PID } });
  const w = f.calls.find((c) => c.query === K.KEEP_NEW_QUERY);
  assert.deepEqual([w.params.source, w.params.offerKey, w.params.moveIds], ['offer', `u1:${OID}`, ['chase', 'hide']]);
  assert.match(K.KEEP_STATE_QUERY, /\.offerId/);
  assert.match(K.KEEP_NEW_QUERY, /OPTIONAL MATCH \(u\)-\[:HAS_TRAIL_OFFER\]->\(tof:TrailOffer \{key: \$offerKey\}\)/);
  assert.match(K.KEEP_NEW_QUERY, /FOREACH \(x IN CASE WHEN tof IS NULL THEN \[\] ELSE \[tof\] END \|\s+MERGE \(p\)-\[r:ACCEPTED_FROM\]->\(x\) ON CREATE SET r\.confirmedAt = datetime\(\), r\.source = \$source\)/);
  assert.match(K.KEEP_REVISIT_QUERY, /tof:TrailOffer \{key: \$offerKey\}/, 'a revisit from an offer links it too');
  assert.doesNotMatch(K.KEEP_NEW_QUERY, /SET tof\.|\(tof\)-\[/, 'the offer is only pointed at');
});

// ------------------------------------------------------------------ tagPart's review source

test('tagPart takes a review tag (Reflect\'s rule D batch, later): a closed session of the caller\'s, no strength, never counted as helped', () => {
  assert.deepEqual(T.validateTag({ id: C1, partId: PID, toolSessionId: SID, source: 'review' }), { id: C1, partId: PID, toolSessionId: SID, source: 'review' });
  assert.throws(() => T.validateTag({ id: C1, partId: PID, toolSessionId: SID, source: 'review', strength: 'yes' }), (e) => e.name === 'ValidationError');
  assert.equal(T.taggedKeyOf('u1:s', 'review'), 'u1:s:review', 'one review tag per session, beside its close / debrief tags');
  assert.match(T.TAG_QUERY, /OR \(\$source = 'review' AND ts\.status <> 'open' AND NOT ts\.toolId IN \$never\)/);
  const stats = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../src/parts/statsQueries.ts'), 'utf8');
  assert.match(stats, /coalesce\(t\.source, 'close'\) = 'close'/, 'the stats read close tags only');
});

test('tagPart review over the handler: open sessions and Meet a part refused', async () => {
  const deps = (o) => ({
    state: async () => ({ partsOn: true, partStatus: 'active', sessionFound: true, sessionStatus: 'completed', thenVsNow: 'same', actedOnUrge: null, toolId: 'cool-down', existingId: null, ...o }),
    write: async () => true,
  });
  const t = { id: C1, partId: PID, toolSessionId: SID, source: 'review' };
  assert.deepEqual(await T.tagPartHandler(t, deps({})), { id: C1, created: true }, 'any close answer');
  await assert.rejects(T.tagPartHandler(t, deps({ sessionStatus: 'open' })), code('failed-precondition'));
  await assert.rejects(T.tagPartHandler(t, deps({ toolId: 'meet-a-part' })), code('failed-precondition'));
});

void record;
