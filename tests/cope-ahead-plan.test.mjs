// Cope Ahead's plan line (src/lib/copeAheadPlan.ts, docs/design/cope-ahead.md "The plan line"): the
// "If" from the moment, the pull or own words; the moves, or own words, joined with "and", two at most;
// a missing id dropped, never printed.
import test from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./lib/importTs.mjs";

const P = await importTs("src/lib/copeAheadPlan.ts");

// The doc's Copy tables, the rows these tests use.
const C = {
  copy: { plan_if: "If", plan_ill: "I'll", plan_and: "and" },
  pullIf: { fight: "I want to say something sharp", chase: "I want to text them over and over", hide: "I want to disappear", blank: "I start to shut down" },
  hardMoments: [
    { id: "go_blank", ifText: "I go blank" },
    { id: "voice_raised", ifText: "they raise their voice" },
    { id: "might_hurt", ifText: "they start to frighten me" },
  ],
  moves: [
    { id: "long_out", line: "breathe out longer than in" },
    { id: "give_minute", line: "say \"Give me a minute\"" },
    { id: "five_senses", line: "do 5-4-3-2-1" },
    { id: "leave_safe", line: "leave and get somewhere safe" },
  ],
};

test("the doc's example: If I go blank, I'll breathe out longer than in and say \"Give me a minute\".", () => {
  const p = P.planLine(C, { hardMomentId: "go_blank", ifFrom: "moment", moveIds: ["long_out", "give_minute"] });
  assert.deepEqual(p, {
    ifText: "I go blank",
    moves: ["breathe out longer than in", "say \"Give me a minute\""],
    text: "If I go blank, I'll breathe out longer than in and say \"Give me a minute\".",
  });
});

test("one move: no \"and\"", () => {
  assert.equal(P.planLine(C, { hardMomentId: "voice_raised", moveIds: ["five_senses"] }).text, "If they raise their voice, I'll do 5-4-3-2-1.");
});

test("the If: the moment by default, the pull with ifFrom 'pull', own words when there's no moment", () => {
  const moves = { moveIds: ["long_out"] };
  assert.equal(P.planLine(C, { ...moves, hardMomentId: "go_blank", pullIds: ["blank"] }).ifText, "I go blank", "ifFrom absent: the moment");
  assert.equal(P.planLine(C, { ...moves, hardMomentId: "go_blank", pullIds: ["blank"], ifFrom: "moment" }).ifText, "I go blank");
  assert.equal(P.planLine(C, { ...moves, hardMomentId: "go_blank", pullIds: ["blank"], ifFrom: "pull" }).text, "If I start to shut down, I'll breathe out longer than in.");
  assert.equal(P.planLine(C, { ...moves, hardMomentOwn: "my sister brings up Dad", ifFrom: "moment" }).text, "If my sister brings up Dad, I'll breathe out longer than in.");
  // The pull wins over own words only when planned for: ifFrom 'moment' keeps the own words.
  assert.equal(P.planLine(C, { ...moves, hardMomentOwn: "my sister brings up Dad", pullIds: ["hide"] }).ifText, "my sister brings up Dad");
  assert.equal(P.planLine(C, { ...moves, hardMomentOwn: "my sister brings up Dad", pullIds: ["hide"], ifFrom: "pull" }).ifText, "I want to disappear");
});

test("the pull: the first pull that has a line (Not sure and unknown pulls skipped)", () => {
  const p = P.planLine(C, { ifFrom: "pull", pullIds: ["not_sure", "chase", "fight"], moveIds: ["long_out"] });
  assert.equal(p.ifText, "I want to text them over and over");
});

test("the moves: chips, own words, both; two at most; repeats once", () => {
  const ifs = { hardMomentId: "go_blank" };
  assert.deepEqual(P.planLine(C, { ...ifs, moveOwn: "go to the bathroom and breathe" }).moves, ["go to the bathroom and breathe"]);
  assert.equal(P.planLine(C, { ...ifs, moveIds: ["long_out"], moveOwn: "count the ceiling tiles" }).text,
    "If I go blank, I'll breathe out longer than in and count the ceiling tiles.");
  assert.deepEqual(P.planLine(C, { ...ifs, moveIds: ["long_out", "give_minute"], moveOwn: "count the ceiling tiles" }).moves,
    ["breathe out longer than in", "say \"Give me a minute\""], "two at most");
  assert.deepEqual(P.planLine(C, { ...ifs, moveIds: ["long_out", "long_out"] }).moves, ["breathe out longer than in"]);
  assert.equal(P.PLAN_MAX_MOVES, 2);
});

test("own words in each slot: kept as typed, trimmed, a closing full stop dropped so the sentence reads once", () => {
  const p = P.planLine(C, { hardMomentOwn: "  Mum asks about work. ", moveOwn: "say \"Not today.\"  " });
  assert.equal(p.ifText, "Mum asks about work");
  assert.equal(p.text, "If Mum asks about work, I'll say \"Not today.\".", "a closing quote is the person's: kept");
  const q = P.planLine(C, { hardMomentOwn: "it gets loud...", moveOwn: "step out," });
  assert.equal(q.text, "If it gets loud, I'll step out.");
  assert.equal(P.planLine(C, { hardMomentOwn: "   ", moveIds: ["long_out"] }).text, "", "blank own words are no If");
});

test("a missing id is dropped, never printed", () => {
  const p = P.planLine(C, { hardMomentId: "gone_moment", hardMomentOwn: null, moveIds: ["gone_move", "give_minute"] });
  assert.deepEqual(p, { ifText: "", moves: ["say \"Give me a minute\""], text: "" });
  const q = P.planLine(C, { hardMomentId: "gone_moment", hardMomentOwn: "they leave early", moveIds: ["gone_move", "give_minute"] });
  assert.equal(q.text, "If they leave early, I'll say \"Give me a minute\".", "an unknown moment falls to the own words");
  const r = P.planLine(C, { ifFrom: "pull", pullIds: ["gone_pull"], hardMomentId: "go_blank", moveIds: ["gone_move"] });
  assert.deepEqual(r, { ifText: "I go blank", moves: [], text: "" }, "an unknown pull falls back to the moment; no move, no sentence");
  for (const s of [p.text, q.text, r.text, ...p.moves, ...q.moves]) assert.doesNotMatch(s, /gone_/);
});

test("nothing to say: no ca, no If, no move", () => {
  assert.deepEqual(P.planLine(C, null), { ifText: "", moves: [], text: "" });
  assert.deepEqual(P.planLine(C, {}), { ifText: "", moves: [], text: "" });
  assert.equal(P.planLine(C, { moveIds: ["long_out"] }).text, "");
  assert.equal(P.planLine(C, { hardMomentId: "go_blank" }).text, "");
});

test("the words come from the content", () => {
  const other = { ...C, copy: { plan_if: "When", plan_ill: "I will", plan_and: "then" } };
  assert.equal(P.planLine(other, { hardMomentId: "go_blank", moveIds: ["long_out", "five_senses"] }).text,
    "When I go blank, I will breathe out longer than in then do 5-4-3-2-1.");
  assert.equal(P.planWord({ copy: {} }, "plan_ill"), "I'll", "the flow's own word if a key is missing");
});

test("pure: no imports, no stored plan string read", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/lib/copeAheadPlan.ts", "utf8");
  assert.doesNotMatch(src, /^import /m);
  assert.match(src, /export type PlanParts = \{ ifText: string; moves: string\[\]; text: string \};/);
  assert.match(src, /export function planLine\(content: PlanContent, ca: PlanCa \| null \| undefined\): PlanParts/);
});
