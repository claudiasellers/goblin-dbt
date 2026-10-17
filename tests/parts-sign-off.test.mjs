// scripts/parts/sign-off.mjs, always on a temp copy of the parts sources (never the real content.py):
// --all marks every draft but PENDING, --surface marks what the pack lists for that surface (and its
// vocabulary), a second run changes nothing, --dry-run writes nothing, the result still builds, and
// signing off never switches anything on.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadIds, signOff, surfaceIds, withSignedOff } from "../scripts/parts/sign-off.mjs";
import { loadContent, loadGates, render, surfaces } from "../scripts/parts/review.mjs";

const REAL = readFileSync("scripts/parts/content.py", "utf8");

function sandbox({ pending = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "parts-sign-off-"));
  // content.py reads its siblings' sources (Recover's, Find the feeling's, …), so the whole scripts/ tree.
  cpSync("scripts", join(root, "scripts"), { recursive: true, filter: (f) => !/__pycache__|node_modules/.test(f) });
  mkdirSync(join(root, "schema"));
  mkdirSync(join(root, "tests/fixtures"), { recursive: true });
  writeFileSync(join(root, "schema/parts.cypher"), readFileSync("schema/parts.cypher"));
  writeFileSync(join(root, "tests/fixtures/parts-content.json"), readFileSync("tests/fixtures/parts-content.json"));
  if (pending) {
    const f = join(root, "scripts/parts/content.py");
    const src = readFileSync(f, "utf8");
    assert.match(src, /^PENDING = \{\}$/m);
    writeFileSync(f, src.replace(/^PENDING = \{\}$/m, `PENDING = ${JSON.stringify(pending)}`));
  }
  const content = () => readFileSync(join(root, "scripts/parts/content.py"), "utf8");
  const run = async (...args) => {
    const out = [];
    const code = await signOff([...args, "--root", root], (s) => out.push(s));
    return { code, out: out.join("\n") };
  };
  return { root, content, run };
}
const signedOf = (src) => {
  const m = src.match(/^SIGNED_OFF = \{([^}]*)\}/m);
  return Object.fromEntries([...m[1].matchAll(/"([^"]+)": "([^"]+)",/g)].map((x) => [x[1], x[2]]));
};
const outsideLiteral = (src) => src.replace(/^SIGNED_OFF = \{[^}]*\}/m, "SIGNED_OFF = <>");

test("the real content.py is untouched and still signs nothing off", () => {
  assert.match(REAL, /^SIGNED_OFF = \{\}$/m);
});

test("withSignedOff: the literal only, sorted, one per line; empty stays {}", () => {
  const src = "A = 1\nSIGNED_OFF = {}\n\n\ndef review_status(i):\n    return i\n";
  const out = withSignedOff(src, { b: "2026-10-20", a: "2026-10-19" });
  assert.equal(out, 'A = 1\nSIGNED_OFF = {\n    "a": "2026-10-19",\n    "b": "2026-10-20",\n}\n\n\ndef review_status(i):\n    return i\n');
  assert.equal(withSignedOff(out, {}), src);
});

test("--all: every draft the build marks, PENDING skipped and listed; never switches anything on; it still builds", async () => {
  const s = sandbox({ pending: { meet_find: "waits on a test" } });
  const before = s.content();
  const { code, out } = await s.run("--all", "--date", "2026-10-20");
  assert.equal(code, 0, out);
  const after = s.content();
  assert.equal(outsideLiteral(after), outsideLiteral(before), "nothing else in the file changes");
  const signed = signedOf(after);
  const ids = loadIds(s.root);
  assert.deepEqual(Object.keys(signed).sort(), ids.ids.map((x) => x.id).filter((id) => id !== "meet_find").sort());
  assert.ok(Object.values(signed).every((d) => d === "2026-10-20"));
  assert.match(out, /Skipped \(PENDING, waiting on something else\): meet_find \(waits on a test\)/);
  assert.match(out, /node scripts\/load-graph\.mjs --only parts/);
  assert.match(out, /firebase deploy --only hosting/);
  assert.ok(!ids.ids.some((x) => x.kind === "other"), "every id has a kind");
  // Nothing switched on: the policy and every rule as they were.
  const cypher = readFileSync(join(s.root, "schema/parts.cypher"), "utf8");
  assert.match(cypher, /offersEnabled: false/);
  assert.doesNotMatch(cypher, /MERGE \(t:TrailRule[^\n]*\n[^\n]*enabled: true/);
  assert.match(cypher, /reviewStatus: "approved"/);
  // The edited file imports and builds; the fixture was rebuilt from it.
  execFileSync("python3", ["-c", "import sys; sys.path.insert(0, 'scripts/parts'); import content"], { cwd: s.root });
  execFileSync("python3", ["scripts/parts/build.py"], { cwd: s.root, stdio: ["ignore", "ignore", "pipe"] });
  const fixture = JSON.parse(readFileSync(join(s.root, "tests/fixtures/parts-content.json"), "utf8"));
  assert.equal(fixture.prompts.meet_where.reviewStatus, "approved");
});

test("--surface meet: exactly what the pack lists for Meet a part, plus the moves and hurts it shows", async () => {
  const s = sandbox();
  const { code, out } = await s.run("--surface", "meet", "--date", "2026-10-20");
  assert.equal(code, 0, out);
  // What the pack lists under Meet a part, read off the rendered document (groups and choices).
  const doc = render(loadContent(), await loadGates());
  const start = doc.indexOf("### 3. Meet a part");
  const section = doc.slice(start, doc.indexOf("\n### ", start + 1));
  const listed = [...section.matchAll(/^\| (?:[^|]*\| )?`([^`]+)` \|/gm)].map((m) => m[1]);
  const ids = loadIds(s.root);
  const want = new Set([...listed, ...ids.moves, ...ids.hurts]);
  assert.ok(listed.includes("meet_find") && listed.includes("keep_yes"), "the section parses");
  assert.deepEqual(Object.keys(signedOf(s.content())).sort(), [...want].sort());
  const meet = surfaces(await loadGates()).find((x) => x.id === "meet");
  assert.deepEqual(new Set(surfaceIds(meet, ids)), want);
});

test("a second run changes nothing and keeps the dates; --dry-run writes nothing; unknown surfaces or ids stop it", async () => {
  const s = sandbox();
  await s.run("--ids", "meet_find,settings_label", "--date", "2026-10-20");
  const once = s.content();
  const cypher = readFileSync(join(s.root, "schema/parts.cypher"), "utf8");
  const { code, out } = await s.run("--ids", "meet_find,settings_label", "--date", "2026-11-01");
  assert.equal(code, 0);
  assert.match(out, /2 already signed off \(dates kept\)/);
  assert.equal(s.content(), once);
  assert.deepEqual(signedOf(once), { meet_find: "2026-10-20", settings_label: "2026-10-20" });
  // A wider run keeps the old dates too.
  await s.run("--surface", "settings", "--date", "2026-11-01");
  assert.equal(signedOf(s.content()).settings_label, "2026-10-20");
  assert.equal(signedOf(s.content()).settings_blurb, "2026-11-01");

  const d = sandbox();
  const before = d.content();
  const dry = await d.run("--all", "--dry-run");
  assert.equal(dry.code, 0);
  assert.match(dry.out, /^Would sign off \d+ ids/);
  assert.equal(d.content(), before);
  assert.equal(readFileSync(join(d.root, "schema/parts.cypher"), "utf8"), readFileSync("schema/parts.cypher", "utf8"));

  const bad = await d.run("--surface", "nope");
  assert.equal(bad.code, 2);
  assert.match(bad.out, /Unknown surface: nope\. Valid: unblend, angry, meet,/);
  assert.equal((await d.run("--ids", "meet_find,not_an_id")).code, 2);
  await assert.rejects(d.run("--all", "--ids", "meet_find"), /exactly one of/);
  assert.equal(d.content(), before);
  assert.ok(cypher.length > 0);
});
