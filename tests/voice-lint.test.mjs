// A5-1: the witness voice lint (scripts/voice-lint.mjs). Every rule has a pass and a fail fixture;
// the committed corpus passes; flow-document copy has no findings beyond the (shrink-only) baseline.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RULESET, lintText, lintLine, lintCorpus, corpusFromCypher, lintFlowDocs, compareBaseline,
  lintFlowOrder, lintFlowDocOrder, gateProblems, FLOW_DOC_FILES,
} from "../scripts/voice-lint.mjs";
import { LOAD_ORDER, voiceGate } from "../scripts/load-graph.mjs";

const rules = (text, scope = "validation") => lintText(text, { scope }).map((f) => f.rule);
const lineRules = (row) => lintLine({ voice: "you", bands: ["steady", "stirred"], level: 5, tentative: false, status: "draft", reviewStatus: "draft", underneath: [], ...row }).map((f) => f.rule);

// [rule, passes, fails] for the regex rules (validation scope)
const REGEX_FIXTURES = [
  ["no_interpretation", "That hurt. It makes sense it hurt.", "Both can be true: you are sensitive, and it was unkind."],
  ["no_cheer", "You did a hard thing.", "You did it!"],
  ["no_emoji", "That was a lot.", "That was a lot 💛"],
  ["and_not_but", "It hurt, and you can choose what happens next.", "It hurt, but you can choose what happens next."],
  ["no_should", "It makes sense you want to hide.", "You should feel proud of that."],
  ["no_diagnosis", "This is real pain.", "This is real pain, not oversensitivity."],
  ["voice_distance", "Your hurt makes sense.", "My hurt makes sense to me."],
  ["no_magnitude", "You feel exposed. Shame makes sense.", "Shame is crushing. Of course this is heavy."],
  ["intensity_check", "Something good happened. Of course you feel it.", "That is a huge relief."],
];

test("every rule in voice-rules.json has fixtures here", () => {
  const regexIds = RULESET.rules.map((r) => r.id).sort();
  assert.deepEqual(REGEX_FIXTURES.map(([id]) => id).sort(), regexIds);
  const structural = RULESET.structural.map((r) => r.id).sort();
  assert.deepEqual(structural, ["level3_tentative", "receive_before_change", "reviewed_live", "skip_always", "slots"]);
});

for (const [id, ok, bad] of REGEX_FIXTURES) {
  test(`rule ${id}: passes and fails`, () => {
    assert.ok(!rules(ok).includes(id), `${id} should not fire on: ${ok}`);
    assert.ok(rules(bad).includes(id), `${id} should fire on: ${bad}`);
  });
}

test("curly apostrophes are normalised before matching", () => {
  assert.ok(rules("They don’t care about you.").includes("no_interpretation"));
});

test("negative-intensity words are an error on witness lines; pleasant intensity is fine; ambiguous intensifiers only warn; measurement copy (how loud is it?, Louder/Quieter) is never flagged", () => {
  const sev = (text, scope) => lintText(text, { scope }).find((f) => f.rule === "no_magnitude")?.severity;
  for (const t of ["Shame is crushing.", "Of course this is heavy.", "Of course you are furious.", "This is devastating.", "Too loud to think."]) assert.equal(sev(t, "validation"), "error", t);
  assert.equal(sev("That is a huge relief.", "validation"), undefined, "pleasant intensity is not a magnitude error");
  assert.equal(lintText("This is massive.", { scope: "validation" }).find((f) => f.rule === "intensity_check")?.severity, "warn");
  assert.equal(sev("How loud is it right now?", "feeling_copy"), undefined, "asking about intensity is not validating it");
  assert.equal(sev("Louder", "user_copy"), undefined);
  assert.equal(sev("It's too loud in here", "feeling_copy"), "report");
});

test("lightened 2026-10-01: only diagnosis words block; the other style rules warn or report (Claudia)", () => {
  const sev = (text, rule) => lintText(text, { scope: "validation" }).find((f) => f.rule === rule)?.severity;
  assert.equal(sev("This is real pain, not oversensitivity.", "no_diagnosis"), "error");
  assert.equal(sev("It hurt, but you can choose.", "and_not_but"), "report");
  assert.equal(sev("They meant to hurt you.", "no_interpretation"), "report");
  assert.equal(sev("You did it!", "no_cheer"), "warn");
  assert.equal(sev("My hurt makes sense to me.", "voice_distance"), "warn");
  assert.equal(lintText("Great job!", { scope: "user_copy" }).find((f) => f.rule === "no_cheer").severity, "warn");
  // Gone: no physiology ban, no "just", no length or word limits, no level-6 word list.
  const r = lintLine({ id: "x", text: "Your nervous system is reacting. You do not have to feel brave or strong right now, you just have to take the next step, and that is fine for today.", voice: "you", level: 6, bands: ["flooded"], tentative: false, underneath: [], status: "draft", reviewStatus: "draft" });
  assert.deepEqual(r.filter((f) => f.severity === "error"), []);
});

test("structural: slots", () => {
  assert.ok(!lineRules({ text: "Being {phrase} hurts anyone." }).includes("slots"));
  assert.ok(lineRules({ text: "Being {thing} hurts anyone." }).includes("slots"), "unknown slot");
  assert.ok(lineRules({ text: "{N}, that hurt.", voice: "name", textNamed: "{N}, that hurt." }).includes("slots"), "text has {N}");
  assert.ok(!lineRules({ text: "Your hurt makes sense.", voice: "name", textNamed: "{N}'s hurt makes sense." }).includes("slots"));
  assert.ok(lineRules({ text: "Your hurt makes sense.", voice: "name", textNamed: "The hurt makes sense." }).includes("slots"), "name voice without {N}");
  assert.ok(lineRules({ text: "Your hurt makes sense.", voice: "you", textNamed: "{N}'s hurt makes sense." }).includes("slots"), "{N} without name voice");
});

test("structural: level 3 is a tentative guess with something underneath", () => {
  assert.ok(!lineRules({ text: "Maybe some of this is hurt.", level: 3, tentative: true, underneath: ["hurt"] }).includes("level3_tentative"));
  assert.ok(lineRules({ text: "Maybe some of this is hurt.", level: 3, tentative: true, underneath: [] }).includes("level3_tentative"));
  assert.ok(lineRules({ text: "Maybe some of this is hurt.", level: 3, tentative: false, underneath: ["hurt"] }).includes("level3_tentative"));
  assert.ok(lineRules({ text: "That hurt.", level: 5, tentative: true }).includes("level3_tentative"));
});

test("structural: a live line has been reviewed", () => {
  assert.ok(!lineRules({ text: "That hurt.", status: "draft", reviewStatus: "draft" }).includes("reviewed_live"));
  assert.ok(lineRules({ text: "That hurt.", status: "live", reviewStatus: "draft" }).includes("reviewed_live"));
  assert.ok(lineRules({ text: "That hurt.", status: "live", reviewStatus: "reviewed", reviewedAt: null }).includes("reviewed_live"));
  assert.ok(!lineRules({ text: "That hurt.", status: "live", reviewStatus: "reviewed", reviewedAt: "2026-09-30" }).includes("reviewed_live"));
});

test("structural: receive before change (dormant until a flow declares step kinds)", () => {
  assert.deepEqual(lintFlowOrder([{ kind: "receive" }, { kind: "change" }]), []);
  assert.deepEqual(lintFlowOrder([{ kind: "body" }]), []);
  assert.equal(lintFlowOrder([{ kind: "body" }, { kind: "change" }, { kind: "receive" }])[0].rule, "receive_before_change");
  assert.deepEqual(lintFlowDocOrder(), [], "no generated flow violates the order");
});

test("the three original Recover lines fail and their D-04 replacements pass", () => {
  const originals = [
    "Both can be true: {N} is sensitive to this, and it was unkind.",
    "Both can be true: this was wrong, and {N} gets to decide what to do with it.",
    "This is real pain, not oversensitivity. Rejection sets off alarm systems that overlap with physical pain.",
  ];
  const edits = [
    "Both can be true: {N} is sensitive to this, and it hurt.",
    "Both can be true: this felt wrong, and {N} gets to decide what happens next.",
    "This is real pain. Being pushed away hurts anyone.",
  ];
  const errs = (t) => lintLine({ id: "x", text: t.replace(/\{N\}/g, "you"), textNamed: /\{N\}/.test(t) ? t : null, voice: /\{N\}/.test(t) ? "name" : "none", level: 5, bands: ["steady"], tentative: false, underneath: [], status: "draft", reviewStatus: "draft" });
  for (const t of originals) assert.ok(errs(t).length > 0, t);
  assert.ok(errs(originals[2]).some((f) => f.rule === "no_diagnosis"));
  for (const t of edits) assert.deepEqual(errs(t), [], t);
});

test("the committed corpus passes (schema/witness.cypher)", () => {
  const rows = corpusFromCypher(readFileSync("schema/witness.cypher", "utf8"));
  assert.ok(rows.length >= 16);
  assert.deepEqual(lintCorpus(rows).filter((f) => f.severity === "error"), []);
});

test("flow-document copy: nothing new beyond the baseline, and the baseline has no stale entries", () => {
  const { fresh, stale } = compareBaseline(lintFlowDocs());
  assert.deepEqual(fresh, []);
  assert.deepEqual(stale, [], "a baseline entry no longer fails: remove it (the baseline only shrinks)");
  for (const f of FLOW_DOC_FILES) assert.ok(LOAD_ORDER.includes(f.replace("schema/", "")), f);
});

test("the loader's voice gate is clean for a full load and runs on the corpus", () => {
  assert.deepEqual(voiceGate(LOAD_ORDER), []);
  assert.deepEqual(gateProblems(["witness.cypher"]), []);
  const loader = readFileSync("scripts/load-graph.mjs", "utf8");
  assert.match(loader, /--skip-voice-lint/);
  assert.match(loader, /process\.exit\(5\)/);
});

test("VoiceRule nodes mirror voice-rules.json", () => {
  const cypher = readFileSync("schema/witness.cypher", "utf8");
  const ids = [...cypher.matchAll(/\{id: "([a-z0-9_]+)", pattern:/g)].map((m) => m[1]);
  assert.deepEqual(ids.sort(), [...RULESET.rules, ...RULESET.structural].map((r) => r.id).sort());
});
