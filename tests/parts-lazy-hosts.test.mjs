// People with parts off don't download parts UI from the screens everyone opens (parts-bundle-cost): Today,
// the session close and Me import parts components only through lazy(), each behind its own Suspense
// with nothing in its place, and fetch them only once their eager gate holds. Pure gate helpers
// (src/lib/*, partsEnabled, surfaceReady) stay eager. Tool pages are not split (ToolPage doesn't
// lazy-load tools), so their parts imports are left as they are.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8");
const HOSTS = {
  "src/components/today/TodayStack.tsx": ["PartCheckbackCard", "TrailOfferCard"],
  "src/components/spine/SessionClose.tsx": [],
  "src/components/spine/PartTagSlot.tsx": ["PartTagRow"],
  "src/components/me/MeSection.tsx": ["PartsOfMe"],
  "src/pages/Profile.tsx": ["PartsSettings"],
};
/** A parts UI component: anything under components/parts/, Parts of me, the tag row. */
const PARTS_UI = /['"][./]*(?:components\/)?(?:parts\/[A-Za-z/]+|(?:me\/|\.\/)PartsOfMe|(?:spine\/|\.\/)PartTagRow)['"]/;

test("always-mounted hosts: no static import of a parts component", () => {
  for (const f of Object.keys(HOSTS)) {
    for (const line of read(f).split("\n").filter((l) => /^\s*import\b/.test(l) && !/^\s*import type\b/.test(l))) {
      assert.doesNotMatch(line, PARTS_UI, `${f}: ${line}`);
    }
  }
});

test("each one comes through lazy(), in its own Suspense with no fallback", () => {
  for (const [f, names] of Object.entries(HOSTS)) {
    const src = read(f);
    for (const n of names) {
      const lazyName = `Lazy${n === "PartCheckbackCard" ? "Checkback" : n === "TrailOfferCard" ? "TrailOffer" : n === "PartTagRow" ? "Row" : n}`;
      assert.match(src, new RegExp(`const ${lazyName} = lazy\\(\\(\\) => import\\('[^']*\\/${n}'\\)\\.then\\(\\(m\\) => \\(\\{ default: m\\.${n} \\}\\)\\)\\);`), `${f}: ${n} is lazy`);
      assert.match(src, new RegExp(`<Suspense fallback=\\{null\\}><${lazyName} [^>]*/></Suspense>`), `${f}: ${n} waits with nothing in its place`);
    }
  }
  // SessionClose reaches the row only through the slot, whose gate is eager.
  assert.match(read("src/components/spine/SessionClose.tsx"), /import \{ PartTagSlot \} from '\.\/PartTagSlot';/);
});

test("the gates stay eager: Settings checks its copy before fetching the block; Me and Today keep their gates", () => {
  const profile = read("src/pages/Profile.tsx");
  assert.match(profile, /import \{ partsSettingsCopy \} from '\.\.\/lib\/partsSettings';/);
  assert.match(profile, /setReady\(partsSettingsCopy\(c\) !== null\)/);
  assert.match(profile, /if \(!ready\) return null;\s*return <Suspense fallback=\{null\}><LazyPartsSettings /);
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /\{a\.id === 'my_parts' && partsCopy && partsContent && \(/, "only with parts on and its copy signed off");
  assert.match(read("src/contexts/TodayContext.tsx"), /from '\.\.\/lib\/trailOffer'/, "Today's gate helpers stay eager");
  assert.match(read("src/components/spine/PartTagSlot.tsx"), /if \(!tagRowGate\(\{ partsOn, toolId, thenVsNow, actedOnUrge, saved, content: parts \}\)\) return null;/);
});
