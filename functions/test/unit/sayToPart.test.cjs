'use strict';
/**
 * "Say something to it" (functions/src/parts/say.ts): sayToPart writes one PartMessage log record to the
 * caller's own active or resting part. Ownership, parts off, the limits (exactly one of a chip or own
 * words, ≤ 140, a chip of flow `say` and the gentle set for a tender part), finalise-once, and getMe's
 * latest-message line.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');
const S = require('../../lib/parts/say');
const { SAY_OWN_MAX } = require('../../lib/parts/sayTypes');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;

const MID = '9b1c2d3e-4f50-4a6b-8c7d-0e1f2a3b4c5d';
const PID = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const state = (o = {}) => ({ partsOn: true, partStatus: 'active', tender: false, repeat: false, chipStep: 'say', ...o });
const deps = (st, wrote = true) => {
  const calls = { state: 0, write: 0 };
  return {
    calls,
    d: {
      async state() { calls.state += 1; return st; },
      async write() { calls.write += 1; return wrote; },
    },
  };
};

test('validateSay: exactly one of chipId or own; own trimmed, ≤ 140, kept as written; nothing else accepted', () => {
  assert.deepEqual(S.validateSay({ id: MID, partId: PID, chipId: 'say_thanks' }), { id: MID, partId: PID, chipId: 'say_thanks', own: null });
  assert.deepEqual(S.validateSay({ id: MID, partId: PID, own: '  Thank you,\nreally  ' }), { id: MID, partId: PID, chipId: null, own: 'Thank you, really' });
  assert.equal(S.validateSay({ id: MID, partId: PID, own: 'x'.repeat(SAY_OWN_MAX) }).own.length, SAY_OWN_MAX);
  assert.equal(SAY_OWN_MAX, 140);
  for (const bad of [
    { id: MID, partId: PID },
    { id: MID, partId: PID, chipId: 'say_thanks', own: 'hi' },
    { id: MID, partId: PID, own: 'x'.repeat(SAY_OWN_MAX + 1) },
    { id: MID, partId: PID, own: '   ' },
    { id: MID, partId: PID, own: 4 },
    { id: MID, partId: PID, chipId: 'Say Thanks!' },
    { id: 'nope', partId: PID, chipId: 'say_thanks' },
    { id: MID, partId: 'nope', chipId: 'say_thanks' },
    { id: MID, partId: PID, chipId: 'say_thanks', uid: 'someone-else' },
  ]) assert.throws(() => S.validateSay(bad), JSON.stringify(bad));
});

test('sayToPartHandler: parts off is partsOff(); not the caller\'s active or resting part is not found; nothing written', async () => {
  const input = S.validateSay({ id: MID, partId: PID, chipId: 'say_thanks' });
  for (const [st, c] of [
    [state({ partsOn: false }), 'failed-precondition'],
    [state({ partStatus: null }), 'not-found'],
    [state({ partStatus: 'set_aside' }), 'not-found'],
  ]) {
    const { d, calls } = deps(st);
    await assert.rejects(S.sayToPartHandler(input, d), code(c));
    assert.equal(calls.write, 0);
  }
  const { d } = deps(state({ partsOn: false }));
  await assert.rejects(S.sayToPartHandler(input, d), (e) => /parts/i.test(e.message), 'the parts-off error');
});

test('sayToPartHandler: a chip of flow say; the gentle set for a tender part; own words anywhere', async () => {
  const chip = (id) => S.validateSay({ id: MID, partId: PID, chipId: id });
  const own = S.validateSay({ id: MID, partId: PID, own: 'I see you' });
  assert.deepEqual(await S.sayToPartHandler(chip('say_thanks'), deps(state()).d), { id: MID, created: true });
  assert.deepEqual(await S.sayToPartHandler(chip('say_here'), deps(state({ tender: true, chipStep: 'say_tender' })).d), { id: MID, created: true });
  await assert.rejects(S.sayToPartHandler(chip('say_rest'), deps(state({ tender: true, chipStep: 'say' })).d), code('invalid-argument'), 'a tender part: the gentle set only');
  await assert.rejects(S.sayToPartHandler(chip('say_here'), deps(state({ chipStep: 'say_tender' })).d), code('invalid-argument'));
  await assert.rejects(S.sayToPartHandler(chip('meet_back'), deps(state({ chipStep: null })).d), code('invalid-argument'), 'not a say chip');
  assert.deepEqual(await S.sayToPartHandler(own, deps(state({ tender: true, chipStep: null })).d), { id: MID, created: true }, 'own words to a tender part');
  assert.deepEqual(await S.sayToPartHandler(own, deps(state({ partStatus: 'resting', chipStep: null })).d), { id: MID, created: true }, 'a resting part');
});

test('sayToPartHandler: finalise-once: the same id again returns it and writes nothing; a stopped write is refused', async () => {
  const input = S.validateSay({ id: MID, partId: PID, chipId: 'say_thanks' });
  const { d, calls } = deps(state({ repeat: true }));
  assert.deepEqual(await S.sayToPartHandler(input, d), { id: MID, created: false });
  assert.equal(calls.write, 0);
  await assert.rejects(S.sayToPartHandler(input, deps(state(), false).d), code('failed-precondition'));
});

test('the write: log layer on create, merged on key, edges out of the message only, guarded like the read', () => {
  assert.match(S.SAY_QUERY, /MERGE \(m:PartMessage \{key: \$key\}\)\s+ON CREATE SET m:UserData:LogRecord, m\.id = \$id, m\.ownerId = \$uid/);
  assert.match(S.SAY_QUERY, /m\.at = datetime\(\), m\.chipId = \$chipId, m\.own = \$own/);
  assert.match(S.SAY_QUERY, /MERGE \(u\)-\[:HAS_PART_MESSAGE\]->\(m\)/);
  assert.match(S.SAY_QUERY, /MERGE \(m\)-\[:TO_PART\]->\(pt\)/);
  assert.match(S.SAY_QUERY, /MATCH \(u\)-\[:HAS_PART\]->\(pt:Part \{key: \$partKey\}\)/, 'the caller\'s own part');
  assert.match(S.SAY_QUERY, /coalesce\(u\.partsEnabled, false\) AND pt\.status IN \['active', 'resting'\]/);
  assert.match(S.SAY_QUERY, /NOT EXISTS \{ MATCH \(:PartMessage \{key: \$key\}\) \}/, 'never reaches a finalised message');
  assert.doesNotMatch(S.SAY_QUERY, /SET pt\b|pt\.\w+ =|\(pt\)-\[/, 'nothing onto or out of the Part');
  assert.doesNotMatch(S.SAY_QUERY, /ON MATCH/);
  assert.match(S.SAY_STATE_QUERY, /\(o:PartOption \{id: \$chipId\}\) WHERE o\.flow = 'say'/);
});

test('sayToPart over the fake driver: keys carry the caller, never a client uid; parts off refuses', async () => {
  let params = null;
  const f = fakeDriver((q, p) => {
    if (q === S.SAY_STATE_QUERY) return [state()];
    if (q === S.SAY_QUERY) { params = p; return [{ id: MID }]; }
    return [];
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.sayToPart.run({ auth: auth('real-user'), data: { id: MID, partId: PID, chipId: 'say_thanks' } }), { id: MID, created: true });
  assert.deepEqual([params.uid, params.key, params.partKey, params.chipId, params.own], ['real-user', `real-user:${MID}`, `real-user:${PID}`, 'say_thanks', null]);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  assert.ok(f.allClosed());

  const g = fakeDriver((q) => (q === S.SAY_STATE_QUERY ? [state({ partsOn: false })] : []));
  setDriver(g.driver);
  await assert.rejects(fns.sayToPart.run({ auth: auth(), data: { id: MID, partId: PID, own: 'hi' } }), code('failed-precondition'));
  assert.ok(!g.calls.some((c) => c.query === S.SAY_QUERY));
  await assert.rejects(fns.sayToPart.run({ auth: auth(), data: { id: MID, partId: PID } }), code('invalid-argument'));
});

test('getMe: the latest message per part, through the caller\'s own edges, parts on only', () => {
  assert.match(S.LATEST_MESSAGES_QUERY, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART_MESSAGE\]->\(m:PartMessage\)-\[:TO_PART\]->\(pt:Part\)/);
  assert.match(S.LATEST_MESSAGES_QUERY, /coalesce\(u\.partsEnabled, false\) AND \(u\)-\[:HAS_PART\]->\(pt\)/);
  assert.match(S.LATEST_MESSAGES_QUERY, /ORDER BY m\.at DESC\s+WITH pt, collect\(m\)\[0\] AS m/);
  const me = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../src/profile/me.ts'), 'utf8');
  assert.match(me, /if \(partsOn\) \{\s+for \(const r of \(await tx\.run\(LATEST_MESSAGES_QUERY, \{ uid \}\)\)\.records\)/);
  assert.match(me, /meta\.status === 'active' \|\| meta\.status === 'resting'\) \? told\.get\(meta\.id\)/);
});
