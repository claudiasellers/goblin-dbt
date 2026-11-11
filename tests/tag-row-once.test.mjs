// The tag row is answered once per ToolSession per source on the client too (src/lib/tagRowOnce.ts): Find the
// feeling draws it in two places, Cool Down can remount it, DEAR MAN's Back returns to the debrief. In
// memory for the page's life, never in localStorage.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const once = await importTs("src/lib/tagRowOnce.ts");
const S1 = "11111111-2222-4333-8444-555555555555";
const S2 = "22222222-2222-4333-8444-555555555555";

test("the store: per ToolSession and per source, nothing before an answer", () => {
  once.resetTagRowAnswers();
  assert.equal(once.tagRowAnswered(S1, "close"), false);
  once.markTagRowAnswered(S1, "close");
  assert.equal(once.tagRowAnswered(S1, "close"), true);
  assert.equal(once.tagRowAnswered(S1, "debrief"), false, "a debrief is its own source");
  assert.equal(once.tagRowAnswered(S2, "close"), false, "another session");
  once.markTagRowAnswered(S1, "close");
  assert.equal(once.tagRowAnswered(S1, "close"), true, "idempotent");
  assert.equal(once.tagRowAnswered(null, "close"), false);
  assert.equal(once.tagRowAnswered(undefined, "close"), false);
  once.resetTagRowAnswers();
  assert.equal(once.tagRowAnswered(S1, "close"), false);
});

test("memory only: never browser storage", () => {
  const src = read("src/lib/tagRowOnce.ts").replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, "");
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(src, /const answered = new Set<string>\(\);/);
});

test("the row: a second mount for an answered session renders nothing; every answer marks it", () => {
  const row = read("src/components/spine/PartTagRow.tsx");
  assert.match(row, /const source = debrief \? 'debrief' : 'close';/);
  assert.match(row, /useState<'ask' \| 'later' \| 'shape' \| 'done' \| 'gone'>\(\(\) => \(tagRowAnswered\(toolSessionId, source\) \? 'gone' : 'ask'\)\)/,
    "read once at mount, so the instance being answered keeps going");
  assert.match(row, /if \(state === 'gone' \|\| !profile\.slices\) return null;/);
  assert.match(row, /const answered = \(\) => markTagRowAnswered\(toolSessionId, source\);/);
  assert.match(row, /const tag = \(c: TagChip\) => \{\s*answered\(\);/, "a part chip (the shape question follows in the same instance)");
  assert.match(row, /onClick=\{\(\) => \{ answered\(\); setState\('later'\); \}\}/, "A new one");
  assert.match(row, /const skip = \(\) => \{ answered\(\); fold\(\); \};/, "Skip");
  assert.match(row, /onClick=\{skip\}>\{copy\.skip\}/);
});

test("hosts: Find the feeling's two places, Cool Down's remount and DEAR MAN's Back all go through the store", () => {
  const ftf = read("src/pages/tools/FindTheFeeling.tsx");
  assert.equal((ftf.match(/\{tagRow\}/g) ?? []).length, 2, "two places, one PartTagSlot element");
  assert.match(read("src/components/spine/PartTagSlot.tsx"), /<PartTagRow /, "every slot renders the row, which reads the store");
  assert.match(read("src/pages/tools/CoolDown.tsx"), /\{pick === 'quieter' && \(\s*<PartTagSlot/);
  const card = read("src/components/parts/DebriefWho.tsx");
  assert.match(card, /<PartTagRow toolId="dear-man"[^>]* debrief /, "the general form: the row, source debrief");
  assert.match(card, /markTagRowAnswered\(toolSessionId, 'debrief'\)/, "the named form marks too");
  assert.match(read("src/components/skillPlayer/DebriefWhoEmbed.tsx"), /useState\(\(\) => tagRowAnswered\(session\.id, 'debrief'\)\)/, "Back skips an answered debrief (read on each arrival)");
});
