// "No account needed" on Tools is for signed-out people only (Claudia, 11 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { toolsIntro } = await importTs("src/lib/toolsIntro.ts");

test("signed out keeps the line unchanged; signed in, or auth still loading, drops No account needed", () => {
  assert.equal(toolsIntro({ signedIn: false, loading: false }), "Skills you can use right now. No account needed.");
  assert.equal(toolsIntro({ signedIn: true, loading: false }), "Skills you can use right now.");
  assert.equal(toolsIntro({ signedIn: false, loading: true }), "Skills you can use right now.");
});

test("the Tools page reads the line from auth state", () => {
  const page = readFileSync("src/pages/Tools.tsx", "utf8");
  assert.match(page, /const \{ user, loading \} = useAuth\(\);/);
  assert.match(page, /\{toolsIntro\(\{ signedIn: Boolean\(user\), loading \}\)\}/);
  assert.doesNotMatch(page, /No account needed/);
});
