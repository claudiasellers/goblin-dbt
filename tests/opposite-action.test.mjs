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
const { oppositeActionRoute, oaResultExt, OA_RESULT_CLEARED, reflectionKey } = await importTs(
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
        // ER-03 item 5 (D9): a feeling that doesn't fit with an urge that seems helpful is serving another goal: clarify.
        fact === "unsure" || effectiveness === "unsure" || (fact === "not_fit" && effectiveness === "helpful")
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
test("the check's result is recorded as ids whatever the route; support asks no facts (data fix 3)", () => {
  const ID = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;
  const keys = new Set(Object.keys(OA_RESULT_CLEARED));
  for (const facts of flow.choices.facts.map((c) => c.id)) {
    for (const effectiveness of flow.choices.effectiveness.map((c) => c.id)) {
      const route = oppositeActionRoute(flow, "safe", facts, effectiveness);
      const er = oaResultExt("safe", facts, effectiveness, route);
      assert.deepEqual(er, { oaRoute: route, oaFacts: facts, oaEffect: effectiveness });
      for (const [k, v] of Object.entries(er)) {
        assert.ok(keys.has(k), `${k}: a key OA_RESULT_CLEARED clears`);
        assert.match(v, ID, `${k}: an id`);
      }
    }
  }
  // The urge fits and would help: a protector doing its job is kept too.
  assert.deepEqual(oaResultExt("safe", "fits", "helpful", "problem"), { oaRoute: "problem", oaFacts: "fits", oaEffect: "helpful" });
  for (const safety of ["unsafe", "unsure"]) {
    const route = oppositeActionRoute(flow, safety, "", "");
    assert.equal(route, "support");
    assert.deepEqual(oaResultExt(safety, "", "", route), { oaRoute: "support" });
    assert.deepEqual(oaResultExt(safety, "fits", "helpful", route), { oaRoute: "support" }, "stale answers are not sent");
  }
  // Anything that is not an id never reaches the session.
  assert.deepEqual(oaResultExt("safe", "it fits, I think", "", "clarify"), { oaRoute: "clarify" });
  assert.deepEqual(OA_RESULT_CLEARED, { oaFacts: null, oaEffect: null, oaRoute: null });
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
test("flow migration is the guided v2 content", () => {
  assert.equal(flow.version, "oa-guided-v2");
  assert.match(cypher, /p\.version = 'oa-guided-v2'/);
  assert.equal(flow.choices.willingness, undefined);
  assert.ok(Array.isArray(flow.sourceIds) && flow.sourceIds.length > 0);
});
test("all clinical branches have graph copy and unique choice IDs", () => {
  for (const route of ["support", "opposite", "problem", "clarify"])
    assert.ok(flow.copy[route]);
  for (const choices of Object.values(flow.choices))
    assert.equal(new Set(choices.map((c) => c.id)).size, choices.length);
});

test("the support route (danger, a boundary, not sure what's safe) shows the other-person resources and offers Ending careful, on every card and after an unsafe try", () => {
  const src = readFileSync("src/pages/tools/OppositeAction.tsx", "utf8");
  const block = src.slice(src.indexOf("const supportLinks"), src.indexOf("const toolLink"));
  assert.match(block, /<CrisisBanner variant="other_person" compact \/>/);
  assert.match(block, /\/tool\/ending-relationships\?frame=careful/);
  assert.match(block, /toolLink\("pause"\)/);
  // The safety card, both route cards, and the readout's *It felt unsafe* (its answer and the saved readout) all use
  // it; Pause never stands alone.
  assert.equal((src.match(/supportLinks\(\)/g) ?? []).length, 5);
  assert.doesNotMatch(src.replace(block, ""), /toolLink\("pause"\)/);
});
