// The voice contract for parts copy (scripts/voice-lint.mjs): the three parts scopes, the role-label,
// blame and ideation rules, the `// @parts-copy-json` rows with their per-kind length and slot limits,
// and the guarantee that none of it moves a finding on copy that was already committed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RULESET, lintText, lintCorpus, corpusFromCypher, lintFlowDocs, compareBaseline, gateProblems,
  partsCopyFromCypher, lintPartsCopy, PARTS_SLOT_WIDTH, PARTS_KINDS, BASELINE_FILE,
} from "../scripts/voice-lint.mjs";

const rules = (text, scope) => lintText(text, { scope }).map((f) => f.rule);
const part = (text, kind) => lintPartsCopy([{ id: "x", field: "copy", kind, text }]);
const partRules = (text, kind) => part(text, kind).map((f) => f.rule);

// rule → [parts_prompt, parts_chip, parts_voice]; null = the rule doesn't apply in that scope
const MATRIX = {
  no_interpretation: ["error", "error", null],
  no_cheer: ["error", "error", "error"],
  no_emoji: ["error", "error", "error"],
  and_not_but: ["error", "error", null],
  no_minimising: ["error", "error", null],
  no_should: ["error", "error", null],
  no_diagnosis: ["error", "error", null],
  no_physiology: ["error", "error", "report"],
  voice_distance: ["error", null, null],
  no_role_labels: ["error", "error", "error"],
  no_role_manager: ["error", "error", "error"],
  no_part_blame: ["error", "error", "error"],
  no_ideation_echo: ["error", "error", "error"],
};
const SCOPES = ["parts_prompt", "parts_chip", "parts_voice"];

test("severity matrix: every regex rule × parts scope, cell by cell", () => {
  assert.deepEqual(Object.keys(MATRIX).sort(), RULESET.rules.map((r) => r.id).sort());
  for (const r of RULESET.rules) {
    SCOPES.forEach((scope, i) => assert.equal(r.severity[scope] ?? null, MATRIX[r.id][i], `${r.id} × ${scope}`));
  }
});

test("severity: the new rules outside the parts scopes", () => {
  const sev = (id) => RULESET.rules.find((r) => r.id === id).severity;
  assert.deepEqual(sev("no_role_labels"), { parts_prompt: "error", parts_chip: "error", parts_voice: "error", validation: "error", user_copy: "warn" });
  assert.deepEqual(sev("no_role_manager"), { parts_prompt: "error", parts_chip: "error", parts_voice: "error" });
  assert.deepEqual(sev("no_part_blame"), { parts_prompt: "error", parts_chip: "error", parts_voice: "error", validation: "error" });
  assert.deepEqual(sev("no_ideation_echo"), { parts_prompt: "error", parts_chip: "error", parts_voice: "error", validation: "error", user_copy: "report" });
  for (const id of ["parts_max_length", "parts_slots"]) {
    assert.deepEqual(RULESET.structural.find((r) => r.id === id).severity, { parts_prompt: "error", parts_chip: "error", parts_voice: "error" }, id);
  }
});

test("no_role_labels: plain 'burden' passes, role words fail", () => {
  assert.ok(!rules("Asking isn't a burden. Guessing is.", "validation").includes("no_role_labels"));
  assert.ok(!rules("Asking isn't a burden. Guessing is.", "user_copy").includes("no_role_labels"));
  assert.ok(!rules("I'd be a burden", "parts_chip").includes("no_role_labels"));
  assert.ok(rules("Meet your exile", "parts_prompt").includes("no_role_labels"));
  for (const w of ["firefighter", "unburdening", "legacy burden", "Self-energy", "trailheads"]) {
    assert.ok(rules(`About the ${w}`, "parts_prompt").includes("no_role_labels"), w);
  }
});

test("no_role_manager: a boss in app copy, a role label in parts copy", () => {
  assert.ok(!rules("I told my manager", "user_copy").includes("no_role_manager"));
  assert.ok(!rules("I told my manager", "validation").includes("no_role_manager"));
  assert.ok(rules("I told my manager", "parts_prompt").includes("no_role_manager"));
  assert.ok(rules("The managers keep you safe", "parts_chip").includes("no_role_manager"));
});

test("no_ideation_echo: death and disappearing words fail in parts copy; user copy is report-only", () => {
  for (const ok of ["the deadline", "skills", "Studied it", "a diet"]) assert.ok(!rules(ok, "parts_chip").includes("no_ideation_echo"), ok);
  assert.ok(rules("I'd disappear", "parts_chip").includes("no_ideation_echo"));
  assert.deepEqual(partRules("I'd disappear", "chip"), ["no_ideation_echo"]);
  for (const bad of ["You could vanish", "I want to die", "end it all", "not wake up", "They'd be better off without me"]) {
    assert.ok(rules(bad, "parts_prompt").includes("no_ideation_echo"), bad);
  }
  const ftf = lintText("Disappear", { scope: "user_copy" }).find((f) => f.rule === "no_ideation_echo");
  assert.equal(ftf.severity, "report", "Find the feeling's own chip stays the person's choice");
});

test("no_part_blame: a part wants, the person acts", () => {
  assert.ok(!rules("A part of you wanted to hit back, and you waited", "parts_prompt").includes("no_part_blame"));
  assert.ok(rules("A part of you made you say it", "parts_prompt").includes("no_part_blame"));
  assert.ok(rules("The part forced me", "parts_chip").includes("no_part_blame"));
  assert.ok(rules("That part makes you freeze", "validation").includes("no_part_blame"));
});

test("parts_voice: unsoftened protector voices pass, the safety rules still fail", () => {
  assert.deepEqual(part("Just agree", "voice"), []);
  assert.deepEqual(part("You always do this", "voice"), []);
  assert.deepEqual(part("Don't let them see", "voice"), []);
  assert.ok(partRules("Kill it", "voice").includes("no_ideation_echo"));
  assert.ok(partRules("Don't let them see!", "voice").includes("no_cheer"));
  assert.ok(partRules("You're such a manager", "voice").includes("no_role_manager"));
  // physiology is report-only in a part's voice, so it never reaches the findings
  assert.deepEqual(part("Your nervous system is fried", "voice"), []);
});

test("parts_chip has no voice_distance; parts_prompt does", () => {
  assert.deepEqual(part("I can say no", "chip"), []);
  assert.deepEqual(part("I felt brushed off.", "first_person"), [], "the person's own sentence: its I is theirs");
  assert.ok(partRules("I felt {felt}.", "prompt").includes("voice_distance"));
  assert.ok(partRules("I can say no", "prompt").includes("voice_distance"));
  assert.deepEqual(part("How do you feel toward it right now?", "prompt"), []);
});

test("\"Me\" the screen passes voice_distance in parts copy; \"me\" and an opening \"Me\" still fail", () => {
  assert.deepEqual(part("It's in Me when you want it.", "prompt"), []);
  assert.deepEqual(part("You'll find it in Me.", "prompt"), []);
  assert.ok(partRules("It's in me when you want it.", "prompt").includes("voice_distance"));
  assert.ok(partRules("Tell me more.", "prompt").includes("voice_distance"));
  assert.ok(partRules("Me too.", "prompt").includes("voice_distance"), "a sentence's first word is the pronoun");
  assert.ok(partRules("Done. Me again.", "prompt").includes("voice_distance"));
  // Only parts copy: the witness corpus and other scopes are unchanged.
  assert.ok(lintText("It's in Me when you want it.", { scope: "validation" }).some((f) => f.rule === "voice_distance"));
});

test("findings carry the row's id, field and kind; report-only findings are dropped", () => {
  const [f] = lintPartsCopy([{ id: "meet_feel", field: "label", kind: "prompt", text: "Meet your exile" }]);
  assert.deepEqual(Object.keys(f).sort(), ["field", "id", "kind", "match", "message", "rule", "severity"]);
  assert.equal(f.id, "meet_feel");
  assert.equal(f.field, "label");
  assert.equal(f.kind, "prompt");
  assert.equal(f.match, "exile");
  assert.ok(lintPartsCopy([{ id: "x", field: "copy", kind: "voice", text: "Your vagus nerve" }]).every((x) => x.severity !== "report"));
});

test("parts_max_length per kind at the boundary", () => {
  const a = (n) => "a".repeat(n);
  for (const [kind, { maxChars }] of Object.entries(PARTS_KINDS)) {
    assert.ok(!partRules(a(maxChars), kind).includes("parts_max_length"), `${kind} at ${maxChars}`);
    assert.ok(partRules(a(maxChars + 1), kind).includes("parts_max_length"), `${kind} at ${maxChars + 1}`);
  }
  assert.equal(PARTS_KINDS.prompt.maxChars, 90);
  assert.equal(PARTS_KINDS.chip.maxChars, 60);
  assert.equal(PARTS_KINDS.voice.maxChars, 40);
  assert.equal(PARTS_KINDS.keepsake.maxChars, 90);
  assert.equal(PARTS_KINDS.first_person.maxChars, 90);
});

test("parts_max_length counts each slot at its width", () => {
  const a = (n) => "a".repeat(n);
  assert.ok(!partRules(`${a(90 - 24)}{name}`, "prompt").includes("parts_max_length"));
  assert.ok(partRules(`${a(90 - 24 + 1)}{name}`, "prompt").includes("parts_max_length"));
  assert.ok(!partRules(`${a(90 - 40)}{anchor}`, "prompt").includes("parts_max_length"));
  assert.ok(partRules(`${a(90 - 40 + 1)}{anchor}`, "prompt").includes("parts_max_length"));
  // a pull is as wide as the longest real one ("take up less room", 17) plus one
  assert.ok(!partRules(`${a(90 - 18 - 18)}{pull}{pull2}`, "prompt").includes("parts_max_length"));
  assert.ok(partRules(`${a(90 - 18 - 18 + 1)}{pull}{pull2}`, "prompt").includes("parts_max_length"));
  assert.ok(!partRules(`${a(90 - 24 - 24)}{A}{B}`, "keepsake").includes("parts_max_length"));
  assert.ok(partRules(`${a(90 - 24 - 24 + 1)}{A}{B}`, "keepsake").includes("parts_max_length"));
  // curly quotes are normalised before counting (one character each either way)
  assert.ok(!partRules(`I’d ${a(60 - 4)}`, "chip").includes("parts_max_length"));
  // the angry card's vote of confidence and its "I felt …" line
  assert.ok(!partRules(`${a(90 - 24 - 28)}{name}{matters}`, "prompt").includes("parts_max_length"));
  assert.ok(partRules(`${a(90 - 24 - 28 + 1)}{name}{matters}`, "prompt").includes("parts_max_length"));
  assert.ok(!partRules(`${a(90 - 24)}{felt}`, "first_person").includes("parts_max_length"));
  assert.ok(partRules(`${a(90 - 24 + 1)}{felt}`, "first_person").includes("parts_max_length"));
  assert.deepEqual(PARTS_SLOT_WIDTH, { name: 24, A: 24, B: 24, move: 32, pull: 18, pull2: 18, hurt: 28, goal: 32, context: 24, anchor: 40, month: 9, want: 20, N: 2, matters: 28, felt: 24, place: 10 });
});

test("parts_slots: only parts slots, only in prompts (all), keepsakes ({A} {B} {want}) and first-person lines ({felt})", () => {
  for (const s of Object.keys(PARTS_SLOT_WIDTH)) assert.ok(!partRules(`About {${s}}`, "prompt").includes("parts_slots"), s);
  assert.ok(partRules("About {thing}", "prompt").includes("parts_slots"), "unknown slot");
  assert.ok(partRules("About {word}", "prompt").includes("parts_slots"), "a witness slot is not a parts slot");
  assert.ok(partRules("I'm {name}", "chip").includes("parts_slots"));
  assert.ok(partRules("{name}", "voice").includes("parts_slots"));
  assert.ok(!partRules("{A} wants you safe", "keepsake").includes("parts_slots"));
  assert.ok(!partRules("Both want {want}", "keepsake").includes("parts_slots"));
  assert.ok(partRules("{name} wants you safe", "keepsake").includes("parts_slots"));
  assert.equal(part("{name} and {thing}", "keepsake").find((f) => f.rule === "parts_slots").match, "{name} {thing}");
  assert.deepEqual(part("I felt {felt}.", "first_person"), []);
  assert.ok(partRules("{name} felt {felt}.", "first_person").includes("parts_slots"));
  assert.ok(partRules("Both want {want}", "first_person").includes("parts_slots"));
});

test("an unknown kind is an error, never a silent skip", () => {
  const out = lintPartsCopy([{ id: "meet_feel", field: "copy", kind: "promtp", text: "How do you feel toward it right now?" }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "error");
  assert.equal(out[0].rule, "parts_slots");
  assert.match(out[0].message, /kind/);
  assert.equal(lintPartsCopy([{ id: "x", field: "copy", text: "Hello" }])[0].severity, "error", "missing kind");
  assert.equal(lintPartsCopy([{ id: "x", field: "copy", kind: "toString", text: "Hello" }])[0].severity, "error", "inherited key is not a kind");
});

test("the marker parser reads every `// @parts-copy-json` line and nothing else", () => {
  const src = [
    "// generated",
    '// @parts-copy-json [{"id":"meet_feel","field":"copy","kind":"prompt","text":"How do you feel toward it right now?"}]',
    'MERGE (p:PartsPrompt {id: "meet_feel"}) SET p += {copy: "How do you feel toward it right now?"};',
    '// @corpus-json [{"id":"not_parts","text":"ignored"}]',
    '// @parts-copy-json [{"id":"fear_burden","field":"label","kind":"chip","text":"I’d be a burden"}, {"id":"voice_hide","field":"copy","kind":"voice","text":"Don\'t let them see"}]',
  ].join("\n");
  const rows = partsCopyFromCypher(src);
  assert.deepEqual(rows.map((r) => r.id), ["meet_feel", "fear_burden", "voice_hide"]);
  assert.deepEqual(lintPartsCopy(rows), []);
  assert.deepEqual(partsCopyFromCypher("MATCH (n) RETURN n;"), []);
});

test("gateProblems on parts.cypher: no throw, and clean (absent today; once present its copy must pass)", () => {
  assert.deepEqual(gateProblems(["parts.cypher"]), []);
});

test("existing copy is untouched by the parts rules: corpus clean, flow docs on baseline, baseline unchanged", () => {
  assert.deepEqual(lintCorpus(corpusFromCypher(readFileSync("schema/witness.cypher", "utf8"))).filter((f) => f.severity === "error"), []);
  const { fresh, stale } = compareBaseline(lintFlowDocs());
  assert.deepEqual(fresh, []);
  assert.deepEqual(stale, []);
  assert.deepEqual(JSON.parse(readFileSync(BASELINE_FILE, "utf8")).entries, []);
});
