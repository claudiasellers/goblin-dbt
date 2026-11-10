// Hand-built pages' jumps to other tools (docs/design/dbt-modules-plan.md C4.1): every `/tool/<id>` path and
// `linkTo('<id>')` in the pages and their libraries is recorded in tests/fixtures/legacy-exits.json, with whether
// its target exists. A port moves its page's jumps into the graph as SkillExits and drops them here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scanLegacyExits } from "./lib/legacyExits.mjs";
import { importTs } from "./lib/importTs.mjs";

const fixture = JSON.parse(readFileSync("tests/fixtures/legacy-exits.json", "utf8"));
const toolIds = new Set([...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s*id: '([a-z0-9-]+)',/gm)].map((m) => m[1]));
const { PLAYER_TOOLS } = await importTs("src/lib/skillRuntime/playerTools.ts");

test("the source's jumps and the fixture agree, both ways", () => {
  const key = (e) => `${e.from} -> ${e.to}`;
  assert.deepEqual(fixture.exits.map(key).sort(), scanLegacyExits().map(key).sort(),
    "a page gained or lost a jump to another tool: update tests/fixtures/legacy-exits.json");
});

test("each jump's state is true: built targets exist, missing ones don't (a dead link, flip it when it's built)", () => {
  for (const e of fixture.exits) {
    assert.ok(["built", "missing"].includes(e.state), JSON.stringify(e));
    assert.equal(toolIds.has(e.to), e.state === "built", `${e.from} -> ${e.to} is recorded ${e.state}`);
  }
});

test("the switch names real tools and real skills", () => {
  const skills = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8")).skills;
  for (const [toolId, skillId] of Object.entries(PLAYER_TOOLS)) {
    assert.ok(toolIds.has(toolId), toolId);
    const sk = skills.find((s) => s.id === skillId);
    assert.ok(sk, `${toolId} plays ${skillId}, which isn't a skill`);
    assert.equal(sk.toolId, toolId, `${skillId} belongs to ${sk.toolId}`);
  }
});

test("projections exist only for tools on the player (C8.2)", () => {
  const src = readFileSync("functions/src/skills/projections.ts", "utf8");
  const block = /export const PROJECTIONS[^=]*=\s*\{([\s\S]*?)\};/.exec(src)[1];
  for (const m of block.matchAll(/'([a-z0-9-]+)'\s*:/g)) assert.ok(m[1] in PLAYER_TOOLS, `${m[1]} has a projection but isn't on the player`);
});
