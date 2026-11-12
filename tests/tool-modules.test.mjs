// Every shipped tool and skill sits under its DBT module (Claudia, 12 Nov 2026: "every module that gets shipped is
// tagged with the category so that it shows up in those respective categories"). The Tools page groups by
// `Tool.module` (src/data/tools.ts, src/pages/Tools.tsx `getToolsByModule`); the graph's TherapyConcept carries
// the same module as text (`module: "Distress Tolerance"`). This fails when:
//   - a tool has no module, or one the Tools page doesn't know (src/data/modules.ts);
//   - a skill on the runtime names a tool that isn't in tools.ts, or one that isn't listed under its module;
//   - a DBT concept that opens an app tool has no `module`, or a different module from the tool's.
// A new skill from a module lane: give its tool a `module` in tools.ts and its concept a `module` in the schema.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const { tools, getToolsByModule } = await importTs("src/data/tools.ts");
const { modules } = await importTs("src/data/modules.ts");
const moduleIds = new Set(modules.map((m) => m.id));
const toolById = new Map(tools.map((t) => [t.id, t]));
const shipped = JSON.parse(readFileSync("src/data/content/skills.json", "utf8")).content?.skills
  ?? JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8")).skills;

// The graph's module names (TherapyConcept.module) → the app's module ids.
const GRAPH_MODULE = {
  "Distress Tolerance": "distress-tolerance",
  "Emotion Regulation": "emotion-regulation",
  "Interpersonal Effectiveness": "interpersonal-effectiveness",
  "Mindfulness": "mindfulness",
};

// A skill's tool that is deliberately reached only by link, never listed under its module. Each needs a reason.
const UNLISTED_SKILL_TOOLS = {};

test("every tool carries a module the Tools page shows", () => {
  for (const t of tools) {
    assert.ok(moduleIds.has(t.module), `${t.id}: module ${JSON.stringify(t.module)} is not one of ${[...moduleIds].join(", ")}`);
  }
  assert.equal(Object.keys(GRAPH_MODULE).length, moduleIds.size, "every app module has its graph name");
  for (const id of Object.values(GRAPH_MODULE)) assert.ok(moduleIds.has(id), id);
});

test("every listed tool appears under its module on the Tools page", () => {
  const all = { parts: true };
  for (const t of tools.filter((x) => x.listed === undefined || x.listed === "parts")) {
    assert.ok(getToolsByModule(t.module, all).some((x) => x.id === t.id), `${t.id} is missing from ${t.module}`);
  }
});

test("every skill on the runtime opens a tool listed under a module", () => {
  assert.ok(shipped.length > 0, "the skill catalogue is empty");
  for (const sk of shipped) {
    const tool = toolById.get(sk.toolId);
    assert.ok(tool, `${sk.id}: tool ${sk.toolId} is not in src/data/tools.ts, so it has no module`);
    assert.ok(moduleIds.has(tool.module), `${sk.id}: ${sk.toolId} has no module`);
    if (sk.toolId in UNLISTED_SKILL_TOOLS) continue;
    assert.equal(tool.listed, undefined, `${sk.id}: ${sk.toolId} is not listed for everyone, so it doesn't show under ${tool.module}`);
    assert.ok(getToolsByModule(tool.module).some((x) => x.id === tool.id), `${sk.id}: ${sk.toolId} is missing from ${tool.module}`);
  }
});

test("the graph's concepts agree with the app on each tool's module", () => {
  const replay = JSON.parse(execFileSync("python3", ["scripts/tools/concept_modules.py"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  const conceptById = new Map(replay.concepts.map((c) => [c.id, c]));
  for (const c of replay.concepts) {
    const tool = toolById.get(c.appToolId);
    assert.ok(tool, `${c.id}: appToolId ${c.appToolId} is not in src/data/tools.ts`);
    // A non-DBT concept (5-4-3-2-1's SE orienting, Ride it out's urge surfing) has no DBT module of its own:
    // its tool's module in tools.ts is where it shows. One that names a module must agree.
    if (c.modality !== "DBT" && c.module == null) continue;
    assert.ok(c.module, `${c.id} (${c.appToolId}): a DBT concept with an app tool needs a module`);
    assert.ok(c.module in GRAPH_MODULE, `${c.id}: module ${JSON.stringify(c.module)} is not one of ${Object.keys(GRAPH_MODULE).join(", ")}`);
    assert.equal(GRAPH_MODULE[c.module], tool.module, `${c.id} is ${c.module} in the graph, ${tool.module} in tools.ts (${tool.id})`);
  }
  for (const sk of replay.skills) {
    const c = conceptById.get(sk.concept);
    assert.ok(c, `${sk.id}: its concept ${sk.concept} has no appToolId`);
    assert.equal(c.appToolId, sk.toolId, `${sk.id}: concept ${sk.concept} opens ${c.appToolId}, the skill ${sk.toolId}`);
  }
  assert.deepEqual(
    replay.skills.map((s) => s.id).sort(),
    shipped.map((s) => s.id).sort(),
    "every skill in the graph is in the shipped catalogue and back",
  );
});
