// What the deploy workflow ships after a merge (scripts/ci/deploy-plan.mjs): which paths count for
// which target, the schema hold on pushes, the first-run hold, and by-hand runs that never hold.
import test from "node:test";
import assert from "node:assert/strict";
import { touches, planDeploy } from "../scripts/ci/deploy-plan.mjs";

test("paths map to the targets they rebuild", () => {
  assert.equal(touches("functions", "functions/src/parts/keep.ts"), true);
  assert.equal(touches("functions", "functions/package-lock.json"), true);
  assert.equal(touches("functions", "functions/test/unit/auth-matrix.test.cjs"), false);
  assert.equal(touches("functions", "src/pages/CheckIn.tsx"), false);
  assert.equal(touches("hosting", "src/pages/CheckIn.tsx"), true);
  assert.equal(touches("hosting", "src/data/content/parts.json"), true);
  assert.equal(touches("hosting", "functions/src/bodyMap/suggest.ts"), true); // the app imports it
  assert.equal(touches("hosting", "tsconfig.app.json"), true);
  assert.equal(touches("hosting", "docs/design/parts.md"), false);
  assert.equal(touches("hosting", "tests/fixtures/parts-content.json"), false);
  for (const t of ["functions", "hosting"]) assert.equal(touches(t, "firebase.json"), true);
});

test("a push deploys only the targets whose files changed", () => {
  const p = planDeploy({ event: "push", only: "changed", changed: { functions: ["docs/x.md", "src/App.tsx"], hosting: ["src/App.tsx"] } });
  assert.equal(p.hold, null);
  assert.deepEqual(p.deploy, { functions: false, hosting: true });
});

test("a push with nothing deployable deploys nothing", () => {
  const p = planDeploy({ event: "push", only: "changed", changed: { functions: ["CLAUDE.md"], hosting: ["CLAUDE.md"] } });
  assert.deepEqual(p.deploy, { functions: false, hosting: false });
});

test("schema changes since either target's last deploy hold a push", () => {
  const p = planDeploy({ event: "push", only: "changed", changed: { functions: [], hosting: ["schema/parts.cypher", "src/App.tsx"] } });
  assert.match(p.hold, /schema\/parts\.cypher/);
  assert.deepEqual(p.deploy, { functions: false, hosting: false });
});

test("a push holds until every target has a recorded deploy", () => {
  const p = planDeploy({ event: "push", only: "changed", changed: { functions: null, hosting: ["src/App.tsx"] } });
  assert.match(p.hold, /functions/);
  assert.deepEqual(p.deploy, { functions: false, hosting: false });
});

test("by hand never holds: changed deploys untagged targets and what changed", () => {
  const p = planDeploy({ event: "workflow_dispatch", only: "changed", changed: { functions: null, hosting: ["schema/parts.cypher", "src/App.tsx"] } });
  assert.equal(p.hold, null);
  assert.deepEqual(p.deploy, { functions: true, hosting: true });
});

test("by hand can name one target or both", () => {
  const changed = { functions: [], hosting: [] };
  assert.deepEqual(planDeploy({ event: "workflow_dispatch", only: "functions", changed }).deploy, { functions: true, hosting: false });
  assert.deepEqual(planDeploy({ event: "workflow_dispatch", only: "hosting", changed }).deploy, { functions: false, hosting: true });
  assert.deepEqual(planDeploy({ event: "workflow_dispatch", only: "both", changed }).deploy, { functions: true, hosting: true });
});
