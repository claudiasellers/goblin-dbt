'use strict';
/**
 * Reflect's trails (functions/src/parts/offers/review.ts): rule D's batch ("Was this {name}?") and the
 * plain patterns. The evaluator's No keys (trails/rules.ts), what a review batch blocks (blockedTrails),
 * the read's gate and shape, the answer's checks and writes, the ×, and the queries' ownership.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver, record } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const T = require('../../lib/parts/trails');
const B = require('../../lib/parts/offers/blocked');
const R = require('../../lib/parts/offers/record');
const V = require('../../lib/parts/offers/review');
const { GUARDS, writable } = require('../../lib/userdata/lifecycle');

test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;
const H = 3_600_000;
const DAY = 24 * H;
const NOW = new Date('2026-10-16T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
const ago = (d) => iso(NOW.getTime() - d * DAY);
const PID = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const RID = '5b2c9a0e-1b2c-4d5e-8f90-123456789abc';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const key = (n) => `u1:${id(n)}`;

// ------------------------------------------------------------------ the evaluator: No keys

const ep = (n, days, moveIds = ['hide'], tags = []) => ({
  at: ago(days), endAt: ago(days), moveIds, contexts: { timeBand: 'evening' }, toolIds: ['opposite-action'],
  moveToolIds: Object.fromEntries(moveIds.map((m) => [m, ['opposite-action']])), recordKeys: [key(n)], taggedPartIds: tags, sources: [],
});
const part = { id: PID, status: 'active', moveIds: ['hide'], lastVisitedAt: ago(30), pausedUntil: null };
const ruleD = { id: 'trail_known_part', shape: 'D', minEpisodes: 3, windowDays: null, minSpanDays: null, minTools: null, contextShare: null, withinHours: null, lift: null, cooldownDays: 14, enabled: true, approved: true, statementTemplate: 'Was this {name}?' };
const ctx = (blocked = []) => ({ moves: [{ id: 'hide', offerable: true, safetyLine: false }], pairs: [], contexts: [], parts: [part], blocked });

test('rule D: a No row\'s records never count for that part again, after the cooldown too; the cooldown blocks the part', () => {
  const eps = [ep(1, 10), ep(2, 8), ep(3, 6), ep(4, 4)];
  assert.equal(T.evaluateTrails(eps, [ruleD], ctx(), NOW.getTime()).length, 1);
  const no = { ruleId: ruleD.id, moveIds: ['hide'], contextId: null, partId: PID, until: ago(1), recordKeys: [key(1), key(2)] };
  assert.deepEqual(T.knownPartEpisodes(ruleD.id, eps, part, [no]).map((e) => e.recordKeys[0]), [key(3), key(4)], 'past cooldown, No still holds');
  assert.equal(T.evaluateTrails(eps, [ruleD], ctx([no]), NOW.getTime()).length, 0, 'two left: under minEpisodes');
  // Another part's No keys, or another rule's, change nothing.
  assert.equal(T.knownPartEpisodes(ruleD.id, eps, part, [{ ...no, partId: id(9) }]).length, 4);
  assert.equal(T.knownPartEpisodes(ruleD.id, eps, part, [{ ...no, ruleId: 'trail_sequence' }]).length, 4);
  const cooling = { ...no, until: iso(NOW.getTime() + DAY), recordKeys: [] };
  assert.equal(T.evaluateTrails(eps, [ruleD], ctx([cooling]), NOW.getTime()).length, 0, 'cooling down');
  assert.equal(T.evaluateTrails(eps, [ruleD], ctx([{ ...cooling, until: ago(1) }]), NOW.getTime()).length, 1, 'back after it');
  // A tagged episode (a Yes) never counts either.
  assert.equal(T.knownPartEpisodes(ruleD.id, [...eps.slice(0, 3), ep(5, 2, ['hide'], [PID])], part, []).length, 3);
});

test('blockedTrails: a review batch blocks its part until cooldownUntil and keeps its No keys for good', () => {
  const later = iso(NOW.getTime() + 10 * DAY);
  const o = { ruleId: ruleD.id, moveIds: ['hide'], contextId: null, partId: PID, status: 'answered', answer: 'done', cooldownUntil: later, noKeys: [key(2), key(1)] };
  const [b] = B.blockedTrails([o], NOW);
  assert.deepEqual(b, { ruleId: ruleD.id, moveIds: ['hide'], contextId: null, partId: PID, until: later, recordKeys: [key(1), key(2)] });
  const [past] = B.blockedTrails([{ ...o, answer: 'not_now', cooldownUntil: ago(1) }], NOW);
  assert.equal(past.until, ago(1), 'kept past its cooldown, blocking nothing');
  assert.equal(T.isBlocked([past], { ruleId: ruleD.id, moveIds: [], contextId: null, partId: PID }, NOW.getTime()), false);
  assert.equal(T.isBlocked([b], { ruleId: ruleD.id, moveIds: ['other'], contextId: null, partId: PID }, NOW.getTime()), true, 'a part key ignores its moves');
  // Offers without a part are unchanged (no recordKeys).
  assert.equal('recordKeys' in B.blockedTrails([{ ...o, partId: null }], NOW)[0], false);
});

// ------------------------------------------------------------------ getReflectTrails

const RULES = [
  { id: 'trail_move_in_context', shape: 'A', enabled: true, cooldownDays: 28, statementTemplate: 'When {context}, the pull is to {pull}.', approved: true },
  { id: 'trail_known_part', shape: 'D', enabled: true, cooldownDays: 14, statementTemplate: 'Was this {name}?', approved: true },
];
const cand = (partId, n0) => ({
  ruleId: 'trail_known_part', shape: 'D', moveIds: ['hide'], contextId: null, pairId: null, partId,
  evidence: [n0 + 2, n0, n0 + 1].map((n) => ({ at: ago(10 - (n - n0)), toolIds: ['opposite-action'], recordKeys: [key(n)], moveIds: ['hide'], contextIds: ['ctx_event_leaving'] })),
  strength: { episodes: 3, spanDays: 2, tools: 1 },
});
const slicePart = (pid, over = {}) => ({ id: pid, name: 'Wren', firstPlace: 'chest', shapeSig: null, safety: false, moveIds: ['hide'], ...over });

function readDeps(over = {}) {
  const calls = { candidates: [], labels: [] };
  const deps = {
    policy: async () => ({ partsOn: true, offersEnabled: true, policy: {}, rules: RULES }),
    gate: async () => ({ open: true, reasons: [] }),
    offers: async () => [],
    candidates: async (blocked) => { calls.candidates.push(blocked); return [cand(PID, 1), cand(id(7), 10), cand(id(8), 20)]; },
    parts: async () => [slicePart(PID), slicePart(id(7), { name: null, safety: true }), slicePart(id(8))],
    labels: async (recordKeys, moveIds, contextIds) => {
      calls.labels.push({ recordKeys, moveIds, contextIds });
      return { records: new Map(recordKeys.map((k) => [k, ['Hide away']])), contexts: new Map([['ctx_event_leaving', 'someone pulls away']]) };
    },
    patterns: async () => [
      { id: 'trail_move_in_context:hide:ctx_event_leaving', ruleId: 'trail_move_in_context', shape: 'A', pullIds: ['hide'], contextId: 'ctx_event_leaving' },
      { id: 'trail_move_in_context:chase:ctx_event_leaving', ruleId: 'trail_move_in_context', shape: 'A', pullIds: ['chase'], contextId: 'ctx_event_leaving' },
    ],
    phrases: async (moveIds) => ({ moves: new Map(moveIds.filter((m) => m === 'hide').map((m) => [m, 'hide'])), context: 'someone pulls away' }),
    ...over,
  };
  return { deps, calls };
}

test('getReflectTrails: two parts at most, rows as labels by time, the episode named by a record id (never the uid)', async () => {
  const { deps, calls } = readDeps();
  const r = await V.getReflectTrailsHandler(deps, NOW);
  assert.deepEqual(r.reviews.map((b) => b.partId), [PID, id(7)]);
  const [b, unnamed] = r.reviews;
  assert.deepEqual({ ...b, rows: undefined }, { partId: PID, template: 'Was this {name}?', name: 'Wren', firstPlace: 'chest', shapeSig: null, safety: false, rows: undefined });
  assert.deepEqual(b.rows.map((x) => x.episodeId), [id(1), id(2), id(3)], 'oldest first');
  assert.deepEqual(b.rows[0], { episodeId: id(1), at: ago(10), toolIds: ['opposite-action'], context: 'someone pulls away', sources: ['Hide away'] });
  assert.equal(unnamed.safety, true);
  assert.deepEqual(calls.labels[0].moveIds, ['hide']);
  assert.ok(!JSON.stringify(r).includes('u1:'), 'no record key, no uid');
  // The plain patterns: only those whose every phrase is signed off.
  assert.deepEqual(r.patterns, [{ offerId: 'trail_move_in_context:hide:ctx_event_leaving', shape: 'A', template: 'When {context}, the pull is to {pull}.', pulls: ['hide'], context: 'someone pulls away' }]);
});

test('getReflectTrails: the gate (but the weekly budget), offers, the rule and its sign-off; parts off is empty', async () => {
  const run = (over) => V.getReflectTrailsHandler(readDeps(over).deps, NOW);
  assert.equal((await run({ gate: async () => ({ open: false, reasons: ['budget'] }) })).reviews.length, 2, 'never a push: no budget');
  for (const reason of ['flooding', 'crisis', 'dissociation', 'harm', 'rule_off']) {
    const r = await run({ gate: async () => ({ open: false, reasons: ['budget', reason] }) });
    assert.equal(r.reviews.length, 0, reason);
    assert.equal(r.patterns.length, 1, `${reason}: the plain patterns aren't an offer`);
  }
  const policy = (p) => async () => ({ partsOn: true, offersEnabled: true, policy: {}, rules: RULES, ...p });
  assert.equal((await run({ policy: policy({ offersEnabled: false }) })).reviews.length, 0, 'offers off');
  assert.equal((await run({ policy: policy({ rules: [RULES[0], { ...RULES[1], enabled: false }] }) })).reviews.length, 0, 'rule off');
  assert.equal((await run({ policy: policy({ rules: [RULES[0], { ...RULES[1], approved: false }] }) })).reviews.length, 0, 'statement a draft');
  assert.equal((await run({ policy: policy({ rules: [{ ...RULES[0], approved: false }, RULES[1]] }) })).patterns.length, 0, 'pattern statement a draft');
  assert.deepEqual(await run({ policy: policy({ partsOn: false }) }), { reviews: [], patterns: [] });
  // A candidate for a part the slice doesn't give (set aside since) is dropped.
  assert.deepEqual((await run({ parts: async () => [slicePart(id(8))] })).reviews.map((b) => b.partId), [id(8)]);
  // The engine is asked with the review batches' blocks.
  const { deps, calls } = readDeps({ offers: async () => [{ ruleId: 'trail_known_part', moveIds: ['hide'], contextId: null, partId: PID, status: 'answered', answer: 'done', cooldownUntil: iso(NOW.getTime() + DAY), noKeys: [key(1)] }] });
  await V.getReflectTrailsHandler(deps, NOW);
  assert.deepEqual(calls.candidates[0][0].recordKeys, [key(1)]);
});

// ------------------------------------------------------------------ answerKnownPartReview

test('validateKnownPartReview: uuids, the three answers, Done / Not now, one answer per row, nothing else', () => {
  const ok = { id: RID, partId: PID, close: 'done', rows: [{ episodeId: id(1), answer: 'yes' }] };
  assert.deepEqual(V.validateKnownPartReview(ok), ok);
  assert.deepEqual(V.validateKnownPartReview({ id: RID, partId: PID, close: 'not_now' }).rows, []);
  for (const bad of [
    { ...ok, close: 'later' }, { ...ok, rows: [{ episodeId: id(1), answer: 'maybe' }] }, { ...ok, partId: 'p1' },
    { ...ok, rows: [{ episodeId: id(1), answer: 'yes' }, { episodeId: id(1), answer: 'no' }] },
    { ...ok, uid: 'u2' }, { ...ok, rows: [{ episodeId: id(1), answer: 'yes', recordKey: 'u2:x' }] },
    { ...ok, rows: Array.from({ length: V.REVIEW_MAX_ROWS + 1 }, (_, i) => ({ episodeId: id(i + 1), answer: 'yes' })) },
  ]) assert.throws(() => V.validateKnownPartReview(bad), /./, JSON.stringify(bad).slice(0, 80));
});

function answerDeps(over = {}) {
  const calls = { write: [], tag: [] };
  const evidence = [1, 2, 3].map((n) => ({ at: ago(10 - n), toolIds: ['opposite-action'], recordKeys: n === 3 ? [key(3), key(4)] : [key(n)], moveIds: ['hide', 'zone_out'], contextIds: [] }));
  const deps = {
    state: async () => ({ partsOn: true, exists: false }),
    offers: async () => [],
    eligible: async () => ({ ruleId: 'trail_known_part', cooldownDays: null, part: { id: PID, moveIds: ['hide'] }, evidence }),
    write: async (trail, review) => { calls.write.push({ trail, review }); return true; },
    tag: async (partId, keys) => { calls.tag.push({ partId, keys }); return keys.length; },
    ...over,
  };
  return { deps, calls };
}
const input = (rows, close = 'done') => ({ id: RID, partId: PID, close, rows });

test('answerKnownPartReview: Yes tags each record of its moment, No is kept, Not sure nothing; the cooldown is 14 days', async () => {
  const { deps, calls } = answerDeps();
  const res = await V.answerKnownPartReviewHandler(input([
    { episodeId: id(1), answer: 'yes' }, { episodeId: id(4), answer: 'yes' }, { episodeId: id(2), answer: 'no' },
  ]), deps, NOW);
  assert.deepEqual(res, { id: RID, created: true, tagged: 3 });
  const { trail, review } = calls.write[0];
  assert.deepEqual(review, { id: RID, close: 'done', cooldownDays: 14, noKeys: [key(2)], yesKeys: [key(1), key(3), key(4)] });
  assert.deepEqual(trail.moveIds, ['hide'], 'only the part\'s own moves');
  assert.equal(trail.partId, PID);
  assert.deepEqual(calls.tag, [{ partId: PID, keys: [key(1), key(3), key(4)] }]);

  const notNow = answerDeps();
  assert.deepEqual(await V.answerKnownPartReviewHandler(input([{ episodeId: id(1), answer: 'not_sure' }], 'not_now'), notNow.deps, NOW), { id: RID, created: true, tagged: 0 });
  assert.equal(notNow.calls.tag.length, 0, 'no Yes, no tag write');
  assert.deepEqual(notNow.calls.write[0].review, { id: RID, close: 'not_now', cooldownDays: 14, noKeys: [], yesKeys: [] });
  const ruled = answerDeps({ eligible: async () => ({ ...(await answerDeps().deps.eligible()), cooldownDays: 21 }) });
  await V.answerKnownPartReviewHandler(input([]), ruled.deps, NOW);
  assert.equal(ruled.calls.write[0].review.cooldownDays, 21, 'the rule\'s own cooldown');
});

test('answerKnownPartReview: parts off, a repeat, a part cooling down, not their part, a stale row', async () => {
  const run = (over, rows = []) => V.answerKnownPartReviewHandler(input(rows), answerDeps(over).deps, NOW);
  await assert.rejects(run({ state: async () => ({ partsOn: false, exists: false }) }), code('failed-precondition'));
  const repeat = answerDeps({ state: async () => ({ partsOn: true, exists: true }) });
  assert.deepEqual(await V.answerKnownPartReviewHandler(input([{ episodeId: id(1), answer: 'yes' }]), repeat.deps, NOW), { id: RID, created: false, tagged: 0 });
  assert.equal(repeat.calls.write.length + repeat.calls.tag.length, 0);
  const cooling = [{ ruleId: 'trail_known_part', moveIds: ['hide'], contextId: null, partId: PID, status: 'answered', answer: 'done', cooldownUntil: iso(NOW.getTime() + DAY), noKeys: [] }];
  await assert.rejects(run({ offers: async () => cooling }), code('failed-precondition'));
  await assert.rejects(run({ eligible: async () => ({ ruleId: 'trail_known_part', cooldownDays: 14, part: null, evidence: [] }) }), code('not-found'));
  await assert.rejects(run({}, [{ episodeId: id(9), answer: 'yes' }]), code('failed-precondition'), 'not one of the part\'s moments now');
  await assert.rejects(run({}, [{ episodeId: id(3), answer: 'yes' }, { episodeId: id(4), answer: 'no' }]), code('invalid-argument'), 'two answers for one moment');
  await assert.rejects(run({ write: async () => false }), code('failed-precondition'));
});

test('the review batch record: one writer, answered at once, no offeredAt (outside the weekly budget), the part matched only', () => {
  const q = R.WRITE_KNOWN_PART_REVIEW_QUERY;
  assert.match(q, /MERGE \(o:TrailOffer \{key: \$key\}\)\s+ON CREATE SET o:UserData:LogRecord, o\.id = \$id, o\.ownerId = \$uid/);
  assert.match(q, /NOT EXISTS \{ MATCH \(:TrailOffer \{key: \$key\}\) \}/, 'create once');
  assert.match(q, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART\]->\(pt:Part \{key: \$partKey\}\)\s+WHERE coalesce\(u\.partsEnabled, false\) AND pt\.status IN \['active', 'resting'\]/);
  assert.match(q, /o\.status = 'answered', o\.answer = \$close/);
  assert.match(q, /o\.cooldownUntil = datetime\(\) \+ duration\(\{days: \$cooldownDays\}\), o\.noKeys = \$noKeys, o\.yesKeys = \$yesKeys/);
  assert.doesNotMatch(q, /offeredAt/);
  assert.doesNotMatch(q, /SET pt\.|pt \+=/, 'the Part is never written');
  assert.match(q, /OPTIONAL MATCH \(r:LogRecord \{ownerId: \$uid\}\) WHERE r\.key IN \$evidenceKeys/);
  const p = R.knownPartReviewParams('u1', { ruleId: 'trail_known_part', moveIds: ['hide', 'chase', 'hide'], partId: PID, evidence: [{ at: ago(1), toolIds: [], recordKeys: [key(2), key(1)], moveIds: [], contextIds: [] }] },
    { id: RID, close: 'done', cooldownDays: 14, noKeys: [key(2)], yesKeys: [] });
  assert.equal(p.key, `u1:${RID}`);
  assert.equal(p.partKey, `u1:${PID}`);
  assert.deepEqual(p.moveIds, ['chase', 'hide']);
  assert.deepEqual(p.evidenceKeys, [key(1), key(2)]);
  assert.equal(p.cooldownDays.toNumber(), 14);
});

test('the review tags: own records only, never an open session or Meet a part, once per record per source', () => {
  const q = V.REVIEW_TAGS_QUERY;
  assert.match(q, /MERGE \(t:PartTag \{key: tag\.key\}\)\s+ON CREATE SET t:UserData:LogRecord, t\.id = tag\.id, t\.ownerId = \$uid/);
  assert.match(q, /WHERE r\.ownerId = \$uid AND NOT \(r:ToolSession AND \(r\.status = 'open' OR r\.toolId IN \$never\)\)/);
  assert.match(q, /NOT EXISTS \{ MATCH \(:PartTag \{taggedKey: tag\.taggedKey\}\) \}/);
  assert.match(q, /t\.source = 'review'/);
  assert.match(q, /pt\.status IN \['active', 'resting'\]/);
  assert.match(V.REVIEW_LABELS_QUERY, /WHERE r\.key IN \$recordKeys AND r\.ownerId = \$uid/);
  assert.match(V.REVIEW_LABELS_QUERY, /x\.reviewStatus = 'approved'/);
  assert.doesNotMatch(V.REVIEW_LABELS_QUERY + V.PLAIN_PATTERNS_QUERY, /dataJson|ownWords|\.own[A-Z]|anchorOwn/, 'no own words');
});

test('answerKnownPartReview through the callable: own batch key, own part, review tags with a record\'s taggedKey', async () => {
  const f = fakeDriver((q, p) => {
    if (/AS exists/.test(q)) return [record({ partsOn: true, exists: false })];
    if (/RETURN o.id AS id/.test(q) && /ABOUT_PART/.test(q)) return [record({ id: p.id })];
    if (/RETURN count\(t\) AS n/.test(q)) return [record({ n: p.tags.length })];
    return [];
  });
  setDriver(f.driver);
  // No trail state in the fake graph: nothing is the caller's part, so the answer is refused before any write.
  await assert.rejects(fns.answerKnownPartReview.run({ auth: auth(), data: input([]) }), code('not-found'));
  assert.ok(f.calls.every((c) => (c.params.uid ?? 'u1') === 'u1'));
  assert.ok(!f.calls.some((c) => /MERGE \(o:TrailOffer/.test(c.query)), 'nothing written');
  assert.ok(f.allClosed());
  await assert.rejects(fns.answerKnownPartReview.run({ auth: auth(), data: { ...input([]), close: 'later' } }), code('invalid-argument'));
});

// ------------------------------------------------------------------ the plain patterns' ×

test('removeTrailPattern: a how-it-goes trail of the caller\'s, once, under its guard', async () => {
  const deps = (st, removed = true) => ({ state: async () => ({ partsOn: true, found: true, answer: 'how_it_goes', removed: false, ...st }), remove: async () => removed });
  const oid = 'trail_move_in_context:hide:ctx_event_leaving';
  assert.deepEqual(await V.removeTrailPatternHandler({ offerId: oid }, deps({})), { offerId: oid, removed: true });
  assert.deepEqual(await V.removeTrailPatternHandler({ offerId: oid }, deps({ removed: true })), { offerId: oid, removed: false }, 'a repeat');
  await assert.rejects(V.removeTrailPatternHandler({ offerId: oid }, deps({ answer: 'not_me' })), code('failed-precondition'));
  await assert.rejects(V.removeTrailPatternHandler({ offerId: oid }, deps({ found: false })), code('not-found'));
  await assert.rejects(V.removeTrailPatternHandler({ offerId: oid }, deps({ partsOn: false })), code('failed-precondition'));
  assert.throws(() => V.validateRemovePattern({ offerId: 'u2:x' }));
  assert.throws(() => V.validateRemovePattern({ offerId: oid, uid: 'u2' }));
  assert.match(V.REMOVE_PATTERN_QUERY, /MATCH \(:User \{id: \$uid\}\)-\[:HAS_TRAIL_OFFER\]->\(o:TrailOffer \{key: \$key\}\)/);
  assert.ok(V.REMOVE_PATTERN_QUERY.includes(`WHERE ${GUARDS.TrailOffer.removePattern('o')}\n  SET o.patternRemovedAt = datetime()`));
  assert.equal(GUARDS.TrailOffer.removePattern('o'), "(o.status = 'answered' AND o.answer = 'how_it_goes' AND o.patternRemovedAt IS NULL)");
  assert.equal(writable('TrailOffer', 'removePattern', { status: 'answered', answer: 'how_it_goes' }), true);
  assert.equal(writable('TrailOffer', 'removePattern', { status: 'answered', answer: 'how_it_goes', patternRemovedAt: ago(1) }), false);
  assert.equal(writable('TrailOffer', 'removePattern', { status: 'answered', answer: 'not_me' }), false);
});

test('getReflectTrails through the callable: parts off reads no more and answers empty', async () => {
  const f = fakeDriver((q) => (/AS partsOn, coalesce\(pol\.offersEnabled/.test(q) ? [record({ partsOn: false, offersEnabled: true, policy: null, rules: [] })] : []));
  setDriver(f.driver);
  const data = await fns.getReflectTrails.run({ auth: auth(), data: {} });
  assert.deepEqual(data, { reviews: [], patterns: [] });
  assert.equal(f.calls.length, 1);
  assert.ok(f.allClosed());
});
