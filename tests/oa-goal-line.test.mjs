// Do the Opposite's goal line (docs/design/parts.md, the Do the Opposite row): parts on, on the check's
// effectiveness card, "A part of you {move}, and it's trying to help." / "You want to {goal}."
// (src/lib/oaGoalLine.ts, src/hooks/useOaGoalLine.ts, src/pages/tools/OppositeAction.tsx).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/oaGoalLine.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const ALL = partsFromFixture(fixture, () => true);
const SHIPPED = JSON.parse(read("src/data/content/parts.json")).content;
const without = (drop) => partsFromFixture(fixture, (id) => !drop.includes(id));
// OA's own goal choices, from its content (never copied into parts content).
const flow = JSON.parse(JSON.parse(read("schema/opposite-action-flow.cypher").match(/p.contentJson = (.*);/)[1]));
const goals = flow.choices.goal;
const IDS = [lib.OA_GOAL_PART, lib.OA_GOAL_YOU];

test("copy: two lines in flow oa, step goal (signed off 17 Oct); {move} and {goal}, no {hurt}", () => {
  assert.deepEqual(lib.OA_GOAL_LINE_REQUIRED, { prompts: IDS, options: [] });
  const rows = IDS.map((id) => fixture.prompts[id]);
  assert.deepEqual(rows.map((p) => [p.flow, p.step, p.copy]), [
    ["oa", "goal", "A part of you {move}, and it's trying to help."],
    ["oa", "goal", "You want to {goal}."],
  ]);
  for (const p of rows) assert.doesNotMatch(p.copy, /\{hurt\}|\{pull\}/);
  assert.equal(fixture.options.oa?.goal, undefined, "no options: nothing to tap");
});

test("the five goals, each read after \"You want to\"", () => {
  assert.deepEqual(goals.map((g) => g.id), ["connection", "boundary", "progress", "repair", "self_respect"]);
  const filled = goals.map((g) => lib.oaGoalLine(ALL, { urgeId: "shame-hide", goalLabel: g.label })[1]);
  assert.deepEqual(filled, [
    "You want to stay connected.",
    "You want to protect a boundary.",
    "You want to make progress on something.",
    "You want to repair harm.",
    "You want to act with self-respect.",
  ]);
  assert.equal(lib.goalPhrase("Stay connected"), "stay connected");
  assert.equal(lib.goalPhrase("  "), "");
});

test("the gate: an offerable, non-safety-line move from a listed urge, a goal, both lines shipped", () => {
  const goal = goals[0].label;
  assert.deepEqual(lib.oaGoalLine(ALL, { urgeId: "anger-lash", goalLabel: goal }),
    ["A part of you wants to hit back, and it's trying to help.", "You want to stay connected."]);
  // The move's unblend phrase, the unblend line's own (so "it" never lacks a referent).
  const first = (urgeId) => lib.oaGoalLine(ALL, { urgeId, goalLabel: goal })[0];
  assert.equal(first("shame-hide"), "A part of you wants to hide, and it's trying to help.");
  assert.equal(first("jealousy-check"), "A part of you wants to chase this down, and it's trying to help.");
  assert.equal(first("guilt-apologize"), "A part of you wants to keep the peace, and it's trying to help.");
  assert.equal(first("shame-shrink"), "A part of you wants you to take up less room, and it's trying to help.");
  assert.equal(first("fear-avoid"), "A part of you wants to put this off, and it's trying to help.");
  const keepWatch = { ...ALL, expresses: { ...ALL.expresses, ActionUrge: { ...ALL.expresses.ActionUrge, "fear-scan": "keep_watch" } } };
  assert.equal(lib.oaGoalLine(keepWatch, { urgeId: "fear-scan", goalLabel: goal })[0], "A part of you is keeping watch, and it's trying to help.");
  // A move with no unblendPhrase: nothing.
  const noPhrase = { ...ALL, moves: ALL.moves.map((m) => (m.id === "hit_back" ? { ...m, unblendPhrase: "" } : m)) };
  assert.equal(lib.oaGoalLine(noPhrase, { urgeId: "anger-lash", goalLabel: goal }), null);
  // My urge is different, nothing picked, an id with no edge.
  for (const urgeId of ["custom", "", null, "nope", "__proto__"]) assert.equal(lib.oaGoalLine(ALL, { urgeId, goalLabel: goal }), null, `urge ${urgeId}`);
  // Non-offerable moves (go_blank, zone_out never ship).
  for (const urgeId of ["fear-freeze", "sad-scroll", "sad-bed"]) assert.equal(lib.oaGoalLine(ALL, { urgeId, goalLabel: goal }), null, urgeId);
  // The safety-line move: never "A part of you is turning on you, and it's trying to help."
  const safety = ALL.moves.filter((m) => m.safetyLine).map((m) => m.id);
  assert.deepEqual(safety, ["turn_on_myself"]);
  for (const urgeId of ["guilt-punish", "envy-compare"]) assert.equal(lib.oaGoalLine(ALL, { urgeId, goalLabel: goal }), null, urgeId);
  // No goal.
  for (const goalLabel of [null, "", " "]) assert.equal(lib.oaGoalLine(ALL, { urgeId: "anger-lash", goalLabel }), null, `goal ${goalLabel}`);
  // Copy missing: either line, the move, the edge; no content.
  for (const id of IDS) assert.equal(lib.oaGoalLine(without([id]), { urgeId: "anger-lash", goalLabel: goal }), null, `${id} missing`);
  assert.equal(lib.oaGoalLine(without(["hit_back"]), { urgeId: "anger-lash", goalLabel: goal }), null, "move not shipped");
  assert.equal(lib.oaGoalLine(without(["anger-lash"]), { urgeId: "anger-lash", goalLabel: goal }), null, "edge not shipped");
  assert.equal(lib.oaGoalLine(null, { urgeId: "anger-lash", goalLabel: goal }), null);
  const noSlot = { ...ALL, prompts: { ...ALL.prompts, oa_goal_you: { ...ALL.prompts.oa_goal_you, copy: "No slot." } } };
  assert.equal(lib.oaGoalLine(noSlot, { urgeId: "anger-lash", goalLabel: goal }), null);
  // The shipped file (signed off 17 Oct, Claudia: ship it all): the same line the whole fixture gives, for
  // every urge; either line taken out of it, nothing.
  assert.deepEqual(lib.oaGoalLine(SHIPPED, { urgeId: "anger-lash", goalLabel: goal }),
    ["A part of you wants to hit back, and it's trying to help.", "You want to stay connected."]);
  for (const urgeId of Object.keys(fixture.expresses.ActionUrge)) {
    assert.deepEqual(lib.oaGoalLine(SHIPPED, { urgeId, goalLabel: goal }), lib.oaGoalLine(ALL, { urgeId, goalLabel: goal }), urgeId);
  }
  for (const id of IDS) assert.equal(lib.oaGoalLine(withoutIds(SHIPPED, id), { urgeId: "anger-lash", goalLabel: goal }), null, `shipped file without ${id}`);
});

test("every filled line fits the prompt's 90 characters", () => {
  for (const m of ALL.moves.filter((x) => !x.safetyLine)) {
    assert.ok(ALL.prompts.oa_goal_part.copy.replace("{move}", m.unblendPhrase).length <= 90, m.id);
  }
  for (const g of goals) assert.ok(ALL.prompts.oa_goal_you.copy.replace("{goal}", lib.goalPhrase(g.label)).length <= 90, g.id);
});

test("ext: er.goalLineShown is one bool, set only once the lines render", () => {
  assert.deepEqual(ext.EXT_SCHEMAS.er.goalLineShown, { t: "bool" });
  assert.equal(ext.validateExt({ er: { goalLineShown: true } }), JSON.stringify({ er: { goalLineShown: true } }));
  assert.throws(() => ext.validateExt({ er: { goalLineShown: "yes" } }), /boolean/);
  const hook = read("src/hooks/useOaGoalLine.ts");
  assert.match(hook, /const partsOn = useUserProfile\(\)\.profile\.partsEnabled;/);
  assert.match(hook, /if \(!partsOn\) return;\s*let live = true;\s*getPartsContent\(\)/, "parts content is read only with parts on");
  assert.match(hook, /const lines = partsOn && show \? oaGoalLine\(content, input\) : null;/);
  assert.match(hook, /if \(shown\) toolSession\.setExt\(\{ er: \{ goalLineShown: true \} \}\);/);
});

test("host: the effectiveness card's before slot, two body lines, OA's own goal label", () => {
  const oa = read("src/pages/tools/OppositeAction.tsx");
  assert.match(oa, /const EFFECTIVENESS_STEP = CHECK_STEPS\.indexOf\("effectiveness"\);/);
  assert.match(oa, /useOaGoalLine\(\s*\{\s*urgeId: draft\.urgeId \|\| null,\s*goalLabel: choices\.goal\?\.find\(\(o\) => o\.id === draft\.goal\)\?\.label \?\? null,\s*\},\s*stage === "check" && checkStep === EFFECTIVENESS_STEP,\s*\)/);
  assert.match(oa, /key="effectiveness"[\s\S]*?before=\{\s*goalLine && <GoalLine id=\{OA_GOAL_LINE_ID\} lines=\{goalLine\} \/>\s*\}/);
  // The two lines as a polite status line (it arrives after the card), shared with the review harness.
  assert.match(read("src/components/tools/oppositeAction/GoalLine.tsx"),
    /<div id=\{id\} role="status" className="space-y-1" data-testid="goal-line">\s*<p>\{lines\[0\]\}<\/p>\s*<p>\{lines\[1\]\}<\/p>/);
  // Above the question, and read with it: the focused question is described by the line, only while it shows.
  assert.match(oa, /key="effectiveness"[\s\S]*?describedBy=\{goalLine \? OA_GOAL_LINE_ID : undefined\}/);
  assert.match(read("src/components/tools/oppositeAction/TapCardLoop.tsx"), /<h3 ref=\{heading\} tabIndex=\{-1\} aria-describedby=\{describedBy\}/);
  // Only the effectiveness card has it.
  assert.equal((oa.match(/<GoalLine /g) ?? []).length, 1);
  // No hard-coded copy: the lines and the goal labels are content.
  for (const f of ["src/pages/tools/OppositeAction.tsx", "src/lib/oaGoalLine.ts", "src/hooks/useOaGoalLine.ts"]) {
    const code = read(f).replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, "");
    for (const s of ["A part of you", "trying to help", "You want to"]) assert.ok(!code.includes(s), `${f}: ${s}`);
    for (const g of goals) assert.ok(!code.includes(g.label) && !code.includes(lib.goalPhrase(g.label)), `${f}: ${g.label}`);
    for (const m of ALL.moves) assert.ok(!code.includes(m.unblendPhrase), `${f}: ${m.unblendPhrase}`);
  }
  assert.doesNotMatch(read("scripts/parts/content.py"), /Stay connected|Protect a boundary|Make progress on something|Repair harm|Act with self-respect/, "goal labels stay OA's");
});

test("the sign-off pack lists the surface under Do the Opposite", () => {
  const doc = execFileSync("node", ["scripts/parts/review.mjs"], { encoding: "utf8" });
  const at = doc.search(/^### \d+\. Do the Opposite$/m);
  assert.ok(at > 0);
  const section = doc.slice(at, doc.indexOf("\n### ", at + 1));
  for (const id of IDS) assert.ok(section.includes(`| \`${id}\` | ${fixture.prompts[id].copy} |`), id);
});
