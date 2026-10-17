// The den's data (docs/design/parts.md, "The den"): PartLink and DenSnapshot are profile, each with one
// writer; the layout writer lives with the other Part writers; the room's read buckets recency on the
// server and never sends a date or a count of it. Handlers are pinned in functions/test/unit/den.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const sources = walk("functions/src").filter((f) => f.endsWith(".ts"));

const layers = await importTs("functions/src/userdata/layers.ts");
const den = await importTs("functions/src/parts/den.ts");
const snap = await importTs("functions/src/parts/denSnapshot.ts");
const links = await importTs("functions/src/parts/links.ts");
const keep = await importTs("functions/src/parts/keep.ts");
const editPlan = await importTs("functions/src/parts/editPlan.ts");

/** Files that write a node of `label` (MERGE / CREATE it, or SET / REMOVE / DELETE a variable bound to it). */
function writersOf(label) {
  const out = [];
  for (const f of sources) {
    const src = read(f);
    const vars = [...src.matchAll(new RegExp(`\\((\\w+):${label}\\b(?![A-Za-z])`, "g"))].map((m) => m[1]);
    const creates = new RegExp(`\\b(MERGE|CREATE)\\s*\\(\\w*:${label}\\b(?![A-Za-z])`).test(src);
    const sets = vars.some((v) => new RegExp(`\\b(SET|REMOVE|DELETE)\\s+[^\\n]*\\b${v}(\\.|\\s*\\+=|\\s*=|:|\\s*$)`, "m").test(src));
    if (creates || sets) out.push(f);
  }
  return out;
}

test("PartLink and DenSnapshot: profile, registered, keyed, exported and deleted by label", () => {
  assert.deepEqual(layers.USER_DATA.PartLink, { layer: "profile", rel: "HAS_PART_LINK", exportAs: "partLinks" });
  assert.deepEqual(layers.USER_DATA.DenSnapshot, { layer: "profile", rel: "HAS_DEN_SNAPSHOT", exportAs: "denSnapshots" });
  const ddl = read("schema/constraints.cypher");
  assert.match(ddl, /^CREATE CONSTRAINT part_link_key IF NOT EXISTS FOR \(n:PartLink\) REQUIRE n\.key IS UNIQUE;$/m);
  assert.match(ddl, /^CREATE CONSTRAINT den_snapshot_key IF NOT EXISTS FOR \(n:DenSnapshot\) REQUIRE n\.key IS UNIQUE;$/m);
  // deleteMyParts removes the registered design labels; both are design labels.
  assert.match(read("functions/src/parts/delete.ts"), /PARTS_DESIGN_LABELS = \[[^\]]*'PartLink', 'DenSnapshot'/);
});

test("single writers: links.ts for PartLink, denSnapshot.ts for DenSnapshot, keep.ts for a Part's place", () => {
  assert.deepEqual(writersOf("PartLink"), ["functions/src/parts/links.ts"]);
  assert.deepEqual(writersOf("DenSnapshot"), ["functions/src/parts/denSnapshot.ts"]);
  const l = read("functions/src/parts/links.ts");
  assert.match(l, /MERGE \(l:PartLink \{key: \$linkKey\}\)\s+ON CREATE SET l:UserData:ProfileItem/);
  assert.match(l, /MERGE \(l\)-\[:LINKS\]->\(pa\)\s+MERGE \(l\)-\[:LINKS\]->\(pb\)/);
  for (const f of ["writePartLink", "removePartLink"]) assert.match(l, new RegExp(`export async function ${f}\\(tx: ManagedTransaction, uid: string`));
  assert.match(read("functions/src/parts/denSnapshot.ts"), /MERGE \(s:DenSnapshot \{key: \$snapshotKey\}\)\s+ON CREATE SET s:UserData:ProfileItem/);
  // Only keep.ts' writers take a snapshot.
  const callers = sources.filter((f) => /snapshotDen\(/.test(read(f)) && !f.endsWith("denSnapshot.ts"));
  assert.deepEqual(callers, ["functions/src/parts/keep.ts"]);
});

test("updatePartLayout: positions only; never a visit, a confirmation or a revisit date", () => {
  const q = keep.UPDATE_PART_LAYOUT_QUERY;
  assert.match(q, /WHERE coalesce\(u\.partsEnabled, false\)/);
  assert.match(q, /MATCH \(u\)-\[:HAS_PART\]->\(p:Part \{key: pos\.partKey\}\) WHERE p\.status IN \['active', 'resting'\]/);
  assert.match(q, /SET p\.mapX = pos\.mapX, p\.mapY = pos\.mapY\n/);
  assert.doesNotMatch(q, /lastVisitedAt|confirmedAt|revisitAt|lastReviewedAt|updatedAt/);
  assert.throws(() => editPlan.validateLayout({ positions: [] }), /positions/);
  const id = "4a2c9a0e-1b2c-4d5e-8f90-123456789abc";
  assert.throws(() => editPlan.validateLayout({ positions: [{ partId: id, mapX: 1.1, mapY: 0 }] }), /0 to 1/);
  assert.throws(() => editPlan.validateLayout({ positions: [{ partId: id, mapX: 0, mapY: 0 }, { partId: id, mapX: 1, mapY: 1 }] }), /one per part/);
  assert.throws(() => editPlan.validateLayout({ positions: [{ partId: id, mapX: 0, mapY: 0, name: "x" }] }), /not accepted/);
  assert.deepEqual(editPlan.validateLayout({ positions: [{ partId: id, mapX: 0, mapY: 1 }] }), { positions: [{ partId: id, mapX: 0, mapY: 1 }] });
});

test("links: one id per pair and kind, whichever way round; no self-link; bothWant only on two pulls", () => {
  const a = "4a2c9a0e-1b2c-4d5e-8f90-123456789abc", b = "5b2c9a0e-1b2c-4d5e-8f90-123456789abc";
  assert.equal(links.partLinkId("covers_for", a, b), links.partLinkId("covers_for", b, a));
  assert.notEqual(links.partLinkId("covers_for", a, b), links.partLinkId("two_pulls", a, b));
  assert.match(links.partLinkId("two_pulls", a, b), links.PART_LINK_ID);
  assert.throws(() => links.validateLink({ kind: "covers_for", aId: a, bId: a }), /itself/);
  assert.throws(() => links.validateLink({ kind: "covers_for", aId: a, bId: b, bothWantId: "want_safe" }), /two_pulls only/);
  assert.throws(() => links.validateLink({ kind: "rivals", aId: a, bId: b }));
  assert.deepEqual(links.validateLink({ kind: "two_pulls", aId: a, bId: b, bothWantId: "want_safe" }), { kind: "two_pulls", aId: a, bId: b, bothWantId: "want_safe" });
  assert.equal(links.linkSource("covers_for"), "den");
  assert.equal(links.linkSource("two_pulls"), "two_pulls");
});

test("recency: the latest of the times, three buckets, never a date", async () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const ago = (d) => new Date(now.getTime() - d * 86_400_000).toISOString();
  assert.equal(den.recencyBucket([ago(3)], now), "near");
  assert.equal(den.recencyBucket([ago(90), ago(14)], now), "near");
  assert.equal(den.recencyBucket([ago(15)], now), "a_while");
  assert.equal(den.recencyBucket([ago(61), null], now), "not_lately");
  assert.equal(den.recencyBucket([], now), "not_lately");
  assert.equal(den.recencyBucket(["nonsense"], now), "not_lately");
  const out = await den.getDenHandler({
    den: async () => ({ partsOn: true, slice: {
      parts: [{ id: "p1", name: "the one who hides", status: "active", tender: false, shapeSig: null, mapX: 0.3, mapY: 0.4, lastVisitedAt: ago(40), safety: false }],
      links: [], snapshots: [{ id: "den_2026-10-01", takenAt: "2026-10-01T10:00:00Z" }],
    } }),
    touches: async () => new Map([["p1", [ago(2), null, null]]]),
    snapshot: async () => { throw new Error("not read"); },
  }, now);
  assert.deepEqual(out.parts, [{ id: "p1", name: "the one who hides", status: "active", tender: false, shapeSig: null, mapX: 0.3, mapY: 0.4, safety: false, recency: "near" }]);
  assert.doesNotMatch(JSON.stringify(out.parts), /\d{4}-\d{2}-\d{2}/, "no date of a part reaches the client");
});

test("the room's touches: the caller's own tags, answered check-backs and still-true answers, parts on", () => {
  const q = den.DEN_TOUCHES_QUERY;
  assert.match(q, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_PART\]->\(pt:Part\)\s+WHERE coalesce\(u\.partsEnabled, false\) AND pt\.status IN \['active', 'resting'\]/);
  assert.match(q, /\(u\)-\[:HAS_PART_TAG\]->\(t:PartTag\)-\[:OF_PART\]->\(pt\)/);
  assert.match(q, /\(u\)-\[:HAS_FOLLOW_UP\]->\(f:FollowUp \{type: \$checkbackType\}\)\s+WHERE pt\.id = f\.partId AND f\.status = 'done'/);
  assert.match(q, /\(u\)-\[:HAS_PART_REVISIT\]->\(r:PartRevisit\)-\[:OF_PART\]->\(pt\)/);
  assert.match(den.DEN_SNAPSHOT_QUERY, /MATCH \(u:User \{id: \$uid\}\)-\[:HAS_DEN_SNAPSHOT\]->\(s:DenSnapshot \{key: \$snapshotKey\}\)\s+WHERE coalesce\(u\.partsEnabled, false\)/);
});

test("snapshots: one per UTC day, layout only (ids, places, status, tender), parsed defensively", () => {
  assert.equal(snap.denSnapshotId(new Date("2026-10-17T23:59:00Z")), "den_2026-10-17");
  assert.match(snap.denSnapshotId(new Date()), snap.DEN_SNAPSHOT_ID);
  const layout = snap.denLayout([{ id: "p1", mapX: 0.2, mapY: 2, status: "resting", tender: true, name: "secret" }, { mapX: 0 }]);
  assert.deepEqual(layout, [{ id: "p1", mapX: 0.2, mapY: null, status: "resting", tender: true }]);
  assert.deepEqual(snap.parseDenLayout(JSON.stringify(layout)), layout);
  assert.deepEqual(snap.parseDenLayout("{"), []);
  assert.deepEqual(snap.parseDenLayout(null), []);
  assert.doesNotMatch(snap.DEN_LAYOUT_QUERY, /\.name|own|fear|job/i);
  assert.throws(() => den.validateSnapshotRef({ id: "den_2026-10-17", extra: 1 }), /not accepted/);
  assert.throws(() => den.validateSnapshotRef({ id: "anything" }), /snapshot id/);
});
