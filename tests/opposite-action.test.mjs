import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function importTs(path) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
}
const { oppositeActionRoute, reflectionKey } = await importTs(
  "src/lib/oppositeAction.ts",
);
const { validateOppositeActionSession } = await importTs(
  "functions/src/oppositeActionValidation.ts",
);
const cypher = readFileSync("schema/opposite-action-flow.cypher", "utf8");
const serialized = cypher.match(/p.contentJson = (.*);/)[1];
const flow = JSON.parse(JSON.parse(serialized));

test("every graph decision path preserves uncertainty and checks urge effectiveness", () => {
  for (const fact of ["fits", "not_fit", "excessive", "unsure"]) {
    for (const effectiveness of ["helpful", "unhelpful", "unsure"]) {
      assert.equal(
        oppositeActionRoute(flow, "safe", fact, effectiveness),
        fact === "unsure" || effectiveness === "unsure"
          ? "clarify"
          : effectiveness === "unhelpful"
            ? "opposite"
            : "problem",
      );
    }
  }
  for (const safety of ["unsafe", "unsure", "", "unexpected"]) {
    assert.equal(
      oppositeActionRoute(flow, safety, "not_fit", "unhelpful"),
      "support",
    );
  }
  assert.equal(
    oppositeActionRoute(flow, "safe", "missing", "unhelpful"),
    "clarify",
  );
});
test("reflection never treats unsafe practice as success even if intensity falls", () => {
  assert.equal(reflectionKey(8, 2, "unsafe"), "reflectionUnsafe");
  assert.equal(reflectionKey(8, 8, "partial"), "reflectionSame");
  assert.equal(reflectionKey(4, 8, "partial"), "reflectionHigher");
  assert.equal(reflectionKey(8, 4, "toward_goal"), "reflectionLower");
});
const valid = {
  id: "12345678-1234-4234-8234-123456789012",
  schemaVersion: 1,
  contentVersion: flow.version,
  emotionId: "anxious",
  parentId: "fear",
  urgeId: "fear_avoid",
  customUrge: "",
  situation: "work",
  observation: "",
  interpretation: "",
  goal: "progress",
  safety: "safe",
  facts: "not_fit",
  effectiveness: "unhelpful",
  intensityBefore: 6,
  intensityAfter: null,
  actionSize: "small",
  action: "Chosen action",
  cue: "Today",
  barrier: "none",
  backup: "",
  bodyPractice: true,
  willingness: "ready",
  status: "planned",
  outcome: "",
  reflection: "",
};
test("valid planned and practiced records are separate; retry ID and zero intensity survive", () => {
  assert.equal(validateOppositeActionSession(valid).id, valid.id);
  assert.equal(
    validateOppositeActionSession({
      ...valid,
      status: "practiced",
      outcome: "partial",
      intensityAfter: 0,
    }).intensityAfter,
    0,
  );
  assert.equal(
    validateOppositeActionSession({
      ...valid,
      userId: "attacker",
      sourceIds: ["invented"],
    }).userId,
    undefined,
  );
  assert.equal(
    validateOppositeActionSession({ ...valid, sourceIds: ["invented"] })
      .sourceIds,
    undefined,
  );
});
test("malformed, uncertain, unsafe, and incomplete sessions are rejected", () => {
  for (const patch of [
    { facts: "unsure" },
    { safety: "unsafe" },
    { effectiveness: "helpful" },
    { intensityBefore: 11 },
    { intensityBefore: NaN },
    { bodyPractice: false },
    { status: "practiced" },
    { outcome: "partial" },
    { action: "" },
    { action: "x".repeat(1501) },
    { barrier: "too_big" },
    { urgeId: "custom" },
    { cue: 1 },
  ]) {
    assert.throws(
      () => validateOppositeActionSession({ ...valid, ...patch }),
      JSON.stringify(patch),
    );
  }
  for (const value of [null, [], "", undefined])
    assert.throws(() => validateOppositeActionSession(value));
});
test("all clinical branches have graph copy and unique choice IDs", () => {
  for (const route of ["support", "opposite", "problem", "clarify"])
    assert.ok(flow.copy[route]);
  for (const choices of Object.values(flow.choices))
    assert.equal(new Set(choices.map((c) => c.id)).size, choices.length);
});
