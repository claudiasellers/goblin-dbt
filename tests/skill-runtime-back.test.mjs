// Back walks the screens back (docs/design/skill-runtime.md, *Back walks the screens back*). A live run keeps a trail
// that every forward move pushes and every Back pops, so a loop step whose next screen is the one before it (First,
// the body's check → swap, Ride it out's renewed round, Rebel's heads-up) stays a forward move. Checked on every skill
// in the catalogue by seeded random walks, then Back all the way.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const EMBEDS = JSON.parse(execFileSync("python3", ["-c", "import sys,json; sys.path.insert(0,'scripts/skills'); from content import EMBEDS; print(json.dumps(EMBEDS))"], { encoding: "utf8" }));
const GRID = ["anxious", "angry", "sad", "ashamed", "guilty", "hurt", "lonely", "jealous", "scared", "frustrated"];

function rng(seed) {
  let x = seed * 2654435761 % 4294967296 || 1;
  return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
}

/** One seeded walk forward: the forward entries in order, and the state at the end. */
function walk(ctx, seed, moves = 30) {
  const r = rng(seed);
  let s = M.initialRun(ctx.skill);
  const fwd = [M.entryOf(s.stepId, s.pick)];
  for (let i = 0; i < moves; i++) {
    const step = M.stepOf(ctx.skill, s.stepId);
    let t;
    if (step.kind === "handoff") break;
    if (step.kind === "embed") {
      const ids = EMBEDS[step.embed]?.ids ?? [];
      t = M.runNext(ctx, s, { type: "embedDone", output: { ids: ids.length ? [ids[Math.floor(r() * ids.length)]] : [] } });
    } else {
      let a = s;
      for (const f of M.shownFields(ctx, step, a)) {
        const opts = M.optionGroups(ctx, f, M.answersOf(ctx, a)).flatMap((g) => g.options.map((o) => o.value));
        if (opts.length) a = M.runNext(ctx, a, { type: "pick", fieldId: f.id, value: opts[Math.floor(r() * opts.length)] });
        if (a === s && f.own) a = M.runNext(ctx, a, { type: "own", fieldId: f.id, text: "words" });
      }
      t = M.runNext(ctx, a, { type: "next" });
      if (t === a) break;
    }
    if (t.stepId === s.stepId && t.pick === s.pick && t.path.length === s.path.length) break;
    s = t;
    fwd.push(M.entryOf(s.stepId, s.pick));
  }
  return { s, fwd };
}

test("Back retraces every forward move, loops included, on every skill", () => {
  let loops = 0;
  for (const skill of fixture.skills) {
    const ctx = { skill, shared: fixture, carried: [], gridIds: new Set(GRID), emotionLabel: (x) => x, ctxIn: {}, embedOutputs: EMBEDS, profile: null };
    for (let seed = 1; seed <= 25; seed++) {
      const { s, fwd } = walk(ctx, seed);
      if (new Set(fwd).size < fwd.length) loops++;
      let b = s;
      const back = [M.entryOf(b.stepId, b.pick)];
      for (let i = 0; i < fwd.length + 2; i++) {
        const n = M.runNext(ctx, b, { type: "back" });
        if (n === b) break;
        b = n;
        back.push(M.entryOf(b.stepId, b.pick));
      }
      assert.deepEqual(back, [...fwd].reverse(), `${skill.id} seed ${seed}`);
    }
  }
  assert.ok(loops > 0, "some walks went through a loop step");
});

test("a forward move to the screen before is still forward: Back from it goes to the step it came from", () => {
  // check → swap → check, as First, the body's check after a swap, and Ride it out's renewed round.
  const skill = {
    id: "loop_demo", toolId: "x", version: "v", start: "mode", ownMax: 140, copy: {}, tables: {}, derive: [], options: {
      again: [{ value: "again", label: "Again" }, { value: "done", label: "Done" }] },
    steps: [
      { id: "mode", kind: "ask", fields: [], next: [{ to: "check", when: null }], offers: [] },
      { id: "check", kind: "ask", fields: [{ id: "again", options: { list: "again" }, max: 1, required: true }],
        next: [{ to: "mode", when: { eq: ["$a.again", "again"] } }, { to: "end", when: null }], offers: [] },
      { id: "end", kind: "handoff", next: [], offers: [], done: "done" },
    ],
    exits: [{ id: "done", done: true }],
  };
  const ctx = { skill, shared: { parentOf: {}, fitsWhen: {} }, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: {} };
  const go = (ev, s = M.initialRun(skill)) => ev.reduce((x, e) => M.runNext(ctx, x, e), s);
  const p = (v) => ({ type: "pick", fieldId: "again", value: v });
  let s = go([{ type: "next" }, p("again"), { type: "next" }]);
  assert.equal(s.stepId, "mode");
  assert.deepEqual(s.path, ["mode", "check", "mode"]);
  s = go([{ type: "back" }], s);
  assert.equal(s.stepId, "check", "the second mode came from check");
  s = go([{ type: "back" }], s);
  assert.equal(s.stepId, "mode");
  assert.equal(go([{ type: "back" }], s), s, "and the first mode is the start");
  // The path alone (a resumed run) can't tell; it reads mode → check → mode as a step back.
  assert.deepEqual(M.backTrail(["mode", "check", "mode"]), ["mode"]);
});

test("a resumed run, with no trail, reads one from its path", () => {
  assert.deepEqual(M.backTrail(["a", "b", "c", "b"]), ["a", "b"]);
  assert.deepEqual(M.backTrail(["a", "b", "c", "b", "c", "d"]), ["a", "b", "c", "d"]);
});
