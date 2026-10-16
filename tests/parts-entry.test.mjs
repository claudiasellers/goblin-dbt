// Parts foundation (docs/design/parts.md, "The flood signal", signal 1): the entry gate's types are
// shared with the app, and getPartsEntry is registered everywhere CLAUDE.md says. The gate itself is
// pinned in functions/test/unit/parts.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");

test("types mirror: src/data/partsTypes.ts carries functions/src/parts/types.ts unchanged (after the header)", () => {
  const body = read("functions/src/parts/types.ts").split("\n").slice(4).join("\n").trim();
  assert.ok(body.includes("export type PartsEntry ="), "server types moved; update the slice");
  assert.ok(read("src/data/partsTypes.ts").includes(body), "src/data/partsTypes.ts no longer mirrors the server's entry types");
});

test("getPartsEntry: exported by name, pinned, in the auth matrix as signed-in, wrapped for the app", () => {
  assert.match(read("functions/src/index.ts"), /^export \{ getPartsEntry \} from '\.\/parts';$/m);
  assert.ok("getPartsEntry" in JSON.parse(read("functions/test/fixtures/endpoints.json")));
  const matrix = read("functions/test/unit/auth-matrix.test.cjs");
  assert.match(matrix.slice(matrix.indexOf("const AUTHED"), matrix.indexOf("const PUBLIC")), /'getPartsEntry'/);
  assert.match(read("src/services/parts.ts"), /httpsCallable<.*PartsEntry>\(functions, 'getPartsEntry'\)/);
});

test("partsEnabled is a setting (off by default), never profile-layer data", async () => {
  assert.match(read("src/services/neo4j.ts"), /partsEnabled: false,/);
  assert.match(read("functions/src/account/index.ts"), /partsEnabled: false,/);
  // Never a profile slice or a profile field (comments may name the setting).
  const profileTypes = await importTs("functions/src/profile/types.ts");
  assert.ok(!profileTypes.SLICE_IDS.includes("partsEnabled"), "partsEnabled is a profile slice");
  for (const f of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    assert.doesNotMatch(read(f), /\bpartsEnabled\s*\??\s*:/, `${f}: partsEnabled is a profile field`);
  }
});
