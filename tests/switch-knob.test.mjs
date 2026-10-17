// Every on/off switch's knob is pinned to the left of its track. A button centres its content, so an
// absolute knob with no `left` starts mid-track: off then draws with the knob on the right and reads as on
// (Parts looked switched on after being turned off, 17 Oct).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function tsxFiles(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tsxFiles(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

const switchFiles = tsxFiles("src").filter((f) => readFileSync(f, "utf8").includes('role="switch"'));

test("every switch knob that slides with translate-x is pinned with left-0", () => {
  const knobs = switchFiles.flatMap((f) => {
    const src = readFileSync(f, "utf8");
    return [...src.matchAll(/className=\{`(absolute [^`$]*)\$\{[^}]*translate-x-/g)].map((m) => ({ f, cls: m[1] }));
  });
  assert.ok(knobs.length >= 2, "the settings toggle and the parts switch both have a sliding knob");
  for (const { f, cls } of knobs) assert.match(cls, /(^|\s)left-0(\s|$)/, `${f}: knob "${cls.trim()}" has no left-0`);
});
