// A4-2: the band runtime. Pure store logic (make / carry / persist / gate decision / hand-off ext),
// server-rendered smoke tests of the probe, gate, P2 and too-much link against the fixture content,
// the fixture's freshness, and static guards (provider mounted, no numbers, no locks).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { importTs } from "./lib/importTs.mjs";

const store = await importTs("src/lib/bandStore.ts");
const { BandProvider } = await importTs("src/contexts/BandContext.tsx");
const { CapacityProbe } = await importTs("src/components/capacity/CapacityProbe.tsx");
const { BandGate } = await importTs("src/components/capacity/BandGate.tsx");
const { BreakdownHandoff } = await importTs("src/components/capacity/BreakdownHandoff.tsx");
const { TooMuchLink } = await importTs("src/components/capacity/TooMuchLink.tsx");
const reading = await importTs("functions/src/capacity/reading.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/capacity-content.json", "utf8"));

const NOW = new Date("2026-10-01T12:00:00Z");
const U1 = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const U2 = "4f2c9a0e-1b2c-4d5e-8f90-123456789abc";

class MemStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

test("makeReading: I can't tell reads as stirred; framing defaults to now; probe version stamped", () => {
  const r = store.makeReading({ value: "flooded", viaCantTell: true, source: "probe", context: "checkin" }, U1, NOW);
  assert.equal(r.value, "stirred");
  assert.equal(r.viaCantTell, true);
  assert.equal(r.framing, "now");
  assert.equal(r.probeVersion, "capacity-v1");
  assert.equal(r.at, NOW.toISOString());
});

test("carryReading points at the original answer and passes the server validator (≤ 20 min)", () => {
  const first = store.makeReading({ value: "flooded", source: "probe", context: "checkin" }, U1, NOW);
  const later = new Date(NOW.getTime() + 15 * 60_000);
  const c = store.carryReading(first, { context: "dear-man" }, U2, later);
  assert.deepEqual(c.carriedFrom, { readingId: U1, context: "checkin", at: NOW.toISOString() });
  assert.equal(c.source, "carried");
  const ok = reading.validateCapacityReading(c, { now: later, allowSources: ["carried"], freshMinutes: 20 });
  assert.equal(ok.value, "flooded");
  // A carried reading carried again still points at the answer the user gave.
  const again = store.carryReading(c, { context: "checkin" }, "5f2c9a0e-1b2c-4d5e-8f90-123456789abc", later);
  assert.equal(again.carriedFrom.readingId, U1);
});

test("gateDecision: carry a current reading; ask with none or force; re-ask a carried flooded once (D-07)", () => {
  const r = (value) => store.makeReading({ value, source: "probe", context: "checkin" }, U1, NOW);
  assert.equal(store.gateDecision(null, {}), "ask");
  assert.equal(store.gateDecision(r("stirred"), {}), "carry");
  assert.equal(store.gateDecision(r("stirred"), { force: true }), "ask");
  assert.equal(store.gateDecision(r("flooded"), { reaskIfFlooded: true }), "reask");
  assert.equal(store.gateDecision(r("flooded"), {}), "carry");
});

test("sessionStorage: owned per uid, malformed ignored, throwing storage never crashes", () => {
  const s = new MemStorage();
  const r = store.makeReading({ value: "steady", source: "probe", context: "checkin" }, U1, NOW);
  store.writeStored(s, "uid-a", r);
  assert.deepEqual(store.readStored(s, "uid-a"), r);
  assert.equal(store.readStored(s, "uid-b"), null, "another account never sees it");
  assert.equal(store.readStored(s, null), null);
  s.setItem(store.BAND_STORE_KEY, "{not json");
  assert.equal(store.readStored(s, "uid-a"), null);
  const boom = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() { throw new Error("x"); } };
  assert.equal(store.readStored(boom, "uid-a"), null);
  store.writeStored(boom, "uid-a", r);
  store.clearStored(boom);
  store.clearStored(null);
});

test("freshest: newest current reading wins; stale or non-now readings never count", () => {
  const at = (min) => new Date(NOW.getTime() + min * 60_000);
  const a = store.makeReading({ value: "steady", source: "probe", context: "checkin" }, U1, at(-5));
  const b = store.makeReading({ value: "flooded", source: "probe", context: "checkin" }, U2, at(-1));
  const stale = store.makeReading({ value: "stirred", source: "probe", context: "checkin" }, U2, at(-25));
  const recall = store.makeReading({ value: "stirred", source: "diary_recall", framing: "hardest_today", context: "checkin" }, U2, at(0));
  assert.equal(store.freshest(a, b, NOW.getTime(), 20).value, "flooded");
  assert.equal(store.freshest(a, stale, NOW.getTime(), 20).value, "steady");
  assert.equal(store.freshest(stale, recall, NOW.getTime(), 20), null);
});

test("handoffExt: one entry per primitive, reread on the last; passes the registered ext.er schema", () => {
  const ext = store.handoffExt([
    { resumed: false, overridden: false, thenVsNow: "same", primitivesRun: [{ id: "sigh", completed: true, durationSec: 31.6 }, { id: "orient", completed: false, durationSec: 12 }] },
    { resumed: true, overridden: true, thenVsNow: null, primitivesRun: [] },
  ]);
  assert.deepEqual(ext, [
    { primitiveId: "sigh", completed: true, durationSec: 32 },
    { primitiveId: "orient", completed: false, durationSec: 12, resumed: false, overridden: false, thenVsNow: "same" },
    { resumed: true, overridden: true },
  ]);
  assert.ok(validateExt({ er: { handoffs: ext } }));
  const many = store.handoffExt(Array.from({ length: 6 }, () => ({ resumed: true, overridden: true, thenVsNow: null, primitivesRun: [] })));
  assert.equal(many.length, 4, "the schema caps handoffs at 4");
});

test("probePrompt: relational uses the label, else the someone fallback (Phase A has no Person)", () => {
  assert.equal(store.probePrompt(fixture.probe, "relational", "Sam"), "If Sam texted you right now, you'd…");
  assert.equal(store.probePrompt(fixture.probe, "relational", null), fixture.probe.wordings.relational.someone);
  assert.equal(store.probePrompt(fixture.probe, "default"), fixture.probe.wordings.default.prompt);
});

// ---- server-rendered smoke tests (no DOM; effects don't run) ----
const wrap = (el) => renderToStaticMarkup(h(BandProvider, { owner: null, content: fixture }, el));

test("CapacityProbe renders three answers and I can't tell, no number anywhere", () => {
  const html = renderToStaticMarkup(h(CapacityProbe, { probe: fixture.probe, onAnswer: () => {} }));
  for (const b of ["steady", "stirred", "flooded", "cant-tell"]) assert.match(html, new RegExp(`data-band="${b}"`));
  assert.match(html, /hey, could you help me with something\?/);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, " ").replace(/&[#a-z0-9]+;/gi, " "), /\d/, "no digits in the probe's visible text");
  const noCant = renderToStaticMarkup(h(CapacityProbe, { probe: fixture.probe, allowCantTell: false, onAnswer: () => {} }));
  assert.doesNotMatch(noCant, /cant-tell/);
});

test("BandGate with no current reading renders the probe (relational someone form)", () => {
  const html = wrap(h(BandGate, { context: "dear-man", wording: "relational", onBand: () => {} }));
  assert.match(html, /data-testid="capacity-probe"/);
  assert.match(html, /If they texted you right now/);
});

test("BreakdownHandoff opens on the card with Start and Keep going anyway; skipping the card shows the sigh first", () => {
  const card = wrap(h(BreakdownHandoff, { host: "dear-man", band: "flooded", onResume: () => {} }));
  assert.match(card, /data-testid="handoff-card"/);
  assert.match(card, /This is a body moment, not a thinking moment/);
  assert.match(card, /data-testid="keep-going"/);
  const prim = wrap(h(BreakdownHandoff, { host: "dear-man", band: "flooded", startWithPrimitive: true, onResume: () => {} }));
  assert.match(prim, /data-testid="primitive-sigh"/);
  const blank = wrap(h(BreakdownHandoff, { host: "dear-man", band: "stirred", blank: true, startWithPrimitive: true, onResume: () => {} }));
  assert.match(blank, /data-testid="primitive-orient"/, "blank and not flooded: orient first");
  assert.match(prim, /data-testid="keep-going"/, "never a lock: the way out is there before the breath starts");
});

test("closing the too-much overlay is not leaving: P2 doesn't write the draft to the device", () => {
  const link = readFileSync("src/components/capacity/TooMuchLink.tsx", "utf8");
  assert.match(link, /dismissedRef=\{dismissed\}/);
  assert.match(link, /const close = \(\) => \{ dismissed\.current = true; setOpen\(null\); \}/);
  assert.match(readFileSync("src/components/capacity/BreakdownHandoff.tsx", "utf8"), /!resolved\.current && !dismissedRef\?\.current\) persistRef\.current\(\)/);
});

test("TooMuchLink renders the graph's quiet link, closed by default", () => {
  const html = wrap(h(TooMuchLink, { host: "dear-man" }));
  assert.match(html, /This is too much right now/);
  assert.doesNotMatch(html, /role="dialog"/);
});

// ---- fixture + static guards ----
test("fixture is fresh (scripts/capacity/fixture.py) and matches schema/capacity.cypher's content", (t) => {
  const cypher = readFileSync("schema/capacity.cypher", "utf8");
  const probe = JSON.parse(JSON.parse(cypher.match(/p\.contentJson = (".*");/)[1]));
  for (const k of ["version", "freshMinutes", "bandIntensity", "probe", "handoff"]) assert.deepEqual(fixture[k], probe[k], k);
  assert.deepEqual(fixture.primitives.map((p) => p.id), ["sigh", "orient"]);
  let before;
  try {
    before = readFileSync("tests/fixtures/capacity-content.json", "utf8");
    execFileSync("python3", ["scripts/capacity/fixture.py"], { encoding: "utf8" });
  } catch { t.skip("python3 unavailable"); return; }
  assert.equal(readFileSync("tests/fixtures/capacity-content.json", "utf8"), before);
});

test("BandProvider is mounted inside AuthProvider; FTF records its band; P2 never locks or shows a scale", () => {
  const main = readFileSync("src/main.tsx", "utf8");
  assert.ok(main.indexOf("<AuthProvider>") < main.indexOf("<AuthBandProvider>"));
  assert.match(readFileSync("src/pages/tools/FindTheFeeling.tsx", "utf8"), /band\.record\(\{ value: state\.band, source: 'ftf'/);
  for (const f of ["BreakdownHandoff", "TooMuchLink", "BandGate", "CapacityProbe"]) {
    const src = readFileSync(`src/components/capacity/${f}.tsx`, "utf8");
    assert.doesNotMatch(src, /WaitLock|UrgeScale|type="range"|\/ ?10\b|blur-\[/, f);
  }
  assert.match(readFileSync("dev/vite.harness.config.ts", "utf8"), /capacity\.html/);
  assert.match(readFileSync("src/contexts/TodayContext.tsx", "utf8"), /getToday\(bandValue\)/, "Today gets the fresh band (E2 GetTodayRequest)");
});
