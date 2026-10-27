// Neo4j refuses a subquery expression (EXISTS { … }, COUNT { … }, COLLECT { … }) anywhere in a MERGE
// clause, its ON CREATE / ON MATCH SET included ("Subquery expressions are not allowed in a MERGE
// clause"). The fake driver never parses Cypher, so this reads every query in functions/src: a MERGE
// runs until the next line that starts another clause, or the end of its template string.
// (27 Oct 2026: startPartSession's CREATE_QUERY filtered moveIds this way, so every Meet a part visit
// failed to open and no part was ever kept.)
const test = require('node:test');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const SRC = join(__dirname, '../../src');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
});
const CLAUSE = /^\s*(MERGE|WITH|MATCH|OPTIONAL|RETURN|FOREACH|CALL|UNWIND|SET|DELETE|DETACH|REMOVE|WHERE|CREATE|UNION|LIMIT|ORDER)\b/;
const SUBQUERY = /\b(EXISTS|COUNT|COLLECT)\s*\{/;

/** Each MERGE clause in a file: its text, from the MERGE to the next clause (or the template's end). */
function mergeClauses(text) {
  // Comments are blanked (kept as lines, so line numbers hold): they may name the rule itself.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, '')).replace(/^\s*\/\/.*$/gm, '');
  const lines = code.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const at = lines[i].search(/\bMERGE\b/);
    if (at < 0) continue;
    let clause = lines[i].slice(at);
    for (let j = i + 1; j < lines.length && !CLAUSE.test(lines[j]) && !lines[j].includes('`'); j++) clause += `\n${lines[j]}`;
    out.push({ line: i + 1, clause });
  }
  return out;
}

test('no subquery expression inside a MERGE clause (Neo4j refuses the whole query)', () => {
  const bad = [];
  for (const f of walk(SRC)) {
    for (const { line, clause } of mergeClauses(readFileSync(f, 'utf8'))) {
      // A one-line FOREACH (… | MERGE …) ends at its line; anything after the MERGE on it is the clause.
      if (SUBQUERY.test(clause)) bad.push(`${relative(SRC, f)}:${line}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('the scan finds the 27 Oct shape', () => {
  const was = "MERGE (ps:PartSession {key: $key})\n  ON CREATE SET ps.status = 'open',\n    ps.moveIds = [m IN $moveIds WHERE EXISTS { MATCH (:ProtectiveMove {id: m}) }]\n  MERGE (u)-[:R]->(ps)";
  assert.ok(mergeClauses(was).some(({ clause }) => SUBQUERY.test(clause)));
});
