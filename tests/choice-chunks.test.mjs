// The tools' seven-choice rule (Claudia, 18 Nov 2026; Miller's and Hick's laws): a tool screen offers at most
// seven choices at once and a longer set comes in chunks. Tools only: the check-in's lists are not chunked.
// Checked on the chunk maths, on every pick-list in the skill catalogue and on the Tools page's starter intents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const C = await importTs("src/lib/choiceChunks.ts");
const T = await importTs("src/data/tools.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));

/** Chips on screen: the chunk, the controls beside it, and the chunk control when there is more than one chunk. */
const onScreen = (k, reserved) => k.shown.length + reserved + (k.pages > 1 ? 1 : 0);

test("a list that fits is shown whole, with no chunk control", () => {
  const k = C.chunkOf([1, 2, 3, 4, 5, 6], 0, 1);
  assert.deepEqual(k.shown, [1, 2, 3, 4, 5, 6]);
  assert.equal(k.pages, 1);
});

test("a long list comes in chunks of at most seven chips, in its own order, and wraps back to the first", () => {
  const items = Array.from({ length: 24 }, (_, i) => i);
  const seen = [];
  const first = C.chunkOf(items, 0, 1);
  for (let p = 0; p < first.pages; p++) {
    const k = C.chunkOf(items, p, 1);
    assert.ok(onScreen(k, 1) <= C.MAX_CHOICES, `chunk ${p}: ${onScreen(k, 1)} chips`);
    seen.push(...k.shown);
  }
  assert.deepEqual(seen, items);
  assert.deepEqual(C.chunkOf(items, first.pages, 1).shown, first.shown);
});

test("a pick from another chunk stays in view, in place", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
  const k = C.chunkOf(items, 1, 0, (x) => x === "b");
  assert.deepEqual(k.shown, ["b", "g", "h", "i"]);
});

test("every pick-list in the skills shows seven chips or fewer at once", () => {
  const skills = Array.isArray(fixture.skills) ? fixture.skills : Object.values(fixture.skills);
  let lists = 0;
  for (const s of skills) {
    for (const st of s.steps) {
      for (const f of st.fields ?? []) {
        const list = f.options?.list ? s.options[f.options.list] ?? [] : [];
        if (!list.length) continue;
        lists++;
        const reserved = f.own && !f.own.open ? 1 : 0;
        const k = C.chunkOf(list, 0, reserved);
        for (let p = 0; p < k.pages; p++) {
          const n = onScreen(C.chunkOf(list, p, reserved), reserved);
          assert.ok(n <= C.MAX_CHOICES, `${s.id}/${st.id}/${f.id}: ${n} chips on chunk ${p}`);
        }
      }
    }
  }
  assert.ok(lists > 500, `walked ${lists} lists`);
});

test("the Tools page leads with six intents, each listed", () => {
  assert.equal(T.STARTER_INTENT_IDS.length, 6);
  for (const id of T.STARTER_INTENT_IDS) assert.ok(T.intents.some((i) => i.id === id), `${id} is listed`);
});
