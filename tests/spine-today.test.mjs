// PR-S5: Today ordering and follow-up state (functions/src/spine/todayOrder.ts), due-time windows
// (src/lib/spine/windows.ts), Today card helpers, and where the stack renders.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const o = await importTs("functions/src/spine/todayOrder.ts");
const w = await importTs("src/lib/spine/windows.ts");
const card = await importTs("src/lib/spine/todayCard.ts");

const H = 3_600_000;
const NOW = Date.parse("2026-10-01T12:00:00Z");
const at = (h) => new Date(NOW + h * H).toISOString();
const item = (id, o2 = {}) => ({ id, kind: "follow_up", type: "t", tier: "quality", state: "due", dueAt: at(-1), resolveMode: "inline",
  deepLink: null, choices: [], copy: { title: id }, ...o2 });

test("follow-up state is derived: upcoming ≤2 h ahead, due until staleAfter, stale for a week more", () => {
  assert.equal(o.followUpState(at(3), 36, NOW), null, "too far out");
  assert.equal(o.followUpState(at(1.5), 36, NOW), "upcoming");
  assert.equal(o.followUpState(at(-1), 36, NOW), "due");
  assert.equal(o.followUpState(at(-36), 36, NOW), "due");
  assert.equal(o.followUpState(at(-37), 36, NOW), "stale");
  assert.equal(o.followUpState(at(-36 - 168), 36, NOW), "stale");
  assert.equal(o.followUpState(at(-36 - 169), 36, NOW), null, "gone after a week stale");
  assert.equal(o.followUpState("nope", 36, NOW), null);
});

test("order: tier, then due > stale > upcoming; due soonest first, stale newest first; 3 + more", () => {
  const all = [
    item("skills-due", { tier: "skills" }),
    item("q-upcoming", { state: "upcoming", dueAt: at(1) }),
    item("q-stale-old", { state: "stale", dueAt: at(-100) }),
    item("q-stale-new", { state: "stale", dueAt: at(-50) }),
    item("q-due-late", { dueAt: at(-1) }),
    item("q-due-early", { dueAt: at(-5) }),
    item("safety", { tier: "safety", state: "upcoming", dueAt: at(1) }),
  ];
  const { items, more, holding } = o.orderToday(all);
  assert.deepEqual(items.map((i) => i.id), ["safety", "q-due-early", "q-due-late"]);
  assert.deepEqual(more.map((i) => i.id), ["q-stale-new", "q-stale-old", "q-upcoming", "skills-due"]);
  assert.equal(holding, false);
});

test("at most one tool_outcome and one pattern_offer (the newest); flooded collapses without hiding", () => {
  const all = [item("a"), item("t1", { kind: "tool_outcome", tier: "skills", dueAt: at(-3) }), item("t2", { kind: "tool_outcome", tier: "skills", dueAt: at(-1) }),
    item("p1", { kind: "pattern_offer", tier: "skills" }), item("p2", { kind: "pattern_offer", tier: "skills", dueAt: at(-9) })];
  const r = o.orderToday(all);
  const ids = [...r.items, ...r.more].map((i) => i.id);
  assert.ok(ids.includes("t2") && !ids.includes("t1"));
  assert.ok(ids.includes("p1") && !ids.includes("p2"));
  const f = o.orderToday(all, "flooded");
  assert.deepEqual([f.items.length, f.more.length, f.holding], [0, 3, true]);
  assert.equal(o.orderToday([], "flooded").holding, false);
});

test("deep links fill from the follow-up; a missing value gives no link", () => {
  assert.equal(o.fillDeepLink("/tool/opposite-action?followUp={detailId}", { detailId: "abc" }), "/tool/opposite-action?followUp=abc");
  assert.equal(o.fillDeepLink("/tool/{sourceToolId}?resume={sourceSessionId}", { sourceToolId: "dear-man", sourceSessionId: null }), null);
  assert.equal(o.fillDeepLink(null, {}), null);
});

test("windows: local time next day / +2 d, after N minutes, chips; a passed time becomes an hour from now", () => {
  const now = new Date(2026, 9, 1, 12, 0, 0); // local
  const nextDay = w.dueAtFor({ kind: "at_local", days: 1, time: "10:00" }, now);
  assert.deepEqual([nextDay.getDate(), nextDay.getHours(), nextDay.getMinutes()], [2, 10, 0]);
  const plus2 = w.dueAtFor({ kind: "at_local", days: 2, time: "18:00" }, now);
  assert.deepEqual([plus2.getDate(), plus2.getHours()], [3, 18]);
  assert.equal(w.dueAtFor({ kind: "after", minutes: 60 }, now).getTime(), now.getTime() + H);
  const late = new Date(2026, 9, 1, 21, 0, 0);
  assert.equal(w.dueAtFor({ kind: "at_local", days: 0, time: "20:00" }, late).getTime(), late.getTime() + H);
  const chips = { kind: "chip", chips: { today: { kind: "at_local", days: 0, time: "20:00" }, tomorrow: { kind: "at_local", days: 1, time: "18:00" } } };
  assert.equal(w.dueAtFor(chips, now, "tomorrow").getHours(), 18);
  assert.equal(w.dueAtFor(chips, now), null, "a chip window needs the chip");
  assert.deepEqual(w.chipsOf(chips), ["today", "tomorrow"]);
  assert.equal(w.dueAtFor({ kind: "derived" }, now), null);
});

test("Today card: a tool_outcome choice is a then-vs-now or an urge answer; {toolName} filled", () => {
  assert.deepEqual(card.outcomeAnswer("much_better"), { thenVsNow: "much_better" });
  assert.deepEqual(card.outcomeAnswer("not_yet"), { actedOnUrge: "not_yet" });
  assert.equal(card.outcomeAnswer("maybe"), null);
  assert.equal(card.fillToolName("{toolName}, earlier", "Cool Down"), "Cool Down, earlier");
});

test("Today lives off the check-in screen: side panel (lg+) and the header's Today button, hidden mid check-in", () => {
  const checkIn = readFileSync("src/pages/CheckIn.tsx", "utf8");
  // Not above the square any more (it pushed the square down, Oct 2026).
  assert.doesNotMatch(checkIn, /<TodayStack/);
  // Hidden from the first touch on, so never beside a check-in, a result or the crisis banner (D-09).
  assert.match(checkIn, /useHideToday\(!\(step === 'emotion' && active === 0 && !point\)\);/);
  const layout = readFileSync("src/components/DashboardLayout.tsx", "utf8");
  assert.match(layout, /<TodayProvider>/);
  // One provider pair around the header and the main column, so the header button and the panel share it.
  assert.ok(layout.indexOf("<TodayProvider>") < layout.indexOf("<header"), "TodayProvider wraps the header");
  assert.ok(layout.indexOf("<OppositeActionFollowUpProvider>") < layout.indexOf("<header"), "OA provider wraps the header");
  assert.match(layout, /\{user && !focusedLayout && <TodayButton \/>\}/);
  assert.match(readFileSync("src/components/insights/InsightsSidePanel.tsx", "utf8"), /<TodayPanel \/>/);
  for (const f of ["src/components/today/TodayPanel.tsx", "src/components/today/TodayButton.tsx"]) {
    assert.match(readFileSync(f, "utf8"), /today\.hidden/, `${f} respects useHideToday`);
  }
  // "Did it help?" is answered for exactly the session it shows (F6), through the one card.
  const tc = readFileSync("src/components/today/TodayCard.tsx", "utf8");
  assert.match(tc, /answerToolOutcome\(item\.source!\.toolSessionId!, answer\)/);
  assert.doesNotMatch(tc, /recordToolOutcome/, "F6: never 'the latest unrated' again");
  assert.match(readFileSync("src/pages/tools/ProblemSolve.tsx", "utf8"), /<SessionClose planType="ps_step" \/>/);
});
