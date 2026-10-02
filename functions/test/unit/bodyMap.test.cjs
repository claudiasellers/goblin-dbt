'use strict';
/** getBodyMapContent (public content; no user data): pad words and the body-mirror maps. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

const head = [{ version: 'body-map-v2', regions: ['chest', 'shoulders'] }];
const pad = [{ id: 'tension', label: 'Tight', zones: ['hu'], regions: [], energy: 'more' }];
const felt = (emotionId, region, sensationId, weight) => ({ emotionId, region, sensationId, label: sensationId, energy: 'more', weight });
const NONE = { emotionId: null, region: null, sensationId: null, label: null, energy: null, weight: null };

test('getBodyMapContent returns pad words, and maps in the order of the sent words, places from FELT_AS strongest first', async () => {
  const f = fakeDriver((q, params) => {
    if (/BodyMapContent/.test(q)) return head;
    if (/RETURN s\.id AS id, s\.padLabel/.test(q)) return pad;
    if (/BodyMap \{status: 'live'\}/.test(q)) {
      assert.deepEqual(params.ids, ['excited', 'anxious', 'worried']);
      assert.match(q, /-\[:MIRRORS\]->/);
      assert.match(q, /-\[:GROUPS\]->\(e:Emotion\)-\[f:FELT_AS \{status: 'live'\}\]->\(s:SensationType \{padStatus: 'live'\}\)/);
      return [
        { id: 'fear', label: 'Fear and worry', wordIds: ['anxious', 'worried', 'scared'],
          felt: [felt('fear', 'hands', 'shaking', 0.6), felt('anxiety', 'chest', 'racing_heart', 0.9), felt('panic', 'chest', 'racing_heart', 0.8)] },
        { id: 'excitement', label: 'Excitement', wordIds: ['excited'], felt: [felt('excitement', 'stomach', 'fizzy', 1)] },
        { id: 'empty', label: 'No live places yet', wordIds: ['worried'], felt: [NONE] },
      ];
    }
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getBodyMapContent.run({ data: { emotionIds: ['excited', 'anxious', 'worried', 'anxious'] } });
  assert.equal(out.version, 'body-map-v2');
  assert.deepEqual(out.padWords, pad);
  assert.deepEqual(out.maps.map((m) => m.id), ['excitement', 'fear'], 'a map with no live places is left out');
  assert.deepEqual(out.maps[1].emotionIds, ['anxious', 'worried']);
  assert.deepEqual(out.maps[1].places.map((p) => [p.region, p.weight]), [['chest', 1], ['hands', 0.6]], 'shared by two emotions: 0.9 + 0.1');
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getBodyMapContent without words returns pad words only and never queries maps', async () => {
  const f = fakeDriver((q) => {
    if (/BodyMapContent/.test(q)) return head;
    if (/RETURN s\.id AS id, s\.padLabel/.test(q)) return pad;
    throw new Error('maps queried');
  });
  setDriver(f.driver);
  const out = await fns.getBodyMapContent.run({ data: {} });
  assert.deepEqual(out.maps, []);
  assert.equal(out.padWords.length, 1);
});

test('getBodyMapContent rejects bad word ids and fails with failed-precondition until the file is loaded', async () => {
  setDriver(fakeDriver(() => head).driver);
  await assert.rejects(fns.getBodyMapContent.run({ data: { emotionIds: ['Not An Id'] } }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.getBodyMapContent.run({ data: { emotionIds: 'anxious' } }), (e) => e.code === 'invalid-argument');
  const logged = [];
  const error = console.error;
  console.error = (...a) => logged.push(a.join(' '));
  try {
    setDriver(fakeDriver(() => []).driver);
    await assert.rejects(fns.getBodyMapContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
    setDriver(fakeDriver((q) => (/BodyMapContent/.test(q) ? [{ version: 'body-map-v1', regions: [] }] : [])).driver);
    await assert.rejects(fns.getBodyMapContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
  } finally {
    console.error = error;
  }
  assert.deepEqual(logged, [
    'getBodyMapContent version mismatch graph=missing function=body-map-v2',
    'getBodyMapContent version mismatch graph=body-map-v1 function=body-map-v2',
  ], 'a version mismatch is logged (an HttpsError otherwise leaves no trace in functions:log)');
});

test('getBodyMapContent with zero live pad words (SIGNED_OFF empty) succeeds with an empty list, not an error', async () => {
  setDriver(fakeDriver((q) => (/BodyMapContent/.test(q) ? head : [])).driver);
  const out = await fns.getBodyMapContent.run({ data: {} });
  assert.deepEqual(out, { version: 'body-map-v2', regions: ['chest', 'shoulders'], padWords: [], maps: [] });
});

// ---- Body-first suggestions (step 2) ----
const { scoreBodyMaps, MATCH, MAX_SUGGESTIONS } = require('../../lib/bodyMap/suggest');

const maps = [
  { id: 'fear', label: 'Fear and worry', wordIds: ['anxious', 'scared'], places: [
    { region: 'chest', sensationId: 'racing_heart', label: 'Racing', weight: 1 },
    { region: 'shoulders', sensationId: 'raised_up', label: 'Raised up', weight: 0.7 },
  ] },
  { id: 'calm', label: 'Calm', wordIds: ['calm'], places: [
    { region: 'shoulders', sensationId: 'loose', label: 'Loose', weight: 1 },
  ] },
  { id: 'excitement', label: 'Excitement', wordIds: ['excited'], places: [
    { region: 'stomach', sensationId: 'fizzy', label: 'Fizzy', weight: 1 },
    { region: 'chest', sensationId: 'racing_heart', label: 'Racing', weight: 0.8 },
  ] },
];

test('scoreBodyMaps: same place and word beats the word elsewhere, which beats the place alone', () => {
  const out = scoreBodyMaps([{ region: 'chest', sensationIds: ['racing_heart'] }], maps);
  assert.deepEqual(out.map((s) => s.mapId), ['fear', 'excitement']);
  assert.equal(out[0].score, MATCH.exact * 1);
  assert.equal(out[1].score, MATCH.exact * 0.8);
  assert.deepEqual(out[0].because, [{ region: 'chest', label: 'Racing' }]);
  const elsewhere = scoreBodyMaps([{ region: 'stomach', sensationIds: ['racing_heart'] }], [maps[0]]);
  assert.equal(elsewhere[0].score, MATCH.wordElsewhere * 1);
  const placeOnly = scoreBodyMaps([{ region: 'shoulders', sensationIds: [] }], maps);
  assert.deepEqual(placeOnly.map((s) => [s.mapId, s.score]), [['calm', MATCH.placeOnly], ['fear', MATCH.placeOnly * 0.7]]);
});

test('scoreBodyMaps: one mark counts once per map, unmatched maps drop, at most three come back', () => {
  const out = scoreBodyMaps([{ region: 'chest', sensationIds: ['racing_heart', 'tension'] }], maps);
  assert.equal(out.find((s) => s.mapId === 'fear').score, 1);
  assert.equal(out.find((s) => s.mapId === 'calm'), undefined);
  const many = Array.from({ length: 5 }, (_, i) => ({ id: `m${i}`, label: '', wordIds: [], places: [{ region: 'chest', sensationId: 'x', label: '', weight: 1 }] }));
  assert.equal(scoreBodyMaps([{ region: 'chest', sensationIds: [] }], many).length, MAX_SUGGESTIONS);
  assert.deepEqual(scoreBodyMaps([], maps), []);
});

test('suggestEmotionsFromBody reads live maps once and scores them; no marks never queries; bad input rejected', async () => {
  const f = fakeDriver((q) => (/BodyMap \{status: 'live'\}/.test(q)
    ? maps.map((m) => ({ id: m.id, label: m.label, wordIds: m.wordIds,
        felt: m.places.map((p) => ({ emotionId: m.id, region: p.region, sensationId: p.sensationId, label: p.label, energy: 'more', weight: p.weight })) }))
    : []));
  setDriver(f.driver);
  const out = await fns.suggestEmotionsFromBody.run({ data: { marks: [{ region: 'shoulders', sensationIds: ['raised_up'] }] } });
  assert.deepEqual(out.suggestions.map((s) => s.mapId), ['fear', 'calm']);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
  setDriver(fakeDriver(() => { throw new Error('queried'); }).driver);
  assert.deepEqual(await fns.suggestEmotionsFromBody.run({ data: { marks: [] } }), { suggestions: [] });
  await assert.rejects(fns.suggestEmotionsFromBody.run({ data: { marks: [{ region: 'Left Shoulder' }] } }), (e) => e.code === 'invalid-argument');
  await assert.rejects(fns.suggestEmotionsFromBody.run({ data: { marks: Array.from({ length: 21 }, () => ({ region: 'chest' })) } }), (e) => e.code === 'invalid-argument');
});

// ---- Places from FELT_AS ----
const { placesFromFelt, SHARED_BONUS } = require('../../lib/bodyMap/places');

test('placesFromFelt: highest weight per place and word, a bonus per further emotion sharing it, capped, strongest first', () => {
  const rows = [
    { emotionId: 'anxiety', region: 'chest', sensationId: 'racing_heart', label: 'Racing', energy: 'more', weight: 1 },
    { emotionId: 'fear', region: 'chest', sensationId: 'racing_heart', label: 'Racing', energy: 'more', weight: 0.8 },
    { emotionId: 'anxiety', region: 'throat', sensationId: 'constriction', label: 'Closing up', energy: 'more', weight: 0.6 },
    { emotionId: 'panic', region: 'throat', sensationId: 'constriction', label: 'Closing up', energy: 'more', weight: 0.5 },
    { emotionId: 'fear', region: 'body', sensationId: 'cold_sensation', label: 'Cold', energy: 'less', weight: 0.6 },
    { emotionId: null, region: null, sensationId: null, label: null, energy: null, weight: null },
  ];
  assert.equal(SHARED_BONUS, 0.1);
  assert.deepEqual(placesFromFelt(rows).map((p) => [p.region, p.sensationId, p.weight]), [
    ['chest', 'racing_heart', 1],
    ['throat', 'constriction', 0.7],
    ['body', 'cold_sensation', 0.6],
  ]);
  assert.deepEqual(placesFromFelt([]), []);
});
