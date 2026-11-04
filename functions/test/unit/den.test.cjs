'use strict';
/**
 * The den's server (docs/design/parts.md, "The den"): linkParts / unlinkParts / writePartLink (parts/links.ts),
 * updatePartLayout and the snapshot hooks (parts/keep.ts, parts/denSnapshot.ts), getDen / getDenSnapshot
 * (parts/den.ts). Handlers over injected deps, then each callable over the fake driver.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
const L = require('../../lib/parts/links');
const K = require('../../lib/parts/keep');
const S = require('../../lib/parts/denSnapshot');
const D = require('../../lib/parts/den');

test.after(() => setDriver(null));
const auth = (uid = 'u1') => ({ uid, token: { email: `${uid}@example.test` } });
const code = (c) => (e) => e.code === c;
const A = '4a2c9a0e-1b2c-4d5e-8f90-123456789abc';
const B = '5b2c9a0e-1b2c-4d5e-8f90-123456789abc';
const C = '6c2c9a0e-1b2c-4d5e-8f90-123456789abc';
const NOW = new Date('2026-10-17T12:00:00Z');

// ------------------------------------------------------------------ links

const linkDeps = (st = {}) => {
  const log = [];
  return {
    log,
    deps: {
      state: async (q) => { log.push(['state', q]); return { partsOn: true, version: 4, aFound: true, bFound: true, linked: false, bothWantKnown: true, ...st }; },
      write: async (w) => { log.push(['write', w]); return st.writeVersion === undefined ? 5 : st.writeVersion; },
      remove: async (id) => { log.push(['remove', id]); return st.removeVersion === undefined ? 6 : st.removeVersion; },
    },
  };
};

test('linkParts: on a yes, both parts the caller\'s; the derived id; covers_for from the den, two_pulls from Two pulls', async () => {
  const f = linkDeps();
  const out = await L.linkPartsHandler({ kind: 'covers_for', aId: B, bId: A, bothWantId: null }, f.deps);
  assert.deepEqual(out, { id: `covers_for_${A}_${B}`, created: true, version: 5 });
  const w = f.log.find(([k]) => k === 'write')[1];
  assert.deepEqual([w.aId, w.bId, w.source, w.linkId], [B, A, 'den', `covers_for_${A}_${B}`], 'aId stands in front, as asked');
  const g = linkDeps({ linked: true });
  assert.deepEqual(await L.linkPartsHandler({ kind: 'two_pulls', aId: A, bId: B, bothWantId: 'want_safe' }, g.deps),
    { id: `two_pulls_${A}_${B}`, created: false, version: 5 }, 'a repeat keeps the latest answer');
  assert.equal(g.log.find(([k]) => k === 'write')[1].source, 'two_pulls');
});

test('linkParts: refused before any write: parts off, a part not theirs or not in the room, an unknown both-want', async () => {
  for (const [st, c] of [[{ partsOn: false }, 'failed-precondition'], [{ aFound: false }, 'not-found'], [{ bFound: false }, 'not-found']]) {
    const f = linkDeps(st);
    await assert.rejects(L.linkPartsHandler({ kind: 'covers_for', aId: A, bId: B, bothWantId: null }, f.deps), code(c));
    assert.ok(!f.log.some(([k]) => k === 'write'));
  }
  const f = linkDeps({ bothWantKnown: false });
  await assert.rejects(L.linkPartsHandler({ kind: 'two_pulls', aId: A, bId: B, bothWantId: 'want_nonsense' }, f.deps), code('invalid-argument'));
  const g = linkDeps({ writeVersion: null });
  await assert.rejects(L.linkPartsHandler({ kind: 'covers_for', aId: A, bId: B, bothWantId: null }, g.deps), code('failed-precondition'));
});

test('unlinkParts: the caller\'s link, once; a repeat removes nothing; parts off refused', async () => {
  const id = `covers_for_${A}_${B}`;
  const f = linkDeps({ linked: true });
  assert.deepEqual(await L.unlinkPartsHandler({ linkId: id }, f.deps), { removed: true, version: 6 });
  const g = linkDeps({ linked: false });
  assert.deepEqual(await L.unlinkPartsHandler({ linkId: id }, g.deps), { removed: false, version: 4 });
  assert.ok(!g.log.some(([k]) => k === 'remove'));
  await assert.rejects(L.unlinkPartsHandler({ linkId: id }, linkDeps({ partsOn: false, linked: true }).deps), code('failed-precondition'));
});

test('links over the fake driver: caller-scoped keys, profile labels, both LINKS edges, signed in, invalid refused', async () => {
  const f = fakeDriver((q) => {
    if (q === L.LINK_STATE_QUERY) return [{ partsOn: true, version: 2, aFound: true, bFound: true, linked: false, bothWantKnown: false }];
    if (q === L.WRITE_PART_LINK_QUERY) return [{ version: 3 }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.linkParts.run({ auth: auth('real-user'), data: { kind: 'covers_for', aId: A, bId: B } }),
    { id: `covers_for_${A}_${B}`, created: true, version: 3 });
  const w = f.calls.find((c) => c.query === L.WRITE_PART_LINK_QUERY);
  assert.deepEqual([w.params.uid, w.params.aKey, w.params.bKey, w.params.linkKey],
    ['real-user', `real-user:${A}`, `real-user:${B}`, `real-user:covers_for_${A}_${B}`]);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'WRITE');
  assert.match(L.WRITE_PART_LINK_QUERY, /MATCH \(u:User \{id: \$uid\}\) WHERE coalesce\(u\.partsEnabled, false\)/);
  assert.match(L.WRITE_PART_LINK_QUERY, /MATCH \(u\)-\[:HAS_PART\]->\(pa:Part \{key: \$aKey\}\) WHERE pa\.status IN \['active', 'resting'\]/);
  assert.match(L.WRITE_PART_LINK_QUERY, /MERGE \(u\)-\[:HAS_PART_LINK\]->\(l\)/);
  assert.match(L.WRITE_PART_LINK_QUERY, /l\.confirmedAt = datetime\(\)/);
  assert.match(L.REMOVE_PART_LINK_QUERY, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART_LINK\]->\(l:PartLink \{key: \$linkKey\}\)/);
  await assert.rejects(fns.linkParts.run({ auth: auth(), data: { kind: 'covers_for', aId: A, bId: A } }), code('invalid-argument'));
  await assert.rejects(fns.linkParts.run({ auth: auth(), data: { kind: 'covers_for', aId: A, bId: B, note: 'x' } }), code('invalid-argument'));
  await assert.rejects(fns.unlinkParts.run({ auth: auth(), data: { linkId: 'anything' } }), code('invalid-argument'));
  await assert.rejects(fns.linkParts.run({ data: { kind: 'covers_for', aId: A, bId: B } }), code('unauthenticated'));
});

test('writePartLink (Two pulls): validates like the callable, then the same checks inside the given transaction', async () => {
  const calls = [];
  const tx = {
    run: async (q, p) => {
      calls.push([q, p]);
      const rows = q === L.LINK_STATE_QUERY ? [{ partsOn: true, version: 1, aFound: true, bFound: true, linked: false, bothWantKnown: true }]
        : q === L.WRITE_PART_LINK_QUERY ? [{ version: 2 }] : [];
      return { records: rows.map((r) => ({ get: (k) => r[k], has: (k) => k in r })) };
    },
  };
  assert.deepEqual(await L.writePartLink(tx, 'u9', { kind: 'two_pulls', aId: A, bId: B, bothWantId: 'want_safe' }),
    { id: `two_pulls_${A}_${B}`, created: true, version: 2 });
  assert.equal(calls[1][1].bothWantId, 'want_safe');
  await assert.rejects(L.writePartLink(tx, 'u9', { kind: 'two_pulls', aId: A, bId: 'x' }), code('invalid-argument'));
  await assert.rejects(L.removePartLink({ run: async () => ({ records: [] }) }, 'u9', `two_pulls_${A}_${B}`), code('failed-precondition'), 'no user: parts off');
  await assert.rejects(L.removePartLink(tx, 'u9', 'nope'), code('invalid-argument'));
});

// ------------------------------------------------------------------ layout

test('updatePartLayout: all or none of the caller\'s parts in the room; parts off refused; positions only', async () => {
  const deps = (st, version = 7) => {
    const log = [];
    return { log, deps: { state: async (ids) => { log.push(['state', ids]); return { partsOn: true, version: 6, found: ids.length, ...st }; }, write: async (p) => { log.push(['write', p]); return version; } } };
  };
  const input = { positions: [{ partId: A, mapX: 0.2, mapY: 0.3 }, { partId: B, mapX: 1, mapY: 0 }] };
  const f = deps({});
  assert.deepEqual(await K.updatePartLayoutHandler(input, f.deps), { version: 7 });
  assert.deepEqual(f.log[1][1], input.positions);
  for (const [st, c] of [[{ partsOn: false }, 'failed-precondition'], [{ found: 1 }, 'not-found']]) {
    const g = deps(st);
    await assert.rejects(K.updatePartLayoutHandler(input, g.deps), code(c));
    assert.ok(!g.log.some(([k]) => k === 'write'));
  }
  await assert.rejects(K.updatePartLayoutHandler(input, deps({}, null).deps), code('failed-precondition'));
});

test('updatePartLayout over the fake driver: caller-scoped keys, one write, invalid refused', async () => {
  const f = fakeDriver((q) => {
    if (q === K.LAYOUT_STATE_QUERY) return [{ partsOn: true, version: 1, found: 1 }];
    if (q === K.UPDATE_PART_LAYOUT_QUERY) return [{ version: 2, moved: 1 }];
    return new Error('unexpected');
  });
  setDriver(f.driver);
  assert.deepEqual(await fns.updatePartLayout.run({ auth: auth('real-user'), data: { positions: [{ partId: A, mapX: 0.5, mapY: 0.5 }] } }), { version: 2 });
  const s = f.calls.find((c) => c.query === K.LAYOUT_STATE_QUERY);
  assert.deepEqual(s.params.partKeys, [`real-user:${A}`]);
  const w = f.calls.find((c) => c.query === K.UPDATE_PART_LAYOUT_QUERY);
  assert.deepEqual(w.params.positions, [{ partKey: `real-user:${A}`, mapX: 0.5, mapY: 0.5 }]);
  await assert.rejects(fns.updatePartLayout.run({ auth: auth(), data: { positions: [{ partId: A, mapX: -0.1, mapY: 0 }] } }), code('invalid-argument'));
  await assert.rejects(fns.updatePartLayout.run({ data: { positions: [{ partId: A, mapX: 0, mapY: 0 }] } }), code('unauthenticated'));
});

// ------------------------------------------------------------------ snapshots

const editDeps = (part, extra = {}) => {
  const log = [];
  return {
    log,
    deps: {
      state: async () => ({ partsOn: true, version: 3, part, revisitLogged: false, knownRather: extra.knownRather ?? 0, lineOwned: false, nameMax: 40, revisitDays: 30 }),
      write: async (q) => { log.push(['write', q]); return 4; },
      snapshot: async () => { log.push(['snapshot']); },
    },
  };
};

test('snapshots: rest, wake and a still-true answer that rests, wakes or re-jobs take one; the rest don\'t', async () => {
  const rested = editDeps({ status: 'active' });
  await K.restPartHandler({ partId: A, resting: true }, rested.deps);
  assert.deepEqual(rested.log.map(([k]) => k), ['write', 'snapshot']);
  const woken = editDeps({ status: 'resting' });
  await K.restPartHandler({ partId: A, resting: false }, woken.deps);
  assert.deepEqual(woken.log.map(([k]) => k), ['write', 'snapshot']);
  const same = editDeps({ status: 'active' });
  await K.restPartHandler({ partId: A, resting: false }, same.deps);
  assert.deepEqual(same.log, [], 'nothing changed: no write, no snapshot');
  const yes = editDeps({ status: 'active' });
  await K.answerPartRevisitHandler({ id: C, partId: A, answer: 'same', ratherIds: [] }, yes.deps);
  assert.deepEqual(yes.log.map(([k]) => k), ['write'], 'still doing the same job: no snapshot');
  const restAnswer = editDeps({ status: 'active' });
  await K.answerPartRevisitHandler({ id: C, partId: A, answer: 'resting', ratherIds: [] }, restAnswer.deps);
  assert.deepEqual(restAnswer.log.map(([k]) => k), ['write', 'snapshot']);
  const renamed = editDeps({ status: 'active', name: 'x' });
  await K.renamePartHandler({ partId: A, name: 'y' }, renamed.deps);
  assert.deepEqual(renamed.log.map(([k]) => k), ['write']);
});

test('snapshotDen: the room\'s layout, one per UTC day, nothing for an empty room', async () => {
  const calls = [];
  const tx = (rows) => ({
    run: async (q, p) => {
      calls.push([q, p]);
      const out = q === S.DEN_LAYOUT_QUERY ? rows : q === S.WRITE_DEN_SNAPSHOT_QUERY ? [{ id: p.snapshotId }] : [];
      return { records: out.map((r) => ({ get: (k) => r[k] })) };
    },
  });
  assert.equal(await S.snapshotDen(tx([]), 'u1', NOW), null);
  assert.equal(calls.length, 1, 'no write for an empty room');
  const id = await S.snapshotDen(tx([{ id: A, mapX: 0.4, mapY: null, status: 'active', tender: true }]), 'u1', NOW);
  assert.equal(id, 'den_2026-10-17');
  const w = calls.find(([q]) => q === S.WRITE_DEN_SNAPSHOT_QUERY)[1];
  assert.deepEqual([w.snapshotKey, w.snapshotId], ['u1:den_2026-10-17', 'den_2026-10-17']);
  assert.deepEqual(JSON.parse(w.layoutJson), [{ id: A, mapX: 0.4, mapY: null, status: 'active', tender: true }]);
  assert.match(S.WRITE_DEN_SNAPSHOT_QUERY, /SET s\.takenAt = datetime\(\), s\.layoutJson = \$layoutJson/, 'the day\'s latest wins');
  assert.match(S.WRITE_DEN_SNAPSHOT_QUERY, /MERGE \(u\)-\[:HAS_DEN_SNAPSHOT\]->\(s\)/);
});

// ------------------------------------------------------------------ the reads

test('getDen: nothing with parts off; recency from the latest touch; no dates on parts', async () => {
  const off = await D.getDenHandler({ den: async () => ({ partsOn: false, slice: { parts: [], links: [], snapshots: [] } }), touches: async () => { throw new Error('not read'); }, snapshot: async () => null }, NOW);
  assert.deepEqual(off, { parts: [], links: [], snapshots: [] });
  const out = await D.getDenHandler({
    den: async () => ({ partsOn: true, slice: {
      parts: [
        { id: A, name: null, status: 'active', tender: true, shapeSig: null, mapX: null, mapY: null, lastVisitedAt: '2026-10-10T10:00:00Z', safety: false },
        { id: B, name: 'b', status: 'resting', tender: false, shapeSig: null, mapX: 0.1, mapY: 0.9, lastVisitedAt: '2026-06-01T10:00:00Z', safety: true },
        { id: C, name: 'c', status: 'active', tender: false, shapeSig: null, mapX: 0.5, mapY: 0.5, lastVisitedAt: '2026-06-01T10:00:00Z', safety: false },
      ],
      links: [{ id: `covers_for_${A}_${B}`, kind: 'covers_for', aId: B, bId: A, bothWantId: null }],
      snapshots: [],
    } }),
    touches: async () => new Map([[C, [null, '2026-09-01T10:00:00Z', null]]]),
    snapshot: async () => null,
  }, NOW);
  assert.deepEqual(out.parts.map((p) => [p.id, p.recency]), [[A, 'near'], [B, 'not_lately'], [C, 'a_while']]);
  assert.ok(out.parts.every((p) => !('lastVisitedAt' in p)));
  assert.equal(out.links.length, 1);
});

test('getDenSnapshot: the caller\'s own by key; nothing with parts off or when it isn\'t theirs', async () => {
  const deps = (st) => ({ den: async () => null, touches: async () => new Map(), snapshot: async () => st });
  assert.deepEqual(await D.getDenSnapshotHandler({ id: 'den_2026-10-01' }, deps({ partsOn: false, layoutJson: null, takenAt: null })), { parts: [] });
  assert.deepEqual(await D.getDenSnapshotHandler({ id: 'den_2026-10-01' }, deps({ partsOn: true, layoutJson: null, takenAt: null })), { parts: [] });
  const layout = [{ id: A, mapX: 0.2, mapY: 0.2, status: 'active', tender: false }];
  assert.deepEqual(await D.getDenSnapshotHandler({ id: 'den_2026-10-01' }, deps({ partsOn: true, layoutJson: JSON.stringify(layout), takenAt: '2026-10-01T09:00:00Z' })),
    { parts: layout, takenAt: '2026-10-01T09:00:00Z' });
});

test('getDen over the fake driver: one read transaction, parts off reads nothing else, signed in', async () => {
  const off = fakeDriver((q) => (/RETURN coalesce\(u\.partsEnabled, false\) AS partsOn$/.test(q.trim()) ? [{ partsOn: false }] : new Error('unexpected')));
  setDriver(off.driver);
  assert.deepEqual(await fns.getDen.run({ auth: auth('u2'), data: {} }), { parts: [], links: [], snapshots: [] });
  assert.equal(off.calls.length, 1);
  assert.equal(off.sessions[0].config.defaultAccessMode, 'READ');
  const on = fakeDriver((q) => {
    if (/AS partsOn$/.test(q.trim())) return [{ partsOn: true }];
    if (/HAS_DEN_SNAPSHOT/.test(q) && /AS snapshots/.test(q)) {
      return [{ parts: [{ id: A, name: 'a', status: 'active', tender: false, shapeSig: null, mapX: 0.5, mapY: 0.5, lastVisitedAt: null, safety: false }], links: [], snapshots: [] }];
    }
    // A touch from yesterday: 'near' whatever day the suite runs (a fixed date aged out of the bucket).
    if (q === D.DEN_TOUCHES_QUERY) return [{ partId: A, tagAt: new Date(Date.now() - 86_400_000).toISOString(), checkbackAt: null, revisitAt: null }];
    return new Error('unexpected');
  });
  setDriver(on.driver);
  const out = await fns.getDen.run({ auth: auth('u3'), data: {} });
  assert.deepEqual(out.parts.map((p) => p.recency), ['near']);
  assert.ok(on.calls.every((c) => c.params.uid === 'u3'));
  await assert.rejects(fns.getDenSnapshot.run({ auth: auth(), data: { id: 'nope' } }), code('invalid-argument'));
  await assert.rejects(fns.getDen.run({ data: {} }), code('unauthenticated'));
});
