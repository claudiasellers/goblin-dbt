'use strict';
/**
 * Trails (functions/src/parts/trails): episodes, the four rules' edges, exclusions, blocked keys,
 * ranking, thresholds read from the rule fields, and the query layer (approved-only, own records only,
 * no own-words property, no direct Part read). Everything here is read-only and switched off.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { record } = require('./fakeDriver.cjs');
const T = require('../../lib/parts/trails');

const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../tests/fixtures/parts-content.json'), 'utf8'));
const H = 3_600_000;
const D = 24 * H;
const NOW = Date.parse('2026-10-16T12:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();
/** Days before NOW, at 18:00 UTC (an evening in UTC). */
const day = (n, hour = 18) => Date.parse('2026-10-16T00:00:00.000Z') - n * D + hour * H;

// ---- content, as the graph has it (the fixture is generated from the same content.py) ----
const RULES = FIXTURE.trailRules.map((r) => T.ruleFrom(r));
const rule = (shape, over = {}) => ({ ...RULES.find((r) => r.shape === shape), enabled: true, approved: true, ...over });
const CONTEXTS = FIXTURE.contexts.map((c) => ({ id: c.id, key: c.key, value: c.value, phrase: c.phrase }));
const MOVES = [
  ...FIXTURE.moves.map((m) => ({ id: m.id, offerable: true, safetyLine: m.safetyLine === true, trailPhrase: m.trailPhrase })),
  { id: 'go_blank', offerable: false, safetyLine: false, trailPhrase: null },
  { id: 'zone_out', offerable: false, safetyLine: false, trailPhrase: null },
];
const PAIRS = FIXTURE.pairs.map((p) => ({ id: p.id, a: p.a, b: p.b }));
const ctx = (over = {}) => ({ moves: MOVES, pairs: PAIRS, contexts: CONTEXTS, parts: [], blocked: [], ...over });

let seq = 0;
/** An episode straight to the rules (moveToolIds: every tool expressed every move). */
function ep(atMs, moveIds, { trigger, event, timeBand = 'evening', tools = ['opposite-action'], tags = [] } = {}) {
  seq += 1;
  return {
    at: iso(atMs), endAt: iso(atMs), moveIds: [...moveIds].sort(),
    contexts: { ...(trigger ? { trigger } : {}), ...(event ? { event } : {}), timeBand },
    toolIds: tools, moveToolIds: Object.fromEntries(moveIds.map((m) => [m, tools])),
    recordKeys: [`u1:e${seq}`], taggedPartIds: tags, sources: [],
  };
}
const rec = (key, atMs, toolId, moveIds, contexts = {}, taggedPartIds = []) => ({
  key, at: iso(atMs), toolId, sources: moveIds.map((m) => ({ label: 'ActionUrge', id: `src_${m}` })), moveIds, contexts, taggedPartIds,
});
const policy = { episodeMergeHours: 2, louderPauseHours: 72 };

test('the rules read from content are the doc’s starting numbers, all switched off', () => {
  assert.deepEqual(RULES.map((r) => [r.id, r.shape, r.enabled]), [
    ['trail_move_in_context', 'A', false], ['trail_sequence', 'B', false], ['trail_two_pulls', 'C', false], ['trail_known_part', 'D', false],
  ]);
  const a = RULES[0];
  assert.deepEqual([a.minEpisodes, a.windowDays, a.minSpanDays, a.minTools, a.contextShare], [4, 42, 14, 2, 0.6]);
  assert.deepEqual([RULES[1].minEpisodes, RULES[1].withinHours, RULES[1].lift], [3, 24, 2]);
  assert.equal(FIXTURE.policy.offersEnabled, false);
  assert.equal(FIXTURE.policy.episodeMergeHours, 2);
});

// ---- Episodes ----

test('episodes: within 2 h of the FIRST record merge (2 h exactly is in, a millisecond more is out)', () => {
  const t0 = day(3);
  const { episodes } = T.buildEpisodes([
    rec('k1', t0, 'checkin', ['hide']), rec('k2', t0 + H, 'find-the-feeling', ['hide']), rec('k3', t0 + 2 * H, 'urge-surfing', ['chase']),
    rec('k4', t0 + 4 * H, 'checkin', ['hide']), rec('k5', t0 + 6 * H + 1, 'checkin', ['hide']),
  ], policy, null);
  assert.deepEqual(episodes.map((e) => e.recordKeys), [['k1', 'k2', 'k3'], ['k4'], ['k5']]);
  assert.deepEqual(episodes[0].moveIds, ['chase', 'hide']);
  assert.deepEqual(episodes[0].toolIds, ['checkin', 'find-the-feeling', 'urge-surfing']);
  assert.deepEqual(episodes[0].moveToolIds, { hide: ['checkin', 'find-the-feeling'], chase: ['urge-surfing'] });
  assert.equal(episodes[0].endAt, iso(t0 + 2 * H));
});

test('episodes: a busy day cannot chain (anchored to the first record, not the last)', () => {
  const t0 = day(3);
  const { episodes } = T.buildEpisodes([rec('a', t0, 'x', ['hide']), rec('b', t0 + 1.5 * H, 'x', ['hide']), rec('c', t0 + 3 * H, 'x', ['hide'])], policy, null);
  assert.deepEqual(episodes.map((e) => e.recordKeys), [['a', 'b'], ['c']]);
});

test('episodes: the merge window is the policy field', () => {
  const t0 = day(3);
  const recs = [rec('a', t0, 'x', ['hide']), rec('b', t0 + 3 * H, 'x', ['hide'])];
  assert.equal(T.buildEpisodes(recs, policy, null).episodes.length, 2);
  assert.equal(T.buildEpisodes(recs, { episodeMergeHours: 3 }, null).episodes.length, 1);
});

test('episodes: a no-move record lends its context; an episode with no move at all is dropped', () => {
  const t0 = day(3);
  const { episodes } = T.buildEpisodes([
    rec('ci', t0, 'checkin', [], { trigger: 'someone' }), rec('ftf', t0 + H, 'find-the-feeling', ['hide']),
    rec('lonely', t0 + 5 * H, 'checkin', [], { trigger: 'body' }),
  ], policy, null);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].contexts.trigger, 'someone');
  assert.deepEqual(episodes[0].recordKeys, ['ci', 'ftf']);
  assert.deepEqual(episodes[0].moveToolIds, { hide: ['find-the-feeling'] }, 'the check-in expressed nothing');
});

test('episodes: the first value per key wins and a disagreement is counted, never guessed', () => {
  const t0 = day(3);
  const out = T.buildEpisodes([
    rec('a', t0, 'x', ['hide'], { trigger: 'someone' }), rec('b', t0 + H, 'x', [], { trigger: 'situation', event: 'brushed' }),
    rec('c', t0 + 1.5 * H, 'x', [], { trigger: 'someone' }),
    // a dropped (no-move) episode's disagreement is not counted
    rec('d', t0 + 10 * H, 'x', [], { trigger: 'someone' }), rec('e', t0 + 11 * H, 'x', [], { trigger: 'body' }),
  ], policy, null);
  assert.deepEqual(out.episodes[0].contexts, { trigger: 'someone', event: 'brushed', timeBand: 'evening' });
  assert.equal(out.conflicts, 1);
});

test('episodes: unions of tags and sources, sorted in time order whatever the input order', () => {
  const t0 = day(3);
  const { episodes } = T.buildEpisodes([
    rec('b', t0 + H, 'x', ['hide'], {}, ['p2']), rec('a', t0, 'x', ['hide'], {}, ['p1', 'p2']),
  ], policy, null);
  assert.deepEqual(episodes[0].recordKeys, ['a', 'b']);
  assert.deepEqual(episodes[0].taggedPartIds, ['p1', 'p2']);
  assert.deepEqual(episodes[0].sources, [{ label: 'ActionUrge', id: 'src_hide' }]);
});

test('timeBand: the first record in User.timeZone (stats.ts bands), across a time zone and midnight', () => {
  const at = '2026-10-15T23:30:00.000Z';
  assert.equal(T.timeBandOf(at, null), 'night');
  assert.equal(T.timeBandOf(at, 'America/New_York'), 'evening'); // 19:30
  assert.equal(T.timeBandOf(at, 'Asia/Tokyo'), 'morning'); // 08:30 the next day
  assert.equal(T.timeBandOf('2026-10-16T04:59:00.000Z', 'UTC'), 'night');
  assert.equal(T.timeBandOf('2026-10-16T05:00:00.000Z', 'UTC'), 'morning');
  assert.equal(T.timeBandOf(at, 'Not/AZone'), 'night', 'an unknown zone reads as UTC');
  const { episodes } = T.buildEpisodes([rec('a', Date.parse(at), 'x', ['hide']), rec('b', Date.parse(at) + H, 'x', ['hide'])], policy, 'Asia/Tokyo');
  assert.equal(episodes[0].contexts.timeBand, 'morning');
  assert.deepEqual(Object.values(T.TIME_BANDS), CONTEXTS.filter((c) => c.key === 'timeBand').map((c) => c.value));
});

// ---- Rule A ----

/** n episodes of `move`, one a week back from 1 day ago, the first k carrying trigger `someone`. */
const weekly = (move, n, k, extra = {}) => Array.from({ length: n }, (_, i) => ep(day(1 + i * 7), [move], {
  trigger: i < k ? 'someone' : undefined, timeBand: ['morning', 'afternoon', 'evening', 'night'][i % 4],
  tools: [i % 2 ? 'find-the-feeling' : 'opposite-action'], ...extra,
}));

test('A: at every threshold it passes; one under on episodes, span, tools or share and it does not', () => {
  const A = rule('A');
  const spread = (last) => [
    ep(day(1), ['hide'], { trigger: 'someone', tools: ['find-the-feeling'] }), ep(day(5), ['hide'], { trigger: 'someone', timeBand: 'night' }),
    ep(day(10), ['hide'], { trigger: 'someone', tools: ['find-the-feeling'], timeBand: 'morning' }), ep(last, ['hide'], { timeBand: 'night' }),
  ];
  const four = spread(day(15));
  const [c] = T.evaluateTrails(four, [A], ctx(), NOW);
  assert.equal(c.ruleId, 'trail_move_in_context');
  assert.deepEqual([c.shape, c.moveIds, c.contextId, c.pairId, c.partId], ['A', ['hide'], 'ctx_trigger_someone', null, null]);
  assert.deepEqual(c.strength, { episodes: 4, spanDays: 14, tools: 2, share: 0.75 });
  assert.equal(c.evidence.length, 3, 'the evidence is the episodes in that situation');
  assert.deepEqual(c.evidence[0].contextIds.sort(), ['ctx_time_morning', 'ctx_trigger_someone'], 'oldest first');

  assert.deepEqual(T.evaluateTrails(four.slice(0, 3), [A], ctx(), NOW), [], '3 episodes');
  assert.equal(T.evaluateTrails(spread(day(15) + H), [A], ctx(), NOW).length, 0, 'span 13.96 days');
  const oneTool = weekly('hide', 4, 3, { tools: ['opposite-action'] });
  assert.equal(T.evaluateTrails(oneTool, [A], ctx(), NOW).length, 0, 'one tool');
  const half = weekly('hide', 4, 2).map((e, i) => ({ ...e, contexts: { ...e.contexts, timeBand: ['morning', 'afternoon', 'evening', 'night'][i] } }))
    .concat(ep(day(29), ['hide'], { timeBand: 'night', tools: ['opposite-action'] }));
  // 2 of 5 someone (0.4), night 2 of 5 (0.4): nothing reaches 0.6
  assert.equal(T.evaluateTrails(half, [A], ctx(), NOW).length, 0, 'share under');
  const sixty = half.map((e, i) => (i === 2 ? { ...e, contexts: { ...e.contexts, trigger: 'someone' } } : e));
  assert.equal(T.evaluateTrails(sixty, [A], ctx(), NOW)[0].strength.share, 0.6, '3 of 5 is exactly 0.6');
});

test('A: tools are the ones whose records expressed the move, not a check-in that rode along', () => {
  const eps = weekly('hide', 4, 4, { tools: ['opposite-action'] }).map((e) => ({ ...e, toolIds: ['opposite-action', 'checkin'] }));
  assert.equal(T.evaluateTrails(eps, [rule('A')], ctx(), NOW).length, 0);
});

test('A: the highest share wins; ties go trigger > event > timeBand, then the most recent', () => {
  const A = rule('A');
  const all = (extra) => weekly('hide', 4, 4).map((e) => ({ ...e, contexts: { ...e.contexts, ...extra } }));
  assert.equal(T.evaluateTrails(all({ event: 'ignored', timeBand: 'night' }), [A], ctx(), NOW)[0].contextId, 'ctx_trigger_someone');
  const noTrigger = all({ event: 'ignored', timeBand: 'night' }).map((e) => ({ ...e, contexts: { event: 'ignored', timeBand: 'night' } }));
  assert.equal(T.evaluateTrails(noTrigger, [A], ctx(), NOW)[0].contextId, 'ctx_event_ignored');
  const higher = weekly('hide', 4, 3).map((e) => ({ ...e, contexts: { ...e.contexts, timeBand: 'night' } }));
  assert.equal(T.evaluateTrails(higher, [A], ctx(), NOW)[0].contextId, 'ctx_time_night', '1.0 beats 0.75');
  // two timeBands at 0.5 each with contextShare 0.5: the more recent one
  const split = weekly('hide', 4, 0).map((e, i) => ({ ...e, contexts: { timeBand: i % 2 ? 'morning' : 'night' } }));
  assert.equal(T.evaluateTrails(split, [rule('A', { contextShare: 0.5 })], ctx(), NOW)[0].contextId, 'ctx_time_night');
});

test('A: never a non-offerable move; a safety-line move may be named and is flagged', () => {
  const A = rule('A');
  assert.deepEqual(T.evaluateTrails(weekly('go_blank', 4, 4), [A], ctx(), NOW), []);
  assert.deepEqual(T.evaluateTrails(weekly('mystery_move', 4, 4), [A], ctx(), NOW), [], 'an unknown move is not offerable');
  const [c] = T.evaluateTrails(weekly('turn_on_myself', 4, 4), [A], ctx(), NOW);
  assert.equal(c.safetyLine, true);
  assert.equal(T.evaluateTrails(weekly('hide', 4, 4), [A], ctx(), NOW)[0].safetyLine, false);
});

test('A: thresholds are the rule’s fields (changing one changes the result), the window included', () => {
  const three = weekly('hide', 3, 3);
  assert.equal(T.evaluateTrails(three, [rule('A')], ctx(), NOW).length, 0);
  assert.equal(T.evaluateTrails(three, [rule('A', { minEpisodes: 3 })], ctx(), NOW).length, 1);
  const old = weekly('hide', 4, 4).map((e, i) => (i === 3 ? { ...e, at: iso(day(43)) } : e));
  assert.equal(T.evaluateTrails(old, [rule('A')], ctx(), NOW).length, 0, 'an episode outside 42 days does not count');
  assert.equal(T.evaluateTrails(old, [rule('A', { windowDays: 60 })], ctx(), NOW).length, 1);
  assert.equal(T.evaluateTrails(weekly('hide', 4, 4), [{ ...rule('A'), enabled: false }], ctx(), NOW).length, 0, 'switched off finds nothing');
});

// ---- Rule B ----

/** An a-episode at day n 09:00, and (when `then`) a b-episode `gap` hours later. */
const pair = (n, a, b, gap = 5) => [ep(day(n, 9), [a]), ...(b ? [ep(day(n, 9) + gap * H, [b])] : [])];

test('B: 3 hits with a zero baseline pass, lift null (unbounded); 2 do not', () => {
  const B = rule('B');
  const eps = [...pair(2, 'hit_back', 'put_it_off'), ...pair(5, 'hit_back', 'put_it_off'), ...pair(8, 'hit_back', 'put_it_off')];
  const cands = T.evaluateTrails(eps, [B], ctx(), NOW);
  assert.deepEqual(cands.map((c) => c.moveIds), [['hit_back', 'put_it_off']]);
  assert.equal(cands[0].strength.lift, null);
  assert.equal(cands[0].strength.episodes, 3);
  assert.equal(cands[0].evidence.length, 6);
  assert.equal(T.evaluateTrails(eps.slice(0, 4), [B], ctx(), NOW).length, 0);
});

test('B: the follower must be a separate episode within withinHours', () => {
  const B = rule('B');
  const same = [2, 5, 8].map((n) => ep(day(n, 9), ['hit_back', 'put_it_off']));
  assert.equal(T.evaluateTrails(same, [B], ctx(), NOW).length, 0, 'both in one episode is no sequence');
  const late = [...pair(2, 'hit_back', 'put_it_off', 25), ...pair(5, 'hit_back', 'put_it_off', 25), ...pair(8, 'hit_back', 'put_it_off', 25)];
  assert.equal(T.evaluateTrails(late, [B], ctx(), NOW).length, 0, '25 h is too late');
  assert.equal(T.evaluateTrails(late, [rule('B', { withinHours: 26 })], ctx(), NOW).length, 1);
});

test('B: an a-episode counts once however many b-episodes follow it', () => {
  const eps = [2, 5].flatMap((n) => [ep(day(n, 9), ['hit_back']), ep(day(n, 9) + 3 * H, ['put_it_off']), ep(day(n, 9) + 6 * H, ['put_it_off'])]);
  assert.equal(T.evaluateTrails(eps, [rule('B')], ctx(), NOW).length, 0, '2 hits, 4 followers');
});

test('B: lift against episodes without a (exactly the field passes, under it does not)', () => {
  const hits = [2, 5, 8].flatMap((n) => pair(n, 'hit_back', 'put_it_off')); // p1 = 3 / 3
  // Baseline triples: two hide-episodes then one put_it_off-episode, all without hit_back: 2 of 3 followed.
  const triple = (n) => [ep(day(n, 9), ['hide']), ep(day(n, 9) + 3 * H, ['hide']), ep(day(n, 9) + 6 * H, ['put_it_off'])];
  const seq = (cands) => cands.find((c) => c.moveIds.join() === 'hit_back,put_it_off');
  // 3 triples: without-a = 3 (hits' b) + 9 = 12, followed 6 → p0 0.5 → lift 2.0
  const three = [...hits, ...[11, 14, 17].flatMap(triple)];
  assert.equal(seq(T.evaluateTrails(three, [rule('B')], ctx(), NOW)).strength.lift, 2);
  // 6 triples: without-a = 21, followed 12 → lift 1.75
  const six = [...hits, ...[11, 14, 17, 20, 23, 26].flatMap(triple)];
  assert.equal(seq(T.evaluateTrails(six, [rule('B')], ctx(), NOW)), undefined);
  assert.equal(seq(T.evaluateTrails(six, [rule('B', { lift: 1.75 })], ctx(), NOW)).strength.lift, 1.75, 'the field decides');
});

test('B: never a safety-line or non-offerable move, either side', () => {
  const B = rule('B');
  for (const [a, b] of [['turn_on_myself', 'hit_back'], ['hit_back', 'turn_on_myself'], ['go_blank', 'hide'], ['hide', 'zone_out']]) {
    const eps = [2, 5, 8].flatMap((n) => pair(n, a, b));
    assert.deepEqual(T.evaluateTrails(eps, [B], ctx(), NOW), [], `${a} → ${b}`);
  }
});

// ---- Rule C ----

test('C: both sides need minEpisodes in the same context; an episode with both counts for both', () => {
  const C = rule('C');
  const side = (move, n) => Array.from({ length: n }, (_, i) => ep(day(2 + i * 3, move === 'chase' ? 9 : 15), [move], { trigger: 'someone' }));
  const [c] = T.evaluateTrails([...side('chase', 3), ...side('hide', 3)], [C], ctx(), NOW);
  assert.deepEqual([c.shape, c.pairId, c.moveIds, c.contextId], ['C', 'chase_hide', ['chase', 'hide'], 'ctx_trigger_someone']);
  assert.equal(c.strength.episodes, 6);
  assert.equal(T.evaluateTrails([...side('chase', 3), ...side('hide', 2)], [C], ctx(), NOW).length, 0, 'one side short');
  const both = [2, 5, 8].map((n) => ep(day(n), ['chase', 'hide'], { trigger: 'someone' }));
  assert.equal(T.evaluateTrails(both, [C], ctx(), NOW)[0].pairId, 'chase_hide');
  const otherCtx = [...side('chase', 3), ...side('hide', 3).map((e) => ({ ...e, contexts: { trigger: 'situation', timeBand: 'night' } }))];
  assert.equal(T.evaluateTrails(otherCtx, [C], ctx(), NOW).filter((x) => x.contextId === 'ctx_trigger_someone').length, 0);
});

test('C: never a pair with a safety-line or non-offerable side', () => {
  const C = rule('C');
  const pairs = [{ id: 'p_safety', a: 'turn_on_myself', b: 'hide' }, { id: 'p_blank', a: 'go_blank', b: 'hide' }];
  const eps = ['turn_on_myself', 'go_blank', 'hide'].flatMap((m) => [2, 5, 8].map((n) => ep(day(n), [m], { trigger: 'someone' })));
  assert.deepEqual(T.evaluateTrails(eps, [C], ctx({ pairs }), NOW), []);
});

// ---- Rule D ----

const part = (over = {}) => ({ id: 'p1', status: 'active', moveIds: ['go_blank'], lastVisitedAt: iso(day(30)), pausedUntil: null, ...over });

test('D: untagged episodes after the last visit with any of the part’s moves (offerable or not)', () => {
  const Dr = rule('D');
  const eps = [2, 5, 8].map((n) => ep(day(n), ['go_blank', 'hide']));
  const [c] = T.evaluateTrails(eps, [Dr], ctx({ parts: [part()] }), NOW);
  assert.deepEqual([c.shape, c.partId, c.moveIds, c.contextId, c.pairId], ['D', 'p1', ['go_blank'], null, null]);
  assert.equal(c.strength.episodes, 3);
  assert.equal(T.evaluateTrails(eps.slice(0, 2), [Dr], ctx({ parts: [part()] }), NOW).length, 0, 'two episodes');
});

test('D: tagged episodes and episodes before the last visit do not count', () => {
  const Dr = rule('D');
  const tagged = [2, 5].map((n) => ep(day(n), ['go_blank'])).concat(ep(day(8), ['go_blank'], { tags: ['p2'] }));
  assert.equal(T.evaluateTrails(tagged, [Dr], ctx({ parts: [part()] }), NOW).length, 0, 'tagged with any part');
  const before = [2, 5, 8].map((n) => ep(day(n), ['go_blank']));
  assert.equal(T.evaluateTrails(before, [Dr], ctx({ parts: [part({ lastVisitedAt: iso(day(6)) })] }), NOW).length, 0);
  assert.equal(T.evaluateTrails(before, [Dr], ctx({ parts: [part({ lastVisitedAt: null, confirmedAt: iso(day(6)) })] }), NOW).length, 0, 'no visit: since it was kept');
  assert.equal(T.evaluateTrails(before, [Dr], ctx({ parts: [part({ lastVisitedAt: null })] }), NOW).length, 1, 'never visited or dated: all count');
});

test('D: a paused part (Louder) and a set-aside part are skipped; a pause that ended is not', () => {
  const Dr = rule('D');
  const eps = [2, 5, 8].map((n) => ep(day(n), ['go_blank']));
  assert.equal(T.evaluateTrails(eps, [Dr], ctx({ parts: [part({ pausedUntil: iso(NOW + H) })] }), NOW).length, 0);
  assert.equal(T.evaluateTrails(eps, [Dr], ctx({ parts: [part({ pausedUntil: iso(NOW - H) })] }), NOW).length, 1);
  assert.equal(T.evaluateTrails(eps, [Dr], ctx({ parts: [part({ status: 'set_aside' })] }), NOW).length, 0);
  assert.equal(T.evaluateTrails(eps, [Dr], ctx({ parts: [part({ status: 'resting' })] }), NOW).length, 1);
});

// ---- Blocked keys ----

test('blocked: forever and cooling block, expired does not; a blocked context lets another pass', () => {
  const A = rule('A');
  const eps = weekly('hide', 4, 4).map((e) => ({ ...e, contexts: { ...e.contexts, timeBand: 'night' } }));
  const key = (until) => ({ ruleId: A.id, moveIds: ['hide'], contextId: 'ctx_trigger_someone', partId: null, until });
  assert.equal(T.evaluateTrails(eps, [A], ctx(), NOW)[0].contextId, 'ctx_trigger_someone');
  assert.equal(T.evaluateTrails(eps, [A], ctx({ blocked: [key(null)] }), NOW)[0].contextId, 'ctx_time_night', 'forever');
  assert.equal(T.evaluateTrails(eps, [A], ctx({ blocked: [key(iso(NOW + D))] }), NOW)[0].contextId, 'ctx_time_night', 'cooling');
  assert.equal(T.evaluateTrails(eps, [A], ctx({ blocked: [key(iso(NOW - D))] }), NOW)[0].contextId, 'ctx_trigger_someone', 'expired');
  const both = [key(null), { ...key(null), contextId: 'ctx_time_night' }];
  assert.deepEqual(T.evaluateTrails(eps, [A], ctx({ blocked: both }), NOW), []);
  assert.equal(T.evaluateTrails(eps, [A], ctx({ blocked: [{ ...key(null), ruleId: 'other' }] }), NOW)[0].contextId, 'ctx_trigger_someone');
});

test('blocked: B by its ordered moves sorted, C by pair moves + context, D by part', () => {
  const eps = [2, 5, 8].flatMap((n) => pair(n, 'hit_back', 'put_it_off'));
  const B = rule('B');
  assert.equal(T.evaluateTrails(eps, [B], ctx({ blocked: [{ ruleId: B.id, moveIds: ['put_it_off', 'hit_back'], contextId: null, partId: null, until: null }] }), NOW).length, 0);
  const Dr = rule('D');
  const dEps = [2, 5, 8].map((n) => ep(day(n), ['go_blank']));
  const dBlock = { ruleId: Dr.id, moveIds: ['something_else'], contextId: null, partId: 'p1', until: null };
  assert.equal(T.evaluateTrails(dEps, [Dr], ctx({ parts: [part()], blocked: [dBlock] }), NOW).length, 0);
  assert.equal(T.isBlocked([dBlock], { ruleId: Dr.id, moveIds: ['go_blank'], contextId: null, partId: 'p2' }, NOW), false);
});

// ---- Ranking ----

test('ranking: A, D, C, B; then episodes; then the most recent evidence', () => {
  const mk = (shape, episodes, lastDay) => ({ ruleId: `r${shape}`, shape, moveIds: ['m'], contextId: null, pairId: null, partId: null,
    evidence: [{ at: iso(day(lastDay)), toolIds: [], recordKeys: [], moveIds: [], contextIds: [] }], strength: { episodes, spanDays: 0, tools: 1 }, safetyLine: false });
  const ranked = T.rankTrails([mk('B', 9, 1), mk('C', 9, 1), mk('D', 3, 9), mk('A', 4, 9), mk('A', 5, 20), mk('A', 4, 2)]);
  assert.deepEqual(ranked.map((c) => [c.shape, c.strength.episodes, c.evidence[0].at]), [
    ['A', 5, iso(day(20))], ['A', 4, iso(day(2))], ['A', 4, iso(day(9))], ['D', 3, iso(day(9))], ['C', 9, iso(day(1))], ['B', 9, iso(day(1))],
  ]);
});

test('statement: filled from the rule template with trailPhrase and the context phrase', () => {
  const [c] = T.evaluateTrails(weekly('hide', 4, 4), [rule('A')], ctx(), NOW);
  assert.equal(T.trailStatement(c, rule('A'), MOVES, CONTEXTS), "When it's about someone, the pull is to hide.");
  const b = { ...c, shape: 'B', moveIds: ['hit_back', 'put_it_off'], contextId: null };
  assert.equal(T.trailStatement(b, rule('B'), MOVES, CONTEXTS), 'After the pull to hit back, the pull to put it off often comes next.');
  assert.equal(T.trailStatement({ ...c, partId: 'p1' }, rule('D'), MOVES, CONTEXTS), 'Was this {name}?', 'no name: the gap shows');
});

// ---- The query layer ----

const fakeTx = (responder) => {
  const calls = [];
  return {
    calls,
    run: async (q, params = {}) => {
      calls.push({ q, params });
      return { records: (responder(q, params) || []).map((row) => record(row)) };
    },
  };
};

test('query: approved edges only, unless the dry run asks for drafts', async () => {
  assert.match(T.TRAIL_RECORDS_QUERY, /x\.reviewStatus = 'approved' OR \$drafts = true/);
  const tx = fakeTx(() => []);
  await T.readTrailRecords(tx, 'u1', { days: 42, drafts: false, contexts: CONTEXTS });
  assert.equal(tx.calls[0].params.drafts, false);
  const st = fakeTx((q) => (/AS partsOn/.test(q) ? [{ partsOn: false, timeZone: null }] : []));
  await T.readTrailState(st, 'u1', { now: NOW });
  assert.equal(st.calls.find((c) => c.q === T.TRAIL_RECORDS_QUERY).params.drafts, false, 'production default');
  const dr = fakeTx((q) => (/AS partsOn/.test(q) ? [{ partsOn: false, timeZone: null }] : []));
  await T.readTrailState(dr, 'u1', { now: NOW, drafts: true });
  assert.equal(dr.calls.find((c) => c.q === T.TRAIL_RECORDS_QUERY).params.drafts, true);
});

test('query: the caller’s own records only, finalised or closed, within the widest window', async () => {
  const q = T.TRAIL_RECORDS_QUERY;
  assert.match(q, /MATCH \(u:User \{id: \$uid\}\)/);
  for (const own of [/r\.ownerId = \$uid AND r\.status <> 'open'/, /d\.ownerId = \$uid AND d\.createdAt/, /r\.ownerId = \$uid AND r\.resultShownAt IS NOT NULL/, /\(r\)-\[:DETAIL\]->\(d\) WHERE d\.ownerId = \$uid/]) {
    assert.match(q, own);
  }
  assert.match(q, /\(u\)-\[:HAS_PART_TAG\]->\(t:PartTag\)-\[:TAGS\]->\(r\)/, 'tags through the caller');
  assert.equal(T.readDays(RULES), 42);
  assert.equal(T.readDays([]), 42);
  assert.equal(T.readDays([{ ...RULES[0], windowDays: 60 }]), 60);
});

test('query: reads only listed properties, and none is an own-words property', () => {
  const props = (q) => [...q.matchAll(/\b[a-z]\w*\.([A-Za-z]+)\b/g)].map((m) => m[1]);
  const read = new Set(props(T.TRAIL_RECORDS_QUERY));
  assert.deepEqual([...read].filter((p) => !T.TRAIL_READ_PROPERTIES.includes(p)), [], 'every property read is listed');
  for (const [name, q] of Object.entries(T).filter(([k, v]) => /_QUERY$/.test(k) && typeof v === 'string')) {
    const projected = [...q.matchAll(/[{,]\s*\.([A-Za-z]+)/g)].map((m) => m[1]);
    const bad = [...props(q), ...projected].filter((p) => T.OWN_WORDS_PROPERTIES.includes(p));
    assert.deepEqual(bad, [], `${name} reads own words`);
  }
  assert.deepEqual(T.TRAIL_READ_PROPERTIES.filter((p) => T.OWN_WORDS_PROPERTIES.includes(p)), []);
  // dataJson: only Find the feeling's (ids and enums only); OA's and DEAR MAN's hold own words.
  const dj = [...T.TRAIL_RECORDS_QUERY.matchAll(/(.{0,40})\b\w+\.dataJson/g)].map((m) => m[1]);
  assert.ok(dj.length > 0 && dj.every((pre) => /d:FindTheFeelingSession AND $/.test(pre)), 'dataJson only under d:FindTheFeelingSession');
  for (const p of ['note', 'describeCustom', 'anchorPhrase', 'ownVoice', 'text', 'name']) assert.ok(T.OWN_WORDS_PROPERTIES.includes(p), p);
  // Every own-words field the parts records hold, found the way the harm report's test finds them.
  const src = (f) => fs.readFileSync(path.resolve(__dirname, '../../src/parts', f), 'utf8');
  const own = new Set([...src('sessionTypes.ts').matchAll(/\b(own[A-Z]\w*)\??:/g), ...src('keep.ts').matchAll(/\bp\.(own[A-Z]\w*)\b/g)].map((m) => m[1]));
  assert.ok(own.has('ownVoice') && own.has('ownUpdate'));
  for (const p of own) assert.ok(T.OWN_WORDS_PROPERTIES.includes(p), `${p} is in OWN_WORDS_PROPERTIES`);
  for (const p of [...own, ...T.OWN_WORDS_PROPERTIES]) assert.doesNotMatch(T.TRAIL_RECORDS_QUERY, new RegExp(`\\.${p}\\b`), `.${p}`);
});

test('no direct Part read anywhere in trails/: claimed parts come through the profile slice', () => {
  const dir = path.resolve(__dirname, '../../src/parts/trails');
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.doesNotMatch(src, /:Part\b(?!Tag)/, `${f} matches a :Part`);
    assert.doesNotMatch(src, /HAS_PART\]/, `${f} walks HAS_PART`);
  }
  assert.match(fs.readFileSync(path.join(dir, 'queries.ts'), 'utf8'), /readProfileSlices\(tx, uid, 'today'/);
});

test('readTrailState: parts from the slice (last visit, pause), contexts only when a row phrases them', async () => {
  const tx = fakeTx((q) => {
    if (/AS partsOn/.test(q)) return [{ partsOn: true, timeZone: 'Europe/London' }];
    if (/MATCH \(t:TrailRule\)/.test(q)) return FIXTURE.trailRules.map((t) => ({ t }));
    if (/MATCH \(c:TrailContext\)/.test(q)) return CONTEXTS;
    if (/MATCH \(m:ProtectiveMove\)/.test(q)) return MOVES.map(({ id, offerable, safetyLine, trailPhrase }) => ({ id, offerable, safetyLine, trailPhrase }));
    if (/MATCH \(p:PolarityPair\)/.test(q)) return PAIRS;
    if (/PartsPolicy/.test(q)) return [{ episodeMergeHours: 3, louderPauseHours: 48, offersEnabled: false }];
    if (q === T.TRAIL_RECORDS_QUERY) return [
      { key: 'u1:a', at: iso(day(2)), toolId: 'find-the-feeling', trigger: 'nothing', event: null, sources: [{ label: 'FeelingUrge', id: 'hide' }, null], moveIds: ['hide', 'hide'], taggedPartIds: [] },
      { key: 'u1:b', at: iso(day(1)), toolId: 'recovering-from-invalidation', trigger: 'someone', event: 'brushed', sources: [], moveIds: [], taggedPartIds: ['p1'] },
      { key: 'u1:b', at: iso(day(1)), toolId: 'recovering-from-invalidation', trigger: 'someone', event: 'not_a_context', sources: [{ label: 'PullOption', id: 'recover_hide' }], moveIds: ['hide'], taggedPartIds: [] },
    ];
    if (/USES/.test(q)) return [{ p: { id: 'p1', kind: 'part', area: 'my_parts', status: 'resting', source: 'made', name: 'hidden',
      lastVisitedAt: '2026-10-01T00:00:00Z', pausedUntil: '2026-10-20T00:00:00Z', confirmedAt: '2026-09-01T00:00:00Z' }, moveIds: ['hide'] }];
    return [];
  });
  const s = await T.readTrailState(tx, 'u1', { now: NOW });
  assert.equal(s.timeZone, 'Europe/London');
  assert.deepEqual(s.policy, { episodeMergeHours: 3, louderPauseHours: 48 });
  assert.deepEqual(s.rules.map((r) => r.id), RULES.map((r) => r.id));
  assert.deepEqual(s.parts, [{ id: 'p1', status: 'resting', moveIds: ['hide'], lastVisitedAt: '2026-10-01T00:00:00Z', pausedUntil: '2026-10-20T00:00:00Z', confirmedAt: '2026-09-01T00:00:00Z' }]);
  assert.ok(!('name' in s.parts[0]), 'the rules never carry a name');
  assert.deepEqual(s.records, [
    { key: 'u1:a', at: iso(day(2)), toolId: 'find-the-feeling', sources: [{ label: 'FeelingUrge', id: 'hide' }], moveIds: ['hide'], contexts: {}, taggedPartIds: [] },
    { key: 'u1:b', at: iso(day(1)), toolId: 'recovering-from-invalidation', sources: [{ label: 'PullOption', id: 'recover_hide' }], moveIds: ['hide'],
      contexts: { trigger: 'someone', event: 'brushed' }, taggedPartIds: ['p1'] },
  ]);
  const run = T.trailsFromState(s, NOW, { allEnabled: true });
  assert.equal(run.episodes.length, 2);
  assert.deepEqual(run.candidates, [], 'two episodes are no trail');
  assert.ok(tx.calls.every((c) => !/\bCREATE\b|\bMERGE\b|\bSET\b|\bDELETE\b/.test(c.q)), 'read-only');
});

test('every source label the query names is a mapped EXPRESSES label, and every mapped label is read', () => {
  assert.deepEqual([...T.SOURCE_LABELS].sort(), Object.keys(FIXTURE.expresses).sort());
  for (const l of T.SOURCE_LABELS) assert.match(T.TRAIL_RECORDS_QUERY, new RegExp(`src:${l}\\b`), l);
});
