// "Check in now" in the side panel linked to `#/` while the person was on `#/` (the check-in): a dead
// button. It is hidden on the check-in route and still links there from every other page.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const route = await importTs("src/lib/checkInRoute.ts");

test("only the index route is the check-in", () => {
  assert.equal(route.CHECK_IN_PATH, "/");
  assert.equal(route.isCheckInRoute("/"), true);
  for (const p of ["/history", "/profile", "/me/parts/den", "/tools", "/tool/opposite-action"]) {
    assert.equal(route.isCheckInRoute(p), false, p);
  }
});

test("the side panel's Check in now is gated on the route and links to the check-in", () => {
  const panel = readFileSync("src/components/insights/InsightsSidePanel.tsx", "utf8");
  assert.match(panel, /showCheckInLink = !isCheckInRoute\(pathname\)/);
  assert.match(panel, /\{showCheckInLink && \(\s*<Link\s+to=\{CHECK_IN_PATH\}/);
  const app = readFileSync("src/App.tsx", "utf8");
  assert.match(app, /<Route index element=\{<CheckIn \/>\} \/>/);
});
