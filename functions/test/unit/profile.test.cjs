'use strict';
/** PR-P1: getProfileContext (single read path), item writes, pattern offers, getMe. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });

test('getProfileContext returns only the declared slices, with the profile version', async () => {
  const f = fakeDriver((q) => {
    if (/profileVersion/.test(q)) return [{ v: 7 }];
    if (/u\.displayName AS displayName/.test(q)) return [{ displayName: 'Claudia Sellers' }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'find-the-feeling' } });
  assert.deepEqual(out, { toolId: 'find-the-feeling', version: 7, slices: { name: { firstName: 'Claudia' } } });
  assert.ok(!f.calls.some((c) => /ProfileFact|MyPattern/.test(c.query)), 'no undeclared resolver ran');
  assert.equal(f.sessions.length, 1, 'one read transaction');
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  const empty = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'opposite-action' } });
  assert.deepEqual(empty.slices, {});
});

test('getProfileContext rejects unknown and server-only consumers', async () => {
  setDriver(fakeDriver(() => []).driver);
  for (const toolId of ['me', 'witness', 'nope', '__proto__']) {
    await assert.rejects(fns.getProfileContext.run({ auth: auth(), data: { toolId } }), (e) => e.code === 'invalid-argument', toolId);
  }
});

test('quiet hours slice (today) parses the fact and computes still-true', async () => {
  setDriver(fakeDriver((q) => (/ProfileFact \{kind: 'quiet_hours'/.test(q)
    ? [{ p: { id: 'quiet_hours', kind: 'quiet_hours', area: 'my_body', status: 'active', source: 'user', valueJson: '{"start":"22:00","end":"07:00"}', confirmedAt: '2026-01-01T00:00:00Z', revisitAt: '2026-02-01T00:00:00Z' } }]
    : /profileVersion/.test(q) ? [{ v: 1 }] : [])).driver);
  const out = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'today' } });
  assert.deepEqual([out.slices.quietHours.start, out.slices.quietHours.end, out.slices.quietHours.meta.prompt], ['22:00', '07:00', 'ask']);
});

test('upsertProfileFact: validated HH:MM, ProfileItem labels, revisit from the kind, version bumped', async () => {
  const f = fakeDriver(() => [{ version: 3 }]);
  setDriver(f.driver);
  assert.deepEqual(await fns.upsertProfileFact.run({ auth: auth(), data: { kind: 'quiet_hours', value: { start: '22:00', end: '07:00' } } }), { version: 3 });
  const q = f.calls[0];
  assert.match(q.query, /MERGE \(p:ProfileFact \{key: \$key\}\)[\s\S]*p:UserData:ProfileItem/);
  assert.match(q.query, /duration\(\{days: k\.revisitAfterDays\}\)/);
  assert.match(q.query, /u\.profileVersion = coalesce\(u\.profileVersion, 0\) \+ 1/);
  assert.equal(q.params.key, 'u1:quiet_hours');
  for (const bad of [{ kind: 'quiet_hours', value: { start: '25:00', end: '07:00' } }, { kind: 'quiet_hours', value: { start: '07:00', end: '07:00' } }, { kind: 'country', value: 'UK' }]) {
    await assert.rejects(fns.upsertProfileFact.run({ auth: auth(), data: bad }), (e) => e.code === 'invalid-argument');
  }
});

test('confirm / set aside / restore: whitelisted label, owner-scoped key, never a delete', async () => {
  const f = fakeDriver(() => [{ version: 4 }]);
  setDriver(f.driver);
  await fns.setAsideProfileItem.run({ auth: auth(), data: { id: 'quiet_hours', label: 'ProfileFact' } });
  await fns.confirmProfileItem.run({ auth: auth(), data: { id: 'x', label: 'MyPattern' } });
  assert.match(f.calls[0].query, /-\[:HAS_PROFILE_FACT\]->\(p:ProfileFact \{key: \$key\}\)[\s\S]*p\.status = 'set_aside'/);
  assert.match(f.calls[1].query, /-\[:HAS_PATTERN\]->\(p:MyPattern \{key: \$key\}\)[\s\S]*p\.revisitAt = CASE/);
  assert.ok(f.calls.every((c) => !/DELETE/.test(c.query)));
  await assert.rejects(fns.restoreProfileItem.run({ auth: auth(), data: { id: 'x', label: 'CheckIn' } }), (e) => e.code === 'invalid-argument');
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.restoreProfileItem.run({ auth: auth(), data: { id: 'x', label: 'MyPattern' } }), (e) => e.code === 'not-found');
});

test('answerPatternOffer yes: guarded, MyPattern ACCEPTED_FROM the offer; not now: cooldown; no: declined', async () => {
  let f = fakeDriver(() => [{ version: 5 }]);
  setDriver(f.driver);
  assert.deepEqual(await fns.answerPatternOffer.run({ auth: auth(), data: { id: 'what_helps_better:cool-down:acute_alarm', answer: 'yes' } }), { version: 5, status: 'accepted' });
  assert.match(f.calls[0].query, /WHERE o\.status = 'offered'[\s\S]*m:UserData:ProfileItem[\s\S]*m\.source = 'offer'[\s\S]*MERGE \(m\)-\[:ACCEPTED_FROM\]->\(o\)/);
  f = fakeDriver(() => [{ status: 'offered' }]);
  setDriver(f.driver);
  await fns.answerPatternOffer.run({ auth: auth(), data: { id: 'o1', answer: 'not_now' } });
  assert.match(f.calls[0].query, /cooldownUntil = CASE WHEN \$answer = 'not_now'/);
  assert.doesNotMatch(f.calls[0].query, /MyPattern/);
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.answerPatternOffer.run({ auth: auth(), data: { id: 'o1', answer: 'yes' } }), (e) => e.code === 'failed-precondition');
  await assert.rejects(fns.answerPatternOffer.run({ auth: auth(), data: { id: 'o1', answer: 'maybe' } }), (e) => e.code === 'invalid-argument');
});

test('getToday with every rule off evaluates nothing and writes nothing', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.getToday.run({ auth: auth(), data: {} });
  assert.ok(f.calls.some((c) => /MATCH \(p:PatternRule\)/.test(c.query)));
  assert.ok(!f.calls.some((c) => /PatternOffer \{key/.test(c.query) || /patternsEvaluatedAt = datetime\(\)/.test(c.query)));
});

test('getMe: areas with items (set-aside kept), found words read-only, stale count', async () => {
  setDriver(fakeDriver((q) => {
    if (/MATCH \(a:ProfileArea\)/.test(q)) return [{ id: 'my_body', label: 'My body', blurb: 'b', kinds: [{ id: 'quiet_hours', label: 'Quiet hours' }] }];
    if (/HAS_PROFILE_FACT\|HAS_PATTERN/.test(q)) return [{ label: 'ProfileFact', title: 'Quiet hours', stillTrue: 'Still?', setAside: 'Set aside.', statement: null,
      p: { id: 'quiet_hours', kind: 'quiet_hours', area: 'my_body', status: 'active', source: 'user', valueJson: '{"start":"22:00","end":"07:00"}', revisitAt: '2020-01-01T00:00:00Z' } }];
    if (/FOUND_WORD/.test(q)) return [{ emotionId: 'hurt', name: 'Hurt', count: 2 }];
    if (/displayName/.test(q)) return [{ displayName: 'C' }];
    if (/profileVersion/.test(q)) return [{ v: 2 }];
    return [];
  }).driver);
  const me = await fns.getMe.run({ auth: auth(), data: {} });
  assert.equal(me.staleCount, 1);
  assert.equal(me.areas[0].items[0].summary, '22:00–07:00');
  assert.equal(me.areas[0].items[0].editor, 'quiet_hours');
  assert.deepEqual(me.readOnly.foundWords, [{ emotionId: 'hurt', name: 'Hurt', count: 2 }]);
  assert.deepEqual([me.version, me.name.firstName], [2, 'C']);
});
