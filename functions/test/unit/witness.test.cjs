'use strict';
/** A5-2: getWitnessLines (public; own lines + history when signed in) and recordWitnessBeat (auth, ownership, lifecycle). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const HOST = '0b9f3c1e-6d2a-4c8e-9f0a-1b2c3d4e5f60';
const OWN = '1c9f3c1e-6d2a-4c8e-9f0a-1b2c3d4e5f61';

const line = (id, level, specificity = 1) => ({
  line: { id, text: `text ${id}`, textNamed: null, level, kind: 'receive', voice: 'you', tentative: false, order: 0 },
  underneath: null, specificity,
});

test('getWitnessLines signed out: graph lines only, no user reads, fade 0', async () => {
  const f = fakeDriver((q) => (/MATCH \(l:ValidationLine \{status: 'live'\}\)/.test(q) ? [line('ci_fear_l4_1', 4, 1), line('ci_fear_l5_1', 5, 1)] : []));
  setDriver(f.driver);
  const out = await fns.getWitnessLines.run({ data: { hostToolId: 'checkin', moment: 'checkin_result', band: 'stirred', emotionIds: ['anxious'] } });
  assert.deepEqual(out.lines.map((l) => [l.id, l.level, l.source]), [['ci_fear_l4_1', 4, 'graph'], ['ci_fear_l5_1', 5, 'graph']]);
  assert.equal(out.fadeStage, 0);
  assert.equal(out.askLanded, true);
  assert.equal(out.firstName, null);
  assert.equal(out.version, 'witness-v1');
  assert.equal(f.calls.length, 1, 'only the content query');
  const p = f.calls[0].params;
  assert.deepEqual(p.levels.map(Number), [4, 5]);
  assert.equal(p.forOther, false);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
});

test('getWitnessLines signed in: reads own lines through the profile slices and the SHOWED_LINE history', async () => {
  const f = fakeDriver((q) => {
    if (/MATCH \(l:ValidationLine \{status: 'live'\}\)/.test(q)) return [line('ci_fear_l4_1', 4), line('ci_fear_l5_1', 5)];
    if (/u\.displayName AS displayName/.test(q)) return [{ displayName: 'Claudia Sellers' }];
    if (/HAS_OWN_LINE\]->\(o:OwnLine \{status: 'active'\}\)/.test(q)) {
      return [{ o: { id: OWN, kind: 'own_line', area: 'my_words', status: 'active', source: 'witness', text: 'I have been here before.', emotionIds: ['anxious'], situationId: null, moment: 'checkin_result', uses: 0, lastUsedAt: null, confirmedAt: '2026-10-01T00:00:00Z', revisitAt: null } }];
    }
    if (/SAVED_LINE\]->\(l:ValidationLine\)/.test(q)) return [];
    if (/count\(DISTINCT h\) AS serves/.test(q)) return [{ serves: 12, answers: 11, landedYes: ['ci_fear_l5_1', null] }];
    if (/RETURN collect\(ids\) AS recent/.test(q)) return [{ recent: [['ci_fear_l4_1']] }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getWitnessLines.run({ auth: auth(), data: { hostToolId: 'checkin', moment: 'checkin_result', band: 'steady', emotionIds: ['anxious'] } });
  assert.equal(out.firstName, 'Claudia');
  assert.equal(out.fadeStage, 2, 'first own line');
  assert.equal(out.askLanded, false, '11 answers, 13th beat');
  assert.deepEqual(out.lines.map((l) => l.id), [OWN, 'ci_fear_l5_1']);
  assert.equal(out.lines[0].source, 'own');
  for (const c of f.calls.filter((x) => /SHOWED_LINE/.test(x.query))) {
    assert.match(c.query, /MATCH \(:User \{id: \$uid\}\)-\[:LOGGED\|HAS_TOOL_SESSION\]->\(h\)/, 'only the caller\'s own host records');
    assert.equal(c.params.uid, 'u1');
  }
  assert.equal(f.sessions.length, 1, 'one read transaction');
});

test('getWitnessLines: flooded is one line, never asks; bad input is invalid-argument', async () => {
  setDriver(fakeDriver((q) => (/ValidationLine \{status/.test(q) ? [line('ci_flooded_1', 1, 0), line('ci_flooded_2', 2, 0)] : [])).driver);
  const out = await fns.getWitnessLines.run({ data: { hostToolId: 'checkin', moment: 'checkin_result', band: 'flooded' } });
  assert.equal(out.lines.length, 1);
  assert.equal(out.askLanded, false);
  await assert.rejects(fns.getWitnessLines.run({ data: { hostToolId: 'checkin', moment: 'checkin_result', band: 'loud' } }), (e) => e.code === 'invalid-argument');
});

const beat = (o = {}) => ({ hostKind: 'checkin', hostId: HOST, moment: 'checkin_result', band: 'stirred', shown: [{ lineId: 'ci_fear_l5_1', landed: null }], skipped: false, noneFit: false, ...o });

test('recordWitnessBeat: another user\'s (or a missing) host is not-found, nothing written', async () => {
  const f = fakeDriver((q) => (/RETURN h IS NOT NULL AS found/.test(q) ? [{ found: false, writable: false }] : []));
  setDriver(f.driver);
  await assert.rejects(fns.recordWitnessBeat.run({ auth: auth(), data: beat() }), (e) => e.code === 'not-found');
  assert.equal(f.calls.length, 1);
  const q = f.calls[0];
  assert.match(q.query, /MERGE \(u:User \{id: \$uid\}\)[\s\S]*OPTIONAL MATCH \(u\)-\[:LOGGED\]->\(h:CheckIn \{key: \$hostKey\}\)/);
  assert.equal(q.params.hostKey, `u1:${HOST}`, 'keyed by the caller\'s uid, never the id alone');
});

test('recordWitnessBeat: SHOWED_LINE on a writable check-in, guarded; landed set once', async () => {
  const f = fakeDriver((q) => (/AS found/.test(q) ? [{ found: true, writable: true }] : []));
  setDriver(f.driver);
  const out = await fns.recordWitnessBeat.run({ auth: auth(), data: beat({ shown: [{ lineId: 'ci_fear_l5_1', landed: 'yes' }] }) });
  assert.deepEqual(out, { logged: true });
  assert.match(f.calls[0].query, /pendingFullSave = true/, 'the CheckIn lifecycle guard decides writable');
  const w = f.calls[1];
  assert.match(w.query, /WHERE \(h\.pendingFullSave = true[\s\S]*MERGE \(h\)-\[r:SHOWED_LINE\]->\(l\)/);
  assert.match(w.query, /ON CREATE SET r\.at = datetime\(\), r\.moment = \$moment, r\.level = l\.level, r\.band = \$band/);
  assert.match(w.query, /r\.landed = coalesce\(r\.landed, s\.landed\)/);
  assert.deepEqual(w.params.shown, [{ lineId: 'ci_fear_l5_1', landed: 'yes' }]);
  assert.ok(!f.calls.some((c) => /profileVersion/.test(c.query)), 'a plain beat is not a profile write');
});

test('recordWitnessBeat: a finalised host takes no log edges, but own line and keep still save', async () => {
  const f = fakeDriver((q) => {
    if (/AS found/.test(q)) return [{ found: true, writable: false }];
    if (/SAVED_LINE/.test(q)) return [{ id: 'ci_fear_l5_1' }];
    if (/profileVersion/.test(q)) return [{ version: 9 }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.recordWitnessBeat.run({
    auth: auth(),
    data: beat({ keepLineId: 'ci_fear_l5_1', ownLine: { id: OWN, text: 'I have been here before.', emotionIds: ['anxious'] } }),
  });
  assert.deepEqual(out, { logged: false, ownLineId: OWN, profileVersion: 9 });
  assert.ok(!f.calls.some((c) => /SHOWED_LINE/.test(c.query)));
  const own = f.calls.find((c) => /MERGE \(o:OwnLine \{key: \$key\}\)/.test(c.query));
  assert.match(own.query, /ON CREATE SET o:UserData:ProfileItem[\s\S]*o\.kind = 'own_line'[\s\S]*o\.source = 'witness'/);
  assert.match(own.query, /MERGE \(u\)-\[:HAS_OWN_LINE\]->\(o\)/);
  assert.equal(own.params.key, `u1:${OWN}`);
  assert.equal(own.params.text, 'I have been here before.');
  const keep = f.calls.find((c) => /SAVED_LINE/.test(c.query));
  assert.match(keep.query, /\(l:ValidationLine \{id: \$lineId, status: 'live'\}\)[\s\S]*ON CREATE SET k\.confirmedAt = datetime\(\), k\.source = 'witness_keep'[\s\S]*SET k\.lastAt = datetime\(\)/);
});

test('recordWitnessBeat: own-line use counted once per host; tool-session hosts use HAS_TOOL_SESSION and their guard', async () => {
  const f = fakeDriver((q) => (/AS found/.test(q) ? [{ found: true, writable: true }] : []));
  setDriver(f.driver);
  await fns.recordWitnessBeat.run({ auth: auth(), data: beat({ hostKind: 'tool_session', shown: [], ownLineShownId: OWN }) });
  assert.match(f.calls[0].query, /-\[:HAS_TOOL_SESSION\]->\(h:ToolSession \{key: \$hostKey\}\)/);
  assert.match(f.calls[0].query, /h\.status = 'open' OR coalesce\(h\.endedAt, h\.startedAt\)/);
  const use = f.calls.find((c) => /o\.uses = coalesce\(o\.uses, 0\) \+ 1/.test(c.query));
  assert.match(use.query, /WHERE coalesce\(o\.lastHostKey, ''\) <> \$hostKey/);
  assert.equal(use.params.ownKey, `u1:${OWN}`);
});

test('recordWitnessBeat: a line can only be kept if it was shown; own-line text over 140 is rejected', async () => {
  setDriver(fakeDriver(() => [{ found: true, writable: true }]).driver);
  await assert.rejects(fns.recordWitnessBeat.run({ auth: auth(), data: beat({ keepLineId: 'other_line' }) }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.recordWitnessBeat.run({ auth: auth(), data: beat({ ownLine: { id: OWN, text: 'x'.repeat(141), emotionIds: [] } }) }), (e) => e.code === 'invalid-argument');
});

test('own lines are profile items: export and delete cover them through the registry', () => {
  const { USER_DATA, PROFILE_EDGES } = require('../../lib/userdata/layers.js');
  assert.deepEqual(USER_DATA.OwnLine, { layer: 'profile', rel: 'HAS_OWN_LINE', exportAs: 'ownLines' });
  assert.ok(PROFILE_EDGES.includes('SAVED_LINE'));
});

test('getMe lists own lines under My words (set aside, never deleted) and kept lines read-only', async () => {
  const f = fakeDriver((q) => {
    if (/HAS_PROFILE_FACT\|HAS_PATTERN\|HAS_OWN_LINE/.test(q)) {
      return [{ label: 'OwnLine', p: { id: OWN, kind: 'own_line', area: 'my_words', status: 'active', source: 'witness', text: 'I have been here before.' }, title: 'Lines in my own words', stillTrue: '', setAside: 'Set aside.', statement: null }];
    }
    if (/-\[k:SAVED_LINE\]->\(l:ValidationLine\)[\s\S]*l\.text AS text/.test(q)) return [{ lineId: 'ci_fear_l5_1', text: 'Of course you are scared.' }];
    if (/profileVersion/.test(q)) return [{ v: 2 }];
    return [];
  });
  setDriver(f.driver);
  const me = await fns.getMe.run({ auth: auth(), data: {} });
  assert.deepEqual(me.readOnly.savedLines, [{ lineId: 'ci_fear_l5_1', text: 'Of course you are scared.' }]);
  setDriver(fakeDriver(() => [{ version: 3 }]).driver);
  assert.deepEqual(await fns.setAsideProfileItem.run({ auth: auth(), data: { id: OWN, label: 'OwnLine' } }), { version: 3 });
});
