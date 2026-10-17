'use strict';
/**
 * getPartStory (parts/story.ts, built in parts/storyBuild.ts): the handler over injected deps, then the
 * callable over the fake driver (ownership, parts off, a set-aside part, months only).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const ST = require('../../lib/parts/story');
const SQ = require('../../lib/parts/statsQueries');

test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;
const A = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const B = '5b2c9a0e-1b2c-4d5e-8f90-123456789abc';
const NOW = new Date('2026-10-17T12:00:00Z');

const ROWS = {
  timeZone: 'UTC',
  part: { id: A, createdAt: '2026-07-03T10:00:00Z', tender: false, status: 'active', jobIds: ['job_keep_safe'], ownJob: null, jobHistoryJson: null },
  revisits: [], snapshots: [],
  room: { parts: [{ id: A, name: 'Guard', status: 'active', tender: false, shapeSig: null, mapX: 0.3, mapY: 0.3, safety: false }], links: [] },
  stats: null,
};

test('getPartStory handler: parts off is nothing; not the caller\'s active or resting part is not found', async () => {
  assert.deepEqual(await ST.getPartStoryHandler({ partId: A }, { story: async () => ({ partsOn: false }) }, NOW), { moments: [], helped: [], links: [] });
  await assert.rejects(ST.getPartStoryHandler({ partId: A }, { story: async () => ({ partsOn: true, rows: null }) }, NOW), code('not-found'));
  const out = await ST.getPartStoryHandler({ partId: A }, { story: async () => ({ partsOn: true, rows: ROWS }) }, NOW);
  assert.deepEqual(out.moments, [{ kind: 'met', month: '2026-07' }]);
});

test('validateStoryRef: a part id only', () => {
  assert.deepEqual(ST.validateStoryRef({ partId: A }), { partId: A });
  assert.throws(() => ST.validateStoryRef({ partId: 'nope' }));
  assert.throws(() => ST.validateStoryRef({ partId: A, uid: 'u2' }));
});

test('getPartStory over the fake driver: the caller\'s own part by key, set-aside not found, parts off reads nothing else', async () => {
  const off = fakeDriver((q) => (q === SQ.STATS_USER_QUERY ? [{ partsOn: false, timeZone: null }] : new Error(`unexpected ${q}`)));
  setDriver(off.driver);
  assert.deepEqual(await fns.getPartStory.run({ auth: auth('u2'), data: { partId: A } }), { moments: [], helped: [], links: [] });
  assert.equal(off.calls.length, 1);
  assert.equal(off.sessions[0].config.defaultAccessMode, 'READ');

  // Someone else's part, or a set-aside one: STORY_PART_QUERY (status active or resting, through the caller's HAS_PART) finds nothing.
  const missing = fakeDriver((q) => {
    if (q === SQ.STATS_USER_QUERY) return [{ partsOn: true, timeZone: 'Europe/London' }];
    if (q === SQ.STATS_PARTS_QUERY) return [];
    if (q === ST.STORY_PART_QUERY) return [];
    return new Error(`unexpected ${q}`);
  });
  setDriver(missing.driver);
  await assert.rejects(fns.getPartStory.run({ auth: auth('u3'), data: { partId: B } }), code('not-found'));
  const p = missing.calls.find((c) => c.query === ST.STORY_PART_QUERY);
  assert.equal(p.params.partKey, `u3:${B}`);
  assert.match(ST.STORY_PART_QUERY, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART\]->\(pt:Part \{key: \$partKey\}\)\s+WHERE coalesce\(u\.partsEnabled, false\) AND pt\.status IN \['active', 'resting'\]/);

  const on = fakeDriver((q) => {
    if (q === SQ.STATS_USER_QUERY) return [{ partsOn: true, timeZone: 'America/Los_Angeles' }];
    if (q === SQ.STATS_PARTS_QUERY) return [{ id: A, name: 'Guard', status: 'active', firstPlace: null, shapeSig: null }];
    if (q === SQ.STATS_TAGS_QUERY || q === SQ.STATS_SESSIONS_QUERY) return [];
    if (q === ST.STORY_PART_QUERY) {
      return [{ id: A, createdAt: '2026-08-01T03:00:00Z', tender: false, status: 'resting', jobIds: ['job_b'], ownJob: null,
        jobHistoryJson: JSON.stringify([{ jobIds: ['job_a'], ownJob: null, until: '2026-09-10T10:00:00Z' }]) }];
    }
    if (q === ST.STORY_REVISITS_QUERY) return [{ at: '2026-09-10T10:00:00Z', answer: 'new' }, { at: '2026-10-02T10:00:00Z', answer: 'resting' }];
    if (q === ST.STORY_SNAPSHOTS_QUERY) return [];
    if (/HAS_DEN_SNAPSHOT/.test(q) && /AS snapshots/.test(q)) {
      return [{ parts: [{ id: A, name: 'Guard', status: 'resting', tender: false, shapeSig: null, mapX: 0.5, mapY: 0.5, lastVisitedAt: null, safety: false }], links: [], snapshots: [] }];
    }
    return new Error(`unexpected ${q}`);
  });
  setDriver(on.driver);
  const out = await fns.getPartStory.run({ auth: auth('u4'), data: { partId: A } });
  // Kept 1 Aug 03:00 UTC is still 31 July in Los Angeles: months in the person's own time zone.
  assert.deepEqual(out.moments.map((m) => [m.kind, m.month]), [['met', '2026-07'], ['job', '2026-09'], ['rested', '2026-10']]);
  assert.ok(on.calls.every((c) => c.params.uid === 'u4'));
  assert.doesNotMatch(JSON.stringify(out), /\d{4}-\d{2}-\d{2}/, 'no date reaches the client');
  await assert.rejects(fns.getPartStory.run({ auth: auth(), data: { partId: 'x' } }), code('invalid-argument'));
  await assert.rejects(fns.getPartStory.run({ data: { partId: A } }), code('unauthenticated'));
});
