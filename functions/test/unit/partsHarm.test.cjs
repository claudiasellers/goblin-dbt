'use strict';
/** The parts harm signals (functions/src/parts/harm.ts): every edge of every definition. */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../../lib/parts/harm');

const NOW = new Date('2026-10-16T12:00:00.000Z');
const DAY = 86_400_000;
const HOUR = 3_600_000;
const at = (msBefore) => new Date(NOW.getTime() - msBefore).toISOString();
const empty = () => ({ checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] });
const session = (when, extra = {}) => ({ at: when, stopReason: null, blendCheck: null, p2: false, ...extra });
const run = (rows, policy) => H.harmSignalsFor({ ...empty(), ...rows }, NOW, policy);

test('defaults are the policy numbers; a PartsPolicy node overrides, junk keeps the default', () => {
  assert.deepEqual(H.DEFAULT_HARM_POLICY, { windowDays: 28, crisisPauseHours: 48, tenderRepeatCount: 2, tooManyPartsCount: 3, tooManyPartsDays: 7 });
  assert.deepEqual(H.resolveHarmPolicy(null), H.DEFAULT_HARM_POLICY);
  assert.deepEqual(H.resolveHarmPolicy({ harmWindowDays: 14, crisisPauseHours: 72, tenderRepeatCount: 3, tooManyPartsCount: 'x', tooManyPartsDays: -1 }),
    { windowDays: 14, crisisPauseHours: 72, tenderRepeatCount: 3, tooManyPartsCount: 3, tooManyPartsDays: 7 });
});

test('nothing recorded: no signal, nothing watched, the unrecorded ones null', () => {
  const s = run({});
  assert.deepEqual(s, {
    louder: 0, crisisAfterMeet: 0, tenderStops: 0, tenderRepeat: false, notSelfStops: 0, notSelfRepeat: false, any: false, lastAt: null,
    watched: { p2Opened: 0, blendRunning: 0, maxPartsInSpan: 0, tooManyParts: false, partsDeleted: null, partsTurnedOff: null, notMeRate: null },
  });
});

test('louder: harmSignal check-backs inside the window, both ends inclusive', () => {
  const s = run({ checkbacks: [
    { at: at(0), harmSignal: true }, { at: at(28 * DAY), harmSignal: true }, { at: at(28 * DAY + 1), harmSignal: true },
    { at: at(DAY), harmSignal: false }, { at: new Date(NOW.getTime() + 1).toISOString(), harmSignal: true }, { at: 'not a date', harmSignal: true },
  ] });
  assert.equal(s.louder, 2);
  assert.equal(s.any, true);
  assert.equal(s.lastAt, NOW.toISOString());
  assert.equal(run({ checkbacks: [{ at: at(DAY), harmSignal: true }] }, { ...H.DEFAULT_HARM_POLICY, windowDays: 0.5 }).louder, 0, 'the window is the policy\'s');
});

test('crisisAfterMeet: strictly after the start, at most 48 h later; once per session', () => {
  const start = at(10 * DAY);
  const t = (h) => new Date(Date.parse(start) + h * HOUR).toISOString();
  const one = (crisisAt) => run({ sessions: [session(start)], crisisCheckIns: [{ at: crisisAt }] }).crisisAfterMeet;
  assert.equal(one(t(48)), 1, 'exactly 48 h counts');
  assert.equal(one(t(48) .replace(/\.000Z$/, '.001Z')), 0, 'a millisecond past 48 h does not');
  assert.equal(one(t(0.001)), 1);
  assert.equal(one(start), 0, 'at the start is not after it');
  assert.equal(one(t(-1)), 0, 'before the visit is not after it');
  const two = run({ sessions: [session(start)], crisisCheckIns: [{ at: t(1) }, { at: t(5) }] });
  assert.deepEqual([two.crisisAfterMeet, two.lastAt], [1, t(5)]);
  // The session must be in the window; a policy can widen the pause.
  assert.equal(run({ sessions: [session(at(29 * DAY))], crisisCheckIns: [{ at: at(28.5 * DAY) }] }).crisisAfterMeet, 0);
  assert.equal(run({ sessions: [session(start)], crisisCheckIns: [{ at: t(60) }] }, { ...H.DEFAULT_HARM_POLICY, crisisPauseHours: 72 }).crisisAfterMeet, 1);
});

test('tender / own_words stops: 1 is not a signal, 2 is; both reasons count together', () => {
  const s1 = run({ sessions: [session(at(DAY), { stopReason: 'tender' })] });
  assert.deepEqual([s1.tenderStops, s1.tenderRepeat, s1.any, s1.lastAt], [1, false, false, null]);
  const s2 = run({ sessions: [session(at(2 * DAY), { stopReason: 'tender' }), session(at(DAY), { stopReason: 'own_words' })] });
  assert.deepEqual([s2.tenderStops, s2.tenderRepeat, s2.any, s2.lastAt], [2, true, true, at(DAY)]);
  const outside = run({ sessions: [session(at(30 * DAY), { stopReason: 'tender' }), session(at(DAY), { stopReason: 'tender' })] });
  assert.equal(outside.tenderRepeat, false, 'one inside the window');
  const other = run({ sessions: [session(at(DAY), { stopReason: 'done' }), session(at(DAY), { stopReason: 'later' }), session(at(DAY), { stopReason: 'danger' })] });
  assert.equal(other.any, false);
  assert.equal(run({ sessions: [session(at(DAY), { stopReason: 'tender' }), session(at(DAY), { stopReason: 'tender' })] },
    { ...H.DEFAULT_HARM_POLICY, tenderRepeatCount: 3 }).tenderRepeat, false, 'the count is the policy\'s');
});

test('not_self endings: the same rule, counted apart from tender', () => {
  const s1 = run({ sessions: [session(at(DAY), { stopReason: 'not_self' }), session(at(DAY), { stopReason: 'tender' })] });
  assert.deepEqual([s1.notSelfStops, s1.notSelfRepeat, s1.tenderRepeat, s1.any], [1, false, false, false]);
  const s2 = run({ sessions: [session(at(3 * DAY), { stopReason: 'not_self' }), session(at(28 * DAY), { stopReason: 'not_self' })] });
  assert.deepEqual([s2.notSelfStops, s2.notSelfRepeat, s2.any, s2.lastAt], [2, true, true, at(3 * DAY)]);
});

test('watched, never harms: P2 in a visit, running things, three parts within 7 days', () => {
  const s = run({
    sessions: [session(at(DAY), { p2: true, blendCheck: 'running' }), session(at(DAY), { blendCheck: 'notice' }), session(at(40 * DAY), { p2: true })],
    partsMade: [{ at: at(10 * DAY) }, { at: at(5 * DAY) }, { at: at(2 * DAY) }],
  });
  assert.deepEqual([s.watched.p2Opened, s.watched.blendRunning, s.watched.maxPartsInSpan, s.watched.tooManyParts, s.any], [1, 1, 2, false, false]);
  // Exactly 7 days apart is outside the span; just inside counts.
  const three = run({ partsMade: [{ at: at(10 * DAY) }, { at: at(5 * DAY) }, { at: at(3 * DAY + 1) }] });
  assert.deepEqual([three.watched.maxPartsInSpan, three.watched.tooManyParts, three.any], [3, true, false]);
  const edge = run({ partsMade: [{ at: at(10 * DAY) }, { at: at(5 * DAY) }, { at: at(3 * DAY) }] });
  assert.equal(edge.watched.maxPartsInSpan, 2, '[t, t + 7 d): the third part made exactly 7 days later starts a new span');
});

test('lastAt is the latest event behind a signal that is on', () => {
  const s = run({
    checkbacks: [{ at: at(5 * DAY), harmSignal: true }],
    sessions: [session(at(2 * DAY), { stopReason: 'not_self' })], // 1 only: off, so not counted for lastAt
  });
  assert.equal(s.lastAt, at(5 * DAY));
});
