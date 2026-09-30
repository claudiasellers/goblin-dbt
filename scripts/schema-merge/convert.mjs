#!/usr/bin/env node
/**
 * One-off, committed for audit (A1-4): the mechanical CREATE → MERGE rewrite of the base schema.
 * Reads the pre-conversion files from git (default rev 1ef08b9, main when the plan was written;
 * the schema files are identical on the M0 branch) and writes the converted files to schema/.
 * Deterministic: re-running it reproduces the committed output.
 *
 *   node scripts/schema-merge/convert.mjs            # write schema/*
 *   node scripts/schema-merge/convert.mjs --check    # exit 1 if schema/* differs from the output
 *   node scripts/schema-merge/convert.mjs --rev <git-rev>
 *
 * Transforms (E1 §A1.2.4):
 * - knowledge-graph.cypher: nodes only. `CREATE (v:L {id: "x", …})` → `MERGE (v:L {id: "x"}) SET v += {…};`
 *   (one self-contained statement each). All 349 inline relationships leave the file:
 *   relationships.cypher already declares 342 of them; the 7 it lacks are appended there.
 *   Comment sections left without statements (relationship headers, the commented DDL block)
 *   are dropped.
 * - relationships.cypher: `CREATE (a)-[:T {…}]->(b)` → `MERGE (a)-[r:T]->(b) SET r += {…}`.
 *   FELT_AS is a multi-edge and merges on `{region}`. No other property goes in a MERGE pattern.
 * - low-unpleasant-associations-patch.cypher: 26 `CREATE … FELT_AS … SET r.region` → MERGE on region.
 * - problem-solve-data.cypher: the file held its content twice (L1414–2827 == L1–1413); keep one copy.
 * - discriminating-questions.cypher: HAS_RESPONSE {order} / TRIGGERS_NEXT {reason} move out of the
 *   MERGE pattern into SET, so editing a value can't create a second edge.
 * - validation-queries.cypher (not loaded): `[:A|:B]` → `[:A|B]` (removed syntax in Neo4j 5).
 * incremental-update.cypher is deleted by hand (D-05: all 19 statements duplicate other files).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const rev = args.includes('--rev') ? args[args.indexOf('--rev') + 1] : '1ef08b9';
const check = args.includes('--check');
const src = (f) => execFileSync('git', ['show', `${rev}:schema/${f}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });

const relKey = (t, props) => {
  // FELT_AS is a multi-edge keyed by region; everything else merges on (start, type, end).
  if (t === 'FELT_AS') {
    const m = props.match(/^\{region:\s*"([^"]+)"\}$/);
    if (!m) throw new Error(`FELT_AS with properties other than region: ${props}`);
    return { key: ` {region: "${m[1]}"}`, rest: '' };
  }
  return { key: '', rest: props };
};
const mergeRel = (a, t, props, b) => {
  const { key, rest } = relKey(t, props);
  return rest ? `MERGE (${a})-[r:${t}${key}]->(${b})\nSET r += ${rest};` : `MERGE (${a})-[:${t}${key}]->(${b});`;
};

/** Drop `// ====` sections whose body has no statement (keeps the file header). */
function dropEmptySections(lines) {
  const isRule = (l) => /^\/\/ ={10,}/.test(l);
  const sections = [];
  let cur = { head: [], body: [] };
  for (let i = 0; i < lines.length; i++) {
    if (isRule(lines[i])) {
      // header block: rule, comment lines, rule
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('//') && !isRule(lines[j])) j++;
      if (j < lines.length && isRule(lines[j])) {
        sections.push(cur);
        cur = { head: lines.slice(i, j + 1), body: [] };
        i = j;
        continue;
      }
    }
    cur.body.push(lines[i]);
  }
  sections.push(cur);
  const hasStatement = (s) => s.body.some((l) => l.trim() && !l.trim().startsWith('//'));
  const out = [];
  sections.forEach((s, k) => {
    if (k <= 1 || hasStatement(s)) out.push(...s.head, ...s.body);
  });
  return out.join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/\s*$/, '\n');
}

// ---- knowledge-graph.cypher ----
const kg = src('knowledge-graph.cypher').split('\n');
const kgOut = [];
const vars = {};
const moved = [];
let nodes = 0;
for (let i = 0; i < kg.length; i++) {
  const m = kg[i].match(/^CREATE \(([a-z_0-9]+):([A-Za-z]+) \{$/);
  if (m) {
    let j = i + 1;
    const body = [];
    let id;
    while (!/^\}\)\s*$/.test(kg[j])) {
      const mm = kg[j].match(/^\s*id: "([^"]+)",?\s*$/);
      if (mm) id = mm[1]; else body.push(kg[j]);
      j++;
    }
    if (!id) throw new Error(`node without id at knowledge-graph.cypher:${i + 1}`);
    if (vars[m[1]]) throw new Error(`variable ${m[1]} declared twice`);
    vars[m[1]] = { label: m[2], id };
    if (body.length) body[body.length - 1] = body[body.length - 1].replace(/,\s*$/, '');
    kgOut.push(`MERGE (${m[1]}:${m[2]} {id: "${id}"})`);
    kgOut.push(body.length ? `SET ${m[1]} += {\n${body.join('\n')}\n};` : ';');
    nodes++;
    i = j;
    continue;
  }
  const r = kg[i].match(/^CREATE \(([a-z_0-9]+)\)-\[:([A-Z_]+)( \{[^}]*\})?\]->\(([a-z_0-9]+)\)$/);
  if (r) { moved.push({ a: r[1], t: r[2], p: (r[3] || '').trim(), b: r[4] }); continue; }
  if (/^\s*CREATE\b/.test(kg[i])) throw new Error(`unrecognised CREATE at knowledge-graph.cypher:${i + 1}`);
  kgOut.push(kg[i]);
}
const kgHeaderEnd = kgOut.findIndex((l, k) => k > 0 && /^\/\/ ={10,}/.test(l));
kgOut.splice(kgHeaderEnd, 0,
  '//',
  '// NODES ONLY. Converted to MERGE (A1-4): each node is `MERGE (v:Label {id})` + `SET v += {…}`,',
  '// one self-contained statement, safe to re-run. Relationships live in relationships.cypher;',
  '// constraints and indexes in constraints.cypher (loaded first). Never load this file alone',
  '// (`--only knowledge-graph` refuses without --force): later files override some properties.');
const files = { 'knowledge-graph.cypher': dropEmptySections(kgOut) };

// ---- relationships.cypher ----
const rs = src('relationships.cypher').split('\n');
const rOut = [];
const have = new Set();
let pend = null;
for (const line of rs) {
  const m = line.match(/^MATCH \(([a-z_0-9]+):([A-Za-z]+) \{id: "([a-z_0-9]+)"\}\), \(([a-z_0-9]+):([A-Za-z]+) \{id: "([a-z_0-9]+)"\}\)$/);
  if (m) pend = { [m[1]]: [m[2], m[3]], [m[4]]: [m[5], m[6]] };
  const c = line.match(/^CREATE \(([a-z_0-9]+)\)-\[:([A-Z_]+)( \{[^}]*\})?\]->\(([a-z_0-9]+)\);$/);
  if (c) {
    const { key } = relKey(c[2], (c[3] || '').trim());
    have.add(`${pend[c[1]].join(':')}-${c[2]}${key}->${pend[c[4]].join(':')}`);
    rOut.push(mergeRel(c[1], c[2], (c[3] || '').trim(), c[4]));
    continue;
  }
  if (/^\s*CREATE\b/.test(line)) throw new Error(`unrecognised CREATE in relationships.cypher: ${line}`);
  rOut.push(line);
}
const extra = [];
for (const x of moved) {
  const a = vars[x.a];
  const b = vars[x.b];
  const { key } = relKey(x.t, x.p);
  const k = `${a.label}:${a.id}-${x.t}${key}->${b.label}:${b.id}`;
  if (have.has(k)) continue;
  have.add(k);
  extra.push(`MATCH (${x.a}:${a.label} {id: "${a.id}"}), (${x.b}:${b.label} {id: "${b.id}"})\n${mergeRel(x.a, x.t, x.p, x.b)}`);
}
let rText = rOut.join('\n')
  .replace('// Uses MATCH to find existing nodes by their id property\n', '// Uses MATCH to find existing nodes by their id property\n// MERGE on (start, TYPE, end), FELT_AS also on region; other properties via SET r += {…} (A1-4)\n')
  .replace(/\s*$/, '\n');
rText += ['', '', '// ============================================================', '// MOVED FROM knowledge-graph.cypher (relationships only it declared; A1-4)', '// ============================================================', '', extra.join('\n\n'), ''].join('\n');
files['relationships.cypher'] = rText;

// ---- low-unpleasant-associations-patch.cypher ----
let lp = src('low-unpleasant-associations-patch.cypher');
const lpBefore = (lp.match(/CREATE \(e\)-\[(r2?):FELT_AS\]->\(s\)\nSET \1\.region = "([^"]+)";/g) || []).length;
lp = lp.replace(/CREATE \(e\)-\[(r2?):FELT_AS\]->\(s\)\nSET \1\.region = "([^"]+)";/g, 'MERGE (e)-[:FELT_AS {region: "$2"}]->(s);');
files['low-unpleasant-associations-patch.cypher'] = lp;

// ---- problem-solve-data.cypher: one copy ----
const ps = src('problem-solve-data.cypher').split('\n');
const half = ps.slice(0, 1413).join('\n');
if (half !== ps.slice(1414, 2827).join('\n')) throw new Error('problem-solve-data.cypher halves differ; re-check before cutting');
files['problem-solve-data.cypher'] = half + '\n';

// ---- discriminating-questions.cypher: no properties inside relationship MERGE patterns ----
let dq = src('discriminating-questions.cypher');
const dqHas = (dq.match(/MERGE \(q\)-\[:HAS_RESPONSE \{order: \d+\}\]->\(r\);/g) || []).length;
dq = dq.replace(/MERGE \(q\)-\[:HAS_RESPONSE \{order: (\d+)\}\]->\(r\);/g, 'MERGE (q)-[h:HAS_RESPONSE]->(r)\nSET h.order = $1;');
const dqTrig = (dq.match(/MERGE \(r\)-\[:TRIGGERS_NEXT \{\n\s*reason: ("(?:[^"\\]|\\.)*")\n\}\]->\(q\);/g) || []).length;
dq = dq.replace(/MERGE \(r\)-\[:TRIGGERS_NEXT \{\n\s*reason: ("(?:[^"\\]|\\.)*")\n\}\]->\(q\);/g, 'MERGE (r)-[t:TRIGGERS_NEXT]->(q)\nSET t.reason = $1;');
files['discriminating-questions.cypher'] = dq;

// ---- validation-queries.cypher (not loaded) ----
files['validation-queries.cypher'] = src('validation-queries.cypher').replaceAll('[:BELONGS_TO|:PART_OF', '[:BELONGS_TO|PART_OF');

const counts = { nodes, inlineRels: moved.length, appendedRels: extra.length, distinctRelKeys: have.size, patchFeltAs: lpBefore, hasResponse: dqHas, triggersNext: dqTrig };
if (nodes !== 316 || moved.length !== 349 || extra.length !== 7 || have.size !== 575 || lpBefore !== 26 || dqHas !== 18 || dqTrig !== 4) {
  throw new Error(`unexpected counts ${JSON.stringify(counts)}`);
}

let differs = 0;
for (const [f, text] of Object.entries(files)) {
  const p = resolve(root, 'schema', f);
  if (check) {
    if (!existsSync(p) || readFileSync(p, 'utf8') !== text) { differs++; console.error(`differs: schema/${f}`); }
  } else {
    writeFileSync(p, text);
  }
}
console.log(JSON.stringify(counts));
if (check) {
  console.log(differs ? `${differs} file(s) differ` : 'schema/ matches the converter output');
  process.exit(differs ? 1 : 0);
}
