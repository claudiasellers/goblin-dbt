// The trails dry run (scripts/parts/trails-dry-run.mjs, its pure half scripts/lib/trailsDryRun.mjs) on
// the --records fixture: the expected candidates and statements, threshold overrides, --all printing
// no per-person key, and the CLI itself when the functions build is there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { importTs } from "./lib/importTs.mjs";
import { parseArgs, applySets, contentFromFixture, recordsFile, personReport, allReport, firstLine } from "../scripts/lib/trailsDryRun.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engine = await importTs("functions/src/parts/trails/index.ts");
const content = contentFromFixture(JSON.parse(readFileSync(resolve(root, "tests/fixtures/parts-content.json"), "utf8")));
const file = recordsFile(JSON.parse(readFileSync(resolve(root, "tests/fixtures/trails-records.json"), "utf8")));
const state = { ...content, partsOn: true, timeZone: file.timeZone, records: file.records, parts: file.parts };
const NOW = Date.parse("2026-10-16T12:00:00Z");
const opts = (over = {}) => ({ ...parseArgs(["--records", "tests/fixtures/trails-records.json"]), ...over });

test("the fixture content is switched off; the dry run treats every rule as enabled", () => {
  assert.ok(content.rules.every((r) => r.enabled === false));
  assert.equal(content.offersEnabled, false);
  const { lines } = personReport({ engine, state, now: NOW, opts: opts(), who: "fixture" });
  assert.equal(lines[1], "Every rule treated as enabled.");
});

test("--records: the expected candidates, ranked, with the statement an offer would say", () => {
  const { lines, run } = personReport({ engine, state, now: NOW, opts: opts(), who: "fixture" });
  const text = lines.join("\n");
  assert.equal(lines[0], firstLine({ records: "x" }));
  assert.match(text, /4 episodes with a move · 0 merge conflicts/);
  assert.deepEqual(run.candidates.map((c) => [c.ruleId, c.shape, c.moveIds.join(), c.contextId, c.partId]), [
    ["trail_move_in_context", "A", "hide", "ctx_trigger_someone", null],
    ["trail_known_part", "D", "hide", null, "7a1e0c52-3f4b-4d6a-9c1e-2b8f5d7e9a10"],
  ]);
  assert.match(text, /^1\. trail_move_in_context \(A\) {2}"When it's about someone, the pull is to hide\."$/m);
  assert.match(text, /^2\. trail_known_part \(D\) {2}"Was this ‹part 7a1e0c52›\?"$/m);
  assert.match(text, /episodes 4 · span 20\.58 days · tools 3 · share 0\.75/);
  // The Recover record merged into the Urge Surfing episode lent it "you're left out"; the tagged one is out of D.
  assert.match(text, /2026-09-27 20:00 +recovering-from-invalidation +it's about someone; you're left out; it's evening +PullOption:recover_hide/);
  const d = text.slice(text.indexOf("2. trail_known_part"));
  assert.doesNotMatch(d, /2026-10-04/, "the tagged episode is not D's evidence");
});

test("--set changes a threshold without editing content; unknown rules and fields stop it", () => {
  const { run } = personReport({ engine, state, now: NOW, opts: opts({ sets: ["trail_known_part.minEpisodes=4"] }), who: "fixture" });
  assert.deepEqual(run.candidates.map((c) => c.shape), ["A"]);
  const { run: r2 } = personReport({ engine, state, now: NOW, opts: opts({ sets: ["trail_move_in_context.contextShare=0.8"] }), who: "fixture" });
  assert.deepEqual(r2.candidates.map((c) => c.shape), ["D"]);
  assert.throws(() => applySets(content.rules, ["nope.minEpisodes=1"]), /no rule nope/);
  assert.throws(() => applySets(content.rules, ["trail_sequence.enabled=1"]), /not a threshold/);
  assert.throws(() => applySets(content.rules, ["trail_sequence.lift=many"]), /a number/);
  assert.equal(applySets(content.rules, ["trail_sequence.lift=1.5"]).find((r) => r.id === "trail_sequence").lift, 1.5);
  assert.equal(content.rules.find((r) => r.id === "trail_sequence").lift, 2, "the original rules are untouched");
});

test("--drafts says so on the first line", () => {
  const { lines } = personReport({ engine, state, now: NOW, opts: { ...opts(), records: null, uid: "x", drafts: true }, who: "x" });
  assert.match(lines[0], /^DRAFTS COUNTED/);
  assert.match(firstLine({}), /Approved EXPRESSES edges only/);
});

test("--all: aggregates only, no uid, record key or part id", () => {
  const empty = { ...content, partsOn: false, timeZone: null, records: [], parts: [] };
  const people = [{ state }, { state: empty }, { state }];
  const { lines, perRule, episodes } = allReport({ engine, people, now: NOW, opts: { ...opts(), records: null, all: true }, rules: content.rules });
  const text = lines.join("\n");
  assert.deepEqual(perRule, { trail_move_in_context: 2, trail_sequence: 0, trail_two_pulls: 0, trail_known_part: 2 });
  assert.deepEqual(episodes, [4, 0, 4]);
  assert.match(text, /People: 3 \(2 with a record in the window\)/);
  assert.match(text, /min 0 · median 4 · max 4/);
  for (const secret of ["u1:", "7a1e0c52", "fixture", "hide", "FeelingUrge", "2026-"]) assert.ok(!text.includes(secret), `--all printed ${secret}`);
});

test("arguments: exactly one mode; values required", () => {
  assert.throws(() => parseArgs([]), /exactly one/);
  assert.throws(() => parseArgs(["--uid", "a", "--all"]), /exactly one/);
  assert.throws(() => parseArgs(["--uid"]), /needs a value/);
  assert.throws(() => parseArgs(["--all", "--bogus"]), /Unknown argument/);
  assert.throws(() => parseArgs(["--all", "--now", "soon"]), /ISO/);
  assert.deepEqual(parseArgs(["--all", "--drafts", "--set", "a.minEpisodes=1", "--set", "b.lift=2"]).sets, ["a.minEpisodes=1", "b.lift=2"]);
});

test("the CLI never writes and runs the built engine", () => {
  const cli = readFileSync(resolve(root, "scripts/parts/trails-dry-run.mjs"), "utf8");
  assert.match(cli, /defaultAccessMode: neo4j\.session\.READ/);
  assert.match(cli, /executeRead/);
  assert.doesNotMatch(cli, /executeWrite|writeTransaction|\bCREATE\b|\bMERGE\b|\bSET\b|\bDELETE\b/);
  assert.match(cli, /npm --prefix functions run build/);
  assert.match(cli, /functions\/lib\/parts\/trails\/index\.js/);
});

test("the CLI on the --records fixture (when the functions build is present)", (t) => {
  if (!existsSync(resolve(root, "functions/lib/parts/trails/index.js"))) { t.skip("no functions build"); return; }
  const out = execFileSync(process.execPath, ["scripts/parts/trails-dry-run.mjs", "--records", "tests/fixtures/trails-records.json", "--now", "2026-10-16T12:00:00Z"], { cwd: root, encoding: "utf8" });
  assert.match(out, /^1\. trail_move_in_context \(A\) {2}"When it's about someone, the pull is to hide\."$/m);
  assert.match(out, /^2\. trail_known_part \(D\)/m);
});
