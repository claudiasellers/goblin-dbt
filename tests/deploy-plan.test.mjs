// What the deploy workflow does after a merge (scripts/ci/deploy-plan.mjs): which paths count for
// which step, the graph load pulling hosting along, migrations only when newly added, and first runs.
import test from "node:test";
import assert from "node:assert/strict";
import { touches, planDeploy } from "../scripts/ci/deploy-plan.mjs";

const none = { graph: [], functions: [], hosting: [] };

test("paths map to the steps they need", () => {
  assert.equal(touches("graph", "schema/parts.cypher"), true);
  assert.equal(touches("graph", "schema/migrations/2026-10-x.cypher"), false);
  assert.equal(touches("graph", "schema/maintenance/dedupe.cypher"), false);
  assert.equal(touches("graph", "scripts/parts/content.py"), false); // its schema/ output is what counts
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
  for (const s of ["functions", "hosting"]) assert.equal(touches(s, "firebase.json"), true);
});

test("only the steps whose files changed run", () => {
  const p = planDeploy({ only: "changed", changed: { graph: ["src/App.tsx"], functions: ["src/App.tsx"], hosting: ["src/App.tsx"] }, addedMigrations: [] });
  assert.deepEqual(p.run, { graph: false, functions: false, hosting: true });
  assert.deepEqual(p.migrations, []);
});

test("docs-only merges run nothing", () => {
  const changed = { graph: ["CLAUDE.md"], functions: ["CLAUDE.md"], hosting: ["CLAUDE.md"] };
  assert.deepEqual(planDeploy({ only: "changed", changed, addedMigrations: [] }).run, { graph: false, functions: false, hosting: false });
});

test("a schema change loads the graph and redeploys hosting for the refreshed content", () => {
  const changed = { graph: ["schema/parts.cypher"], functions: ["schema/parts.cypher"], hosting: ["schema/parts.cypher"] };
  assert.deepEqual(planDeploy({ only: "changed", changed, addedMigrations: [] }).run, { graph: true, functions: false, hosting: true });
});

test("migrations run once, only when newly added, in name order", () => {
  const p = planDeploy({ only: "changed", changed: none, addedMigrations: ["schema/migrations/2026-11-b.cypher", "schema/migrations/2026-11-a.cypher", "schema/migrations/README.md"] });
  assert.deepEqual(p.migrations, ["schema/migrations/2026-11-a.cypher", "schema/migrations/2026-11-b.cypher"]);
});

test("first run: every step runs except migrations, which are taken as already done", () => {
  const p = planDeploy({ only: "changed", changed: { graph: null, functions: null, hosting: null }, addedMigrations: null });
  assert.deepEqual(p.run, { graph: true, functions: true, hosting: true });
  assert.deepEqual(p.migrations, []);
});

test("by hand, all runs every step but never re-runs migrations", () => {
  const p = planDeploy({ only: "all", changed: none, addedMigrations: [] });
  assert.deepEqual(p.run, { graph: true, functions: true, hosting: true });
  assert.deepEqual(p.migrations, []);
});
