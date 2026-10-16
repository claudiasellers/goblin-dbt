// Reflect R1: the numbers Reflect shows (functions/src/insights/compute.ts) and the History helpers
// (src/lib/reflect.ts). The callable over the fake driver is in functions/test/unit/insights.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const c = await importTs("functions/src/insights/compute.ts");
const r = await importTs("src/lib/reflect.ts");
const spine = await importTs("functions/src/spine/types.ts");

const day = 86_400_000;
const T0 = Date.parse("2026-09-01T12:00:00Z");
const at = (d) => new Date(T0 + d * day).toISOString();
const ci = (o) => ({
  id: o.id, timestamp: at(o.d), emotion: o.emotion ?? (o.ids ?? ["anxious"]).join(", "), emotionIds: o.ids ?? ["anxious"],
  quadrant: o.quadrant ?? "high-unpleasant", intensityX: 0.2, intensityY: 0.8, band: o.band ?? null,
  activationPatternId: o.pattern === undefined ? "acute_alarm" : o.pattern, bodyRegions: o.regions ?? [],
  sensationTags: o.tags ?? [], families: o.families ?? ["fear"],
});
const session = (o) => ({
  id: o.id, toolId: o.toolId, patternId: o.pattern ?? null, checkInId: o.checkInId ?? null, at: at(o.d),
  closeKind: o.closeKind ?? null, thenVsNow: o.tvn ?? null, actedOnUrge: o.acted ?? null,
});
const newestFirst = (xs) => [...xs].sort((a, b) => Date.parse(b.timestamp ?? b.at) - Date.parse(a.timestamp ?? a.at));

// ── compute.ts ──

test("compute.ts stays pure: no firebase, no driver", () => {
  const src = readFileSync("functions/src/insights/compute.ts", "utf8");
  assert.doesNotMatch(src, /from ['"](firebase|neo4j-driver)/);
  assert.doesNotMatch(src, /from ['"]\.\.\/shared\//);
});

test("thresholds are the pre-R1 values (R1 changes what is counted, not when it shows)", () => {
  assert.deepEqual(c.thresholdsFor("30d"), {
    coOccurrenceMin: 2, dominantRepeatMin: 2, growthCheckIns: 4, growthDaySpan: 5, growthHalfMin: 2,
    emotionVocabMin: 3, emotionFamilyMin: 3, intensityDropMin: 0.08, sensationTagDelta: 2, sensationTagMin: 3,
    bodyAvgDelta: 0.3, bodyAvgMin: 0.5, followThroughRate: 0.4, followThroughCount: 3, toolRepertoireMin: 3,
    outcomeCountMin: 2, somaticCheckInMin: 2, somaticRegionCount: 2, somaticFallbackMin: 3,
  });
  assert.equal(c.thresholdsFor("7d").growthCheckIns, 2);
  assert.equal(c.thresholdsFor("all").growthDaySpan, 14);
});

test("wordsOf: graph ids first, else the display join split one by one; no word → none", () => {
  assert.deepEqual(c.wordsOf({ emotion: "anxious, let down", emotionIds: ["anxious", "let_down"], quadrant: "high-unpleasant" }), ["anxious", "let_down"]);
  assert.deepEqual(c.wordsOf({ emotion: "Anxious, let down", emotionIds: [], quadrant: "high-unpleasant" }), ["anxious", "let down"]);
  assert.deepEqual(c.wordsOf({ emotion: "high-unpleasant", emotionIds: [], quadrant: "high-unpleasant" }), []);
});

test("vocabulary growth counts words, not combinations (pre-R1 read 'anxious, tired' as a new word)", () => {
  const checkIns = newestFirst([
    ci({ id: "a", d: 0, ids: ["anxious"] }),
    ci({ id: "b", d: 2, ids: ["tired"] }),
    ci({ id: "c", d: 4, ids: ["anxious", "tired"] }),
    ci({ id: "d", d: 5, ids: ["tired"] }),
    ci({ id: "e", d: 6, ids: ["anxious"] }),
  ]);
  const g = c.growthEvidence(checkIns, [], [], [], c.thresholdsFor("30d"));
  assert.ok(!g?.insights.some((i) => i.key === "emotion-vocabulary"), "the same two words in both halves is not growth");

  const grown = newestFirst([...checkIns.slice(1), ci({ id: "f", d: 6.5, ids: ["anxious", "let_down"] })]);
  const g2 = c.growthEvidence(grown, [], [], [], c.thresholdsFor("30d"));
  const v = g2.insights.find((i) => i.key === "emotion-vocabulary");
  assert.deepEqual(v.data, { current: 3, previous: 2 });
});

test("follow-through counts only a tool explicitly opened from the check-in", () => {
  const checkIns = newestFirst([0, 1, 2, 3, 4, 5].map((d) => ci({ id: `c${d}`, d })));
  const th = c.thresholdsFor("30d");
  const linked = ["c0", "c2", "c4"].map((id, i) => session({ id: `s${i}`, toolId: "cool-down", checkInId: id, d: i }));
  const g = c.growthEvidence(checkIns, linked, [], [], th);
  assert.deepEqual(g.insights.find((i) => i.key === "tool-follow-through").data, { numerator: 3, denominator: 6 });
  const unlinked = linked.map((s) => ({ ...s, checkInId: null }));
  assert.equal(c.growthEvidence(checkIns, unlinked, [], [], th)?.insights.find((i) => i.key === "tool-follow-through"), undefined);
  const legacy = [{ toolId: "pause", outcome: null, timestamp: at(1), patternId: null, checkInId: "c1" }];
  assert.equal(c.growthEvidence(checkIns, linked, legacy, [], th).insights.find((i) => i.key === "tool-follow-through").data.numerator, 4);
});

test("outcomeRows: better counts as went well, urge tools on their own question, one-shots skipped, D-03 read back", () => {
  const rows = c.outcomeRows([
    session({ id: "1", toolId: "cool-down", d: 5, closeKind: "regulation_down", tvn: "better" }),
    session({ id: "2", toolId: "cool-down", d: 4, closeKind: "regulation_down", tvn: "much_better" }),
    session({ id: "3", toolId: "five-senses", d: 3, closeKind: "orienting", tvn: "same" }),
    session({ id: "4", toolId: "five-senses", d: 2, closeKind: "orienting", tvn: "worse" }),
    session({ id: "5", toolId: "pause", d: 1, closeKind: "urge", acted: "no" }),
    session({ id: "6", toolId: "urge-surfing", d: 1, closeKind: "urge", acted: "partly" }),
    session({ id: "7", toolId: "micro-step", d: 1, tvn: "much_better" }),
    session({ id: "8", toolId: "opposite-action", d: 1, closeKind: "none" }),
  ], [
    { toolId: "cool-down", outcome: "somewhat", timestamp: at(0), patternId: null, checkInId: null },
    { toolId: "cool-down", outcome: "not_really", timestamp: at(-1), patternId: null, checkInId: null },
  ]);
  assert.deepEqual(rows.map((o) => [o.toolId, o.measure, o.direction, o.wentWell]), [
    ["cool-down", "then_vs_now", "down", true],
    ["cool-down", "then_vs_now", "down", true],
    ["five-senses", "then_vs_now", "orient", false],
    ["five-senses", "then_vs_now", "orient", false],
    ["pause", "urge", null, true],
    ["urge-surfing", "urge", null, false],
    ["cool-down", "then_vs_now", null, true],
    ["cool-down", "then_vs_now", null, false],
  ]);
  for (const id of spine.RESERVED_TOOL_IDS) assert.equal(c.isAppTool(id), false, id);
});

test("outcomeRows: Meet a part's orienting close is never counted as went well (or at all)", () => {
  const rows = c.outcomeRows([
    session({ id: "1", toolId: "meet-a-part", d: 2, closeKind: "orienting", tvn: "much_better" }),
    session({ id: "2", toolId: "five-senses", d: 1, closeKind: "orienting", tvn: "better" }),
  ], []);
  assert.deepEqual(rows.map((o) => o.toolId), ["five-senses"]);
  assert.equal(c.toolEffectiveness(c.outcomeRows([session({ id: "1", toolId: "meet-a-part", d: 1, closeKind: "orienting", tvn: "better" })], [])), null);
});

test("toolEffectiveness: best share first, then most answered; direction from the latest spine close; at most 4", () => {
  const rows = c.outcomeRows([
    session({ id: "1", toolId: "cool-down", d: 5, closeKind: "regulation_down", tvn: "better" }),
    session({ id: "2", toolId: "cool-down", d: 4, closeKind: "regulation_down", tvn: "same" }),
    session({ id: "3", toolId: "five-senses", d: 3, closeKind: "orienting", tvn: "better" }),
    session({ id: "4", toolId: "pause", d: 2, closeKind: "urge", acted: "no" }),
    session({ id: "5", toolId: "pause", d: 1, closeKind: "urge", acted: "no" }),
  ], [{ toolId: "five-senses", outcome: "helped", timestamp: at(9), patternId: null, checkInId: null }]);
  const out = c.toolEffectiveness(rows);
  assert.deepEqual(out.tools.map((t) => [t.toolId, t.measure, t.direction, t.wentWell, t.answered, t.helpedPct]), [
    // A tie on share and count falls back to the tool id, so the order never flickers between loads.
    ["five-senses", "then_vs_now", "orient", 2, 2, 100],
    ["pause", "urge", null, 2, 2, 100],
    ["cool-down", "then_vs_now", "down", 1, 2, 50],
  ], "five-senses' newest answer is a pre-spine rating; its direction still comes from its spine close");
  assert.equal(c.toolEffectiveness([]), null);
});

test("effectiveToolsForPattern: only this pattern, only closes that went well", () => {
  const rows = c.outcomeRows([
    session({ id: "1", toolId: "cool-down", pattern: "acute_alarm", d: 1, closeKind: "regulation_down", tvn: "better" }),
    session({ id: "2", toolId: "five-senses", pattern: "acute_alarm", d: 1, closeKind: "orienting", tvn: "same" }),
    session({ id: "3", toolId: "pause", pattern: "rumination_loop", d: 1, closeKind: "urge", acted: "no" }),
  ], []);
  assert.deepEqual(c.effectiveToolsForPattern(rows, "acute_alarm"), ["cool-down"]);
});

test("'what you're doing is working' reads the spine: better now counts (pre-R1 needed much better)", () => {
  const checkIns = newestFirst([0, 1, 2, 6, 7, 8].map((d) => ci({ id: `c${d}`, d })));
  const sessions = [
    session({ id: "o1", toolId: "cool-down", d: 1, closeKind: "regulation_down", tvn: "same" }),
    session({ id: "o2", toolId: "cool-down", d: 2, closeKind: "regulation_down", tvn: "same" }),
    session({ id: "n1", toolId: "cool-down", d: 7, closeKind: "regulation_down", tvn: "better" }),
    session({ id: "n2", toolId: "cool-down", d: 8, closeKind: "regulation_down", tvn: "better" }),
  ];
  const g = c.growthEvidence(checkIns, sessions, [], c.outcomeRows(sessions, []), c.thresholdsFor("30d"));
  assert.deepEqual(g.insights.find((i) => i.key === "positive-outcomes").data, { current: 100, previous: 0 });
});

test("formulationPlan: the pair when both repeat, else the dominant, else the most recent pattern", () => {
  const th = c.thresholdsFor("30d");
  const two = newestFirst([ci({ id: "1", d: 1 }), ci({ id: "2", d: 2 }), ci({ id: "3", d: 3, pattern: "rumination_loop" }), ci({ id: "4", d: 4, pattern: "rumination_loop" })]);
  const p = c.formulationPlan(two, c.tallyPatterns(two), th);
  assert.equal(p.pair.length, 2);
  const once = newestFirst([ci({ id: "1", d: 1, pattern: "rumination_loop" }), ci({ id: "2", d: 2, pattern: "acute_alarm" })]);
  assert.deepEqual(c.formulationPlan(once, c.tallyPatterns(once), th), { pair: null, single: "acute_alarm" }, "most recent when nothing repeats");
  const pleasant = [ci({ id: "1", d: 1, pattern: "positive_state" })];
  assert.deepEqual(c.formulationPlan(pleasant, c.tallyPatterns(pleasant), th), { pair: null, single: null });
});

test("catching it earlier stays band-only: the square's energy is not read as intensity", () => {
  // Since 30 Sep (capacity question out) new check-ins carry no band, so this metric is dormant.
  const checkIns = newestFirst([0, 1, 2, 6, 7, 8].map((d) => ({ ...ci({ id: `c${d}`, d }), intensityY: d < 5 ? 0.9 : 0.2 })));
  const g = c.growthEvidence(checkIns, [], [], [], c.thresholdsFor("30d"));
  assert.ok(!g?.insights.some((i) => i.key === "catching-earlier"));
});

// ── src/lib/reflect.ts ──

test("pleasantness reads the square's pleasantness axis, never energy", () => {
  const base = { quadrant: "high-unpleasant", intensity: { x: 0.4, y: 0.95 } };
  assert.equal(r.pleasantness(base), r.pleasantness({ ...base, intensity: { x: 0.4, y: 0.1 } }), "energy doesn't move the line");
  assert.ok(Math.abs(r.pleasantness(base) - -0.2) < 1e-9, "mildly unpleasant, however buzzy");
  assert.equal(r.pleasantness({ quadrant: "low-unpleasant", intensity: { x: 0 } }), -1);
  assert.equal(r.pleasantness({ quadrant: "high-pleasant", intensity: { x: 1 } }), 1);
  assert.equal(r.pleasantness({ quadrant: "low-pleasant", intensity: { x: 0.5 } }), r.MIN_PLEASANTNESS, "old records (x = 0.5) keep their side");
  assert.equal(r.pleasantness({ quadrant: "high-unpleasant", intensity: { x: 0.5 } }), -r.MIN_PLEASANTNESS);
});

test("topWords: one bar per word, merged regardless of case, coloured by the latest use", () => {
  const out = r.topWords([
    { emotion: "anxious, let down", quadrant: "high-unpleasant" },
    { emotion: "Anxious", quadrant: "low-unpleasant" },
    { emotion: "low-pleasant", quadrant: "low-pleasant" },
    { emotion: "calm", quadrant: "low-pleasant" },
  ]);
  assert.deepEqual(out, [
    { word: "anxious", count: 2, quadrant: "high-unpleasant" },
    { word: "let down", count: 1, quadrant: "high-unpleasant" },
    { word: "calm", count: 1, quadrant: "low-pleasant" },
  ]);
});

test("outcomeLine speaks in the close's own words, never a percentage", () => {
  assert.equal(r.outcomeLine({ measure: "then_vs_now", direction: "down", answered: 4, wentWell: 3, helpedPct: 75, totalUses: 4 }), "Quieter after, 3 of 4 times");
  assert.equal(r.outcomeLine({ measure: "then_vs_now", direction: "orient", answered: 1, wentWell: 1, helpedPct: 100, totalUses: 1 }), "More here after, 1 of 1 time");
  assert.equal(r.outcomeLine({ measure: "urge", direction: null, answered: 3, wentWell: 2, helpedPct: 67, totalUses: 3 }), "Didn't act on the urge 2 of 3 times");
  assert.equal(r.outcomeLine({ helpedPct: 67, totalUses: 3 }), "Helped 2 of 3 times", "a pre-R1 server's payload still reads");
  for (const line of [r.outcomeLine({ measure: "urge", answered: 2, wentWell: 1, helpedPct: 50, totalUses: 2 })]) assert.doesNotMatch(line, /%|!/);
});

test("tools opened from Reflect carry the spine's reserved 'insights' entry", () => {
  assert.equal(r.fromReflect().spine.entry, "insights");
  assert.ok(spine.TOOL_ENTRIES.includes("insights"));
  for (const f of readdirSync("src/components/insights").filter((x) => x.endsWith(".tsx"))) {
    const src = readFileSync(`src/components/insights/${f}`, "utf8");
    const links = [...src.matchAll(/<Link[\s\S]*?to=\{`\/tool\/[\s\S]*?>/g)].map((m) => m[0]);
    for (const l of links) assert.match(l, /state=\{fromReflect\(\)\}/, `${f}: a tool link without the Reflect entry`);
  }
});

test("wiring: History reads up to the server's ceiling; Insights logs no payload; client mirrors the summary", () => {
  assert.equal(r.HISTORY_LIMIT, 500);
  assert.match(readFileSync("functions/src/checkin/index.ts", "utf8"), /raw <= 500/, "HISTORY_LIMIT is the server's maximum");
  assert.match(readFileSync("src/pages/History.tsx", "utf8"), /getCheckInsByUser\(user\.uid, HISTORY_LIMIT\)/);
  assert.doesNotMatch(readFileSync("src/pages/Insights.tsx", "utf8"), /console\.log/);
  const client = readFileSync("src/services/neo4j.ts", "utf8");
  const server = readFileSync("functions/src/insights/types.ts", "utf8");
  const fields = (src) => [...src.match(/interface ToolOutcomeSummary \{([\s\S]*?)\n\}/)[1].matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]).sort();
  assert.deepEqual(fields(client), fields(server));
});
