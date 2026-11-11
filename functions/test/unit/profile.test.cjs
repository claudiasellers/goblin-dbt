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
  const out = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'recovering-from-invalidation' } });
  assert.deepEqual(out, { toolId: 'recovering-from-invalidation', version: 7, slices: { name: { firstName: 'Claudia' } } });
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

test('dear-man reads parts (with shapeSig), kept lines (with text) and partAnchors, never partDetail', async () => {
  const f = fakeDriver((q) => {
    if (/profileVersion/.test(q)) return [{ v: 5 }];
    if (/AS text/.test(q) && /anchorLineId/.test(q)) return [{ partId: 'p1', text: 'breathe first' }, { partId: 'p2', text: null }];
    if (/\[:USES\]/.test(q)) return [{ p: { id: 'p1', kind: 'part', area: 'my_parts', status: 'active', source: 'made', name: 'the hider', shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5] }, moveIds: [] }];
    if (/SAVED_LINE/.test(q)) return [{ lineId: 'wit_l1', text: 'That sounds hard.', confirmedAt: '2026-10-01T00:00:00Z' }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'dear-man' } });
  assert.deepEqual(Object.keys(out.slices), ['parts', 'ownLines', 'savedLines', 'partAnchors', 'people']);
  assert.deepEqual(out.slices.partAnchors, { p1: 'breathe first' });
  assert.deepEqual(out.slices.parts[0].shapeSig, [0.1, 0.2, 0.3, 0.4, 0.5]);
  assert.deepEqual(out.slices.savedLines, [{ lineId: 'wit_l1', text: 'That sounds hard.', confirmedAt: '2026-10-01T00:00:00Z' }]);
  // The part safety seam reads fears inside its own boolean predicate; nothing else in the light slice does.
  const seam = require('../../lib/safety/partSafetyFlag').partSafetyCypher('p');
  assert.ok(!f.calls.some((c) => /GUARDS|fearIds/.test(c.query.replace(seam, ''))), 'no partDetail');
  // Parts off: the gated queries return nothing.
  setDriver(fakeDriver((q) => (/profileVersion/.test(q) ? [{ v: 5 }] : [])).driver);
  const off = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'dear-man' } });
  assert.deepEqual([off.slices.parts, off.slices.partAnchors], [[], {}]);
});

test('quiet hours slice (today) parses the fact and computes still-true', async () => {
  setDriver(fakeDriver((q) => (/ProfileFact \{kind: 'quiet_hours'/.test(q)
    ? [{ p: { id: 'quiet_hours', kind: 'quiet_hours', area: 'my_body', status: 'active', source: 'user', valueJson: '{"start":"22:00","end":"07:00"}', confirmedAt: '2026-01-01T00:00:00Z', revisitAt: '2026-02-01T00:00:00Z' } }]
    : /profileVersion/.test(q) ? [{ v: 1 }] : [])).driver);
  const out = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'today' } });
  assert.deepEqual([out.slices.quietHours.start, out.slices.quietHours.end, out.slices.quietHours.meta.prompt], ['22:00', '07:00', 'ask']);
});

test('upsertProfileFact: validated HH:MM, ProfileItem labels, revisit from the kind, version bumped', async () => {
  const f = fakeDriver((q) => (/RETURN count\(x\) AS n/.test(q) ? [{ n: 0 }] : [{ version: 3 }]));
  setDriver(f.driver);
  assert.deepEqual(await fns.upsertProfileFact.run({ auth: auth(), data: { kind: 'quiet_hours', value: { start: '22:00', end: '07:00' } } }), { version: 3 });
  const q = f.calls[1];
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

test('getMe: parts appear in my_parts only when parts are on; resting is not set aside', async () => {
  const part = (id, status, extra = {}) => ({ label: 'Part', title: 'A part', stillTrue: 'Is {name} still doing the same job?', setAside: 'Set aside.', statement: null, moveIds: [],
    p: { id, kind: 'part', area: 'my_parts', status, source: 'made', name: `part ${id}`, revisitAt: '2020-01-01T00:00:00Z', ...extra } });
  const run = async (partsOn) => {
    const f = fakeDriver((q) => {
      if (/AS partsOn/.test(q)) return [{ partsOn, timeZone: null }]; // getMe's and the stats' user read
      if (/MATCH \(a:ProfileArea\)/.test(q)) return [
        { id: 'my_patterns', label: 'My patterns', blurb: 'b', kinds: [] },
        { id: 'my_parts', label: 'Parts of me', blurb: 'b', kinds: [{ id: 'part', label: 'A part' }] },
      ];
      // The fake ignores the query's own gate, so the server's second check is what's tested here.
      if (/HAS_PROFILE_FACT\|HAS_PATTERN/.test(q)) return [part('p1', 'active'), part('p2', 'resting'), part('p3', 'set_aside')];
      return [];
    });
    setDriver(f.driver);
    return { me: await fns.getMe.run({ auth: auth(), data: {} }), f };
  };
  const off = await run(false);
  assert.deepEqual(off.me.areas.map((a) => a.id), ['my_patterns'], 'no my_parts area');
  assert.ok(!off.me.areas.some((a) => a.items.some((i) => i.label === 'Part')), 'no part items');
  assert.equal(off.me.staleCount, 0, 'hidden parts are not counted as stale');
  const items = off.f.calls.find((c) => /HAS_PART\]/.test(c.query));
  assert.match(items.query, /WHERE type\(r\) <> 'HAS_PART' OR coalesce\(u\.partsEnabled, false\)/, 'gated in the query too');

  const on = await run(true);
  const area = on.me.areas.find((a) => a.id === 'my_parts');
  assert.deepEqual(area.items.map((i) => [i.label, i.meta.id, i.meta.status, i.meta.prompt, i.summary]), [
    ['Part', 'p1', 'active', 'ask', 'part p1'],
    ['Part', 'p2', 'resting', 'ask', 'part p2'],
    ['Part', 'p3', 'set_aside', 'none', 'part p3'],
  ]);
  assert.equal(area.items[0].meta.area, 'my_parts');
  assert.equal(on.me.staleCount, 2);
});

test('getUserProfile (settings) strips internal, profile-layer and retired goal fields', async () => {
  setDriver(fakeDriver((q) => (/RETURN u \{\.\*\} AS user/.test(q)
    ? [{ user: { id: 'u1', theme: 'dark', profileVersion: 4, patternsEvaluatedAt: 'x', dailyCheckInGoal: 2, focusCategories: ['dt'], timeZone: 'Europe/London' } }] : [])).driver);
  const { profile } = await fns.getUserProfile.run({ auth: auth(), data: {} });
  for (const k of ['id', 'profileVersion', 'patternsEvaluatedAt', 'dailyCheckInGoal', 'weeklyToolGoal', 'focusCategories']) assert.ok(!(k in profile), k);
  assert.deepEqual([profile.theme, profile.timeZone], ['dark', 'Europe/London']);
});

test('updateUserProfile stores the zone browsers report (aliases included) and drops unknown ones', async () => {
  for (const zone of ['Asia/Kolkata', 'Europe/Kyiv', 'UTC', 'America/New_York']) {
    const f = fakeDriver(() => []);
    setDriver(f.driver);
    await fns.updateUserProfile.run({ auth: auth(), data: { timeZone: zone } });
    assert.equal(f.calls.length, 1, zone);
    assert.equal(f.calls[0].params.timeZone, zone);
  }
  for (const bad of ['Not/AZone', 'Europe/London; DROP', 42]) {
    const f = fakeDriver(() => []);
    setDriver(f.driver);
    await fns.updateUserProfile.run({ auth: auth(), data: { timeZone: bad } });
    assert.equal(f.calls.length, 0, String(bad));
  }
});

test('updateUserProfile ignores the retired goal fields', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.updateUserProfile.run({ auth: auth(), data: { dailyCheckInGoal: 3, focusCategories: ['dt'] } });
  assert.equal(f.calls.length, 0, 'nothing whitelisted, nothing written');
});

test('getMe: a Part item carries its card (no own-words fear ever, no fears on a tender part), still only with parts on', async () => {
  const row = (id, extra) => ({ label: 'Part', title: 'A part', stillTrue: '', setAside: '', statement: null, moveIds: ['withdraw', 'appease', 'withdraw'],
    p: { id, kind: 'part', area: 'my_parts', status: 'active', source: 'made', revisitAt: null, ...extra } });
  const run = async (partsOn) => {
    const f = fakeDriver((q) => {
      if (/AS partsOn/.test(q)) return [{ partsOn, timeZone: null }]; // getMe's and the stats' user read
      if (/MATCH \(a:ProfileArea\)/.test(q)) return [{ id: 'my_parts', label: 'Parts of me', blurb: 'b', kinds: [] }];
      if (/HAS_PROFILE_FACT\|HAS_PATTERN/.test(q)) return [
        row('p1', { name: 'the one who hides', tender: false, places: ['chest', 'throat'], shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5],
          jobIds: ['hide_job_out_of_sight'], ownJob: 'keep me safe', fearIds: ['fear_too_much'], ownFear: 'that I would vanish',
          preferredRoleIds: ['rather_tell_me'], lastVisitedAt: '2026-10-10T00:00:00Z' }),
        row('p2', { tender: true, fearIds: ['fear_too_much'], ownFear: 'x' }),
      ];
      return [];
    });
    setDriver(f.driver);
    return { me: await fns.getMe.run({ auth: auth(), data: {} }), f };
  };
  const { me, f } = await run(true);
  const items = me.areas.find((a) => a.id === 'my_parts').items;
  assert.deepEqual(items[0].part, {
    name: 'the one who hides', tender: false, places: ['chest', 'throat'], shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5],
    jobIds: ['hide_job_out_of_sight'], ownJob: 'keep me safe', fearIds: ['fear_too_much'], preferredRoleIds: ['rather_tell_me'],
    moveIds: ['appease', 'withdraw'], lastVisitedAt: '2026-10-10T00:00:00Z', safety: false,
  });
  assert.deepEqual(items[1].part, {
    name: null, tender: true, places: [], shapeSig: null, jobIds: [], ownJob: null, fearIds: [], preferredRoleIds: [], moveIds: ['appease', 'withdraw'], lastVisitedAt: null, safety: false,
  }, 'tender: no fears; absent fields are [] / null');
  assert.ok(!JSON.stringify(me).includes('vanish'), 'the own-words fear never leaves the server');
  const q = f.calls.find((c) => /HAS_PART\]/.test(c.query)).query;
  assert.doesNotMatch(q, /ownFear/);
  assert.match(q, /\[\(p\)-\[:USES\]->\(mv:ProtectiveMove\) \| mv\.id\]/);
  const off = await run(false);
  assert.ok(!off.me.areas.some((a) => a.items.some((i) => i.part)), 'parts off: no cards');
});

test('getMe: open part candidates (newest first, at most 3) only with parts on', async () => {
  const cand = (id, createdAt, status = 'open', moveIds = ['hide']) => ({ id, origin: 'new_one', moveIds, createdAt, status });
  const run = async (partsOn) => {
    const f = fakeDriver((q) => {
      if (/AS partsOn/.test(q)) return [{ partsOn, timeZone: null }]; // getMe's and the stats' user read
      if (/HAS_PART_CANDIDATE/.test(q)) return [
        cand('c1', '2026-10-01T00:00:00Z'), cand('c2', '2026-10-05T00:00:00Z'), cand('c3', '2026-10-03T00:00:00Z', 'dismissed'),
        cand('c4', '2026-10-04T00:00:00Z', 'accepted'), cand('c5', '2026-10-02T00:00:00Z', 'open', null), cand('c6', '2026-09-01T00:00:00Z'),
      ];
      return [];
    });
    setDriver(f.driver);
    return { me: await fns.getMe.run({ auth: auth(), data: {} }), f };
  };
  const on = await run(true);
  // The fake ignores the query's own filter and limit, so the server's second check is what's tested.
  assert.deepEqual(on.me.partCandidates, [
    { id: 'c2', origin: 'new_one', moveIds: ['hide'], createdAt: '2026-10-05T00:00:00Z' },
    { id: 'c5', origin: 'new_one', moveIds: [], createdAt: '2026-10-02T00:00:00Z' },
    { id: 'c1', origin: 'new_one', moveIds: ['hide'], createdAt: '2026-10-01T00:00:00Z' },
  ]);
  const q = on.f.calls.find((c) => /HAS_PART_CANDIDATE/.test(c.query)).query;
  assert.match(q, /WHERE c\.status = 'open' AND coalesce\(u\.partsEnabled, false\)/);
  assert.match(q, /ORDER BY c\.createdAt DESC, c\.id LIMIT 3/);
  assert.doesNotMatch(q, /sessionId|PartSession/, 'only what the row shows');
  const off = await run(false);
  assert.deepEqual(off.me.partCandidates, []);
  assert.ok(!off.f.calls.some((c) => /HAS_PART_CANDIDATE/.test(c.query)), 'parts off: not even read');
});

test('getMe: active and resting parts carry the stats readout, passed through untouched; set aside and parts off get none', async () => {
  const { statsByPart } = require('../../lib/parts/stats');
  const part = (id, status) => ({ label: 'Part', title: 'A part', stillTrue: '', setAside: '', statement: null, moveIds: [],
    p: { id, kind: 'part', area: 'my_parts', status, source: 'made', revisitAt: null } });
  const at = (h) => `2026-10-0${h}T19:00:00Z`;
  const tags = [1, 2, 3, 4].map((d) => ({ partId: 'p1', toolId: d < 4 ? 'pause' : 'cool-down', at: at(d) }))
    .concat([1, 2].map((d) => ({ partId: 'p2', toolId: 'pause', at: at(d) })))         // below the threshold
    .concat([1, 2, 3].map((d) => ({ partId: 'p3', toolId: 'pause', at: at(d) })));    // set aside: never counted
  const steps = [1, 2].map((d) => ({ partId: 'p1', stepId: 'recover:park', label: 'Park the replay', at: at(d) }));
  const run = async (partsOn) => {
    const f = fakeDriver((q) => {
      if (/AS partsOn/.test(q)) return [{ partsOn, timeZone: 'UTC' }];
      if (/MATCH \(a:ProfileArea\)/.test(q)) return [{ id: 'my_parts', label: 'Parts of me', blurb: 'b', kinds: [] }];
      if (/HAS_PROFILE_FACT\|HAS_PATTERN/.test(q)) return [part('p1', 'active'), part('p2', 'resting'), part('p3', 'set_aside')];
      if (/RETURN pt\.id AS id, pt\.name AS name/.test(q)) return [
        { id: 'p1', name: null, status: 'active', firstPlace: null, shapeSig: null },
        { id: 'p2', name: null, status: 'resting', firstPlace: null, shapeSig: null },
      ];
      if (/AS stepId/.test(q)) return steps;
      if (/HAS_PART_TAG/.test(q)) return tags;
      if (/HAS_PART_SESSION/.test(q)) return [];
      return [];
    });
    setDriver(f.driver);
    return { me: await fns.getMe.run({ auth: auth(), data: {} }), f };
  };
  const { me, f } = await run(true);
  const items = me.areas.find((a) => a.id === 'my_parts').items;
  const byId = Object.fromEntries(items.map((i) => [i.meta.id, i.part.stats]));
  const expected = statsByPart({ partsOn: true, timeZone: 'UTC', parts: [{ id: 'p1', status: 'active' }, { id: 'p2', status: 'resting' }], tags, sessions: [], steps });
  assert.deepEqual(byId.p1, expected.get('p1'), "lane 4's compute, untouched");
  assert.deepEqual(byId.p1.helped, [{ toolId: 'pause', n: 3 }, { toolId: 'cool-down', n: 1 }]);
  assert.equal(byId.p1.when, 'evenings');
  assert.deepEqual(byId.p1.steps, [{ stepId: 'recover:park', label: 'Park the replay', n: 2 }], 'its steps, with their labels');
  assert.deepEqual(byId.p2, { helped: null, felt: null, when: null, steps: null }, 'below every threshold: all null, as computed');
  assert.equal(byId.p3, undefined, 'set aside: none');
  assert.equal(f.calls.filter((c) => /HAS_PART_TAG/.test(c.query) && !/AS stepId/.test(c.query)).length, 1, 'one read for all parts');
  assert.equal(f.calls.filter((c) => /AS stepId/.test(c.query)).length, 1, 'and one steps read for all parts');
  assert.equal(f.sessions.length, 1, 'inside getMe\'s one read transaction');
  const off = await run(false);
  assert.ok(!off.f.calls.some((c) => /HAS_PART_TAG|HAS_PART_SESSION/.test(c.query)), 'parts off: not read');
  assert.ok(!off.me.areas.some((a) => a.items.some((i) => i.part)), 'parts off: no parts, no stats');
});

test('getMe: a person (IE-03) shows under My people by name and role, never the safety answer', async () => {
  const f = fakeDriver((q) => {
    if (/AS partsOn/.test(q)) return [{ partsOn: false, timeZone: null }];
    if (/MATCH \(a:ProfileArea\)/.test(q)) return [{ id: 'my_people', label: 'My people', blurb: 'b', kinds: [{ id: 'person', label: 'Someone in my life' }] }];
    if (/HAS_PROFILE_FACT\|HAS_PATTERN/.test(q)) return [{ label: 'Person', title: 'Someone in my life', stillTrue: '', setAside: 'Set aside.', statement: null, moveIds: [], safety: false,
      p: { id: 'per1', kind: 'person', area: 'my_people', status: 'active', source: 'user', revisitAt: null,
        valueJson: JSON.stringify({ label: 'Sam', role: 'parent', safe: 'no', risk: 'harm', safeAskedAt: '2026-11-01' }) } }];
    return [];
  });
  setDriver(f.driver);
  const me = await fns.getMe.run({ auth: auth(), data: {} });
  const item = me.areas.find((a) => a.id === 'my_people').items[0];
  assert.deepEqual([item.label, item.summary, item.value], ['Person', 'Sam', { label: 'Sam', role: 'parent' }]);
  assert.match(f.calls.find((c) => /HAS_PROFILE_FACT/.test(c.query)).query, /HAS_PERSON\|HAS_PART\]->\(p:ProfileItem\)/);
});
