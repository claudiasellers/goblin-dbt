// Scans the hand-built pages and their libraries for jumps to another tool (docs/design/dbt-modules-plan.md C4.1):
// a `/tool/<id>` path or a `linkTo('<id>'…)` call. tests/legacy-exits.test.mjs holds the scan to
// tests/fixtures/legacy-exits.json.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/pages/tools", "src/components/tools", "src/components/parts", "src/components/me", "src/lib"];
const PATTERNS = [/['"`]\/tool\/([a-z0-9-]+)/g, /\blinkTo\(\s*['"]([a-z0-9-]+)['"]/g];

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

/** Every (file, tool) jump, sorted, each once. */
export function scanLegacyExits() {
  const out = new Set();
  for (const root of ROOTS) {
    for (const f of files(root)) {
      if (f.startsWith("src/lib/skillRuntime/")) continue; // the runtime's exits are graph data (C4)
      const src = readFileSync(f, "utf8");
      for (const re of PATTERNS) for (const m of src.matchAll(re)) out.add(`${f} -> ${m[1]}`);
    }
  }
  return [...out].sort().map((s) => { const [from, to] = s.split(" -> "); return { from, to }; });
}
