// Me → Parts of me (docs/design/parts.md, "Parts of me (Me)", "The part card"): read-only cards, shown
// only with parts on and the card copy signed off; never a fear on a tender part, never the own-words
// fear; labels from the shipped parts content by id; links into Meet a part.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const lib = await importTs("src/lib/partsOfMe.ts");
const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const opt = (step, i = 0) => fixture.options.meet[step][i];
const plainFear = fixture.options.meet.fear.find((o) => o.flag === null);
const tenderFear = fixture.options.meet.fear.find((o) => o.flag === "tender");
const part = (o = {}) => ({ name: null, tender: false, places: [], shapeSig: null, jobIds: [], ownJob: null, fearIds: [], preferredRoleIds: [], moveIds: [], lastVisitedAt: null, ...o });
const item = (id, o = {}, meta = {}) => ({ label: "Part", title: "A part", summary: "", editor: null, stillTrueCopy: "", setAsideCopy: "",
  meta: { id, kind: "part", area: "my_parts", status: "active", source: "made", confirmedAt: null, revisitAt: null, prompt: "none", ...meta }, part: part(o) });

test("the area's copy: every me / card prompt, all or nothing", () => {
  const inFlow = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "me").map(([id]) => id);
  assert.deepEqual([...lib.PARTS_OF_ME_PROMPTS].sort(), inFlow.sort());
  for (const id of lib.PARTS_OF_ME_PROMPTS) assert.equal(fixture.prompts[id].reviewStatus, "draft", `${id}: signed off? update this pin`);
  const ready = { ...shipped, prompts: Object.fromEntries(lib.PARTS_OF_ME_PROMPTS.map((id) => [id, fixture.prompts[id]])) };
  assert.equal(lib.partsOfMeCopy(ready).card_visit, fixture.prompts.card_visit.copy);
  const missing = { ...ready, prompts: { ...ready.prompts } };
  delete missing.prompts.card_resting;
  assert.equal(lib.partsOfMeCopy(missing), null);
  assert.equal(lib.partsOfMeCopy(null), null);
  assert.equal(lib.partsOfMeCopy(shipped) === null, !lib.PARTS_OF_ME_PROMPTS.every((id) => shipped.prompts[id]), "the shipped file decides");
});

test("Me's gate: parts off or copy missing → exactly as before", () => {
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /const partsCopy = partsOn \? partsOfMeCopy\(partsContent\) : null;/);
  assert.match(me, /const shown: ProfileAreaId\[\] = partsCopy \? \[\.\.\.PHASE_A_AREAS, 'my_parts'\] : PHASE_A_AREAS;/);
  assert.match(me, /const partsOn = profile\.partsEnabled === true;/);
  assert.match(me, /if \(!partsOn\) return;/, "the content isn't even fetched with parts off");
  assert.match(me, /i\.label !== 'Part'/, "a part never lands in the generic still-true list");
  assert.match(me, /renderSetAside=\{setAsidePart\}/, "set-aside parts: read-only rows, not the generic restoreProfileItem row");
});

test("card rows: labels by id, own-words job wins, no fear on a tender part or from a tender / danger chip", () => {
  const p = part({ places: ["chest", "throat", "nowhere_known"], jobIds: [opt("job").id, "not_signed_off"], fearIds: [plainFear.id, tenderFear.id],
    preferredRoleIds: [opt("rather", 1).id] });
  assert.deepEqual(lib.partCardRows(p, fixture), {
    where: ["Chest", "Throat"], job: { labels: [opt("job").label] }, fears: [plainFear.label], rather: [opt("rather", 1).label],
  });
  assert.deepEqual(lib.partCardRows({ ...p, ownJob: "  keep me safe " }, fixture).job, { own: "keep me safe" });
  assert.deepEqual(lib.partCardRows({ ...p, tender: true }, fixture).fears, [], "tender: no fear row");
  assert.equal(lib.partCardRows(part(), fixture).job, null);
});

test("the own-words fear never reaches the app, the card, or getMe's projection", () => {
  for (const f of ["src/components/me/PartsOfMe.tsx", "src/lib/partsOfMe.ts"]) assert.doesNotMatch(read(f), /ownFear/, f);
  const svc = read("src/services/profile.ts");
  assert.doesNotMatch(svc.slice(svc.indexOf("export interface MePart"), svc.indexOf("}", svc.indexOf("export interface MePart"))), /ownFear/);
  assert.doesNotMatch(read("functions/src/profile/me.ts"), /\.ownFear\b|ownFear:/);
});

test("order: most recently visited first, then newest kept, then id", () => {
  const items = [
    item("a", {}, { confirmedAt: "2026-09-01T00:00:00Z" }),
    item("b", { lastVisitedAt: "2026-10-01T00:00:00Z" }),
    item("c", { lastVisitedAt: "2026-10-05T00:00:00Z" }),
    item("d", {}, { confirmedAt: "2026-09-05T00:00:00Z" }),
  ];
  assert.deepEqual(lib.sortPartItems(items).map((i) => i.meta.id), ["c", "b", "d", "a"]);
});

test("links into Meet a part carry the trailhead and, for a card, the part", async () => {
  assert.deepEqual(lib.meetAPartLink(), { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "me" } } });
  assert.deepEqual(lib.meetAPartLink("p1"), { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "me", partId: "p1" } } });
  // Meet a part reads exactly this shape.
  const { parseMeetEntry } = await importTs("src/lib/meetAPartSave.ts");
  const id = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
  const entry = parseMeetEntry(lib.meetAPartLink(id).state);
  assert.deepEqual([entry.trailheadKind, entry.partId], ["me", id]);
  assert.equal(parseMeetEntry(lib.meetAPartLink().state).partId, null);
});

test("the cards: headed list items, the figure, no hard-coded copy (unnamed falls back to the kind's label)", () => {
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /<li className=/);
  assert.match(c, /<h4 [\s\S]*?\{part\.name \?\? item\.title\}/);
  assert.match(c, /<PartFigure shapeSig=\{part\.shapeSig\}/);
  assert.match(c, /meetAPartLink\(item\.meta\.id\)/);
  assert.match(c, /item\.meta\.status === 'resting' && [\s\S]*?\{copy\.card_resting\}/);
  const text = [...c.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*<\//g)].map((m) => m[1]);
  assert.deepEqual(text, [], `hard-coded copy: ${text.join(" | ")}`);
});
