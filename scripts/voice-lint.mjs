#!/usr/bin/env node
/**
 * The witness voice lint (WMP-01 A, E3 §A5.2.4). One implementation, imported by the tests and by
 * scripts/load-graph.mjs; the Python build scripts don't re-implement the rules.
 *
 *   lintText(text, ctx)       regex rules for one string in a scope (validation | feeling_copy | user_copy)
 *   lintLine(row)             one ValidationLine: text + textNamed + structural rules
 *   lintCorpus(rows)          every line → findings [{id, field, rule, severity, message}]
 *   corpusFromCypher(src)     the rows build.py writes after each `// @corpus-json ` marker
 *   flowDocStrings(src, file) every string in a generated file's contentJson / copyJson, with a path
 *   lintFlowDocs(files)       those strings as user copy → findings [{file, path, rule, severity}]
 *   lintFlowOrder(steps)      receive_before_change for a flow that declares steps[].kind (none do yet)
 *   gateProblems(fileNames)   what scripts/load-graph.mjs refuses to send
 *
 * CLI:
 *   node scripts/voice-lint.mjs            lint the committed corpus + flow docs; exit 1 on errors or new flow-doc findings
 *   node scripts/voice-lint.mjs --write-baseline   regenerate scripts/witness/voice-baseline.json from today's flow docs
 *                                          (only ever to shrink it: new findings are fixed in the source, not baselined)
 *   node scripts/voice-lint.mjs --report   also print a table over src/**\/*.tsx JSX text and hand-written schema copy
 *                                          (acknowledgment, psAcknowledgment, validationText, userFacingLabel …); never fails
 *
 * Never linted: anything the user writes (OwnLine text).
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const RULES_FILE = join(root, 'scripts/witness/voice-rules.json');
export const BASELINE_FILE = join(root, 'scripts/witness/voice-baseline.json');
export const WITNESS_FILE = join(root, 'schema/witness.cypher');
/** Generated flow documents whose user copy is linted against the baseline (E3 §A5.2.4 (c)). */
export const FLOW_DOC_FILES = [
  'schema/find-the-feeling.cypher', 'schema/invalidation-recovery.cypher', 'schema/capacity.cypher',
  'schema/opposite-action-flow.cypher', 'schema/practice-spine.cypher', 'schema/please.cypher',
];

export const RULESET = JSON.parse(readFileSync(RULES_FILE, 'utf8'));
const REGEX = RULESET.rules.map((r) => ({ ...r, re: new RegExp(r.pattern, r.flags.includes('g') ? r.flags : `${r.flags}g`) }));
const STRUCT = Object.fromEntries(RULESET.structural.map((r) => [r.id, r]));

export const SLOTS = ['N', 'word', 'phrase', 'need'];
export const MAX_CHARS = 90;
export const FLOODED_MAX_WORDS = 8;
const SLOT_TOKEN = 'xxxxxxxx'; // a slot counts as 8 characters / one word
const LEVEL6_WORTH = /\b(strong|brave|amazing|special|worthy|deserve\w*)\b/i;

/** Curly quotes → straight, so the rules match what the user sees. */
const norm = (t) => String(t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const filled = (t) => norm(t).replace(/\{(\w+)\}/g, SLOT_TOKEN);
const words = (t) => filled(t).trim().split(/\s+/).filter(Boolean).length;

/** Regex rules for one string in a scope. Findings: [{rule, severity, message, match}]. Report-only included. */
export function lintText(text, ctx = { scope: 'validation' }) {
  const t = norm(text);
  const out = [];
  for (const r of REGEX) {
    const severity = r.severity[ctx.scope];
    if (!severity) continue;
    r.re.lastIndex = 0;
    const m = r.re.exec(t);
    if (m) out.push({ rule: r.id, severity, message: r.message, match: m[0] });
  }
  return out;
}

function struct(id, extra = {}) {
  const r = STRUCT[id];
  return { rule: id, severity: r.severity.validation ?? 'error', message: r.message, ...extra };
}

/**
 * One ValidationLine row (as build.py writes it): {id, text, textNamed, level, voice, bands, kind,
 * tentative, underneath[], status, reviewStatus, reviewedAt}. Findings carry the field they're about.
 */
export function lintLine(row) {
  const out = [];
  const fields = [['text', row.text], ...(row.textNamed ? [['textNamed', row.textNamed]] : [])];
  for (const [field, t] of fields) {
    for (const f of lintText(t, { scope: 'validation' })) out.push({ ...f, field });
    if (filled(t).length > MAX_CHARS) out.push(struct('max_length', { field, match: `${filled(t).length} chars` }));
    const slots = [...norm(t).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const bad = slots.filter((s) => !SLOTS.includes(s));
    if (bad.length) out.push(struct('slots', { field, match: bad.map((s) => `{${s}}`).join(' ') }));
    if ((row.bands ?? []).includes('flooded') && (words(t) > FLOODED_MAX_WORDS || !(row.level <= 2))) {
      out.push(struct('flooded_short', { field, match: `level ${row.level}, ${words(t)} words` }));
    }
    if (row.level === 6 && LEVEL6_WORTH.test(norm(t))) out.push(struct('level6_capacity', { field, match: norm(t).match(LEVEL6_WORTH)[0] }));
  }
  if (/\{N\}/.test(row.text)) out.push(struct('slots', { field: 'text', match: 'text has {N}' }));
  const namedHasN = row.textNamed ? /\{N\}/.test(row.textNamed) : false;
  if ((row.voice === 'name') !== namedHasN) out.push(struct('slots', { field: 'textNamed', match: `voice ${row.voice}, {N} ${namedHasN ? 'present' : 'absent'}` }));
  if (row.level === 3 && !(row.tentative === true && (row.underneath ?? []).length > 0)) {
    out.push(struct('level3_tentative', { field: 'level' }));
  }
  if (row.level !== 3 && row.tentative === true) out.push(struct('level3_tentative', { field: 'tentative', match: 'tentative outside level 3' }));
  if (row.status === 'live' && !(row.reviewStatus === 'reviewed' && row.reviewedAt)) out.push(struct('reviewed_live', { field: 'status' }));
  return out;
}

/** Every line in a corpus. Only error/warn findings; report-only rules never apply to validation lines. */
export function lintCorpus(rows) {
  return rows.flatMap((row) => lintLine(row).map((f) => ({ id: row.id, ...f })));
}

/** The corpus rows build.py writes as single-line JSON after `// @corpus-json ` markers. */
export function corpusFromCypher(src) {
  const rows = [];
  for (const m of src.matchAll(/^\/\/ @corpus-json (.+)$/gm)) rows.push(...JSON.parse(m[1]));
  return rows;
}

/** Strings inside every `contentJson = "…"` / `copyJson = "…"` in a generated file, with JSON paths. */
export function flowDocStrings(src, file) {
  const out = [];
  const re = /\b(\w+)\.(contentJson|copyJson) = ("(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(src))) {
    let doc;
    try { doc = JSON.parse(JSON.parse(m[3])); } catch { continue; }
    const owner = src.slice(Math.max(0, src.lastIndexOf('MERGE', m.index)), m.index).match(/\{id: ["']([^"']+)["']\}/)?.[1] ?? m[1];
    const walk = (v, path) => {
      if (typeof v === 'string') out.push({ file, path, text: v });
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(doc, `${owner}.${m[2]}`);
  }
  return out;
}

/** Flow-doc copy as user copy. Findings with severity error / warn (report-only dropped). */
export function lintFlowDocs(files = FLOW_DOC_FILES) {
  const out = [];
  for (const file of files) {
    const src = readFileSync(resolve(root, file), 'utf8');
    for (const s of flowDocStrings(src, file)) {
      for (const f of lintText(s.text, { scope: 'user_copy' })) {
        if (f.severity === 'report') continue;
        out.push({ file, path: s.path, rule: f.rule, severity: f.severity, match: f.match });
      }
    }
  }
  return out;
}

/**
 * receive_before_change (dormant until a flow declares step kinds): in `steps[]`, the first step
 * of kind `change` must come after a step of kind `receive`. Findings: [{rule, severity, match}].
 */
export function lintFlowOrder(steps = []) {
  const kinds = steps.map((s) => s?.kind).filter(Boolean);
  const change = kinds.indexOf('change');
  if (change < 0 || kinds.slice(0, change).includes('receive')) return [];
  const r = STRUCT.receive_before_change;
  return [{ rule: r.id, severity: r.severity.flow, message: r.message, match: `change at step ${change + 1}` }];
}

/** Flow documents in `files` whose contentJson declares steps[].kind, checked for receive before change. */
export function lintFlowDocOrder(files = FLOW_DOC_FILES) {
  const out = [];
  for (const file of files) {
    const src = readFileSync(resolve(root, file), 'utf8');
    for (const m of src.matchAll(/\b\w+\.contentJson = ("(?:[^"\\]|\\.)*")/g)) {
      let doc;
      try { doc = JSON.parse(JSON.parse(m[1])); } catch { continue; }
      if (Array.isArray(doc?.steps) && doc.steps.some((st) => st?.kind)) {
        for (const f of lintFlowOrder(doc.steps)) out.push({ file, ...f });
      }
    }
  }
  return out;
}

export const findingKey = (f) => `${f.file}|${f.path}|${f.rule}`;

/** Flow-doc findings not in the baseline, and baseline entries that no longer fail (both must be empty). */
export function compareBaseline(findings, baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))) {
  const have = new Set(findings.map(findingKey));
  const base = new Set(baseline.entries.map(findingKey));
  return {
    fresh: findings.filter((f) => !base.has(findingKey(f))),
    stale: baseline.entries.filter((e) => !have.has(findingKey(e))),
  };
}

/**
 * The loader's gate (scripts/load-graph.mjs): errors in the corpus, or new flow-doc findings, in
 * the files about to load. Returns human-readable problems ([] = go).
 */
export function gateProblems(fileNames) {
  const problems = [];
  if (fileNames.includes('witness.cypher')) {
    for (const f of lintCorpus(corpusFromCypher(readFileSync(WITNESS_FILE, 'utf8')))) {
      if (f.severity === 'error') problems.push(`witness ${f.id} ${f.field}: ${f.rule} (${f.match ?? ''}) ${f.message}`);
    }
  }
  const flow = FLOW_DOC_FILES.filter((f) => fileNames.includes(f.replace(/^schema\//, '')));
  if (flow.length) {
    const { fresh } = compareBaseline(lintFlowDocs(flow).filter((f) => flow.includes(f.file)),
      { entries: JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).entries.filter((e) => flow.includes(e.file)) });
    for (const f of fresh) problems.push(`${f.file} ${f.path}: ${f.rule} (${f.match}) — new copy outside the voice contract`);
    for (const f of lintFlowDocOrder(flow)) problems.push(`${f.file}: ${f.rule} (${f.match}) ${f.message}`);
  }
  return problems;
}

// ---- report over legacy copy (never fails) ----
const REPORT_PROPS = ['acknowledgment', 'psAcknowledgment', 'validationText', 'userFacingLabel', 'combinedUserFacingLabel'];

function tsxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

async function report() {
  const ts = (await import('typescript')).default;
  const rows = [];
  for (const file of tsxFiles(join(root, 'src'))) {
    const src = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxText(node)) {
        const text = node.getText().replace(/\s+/g, ' ').trim();
        if (text.length > 1) {
          for (const f of lintText(text, { scope: 'user_copy' })) {
            rows.push({ where: `${relative(root, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`, rule: f.rule, severity: f.severity, text });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  for (const name of readdirSync(join(root, 'schema')).filter((f) => f.endsWith('.cypher'))) {
    const src = readFileSync(join(root, 'schema', name), 'utf8');
    for (const prop of REPORT_PROPS) {
      for (const m of src.matchAll(new RegExp(`\\.${prop}\\s*=\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`, 'g'))) {
        const text = m[2];
        const findings = [...lintText(text, { scope: 'validation' })];
        if (filled(text).length > MAX_CHARS) findings.push({ rule: 'max_length', severity: 'error' });
        for (const f of findings) rows.push({ where: `schema/${name} ${prop}`, rule: f.rule, severity: f.severity, text: text.slice(0, 80) });
      }
    }
  }
  const byRule = {};
  for (const r of rows) byRule[r.rule] = (byRule[r.rule] ?? 0) + 1;
  console.log('\nVoice report (legacy copy; informational, never fails)\n');
  for (const r of rows) console.log(`${r.rule.padEnd(18)} ${r.severity.padEnd(6)} ${r.where.padEnd(56)} ${r.text}`);
  console.log(`\n${rows.length} finding(s):`, byRule);
}

async function main() {
  if (process.argv.includes('--write-baseline')) {
    const entries = lintFlowDocs().map(({ file, path, rule }) => ({ file, path, rule }));
    writeFileSync(BASELINE_FILE, `${JSON.stringify({
      about: 'Flow-document copy that broke the voice contract when the lint landed (A5-1). Only ever shrinks: fix the source, then remove the entry (npm test fails on a stale entry).',
      entries,
    }, null, 2)}\n`);
    console.log(`wrote ${relative(root, BASELINE_FILE)}: ${entries.length} entr(ies)`);
    return;
  }
  const rows = corpusFromCypher(readFileSync(WITNESS_FILE, 'utf8'));
  const corpus = lintCorpus(rows).filter((f) => f.severity === 'error');
  for (const f of corpus) console.error(`✗ ${f.id} ${f.field}: ${f.rule} (${f.match ?? ''}) ${f.message}`);
  const { fresh, stale } = compareBaseline(lintFlowDocs());
  for (const f of fresh) console.error(`✗ ${f.file} ${f.path}: ${f.rule} (${f.match}) new copy outside the voice contract`);
  for (const e of stale) console.error(`! baseline entry no longer fails, remove it: ${findingKey(e)}`);
  const order = lintFlowDocOrder();
  for (const f of order) console.error(`✗ ${f.file}: ${f.rule} (${f.match}) ${f.message}`);
  console.log(`voice lint: ${rows.length} lines, ${corpus.length} corpus error(s), ${fresh.length} new flow-doc finding(s), ${stale.length} stale baseline entr(ies)`);
  if (process.argv.includes('--report')) await report();
  if (corpus.length || fresh.length || stale.length || order.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
