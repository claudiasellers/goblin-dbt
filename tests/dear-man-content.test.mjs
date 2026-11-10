// DEAR MAN's content source (docs/design/dbt-modules-plan.md C5, IE-B1): scripts/dear-man/content.py is the one
// editable source of the four schema/dear-man-*.cypher files. The files are what build.py generates, ids are
// unique per label, and every id the parts mappings name still exists (ids are permanent).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("schema/dear-man-*.cypher are what scripts/dear-man/build.py generates", () => {
  assert.doesNotThrow(() => execFileSync("python3", ["scripts/dear-man/build.py", "--check"], { encoding: "utf8" }));
});

const ids = JSON.parse(execFileSync("python3", ["-c", `
import sys, json; sys.path.insert(0, 'scripts/dear-man'); import content as C
lists = {k: v for k, v in vars(C).items() if k.isupper() and isinstance(v, (list, dict)) and k not in ('NEGOTIATE_HINTS', 'CONCEPT_COPY', 'ANCHOR_GENERATOR', 'DEBRIEF_RESPONSES', 'SAFETY_COPY')}
out = {}
for k, v in lists.items():
    rows = [r for rs in v.values() for r in rs] if isinstance(v, dict) else v
    out[k] = [r.get('id') or r.get('chip') for r in rows]
print(json.dumps(out))`], { encoding: "utf8" }));

test("ids are unique within each list", () => {
  for (const [k, v] of Object.entries(ids)) {
    if (k === "CHIP_GROUPS" || k.startsWith("MIRROR_") || k === "ASSERT_PROMPTS" || k === "ANCHOR_PHRASES_V1") continue; // rows that point at ids
    assert.equal(new Set(v).size, v.length, k);
  }
});

test("every DEAR MAN id the parts mappings name is in the content, and every one of those labels' ids is mapped", () => {
  const out = JSON.parse(execFileSync("python3", ["-c", `
import sys, json; sys.path.insert(0, 'scripts/dear-man')
import content as C
import importlib.util
spec = importlib.util.spec_from_file_location('parts_content', 'scripts/parts/content.py'); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
ours = {'MomentResponse': C.MOMENT_RESPONSES, 'TurningPoint': C.TURNING_POINTS, 'ThoughtPattern': C.THOUGHT_PATTERNS, 'DearManBarrier': C.BARRIERS}
print(json.dumps({k: {'ours': sorted(r['id'] for r in v), 'parts': sorted(set(P.EXPRESSES.get(k, {})) | set(P.HELD.get(k, {})))} for k, v in ours.items()}))`], { encoding: "utf8" }));
  for (const [label, { ours, parts }] of Object.entries(out)) assert.deepEqual(parts, ours, label);
});
