// The shared deadline clock (docs/design/dbt-modules-plan.md C3a R13): timestamps, never a counted interval.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const d = await importTs("src/lib/timer/deadline.ts");

test("idle before it starts, running while under the deadline, done at it, never past 1", () => {
  assert.equal(d.readDeadline({ startedAt: null, durationMs: 60_000 }, 5).state, "idle");
  assert.equal(d.readDeadline({ startedAt: null, durationMs: 60_000 }, 5).secondsLeft, 60);
  const r = d.readDeadline({ startedAt: 1_000, durationMs: 60_000 }, 31_000);
  assert.deepEqual([r.state, r.elapsedMs, r.leftMs, r.fraction, r.secondsLeft], ["running", 30_000, 30_000, 0.5, 30]);
  assert.equal(d.readDeadline({ startedAt: 1_000, durationMs: 60_000 }, 31_001).secondsLeft, 30, "rounded up");
  const done = d.readDeadline({ startedAt: 1_000, durationMs: 60_000 }, 999_999);
  assert.deepEqual([done.state, done.fraction, done.leftMs, done.secondsLeft], ["done", 1, 0, 0]);
  assert.equal(d.readDeadline({ startedAt: 10_000, durationMs: 1_000 }, 5_000).elapsedMs, 0, "a clock behind the start reads 0");
});

test("mm:ss", () => {
  assert.equal(d.mmss(0), "00:00");
  assert.equal(d.mmss(61_001), "01:02");
  assert.equal(d.mmss(-5), "00:00");
});

test("Cool Down uses the shared cues and keep-awake, not copies", () => {
  const src = readFileSync("src/pages/tools/CoolDown.tsx", "utf8");
  assert.match(src, /from '\.\.\/\.\.\/hooks\/useDeadlineTimer'/);
  assert.doesNotMatch(src, /function useCues|function useKeepAwake/);
});
