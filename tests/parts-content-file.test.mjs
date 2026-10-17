// The parts copy the app ships (src/data/content/parts.json: signed-off rows only) and how a host reads
// it (src/lib/partsContent.ts): a flow shows only when every prompt and option it uses is signed off.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const { promptCopy, stepOptions, flowReady } = await importTs("src/lib/partsContent.ts");
const { getPartsContent } = await importTs("src/services/partsContent.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
// The same projection as parts.json, with every row in: what the file holds once it is all signed off.
const everything = partsFromFixture(fixture, () => true);
const MEET_PROMPTS = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "meet").map(([id]) => id);

test("the service reads the shipped file; every Meet a part prompt signed off 17 Oct (Claudia: ship it all), so it is ready", async () => {
  const content = await getPartsContent();
  assert.deepEqual(content, JSON.parse(readFileSync("src/data/content/parts.json", "utf8")).content);
  assert.equal(await getPartsContent(), content, "one load per page");
  for (const id of MEET_PROMPTS) assert.equal(fixture.prompts[id].reviewStatus, "approved", id);
  assert.equal(flowReady(content, MEET_PROMPTS), true);
  assert.equal(flowReady(content, [...MEET_PROMPTS, "no_such_prompt"]), false);
});

test("promptCopy: the copy when signed off, null when not", () => {
  assert.equal(promptCopy(everything, "gate_blend_check"), "Right now, can you notice it, or is it running things?");
  assert.equal(promptCopy(everything, "no_such_prompt"), null);
  const { gate_blend_check: _gone, ...prompts } = everything.prompts;
  assert.equal(promptCopy({ ...everything, prompts }, "gate_blend_check"), null);
});

test("stepOptions: a step's options in order; empty for an unknown flow or step", () => {
  assert.deepEqual(stepOptions(everything, "gate", "blend").map((o) => o.id), ["blend_notice", "blend_running", "blend_not_sure"]);
  const shuffled = { ...everything, options: { gate: { blend: [...everything.options.gate.blend].reverse() } } };
  assert.deepEqual(stepOptions(shuffled, "gate", "blend").map((o) => o.id), ["blend_notice", "blend_running", "blend_not_sure"]);
  assert.deepEqual(shuffled.options.gate.blend.map((o) => o.id), ["blend_not_sure", "blend_running", "blend_notice"], "the content isn't sorted in place");
  assert.deepEqual(stepOptions(everything, "gate", "nope"), []);
  assert.deepEqual(stepOptions(everything, "nope", "blend"), []);
});

test("flowReady: true only when every listed prompt and option is there", () => {
  const blend = ["blend_notice", "blend_running", "blend_not_sure"];
  assert.equal(flowReady(everything, MEET_PROMPTS), true);
  assert.equal(flowReady(everything, ["gate_blend_check"], blend), true);
  // One option missing (not signed off): the whole flow waits, never half of it.
  const without = { ...everything, options: { ...everything.options, gate: { ...everything.options.gate, blend: everything.options.gate.blend.filter((o) => o.id !== "blend_running") } } };
  assert.equal(flowReady(without, ["gate_blend_check"], blend), false);
  assert.equal(flowReady(without, ["gate_blend_check"]), true, "options are checked only when listed");
  const { meet_where: _gone, ...prompts } = everything.prompts;
  assert.equal(flowReady({ ...everything, prompts }, MEET_PROMPTS), false);
  assert.equal(flowReady({ version: null, moves: [], prompts: {}, options: {}, hurts: [] }, ["meet_find"]), false);
});
