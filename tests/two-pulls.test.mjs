// Two pulls (docs/design/parts.md, "Two pulls (polarities)"): the step machine (src/lib/twoPulls.ts), the
// gate (TWO_PULLS_REQUIRED), the entry (two kept parts, or a rule C trail's More than one), the session
// write (checked with the server's own validators), the keepsake (the client's preview equals what the
// server keeps), the close's check-back and the Wise mind link. Content comes from the real fixture
// (tests/fixtures/parts-content.json), every row approved.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const M = await importTs("src/lib/twoPulls.ts");
const S = await importTs("src/lib/twoPullsSave.ts");
const L = await importTs("src/lib/twoPullsLink.ts");
const T = await importTs("src/data/tools.ts");
const V = await importTs("functions/src/parts/pulls/validation.ts");
const K = await importTs("functions/src/parts/pulls/keepsake.ts");
const C = await importTs("functions/src/parts/candidate.ts");
const PT = await importTs("functions/src/parts/pulls/types.ts");

const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const ALL = partsFromFixture(fixture, () => true);
const SHIPPED = JSON.parse(readFileSync("src/data/content/parts.json", "utf8")).content;
const read = (f) => readFileSync(f, "utf8");

const SID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const LID = "5f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const PA = "4f2c9a0e-1b2c-4d5e-8f90-123456789aaa";
const PB = "4f2c9a0e-1b2c-4d5e-8f90-123456789bbb";
const CHASE = { id: PA, name: "Runner", tender: false, moveIds: ["chase"], shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5] };
const HIDE = { id: PB, name: null, tender: false, moveIds: ["hide"], shapeSig: null };
const PAIR_ENTRY = { kind: "pair", pairId: "chase_hide", offerId: "trail_two_pulls:chase+hide:ctx_event_ignored" };

const CTX = { hasPair: true, blendCheck: true, safetyLine: false };
const optionById = (id) => Object.values(ALL.options).flatMap((s) => Object.values(s).flat()).find((o) => o.id === id);
const ev = (x) => (typeof x === "string" ? { type: "option", option: optionById(x) ?? assert.fail(`no option ${x}`) } : x);
const run = (events, { ctx = CTX, state } = {}) => events.reduce((s, e) => {
  const next = M.pullsNext(s, ev(e), ctx);
  assert.notEqual(next, s, `${JSON.stringify(e)} at ${s.step} did nothing`);
  return next;
}, state ?? M.initialPulls(ctx));
const synth = (o) => ({ type: "option", option: { moves: [], ...o } });

const breath = { type: "breath" };
const TO_STEP_BACK = ["blend_pulls_notice", { type: "place", at: [0.42, 0.61] }, "feel_curious", "feel_steady"];
const TO_WORRY = [...TO_STEP_BACK, breath, breath, { type: "next" }];
const TO_WANT = [...TO_WORRY, "chase_worry_drift", "hide_worry_too_much"];
const HAPPY = [...TO_WANT, "want_not_left", "pulls_keep", { type: "close", choiceId: "better" }];
const P2 = { resumed: true, overridden: false, thenVsNow: "better", primitivesRun: [{ id: "sigh", completed: true, durationSec: 31 }] };

/* ───────── the step machine ───────── */

test("the content: every prompt and option the flow reads by id is in the fixture; the steps are the machine's", () => {
  const prompts = { ...fixture.prompts, ...Object.fromEntries(fixture.keepsake.map((k) => [k.id, k])) };
  for (const id of S.TWO_PULLS_REQUIRED.prompts) assert.ok(prompts[id], `prompt ${id}`);
  for (const id of S.TWO_PULLS_REQUIRED.options) assert.ok(optionById(id), `option ${id}`);
  for (const step of Object.keys(M.PULLS_TRACK)) assert.ok(M.PULLS_STEPS.includes(step), step);
  assert.deepEqual(Object.keys(S.STEP_EXIT).sort(), [...M.PULLS_STEPS].sort());
  for (const exit of Object.values(S.STEP_EXIT)) assert.ok(PT.PULLS_EXIT_STEPS.includes(exit), exit);
  assert.equal(M.STEP_BACK_MAX, V.STEP_BACK_MAX, "the server's cap");
});

test("happy path: blend → place → feel A → feel B → step back ×2 → worry A → worry B → both want → keep → close → done", () => {
  const s = run(HAPPY);
  assert.equal(s.step, "done");
  assert.equal(s.crisis, false);
  assert.deepEqual(s.session.lightAt, [0.42, 0.61]);
  assert.deepEqual([s.session.feelTowardIds, s.session.feelTowardSides], [["feel_curious", "feel_steady"], ["a", "b"]]);
  assert.deepEqual([s.session.stepBackHolds, s.session.steppedBack, s.session.unblended], [2, false, []]);
  assert.deepEqual([s.session.worryA, s.session.worryB, s.session.bothWantId], ["chase_worry_drift", "hide_worry_too_much", "want_not_left"]);
  assert.deepEqual([s.session.kept, s.session.closeId, s.session.stopReason, s.session.blendCheck], [true, "better", "done", "notice"]);
});

test("equal sides: Feel asks A, then B, the same chips; each side's worry is its own step", () => {
  const afterA = run(TO_STEP_BACK.slice(0, 3));
  assert.deepEqual([afterA.step, afterA.session.side], ["feel", "b"]);
  assert.equal(run(TO_STEP_BACK).step, "stepBack");
  assert.equal(run([...TO_WORRY, "chase_worry_drift"]).step, "worryB");
  // Feel's chips: Meet a part's, without "nothing" (its own grounding step) and the same for both sides.
  const feel = S.feelOptions(ALL).map((o) => o.id);
  assert.ok(feel.includes("feel_curious") && feel.includes("feel_annoyed"));
  assert.ok(!feel.includes("feel_nothing"));
});

test("blending check: notice and not sure go on; running things opens P2 (resume → place, later → done)", () => {
  for (const [id, answer] of [["blend_pulls_notice", "notice"], ["blend_pulls_not_sure", "not_sure"]]) {
    const s = run([id]);
    assert.deepEqual([s.step, s.session.blendCheck, s.p2], ["place", answer, null], id);
  }
  const running = run(["blend_pulls_running"]);
  assert.deepEqual([running.step, running.session.blendCheck, running.p2], ["blendBody", "running", { band: "stirred", start: "card" }]);
  const resumed = run([{ type: "p2", outcome: "resume", result: P2 }], { state: running });
  assert.deepEqual([resumed.step, resumed.resumeNote, resumed.p2, resumed.session.handoffs], ["place", true, null, [P2]]);
  const later = run([{ type: "p2", outcome: "later" }], { state: running });
  assert.deepEqual([later.step, later.later, later.session.stopReason, later.session.exitStep], ["blendBody", true, "later", "blend"]);
  const done = run([{ type: "continue" }], { state: later });
  assert.deepEqual([done.step, done.p2, done.session.stopReason], ["done", null, "later"]);
  // P2 already ran on entry: its last two choices only, at the flooded band.
  const ctx = { ...CTX, p2OnEntry: true, p2Band: "flooded" };
  assert.deepEqual(run(["blend_pulls_running"], { ctx }).p2, { band: "flooded", start: "later" });
  // Off: straight to Set them out.
  assert.equal(M.initialPulls({ ...CTX, blendCheck: false }).step, "place");
});

test("feel: a non-Self answer gets one unblend for that side, then the same side again; still non-Self → needs its own time", () => {
  const unblend = run([...TO_STEP_BACK.slice(0, 2), "feel_annoyed"]);
  assert.deepEqual([unblend.step, unblend.session.side, unblend.session.unblended, unblend.session.steppedBack], ["unblend", "a", ["a"], true]);
  for (const id of ["unblend_eased", "unblend_not_sure"]) {
    const again = run([id], { state: unblend });
    assert.deepEqual([again.step, again.session.side], ["feel", "a"], id);
  }
  // Eased, then Self-like: on to B.
  assert.deepEqual([run(["unblend_eased", "feel_curious"], { state: unblend }).session.side], ["b"]);
  // Still non-Self after its unblend (asked again): needs its own time.
  const twice = run(["unblend_eased", "feel_scared"], { state: unblend });
  assert.deepEqual([twice.step, twice.session.needsTimeSide, twice.session.stopReason], ["needsTime", "a", "not_self"]);
  // "Still" at the unblend itself: the same.
  const still = run(["unblend_still"], { state: unblend });
  assert.deepEqual([still.step, still.session.needsTimeSide, still.session.stopReason], ["needsTime", "a", "not_self"]);
  // B has its own unblend, independent of A's.
  const b = run([...TO_STEP_BACK.slice(0, 3), "feel_tired"]);
  assert.deepEqual([b.step, b.session.side, b.session.unblended], ["unblend", "b", ["b"]]);
  // selfLike false is non-Self whatever its branch.
  assert.equal(run([...TO_STEP_BACK.slice(0, 2), synth({ id: "feel_x", branch: "continue", selfLike: false })]).step, "unblend");
  // "Not sure" is not non-Self: on to B.
  assert.equal(run([...TO_STEP_BACK.slice(0, 2), "feel_not_sure"]).session.side, "b");
});

test("needs time: Meet it another time or Not now, then the close; no keepsake", () => {
  const at = run([...TO_STEP_BACK.slice(0, 2), "feel_annoyed", "unblend_still"]);
  const yes = run(["pulls_another_time"], { state: at });
  assert.deepEqual([yes.step, yes.session.anotherTime], ["close", true]);
  const no = run(["pulls_needs_time_not_now"], { state: at });
  assert.deepEqual([no.step, no.session.anotherTime], ["close", false]);
  assert.equal(M.keepsakeOpen(yes), false);
  assert.equal(run([{ type: "close", choiceId: null }], { state: yes }).session.stopReason, "not_self", "the stop reason stays");
});

test("step back: each breath zooms out a step, capped at STEP_BACK_MAX; Next goes on with or without one", () => {
  const at = run(TO_STEP_BACK);
  let s = at;
  for (let i = 0; i < M.STEP_BACK_MAX + 2; i++) s = M.pullsNext(s, breath, CTX);
  assert.equal(s.session.stepBackHolds, M.STEP_BACK_MAX);
  assert.equal(s.step, "stepBack");
  assert.equal(run([{ type: "next" }], { state: at }).step, "worryA", "nothing locks");
});

test("worries: own words take the conservative stop; a tender chip stops; a danger chip goes to the close with crisis alongside", () => {
  const at = run(TO_WORRY);
  const own = run([{ type: "ownWords", text: "  they'd leave  " }], { state: at });
  assert.deepEqual([own.step, own.session.ownWorryA, own.session.stopReason], ["stop", "they'd leave", "own_words"]);
  const ownB = run(["chase_worry_drift", { type: "ownWords", text: "x" }], { state: at });
  assert.deepEqual([ownB.step, ownB.session.ownWorryB, ownB.session.worryA], ["stop", "x", "chase_worry_drift"]);
  // The stop: nothing offers to go further; on to the close by a chip or Continue.
  assert.equal(run(["stop_thank"], { state: own }).step, "close");
  assert.equal(run([{ type: "continue" }], { state: own }).step, "close");
  for (const o of [{ id: "w_t", flag: "tender" }, { id: "w_c", branch: "conservative" }]) {
    const s = run([synth(o)], { state: at });
    assert.deepEqual([s.step, s.session.stopReason], ["stop", "tender"], o.id);
  }
  for (const o of [{ id: "w_d", flag: "danger" }, { id: "w_d2", branch: "danger" }]) {
    const s = run([synth(o)], { state: at });
    assert.deepEqual([s.step, s.session.danger, s.session.stopReason, s.crisis], ["close", true, "danger", true], o.id);
  }
  // "Not sure" goes on.
  assert.equal(run(["pulls_worry_not_sure"], { state: at }).step, "worryB");
  // No pair: worry B goes to the close (no both-want, no keepsake).
  const ctx = { ...CTX, hasPair: false };
  assert.equal(run([...TO_WORRY, "pulls_worry_not_sure", "pulls_worry_not_sure"], { ctx }).step, "close");
  for (const s of [own, ownB]) assert.equal(M.keepsakeOpen(s), false);
});

test("both want → keepsake → close; Not sure skips the keepsake; Not now keeps nothing", () => {
  const at = run(TO_WANT);
  const unsure = run(["pulls_both_want_not_sure"], { state: at });
  assert.deepEqual([unsure.step, unsure.session.bothWantId], ["close", null]);
  const want = run(["want_safe_in_it"], { state: at });
  assert.deepEqual([want.step, want.session.bothWantId, M.keepsakeOpen(want)], ["keepsake", "want_safe_in_it", true]);
  const notNow = run(["pulls_not_now"], { state: want });
  assert.deepEqual([notNow.step, notNow.session.kept], ["close", false]);
  assert.equal(run(["pulls_keep"], { state: want }).session.kept, true);
});

test("a stale tap changes nothing; crisis resources are alongside from the start for a safety-line visit", () => {
  const at = run(TO_STEP_BACK);
  assert.equal(M.pullsNext(at, ev("want_not_left"), CTX), at);
  assert.equal(M.pullsNext(at, { type: "place", at: [0, 0] }, CTX), at);
  const done = run(HAPPY);
  assert.equal(M.pullsNext(done, { type: "close", choiceId: "same" }, CTX), done);
  const ctx = { ...CTX, safetyLine: true };
  assert.equal(M.initialPulls(ctx).crisis, true);
  assert.equal(run(TO_WANT, { ctx }).crisis, true);
  // The light is clamped to the stage.
  assert.deepEqual(run(["blend_pulls_notice", { type: "place", at: [-1, Number.NaN] }]).session.lightAt, [0, 0.5]);
});

/* ───────── the gate ───────── */

test("gate: ready only with every required line and the borrowed steps; today's file says no", () => {
  assert.equal(S.twoPullsReady(SHIPPED), false, "nothing signed off yet");
  assert.equal(S.twoPullsReady(ALL), true, "the whole fixture approved");
  for (const id of [...S.TWO_PULLS_REQUIRED.prompts, ...S.TWO_PULLS_REQUIRED.options]) {
    assert.equal(S.twoPullsReady(partsFromFixture(fixture, (x) => x !== id)), false, `without ${id}`);
  }
  const feel = fixture.options.meet.feel;
  assert.equal(S.twoPullsReady(partsFromFixture(fixture, (x) => !feel.some((o) => o.id === x && o.selfLike === true))), false, "no Self-like chip");
  assert.equal(S.twoPullsReady(partsFromFixture(fixture, (x) => !feel.some((o) => o.id === x && o.branch === "unblend"))), false, "no non-Self chip");
  for (const [flow, step] of S.PULLS_OPTION_STEPS) {
    const ids = new Set(fixture.options[flow][step].map((o) => o.id));
    assert.equal(S.twoPullsReady(partsFromFixture(fixture, (x) => !ids.has(x))), false, `${flow}/${step}`);
  }
  // Optional lines don't gate the visit.
  for (const id of [S.PULLS_WISE_MIND, S.PULLS_CHECKBACK_PROMPT]) assert.equal(S.twoPullsReady(partsFromFixture(fixture, (x) => x !== id)), true, id);
});

test("hidden tool behind the gate: registered, never listed, lazy, gated like Meet a part", () => {
  const tool = T.getToolById("two-pulls");
  assert.deepEqual([tool.name, tool.module, tool.listed, tool.bare], ["Two pulls", "mindfulness", false, true]);
  assert.ok(!T.listedTools().some((t) => t.id === "two-pulls"));
  assert.ok(!T.intents.some((i) => i.toolId === "two-pulls"));
  const page = read("src/pages/ToolPage.tsx");
  assert.match(page, /'two-pulls': TwoPulls,/);
  assert.match(page, /const loadTwoPulls = \(\) => import\('\.\/tools\/TwoPulls'\);/);
  const gate = read("src/hooks/useToolGate.ts");
  assert.match(gate, /'two-pulls': \(\) => import\('\.\.\/services\/twoPulls'\)\.then\(\(m\) => m\.loadTwoPullsContent\(\)\)\.then\(\(c\) => c !== null\)/);
  const svc = read("src/services/twoPulls.ts");
  assert.match(svc, /twoPullsReady\(parts\) \? parts : null/);
});

/* ───────── the entry ───────── */

test("entry: ?a=&b= two kept parts, or ?pair= with the offer it came from; anything else is no entry", () => {
  assert.deepEqual(S.parsePullsEntry(`?a=${PA}&b=${PB}`), { kind: "parts", aId: PA, bId: PB });
  assert.deepEqual(S.parsePullsEntry(`?pair=chase_hide&offer=${encodeURIComponent(PAIR_ENTRY.offerId)}`), PAIR_ENTRY);
  assert.deepEqual(S.parsePullsEntry("?pair=chase_hide"), { kind: "pair", pairId: "chase_hide", offerId: null });
  assert.deepEqual(S.parsePullsEntry("?pair=chase_hide&offer=nope"), { kind: "pair", pairId: "chase_hide", offerId: null });
  for (const bad of ["", "?a=x&b=y", `?a=${PA}&b=${PA}`, `?a=${PA}`, `?pair=chase_hide&a=${PA}`, "?pair=Chase Hide"]) {
    assert.equal(S.parsePullsEntry(bad), null, bad);
  }
  // The links round-trip.
  for (const e of [{ kind: "parts", aId: PA, bId: PB }, PAIR_ENTRY, { kind: "pair", pairId: "chase_hide", offerId: null }]) {
    const path = L.twoPullsPath(e);
    assert.ok(path.startsWith("/tool/two-pulls?"), path);
    assert.deepEqual(S.parsePullsEntry(path.slice(path.indexOf("?"))), e);
  }
});

test("the C-trail entry: a rule C trail's More than one opens Two pulls on its pair, never the split", () => {
  assert.equal(L.opensTwoPulls({ shape: "C" }), true);
  for (const t of [{ shape: "A" }, { shape: "B" }, null, undefined]) assert.equal(L.opensTwoPulls(t), false);
  assert.equal(fixture.trailRules.find((t) => t.id === "trail_two_pulls").shape, "C");
  const card = read("src/components/parts/TrailOfferCard.tsx");
  assert.match(card, /if \(a === 'more_than_one' && !opensTwoPulls\(item\.trail\)\) \{ setSplitting\(true\); return; \}/);
  assert.match(card, /res\.next === 'two_pulls' && res\.pairId/);
  assert.match(card, /navigate\(twoPullsPath\(\{ kind: 'pair', pairId: res\.pairId, offerId: item\.id \}\)\)/);
  assert.match(card, /const canSplit = opensTwoPulls\(item\.trail\) \|\|/);
  // The client's answer type carries the hand-off.
  assert.match(read("src/data/partsTypes.ts"), /next: 'meet' \| 'candidates' \| 'two_pulls' \| 'none'/);
});

test("the visit: kept parts follow a shipped pair's order; no pair → each part's first move; a pair alone → its moves", () => {
  const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, HIDE]);
  assert.deepEqual([v.pair.id, v.a.part.id, v.b.part.id, v.a.move, v.b.move], ["chase_hide", PA, PB, "chase", "hide"]);
  assert.deepEqual([v.a.name, v.a.own, v.b.name, v.b.own], ["Runner", true, "the part that wants to hide", false]);
  // Swapped in the address: the pair's order wins, and the entry follows it.
  const sw = S.resolveVisit(ALL, { kind: "parts", aId: PB, bId: PA }, [CHASE, HIDE]);
  assert.deepEqual([sw.entry, sw.a.part.id, sw.b.part.id], [{ kind: "parts", aId: PA, bId: PB }, PA, PB]);
  // No shipped pair: the route's order, each part's first move.
  const watch = { ...HIDE, moveIds: ["keep_watch"] };
  const np = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, watch]);
  assert.deepEqual([np.pair, np.a.move, np.b.move], [null, "chase", "keep_watch"]);
  // A pair alone: both sides generated.
  const pv = S.resolveVisit(ALL, PAIR_ENTRY, []);
  assert.deepEqual([pv.a.part, pv.b.part, pv.a.name, pv.b.name], [null, null, "the part that wants to chase this down", "the part that wants to hide"]);
  // Can't be said: nothing.
  assert.equal(S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE]), null, "a part not kept");
  assert.equal(S.resolveVisit(ALL, { kind: "pair", pairId: "nope", offerId: null }, []), null, "unknown pair");
  assert.equal(S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, { ...HIDE, moveIds: ["chase"] }]), null, "one move for both");
  // Context: a pair; a safety-line move or part puts crisis resources alongside.
  assert.deepEqual(S.pullsContext(ALL, v, false), { hasPair: true, blendCheck: true, safetyLine: false });
  assert.equal(S.pullsContext(ALL, np, false).hasPair, false);
  assert.equal(S.pullsContext(ALL, { ...v, a: { ...v.a, part: { ...CHASE, safety: true } } }, false).safetyLine, true);
  const safe = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, { ...HIDE, moveIds: ["turn_on_myself"] }]);
  assert.equal(S.pullsContext(ALL, safe, false).safetyLine, true);
  assert.deepEqual(S.pullsContext(ALL, v, true), { hasPair: true, blendCheck: true, safetyLine: false, p2OnEntry: true, p2Band: "flooded" });
});

test("each side's worry chips are its own; what both want is the pair's; no pair → Not sure alone", () => {
  const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, HIDE]);
  assert.deepEqual(S.worryOptions(ALL, v, "a").map((o) => o.id), ["chase_worry_drift", "chase_worry_nobody_knows", "pulls_worry_not_sure"]);
  assert.deepEqual(S.worryOptions(ALL, v, "b").map((o) => o.id), ["hide_worry_too_much", "hide_worry_hurt_worse", "pulls_worry_not_sure"]);
  assert.deepEqual(S.bothWantOptions(ALL, v).map((o) => o.id), ["want_not_left", "want_safe_in_it", "want_matter_someone", "pulls_both_want_not_sure"]);
  const np = { ...v, pair: null };
  assert.deepEqual(S.worryOptions(ALL, np, "a").map((o) => o.id), ["pulls_worry_not_sure"]);
  assert.equal(S.worryPrompt(ALL, v, "a"), "If the part that wants to hide gets its way, what's Runner afraid of?");
  assert.equal(S.worryPrompt(ALL, v, "b"), "If Runner gets its way, what's the part that wants to hide afraid of?");
});

/* ───────── the session write ───────── */

test("the session write: the start request and every save along a visit pass the server's validators", () => {
  const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, HIDE]);
  assert.deepEqual(V.validateStartPulls(S.startRequest(SID, v)),
    { id: SID, aId: PA, bId: PB, pairId: "chase_hide", offerId: null, moveA: "chase", moveB: "hide" });
  const pv = S.resolveVisit(ALL, PAIR_ENTRY, []);
  assert.deepEqual(V.validateStartPulls(S.startRequest(SID, pv)),
    { id: SID, aId: null, bId: null, pairId: "chase_hide", offerId: PAIR_ENTRY.offerId, moveA: "chase", moveB: "hide" });
  const np = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, { ...HIDE, moveIds: ["keep_watch"] }]);
  assert.equal(V.validateStartPulls(S.startRequest(SID, np)).pairId, null);

  // Every visit's every state, as the page saves it (P2 on entry carried as an extra hand-off).
  const visits = [
    HAPPY,
    ["blend_pulls_running", { type: "p2", outcome: "resume", result: P2 }, { type: "place", at: [0.5, 0.5] }, "feel_annoyed", "unblend_eased",
      "feel_scared", "pulls_another_time", { type: "close", choiceId: null }],
    [...TO_WORRY, "chase_worry_drift", { type: "ownWords", text: "they'd leave" }, { type: "continue" }, { type: "close", choiceId: "same" }],
    [...TO_WANT, "pulls_both_want_not_sure", { type: "close", choiceId: null }],
    ["blend_pulls_running", { type: "p2", outcome: "later" }, { type: "continue" }],
  ];
  for (const events of visits) {
    let s = M.initialPulls(CTX);
    for (const e of events) {
      s = M.pullsNext(s, ev(e), CTX);
      const patch = S.toPatch(s, [P2]);
      assert.doesNotThrow(() => V.validateSavePulls({ id: SID, patch, final: s.step === "done" }), `${s.step}: ${JSON.stringify(patch)}`);
    }
  }
  const done = S.toPatch(run(HAPPY));
  assert.deepEqual(done, {
    steppedBack: false, stepBackHolds: 2, lightAt: [0.42, 0.61], feelTowardIds: ["feel_curious", "feel_steady"], feelTowardSides: ["a", "b"],
    blendCheck: "notice", worryA: "chase_worry_drift", worryB: "hide_worry_too_much", bothWantId: "want_not_left", stopReason: "done", exitStep: "close",
  });
  const later = run(["blend_pulls_running", { type: "p2", outcome: "later" }]);
  assert.deepEqual([S.toPatch(later).stopReason, S.toPatch(later).exitStep], ["later", "blend"]);
  const own = S.toPatch(run([...TO_WORRY, { type: "ownWords", text: "mine" }]));
  assert.deepEqual([own.ownWorryA, own.stopReason, own.exitStep], ["mine", "own_words", "stop"]);
  assert.doesNotThrow(() => V.validateSavePulls({ id: SID, patch: S.entryLaterPatch([P2]), final: true }));
  assert.deepEqual(S.entryLaterPatch([]), { stopReason: "later", exitStep: "entry" });
});

test("the page saves in order: opened once, one save per change, final at done, through the queue", () => {
  const page = read("src/pages/tools/TwoPulls.tsx");
  assert.match(page, /started\.current = startPullsSession\(startRequest\(psId, visit\)\)/);
  assert.match(page, /if \(await started\.current\) await savePullsSession\(\{ id: psId, patch, \.\.\.\(final \? \{ final \} : \{\}\) \}\)/);
  assert.match(page, /save\(toPatch\(st, extra\), st\.step === 'done'\);/);
  assert.match(page, /if \(await started\.current\) await queuePartCandidate\(cand\)/);
});

test("Meet it another time: a pair's side queues a candidate (origin two_pulls); a kept part's side links to Meet a part", () => {
  const pv = S.resolveVisit(ALL, PAIR_ENTRY, []);
  const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, HIDE]);
  const at = run([...TO_STEP_BACK.slice(0, 3), "feel_annoyed", "unblend_still", "pulls_another_time"]);
  const req = S.candidateRequest(at, pv, LID);
  assert.deepEqual(req, { id: LID, origin: "two_pulls", moveIds: ["hide"] });
  assert.doesNotThrow(() => C.validateCandidate(req));
  assert.equal(S.candidateRequest(at, v, LID), null, "a kept part: no candidate");
  assert.deepEqual(S.meetLinkFor(at, v), { partId: PB, moveId: "hide" });
  assert.equal(S.meetLinkFor(at, pv), null);
  const notNow = run([...TO_STEP_BACK.slice(0, 3), "feel_annoyed", "unblend_still", "pulls_needs_time_not_now"]);
  assert.equal(S.candidateRequest(notNow, pv, LID), null, "Not now: nothing queued");
});

/* ───────── the keepsake ───────── */

test("the keepsake: the client's lines are exactly what keepPullsKeepsake keeps", () => {
  const copy = Object.fromEntries(fixture.keepsake.map((k) => [k.id, k.copy]));
  const pairName = fixture.prompts.pulls_pair_name.copy;
  const phrase = (m) => fixture.moves.find((x) => x.id === m).unblendPhrase;
  const want = "not to be left";
  const cases = [
    [[CHASE, HIDE], { kind: "parts", aId: PA, bId: PB }],
    [[{ ...CHASE, name: null }, { ...HIDE, name: "the quiet one" }], { kind: "parts", aId: PA, bId: PB }],
    [[], PAIR_ENTRY],
  ];
  for (const [known, entry] of cases) {
    const v = S.resolveVisit(ALL, entry, known);
    const lines = S.keepsakeLines(ALL, v, want);
    const side = (s) => K.sideName({ name: s.part?.name ?? null, found: true, unblendPhrase: phrase(s.move) }, pairName);
    assert.equal(S.keepsakeText(lines), K.keepsakeText(copy, side(v.a), side(v.b), want), JSON.stringify(entry));
  }
  const pv = S.resolveVisit(ALL, PAIR_ENTRY, []);
  assert.deepEqual(S.keepsakeLines(ALL, pv, want), [
    "The part that wants to chase this down and the part that wants to hide both want me not to be left.",
    "I can hear both of them, and choose what I do next.",
  ]);
  assert.equal(S.keepsakeLines(partsFromFixture(fixture, (x) => x !== "keepsake_choose"), pv, want), null);
  // The server never keeps a keepsake after a stop.
  assert.match(read("functions/src/parts/pulls/keepsake.ts"), /const NO_KEEPSAKE[^=]*= \['own_words', 'tender', 'danger', 'not_self'\]/);
});

test("the keepsake save: Keep this calls keepPullsKeepsake once the visit is open, with a retry; the request validates", () => {
  assert.deepEqual(V.validateKeepsake({ sessionId: SID, lineId: LID }), { sessionId: SID, lineId: LID });
  const page = read("src/pages/tools/TwoPulls.tsx");
  assert.match(page, /if \(keep === 'saving' \|\| keep === 'saved'\) return;/, "once");
  assert.match(page, /if \(!\(await started\.current\)\) throw new Error\('not opened'\);\s*await keepPullsKeepsake\(\{ sessionId: psId, lineId \}\);\s*setKeep\('saved'\);/);
  assert.match(page, /catch \{ setKeep\('failed'\); \}/);
  assert.match(page, /Couldn&apos;t save that\. <button type="button" className=\{linkButton\} onClick=\{keepIt\}>Try again<\/button>/);
  assert.match(page, /if \(o\?\.branch === 'keep' && keepsakeOpen\(st\)\) keepIt\(\);/);
});

/* ───────── the close ───────── */

test("the close's check-back: two kept parts, the visit open, the type enabled and the copy shipped", () => {
  const type = { id: "two_pulls_checkback", enabled: true, window: { kind: "at_local", days: 7, time: "10:00" } };
  const spine = JSON.parse(read("src/data/content/spine.json")).content ?? JSON.parse(read("src/data/content/spine.json"));
  const shippedType = (spine.followUpTypes ?? []).find((t) => t.id === "two_pulls_checkback");
  assert.ok(shippedType, "the follow-up type ships in spine.json");
  assert.deepEqual(shippedType.window, type.window);
  const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, HIDE]);
  const pv = S.resolveVisit(ALL, PAIR_ENTRY, []);
  const done = run(HAPPY);
  const o = { content: ALL, type, opened: true };
  assert.equal(S.offerCheckback(done, v, o), true);
  assert.equal(S.offerCheckback(done, pv, o), false, "a pair alone");
  assert.equal(S.offerCheckback(run(TO_WANT), v, o), false, "not at the close yet");
  assert.equal(S.offerCheckback(done, v, { ...o, opened: false }), false);
  assert.equal(S.offerCheckback(done, v, { ...o, type: { ...type, enabled: false } }), false);
  assert.equal(S.offerCheckback(done, v, { ...o, type: null }), false);
  assert.equal(S.offerCheckback(done, v, { ...o, content: partsFromFixture(fixture, (x) => x !== S.PULLS_CHECKBACK_YES) }), false);
  const later = run(["blend_pulls_running", { type: "p2", outcome: "later" }, { type: "continue" }]);
  assert.equal(S.offerCheckback(later, v, o), false, "after P2's later");
  const danger = run([...TO_WORRY, synth({ id: "w_d", flag: "danger" }), { type: "close", choiceId: null }]);
  assert.equal(S.offerCheckback(danger, v, o), false, "after danger");
  const now = new Date("2026-10-17T09:00:00Z");
  const req = S.checkbackRequest(type, LID, SID, now);
  assert.ok(new Date(req.dueAt) > new Date(now.getTime() + 6 * 864e5), req.dueAt);
  assert.doesNotThrow(() => V.validatePullsCheckback(req, now));
});

test("Ask wise mind what's next: after the keepsake's answer, only when Wise mind is a tool and its line ships", () => {
  const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, [CHASE, HIDE]);
  const pv = S.resolveVisit(ALL, PAIR_ENTRY, []);
  const want = run([...TO_WANT, "want_not_left"]);
  const kept = run(["pulls_keep"], { state: want });
  const notNow = run(["pulls_not_now"], { state: want });
  const label = fixture.prompts.pulls_wise_mind.copy;
  assert.equal(S.wiseMindLink(ALL, v, want, true), null, "not answered yet");
  assert.deepEqual(S.wiseMindLink(ALL, v, kept, true), { to: `/tool/wise-mind?a=${PA}&b=${PB}`, label });
  assert.deepEqual(S.wiseMindLink(ALL, pv, notNow, true), { to: "/tool/wise-mind", label });
  assert.equal(S.wiseMindLink(ALL, v, kept, false), null, "no Wise mind tool");
  assert.equal(S.wiseMindLink(partsFromFixture(fixture, (x) => x !== S.PULLS_WISE_MIND), v, kept, true), null, "line not shipped");
  assert.match(read("src/pages/tools/TwoPulls.tsx"), /getToolById\('wise-mind'\)/);
});

/* ───────── mirrors ───────── */

test("mirrors: the server's pulls types are in src/data/partsTypes.ts; the services call the deployed names", () => {
  const server = read("functions/src/parts/pulls/types.ts");
  const client = read("src/data/partsTypes.ts");
  const names = [...server.matchAll(/^export (?:interface|type|const) (\w+)/gm)].map((m) => m[1]);
  assert.ok(names.length >= 10, names.join());
  for (const n of names) assert.match(client, new RegExp(`^export (?:interface|type|const) ${n}\\b`, "m"), n);
  assert.match(client, /export type PullsStopReason = 'not_self' \| 'own_words' \| 'tender' \| 'danger' \| 'later' \| 'done';/);
  const svc = read("src/services/parts.ts");
  const index = read("functions/src/index.ts");
  for (const fn of ["startPullsSession", "savePullsSession", "keepPullsKeepsake", "schedulePullsCheckback"]) {
    assert.match(svc, new RegExp(`httpsCallable<\\w+, \\w+>\\(functions, '${fn}'\\)`), fn);
    assert.match(index, new RegExp(`\\b${fn}\\b`), `${fn} deployed`);
  }
  assert.equal(S.TWO_PULLS_TOOL, "two-pulls");
  assert.equal(S.TWO_PULLS_CHECKBACK_TYPE, "two_pulls_checkback");
});
