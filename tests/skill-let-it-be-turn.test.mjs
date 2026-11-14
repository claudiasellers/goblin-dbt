// Let it be's turning the mind (DT-04 part 2, DBT DT Handout 12; docs/design/let-it-be.md): acceptance is chosen again
// and again. After a visit's close: when the fight tends to come back, and a reminder (`turn_mind`) that reopens the
// run at the fork; the `turn` entry (Problem Solve's *turning the mind*) goes to the fork straight after what it's about.
// Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const F = await importTs("src/lib/turnFork.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "let_it_be");
const embedOutputs = { turnFork: { ids: ["turned", "skipped"], measures: ["doneCount", "durationSec"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const did = (id = "done") => ({ type: "embedDone", output: { ids: [id], durationSec: 30 } });
const turned = { type: "embedDone", output: { ids: ["turned"], doneCount: 3, durationSec: 40 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const firstIds = (c, s, step) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const TURN = ctx({ enterAt: "turn" });

test("the turn entry: what it's about, the fork, their words (or a statement first), willing hands, the close", () => {
  assert.deepEqual(skill.entries, { willingness: "what", turn: "what" });
  const s0 = M.pageStart(TURN);
  assert.equal(s0.stepId, "what");
  let s = run([pick("what", "limit"), next], TURN, s0);
  assert.equal(s.stepId, "turn");
  assert.equal(M.stepOf(skill, "turn").embed, "turnFork");
  s = run([turned], TURN, s);
  assert.equal(s.stepId, "statement", "no statement yet: pick one, then it's on paper");
  s = run([pick("statement", "causes"), next], TURN, s);
  assert.equal(s.stepId, "turn_card");
  s = run([did("copied")], TURN, s);
  assert.equal(s.stepId, "turn_hands");
  s = run([did(), next], TURN, s);
  assert.equal(s.stepId, "close");
});

test("the turn entry keeps the danger check: something about a person asks whether it's still happening", () => {
  let s = run([pick("what", "unfair"), next], TURN, M.pageStart(TURN));
  assert.equal(s.stepId, "still");
  s = run([pick("still", "no"), next], TURN, s);
  assert.equal(s.stepId, "turn");
  // Still happening: the line and the support first; only *for what's already happened* goes on to the fork.
  const yes = run([pick("still", "yes"), next], TURN, run([pick("what", "unfair"), next], TURN, M.pageStart(TURN)));
  assert.equal(yes.stepId, "still_line");
  assert.equal(M.crisisFor(TURN, M.stepOf(skill, "still_line"), yes)?.variant, "other_person");
  // Flooded: the heads-up after what it's about, then the danger check before any turning.
  const fl = ctx({ enterAt: "turn", band: "flooded" });
  const h = run([pick("what", "unfair"), next], fl, M.pageStart(fl));
  assert.equal(h.stepId, "heads_up");
  assert.equal(run([pick("heads_up", "anyway"), next], fl, h).stepId, "still");
});

const LOST = [pick("checked", "yes"), next, pick("what", "lost"), next];
const toClose = () => {
  const hs = run([...LOST, pick("fight", "replay"), next, pick("willing", "willing"), next, did(), pick("statement", "causes"), next, did("copied"), pick("grief", "ok"), next]);
  return run([pick("hands_still", "need"), next], ctx(), hs);
};

test("after the close: when the fight comes back and a reminder, both skippable; a time cue puts its chip first", () => {
  const c = run([pick("close", "better"), next], ctx(), toClose());
  assert.equal(c.stepId, "cue");
  assert.equal(M.stepOf(skill, "cue").fields[0].required, false);
  const r = run([pick("cue", "night"), next], ctx(), c);
  assert.equal(r.stepId, "remind");
  assert.equal(firstIds(ctx(), r, "remind")[0], "tonight", "at night: tonight first, never picked");
  assert.equal(r.answers.remind, undefined);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "remind"), run([pick("remind", "tomorrow")], ctx(), r)), { type: "turn_mind", chip: "tomorrow" });
  const skipped = run([next], ctx(), r);
  assert.equal(skipped.stepId, "end");
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "remind"), r), null, "skipping is no reminder");
  // Louder: straight to the end card (the body, Recover), no reminder asked.
  assert.equal(run([pick("close", "worse"), next], ctx(), toClose()).stepId, "end");
});

test("the reminder reopens the run at the fork: turn again, their words, the hands, another reminder", () => {
  const booked = run([pick("close", "better"), next, next, pick("remind", "few_days"), next], ctx(), toClose());
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "turn_back");
  assert.equal(r?.stepId, "turn_back");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), toClose()), "turn_back"), null, "never reached the reminder, no reopen");
  let s = run([pick("turn_back", "now"), next], ctx(), r);
  assert.equal(s.stepId, "turn_again");
  s = run([turned], ctx(), s);
  assert.equal(s.stepId, "turn_card_again", "their statement from the first visit, once more");
  s = run([did("copied"), did()], ctx(), s);
  assert.equal(s.stepId, "remind_again");
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "remind_again"), run([pick("remind_again", "tonight")], ctx(), s)), { type: "turn_mind", chip: "tonight" });
  assert.equal(run([next], ctx(), s).stepId, "turn_end");
  // It's quieter: let it rest, no close question. Not now: another time.
  const rest = run([pick("turn_back", "rest"), next], ctx(), r);
  assert.equal(rest.stepId, "rest_end");
  assert.equal(M.stepOf(skill, "rest_end").noClose, true);
  assert.equal(run([pick("turn_back", "not_now"), next], ctx(), r).stepId, "remind_again");
  const again = M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("remind_again", "tomorrow"), next], ctx(), s)), "turn_back");
  assert.equal(again?.stepId, "turn_back");
  assert.equal(again.answers.turn_back, undefined, "the last turn's answers don't come back");
});

test("a reopened visit made while harm was ongoing keeps the support on screen and says it's for what already happened", () => {
  let s = run([pick("what", "unfair"), next, pick("still", "yes"), next, pick("still_go", "go_on"), next, turned], TURN, M.pageStart(TURN));
  assert.equal(s.stepId, "statement");
  const opt = firstIds(TURN, s, "statement")[0];
  s = run([pick("statement", opt), next, did("copied"), did(), next, pick("close", "better"), next, next, pick("remind", "tomorrow"), next], TURN, s);
  assert.equal(s.stepId, "end");
  const r = M.resumeRun(ctx(), M.runRecord(TURN, s), "turn_back");
  assert.equal(r?.stepId, "turn_back");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "turn_back"), r)?.variant, "other_person");
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "turn_back").title, r), skill.copy.back_title_still);
});

test("turn_mind: registered, reopens at turn_back, never names what's being accepted, resolved by opening, bound to let-it-be", () => {
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const t = spine.content.followUpTypes.find((x) => x.id === "turn_mind");
  assert.equal(t.deepLinkTemplate, "/tool/let-it-be?run={sourceSessionId}&at=turn_back&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), ["few_days", "tomorrow", "tonight"]);
  for (const line of [t.copy.title, t.copy.body, t.notification]) assert.doesNotMatch(line, /accept|hurt|loss|them/i, line);
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'turn_mind'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /turn_mind: 'let-it-be'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /MERGE \(t:FollowUpType \{id: "turn_mind"\}\)/);
});

test("turnFork: footprints on the letting-it-be path, never a digit; turned after one tap, else skipped", () => {
  assert.deepEqual(F.turnOutput(0, 4000), { ids: ["skipped"], doneCount: 0, durationSec: 4 });
  assert.deepEqual(F.turnOutput(3, 41_400), { ids: ["turned"], doneCount: 3, durationSec: 41 });
  assert.equal(F.turnOutput(500, 0).doneCount, 100);
  assert.equal(F.printAt(F.MAX_PRINTS), null);
  const prints = Array.from({ length: F.MAX_PRINTS }, (_, i) => F.printAt(i));
  for (let i = 1; i < prints.length; i++) assert.ok(prints[i].y < prints[i - 1].y, "each print further up the path");
  for (const p of prints) assert.ok(p.x > 110 && p.x < 210 && p.y > 25 && p.y < 155);
  const tsx = readFileSync("src/components/skillPlayer/TurnFork.tsx", "utf8");
  assert.doesNotMatch(tsx, />\{turns\}</, "the turns are never shown as a number");
  assert.match(tsx, /useReducedMotion/);
  const embeds = readFileSync("src/components/skillPlayer/embeds.ts", "utf8");
  assert.match(embeds, /turnFork: TurnFork/);
});
