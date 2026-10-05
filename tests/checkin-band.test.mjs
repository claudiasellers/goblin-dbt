// A4-3: the check-in carries a band. Step logic (ask once, carry, pleasant → none), the
// compatibility intensity, the History word, the Insights guard, and static wiring checks.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const cb = await importTs("src/lib/checkInBand.ts");
const guard = await importTs("functions/src/insights/intensity.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/capacity-content.json", "utf8"));

const reading = (o = {}) => ({ id: "3f2c9a0e-1b2c-4d5e-8f90-123456789abc", value: "stirred", viaCantTell: false, source: "probe",
  framing: "now", wording: "default", context: "checkin", probeVersion: "capacity-v1", at: "2026-10-01T12:00:00Z", ...o });

test("bandStepFor: nothing is ever asked; own reading kept; current carried unless flooded; pleasant has no band (D-07)", () => {
  const none = { next: "skip", keep: null, carry: false };
  assert.deepEqual(cb.bandStepFor("high-unpleasant", null, null), none);
  assert.deepEqual(cb.bandStepFor("low-unpleasant", null, null), none);
  const own = reading({ value: "flooded" });
  assert.deepEqual(cb.bandStepFor("high-unpleasant", own, reading()), { next: "skip", keep: own, carry: false });
  assert.deepEqual(cb.bandStepFor("low-unpleasant", null, reading()), { next: "skip", keep: null, carry: true });
  assert.deepEqual(cb.bandStepFor("high-unpleasant", null, reading({ value: "flooded" })), none, "a current flooded is not carried (D-07); the engine infers");
  for (const q of ["high-pleasant", "low-pleasant", null]) {
    assert.deepEqual(cb.bandStepFor(q, own, reading()), none, String(q));
  }
});

test("checkInIntensity: banded → graph bandIntensity with the emotion's x; unbanded keeps its value", () => {
  assert.deepEqual(cb.checkInIntensity(reading({ value: "flooded" }), fixture, 0.2, null), { x: 0.2, y: 0.85 });
  assert.deepEqual(cb.checkInIntensity(reading({ value: "steady" }), fixture, undefined, { x: 0.7, y: 0.5 }), { x: 0.7, y: 0.35 });
  assert.equal(cb.checkInIntensity(null, fixture, 0.2, null), null);
  assert.deepEqual(cb.checkInIntensity(reading(), null, 0.2, { x: 0.1, y: 0.5 }), { x: 0.1, y: 0.5 }, "content not loaded: unchanged");
  // I can't tell → stirred → 0.6 (the reading's value is already stirred)
  assert.equal(cb.checkInIntensity(reading({ viaCantTell: true }), fixture, 0.5, null).y, 0.6);
});

test("History: band word from content, else the legacy intensity word", () => {
  assert.deepEqual(cb.historyBandLabel({ band: "stirred", intensity: { y: 0.6 } }, fixture.bandLabels), { kind: "band", text: "Stirred" });
  assert.deepEqual(cb.historyBandLabel({ band: "flooded", intensity: { y: 0.85 } }, null), { kind: "band", text: "Flooded" });
  assert.deepEqual(cb.historyBandLabel({ band: null, intensity: { y: 0.5 } }, fixture.bandLabels), { kind: "legacy", text: "Medium" });
  assert.deepEqual(cb.historyBandLabel({ intensity: { y: 0.9 } }, null), { kind: "legacy", text: "High" });
  assert.deepEqual(fixture.bandLabels, { steady: "Steady", stirred: "Stirred", flooded: "Flooded" });
});

const pt = (y, band = "stirred") => ({ intensityY: y, band });
test("Insights guard: the constant-0.5 era never reads as an escalation", () => {
  // Old unbanded 0.5s followed by banded flooded: without the guard this is "trending".
  assert.equal(guard.intensityTrending([pt(0.85, "flooded"), pt(0.85, "flooded"), pt(0.5, null), pt(0.5, null)]), false);
  assert.equal(guard.intensityTrending([pt(0.85), pt(0.85), pt(0.35), pt(0.35)]), true);
  assert.equal(guard.intensityTrending([pt(0.85), pt(0.85), pt(0.35)]), false, "needs two in each half");
  assert.equal(guard.intensityTrending([pt(0.6), pt(0.6), pt(0.6), pt(0.6)]), false);
});

test("Insights guard: 'catching it earlier' needs ≥2 banded check-ins per half", () => {
  const olderUnbanded = [pt(0.5, null), pt(0.5, null), pt(0.5, null)];
  assert.equal(guard.intensityDrop(olderUnbanded, [pt(0.35), pt(0.35)], 0.05), null, "0.5 → 0.35 regime change is not growth");
  assert.equal(guard.intensityDrop([pt(0.85), pt(0.5, null)], [pt(0.35), pt(0.35)], 0.05), null, "only one banded in the older half");
  const d = guard.intensityDrop([pt(0.85), pt(0.85)], [pt(0.35), pt(0.6)], 0.05);
  assert.ok(d && Math.abs(d.previous - 0.85) < 1e-9 && Math.abs(d.current - 0.475) < 1e-9);
  assert.equal(guard.intensityDrop([pt(0.6), pt(0.6)], [pt(0.6), pt(0.6)], 0.05), null);
});

test("wiring: no probe step in the check-in (removed 30 Sep); band to the engine and the result screens; IntensityGrid gone", () => {
  const ci = readFileSync("src/pages/CheckIn.tsx", "utf8");
  assert.doesNotMatch(ci, /\| 'capacity'/);
  assert.doesNotMatch(ci, /BandGate|CapacityProbe/);
  assert.match(ci, /band: cap\.value, bandViaCantTell: cap\.viaCantTell/);
  assert.equal((ci.match(/band=\{capacity\?\.value \?\? null\}/g) ?? []).length, 2, "both result screens get the band");
  assert.doesNotMatch(ci, /setCapacity\(null\); void handleEmotionSelect/, "re-picking a word keeps this check-in's answer");
  assert.equal(existsSync("src/components/checkin/IntensityGrid.tsx"), false);
  // Reflect R1 split the insights callable: the read is in queries.ts, the guarded metrics in compute.ts.
  assert.match(readFileSync("functions/src/insights/queries.ts", "utf8"), /c\.band AS band/);
  const ins = readFileSync("functions/src/insights/compute.ts", "utf8");
  assert.match(ins, /intensityDrop\(older, newer/);
  assert.match(ins, /intensityTrending\(own\)/);
  for (const f of ["index.ts", "handler.ts", "compute.ts", "queries.ts"]) {
    assert.doesNotMatch(readFileSync(`functions/src/insights/${f}`, "utf8"), /recentAvgIntensity/, f);
  }
  assert.match(readFileSync("src/pages/History.tsx", "utf8"), /historyBandLabel\(checkIn, bandLabels\)/);
});
