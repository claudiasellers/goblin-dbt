// A4-1: capacity band logic (src/lib/band.ts), resume tokens, the server reading validator, and
// the canonical then-vs-now (R3) shared by client and server.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const band = await importTs("src/lib/band.ts");
const rt = await importTs("src/lib/resumeToken.ts");
const reading = await importTs("functions/src/capacity/reading.ts");
const types = await importTs("functions/src/capacity/types.ts");

const NOW = Date.parse("2026-10-01T12:00:00Z");
const at = (min) => new Date(NOW + min * 60_000).toISOString();
const r = (o = {}) => ({ id: "3f2c9a0e-1b2c-4d5e-8f90-123456789abc", value: "stirred", viaCantTell: false, source: "probe",
  framing: "now", wording: "default", context: "checkin", probeVersion: "capacity-v1", at: at(0), ...o });

test("types mirror: src/data/capacityTypes.ts equals functions/src/capacity/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(4).join("\n");
  assert.equal(body("src/data/capacityTypes.ts"), body("functions/src/capacity/types.ts"));
  assert.deepEqual(types.THEN_VS_NOW, ["worse", "same", "better", "much_better"]);
  assert.deepEqual(types.THEN_VS_NOW_DIRS, ["down", "orient", "up"]);
});

test("isCurrent: 20-minute freshness boundary; only framing 'now'", () => {
  assert.equal(band.isCurrent(r({ at: at(-19.98) }), NOW, 20), true);
  assert.equal(band.isCurrent(r({ at: at(-20.02) }), NOW, 20), false);
  assert.equal(band.isCurrent(r({ framing: "hardest_today" }), NOW, 20), false);
  assert.equal(band.isCurrent(null, NOW, 20), false);
  assert.equal(band.fromCantTell(), "stirred");
});

test("bandFromLegacyScore (Recover → DEAR MAN): 0,5 steady; 6 stirred; 7,10 flooded", () => {
  const g = { downshiftAt: 7, askMax: 5 };
  assert.deepEqual([0, 5, 6, 7, 10].map((n) => band.bandFromLegacyScore(n, g)), ["steady", "steady", "stirred", "flooded", "flooded"]);
});

const prims = [
  { id: "orient", component: "orient", direction: "orient", bands: ["steady", "stirred", "flooded"], blank: "any", rank: 1, conceptId: "se_orienting", copy: {} },
  { id: "sigh", component: "breath_orb", direction: "calm", bands: ["steady", "stirred", "flooded"], blank: "any", rank: 0, conceptId: "cyclic_sighing", copy: {} },
];
test("planHandoff: two primitives of different modality; blank-not-flooded orients first", () => {
  const ids = (s) => band.planHandoff(s, prims).map((p) => p.id);
  assert.deepEqual(ids({ band: "flooded", blank: false }), ["sigh", "orient"]);
  assert.deepEqual(ids({ band: "flooded", blank: true }), ["sigh", "orient"], "never calming alone");
  assert.deepEqual(ids({ band: "stirred", blank: true }), ["orient", "sigh"]);
  assert.deepEqual(ids({ band: "steady", blank: false }), ["sigh", "orient"]);
});

test("afterReread: better resumes; otherwise a second primitive, then offer later (never a third)", () => {
  assert.equal(band.afterReread("better", 1), "resume");
  assert.equal(band.afterReread("much_better", 2), "resume");
  assert.equal(band.afterReread("same", 1), "second");
  assert.equal(band.afterReread("worse", 1), "second");
  assert.equal(band.afterReread("same", 2), "offerLater");
  assert.equal(band.afterReread(null, 2), "offerLater");
});

test("then-vs-now (R3): FTF close maps at read; compat outcome mapping; client and server agree", () => {
  for (const [ftf, want] of [["louder", "worse"], ["same", "same"], ["quieter", "better"], ["much", "much_better"]]) {
    assert.deepEqual(band.thenVsNowFromFtf(ftf), { thenVsNow: want, thenVsNowDir: "down" });
    assert.deepEqual(reading.thenVsNowFromFtf(ftf), band.thenVsNowFromFtf(ftf));
  }
  assert.equal(band.thenVsNowFromFtf("bogus"), null);
  for (const [v, o] of [["much_better", "helped"], ["better", "somewhat"], ["same", "not_really"], ["worse", "not_really"], [null, null]]) {
    assert.equal(band.legacyOutcome(v), o);
    assert.equal(reading.legacyOutcome(v), o);
  }
});

function memStorage(throwing = false) {
  const m = new Map();
  return {
    get length() { if (throwing) throw new Error("blocked"); return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => { if (throwing) throw new Error("blocked"); return m.get(k) ?? null; },
    setItem: (k, v) => { if (throwing) throw new Error("blocked"); m.set(k, v); },
    removeItem: (k) => { if (throwing) throw new Error("blocked"); m.delete(k); },
    m,
  };
}
const token = (o = {}) => ({ v: 1, toolId: "dear-man", hostSessionId: "h1", stepId: "scene:0", draft: { a: 1 }, band: "flooded",
  createdAt: at(0), expiresAt: at(24 * 60), ...o });

test("resume token: round trip once, expiry, wrong tool, 16 KB cap, storage throwing", () => {
  const s = memStorage();
  assert.equal(rt.saveResumeToken(token(), s), true);
  assert.deepEqual(rt.takeResumeToken("dear-man", "h1", NOW, s), token());
  assert.equal(rt.takeResumeToken("dear-man", "h1", NOW, s), null, "taken once");
  rt.saveResumeToken(token(), s);
  assert.equal(rt.takeResumeToken("pause", "h1", NOW, s), null, "other tool");
  rt.saveResumeToken(token({ expiresAt: at(-1) }), s);
  assert.equal(rt.takeResumeToken("dear-man", "h1", NOW, s), null, "expired");
  assert.equal(rt.saveResumeToken(token({ draft: "x".repeat(17 * 1024) }), s), false, "over 16 KB");
  const bad = memStorage(true);
  assert.equal(rt.saveResumeToken(token(), bad), false);
  assert.equal(rt.takeResumeToken("dear-man", "h1", NOW, bad), null);
  assert.doesNotThrow(() => rt.clearResumeTokens(bad));
  rt.saveResumeToken(token({ hostSessionId: "h2" }), s);
  s.setItem("other.key", "x");
  rt.clearResumeTokens(s);
  assert.deepEqual([...s.m.keys()], ["other.key"]);
});

test("server validator: enums, bounds on at, carried freshness, cant-tell, unknown keys dropped", () => {
  const opts = { now: new Date(NOW), allowSources: ["probe", "ftf", "carried"], freshMinutes: 20 };
  const ok = reading.validateCapacityReading({ ...r(), junk: "x" }, opts);
  assert.equal(ok.value, "stirred");
  assert.ok(!("junk" in ok));
  assert.throws(() => reading.validateCapacityReading(r({ value: "7" }), opts));
  assert.throws(() => reading.validateCapacityReading(r({ at: at(-13 * 60) }), opts), /out of range/);
  assert.throws(() => reading.validateCapacityReading(r({ at: at(6) }), opts), /out of range/);
  assert.throws(() => reading.validateCapacityReading(r({ source: "handoff" }), opts), /not allowed/);
  assert.throws(() => reading.validateCapacityReading(r({ source: "carried" }), opts), "carriedFrom required");
  const carried = r({ source: "carried", carriedFrom: { readingId: r().id, context: "checkin", at: at(-15) } });
  assert.equal(reading.validateCapacityReading(carried, opts).carriedFrom.context, "checkin");
  assert.throws(() => reading.validateCapacityReading(r({ source: "carried", carriedFrom: { readingId: r().id, context: "checkin", at: at(-25) } }), opts), /not fresh/);
  assert.throws(() => reading.validateCapacityReading(r({ viaCantTell: true, value: "flooded" }), opts));
  assert.throws(() => reading.validateCapacityReading(r({ context: "Not A Tool" }), opts));
  assert.equal(reading.optionalReading({ bogus: true }, opts), null, "optional readings never throw");
  assert.equal(reading.optionalReading(undefined, opts), null);
});

test("readingProps flattens onto band* / bandAtStart* / bandAtEnd*", () => {
  const p = reading.readingProps("band", r());
  assert.deepEqual(Object.keys(p).sort(), ["band", "bandAt", "bandJson", "bandSource", "bandViaCantTell"]);
  assert.equal(p.band, "stirred");
  assert.equal(JSON.parse(p.bandJson).id, r().id);
  assert.deepEqual(Object.keys(reading.readingProps("bandAtStart", null)).sort(),
    ["bandAtStart", "bandAtStartAt", "bandAtStartJson", "bandAtStartSource", "bandAtStartViaCantTell"]);
  assert.ok(Object.values(reading.readingProps("bandAtEnd", null)).every((v) => v === null));
});
