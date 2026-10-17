// People with parts off don't download parts UI. parts-bundle-cost: Today, the session close, Me,
// Settings and Reflect import parts components only through lazy(), each behind its own Suspense with
// nothing in its place, and fetch them only once their eager gate holds. parts-bundle-cost-2: Meet a
// part is the one lazy tool (its gate in useToolGate stays eager, so a parts-off person never fetches
// the chunk), and the parts steps inside Recover and DEAR MAN are lazy, prefetched once their own gate
// holds. Pure gate helpers (src/lib/*, partsEnabled, surfaceReady, *Copy) stay eager; the parts
// callables are imported on demand. Problem Solve's PartLaterLine comes with the copy it needs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** host → [component, its lazy const, the named loader it shares with a prefetch (if any)] */
const HOSTS = {
  "src/components/today/TodayStack.tsx": [["PartCheckbackCard", "LazyCheckback"], ["TrailOfferCard", "LazyTrailOffer"]],
  "src/components/spine/SessionClose.tsx": [],
  "src/components/spine/PartTagSlot.tsx": [["PartTagRow", "LazyRow"]],
  "src/components/me/MeSection.tsx": [["PartsOfMe", "LazyPartsOfMe"], ["PartsOffCard", "LazyPartsOffCard"]],
  "src/pages/Tools.tsx": [],
  "src/pages/Profile.tsx": [["PartsSettings", "LazyPartsSettings"]],
  "src/pages/Insights.tsx": [["PartsReflect", "LazyPartsReflect"], ["TrailsReflect", "LazyTrailsReflect"]],
  "src/pages/ToolPage.tsx": [["MeetAPart", "LazyMeetAPart", "loadMeetAPart"]],
  "src/pages/tools/InvalidationRecovery.tsx": [["AngryPartCard", "LazyAngryPartCard", "loadAngryCard"]],
  "src/pages/tools/DearMan.tsx": [["CopeAheadStep", "LazyCopeAheadStep", "loadCope"], ["DebriefWho", "LazyDebriefWho", "loadWho"]],
  "src/pages/tools/ProblemSolve.tsx": [["PartLaterLine", "LazyPartLaterLine", "loadLater"]],
  "src/App.tsx": [["PartsDenPage", "LazyPartsDenPage"]],
  "src/hooks/useStepBackSlot.tsx": [["StepBackScreen", "LazyStepBackScreen", "loadStepBack"]],
};
const ALSO_NO_STATIC = ["src/hooks/useToolGate.ts", "src/contexts/TodayContext.tsx"];

/** Every non-type import specifier in a file (multi-line imports included). */
const importsOf = (src) => [...src.matchAll(/^import (?!type\b)[\s\S]*?from '([^']+)';/gm)].map((m) => m[1]);
/** Parts UI, the card-only helpers split out of the gate libs, and the parts callables. */
const PARTS_UI = /(?:^|\/)(?:components\/parts\/|parts\/[A-Z]|PartsOfMe$|PartTagRow$|PartsReflect$|TrailsReflect$|knownPartReview$|MeetAPart$|partCard$|trailOfferCard$|angryPartCopy$|services\/parts$|services\/meetAPart$)/;

test("hosts: no static import of a parts component, card helper or parts callable", () => {
  for (const f of [...Object.keys(HOSTS), ...ALSO_NO_STATIC]) {
    for (const spec of importsOf(read(f))) {
      assert.doesNotMatch(spec, PARTS_UI, `${f}: ${spec}`);
    }
  }
  // The pattern sees what it should.
  for (const s of ["../parts/PartCheckbackCard", "./PartTagRow", "./tools/MeetAPart", "../../lib/partCard", "../../services/parts", "../services/meetAPart"]) assert.match(s, PARTS_UI, s);
  for (const s of ["../../services/partsContent", "../../lib/angryPart", "../lib/trailOffer", "../../lib/partsOfMe"]) assert.doesNotMatch(s, PARTS_UI, s);
});

test("each one comes through lazy(), in its own Suspense", () => {
  for (const [f, rows] of Object.entries(HOSTS)) {
    const src = read(f);
    for (const [name, lazyName, loader] of rows) {
      const source = loader ? `${loader}\\(\\)` : `import\\('[^']*\\/${name}'\\)`;
      assert.match(src, new RegExp(`const ${lazyName} = lazy\\(\\(\\) => ${source}\\.then\\(\\(m\\) => \\(\\{ default: m\\.${name} \\}\\)\\)\\);`), `${f}: ${name} is lazy`);
      if (loader) assert.match(src, new RegExp(`const ${loader} = \\(\\) => import\\('[^']*\\/${name}'\\);`), `${f}: ${loader} loads ${name}`);
      // Meet a part is a whole page: it waits on the page's own loading state, as the gate does.
      const fallback = name === "MeetAPart" ? "<ToolLoading />" : "null";
      assert.match(src, new RegExp(`<Suspense fallback=\\{${esc(fallback)}\\}><${lazyName}[ />]`), `${f}: ${name} waits with ${fallback}`);
    }
  }
  // SessionClose reaches the row only through the slot, whose gate is eager.
  assert.match(read("src/components/spine/SessionClose.tsx"), /import \{ PartTagSlot \} from '\.\/PartTagSlot';/);
});

test("Meet a part and Wise mind are the lazy tools; Meet a part's gate stays eager and fetches the content on demand", () => {
  const page = read("src/pages/ToolPage.tsx");
  const tools = importsOf(page).filter((s) => s.startsWith("./tools/")).map((s) => s.slice("./tools/".length)).sort();
  assert.deepEqual(tools, ["CoolDown", "DearMan", "FindTheFeeling", "FiveSenses", "InvalidationRecovery", "OppositeAction", "Pause", "ProblemSolve", "UrgeSurfing"]);
  assert.equal((page.match(/\blazy\(/g) ?? []).length, 2, "two lazy tools");
  // Wise mind (not a parts surface): its own chunk, for everyone.
  assert.match(page, /const loadWiseMind = \(\) => import\('\.\/tools\/WiseMind'\);/);
  assert.match(page, /const LazyWiseMind = lazy\(\(\) => loadWiseMind\(\)\.then\(\(m\) => \(\{ default: m\.WiseMind \}\)\)\);/);
  assert.match(page, /<Suspense fallback=\{<ToolLoading \/>\}><LazyWiseMind stepBack=\{slot\} \/><\/Suspense>/, "with its parts form's slot (or null)");
  assert.match(page, /'wise-mind': WiseMind,/);
  assert.match(page, /'meet-a-part': MeetAPart,/);
  assert.match(page, /if \(tool\?\.id === 'meet-a-part' && partsOn\) void loadMeetAPart\(\)/, "prefetched only with parts on");
  const gate = read("src/hooks/useToolGate.ts");
  assert.match(gate, /if \(!gated \|\| !on\) return;[\s\S]*?import\('\.\.\/services\/meetAPart'\)\.then\(\(m\) => m\.loadMeetAPartContent\(\)\)/, "content only with parts on");
  assert.match(gate, /if \(!on\) return loading \? 'loading' : 'closed';/);
});

test("prefetch: each tool step is fetched once its gate holds, before it renders", () => {
  const ir = read("src/pages/tools/InvalidationRecovery.tsx");
  const loud = ir.slice(ir.indexOf("function LoudStep("), ir.indexOf("function LabelStep("));
  assert.match(loud, /useEffect\(\(\) => \{ if \(cardThisVisit\) void loadAngryCard\(\)\.catch\(/, "with the pull options");
  const dm = read("src/pages/tools/DearMan.tsx");
  assert.match(dm, /useEffect\(\(\) => \{ if \(copeShown\) void loadCope\(\)\.catch\(/);
  assert.match(dm, /useEffect\(\(\) => \{ if \(whoShown\) void loadWho\(\)\.catch\(/);
  // Problem Solve: the line's chunk comes with its copy; no line until both are there.
  assert.match(read("src/pages/tools/ProblemSolve.tsx"), /if \(!wantsPsLater \|\| parts\) return;[\s\S]*?Promise\.all\(\[getPartsContent\(\), loadLater\(\)\]\)\.then\(\(\[p\]\) => \{ if \(live\) setParts\(p\); \}\)/);
});

test("parts callables load on demand, with the same signature", () => {
  const cases = [
    ["src/pages/tools/InvalidationRecovery.tsx", "queuePartCandidate"],
    ["src/pages/tools/ProblemSolve.tsx", "queuePartCandidate"],
    ["src/components/me/MeSection.tsx", "answerPartCandidate"],
  ];
  for (const [f, fn] of cases) {
    assert.match(read(f), new RegExp(`const ${fn}: typeof import\\('\\.\\./\\.\\./services/parts'\\)\\.${fn} = \\(req\\) => import\\('\\.\\./\\.\\./services/parts'\\)\\.then\\(\\(m\\) => m\\.${fn}\\(req\\)\\);`), `${f}: ${fn}`);
  }
});

test("the gates stay eager; card-only helpers are imported only by their card", () => {
  const profile = read("src/pages/Profile.tsx");
  assert.match(profile, /import \{ partsSettingsCopy \} from '\.\.\/lib\/partsSettings';/);
  assert.match(profile, /setReady\(partsSettingsCopy\(c\) !== null\)/);
  assert.match(profile, /if \(!ready\) return null;\s*return <Suspense fallback=\{null\}><LazyPartsSettings /);
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /import \{ dismissCandidateRequest, partsOfMeCopy \} from '\.\.\/\.\.\/lib\/partsOfMe';/);
  assert.match(me, /import \{ partsMeOffCopy, partsOffCardShown \} from '\.\.\/\.\.\/lib\/partsSettings';/, "the switch card's gate");
  // The Tools list's parts flag is Meet a part's own gate (eager; its content check is fetched only with parts on).
  assert.match(read("src/pages/Tools.tsx"), /import \{ useToolGate \} from '\.\.\/hooks\/useToolGate';/);
  assert.match(me, /\{a\.id === 'my_parts' && partsCopy && partsContent && \(/, "only with parts on and its copy signed off");
  assert.match(read("src/contexts/TodayContext.tsx"), /from '\.\.\/lib\/trailOffer'/, "Today's gate helpers stay eager");
  assert.match(read("src/components/spine/PartTagSlot.tsx"), /if \(!tagRowGate\(\{ partsOn, toolId, thenVsNow, actedOnUrge, saved, content: parts \}\)\) return null;/);
  const insights = read("src/pages/Insights.tsx");
  assert.match(insights, /\{data\.parts && data\.parts\.length > 0 && <PartsReflect /);
  assert.match(insights, /return partsOn \? <Suspense fallback=\{null\}><LazyTrailsReflect \{\.\.\.p\} \/><\/Suspense> : null;/, "rule D's block: fetched only with parts on");
  // Rollup keeps a module whole: a gate module that imported these would pull them back into the entry.
  const only = {
    partCard: ["src/components/me/PartsOfMe.tsx"],
    trailOfferCard: ["src/components/parts/TrailOfferCard.tsx", "src/lib/knownPartReview.ts"],
    angryPartCopy: ["src/components/parts/AngryPartCard.tsx"],
    knownPartReview: ["src/components/insights/TrailsReflect.tsx"],
  };
  const srcFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? srcFiles(`${dir}/${d.name}`) : /\.tsx?$/.test(d.name) ? [`${dir}/${d.name}`] : []);
  for (const f of srcFiles("src")) {
    for (const spec of importsOf(read(f))) {
      for (const [mod, owner] of Object.entries(only)) {
        if (spec.endsWith(`/${mod}`)) assert.ok(owner.includes(f), `${f} imports ${mod}`);
      }
    }
  }
  for (const [mod, [owner]] of Object.entries(only)) assert.ok(importsOf(read(owner)).includes(`../../lib/${mod}`), `${owner} imports ${mod}`);
});
