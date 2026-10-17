// Parts foundation (docs/design/parts.md, "The flood signal", signal 1): the entry gate's types are
// shared with the app, and getPartsEntry is registered everywhere CLAUDE.md says. The gate itself is
// pinned in functions/test/unit/parts.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");

for (const [file, marker] of [
  ["types.ts", "export type PartsEntry ="], ["sessionTypes.ts", "export interface PartSessionPatch"], ["keepTypes.ts", "export interface KeepPartRequest"],
  ["tagTypes.ts", "export interface TagPartRequest"],
  ["checkbackTypes.ts", "export interface SchedulePartCheckbackRequest"],
  ["statsTypes.ts", "export interface PartStats"],
  ["denTypes.ts", "export type PartLinkKind"],
]) {
  test(`types mirror: src/data/partsTypes.ts carries functions/src/parts/${file} unchanged (after the header)`, () => {
    const body = read(`functions/src/parts/${file}`).split("\n").slice(4).join("\n").trim();
    assert.ok(body.includes(marker), "server types moved; update the slice");
    assert.ok(read("src/data/partsTypes.ts").includes(body), `src/data/partsTypes.ts no longer mirrors ${file}`);
  });
}

test("parts callables: exported by name, pinned, in the auth matrix as signed-in, wrapped for the app", () => {
  assert.match(read("functions/src/index.ts"), /^export \{ getPartsEntry, startPartSession, savePartSession, keepPart, queuePartCandidate \} from '\.\/parts';$/m);
  const endpoints = JSON.parse(read("functions/test/fixtures/endpoints.json"));
  const matrix = read("functions/test/unit/auth-matrix.test.cjs");
  const authed = matrix.slice(matrix.indexOf("const AUTHED"), matrix.indexOf("const PUBLIC"));
  const service = read("src/services/parts.ts");
  assert.match(read("functions/src/index.ts"), /^export \{ renamePart, restPart, setAsidePart, restorePart, setPartTender, answerPartRevisit \} from '\.\/parts';$/m);
  for (const name of ["getPartsEntry", "startPartSession", "savePartSession", "keepPart", "queuePartCandidate",
    "renamePart", "restPart", "setAsidePart", "restorePart", "setPartTender", "answerPartRevisit",
    "schedulePartCheckback", "answerPartCheckback", "setPartAnchor"]) {
    assert.ok(name in endpoints, name);
    assert.ok(authed.includes(`'${name}'`), name);
    assert.match(service, new RegExp(`httpsCallable<.*>\\(functions, '${name}'\\)`), name);
  }
});

test("partsEnabled is a setting (off by default), never profile-layer data", async () => {
  assert.match(read("src/services/neo4j.ts"), /partsEnabled: false,/);
  assert.match(read("functions/src/account/index.ts"), /partsEnabled: false,/);
  // Never a profile slice or a profile field (comments may name the setting).
  const profileTypes = await importTs("functions/src/profile/types.ts");
  assert.ok(!profileTypes.SLICE_IDS.includes("partsEnabled"), "partsEnabled is a profile slice");
  for (const f of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    assert.doesNotMatch(read(f), /\bpartsEnabled\s*\??\s*:/, `${f}: partsEnabled is a profile field`);
  }
});

// Rule 4 (docs/design/parts.md): a Part is written only on the person's yes, and only by the part
// writers in functions/src/parts/keep.ts. deleteMyParts (parts/delete.ts) may only DETACH DELETE one.
test("single writer: only functions/src/parts/keep.ts MERGEs, CREATEs or SETs a :Part", () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const writers = [];
  for (const f of walk("functions/src").filter((x) => x.endsWith(".ts"))) {
    const src = read(f);
    // Variables bound to a :Part anywhere in the file (`(p:Part {`, `(p:Part)`, `(x:Part:…`).
    const vars = [...src.matchAll(/\((\w+):Part\b(?![A-Za-z])/g)].map((m) => m[1]);
    const createsOne = /\b(MERGE|CREATE)\s*\(\w*:Part\b(?![A-Za-z])/.test(src);
    const setsOne = vars.some((v) => new RegExp(`\\b(SET|REMOVE)\\s+[^\\n]*\\b${v}(\\.|\\s*\\+=|\\s*=|:)`).test(src));
    if (createsOne || setsOne) writers.push(f);
    if (f.endsWith("parts/delete.ts")) {
      for (const v of vars) assert.doesNotMatch(src, new RegExp(`\\b(SET|MERGE|CREATE)\\b[^\\n]*\\b${v}\\b`), `${f} may only DETACH DELETE a Part`);
    }
  }
  assert.deepEqual(writers, ["functions/src/parts/keep.ts"]);
  const keep = read("functions/src/parts/keep.ts");
  assert.match(keep, /MERGE \(p:Part \{key: \$partKey\}\)\s+ON CREATE SET p:UserData:ProfileItem/);
  for (const q of ["KEEP_NEW_QUERY", "KEEP_REVISIT_QUERY", "RENAME_PART_QUERY", "REST_PART_QUERY", "SET_ASIDE_PART_QUERY",
    "RESTORE_PART_QUERY", "SET_PART_TENDER_QUERY", "ANSWER_PART_REVISIT_QUERY", "PAUSE_PART_QUERY",
    "SET_PART_ANCHOR_QUERY"]) {
    assert.match(keep, new RegExp(`export const ${q} = `), `${q} lives in keep.ts`);
  }
});
