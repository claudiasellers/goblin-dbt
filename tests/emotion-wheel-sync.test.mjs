// Every check-in word in the app is an Emotion node in the graph, with the same name, quadrant and
// family. The app's list (src/data/emotions.ts) places the words on the square; the graph is where
// anything is known about them (routing aliases, body maps, related words), so a word the graph
// doesn't have is a word nothing can be said about. Add a new word to both in the same change.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = [...readFileSync("src/data/emotions.ts", "utf8")
  .matchAll(/makeEmotion\('([a-z_]+)', '([^']+)', '([a-z-]+)', '([a-z]+)'/g)]
  .map(([, id, name, quadrant, family]) => ({ id, name, quadrant, family }));
const graph = new Map([...readFileSync("schema/emotion-wheel-sync.cypher", "utf8")
  .matchAll(/\{id: "([a-z_]+)", name: "([^"]+)", quadrant: "([^"]+)", family: "([a-z]+)"\}/g)]
  .map(([, id, name, quadrant, family]) => [id, { id, name, quadrant, family }]));

test("the app's word list was read (guards the regexes)", () => {
  assert.ok(app.length >= 140, `${app.length} app words`);
  assert.ok(graph.size >= 140, `${graph.size} graph words`);
});

test("every check-in word in the app is an Emotion node in the graph", () => {
  assert.deepEqual(app.filter((w) => !graph.has(w.id)).map((w) => w.id), []);
});

test("and the graph agrees with the app on its name, quadrant and family", () => {
  const diff = app.filter((w) => graph.has(w.id)).filter((w) => JSON.stringify(graph.get(w.id)) !== JSON.stringify(w));
  assert.deepEqual(diff.map((w) => ({ app: w, graph: graph.get(w.id) })), []);
});
