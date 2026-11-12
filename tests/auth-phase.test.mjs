// A signed-in reload showed the signed-out app until Firebase finished restoring the session (Claudia,
// 11 Nov 2026). Auth has three phases, and signed-out UI waits for `signed_out`.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { authPhase, lastUidAfter, LAST_UID_KEY } = await importTs("src/lib/authPhase.ts");

test("null user while loading is resolving, not signed out", () => {
  assert.equal(authPhase({ signedIn: false, loading: true }), "resolving");
  assert.equal(authPhase({ signedIn: false, loading: false }), "signed_out");
  assert.equal(authPhase({ signedIn: true, loading: false }), "signed_in");
  assert.equal(authPhase({ signedIn: true, loading: true }), "signed_in");
});

test("the last uid is kept while resolving, set when signed in, cleared when signed out", () => {
  assert.equal(lastUidAfter("resolving", null), undefined);
  assert.equal(lastUidAfter("signed_in", "u1"), "u1");
  assert.equal(lastUidAfter("signed_out", null), null);
});

test("AuthContext exposes the phase and keeps the last uid", () => {
  const ctx = readFileSync("src/contexts/AuthContext.tsx", "utf8");
  assert.match(ctx, /phase: authPhase\(\{ signedIn: Boolean\(user\), loading \}\)/);
  assert.match(ctx, /localStorage\.setItem\(LAST_UID_KEY, next\)/);
  assert.match(ctx, /localStorage\.removeItem\(LAST_UID_KEY\)/);
  assert.equal(LAST_UID_KEY, "goblin-dbt-last-uid");
});

test("the layout renders no page and no Sign in link while auth resolves", () => {
  const layout = readFileSync("src/components/DashboardLayout.tsx", "utf8");
  assert.match(layout, /const resolving = phase === 'resolving';/);
  assert.match(layout, /\{resolving \? null : <Outlet \/>\}/);
  assert.match(layout, /\{phase === 'signed_out' && \(\s*<Link\s+to="\/login"/);
});

test("the profile seeds from the last uid's cache and resets only once signed out", () => {
  const prof = readFileSync("src/contexts/UserProfileContext.tsx", "utf8");
  assert.match(prof, /useState<UserProfile>\(\(\) => loadLastCachedProfile\(\) \?\? DEFAULT_PROFILE\)/);
  assert.match(prof, /\} else if \(phase === 'signed_out'\) \{\s*setProfile\(DEFAULT_PROFILE\);/);
});
