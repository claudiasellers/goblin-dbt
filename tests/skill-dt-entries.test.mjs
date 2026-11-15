// DT part 2, the entry points (docs/design/skill-runtime.md, *Page entries*): a skill's `entries` map a page's
// `?enterAt=<key>` to the step a fresh run starts at, so a host opens the right screen (the lid, the hand, the
// willingness entry), and a host's pull rides along as `urgeId`, first on the next tool's list and never selected.
// Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const S = (id) => content.skills.find((s) => s.id === id);
const ctx = (skill, ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs: {}, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const firstIds = (c, s, step) => {
  const f = M.shownFields(c, M.stepOf(c.skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};

test("a page run starts at its entry's step, and at its start for any other key or none", () => {
  const mj = S("mind_job");
  assert.deepEqual(mj.entries, { lid: "lid_pick" });
  assert.equal(M.pageStart(ctx(mj, { enterAt: "lid" })).stepId, "lid_pick");
  assert.deepEqual(M.pageStart(ctx(mj, { enterAt: "lid" })).path, ["lid_pick"]);
  assert.equal(M.pageStart(ctx(mj, { enterAt: "nope" })).stepId, "what");
  assert.equal(M.pageStart(ctx(mj)).stepId, "what");
  // A skill without entries ignores the key (Rewrite the nightmare's resume-only enterAt).
  const nr = S("nightmare_rescript");
  assert.equal(M.pageStart(ctx(nr, { enterAt: "rehearse" })).stepId, nr.start);
});

test("an entry key survives a fresh run's context; a resume-only enterAt is still dropped", () => {
  assert.deepEqual(M.ctxAfterResume({ enterAt: "lid" }, false, S("mind_job").entries), { enterAt: "lid" });
  assert.deepEqual(M.ctxAfterResume({ enterAt: "rehearse" }, false, S("nightmare_rescript").entries), {});
});

test("only skills that accept enterAt have entries, and every entry names a step other than the start", () => {
  for (const s of content.skills) {
    if (!s.entries) continue;
    assert.ok(s.accepts.includes("enterAt"), s.id);
    for (const at of Object.values(s.entries)) {
      assert.ok(s.steps.some((st) => st.id === at) && at !== s.start, `${s.id} ${at}`);
      assert.ok(!M.stepOf(s, at).reopens, `${s.id} ${at} is not a reopens step`);
    }
  }
});

test("the park links open the lid: First, the body's Not right now, Hold to wait's checking, and a Tools intent", () => {
  assert.deepEqual(S("first_body").exits.find((e) => e.id === "mind_job").query, { enterAt: "lid" });
  assert.deepEqual(S("hold_to_wait").exits.find((e) => e.id === "mind_job").query, { enterAt: "lid" });
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /toolId: 'mind-job', query: 'enterAt=lid'/);
  const c = ctx(S("mind_job"), { enterAt: "lid" });
  const s = [pick("lid_pick", "jar"), next].reduce((st, e) => M.runNext(c, st, e), M.pageStart(c));
  assert.equal(s.stepId, "lid_shut");
});

test("a hand on the heart opens Held at where the hands rest; Hold to wait's keeps the crisis banner", () => {
  const held = S("held");
  assert.deepEqual(held.entries, { hand: "where", scan: "scan" });
  const fb = S("first_body");
  assert.deepEqual(fb.exits.find((e) => e.id === "held").query, { enterAt: "hand", frame: "hurt" });
  // Beside the people and the kit when the body didn't quieten twice, after them (people first).
  const offers = M.stepOf(fb, "someone").offers.map((o) => o.exit);
  assert.deepEqual(offers, ["safety_open", "crisis_kit", "held"]);
  assert.deepEqual(S("hold_to_wait").exits.find((e) => e.id === "held").query, { frame: "hurt", enterAt: "hand" });
  const c = ctx(held, { enterAt: "hand", frame: "hurt" });
  const s0 = M.pageStart(c);
  assert.equal(s0.stepId, "where");
  assert.equal(M.crisisFor(c, M.stepOf(held, "where"), s0)?.variant, "crisis", "the banner stays after Hurt myself");
});

test("the willingness entry: what it's about, the danger check still asked, willing, hands, then what's in your hands", () => {
  const lb = S("let_it_be");
  assert.deepEqual(lb.entries, { willingness: "what", turn: "what" });
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /toolId: 'let-it-be', query: 'enterAt=willingness'/);
  const c = ctx(lb, { enterAt: "willingness" });
  const s0 = M.pageStart(c);
  assert.equal(s0.stepId, "what");
  assert.equal(M.copyText(c, M.stepOf(lb, "what").title, s0), lb.copy.what_title_willing);
  // A person- or harm-related thing still asks whether it's still happening.
  let s = [pick("what", "wont_change"), next].reduce((st, e) => M.runNext(c, st, e), s0);
  assert.equal(s.stepId, "still");
  s = [pick("still", "no"), next].reduce((st, e) => M.runNext(c, st, e), s);
  assert.equal(s.stepId, "willing");
  // A limit skips the danger check and goes straight to willing.
  s = [pick("what", "limit"), next].reduce((st, e) => M.runNext(c, st, e), s0);
  assert.equal(s.stepId, "willing");
  s = [pick("willing", "willing"), next].reduce((st, e) => M.runNext(c, st, e), s);
  assert.equal(s.stepId, "hands");
  s = M.runNext(c, s, { type: "embedDone", output: { ids: ["done"], durationSec: 45 } });
  s = M.runNext(c, s, next);
  assert.equal(s.stepId, "hands_still", "no acceptance statement on the willingness path");
});

test("the willingness entry while flooded: the heads-up after what it's about, then on", () => {
  const lb = S("let_it_be");
  const c = ctx(lb, { enterAt: "willingness", band: "flooded" });
  let s = [pick("what", "limit"), next].reduce((st, e) => M.runNext(c, st, e), M.pageStart(c));
  assert.equal(s.stepId, "heads_up");
  s = [pick("heads_up", "anyway"), next].reduce((st, e) => M.runNext(c, st, e), s);
  assert.equal(s.stepId, "willing");
  s = [pick("heads_up", "body"), next].reduce((st, e) => M.runNext(c, st, e), [pick("what", "limit"), next].reduce((st, e) => M.runNext(c, st, e), M.pageStart(c)));
  assert.equal(s.stepId, "settle");
  // Something about a person: the danger check after the heads-up.
  s = [pick("what", "unfair"), next, pick("heads_up", "anyway"), next].reduce((st, e) => M.runNext(c, st, e), M.pageStart(c));
  assert.equal(s.stepId, "still");
});

test("a host's pull rides along: first on the next tool's list, never selected", () => {
  assert.deepEqual(S("hold_to_wait").exits.find((e) => e.id === "urge_surfing").query, { urgeId: "$a.pull" });
  assert.deepEqual(S("hold_to_wait").exits.find((e) => e.id === "habit_plan").query, { urgeId: "$a.pull" });
  assert.deepEqual(S("ride_it_out").exits.find((e) => e.id === "pros_cons").query, { urgeId: "$a.pull" });
  for (const [id, step] of [["ride_it_out", "pull"], ["pros_cons", "pull"], ["habit_plan", "what"]]) {
    const sk = S(id);
    assert.ok(sk.accepts.includes("urgeId"), id);
    const c = ctx(sk, { urgeId: "check" });
    const s0 = M.pageStart(c);
    assert.equal(firstIds(c, s0, step)[0], "check", id);
    assert.equal(s0.answers[step], undefined, `${id}: nothing pre-selected`);
  }
  // The query reads the host's own pick.
  const h = S("hold_to_wait");
  assert.deepEqual(M.exitQuery(ctx(h), h.exits.find((e) => e.id === "urge_surfing"), { answers: { pull: { ids: ["leave"], own: null } } }), { urgeId: "leave" });
  assert.deepEqual(M.exitQuery(ctx(h), h.exits.find((e) => e.id === "urge_surfing"), { answers: { pull: { ids: [], own: "x" } } }), {});
});

test("Help me now carries no band: the kit's flooded filter would hide the person's own kept cards", () => {
  assert.doesNotMatch(readFileSync("src/lib/spine/helpNow.ts", "utf8"), /band/);
});

test("a resumed willingness run keeps its entry key, so it goes on down the willingness path (Codex, #141)", () => {
  const lb = S("let_it_be");
  const c = ctx(lb, { enterAt: "willingness" });
  const s = [pick("what", "limit"), next, pick("willing", "willing"), next].reduce((st, e) => M.runNext(c, st, e), M.pageStart(c));
  assert.equal(s.stepId, "hands");
  const rec = M.runRecord(c, s);
  const back = M.ctxForResume(lb, {}, rec);
  assert.equal(back.enterAt, "willingness");
  const r = M.resumeRun(ctx(lb, back), rec, null);
  const on = [{ type: "embedDone", output: { ids: ["done"], durationSec: 45 } }, next].reduce((st, e) => M.runNext(ctx(lb, back), st, e), r);
  assert.equal(on.stepId, "hands_still", "never the acceptance statement");
  // A resume-only enterAt (Rewrite the nightmare's) still never comes back.
  const nr = S("nightmare_rescript");
  assert.equal(M.ctxForResume(nr, {}, { ctx: { enterAt: "rehearse" } }).enterAt, undefined);
});
