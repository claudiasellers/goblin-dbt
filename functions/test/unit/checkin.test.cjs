'use strict';
/**
 * PR-C1: check-in continuity. saveCheckIn is an idempotent upsert by key that always returns an id,
 * never orphans, never creates content nodes, and is finalise-once; setCheckInNextAction; User at
 * sign-up and MERGE in writes; Insights families from emotionIds.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'user-1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const base = () => ({ id: ID, emotion: 'anxious', quadrant: 'high-unpleasant', intensity: { x: 0.3, y: 0.6 }, bodySensations: [], note: '', timestamp: new Date().toISOString() });

function driver({ open = true, emotions = ['anxious'] } = {}) {
  return fakeDriver((q, p) => {
    if (/AS open/.test(q)) return [{ open }];
    if (/MATCH \(e:Emotion\) WHERE e\.id IN \$raw/.test(q)) return [{ ids: p.raw.filter((x) => emotions.includes(x)) }];
    return [];
  });
}

test('saveCheckIn: MERGE user first (no orphan), MERGE on uid:id, no content node created from input', async () => {
  const f = driver();
  setDriver(f.driver);
  const out = await fns.saveCheckIn.run({ auth: auth('u1'), data: { ...base(), activationPatternId: 'made_up_pattern' } });
  assert.deepEqual(out, { id: ID });
  const [head, , write] = [f.calls[0], f.calls[1], f.calls.at(-1)];
  assert.match(head.query, /^MERGE \(u:User \{id: \$uid\}\)[\s\S]*MERGE \(c:CheckIn \{key: \$key\}\)[\s\S]*MERGE \(u\)-\[:LOGGED\]->\(c\)/);
  assert.equal(head.params.key, `u1:${ID}`);
  assert.match(head.query, /c:UserData:LogRecord/);
  assert.doesNotMatch(write.query, /MERGE \(ap:ActivationPattern/, 'F3: a bad id must not create a content node');
  assert.match(write.query, /OPTIONAL MATCH \(ap:ActivationPattern \{id: \$activationPatternId\}\)/);
  assert.ok(f.allClosed());
});

test('saveCheckIn keeps only emotion ids that exist; stores the result fields and the FTF band', async () => {
  const f = driver({ emotions: ['anxious'] });
  setDriver(f.driver);
  const capacity = { id: ID, value: 'flooded', viaCantTell: false, source: 'ftf', framing: 'now', wording: 'default', context: 'checkin', probeVersion: 'capacity-v1', at: new Date().toISOString() };
  await fns.saveCheckIn.run({ auth: auth(), data: {
    ...base(), source: 'ftf', emotionIds: ['anxious', 'not_an_emotion'], capacity,
    recommendedToolIds: ['cool-down', 'opposite-action', 'pause'], discriminatingAnswers: [{ questionId: 'q1', responseId: 'r1' }],
    safetyFlagId: 'crisis_flag', resultShown: true, nextAction: { kind: 'tool', toolId: 'cool-down' },
  } });
  const w = f.calls.at(-1).params;
  assert.deepEqual(w.emotionIds, ['anxious']);
  assert.equal(w.source, 'ftf');
  assert.equal(w.band, 'flooded');
  assert.equal(w.bandSource, 'ftf');
  assert.deepEqual(w.recommendedToolIds, ['cool-down', 'opposite-action'], '≤2, what rendered');
  assert.deepEqual([w.discQuestionIds, w.discResponseIds], [['q1'], ['r1']]);
  assert.equal(w.safetyFlagId, 'crisis_flag', 'crisis-banner results are saved like any other');
  assert.equal(w.nextKind, 'tool');
  assert.equal(w.nextToolId, 'cool-down');
  assert.equal(w.resultShown, true);
});

test('saveCheckIn never throws on bad optional fields; only the quadrant is required', async () => {
  const f = driver();
  setDriver(f.driver);
  const out = await fns.saveCheckIn.run({ auth: auth(), data: { ...base(), capacity: { value: 11 }, source: 'hacker', nextAction: { kind: 'explode' },
    recommendedToolIds: 'nope', bodySensations: [{ region: 'Head', x: 7, tags: ['Tension', 5] }] } });
  assert.equal(out.id, ID);
  const w = f.calls.at(-1).params;
  assert.equal(w.band, null);
  assert.equal(w.source, null);
  assert.equal(w.nextKind, null);
  assert.deepEqual(w.recommendedToolIds, []);
  assert.equal(w.bodySensations[0].x, 0.5, 'out-of-range coordinate defaults');
  assert.deepEqual(w.bodySensations[0].tags, ['Tension']);
  await assert.rejects(fns.saveCheckIn.run({ auth: auth(), data: { ...base(), quadrant: 'sideways' } }), (e) => e.code === 'invalid-argument');
});

test('saveCheckIn on a finalised check-in is a no-op that still returns its id (finalise-once)', async () => {
  const f = driver({ open: false });
  setDriver(f.driver);
  const out = await fns.saveCheckIn.run({ auth: auth(), data: base() });
  assert.equal(out.id, ID);
  assert.equal(f.calls.length, 1, 'no field writes after the terminal event');
});

test('saveCheckIn from another user with a guessed id writes under the caller\'s own key', async () => {
  const f = driver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth('user-b'), data: base() });
  assert.equal(f.calls[0].params.key, `user-b:${ID}`);
  assert.ok(f.calls.every((c) => c.params.uid === 'user-b'));
});

test('an old client without an id still saves; the server mints a UUID', async () => {
  const f = driver();
  setDriver(f.driver);
  const { id, ...rest } = base();
  const out = await fns.saveCheckIn.run({ auth: auth('u'), data: rest });
  assert.match(out.id, /^[0-9a-f-]{36}$/);
  assert.notEqual(out.id, id);
});

test('body sensations are replaced wholesale and carry the user-data meta', async () => {
  const f = driver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...base(), bodySensations: [{ x: 0.2, y: 0.3, region: 'Chest', intensity: { x: 0.5, y: 0.5 }, tags: ['Tightness'] }] } });
  const w = f.calls.at(-1);
  assert.match(w.query, /OPTIONAL MATCH \(c\)-\[:SENSED\]->\(old:BodySensation\)\s+DETACH DELETE old/);
  assert.match(w.query, /CREATE \(b:BodySensation:UserData:LogRecord \{id: s\.id, key: \$uid \+ ':' \+ s\.id, ownerId: \$uid/);
  assert.match(w.params.bodySensations[0].id, /^[0-9a-f-]{36}$/);
});

test('body sensations: old figure names become place ids + side on save; new ids keep their side', async () => {
  const f = driver();
  setDriver(f.driver);
  await fns.saveCheckIn.run({ auth: auth(), data: { ...base(), bodySensations: [
    { region: 'Left Shoulder', tags: ['Tension'] },
    { region: 'Chest', tags: [] },
    { region: 'shoulders', side: 'right', sensationIds: ['tension', 'Bad Id', 'tension'], strength: 0.8 },
    { region: 'toString', tags: [], strength: 1.5 },
  ] } });
  const b = f.calls.at(-1).params.bodySensations;
  assert.deepEqual(b.map((s) => [s.region, s.side]), [['shoulders', 'left'], ['chest', 'both'], ['shoulders', 'right'], ['toString', null]]);
  assert.deepEqual(b[2].sensationIds, ['tension']);
  assert.deepEqual(b.map((s) => s.strength), [null, null, 0.8, null], 'strength: 0–1 or null');
  assert.match(f.calls.at(-1).query, /strength: s\.strength/);
});

test('setCheckInNextAction: MERGE stub (pendingFullSave), guarded, first next action wins', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  assert.deepEqual(await fns.setCheckInNextAction.run({ auth: auth('u'), data: { checkInId: ID, nextAction: { kind: 'micro_step', microStepId: 'cold-water' } } }), { ok: true });
  const c = f.calls[0];
  assert.match(c.query, /MERGE \(c:CheckIn \{key: \$key\}\)[\s\S]*c\.pendingFullSave = true/);
  assert.match(c.query, /WHERE \(c\.pendingFullSave = true OR[\s\S]*AND c\.nextActionKind IS NULL/);
  assert.deepEqual([c.params.key, c.params.nextKind, c.params.nextToolId], [`u:${ID}`, 'micro_step', null]);
  await assert.rejects(fns.setCheckInNextAction.run({ auth: auth(), data: { checkInId: 'nope', nextAction: { kind: 'done' } } }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.setCheckInNextAction.run({ auth: auth(), data: { checkInId: ID, nextAction: { kind: 'crisis_screen' } } }), (e) => e.code === 'invalid-argument');
});

test('getCheckInsByUser skips next-action stubs and returns the new fields', async () => {
  const f = fakeDriver(() => [{ checkIn: { id: 'c', emotion: 'x', quadrant: 'high-unpleasant', intensity: {}, emotionIds: ['anxious'], band: 'stirred', nextActionKind: 'tool', nextActionToolId: 'pause' }, bodySensations: [] }]);
  setDriver(f.driver);
  const { checkIns } = await fns.getCheckInsByUser.run({ auth: auth(), data: {} });
  assert.match(f.calls[0].query, /WHERE c\.quadrant IS NOT NULL/);
  assert.deepEqual(checkIns[0].nextAction, { kind: 'tool', toolId: 'pause' });
  assert.equal(checkIns[0].band, 'stirred');
});

test('onUserCreated MERGEs the User at sign-up', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.onUserCreated.run({ uid: 'new-user', email: 'n@example.test' }, {});
  assert.match(f.calls[0].query, /MERGE \(u:User \{id: \$uid\}\)/);
  assert.deepEqual(f.calls[0].params, { uid: 'new-user', email: 'n@example.test' });
});

test('writes before the first check-in MERGE the user (F4): profile, tool usage, DEAR MAN', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.updateUserProfile.run({ auth: auth(), data: { theme: 'dark', timeZone: 'Europe/London' } });
  await fns.trackToolUsage.run({ auth: auth(), data: { toolId: 'pause' } });
  await fns.saveDearManSession.run({ auth: auth(), data: { type: 'prep' } });
  for (const c of f.calls) assert.match(c.query, /MERGE \(u:User \{id: \$userId\}\)/, c.query.slice(0, 80));
  assert.equal(f.calls[0].params.timeZone, 'Europe/London');
});

test('updateUserProfile drops an unknown time zone', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.updateUserProfile.run({ auth: auth(), data: { theme: 'dark', timeZone: 'Mars/Olympus' } });
  assert.ok(!('timeZone' in f.calls[0].params));
});

test('Insights reads emotion families from emotionIds and skips stubs (F12)', async () => {
  const f = fakeDriver(() => []);
  setDriver(f.driver);
  await fns.getInsightsData.run({ auth: auth(), data: { timeRange: '30d' } });
  const q = f.calls.map((c) => c.query).find((x) => /LOGGED\]->\(c:CheckIn\)/.test(x) && /families/.test(x));
  assert.ok(q, 'families query');
  assert.match(q, /e\.id IN coalesce\(c\.emotionIds, \[\]\)/);
  assert.match(q, /WHERE c\.quadrant IS NOT NULL/);
  assert.doesNotMatch(q, /Emotion \{id: c\.emotion\}/);
});

test('saveCheckIn links tool sessions opened before it landed, and stores what it embeds (Codex, PR #16)', async () => {
  const f = driver();
  setDriver(f.driver);
  const FTF = '22222222-1b2c-4d5e-8f90-123456789abc';
  await fns.saveCheckIn.run({ auth: auth(), data: { ...base(), embeddedToolSessionIds: [FTF] } });
  const q = f.calls.find((c) => /FROM_CHECKIN/.test(c.query));
  assert.ok(q, 'the result save links late tool sessions');
  assert.match(q.query, /c\.embeddedToolSessionIds = \$embeddedIds/);
  assert.deepEqual(q.params.embeddedIds, [FTF]);
  assert.equal(q.params.id, ID);
  assert.match(q.query, /\(ts2:ToolSession \{checkInId: \$id\}\)[\s\S]*WHERE NOT \(ts2\)-\[:FROM_CHECKIN\]->\(\)[\s\S]*MERGE \(x\)-\[:FROM_CHECKIN\]->\(c\)/);
  assert.match(q.query, /\(:ToolSession \{checkInId: \$id\}\)-\[:COMPAT_USAGE\]->\(tu:ToolUsage\)[\s\S]*WHERE NOT \(tu\)-\[:FOLLOWED_CHECKIN\]->\(\)[\s\S]*MERGE \(x\)-\[:FOLLOWED_CHECKIN\]->\(c\)/);
});
