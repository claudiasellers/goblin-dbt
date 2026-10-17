'use strict';
/**
 * The part safety seam (functions/src/safety/partSafetyFlag.ts) on the server: the parts slice, getMe's part
 * item and the Today check-back all carry `safety`, computed by the seam's own predicate, a tender part's
 * hidden fears included; the client never gets fears to decide with.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const S = require('../../lib/safety/partSafetyFlag');
const CB = require('../../lib/parts/checkback');
const { SLICE_QUERIES } = require('../../lib/profile/slices');

const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const PID = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const FID = '8e2c9a0e-1b2c-4d5e-8f90-123456789abc';
const SEAM = S.partSafetyCypher('p');
const partRow = (o = {}) => ({ p: { id: PID, kind: 'part', area: 'my_parts', status: 'active', source: 'made', confirmedAt: null, revisitAt: null, name: 'the one who turns on me', tender: false, ...o }, moveIds: ['turn_on_myself'] });

test('the pure seam: a safety-line move, a danger fear, neither', () => {
  const content = { moves: [{ id: 'm1', safetyLine: true }, { id: 'm2', safetyLine: false }], fears: [{ id: 'f1', flag: 'danger' }, { id: 'f2', flag: 'tender' }] };
  assert.equal(S.partSafetyFlag({ moveIds: ['m1'], fearIds: [] }, content), true);
  assert.equal(S.partSafetyFlag({ moveIds: ['m2'], fearIds: ['f1'] }, content), true);
  assert.equal(S.partSafetyFlag({ moveIds: ['m2'], fearIds: ['f2'] }, content), false);
});

test('the parts slice carries the seam\'s boolean (and nothing of the fears it read)', async () => {
  assert.ok(SLICE_QUERIES.parts.includes(`${SEAM} AS safety`));
  const f = fakeDriver((q) => {
    if (/profileVersion/.test(q)) return [{ v: 1 }];
    if (q === SLICE_QUERIES.parts) return [{ ...partRow(), safety: true }, { ...partRow({ id: 'p2', name: 'the quiet one' }), moveIds: [], safety: false }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getProfileContext.run({ auth: auth(), data: { toolId: 'meet-a-part' } });
  assert.deepEqual(out.slices.parts.map((p) => [p.id, p.safety]), [[PID, true], ['p2', false]]);
  assert.ok(!('fearIds' in out.slices.parts[0]));
});

test('getMe: a tender part with a danger fear is flagged, though its fears never leave the server', async () => {
  const f = fakeDriver((q) => {
    if (/AS partsOn/.test(q)) return [{ partsOn: true, timeZone: null }];
    if (/MATCH \(a:ProfileArea\)/.test(q)) return [{ id: 'my_parts', label: 'Parts of me', blurb: 'b', kinds: [] }];
    if (/HAS_PROFILE_FACT\|HAS_PATTERN/.test(q)) {
      return [{ label: 'Part', title: 'A part', stillTrue: '', setAside: '', statement: null, moveIds: ['hide'], safety: true,
        p: { id: PID, kind: 'part', area: 'my_parts', status: 'active', source: 'made', revisitAt: null, tender: true, fearIds: ['turn_fear_hurt_myself'] } }];
    }
    return [];
  });
  setDriver(f.driver);
  const me = await fns.getMe.run({ auth: auth(), data: {} });
  const part = me.areas.find((a) => a.id === 'my_parts').items[0].part;
  assert.deepEqual([part.safety, part.fearIds], [true, []]);
  const q = f.calls.find((c) => /HAS_PART\]/.test(c.query)).query;
  assert.ok(q.includes(`CASE type(r) WHEN 'HAS_PART' THEN ${SEAM} ELSE false END AS safety`));
});

test('Today: the check-back card\'s part carries the flag from the slice', async () => {
  const inH = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
  const type = { t: { id: 'part_checkback', ownerModule: 'mf', hierarchyTier: 'quality', resolveMode: 'inline', staleAfterHours: 36, missedPath: 'none',
    notifyPush: false, notifyInTab: false, notifyIcs: false, enabled: true, deepLinkTemplate: null,
    contentJson: JSON.stringify({ copy: { title: "How's {name} today?" }, choices: [{ id: 'settled', label: 'Settled', status: 'done' }], window: {}, notification: '' }) } };
  setDriver(fakeDriver((q) => {
    if (/MATCH \(t:FollowUpType\) WHERE/.test(q)) return [type];
    if (q === CB.CHECKBACK_ITEMS_QUERY) return [{ id: FID, dueAt: inH(-1), partId: PID }];
    if (q === SLICE_QUERIES.parts) return [{ ...partRow(), safety: true }];
    return [];
  }).driver);
  const out = await fns.getToday.run({ auth: auth(), data: {} });
  const card = [...out.items, ...out.more].find((i) => i.type === 'part_checkback');
  assert.deepEqual(card.part, { id: PID, name: 'the one who turns on me', tender: false, safety: true });
});
