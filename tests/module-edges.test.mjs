// Cross-skill edges (docs/design/dbt-modules-plan.md C4): tests/fixtures/module-edges.json records the PRD
// Index §7b edges and the module PRDs' hand-offs for the DT, IE and ER lanes, each target with its state. For
// every skill on the runtime, the graph and the fixture agree: a built target is a live exit, a planned one a
// planned exit, and every exit the skill has is a recorded edge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edges = JSON.parse(readFileSync("tests/fixtures/module-edges.json", "utf8"));
const skills = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8")).skills;
const KINDS = new Set(["exit", "inline", "data", "gate"]);
const STATES = new Set(["built", "planned", ...edges.batches]);

test("every edge row is well formed", () => {
  for (const e of edges.edges) {
    assert.ok(KINDS.has(e.kind), JSON.stringify(e));
    assert.ok(e.n === null ? typeof e.source === "string" : Number.isInteger(e.n), JSON.stringify(e));
    for (const t of e.to) assert.ok(STATES.has(t.state), `${e.from} → ${t.tool}: ${t.state}`);
  }
});

const targetOf = (x) => (x.safety ? "safety.open" : x.toolId);

for (const sk of skills) {
  const rows = edges.edges.filter((e) => e.from === sk.toolId && (e.kind === "exit" || e.kind === "gate"));
  test(`${sk.id}: built and planned edges exist as exits`, () => {
    for (const e of rows) {
      for (const t of e.to) {
        const exits = sk.exits.filter((x) => targetOf(x) === t.tool);
        if (t.state === "built") assert.ok(exits.some((x) => !x.planned), `${sk.toolId} → ${t.tool} is recorded built`);
        if (t.state === "planned") assert.ok(exits.some((x) => x.planned), `${sk.toolId} → ${t.tool} is recorded planned`);
      }
    }
  });
  test(`${sk.id}: every exit to another tool is a recorded edge with its true state`, () => {
    for (const x of sk.exits) {
      if (x.done) continue;
      const t = rows.flatMap((e) => e.to).find((y) => y.tool === targetOf(x));
      assert.ok(t, `${sk.toolId} → ${targetOf(x)}: add it to tests/fixtures/module-edges.json`);
      assert.equal(t.state, x.planned ? "planned" : "built", `${sk.toolId} → ${targetOf(x)}`);
    }
  });
}
