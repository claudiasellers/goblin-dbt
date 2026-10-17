'use strict';
/**
 * "This session's moves" (functions/src/parts/sessionMoves.ts), shared by queuePartCandidate's
 * toolSessionId and the trails records query. The predicate is evaluated here over a small in-memory
 * graph (a literal translation of its Cypher, null-safe like Cypher), so a Find the feeling visit, whose
 * pull lives only on its DETAIL session, is shown to give its move with no `urgeIds` at all.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sessionSourceMatch } = require('../../lib/parts/sessionMoves');
const C = require('../../lib/parts/candidate');
const TQ = require('../../lib/parts/trails/queries');

const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../tests/fixtures/parts-content.json'), 'utf8'));

/** The Cypher predicate as a JS function of (src, ts, d); nodes are { labels: [...], ...props } or null. */
function compile(cypher) {
  let js = cypher
    .replace(/([\w.]+) IN coalesce\(([\w.]+), \[\]\)/g, '($2 ?? []).includes($1)')
    .replace(/([\w.]+) CONTAINS \(([^)]*)\)/g, "String($1 ?? '').includes($2)")
    .replace(/\b(src|ts|d)\.(\w+)/g, '$1?.$2')
    .replace(/\b(src|ts|d):(\w+)/g, "has($1, '$2')")
    .replace(/ = /g, ' === ')
    .replace(/\bAND\b/g, '&&')
    .replace(/\bOR\b/g, '||');
  return new Function('src', 'ts', 'd', `const has = (n, l) => !!n && n.labels.includes(l); return !!(${js});`);
}
const match = compile(sessionSourceMatch('src', 'ts', 'd'));

/** Every EXPRESSES source in the content, with its move and review status. */
const SOURCES = Object.entries(FIXTURE.expresses).flatMap(([label, table]) =>
  Object.entries(table).map(([id, e]) => ({ node: { labels: [label], id, ...(label === 'PullOption' ? { flow: 'recover', pullId: id.replace(/^recover_/, '') } : {}) }, moveId: e.moveId, status: e.reviewStatus })));

/** The moves a visit gives: sources matching, through edges counted as `counted(status)`. */
const movesOf = (ts, d, counted = (s) => s === 'approved', sources = SOURCES) =>
  [...new Set(sources.filter((s) => counted(s.status) && match(s.node, ts, d)).map((s) => s.moveId))].sort();
const anyStatus = () => true;

const tool = (props = {}) => ({ labels: ['ToolSession'], status: 'completed', ...props });

test('Find the feeling: the DETAIL session\'s pull gives its move, with no urgeIds on the ToolSession', () => {
  const ts = tool({ toolId: 'find-the-feeling' });
  const ftf = { labels: ['FindTheFeelingSession'], pull: 'hide' };
  assert.deepEqual(movesOf(ts, ftf, anyStatus), [FIXTURE.expresses.FeelingUrge.hide.moveId]);
  // Every edge signed off 17 Oct (Claudia: ship it all): the approved edge counts; a draft one never does.
  assert.ok(SOURCES.every((s) => s.status === 'approved'), 'every edge approved');
  assert.deepEqual(movesOf(ts, ftf), ['hide'], 'approved edges count');
  const draftHide = SOURCES.map((s) => (s.node.labels[0] === 'FeelingUrge' && s.node.id === 'hide' ? { ...s, status: 'draft' } : s));
  assert.deepEqual(movesOf(ts, ftf, undefined, draftHide), [], 'a draft edge does not count');
  assert.deepEqual(movesOf(ts, { ...ftf, pull: 'chase' }, undefined, draftHide), [FIXTURE.expresses.FeelingUrge.chase.moveId], 'another pull\'s approved edge still does');
  assert.deepEqual(movesOf(ts, null, anyStatus), [], 'no DETAIL, no urgeIds: nothing');
});

test('every other session source still reads (urge ids, Recover, DEAR MAN, Problem Solve, a saved OA plan)', () => {
  assert.deepEqual(movesOf(tool({ urgeIds: ['anger-lash'] }), null, anyStatus), [FIXTURE.expresses.ActionUrge['anger-lash'].moveId]);
  assert.deepEqual(movesOf(tool({ urgeIds: ['chase'] }), null, anyStatus), [FIXTURE.expresses.FeelingUrge.chase.moveId], 'Urge Surfing');
  assert.deepEqual(movesOf(tool(), { labels: ['InvalidationRecoverySession'], pull: 'fight' }, anyStatus), [FIXTURE.expresses.PullOption.recover_fight.moveId]);
  assert.deepEqual(movesOf(tool(), { labels: ['DearManSession'], momentResponseIds: ['mr_left'], barriers: ['barrier_guilty'] }, anyStatus),
    [...new Set([FIXTURE.expresses.MomentResponse.mr_left.moveId, FIXTURE.expresses.DearManBarrier.barrier_guilty.moveId])].sort());
  assert.deepEqual(movesOf(tool({ ext: JSON.stringify({ er: { barrierSubId: 'person-scared-reaction' } }) }), null, anyStatus),
    [FIXTURE.expresses.BarrierSubResponse['person-scared-reaction'].moveId]);
  assert.deepEqual(movesOf(tool({ ext: JSON.stringify({ er: { barrierSubId: 'person-scared-reaction-not' } }) }), null, anyStatus), [], 'exact id only');
  assert.deepEqual(movesOf(tool(), { labels: ['OppositeActionSession'], urgeId: 'anger-lash' }, anyStatus), [FIXTURE.expresses.ActionUrge['anger-lash'].moveId]);
  // Ids only count on their own label: urge ids on a detail session, or a pull on the ToolSession, read nothing.
  assert.deepEqual(movesOf({ labels: ['CheckIn'], urgeIds: ['anger-lash'] }, null, anyStatus), []);
  assert.deepEqual(movesOf(tool({ pull: 'hide' }), null, anyStatus), []);
});

test('queuePartCandidate reads the same predicate over any owned DETAIL session, approved edges only', () => {
  const q = C.CANDIDATE_STATE_QUERY;
  assert.ok(q.includes(sessionSourceMatch('src', 'ts', 'd')), 'the shared predicate');
  assert.match(q, /OPTIONAL MATCH \(ts\)-\[:DETAIL\]->\(d\) WHERE d\.ownerId = \$uid/, 'any detail label, the caller\'s own');
  assert.match(q, /x\.reviewStatus = 'approved'/);
  assert.doesNotMatch(q, /\$drafts/, 'no drafts path in the app');
  assert.doesNotMatch(q, /InvalidationRecoverySession\)/, 'no longer Recover only');
});

test('the trails records query uses the same predicate', () => {
  assert.ok(TQ.TRAIL_RECORDS_QUERY.includes(sessionSourceMatch('src', 'r', 'd')));
});

test('no other server reader of "this session\'s moves" walks urgeIds on its own', () => {
  const src = path.resolve(__dirname, '../../src');
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const readers = walk(src).filter((f) => f.endsWith('.ts') && /\.urgeIds\b/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(src, f)).sort();
  // The spine validates and writes them; sessionMoves.ts is the one reader.
  assert.deepEqual(readers, ['parts/sessionMoves.ts', 'spine/toolSession.ts', 'spine/validation.ts']);
});
