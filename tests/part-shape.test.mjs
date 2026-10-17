// "Use this shape for {name}?" (docs/design/parts.md, Find the feeling's over-weeks column): in the tag row
// after Find the feeling, right after a part chip, when the visit made a shape (src/lib/partShape.ts,
// src/components/spine/PartTagRow.tsx, setPartShape in functions/src/parts/keep.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/partShape.ts");
const { TAG_ROW_TOOLS } = await importTs("src/lib/partTag.ts");
const { SHAPE_TOOLS } = await importTs("functions/src/parts/keep.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const ALL = partsFromFixture(fixture, () => true);
const SHIPPED = JSON.parse(read("src/data/content/parts.json")).content;
const without = (drop) => partsFromFixture(fixture, (id) => !drop.includes(id));
const IDS = [...lib.TAG_SHAPE_REQUIRED.prompts, ...lib.TAG_SHAPE_REQUIRED.options];

test("copy: flow tag, step shape, signed off 17 Oct (Claudia: ship it all)", () => {
  assert.deepEqual(lib.TAG_SHAPE_REQUIRED, {
    prompts: ["tag_use_shape", "tag_use_shape_noname", "tag_shape_done"], options: ["tag_shape_yes", "tag_shape_no"],
  });
  assert.deepEqual(lib.TAG_SHAPE_REQUIRED.prompts.map((id) => [id, fixture.prompts[id].flow, fixture.prompts[id].step, fixture.prompts[id].copy]), [
    ["tag_use_shape", "tag", "shape", "Use this shape for {name}?"],
    ["tag_use_shape_noname", "tag", "shape", "Use this shape for that part?"],
    ["tag_shape_done", "tag", "shape", "Done."],
  ]);
  assert.deepEqual(fixture.options.tag.shape.map((o) => [o.id, o.label, o.branch]), [["tag_shape_yes", "Yes", "keep"], ["tag_shape_no", "No thanks", "end"]]);
  for (const id of IDS) assert.equal(fixture.prompts[id]?.reviewStatus ?? fixture.options.tag.shape.find((o) => o.id === id).reviewStatus, "approved", id);
});

test("visitHasShape: a Shape it visit moved from neutral; Tune it, neutral or nothing: none", () => {
  assert.equal(lib.visitHasShape({ way: "shape", vec: [0.4, 0, 0, 0, 0] }), true);
  assert.equal(lib.visitHasShape({ way: "shape", vec: [-1, 1, -1, 1, -1] }), true);
  assert.equal(lib.visitHasShape({ way: "shape", vec: [0, 0, 0, 0, 0] }), false, "never moved: no shape (as the server reads it)");
  assert.equal(lib.visitHasShape({ way: "tune", vec: [0.4, 0.2, 0.1, 0.9] }), false);
  assert.equal(lib.visitHasShape(null), false);
  assert.equal(lib.visitHasShape(undefined), false);
});

test("the gate: parts on, Find the feeling with a shape, every line shipped; anything else nothing", () => {
  const ok = { partsOn: true, toolId: "find-the-feeling", hasShape: true, content: ALL };
  assert.equal(lib.shapeOfferReady(ok), true);
  assert.equal(lib.shapeOfferReady({ ...ok, partsOn: false }), false, "parts off");
  assert.equal(lib.shapeOfferReady({ ...ok, hasShape: false }), false, "no shape (Tune it)");
  for (const toolId of [...TAG_ROW_TOOLS.filter((t) => t !== "find-the-feeling"), "dear-man", "meet-a-part"]) {
    assert.equal(lib.shapeOfferReady({ ...ok, toolId }), false, toolId);
  }
  for (const id of IDS) assert.equal(lib.shapeOfferReady({ ...ok, content: without([id]) }), false, `${id} missing`);
  assert.equal(lib.shapeOfferReady({ ...ok, content: null }), false);
  assert.equal(lib.shapeOfferReady({ ...ok, content: SHIPPED }), true, "the shipped file (signed off 17 Oct)");
  for (const id of IDS) assert.equal(lib.shapeOfferReady({ ...ok, content: withoutIds(SHIPPED, id) }), false, `shipped file without ${id}`);
  assert.equal(lib.shapeOfferCopy(SHIPPED, { label: "The guard", named: true }).ask, "Use this shape for The guard?");
  assert.deepEqual([...lib.SHAPE_HOSTS], [...SHAPE_TOOLS], "the client's hosts are the server's tools");
});

test("the copy: the chip's own name, else that part", () => {
  assert.deepEqual(lib.shapeOfferCopy(ALL, { label: "The guard", named: true }),
    { ask: "Use this shape for The guard?", yes: "Yes", no: "No thanks", done: "Done." });
  assert.equal(lib.shapeOfferCopy(ALL, { label: "One you haven't named", named: false }).ask, "Use this shape for that part?");
  assert.equal(lib.shapeOfferCopy(ALL, { label: "  ", named: true }).ask, "Use this shape for that part?");
});

test("the row: only after a part chip, never A new one / Skip / the debrief; Yes writes setPartShape, No thanks folds", () => {
  const row = read("src/components/spine/PartTagRow.tsx");
  assert.match(row, /const tag = \(c: TagChip\) => \{\s*answered\(\);\s*if \(offerShape && !debrief\) \{\s*setPicked\(c\);\s*setState\('shape'\);\s*\} else fold\(\);/);
  assert.match(row, /const answerShape = \(yes: boolean\) => \{\s*if \(!yes \|\| !picked\) \{ fold\(\); return; \}\s*setState\('done'\);\s*setPartShape\(\{ partId: picked\.id, toolSessionId \}\)\.catch/,
    "the payload: the part and the visit, never a shape");
  assert.match(row, /setTimeout\(\(\) => \{ setState\('gone'\); gone\.current\?\.\(\); \}, SHAPE_DONE_MS\)/, "Done., then the row folds");
  assert.match(row, /<button type="button" className=\{chip\} onClick=\{\(\) => \{ answered\(\); setState\('later'\); \}\}>/, "A new one: as before");
  assert.match(row, /<button type="button" className=\{quiet\} onClick=\{skip\}>\{copy\.skip\}<\/button>/, "Skip: as before");
  assert.equal((row.match(/setPartShape\(/g) ?? []).length, 1);
  assert.doesNotMatch(row, /await /, "never blocks leaving");

  const slot = read("src/components/spine/PartTagSlot.tsx");
  assert.match(slot, /const offerShape = shapeOfferReady\(\{ partsOn, toolId, hasShape: shape, content: parts \}\);/);
  assert.match(slot, /<PartTagRow [^>]*offerShape=\{offerShape\} \/>/);
  const ftf = read("src/pages/tools/FindTheFeeling.tsx");
  assert.match(ftf, /<PartTagSlot toolId="find-the-feeling"[\s\S]*?shape=\{visitHasShape\(state\.found\)\} \/>/);
  // No other host offers it.
  for (const f of ["src/components/spine/SessionClose.tsx", "src/pages/tools/DearMan.tsx"]) assert.doesNotMatch(read(f), /visitHasShape|offerShape|shape=\{/, f);

  const svc = read("src/services/parts.ts");
  assert.match(svc, /httpsCallable<SetPartShapeRequest, PartWriteResponse>\(functions, 'setPartShape'\)/);
  assert.match(read("src/data/partsTypes.ts"), /export interface SetPartShapeRequest \{ partId: string; toolSessionId: string \}/);
});

test("no hard-coded words: the offer's lines all come from the content", () => {
  for (const f of ["src/lib/partShape.ts", "src/components/spine/PartTagRow.tsx", "src/components/spine/PartTagSlot.tsx", "src/pages/tools/FindTheFeeling.tsx"]) {
    const code = read(f).replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, "");
    for (const s of ["Use this shape", "that part?", "Done.", "No thanks"]) assert.ok(!code.includes(s), `${f}: ${s}`);
  }
});

test("setPartShape: exported by name, pinned, signed in", () => {
  assert.match(read("functions/src/index.ts"), /^export \{ setPartShape \} from '\.\/parts';$/m);
  assert.ok("setPartShape" in JSON.parse(read("functions/test/fixtures/endpoints.json")));
  const matrix = read("functions/test/unit/auth-matrix.test.cjs");
  assert.ok(matrix.slice(matrix.indexOf("const AUTHED"), matrix.indexOf("const PUBLIC")).includes("'setPartShape'"));
});

test("the sign-off pack lists the offer under the tag row", () => {
  const doc = execFileSync("node", ["scripts/parts/review.mjs"], { encoding: "utf8" });
  const at = doc.search(/^### \d+\. The tag row$/m);
  assert.ok(at > 0);
  const section = doc.slice(at, doc.indexOf("\n### ", at + 1));
  const label = (id) => fixture.prompts[id]?.copy ?? fixture.options.tag.shape.find((o) => o.id === id).label;
  for (const id of IDS) assert.ok(section.includes(`| \`${id}\` | ${label(id)} |`), id);
});
