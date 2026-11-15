// Thoughts passing through part 2 (DT-08; docs/design/thoughts-passing.md): the `thoughtDrift` embed's rules.
// Slow it down shows the caught thought a word at a time; the leaf carries it across a stream at its own pace, and a
// thought that comes back gets the next leaf. The skill's slow and leaf steps hand their screen to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const D = await importTs("src/lib/thoughtDrift.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "thoughts_passing");

test("the thought: the first pick with words, spaces folded", () => {
  assert.equal(D.thoughtLine(["  ", "I'm  too\nmuch ", "own words"]), "I'm too much");
  assert.equal(D.thoughtLine(undefined), "");
});

test("slowed down: the first word at once, the last by 80% of the dose, at most 24 words", () => {
  const words = D.thoughtWords("they think I am a burden to everyone");
  assert.equal(words.length, 8);
  assert.equal(D.wordsShown(0, 8), 1);
  assert.equal(D.wordsShown(0.4, 8), 5);
  assert.equal(D.wordsShown(0.79, 8), 8);
  assert.equal(D.wordsShown(1, 8), 8);
  assert.equal(D.wordsShown(0.5, 0), 0);
  const long = D.thoughtWords(Array.from({ length: 30 }, (_, i) => `w${i}`).join(" "));
  assert.equal(long.length, D.MAX_WORDS);
  assert.equal(long.at(-1), "w23…");
});

test("the leaf: its words cut at a word, and it drifts across, never thrown", () => {
  assert.equal(D.leafLabel("short one"), "short one");
  const cut = D.leafLabel("I always ruin everything and everyone can see it every single time");
  assert.ok(cut.length <= D.LEAF_CHARS);
  assert.match(cut, /\w…$/);
  assert.equal(D.leafAt(-5), 0);
  assert.equal(D.leafAt(D.LEAF_CROSS_MS / 2), 0.5);
  assert.equal(D.leafAt(D.LEAF_CROSS_MS * 2), 1);
  assert.ok(D.LEAF_CROSS_MS >= 15000, "slow on purpose: the leaf's pace, not the person's");
});

test("the skill: slow and leaf show the caught thought; the leaf has Another leaf; the screen stays a timer", () => {
  const step = (id) => skill.steps.find((s) => s.id === id);
  for (const [id, sec] of [["slow", 30], ["leaf", 45]]) {
    assert.equal(step(id).embed, "thoughtDrift");
    assert.equal(step(id).props.variant, id);
    assert.equal(step(id).props.field, "catch");
    assert.equal(step(id).props.seconds, sec);
  }
  assert.equal(step("leaf").props.another, "leaf_another");
  assert.equal(step("slow").props.another, undefined);
  assert.equal(skill.copy.leaf_another, "Another leaf");
  assert.equal(step("screen").embed, "doseTimer");
  assert.doesNotMatch(Object.values(skill.copy).join(" "), /float (it )?(off|away)|get rid/i, "watching, never pushing it away");
});

test("the embed: registered in the player with props and outputs mirrored in content.py", () => {
  const ts = readFileSync("src/components/skillPlayer/embeds.ts", "utf8");
  assert.match(ts, /thoughtDrift: ThoughtDrift,/);
  assert.match(ts, /thoughtDrift: \{ ids: \['done', 'partly', 'skipped'\], measures: \['durationSec', 'doneCount'\] \}/);
  const comp = readFileSync("src/components/skillPlayer/ThoughtDrift.tsx", "utf8");
  assert.match(comp, /reduceMotion/, "reduced motion: no drifting, no fading");
});
