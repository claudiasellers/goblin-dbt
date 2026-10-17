// Problem Solve's "the part that doesn't want change" (docs/design/parts.md, "Meet a part → Entries"):
// after the cant-ambivalent barrier, parts on, one quiet line queues a PartCandidate for put_it_off
// (src/lib/psAmbivalence.ts, src/components/parts/PartLaterLine.tsx, src/pages/tools/ProblemSolve.tsx).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/psAmbivalence.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const keepTypes = await importTs("functions/src/parts/keepTypes.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const IDS = [lib.PS_LATER, lib.PS_LATER_DONE];
const shipped = (ids) => partsFromFixture(fixture, (id) => ids.includes(id));

test("copy: ps/ambivalence, the ask an option whose tap is the yes, the done line a prompt", () => {
  assert.deepEqual(fixture.options.ps.ambivalence.map((o) => [o.id, o.label, o.branch]),
    [["ps_later", "Want to get to know that part another time?", "candidate"]]);
  const p = fixture.prompts.ps_later_done;
  assert.deepEqual([p.flow, p.step, p.copy], ["ps", "ambivalence", "It's in Me when you want it."]);
});

test("gate: parts on, the cant-ambivalent barrier, both lines shipped; anything else, nothing", () => {
  const both = shipped(IDS);
  assert.deepEqual(lib.psLaterCopy(both, true, "cant-ambivalent"),
    { ask: "Want to get to know that part another time?", done: "It's in Me when you want it." });
  assert.equal(lib.psLaterCopy(both, false, "cant-ambivalent"), null, "parts off");
  for (const b of ["cant-overwhelmed", "dont-know-how", null, undefined]) assert.equal(lib.psLaterCopy(both, true, b), null, `barrier ${b}`);
  for (const id of IDS) assert.equal(lib.psLaterCopy(shipped(IDS.filter((x) => x !== id)), true, "cant-ambivalent"), null, `${id} missing`);
  assert.equal(lib.psLaterCopy(null, true, "cant-ambivalent"), null, "content not loaded");
  // Signed off 17 Oct (Claudia: ship it all): the shipped file says the line; either line out of it, nothing.
  const real = JSON.parse(read("src/data/content/parts.json")).content;
  assert.deepEqual(lib.psLaterCopy(real, true, "cant-ambivalent"),
    { ask: "Want to get to know that part another time?", done: "It's in Me when you want it." }, "the shipped file");
  for (const id of IDS) assert.equal(lib.psLaterCopy(withoutIds(real, id), true, "cant-ambivalent"), null, `shipped file without ${id}`);
});

test("payload: origin ps_ambivalence, the move cant-ambivalent expresses, no tool session (still open)", () => {
  assert.deepEqual(lib.psLaterCandidate("x"), { id: "x", origin: "ps_ambivalence", moveIds: ["put_it_off"] });
  assert.ok(keepTypes.CANDIDATE_ORIGINS.includes("ps_ambivalence"));
  assert.match(read("schema/parts.cypher"), /MATCH \(a:BarrierSubResponse \{id: "cant-ambivalent"\}\), \(b:ProtectiveMove \{id: "put_it_off"\}\)/,
    "content.py maps the barrier to the same move");
});

test("ext: er.psLater is a bool, never the candidate's id or text", () => {
  assert.deepEqual(JSON.parse(ext.validateExt({ er: { psLater: true } })).er, { psLater: true });
  assert.throws(() => ext.validateExt({ er: { psLater: "yes" } }), /expected a boolean/);
});

test("Problem Solve: the line under its own next step, recorded only once queued, read only after that barrier", () => {
  const ps = read("src/pages/tools/ProblemSolve.tsx");
  assert.match(ps, /const wantsPsLater = partsOn && selectedSubResponse\?\.id === PS_AMBIVALENCE_BARRIER;/);
  assert.match(ps, /if \(!wantsPsLater \|\| parts\) return;/, "the parts copy is fetched only for that barrier");
  assert.match(ps, /const psLater = psLaterCopy\(parts, partsOn, selectedSubResponse\?\.id\);/);
  assert.match(ps, /await queuePartCandidate\(psLaterCandidate\(psLaterId\.current\)\);\n\s+session\.setExt\(\{ er: \{ psLater: true \} \}\);/);
  assert.match(ps, /psLaterId\.current \?\?= newId\(\);/, "a retry reuses the id");
  const amb = ps.slice(ps.indexOf("// ─── AMBIVALENCE EXPLORATION ───"), ps.indexOf("// ─── CONFIDENCE RULER ───"));
  assert.ok(amb.indexOf("<PartLaterLine") > amb.indexOf("Let's keep going"), "after the tool's own next step, never instead of it");
  assert.match(amb, /\{psLater && <PartLaterLine ask=\{psLater\.ask\} done=\{psLater\.done\} onLater=\{queuePsLater\} \/>\}/);
  const line = read("src/components/parts/PartLaterLine.tsx");
  const jsx = line.slice(line.indexOf("return ("));
  assert.deepEqual([...jsx.matchAll(/>([^<>{}()=;]*[A-Za-z][^<>{}()=;]*)</g)].map((m) => m[1].trim()), [], "every word from the content");
  assert.match(line, /onLater\(\)\.then\(\(\) => setState\('done'\), \(\) => setState\('ask'\)\)/, "a failure leaves the button");
});
