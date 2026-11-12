// holdRing's pure rules (src/lib/holdRing.ts): the slowing pulse, growth across holds, what a release counts as,
// and the output the embed answers with.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const h = await importTs("src/lib/holdRing.ts");

test("pulse: 1 Hz, each beat 8% slower, never more than 45% slower", () => {
  assert.equal(h.pulseMs(0), 1000);
  assert.equal(h.pulseMs(1), 1080);
  assert.equal(h.pulseMs(2), 1166);
  for (let n = 5; n < 40; n++) assert.ok(h.pulseMs(n) <= 1450);
  assert.equal(h.pulseMs(30), 1450);
  assert.ok(h.pulseMs(4) > h.pulseMs(3), "still slowing before the cap");
});

test("plan: defaults per variant; anything out of range falls back, never throws", () => {
  assert.deepEqual(h.holdPlan({ variant: "settle" }), { variant: "settle", seconds: 4, holds: 3, growthPct: 100, maxSeconds: 900 });
  assert.deepEqual(h.holdPlan({}), { variant: "press", seconds: 30, holds: 1, growthPct: 100, maxSeconds: 900 });
  assert.equal(h.holdPlan({ variant: "nope", seconds: 5000, holds: 0 }).variant, "press");
  assert.equal(h.holdPlan({ seconds: 5000 }).seconds, 30);
  assert.equal(h.holdPlan({ seconds: 120, maxSeconds: 60 }).seconds, 60, "the first hold is within the cap too");
});

test("growth: DT-02's 90 s, ×1.5 each completed hold, capped", () => {
  const plan = h.holdPlan({ variant: "press", seconds: 90, holds: 4, growthPct: 150, maxSeconds: 900 });
  assert.deepEqual([0, 1, 2].map((n) => h.holdMs(plan, n)), [90_000, 135_000, 202_500]);
  const capped = h.holdPlan({ variant: "press", seconds: 600, holds: 3, growthPct: 300, maxSeconds: 900 });
  assert.equal(h.holdMs(capped, 2), 900_000);
});

test("release: press keeps the seconds of an early release; settle counts a breath from a quarter", () => {
  const press = h.holdPlan({ variant: "press", seconds: 10 });
  assert.equal(h.release(press, 1), "done");
  assert.equal(h.release(press, 0.5), "early");
  assert.equal(h.release(press, 0), "none");
  let t = h.tally(press, h.EMPTY_TALLY, 0.5);
  assert.deepEqual(t, { doneCount: 0, earlyCount: 1, heldMs: 5000 });
  assert.deepEqual(h.tally(press, t, 0), t, "a tap with no time held changes nothing");
  t = h.tally(press, t, 1);
  assert.deepEqual(t, { doneCount: 1, earlyCount: 1, heldMs: 15000 });
  const settle = h.holdPlan({ variant: "settle" });
  assert.equal(h.release(settle, 0.3), "done");
  assert.equal(h.release(settle, 0.2), "early");
});

test("output: held only when every hold is done; partly for any time held; skipped for none", () => {
  const plan = h.holdPlan({ variant: "settle", holds: 2 });
  assert.deepEqual(h.holdOutput(plan, h.EMPTY_TALLY), { ids: ["skipped"], durationSec: 0, doneCount: 0, earlyCount: 0 });
  const one = h.tally(plan, h.EMPTY_TALLY, 1);
  assert.equal(h.holdOutput(plan, one).ids[0], "partly");
  const two = h.tally(plan, one, 0.5);
  assert.equal(h.finished(plan, two), true);
  assert.deepEqual(h.holdOutput(plan, two), { ids: ["held"], durationSec: 6, doneCount: 2, earlyCount: 0 });
});

test("the embed: no digits in the ring, the shared gesture, the deadline clock for timed, still under reduced motion", () => {
  const src = readFileSync("src/components/skillPlayer/HoldRingEmbed.tsx", "utf8");
  assert.match(src, /useHoldGesture\(/, "press and settle use the parts flows' gesture");
  assert.match(src, /useDeadlineTimer\(\{ durationMs: holdMs\(plan, done\), chime: false, tickMs: 100/, "timed runs on the deadline clock, no sound by default");
  assert.match(src, /useKeepAwake\(running\)/);
  assert.doesNotMatch(src, /secondsLeft|mmss|leftMs/, "the acute path shows no digits");
  assert.match(src, /if \(!on \|\| reduce\) return;/, "the pulse stops under reduced motion");
  assert.match(src, /\{\(tried \|\| wayOnFromStart\) && \(/, "a way past appears after the first try, or from the start (wayOn: from_start): nothing locks");
});
