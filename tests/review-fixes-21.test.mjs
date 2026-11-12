// Codex review on #20/#21: quiet hours, one schedule per tap, retryable outcome card, DEAR MAN pass-through.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { inQuietHours } = await importTs("src/lib/quietHours.ts");
const at = (h, m = 0) => new Date(2026, 8, 30, h, m);

test("quiet hours: same-day and overnight windows; nothing set or a bad value means no quiet", () => {
  assert.equal(inQuietHours(at(13), { start: "12:00", end: "14:00" }), true);
  assert.equal(inQuietHours(at(14), { start: "12:00", end: "14:00" }), false, "end is exclusive");
  assert.equal(inQuietHours(at(23, 30), { start: "22:00", end: "07:00" }), true);
  assert.equal(inQuietHours(at(6, 59), { start: "22:00", end: "07:00" }), true);
  assert.equal(inQuietHours(at(7), { start: "22:00", end: "07:00" }), false);
  assert.equal(inQuietHours(at(12), { start: "22:00", end: "07:00" }), false);
  assert.equal(inQuietHours(at(3), null), false);
  assert.equal(inQuietHours(at(3), { start: "nope", end: "07:00" }), false);
  assert.equal(inQuietHours(at(3), { start: "07:00", end: "07:00" }), false);
});

test("in-tab reminders respect quiet hours", () => {
  const src = readFileSync("src/contexts/TodayContext.tsx", "utf8");
  assert.match(src, /useProfileContext\('today'\)\.slices\?\.quietHours/);
  assert.match(src, /if \(inQuietHours\(new Date\(\), quiet\)\) return;/);
});

test("'come back later' chips schedule once per tap, and the outcome card stays answerable when saving fails", () => {
  const h = readFileSync("src/components/capacity/BreakdownHandoff.tsx", "utf8");
  assert.match(h, /disabled=\{scheduling\}[\s\S]*if \(scheduling\) return;[\s\S]*setScheduling\(true\);/);
  assert.match(h, /\.catch\(\(\) => \{ setScheduling\(false\);/);
  // The outcome card is TodayCard now (ContinuityCard is gone, Oct 2026). Only a saved answer removes
  // it: a failed write keeps it answerable (Codex, #45), and a failed refetch never empties Today.
  const c = readFileSync("src/components/today/TodayCard.tsx", "utf8");
  assert.match(c, /try \{\s*await fn\(\);\s*\} catch \{\s*setBusy\(false\);\s*setFailed\(true\);\s*return;\s*\}\s*onDone\(item\.id\);/);
  assert.match(readFileSync("src/contexts/TodayContext.tsx", "utf8"), /\.catch\(\(\) => \{ if \(live\) setData\(\(prev\) => \(prev && prev\.uid === uid \? prev :/);
});

