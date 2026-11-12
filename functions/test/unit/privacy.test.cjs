'use strict';
/**
 * Privacy fixes (docs/design/user-profile.md §8): own words encrypted at the application layer
 * (shared/crypto.ts) in ToolSession.ext and kept profile items, decrypted for the person in export;
 * the kind registry's keep / edit / delete; retention as a daily job; App Check options on every callable.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const LIB = path.resolve(__dirname, '../../lib');
const C = require(path.join(LIB, 'shared/crypto.js'));
const K = require(path.join(LIB, 'profile/kinds.js'));
const R = require(path.join(LIB, 'userdata/retention.js'));
const MASTER = randomBytes(32);
C.setKeyProviderForTesting(C.secretKeyProvider(() => MASTER));
test.after(() => { setDriver(null); C.setKeyProviderForTesting(null); });
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const ID = '3f2c9a0e-1b2c-4d5e-8f90-123456789abc';

/** A fake User store for the person's wrapped key, on top of a responder for everything else. */
function keyStore(rest = () => []) {
  const keys = new Map();
  return {
    keys,
    responder: (q, p) => {
      if (q === C.READ_KEY_QUERY) return [{ w: keys.get(p.uid) ?? null }];
      if (q === C.ENSURE_KEY_QUERY) { if (!keys.has(p.uid)) keys.set(p.uid, p.w); return [{ w: keys.get(p.uid) }]; }
      return rest(q, p);
    },
  };
}

test('crypto: round trip, uid-bound, plain passes through, tampering reads as null', async () => {
  const st = keyStore();
  const f = fakeDriver(st.responder);
  const s = f.driver.session();
  const enc = await C.encryptOwn(s, 'u1', 'my own words');
  assert.ok(enc.startsWith('enc:v1:'));
  assert.ok(!enc.includes('my own words'));
  assert.ok(st.keys.get('u1').startsWith('wk:v1:'), 'the stored key is wrapped');
  assert.equal(await C.decryptOwn(s, 'u1', enc), 'my own words');
  assert.equal(await C.decryptOwn(s, 'u1', 'written before encryption'), 'written before encryption');
  assert.equal(await C.encryptOwn(s, 'u1', enc), enc, 'never double-encrypted');
  assert.equal(await C.encryptOwn(s, 'u1', null), null);
  // Another person's key can't open it, even with the same master key.
  await C.encryptOwn(s, 'u2', 'x');
  assert.equal(await C.decryptOwn(s, 'u2', enc), null);
  const bad = enc.slice(0, -4) + (enc.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  assert.equal(await C.decryptOwn(s, 'u1', bad), null);
  // A second encrypt reuses the person's key (one key per person).
  const before = st.keys.get('u1');
  await C.encryptOwn(s, 'u1', 'again');
  assert.equal(st.keys.get('u1'), before);
});

test('crypto: the master key must be 32 bytes', () => {
  assert.throws(() => C.parseMasterKey('short'), /32 bytes/);
  assert.equal(C.parseMasterKey(randomBytes(32).toString('base64')).length, 32);
});

test('crypto: decryptDeep opens values inside JSON strings (ext, valueJson) and nested records', async () => {
  const st = keyStore();
  const s = fakeDriver(st.responder).driver.session();
  const a = await C.encryptOwn(s, 'u1', 'situation in my words');
  const dec = await C.ownDecrypter(s, 'u1');
  const out = C.decryptDeep({ ext: JSON.stringify({ ca: { situationOwn: a, situationId: 'work' } }), list: [a], n: 3 }, dec);
  assert.deepEqual(JSON.parse(out.ext), { ca: { situationOwn: 'situation in my words', situationId: 'work' } });
  assert.deepEqual(out.list, ['situation in my words']);
  assert.equal(out.n, 3);
});

test('closeToolSession stores ext own words encrypted; ids stay readable for CONTAINS matches', async () => {
  const st = keyStore((q) => (/AS open/.test(q) ? [{ open: true, closeKind: 'none', practiced: false, reps: [], toolId: 'cope-ahead', followUps: [] }] : []));
  const f = fakeDriver(st.responder);
  setDriver(f.driver);
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', ext: { ca: { situationId: 'work_thing', situationOwn: 'the meeting with my boss' } } } });
  const set = f.calls.find((c) => /ts\.ext = \$ext/.test(c.query));
  const ext = JSON.parse(set.params.ext);
  assert.equal(ext.ca.situationId, 'work_thing');
  assert.ok(ext.ca.situationOwn.startsWith('enc:v1:'));
  assert.ok(!set.params.ext.includes('boss'));
  const s = f.driver.session();
  assert.equal(await C.decryptOwn(s, 'u1', ext.ca.situationOwn), 'the meeting with my boss');
});

test('Cope Ahead on the skill runtime: the close projects ext.ca from ext.run, own words encrypted, the pull as urgeIds (ER-B2)', async () => {
  let stored = null;
  const st = keyStore((q, p) => {
    if (/AS open/.test(q)) return [{ open: true, closeKind: 'none', practiced: false, reps: [], toolId: 'cope-ahead', followUps: [] }];
    if (/ts\.ext = \$ext,\s+ts\.urgeIds/.test(q)) { stored = p.ext; return []; }
    if (/ts\.ext = \$ext/.test(q)) { stored = p.ext; return []; }
    if (/RETURN ts\.ext AS ext/.test(q)) return [{ ext: stored }];
    return [];
  });
  const f = fakeDriver(st.responder);
  setDriver(f.driver);
  const run = {
    skillId: 'cope_ahead', versionId: 'ca-skill-v1', path: ['what', 'feel', 'hard', 'plan'],
    answers: [
      { fieldId: 'situation', optionIds: ['conversation'] }, { fieldId: 'when', optionIds: ['today'] },
      { fieldId: 'pull', optionIds: ['blank'] }, { fieldId: 'moment', optionIds: [], valueOwn: 'they bring up money' },
      { fieldId: 'moves', optionIds: ['feet'] },
    ],
  };
  await fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'exited_early', ext: { run } } });
  const proj = f.calls.find((c) => /ts\.urgeIds = CASE/.test(c.query));
  assert.ok(proj, 'the projection wrote');
  assert.deepEqual(proj.params.pull, ['blank']);
  const ext = JSON.parse(proj.params.ext);
  assert.equal(ext.run.skillId, 'cope_ahead', 'the run stays');
  assert.deepEqual([ext.ca.situationId, ext.ca.when, ext.ca.ifFrom, ext.ca.moveIds], ['conversation', 'today', 'moment', ['feet']]);
  assert.equal(ext.ca.hardMomentOwn, undefined, 'ext.ca is ids only: the own words stay in the run');
  assert.ok(ext.run.answers[3].valueOwn.startsWith('enc:v1:'));
  assert.ok(!proj.params.ext.includes('money'), 'no own words in the clear');
  assert.equal(await C.decryptOwn(f.driver.session(), 'u1', ext.run.answers[3].valueOwn), 'they bring up money');
});

test('own-words length limits apply to the plaintext (validators unchanged)', async () => {
  setDriver(fakeDriver(keyStore().responder).driver);
  await assert.rejects(
    fns.closeToolSession.run({ auth: auth(), data: { id: ID, status: 'completed', ext: { ca: { situationOwn: 'x'.repeat(141) } } } }),
    (e) => e.code === 'invalid-argument',
  );
});

test('exportUserData: own words come back readable; the wrapped key is never exported', async () => {
  const st = keyStore();
  const s = fakeDriver(st.responder).driver.session();
  const own = await C.encryptOwn(s, 'u', 'kept in my words');
  const f = fakeDriver((q, p) => {
    if (q === C.READ_KEY_QUERY || q === C.ENSURE_KEY_QUERY) return st.responder(q, p);
    if (/RETURN u \{\.\*\} AS user/.test(q)) return [{ user: { displayName: 'C', ownKeyWrapped: st.keys.get('u') } }];
    if (/RETURN labels\(n\) AS labels/.test(q)) {
      return [{ labels: ['OwnLine', 'UserData', 'ProfileItem'], props: { key: 'u:l1', text: own } },
        { labels: ['ToolSession', 'UserData', 'LogRecord'], props: { key: 'u:t1', ext: JSON.stringify({ wm: { answerOwn: own } }) } }];
    }
    return [];
  });
  setDriver(f.driver);
  const { data } = await fns.exportUserData.run({ auth: auth('u'), data: {} });
  assert.equal(data.records.ownLines[0].text, 'kept in my words');
  assert.equal(JSON.parse(data.records.toolSessions[0].ext).wm.answerOwn, 'kept in my words');
  assert.ok(!('ownKeyWrapped' in data.profile));
  assert.ok(!JSON.stringify(data).includes('enc:v1:'));
  assert.ok(!JSON.stringify(data).includes('wk:v1:'));
});

test('getUserProfile never returns the wrapped key (the settings cache lives in localStorage)', async () => {
  setDriver(fakeDriver((q) => (/RETURN u \{\.\*\} AS user/.test(q) ? [{ user: { theme: 'dark', ownKeyWrapped: 'wk:v1:abc' } }] : [])).driver);
  const { profile } = await fns.getUserProfile.run({ auth: auth(), data: {} });
  assert.equal(profile.theme, 'dark');
  assert.ok(!('ownKeyWrapped' in profile));
});

test('the kind registry: unknown kinds refused, ask-fresh fields stripped, labels whitelisted', () => {
  assert.throws(() => K.kindDef('nope'), /Unknown profile kind/);
  const def = { ...K.PROFILE_KINDS.quiet_hours, validate: () => ({ start: '22:00', band: 'flooded', thenVsNow: 'better' }) };
  assert.deepEqual(K.checkValue(def, {}), { start: '22:00' });
  for (const d of Object.values(K.PROFILE_KINDS)) {
    assert.match(d.label, /^[A-Z][A-Za-z]+$/);
    assert.match(d.rel, /^HAS_[A-Z_]+$/);
    assert.ok(d.maxItems >= 1);
    assert.equal(d.kind, Object.keys(K.PROFILE_KINDS).find((k) => K.PROFILE_KINDS[k] === d));
  }
  assert.deepEqual(Object.keys(K.itemLabels()).sort(), ['MyPattern', 'OwnLine', 'Person', 'ProfileFact']);
});

test('keepProfileItem: counts live items, keeps on the yes, KEPT_FROM the caller\'s own session, version bumped', async () => {
  const f = fakeDriver((q) => (/RETURN count\(x\) AS n/.test(q) ? [{ n: 0 }] : [{ version: 7 }]));
  setDriver(f.driver);
  const out = await fns.keepProfileItem.run({ auth: auth(), data: { kind: 'quiet_hours', value: { start: '22:00', end: '07:00' }, sourceSessionId: ID } });
  assert.deepEqual(out, { version: 7, id: 'quiet_hours' });
  const [count, keep] = f.calls;
  assert.match(count.query, /-\[:HAS_PROFILE_FACT\]->\(x:ProfileFact \{kind: \$kind\}\)/);
  assert.match(keep.query, /MATCH \(k:ProfileKind \{id: \$kind\}\)/);
  assert.match(keep.query, /OPTIONAL MATCH \(u\)-\[:HAS_TOOL_SESSION\]->\(ts:ToolSession \{key: \$tsKey\}\)/, 'only the caller\'s own visit');
  assert.match(keep.query, /MERGE \(p\)-\[:KEPT_FROM\]->\(x\)/);
  assert.match(keep.query, /'tool:' \+ ts\.toolId/);
  assert.match(keep.query, /p:UserData:ProfileItem/);
  assert.deepEqual([keep.params.key, keep.params.tsKey], ['u1:quiet_hours', `u1:${ID}`]);
  assert.deepEqual(JSON.parse(keep.params.valueJson), { start: '22:00', end: '07:00' });
});

test('keepProfileItem: a full list is refused before any write; bad values and kinds are invalid', async () => {
  const f = fakeDriver((q) => (/RETURN count\(x\) AS n/.test(q) ? [{ n: 1 }] : [{ version: 1 }]));
  setDriver(f.driver);
  await assert.rejects(fns.keepProfileItem.run({ auth: auth(), data: { kind: 'quiet_hours', value: { start: '22:00', end: '07:00' } } }), (e) => e.code === 'resource-exhausted');
  assert.equal(f.calls.length, 1);
  for (const bad of [{ kind: 'nope', value: {} }, { kind: 'quiet_hours', value: { start: '7', end: '8' } }]) {
    await assert.rejects(fns.keepProfileItem.run({ auth: auth(), data: bad }), (e) => e.code === 'invalid-argument');
  }
});

test('editProfileItem: owner-scoped, through the validator; missing is not-found', async () => {
  const f = fakeDriver(() => [{ version: 9 }]);
  setDriver(f.driver);
  assert.deepEqual(await fns.editProfileItem.run({ auth: auth(), data: { kind: 'quiet_hours', value: { start: '23:00', end: '06:00' } } }), { version: 9 });
  assert.match(f.calls[0].query, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PROFILE_FACT\]->\(p:ProfileFact \{key: \$key\}\)/);
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.editProfileItem.run({ auth: auth(), data: { kind: 'quiet_hours', value: { start: '23:00', end: '06:00' } } }), (e) => e.code === 'not-found');
});

test('deleteProfileItem: the caller\'s own item only, whitelisted label, a real delete', async () => {
  const f = fakeDriver(() => [{ version: 2 }]);
  setDriver(f.driver);
  assert.deepEqual(await fns.deleteProfileItem.run({ auth: auth(), data: { id: 'l1', label: 'OwnLine' } }), { version: 2 });
  assert.match(f.calls[0].query, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_OWN_LINE\]->\(p:OwnLine \{key: \$key\}\)\s+DETACH DELETE p/);
  assert.equal(f.calls[0].params.key, 'u1:l1');
  await assert.rejects(fns.deleteProfileItem.run({ auth: auth(), data: { id: 'x', label: 'CheckIn' } }), (e) => e.code === 'invalid-argument');
  // Forgetting a person clears the id on their plans before the person goes (plans keep only the role).
  await fns.deleteProfileItem.run({ auth: auth(), data: { id: 'p1', label: 'Person' } });
  assert.match(f.calls[1].query, /\(p:Person \{key: \$key\}\)\s+OPTIONAL MATCH \(s:DearManSession \{ownerId: \$uid\}\)-\[:WITH_PERSON\]->\(p\)\s+REMOVE s\.personId\s+WITH DISTINCT u, p\s+DETACH DELETE p/);
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.deleteProfileItem.run({ auth: auth(), data: { id: 'x', label: 'OwnLine' } }), (e) => e.code === 'not-found');
});

test('retention job: every user with a window; one failure never stops the rest; bad rows skipped', async () => {
  const applied = [];
  const res = await R.runRetention({
    users: async () => [{ uid: 'a', days: 90 }, { uid: 'b', days: 30 }, { uid: 'c', days: 0 }, { uid: 'd', days: 180 }],
    apply: async (uid, days) => { if (uid === 'b') throw new Error('boom'); applied.push([uid, days]); },
  });
  assert.deepEqual(applied, [['a', 90], ['d', 180]]);
  assert.deepEqual(res, { users: 4, failed: 1 });
  assert.match(R.RETENTION_USERS_QUERY, /WHERE u\.dataRetentionDays > 0/);
  assert.deepEqual(fns.applyRetentionDaily.__endpoint.scheduleTrigger.schedule, 'every day 03:30');
});

test('every callable is deployed with the shared options (App Check flag, own-words key)', () => {
  const { CALL_OPTS, APP_CHECK_ENFORCED } = require(path.join(LIB, 'shared/callOptions.js'));
  assert.equal(CALL_OPTS.enforceAppCheck, APP_CHECK_ENFORCED);
  for (const [name, fn] of Object.entries(fns)) {
    const ep = fn.__endpoint;
    if (!ep.callableTrigger) continue;
    assert.deepEqual(ep.secretEnvironmentVariables.map((s) => s.key), ['NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD', 'OWN_WORDS_KEY'], name);
  }
});
