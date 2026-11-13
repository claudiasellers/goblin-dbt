'use strict';
/**
 * Words everywhere (ER-10 part 3, docs/design/emotion-guide.md): every save that records an accepted word writes
 * FOUND_WORD with its source, once per record and word (userdata/foundWords.ts). The check-in's words once its result
 * rendered, a tool close's in-visit picks under the tool id, Find the feeling's own save; never a one-shot record's
 * hand-off ids, never a finalised session, never twice for Find the feeling.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const isFound = (c) => /MERGE \(u\)-\[fw:FOUND_WORD\]->\(e\)/.test(c.query) && /MERGE \(r\)-\[f:FOUND\]->\(e\)/.test(c.query);
const checkIn = () => ({ id: ID, emotion: 'anxious', quadrant: 'high-unpleasant', intensity: { x: 0.3, y: 0.6 }, bodySensations: [], note: '', timestamp: new Date().toISOString() });

function checkInDriver({ open = true, emotions = ['anxious', 'hurt'] } = {}) {
  return fakeDriver((q, p) => {
    if (/AS open/.test(q)) return [{ open }];
    if (/MATCH \(e:Emotion\) WHERE e\.id IN \$raw/.test(q)) return [{ ids: p.raw.filter((x) => emotions.includes(x)) }];
    return [];
  });
}

function closeDriver({ open = true, toolId = 'opposite-action', closeKind = 'none' } = {}) {
  return fakeDriver((q) => {
    if (/AS open/.test(q)) return [{ open, closeKind, practiced: false, reps: [], toolId, followUps: [] }];
    if (/RETURN collect\(sp\.id\) AS ids/.test(q)) return [{ ids: [] }];
    return [];
  });
}

test('the query: once per record and word (a new FOUND edge only), reached by ownership, sources appended once', async () => {
  const f = checkInDriver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...checkIn(), emotionIds: ['anxious'], resultShown: true } });
  const q = f.calls.find(isFound).query;
  assert.match(q, /^MATCH \(u:User \{id: \$uid\}\)-\[:LOGGED\]->\(r:CheckIn \{key: \$key\}\)/, 'the caller\'s own record, never a bare key');
  assert.match(q, /MATCH \(e:Emotion \{id: eid\}\)\s+MERGE \(r\)-\[f:FOUND\]->\(e\)\s+ON CREATE SET f\.at = datetime\(\), f\.fresh = true\s+WITH u, e, f WHERE f\.fresh = true\s+REMOVE f\.fresh/,
    'only a new FOUND edge counts: a re-save, a replay or two racing saves count nothing more (MERGE locks the pair)');
  assert.match(q, /ON CREATE SET fw\.firstAt = datetime\(\), fw\.count = 0, fw\.ways = \[\], fw\.sources = \[\]/);
  assert.match(q, /fw\.count = fw\.count \+ 1/);
  assert.match(q, /WITH fw, coalesce\(fw\.sources, CASE WHEN size\(coalesce\(fw\.ways, \[\]\)\) > 0 THEN \['find-the-feeling'\] ELSE \[\] END\) AS before/,
    'an edge from before sources was Find the feeling\'s: it keeps that source');
  assert.match(q, /fw\.sources = CASE WHEN \$source IN before THEN before ELSE before \+ \$source END/);
  assert.doesNotMatch(q, /MERGE \(e:Emotion|CREATE \(e:Emotion/, 'never creates a content node');
});

test('the check-in: its known words once the result rendered, source checkin; nothing before, nothing once finalised', async () => {
  let f = checkInDriver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...checkIn(), emotionIds: ['anxious', 'hurt', 'not_an_emotion', 'anxious'], resultShown: true } });
  const found = f.calls.find(isFound);
  assert.deepEqual(found.params.ids, ['anxious', 'hurt'], 'known ids only, once each');
  assert.equal(found.params.source, 'checkin');
  assert.equal(found.params.key, `u1:${ID}`);
  assert.match(f.calls.at(-1).query, /SET c\.emotion = \$emotion/, 'the result write stays last');
  f = checkInDriver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...checkIn(), emotionIds: ['anxious'] } });
  assert.ok(!f.calls.some(isFound), 'a save before the result renders finds nothing yet');
  f = checkInDriver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...checkIn(), emotionIds: [], resultShown: true } });
  assert.ok(!f.calls.some(isFound), 'no words, no query');
  f = checkInDriver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...checkIn(), source: 'ftf', emotionIds: ['anxious'], resultShown: true } });
  assert.ok(!f.calls.some(isFound), 'a word found in Find the feeling inside the check-in was counted by that save');
  f = checkInDriver({ open: false });
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...checkIn(), emotionIds: ['anxious'], resultShown: true } });
  assert.ok(!f.calls.some(isFound), 'finalised: nothing written');
});

test('a tool close: the words picked in the visit, under the tool id', async () => {
  for (const toolId of ['opposite-action', 'invalidation-recovery', 'emotion-guide', 'cope-ahead']) {
    const f = closeDriver({ toolId });
    setDriver(f.driver);
    await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', emotionIds: ['hurt', 'hurt', 'anxious'] } });
    const found = f.calls.find(isFound);
    assert.ok(found, toolId);
    assert.match(found.query, /^MATCH \(u:User \{id: \$uid\}\)-\[:HAS_TOOL_SESSION\]->\(r:ToolSession \{key: \$key\}\)/);
    assert.deepEqual([found.params.ids, found.params.source, found.params.key], [['hurt', 'anxious'], toolId, `u1:${ID}`], toolId);
  }
});

test('a tool close finds nothing: no picks, a finalised session, Find the feeling (its own save writes it)', async () => {
  let f = closeDriver();
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed' } });
  assert.ok(!f.calls.some(isFound), 'no picks');
  f = closeDriver({ open: false });
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', emotionIds: ['hurt'] } });
  assert.ok(!f.calls.some(isFound), 'finalised');
  f = closeDriver({ toolId: 'find-the-feeling', closeKind: 'regulation_down' });
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', emotionIds: ['hurt'] } });
  assert.ok(!f.calls.some(isFound), 'Find the feeling is counted once, by its own save');
});

test('a one-shot record never counts its hand-off ids (the check-in already did)', async () => {
  const f = fakeDriver((q) => {
    if (/RETURN tu\.id AS toolUsageId/.test(q)) return [{ toolUsageId: `${ID}:usage` }];
    if (/AS open/.test(q)) return [{ open: true, closeKind: 'none', practiced: false, reps: [], toolId: 'micro-step', followUps: [] }];
    return [{ ids: [] }];
  });
  setDriver(f.driver);
  await fns.recordToolSession.run({ auth: auth(), data: { id: ID, toolId: 'micro-step', entry: 'checkin_result', status: 'completed', emotionIds: ['anxious'] } });
  assert.ok(!f.calls.some(isFound));
});

test('Find the feeling\'s own save records its source beside its ways', () => {
  const src = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../src/findTheFeeling/index.ts'), 'utf8');
  assert.match(src, /ON CREATE SET fw\.firstAt = datetime\(\), fw\.count = 0, fw\.ways = \[\], fw\.sources = \[\]/);
  assert.match(src, /fw\.sources = CASE WHEN 'find-the-feeling' IN coalesce\(fw\.sources, \[\]\) THEN fw\.sources\s+ELSE coalesce\(fw\.sources, \[\]\) \+ 'find-the-feeling' END/);
});

test('Find the feeling\'s shelf and harp stay the words shaped or tuned there (they have ways), not every named word', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.getFeelingCollection.run({ auth: auth(), data: {} });
  assert.match(f.calls[0].query, /MATCH \(:User \{id: \$userId\}\)-\[fw:FOUND_WORD\]->\(e:Emotion\)[\s\S]*WHERE size\(coalesce\(fw\.ways, \[\]\)\) > 0/);
});
