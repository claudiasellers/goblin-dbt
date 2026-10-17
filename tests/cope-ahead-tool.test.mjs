// Cope Ahead's step machine (docs/design/cope-ahead.md, "The flow"): src/lib/copeAheadTool.ts. The order,
// the If toggle, moves by pull, the danger first move, the two-move cap, own words in every slot, once more,
// and what a visit writes (ext.ca, checked against the server's schema).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const ca = await importTs("src/lib/copeAheadTool.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const content = JSON.parse(readFileSync("src/data/content/cope-ahead.json", "utf8")).content;

const run = (events, from = ca.initialCope()) => events.reduce((s, e) => ca.copeNext(s, e, content), from);
const toPlan = (situation = "conversation", moment = "go_blank", pull = null) => run([
  { type: "situation", id: situation }, { type: "when", when: "tomorrow" }, { type: "next" },
  ...(pull ? [{ type: "pull", pull }] : []), { type: "next" },
  { type: "moment", id: moment }, { type: "next" },
]);
const ids = (moves) => moves.map((m) => m.id);

test("the seven screens in order; screens 1, 3 and 4 wait for their answer, screen 2 never does", () => {
  let s = ca.initialCope();
  assert.equal(s.step, "what");
  assert.equal(run([{ type: "next" }], s).step, "what", "no situation yet");
  s = run([{ type: "situation", id: "work_school" }, { type: "next" }], s);
  assert.equal(s.step, "feel");
  s = run([{ type: "next" }], s);
  assert.equal(s.step, "moment", "feelings and the pull are optional");
  assert.equal(run([{ type: "next" }], s).step, "moment");
  s = run([{ type: "moment", id: "criticised" }, { type: "next" }], s);
  assert.equal(s.step, "plan");
  assert.equal(run([{ type: "next" }], s).step, "plan", "a plan needs a move");
  s = run([{ type: "move", id: "feet" }, { type: "next" }], s);
  assert.deepEqual([s.step, s.pass], ["rehearse", 1]);
  s = run([{ type: "rehearsed" }], s);
  assert.equal(s.step, "again");
  s = run([{ type: "again", yes: false }], s);
  assert.equal(s.step, "settle");
  s = run([{ type: "settle", settle: "ok" }], s);
  assert.equal(s.step, "keep");
  assert.deepEqual(Object.values(ca.COPE_TRACK).slice(0, 4), [1, 2, 3, 4]);
});

test("the If is the moment by default; Plan for the pull switches to it only when a pull was picked", () => {
  let s = toPlan("conversation", "go_blank");
  assert.equal(s.ifFrom, "moment");
  assert.equal(ca.canPlanForPull(s), false);
  assert.equal(run([{ type: "ifFrom", from: "pull" }], s).ifFrom, "moment", "no pull: stays on the moment");
  s = toPlan("conversation", "go_blank", "not_sure");
  assert.equal(run([{ type: "ifFrom", from: "pull" }], s).ifFrom, "moment", "Not sure: stays on the moment");
  s = toPlan("conversation", "go_blank", "blank");
  s = run([{ type: "ifFrom", from: "pull" }], s);
  assert.equal(s.ifFrom, "pull");
  assert.equal(ca.planCa(s).ifFrom, "pull");
  assert.deepEqual(ca.planCa(s).pullIds, ["blank"]);
  assert.equal(run([{ type: "ifFrom", from: "moment" }], s).ifFrom, "moment");
});

test("moves are filtered by the pull; general ones show with no pull or Not sure; forMoments moves come first", () => {
  const general = ids(content.moves.filter((m) => m.general));
  assert.deepEqual(ids(ca.movesFor(toPlan(), content)), general);
  assert.deepEqual(ids(ca.movesFor(toPlan("conversation", "go_blank", "not_sure"), content)), general);
  const chase = ids(ca.movesFor(toPlan("conversation", "go_blank", "chase"), content));
  assert.deepEqual(chase, ids(content.moves.filter((m) => m.forPulls.includes("chase"))));
  assert.ok(chase.includes("phone_away") && !chase.includes("feet"));
  const danger = ids(ca.movesFor(toPlan("conversation", "might_hurt", "fight"), content));
  assert.equal(danger[0], "leave_safe", "the danger move first");
  assert.ok(!ids(ca.movesFor(toPlan("alone", "thoughts_loop"), content)).includes("reach_help"), "danger moves only for their moment");
});

test("at most two moves: a chip replaces until Add one more, then adds; tapping a picked one takes it out", () => {
  let s = toPlan();
  s = run([{ type: "move", id: "long_out" }, { type: "move", id: "feet" }], s);
  assert.deepEqual(s.moves.ids, ["feet"], "one plan, not a checklist");
  assert.equal(ca.offersAdd(s), true);
  s = run([{ type: "add" }, { type: "move", id: "give_minute" }], s);
  assert.deepEqual(s.moves.ids, ["feet", "give_minute"]);
  assert.equal(ca.offersAdd(s), false);
  assert.deepEqual(run([{ type: "add" }, { type: "move", id: "step_out" }], s).moves.ids, ["step_out"], "no third");
  assert.deepEqual(run([{ type: "move", id: "feet" }], s).moves.ids, ["give_minute"]);
});

test("a danger moment pre-selects its move, which can be changed; leaving the moment takes it out", () => {
  let s = toPlan("conversation", "might_hurt");
  assert.deepEqual(s.moves.ids, ["leave_safe"]);
  assert.ok(ca.isDanger(s, content));
  assert.equal(ca.dangerMove("might_hurt_self", content).id, "reach_help");
  assert.deepEqual(run([{ type: "move", id: "step_out" }], s).moves.ids, ["step_out"], "changeable");
  assert.deepEqual(run([{ type: "add" }, { type: "move", id: "text_trust" }], s).moves.ids, ["leave_safe", "text_trust"]);
  assert.deepEqual(toPlan("alone", "might_hurt_self").moves.ids, ["reach_help"]);
  // Back on screen 3 a calmer moment drops the danger move.
  const back = { ...s, step: "moment" };
  const calmer = run([{ type: "moment", id: "go_blank" }], back);
  assert.deepEqual([calmer.moves.ids, ca.isDanger(calmer, content)], [[], false]);
});

test("own words go in each slot: the situation, the moment and a move (length-capped, never read)", () => {
  let s = run([{ type: "situationOwn", text: `  ${"s".repeat(200)} ` }]);
  assert.deepEqual([s.situationId, s.situationOwn.length], ["other", 140]);
  s = run([{ type: "next" }, { type: "next" }, { type: "momentOwn", text: "m".repeat(160) }], s);
  assert.deepEqual([s.hardMomentId, s.hardMomentOwn.length], [null, 140]);
  s = run([{ type: "next" }, { type: "moveOwn", text: "x".repeat(120) }], s);
  assert.equal(s.moves.own.length, 90);
  assert.equal(ca.hasMove(s.moves), true);
  s = run([{ type: "add" }, { type: "move", id: "feet" }], s);
  assert.deepEqual([s.moves.ids, s.moves.own.length], [["feet"], 90], "own words fill one of the two slots");
  const e = ca.copeExt(s);
  assert.deepEqual(JSON.parse(ext.validateExt({ ca: e })).ca, e, "what the visit writes passes ext.ca");
  assert.equal(run([{ type: "situationOwn", text: "   " }]).situationId, null, "blank own words do nothing");
});

test("once more runs beats 3-7 again with a new moment and the same move, or a changed one; offered once", () => {
  let s = toPlan("conversation", "voice_raised");
  s = run([{ type: "move", id: "give_minute" }, { type: "next" }, { type: "rehearsed" }, { type: "again", yes: true }], s);
  assert.equal(s.step, "newMoment");
  assert.deepEqual(ids(ca.newMomentChoices(s, content)), ["go_blank", "not_heard"], "two others, never danger");
  assert.equal(run([{ type: "next" }], s).step, "newMoment");
  const same = run([{ type: "newMoment", id: "not_heard" }, { type: "changeMove", change: false }, { type: "next" }], s);
  assert.deepEqual([same.step, same.pass], ["rehearse", 2]);
  assert.deepEqual(ca.passOf(same, 2).moves.ids, ["give_minute"]);
  assert.equal(ca.planCa(same, 2).hardMomentId, "not_heard");
  assert.equal(ca.planCa(same, 1).hardMomentId, "voice_raised", "the kept plan is pass 1's");
  const changed = run([{ type: "newMomentOwn", text: "They walk out" }, { type: "changeMove", change: true }], s);
  assert.equal(run([{ type: "next" }], changed).step, "newMoment", "a change needs a move");
  const c2 = run([{ type: "move", id: "step_out" }, { type: "next" }], changed);
  assert.deepEqual(ca.planCa(c2, 2).moveIds, ["step_out"]);
  assert.equal(ca.planCa(c2, 2).hardMomentOwn, "They walk out");
  assert.equal(ca.momentText(content, null, "They walk out"), "They walk out");
  assert.equal(ca.momentText(content, "not_heard", null), "they don't listen");
  const done = run([{ type: "rehearsed" }], c2);
  assert.deepEqual([done.step, done.rehearsed], ["settle", 2], "not offered again");
  const e = ca.copeExt(run([{ type: "settle", settle: "breath" }, { type: "kept", kept: true }, { type: "followUp", yes: true }], done));
  assert.deepEqual([e.rehearsed, e.newMomentOwn, e.newMoveIds, e.settle, e.kept, e.followUp], [2, "They walk out", ["step_out"], "breath", true, true]);
  assert.deepEqual(JSON.parse(ext.validateExt({ ca: e })).ca, e);
});

test("feelings: up to two, the situation's four first, a grid word from the list joins them; a new situation clears them", () => {
  let s = run([{ type: "situation", id: "hard_day" }, { type: "next" }]);
  assert.deepEqual(ca.feelChoices(s, content), ["sad", "grief", "lonely", "numb"]);
  s = run([{ type: "feel", id: "sad" }, { type: "feel", id: "grief" }, { type: "feel", id: "numb" }], s);
  assert.deepEqual(s.feelIds, ["grief", "numb"]);
  s = run([{ type: "feelIds", ids: ["numb", "tired"] }], s);
  assert.deepEqual(ca.feelChoices(s, content), ["sad", "grief", "lonely", "numb", "tired"]);
  const back = run([{ type: "situation", id: "alone" }], { ...s, step: "what" });
  assert.deepEqual(back.feelIds, []);
});

test("a link may put a situation first, never pre-selected", () => {
  const entry = ca.parseCopeEntry("?first=conversation", content);
  assert.equal(entry.firstSituationId, "conversation");
  assert.equal(ca.parseCopeEntry("?first=nope", content).firstSituationId, null);
  assert.equal(ca.orderedSituations(content, "alone")[0].id, "alone");
  assert.equal(ca.initialCope().situationId, null);
});

test("the session's ext.ca: every field the server knows, cleared ones as null (setExt merges), nulls dropped on save", () => {
  const schemaKeys = Object.keys(ext.EXT_SCHEMAS.ca).sort();
  assert.deepEqual([...ca.CA_KEYS].sort(), schemaKeys);
  const picked = run([{ type: "moment", id: "go_blank" }], { ...toPlan(), step: "moment" });
  const own = run([{ type: "momentOwn", text: "They walk out" }], picked);
  const sent = ca.copeSessionExt(own);
  assert.equal(sent.hardMomentId, null, "the earlier pick is cleared, not left behind");
  assert.equal(sent.hardMomentOwn, "They walk out");
  assert.deepEqual(JSON.parse(ext.validateExt({ ca: sent })).ca, ca.copeExt(own));
});
