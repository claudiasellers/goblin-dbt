// Import a TypeScript module (and the relative .ts modules it imports) in a plain `node --test` run.
// Each file is transpiled with the repo's `typescript` into a temp dir mirroring the repo layout, with
// relative specifiers rewritten to the transpiled `.mjs` files. Type-only imports vanish in transpile;
// bare imports (packages) resolve from the repo's node_modules via an absolute path.
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const out = mkdtempSync(join(tmpdir(), "goblin-ts-"));
const done = new Map();

function resolveTs(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(c) && c.match(/\.tsx?$/)) return c;
  }
  throw new Error(`importTs: cannot resolve ${spec} from ${fromFile}`);
}

function build(file) {
  if (done.has(file)) return done.get(file);
  const target = join(out, relative(root, file)).replace(/\.tsx?$/, ".mjs");
  done.set(file, target);
  let js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const req = createRequire(file);
  js = js.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\2/g, (m, pre, q, spec) => {
    if (spec.startsWith(".")) {
      const dep = build(resolveTs(file, spec));
      return `${pre}${q}${pathToFileURL(dep).href}${q}`;
    }
    try {
      return `${pre}${q}${pathToFileURL(req.resolve(spec)).href}${q}`;
    } catch {
      return m;
    }
  });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, js);
  return target;
}

/** `await importTs("functions/src/spine/today.ts")` (path relative to the repo root). */
export async function importTs(path) {
  return import(pathToFileURL(build(resolve(root, path))).href);
}
