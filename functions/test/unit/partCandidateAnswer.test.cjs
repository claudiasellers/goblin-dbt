'use strict';
/**
 * answerPartCandidate (Me's "Not any more" on a part to come back to): parts on, the caller's own
 * candidate, open → dismissed once under GUARDS.PartCandidate.dismiss; an answered one is left as it is.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');
const { GUARDS, writable } = require('../../lib/userdata/lifecycle');
const C = require('../../lib/parts/candidateAnswer');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const CID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';
const code = (c) => (e) => e.code === c;

const driver = ({ partsOn = true, status = 'open' } = {}) => {
  const f = fakeDriver((q) => {
    if (/AS partsOn/.test(q)) return [{ partsOn, status }];
    if (/SET c\.status = 'dismissed'/.test(q)) return [{ status: 'dismissed' }];
    return [];
  });
  setDriver(f.driver);
  return f;
};
const dismissed = (f) => f.calls.filter((c) => /SET c\.status = 'dismissed'/.test(c.query));

test('answerPartCandidate: open → dismissed, guarded, keyed to the caller', async () => {
  const f = driver();
  const out = await fns.answerPartCandidate.run({ auth: auth('u7'), data: { candidateId: CID, answer: 'dismiss' } });
  assert.deepEqual(out, { id: CID, status: 'dismissed' });
  const [w] = dismissed(f);
  assert.ok(w, 'one write');
  assert.ok(w.query.includes(`WHERE ${GUARDS.PartCandidate.dismiss('c')}`), 'the lifecycle guard');
  assert.match(w.query, /c\.dismissedAt = datetime\(\)/);
  assert.match(w.query, /MATCH \(:User \{id: \$uid\}\)-\[:HAS_PART_CANDIDATE\]->\(c:PartCandidate \{key: \$key\}\)/, 'only through the caller');
  assert.deepEqual(w.params, { uid: 'u7', key: `u7:${CID}` });
  assert.equal(f.sessions.length, 1);
  assert.notEqual(f.sessions[0].config.defaultAccessMode, 'READ');
});

test('answerPartCandidate: an answered candidate is left as it is (idempotent; accepted stays accepted)', async () => {
  for (const status of ['dismissed', 'accepted']) {
    const f = driver({ status });
    const out = await fns.answerPartCandidate.run({ auth: auth(), data: { candidateId: CID, answer: 'dismiss' } });
    assert.deepEqual(out, { id: CID, status }, status);
    assert.equal(dismissed(f).length, 0, `${status}: nothing written`);
  }
});

test('answerPartCandidate refuses: parts off, not the caller\'s (or none), bad input', async () => {
  let f = driver({ partsOn: false });
  await assert.rejects(fns.answerPartCandidate.run({ auth: auth(), data: { candidateId: CID, answer: 'dismiss' } }), code('failed-precondition'));
  assert.equal(dismissed(f).length, 0);
  // Another user's candidate has another key, so the caller's match finds nothing.
  f = driver({ status: null });
  await assert.rejects(fns.answerPartCandidate.run({ auth: auth(), data: { candidateId: CID, answer: 'dismiss' } }), code('not-found'));
  assert.equal(dismissed(f).length, 0);
  for (const data of [{ candidateId: 'nope', answer: 'dismiss' }, { candidateId: CID, answer: 'accept' }, { candidateId: CID },
    { candidateId: CID, answer: 'dismiss', uid: 'u2' }, null]) {
    f = driver();
    await assert.rejects(fns.answerPartCandidate.run({ auth: auth(), data }), code('invalid-argument'), JSON.stringify(data));
    assert.equal(f.calls.length, 0, 'nothing read before validation');
  }
});

test('the dismiss guard: open only, the same rule in TypeScript', () => {
  assert.equal(GUARDS.PartCandidate.dismiss('c'), "c.status = 'open'");
  assert.equal(writable('PartCandidate', 'dismiss', { status: 'open' }), true);
  for (const s of ['dismissed', 'accepted']) assert.equal(writable('PartCandidate', 'dismiss', { status: s }), false, s);
  assert.deepEqual(C.validateCandidateAnswer({ candidateId: CID, answer: 'dismiss' }), { candidateId: CID, answer: 'dismiss' });
});
