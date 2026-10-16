// Meet a part's step machine (src/lib/meetAPart.ts; docs/design/parts.md "Meet a part", Branches, What's
// saved; "The flood signal" for the blending check). The safety branches are decided here once for the
// harness and the app: the conservative stop, danger, the tender path, "never certify Self". Option
// branches and flags come from the real content (tests/fixtures/parts-content.json).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/meetAPart.ts");
const { initialMeet, meetNext, whatToSave, firstStep, MEET_STEPS, MEET_OPTION_STEP, MEET_PROMPTS, OWN_WORDS_STEPS } = M;
const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));

const SAFETY = fixture.moves.filter((m) => m.safetyLine).map((m) => m.id);
const ctxOf = (over = {}) => ({ safetyLineMoves: SAFETY, maxNonSelfAnswers: fixture.policy.maxNonSelfAnswers, namedEntry: false, blendCheck: true, ...over });
const CTX = ctxOf();

/** The step's options for a move, as the content serves them (an option with no moves is for any move). */
const optionsAt = (step, move) => {
  const [flow, sub] = MEET_OPTION_STEP[step] ?? [];
  return (fixture.options[flow]?.[sub] ?? []).filter((o) => o.moves.length === 0 || o.moves.includes(move));
};
const optionById = (id) => Object.values(fixture.options).flatMap((s) => Object.values(s).flat()).find((o) => o.id === id);
/** Events by shorthand: an option id, or an event object. */
const ev = (x) => (typeof x === "string" ? { type: "option", option: optionById(x) ?? assert.fail(`no option ${x}`) } : x);
const run = (events, { ctx = CTX, move = "hide", state } = {}) =>
  events.reduce((s, e) => {
    const next = meetNext(s, ev(e), ctx);
    assert.notEqual(next, s, `${JSON.stringify(e)} at ${s.step} did nothing`);
    return next;
  }, state ?? initialMeet(ctx, { move }));

const SHAPE = Array.from({ length: 5 }, () => ({ type: "shape", shape: [0.1, 0.2, 0.3, 0.4, 0.5] }));
const TO_FEEL = ["find_something_else", { type: "find" }, "blend_notice", { type: "place", place: "chest" }, ...SHAPE, "age_now", "hide_voice_see"];
const TO_FEAR = [...TO_FEEL, "feel_curious", "hide_job_out_of_sight", "likes_tired", { type: "hurt", hurtId: "left_out" }];
const hold = { type: "hold" };

test("the content: every step's prompts and options exist, and own words are offered where the machine takes them", () => {
  for (const [step, ids] of Object.entries(MEET_PROMPTS)) for (const id of ids) assert.ok(fixture.prompts[id], `${step}: prompt ${id}`);
  for (const [step, [flow, sub]] of Object.entries(MEET_OPTION_STEP)) assert.ok(fixture.options[flow]?.[sub]?.length, `${step}: options ${flow}/${sub}`);
  assert.ok(fixture.options.meet.any.some((o) => o.id === "own_words"));
  assert.deepEqual([...OWN_WORDS_STEPS], ["voice", "job", "fear"]);
  for (const step of [...Object.keys(MEET_OPTION_STEP), ...Object.keys(MEET_PROMPTS)]) assert.ok(MEET_STEPS.includes(step), step);
});

test("happy path: find → blend → where → shape ×5 → age → voice → feel → job → likes → guards → fear → update → thanks → rather → name → keep → close → done", () => {
  const s = run([...TO_FEAR, "hide_fear_too_much", "update_yes", hold, "hide_rather_break", { type: "name", name: " the one who hides " }, "keep_yes", { type: "close", choiceId: "better" }]);
  assert.equal(s.step, "done");
  assert.equal(s.crisis, false);
  const save = whatToSave(s);
  assert.deepEqual(save.keep, {
    partId: null, name: "the one who hides", tender: false, shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5], places: ["chest"], ageId: "age_now",
    voiceIds: ["hide_voice_see"], ownVoice: null, jobIds: ["hide_job_out_of_sight"], ownJob: null, fearIds: ["hide_fear_too_much"], ownFear: null,
    preferredRoleIds: ["hide_rather_break"], uses: ["hide"], guards: ["left_out"],
  });
  assert.deepEqual(save.followUp, { type: "part_checkback", due: "tomorrow" });
  assert.deepEqual(save.toolSession, { toolId: "meet-a-part", closeKind: "orienting", thenVsNow: "better" });
  assert.equal(save.candidate, null);
  assert.equal(save.partSession.blendCheck, "notice");
  assert.deepEqual(save.partSession.feelTowardIds, ["feel_curious"]);
  assert.equal(save.partSession.findId, "find_something_else");
});

test("first step: Find, then the blending check; first when the entry named the part; ?blend=0 skips it", () => {
  assert.equal(firstStep(CTX), "find");
  assert.equal(firstStep(ctxOf({ namedEntry: true })), "blend");
  assert.equal(firstStep(ctxOf({ namedEntry: true, blendCheck: false })), "where");
  assert.equal(run([{ type: "find" }]).step, "blend");
  assert.equal(run([{ type: "find" }], { ctx: ctxOf({ blendCheck: false }) }).step, "where");
  // A known part picked at Find brings its move; "start from another move" stays on Find.
  const s = run([{ type: "setMove", move: "chase" }]);
  assert.deepEqual([s.step, s.session.move], ["find", "chase"]);
  assert.equal(run([{ type: "find", move: "keep_watch", partId: "p1" }]).session.partId, "p1");
});

test("blending check: notice and not sure go on to Where; neither is ever asked again", () => {
  for (const [id, answer] of [["blend_notice", "notice"], ["blend_not_sure", "not_sure"]]) {
    const s = run([{ type: "find" }, id]);
    assert.deepEqual([s.step, s.session.blendCheck, s.p2], ["where", answer, null], id);
  }
});

test("blending check: running → P2 (card, stirred) → Where on resume (with the note) or keep going; never asked again", () => {
  const atP2 = run([{ type: "find" }, "blend_running"]);
  assert.deepEqual([atP2.step, atP2.p2], ["blendBody", { band: "stirred", start: "card" }]);
  const result = { resumed: true, overridden: false, thenVsNow: "better", primitivesRun: [{ id: "sigh", completed: true, durationSec: 40 }] };
  const resumed = run([{ type: "p2", outcome: "resume", result }], { state: atP2 });
  assert.deepEqual([resumed.step, resumed.resumeNote, resumed.p2], ["where", true, null]);
  assert.deepEqual(resumed.session.handoffs, [result]);
  assert.equal(run([{ type: "place", place: null }], { state: resumed }).resumeNote, false, "the note lasts one screen");
  const over = run([{ type: "p2", outcome: "override" }], { state: atP2 });
  assert.deepEqual([over.step, over.resumeNote], ["where", false]);
  // On to the end: the blending check never comes back.
  let s = over;
  const seen = new Set();
  for (const e of [{ type: "place", place: "gut" }, ...SHAPE, "age_now", "hide_voice_see", "feel_open", "hide_job_worse", "likes_proud", "guards_not_sure", "hide_fear_regret", "update_not_sure", hold, "rather_not_sure", "name_not_yet", "keep_not_now", { type: "close", choiceId: null }]) {
    s = meetNext(s, ev(e), CTX);
    seen.add(s.step);
  }
  assert.equal(s.step, "done");
  assert.ok(!seen.has("blend") && !seen.has("blendBody"));
  // A stored flood signal: flooded band; P2 already ran on entry, so only its last two choices.
  assert.deepEqual(run([{ type: "find" }, "blend_running"], { ctx: ctxOf({ p2Band: "flooded", p2OnEntry: true }) }).p2, { band: "flooded", start: "later" });
});

test("blending check: come back later ends at done with no orienting close, exitStep 'blend', the P2 result kept", () => {
  const result = { resumed: false, overridden: false, thenVsNow: "same", primitivesRun: [], deferredFollowUpId: "fu1" };
  const later = run([{ type: "find" }, "blend_running", { type: "p2", outcome: "later", result }]);
  assert.deepEqual([later.step, later.later], ["blendBody", true], "P2's own 'Saved for later' stays until the person goes on");
  assert.equal(meetNext(later, { type: "p2", outcome: "resume" }, CTX), later, "no second P2 outcome");
  const done = run([{ type: "continue" }], { state: later });
  assert.equal(done.step, "done");
  const save = whatToSave(done);
  assert.ok(!("thenVsNow" in save.toolSession), "nobody was asked: no then-vs-now at all");
  assert.equal(save.partSession.exitStep, "blend");
  assert.deepEqual(save.partSession.handoffs, [result]);
  assert.equal(save.partSession.blendCheck, "running");
  assert.equal(save.keep, null);
});

test("feel toward: Self-like and not sure go on, never certifying Self; non-Self → 4b at most maxNonSelfAnswers times", () => {
  for (const id of ["feel_curious", "feel_steady", "feel_warm", "feel_open", "feel_not_sure"]) assert.equal(run([...TO_FEEL, id]).step, "job", id);
  // "Not sure" at 4b doesn't count as stepping back, and "not sure" at 4 goes on: it never ends anything.
  const s = run([...TO_FEEL, "feel_annoyed", "unblend_not_sure"]);
  assert.deepEqual([s.step, s.session.steppedBack], ["feel", 1]);
  assert.equal(run(["feel_not_sure"], { state: s }).step, "job");
  // annoyed → 4b → eased → feel again → scared: the second non-Self answer is enough for today.
  const twice = run([...TO_FEEL, "feel_annoyed", "unblend_eased", "feel_scared"]);
  assert.equal(twice.step, "unblendEnd");
  assert.equal(twice.session.steppedBack, 2);
  assert.deepEqual(twice.session.feelTowardIds, ["feel_annoyed", "feel_scared"], "in the order asked");
  // "It's still here" counts as the second.
  assert.equal(run([...TO_FEEL, "feel_tired", "unblend_still"]).step, "unblendEnd");
  assert.equal(run([...TO_FEEL, "feel_tired"], { ctx: ctxOf({ maxNonSelfAnswers: 3 }) }).session.steppedBack, 1);
});

test("unblendEnd: the worried part counts; a yes records only the candidate intent, then close", () => {
  const yes = run([...TO_FEEL, "feel_gone", "unblend_still", "later_yes"]);
  assert.deepEqual([yes.step, yes.session.stopReason], ["close", "worried_part"]);
  const save = whatToSave(run([{ type: "close", choiceId: null }], { state: yes }));
  assert.deepEqual(save.candidate, { origin: "worried_part", moveIds: ["hide"] });
  assert.equal(save.keep, null);
  assert.equal(whatToSave(run([...TO_FEEL, "feel_gone", "unblend_still", "later_no"])).candidate, null);
});

test("nothing at 4: the grounding screen, never called a part: grounding or the body, then thanks and close", () => {
  const at = run([...TO_FEEL, "feel_nothing"]);
  assert.deepEqual([at.step, at.session.stopReason], ["nothing", "nothing"]);
  const look = run(["nothing_look"], { state: at });
  assert.deepEqual([look.step, look.aside], ["thank", "grounding"]);
  assert.equal(run([hold], { state: look }).step, "close", "no name, no keep: it was never called a part");
  assert.equal(run(["nothing_body"], { state: at }).aside, "body");
  assert.equal(run(["nothing_finish"], { state: at }).step, "close");
});

test("fear: a tender chip or any own words → the conservative screen, skipping 7 and 8b; own words never read", () => {
  for (const id of ["fear_old_hurt", "fear_cant_handle"]) {
    const s = run([...TO_FEAR, id]);
    assert.deepEqual([s.step, s.session.stopReason], ["stop", "tender"], id);
  }
  for (const text of ["I'd feel the old hurt", "nothing really, it's fine", "ok"]) {
    const s = run([...TO_FEAR, { type: "ownWords", text }]);
    assert.deepEqual([s.step, s.session.stopReason, s.session.ownFear], ["stop", "own_words", text], text);
  }
  const stop = run([...TO_FEAR, "fear_old_hurt"]);
  const thanked = run(["stop_thank", hold], { state: stop });
  assert.equal(thanked.step, "name", "no Update (7), no Would rather (8b)");
  const body = run(["stop_body"], { state: stop });
  assert.deepEqual([body.step, body.aside], ["thank", "body"]);
  // The conservative branch never offers to go further: from stop, no step 7 or 8b is reachable.
  const reach = reachable(stop, CTX);
  assert.ok(!reach.has("update") && !reach.has("canNow") && !reach.has("rather"), [...reach].join(" "));
});

test("danger: a danger fear, or own words at voice / job on a safety-line move → thanks and close, crisis alongside", () => {
  assert.deepEqual(SAFETY, ["turn_on_myself"]);
  const toFearTurn = ["find_something_else", { type: "find", move: "turn_on_myself" }, "blend_notice", { type: "place", place: null }, ...SHAPE,
    "age_teen", "turn_voice_always", "feel_open", "turn_job_not_again", "likes_not_sure", "guards_not_sure"];
  const danger = run([...toFearTurn, "turn_fear_hurt_myself"], { move: "hide" });
  assert.deepEqual([danger.step, danger.session.danger, danger.crisis], ["thank", true, true]);
  assert.equal(run([hold], { state: danger }).step, "close");
  for (const at of ["voice", "job"]) {
    const upTo = at === "voice" ? toFearTurn.slice(0, toFearTurn.indexOf("turn_voice_always")) : toFearTurn.slice(0, toFearTurn.indexOf("turn_job_not_again"));
    const s = run([...upTo, { type: "ownWords", text: "whatever" }]);
    assert.deepEqual([s.step, s.session.danger, s.crisis], ["thank", true, true], at);
    assert.equal(run([hold], { state: s }).step, "close", at);
  }
  // On a move without a safety line, own words at voice / job go on.
  assert.equal(run([...TO_FEEL.slice(0, -1), { type: "ownWords", text: "Don't" }]).step, "feel");
  assert.equal(run([...TO_FEEL.slice(0, -1), { type: "ownWords", text: "Don't" }]).session.danger, false);
});

test("a safety-line move: crisis resources alongside throughout; never 7 or 8b on its own", () => {
  const s0 = initialMeet(CTX, { move: "turn_on_myself" });
  assert.equal(s0.crisis, true);
  const toFear = [{ type: "find" }, "blend_notice", { type: "place", place: "head" }, ...SHAPE, "age_older", "turn_voice_my_fault", "feel_steady",
    "turn_job_get_there_first", "likes_proud", { type: "hurt", hurtId: "not_mattering" }];
  const fear = run([...toFear, "turn_fear_careless"], { move: "turn_on_myself" });
  assert.equal(fear.step, "thank", "no Update");
  assert.equal(run([hold], { state: fear }).step, "name", "no Would rather");
  assert.equal(fear.crisis, true);
});

test("the tender path: 'little' accepted at 3b replaces 3c–8b with the presence hold", () => {
  const young = run([...TO_FEEL.slice(0, -2), "age_little"]);
  assert.equal(young.step, "young");
  const tender = run(["young_gentle"], { state: young });
  assert.deepEqual([tender.step, tender.session.tender], ["tender", true]);
  const named = run([hold], { state: tender });
  assert.equal(named.step, "name");
  const reach = reachable(tender, CTX);
  for (const st of ["voice", "feel", "unblend", "job", "likes", "guards", "fear", "stop", "update", "canNow", "thank", "rather"]) assert.ok(!reach.has(st), st);
  assert.equal(run(["young_go_on"], { state: young }).step, "voice");
  const kept = run([{ type: "name", name: null }, "keep_yes", { type: "close", choiceId: null }], { state: named });
  assert.equal(whatToSave(kept).keep.tender, true);
});

test("keep: only 'Yes, keep it' writes a part; not now writes nothing to the profile", () => {
  const atKeep = run([...TO_FEAR, "hide_fear_regret", "update_no", "now_ask", hold, "hide_rather_need_someone", "name_not_yet"]);
  assert.equal(atKeep.step, "keep");
  const no = run(["keep_not_now", { type: "close", choiceId: "same" }], { state: atKeep });
  assert.deepEqual([whatToSave(no).keep, whatToSave(no).followUp, no.session.kept], [null, null, false]);
  const yes = whatToSave(run(["keep_yes", { type: "close", choiceId: null }], { state: atKeep }));
  assert.equal(yes.keep.name, null);
  assert.equal(yes.toolSession.thenVsNow, null, "skipped close");
});

test("whatToSave: ask-fresh answers never reach the part; own words only on the yes", () => {
  const ownAll = [...TO_FEEL.slice(0, -1), { type: "ownWords", text: "my voice" }, "feel_annoyed", "unblend_eased", "feel_open",
    { type: "ownWords", text: "my job" }, "likes_tired", "guards_not_sure", "hide_fear_too_much", "update_yes", hold, "rather_not_sure",
    { type: "name", name: "Ash" }];
  const yes = whatToSave(run([...ownAll, "keep_yes", { type: "close", choiceId: null }]));
  const keepText = JSON.stringify(yes.keep);
  for (const f of ["feelTowardIds", "blendCheck", "handoffs", "steppedBack", "stopReason", "exitStep", "likesId", "updateId"]) assert.ok(!keepText.includes(`"${f}"`), f);
  assert.deepEqual([yes.keep.ownVoice, yes.keep.ownJob, yes.keep.guards], ["my voice", "my job", []], "Not sure at Guards is no hurt");
  assert.deepEqual(yes.partSession.feelTowardIds, ["feel_annoyed", "feel_open"]);
  assert.ok(!("name" in yes.partSession), "the name is the person's text: profile only, on the yes");
  const no = whatToSave(run([...ownAll, "keep_not_now", { type: "close", choiceId: null }]));
  assert.equal(no.keep, null);
  assert.ok(!JSON.stringify(no).includes("Ash"));
});

test("a stale or wrong event changes nothing", () => {
  const s = run([{ type: "find" }]);
  for (const e of [{ type: "hold" }, { type: "place", place: "chest" }, ev("feel_curious"), { type: "close", choiceId: "better" }, { type: "continue" }, { type: "p2", outcome: "resume" }]) {
    assert.equal(meetNext(s, e, CTX), s, JSON.stringify(e));
  }
  assert.equal(meetNext(s, { type: "option", option: { id: "not_a_blend_answer", branch: "continue" } }, CTX), s);
});

/** Every event a screen can send at this state: its chips for the move, own words, and the special events. */
function eventsAt(state) {
  const { step, session } = state;
  const out = optionsAt(step, session.move).map((o) => ({ type: "option", option: o }));
  if (OWN_WORDS_STEPS.includes(step)) out.push({ type: "ownWords", text: "x" });
  const special = {
    find: [{ type: "find" }], blendBody: [{ type: "p2", outcome: "resume" }, { type: "p2", outcome: "override" }, { type: "p2", outcome: "later" }, { type: "continue" }],
    where: [{ type: "place", place: "chest" }], shape: [{ type: "shape", shape: [0, 0, 0, 0, 0] }], guards: [{ type: "hurt", hurtId: "left_out" }],
    thank: [{ type: "hold" }], tender: [{ type: "hold" }], name: [{ type: "name", name: "n" }], close: [{ type: "close", choiceId: null }],
  };
  return [...out, ...(special[step] ?? [])];
}
const keyOf = (s) => JSON.stringify([s.step, s.round, s.later, s.session.move, s.session.steppedBack, s.session.danger, s.session.stopReason, s.session.tender]);
/** Steps reachable from a state. */
function reachable(start, ctx) {
  const seen = new Map([[keyOf(start), start]]);
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    for (const e of eventsAt(s)) {
      const n = meetNext(s, e, ctx);
      if (!seen.has(keyOf(n))) { seen.set(keyOf(n), n); queue.push(n); }
    }
  }
  return new Set([...seen.values()].map((s) => s.step));
}

test("no dead ends: from every reachable screen some event leaves it, and done is always reachable", () => {
  const ctxs = [CTX, ctxOf({ namedEntry: true }), ctxOf({ blendCheck: false }), ctxOf({ namedEntry: true, p2OnEntry: true, p2Band: "flooded" })];
  const steps = new Set();
  for (const ctx of ctxs) {
    for (const move of fixture.moves.map((m) => m.id)) {
      const start = initialMeet(ctx, { move });
      const states = new Map([[keyOf(start), start]]);
      const edges = new Map();
      const queue = [start];
      while (queue.length) {
        const s = queue.shift();
        const out = [];
        for (const e of eventsAt(s)) {
          const n = meetNext(s, e, ctx);
          if (n === s) continue;
          out.push(keyOf(n));
          if (!states.has(keyOf(n))) { states.set(keyOf(n), n); queue.push(n); }
        }
        edges.set(keyOf(s), out);
      }
      for (const [k, s] of states) {
        steps.add(s.step);
        if (s.step !== "done") assert.ok(edges.get(k).some((x) => x !== k), `${move}: stuck at ${k}`);
      }
      // Done is reachable from every state (walk the edges backwards from done).
      const canFinish = new Set([...states.keys()].filter((k) => states.get(k).step === "done"));
      for (let grew = true; grew;) {
        grew = false;
        for (const [k, out] of edges) if (!canFinish.has(k) && out.some((x) => canFinish.has(x))) { canFinish.add(k); grew = true; }
      }
      assert.deepEqual([...states.keys()].filter((k) => !canFinish.has(k)), [], `${move}: states that can't reach done`);
    }
  }
  assert.deepEqual([...steps].sort(), [...MEET_STEPS].sort(), "the walk reaches every screen");
});
