// Do the Opposite's doors: picker logic (src/lib/oppositeActionPicker.ts) over the shipped picker content.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const content = JSON.parse(readFileSync("src/data/content/opposite-action-picker.json", "utf8")).content;
const { OPPOSITE_ACTION_DOORS, MAX_FEELINGS } = await importTs("src/data/oppositeActionDoors.ts");
const {
  doorsFrom, parentOfWord, toggleDoor, addWords, setWord, tapRank, inRankOrder, nearestApplicable, orderUrges,
} = await importTs("src/lib/oppositeActionPicker.ts");

const doors = doorsFrom(content);
const door = (parent) => doors.find((d) => d.parent === parent);

test("every door's anchor word works on that door's parent in the graph", () => {
  for (const d of OPPOSITE_ACTION_DOORS) {
    assert.equal(content.words[d.anchorWordId]?.parent, d.parent, d.anchorWordId);
    assert.equal(content.words[d.anchorWordId]?.applicable, true, d.anchorWordId);
  }
});

test("doors: the eight parents with words, in door order; envy has no words so no door", () => {
  assert.deepEqual(doors.map((d) => d.parent), ["fear", "anger", "sadness", "shame", "guilt", "disgust", "jealousy", "love"]);
  for (const d of doors) {
    assert.ok(d.label && d.urges.length && d.wordIds.length, d.parent);
  }
  assert.equal(door("shame").urges[0].label, "Hide or disappear", "a door leads with its most typical urge");
});

test("words route to the parent Opposite Action works on, not the feelings-wheel group", () => {
  assert.equal(parentOfWord(content, "worthless"), "shame");
  assert.equal(parentOfWord(content, "embarrassed"), "shame");
  assert.equal(parentOfWord(content, "disillusioned"), "sadness");
  assert.equal(parentOfWord(content, "jealous"), "jealousy");
  assert.equal(parentOfWord(content, "numb"), null);
  assert.equal(parentOfWord(content, "calm"), null);
  assert.equal(parentOfWord(content, "not_a_word"), null);
});

test("doors toggle, one pick per parent, never more than the limit", () => {
  let picks = [];
  picks = toggleDoor(picks, door("shame"));
  assert.deepEqual(picks, [{ parent: "shame", wordId: "ashamed", fromDoor: true }]);
  picks = toggleDoor(picks, door("fear"));
  picks = toggleDoor(picks, door("guilt"));
  assert.equal(picks.length, MAX_FEELINGS);
  assert.equal(toggleDoor(picks, door("love")), picks, "a fourth door is refused");
  picks = toggleDoor(picks, door("fear"));
  assert.deepEqual(picks.map((p) => p.parent), ["shame", "guilt"]);
});

test("chosen words replace a door's anchor, keep an earlier chosen word, and report what can't go in", () => {
  let picks = toggleDoor([], door("shame"));
  const r = addWords(picks, content, ["worthless", "humiliated", "numb", "anxious", "sad", "furious"]);
  assert.deepEqual(r.picks, [
    { parent: "shame", wordId: "worthless", fromDoor: false },
    { parent: "fear", wordId: "anxious", fromDoor: false },
    { parent: "sadness", wordId: "sad", fromDoor: false },
  ]);
  assert.deepEqual(r.skipped, ["numb"]);
  assert.deepEqual(r.overflow, ["furious"]);
  picks = setWord(r.picks, "shame", "exposed");
  assert.equal(picks[0].wordId, "exposed");
});

test("ranking: tap order is loudness, the last one ranks itself, tapping a ranked one takes it back", () => {
  const all = ["guilt", "fear", "shame"];
  let ranked = tapRank([], "shame", all);
  assert.deepEqual(ranked, ["shame"]);
  ranked = tapRank(ranked, "fear", all);
  assert.deepEqual(ranked, ["shame", "fear", "guilt"]);
  assert.deepEqual(tapRank(ranked, "fear", all), ["shame"]);
  assert.deepEqual(tapRank([], "fear", ["fear", "shame"]), ["fear", "shame"], "two feelings take one tap");
  const picks = all.map((parent) => ({ parent, wordId: parent, fromDoor: true }));
  assert.deepEqual(inRankOrder(picks, ["shame"]).map((p) => p.parent), ["shame", "guilt", "fear"]);
});

test("the square offers only words Opposite Action works on, nearest first", () => {
  assert.deepEqual(nearestApplicable(["calm", "numb", "anxious", "worried", "sad"], content, 2), ["anxious", "worried"]);
});

test("urges from the function follow the graph's order", () => {
  const order = door("fear").urges;
  const shuffled = [...order].reverse().map((u) => ({ ...u, small: "x" }));
  assert.deepEqual(orderUrges(shuffled, order).map((u) => u.id), order.map((u) => u.id));
  assert.deepEqual(orderUrges(shuffled, undefined), shuffled);
});
