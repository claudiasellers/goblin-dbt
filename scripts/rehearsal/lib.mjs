// Pure helpers for the Phase A rehearsal (scripts/rehearsal/rehearse-phase-a.mjs). No I/O here, so
// tests/rehearsal.test.mjs can pin the safety rules: nothing is ever written anywhere but a local Neo4j.

/** The only URIs the rehearsal may write to: a Neo4j on this machine. */
export function isLocalUri(uri) {
  return typeof uri === 'string' && /^(bolt|neo4j):\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(uri.trim());
}

/** Throws unless `uri` is local. Called before every write session and every child process. */
export function assertLocalUri(uri, what = 'write') {
  if (!isLocalUri(uri)) throw new Error(`Refusing to ${what} against ${JSON.stringify(uri)}: the rehearsal only ever writes to a local Neo4j`);
}

/** Backtick-escape a label or relationship type for use in a Cypher string. */
export function ident(name) {
  if (typeof name !== 'string' || !name.length) throw new Error(`bad identifier ${JSON.stringify(name)}`);
  return '`' + name.replace(/`/g, '``') + '`';
}

/** Group rows by a key function into a Map, keeping order. */
export function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

/** Split into chunks of `size`. */
export function chunks(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** The relationship types the dedupe file may delete, read from its `type(r) IN [...]` list. */
export function dedupeAllowList(cypherText) {
  const m = cypherText.match(/type\(r\)\s+IN\s+\[([^\]]*)\]/);
  if (!m) throw new Error('dedupe-apply-rels.cypher: no `type(r) IN [...]` allow-list found');
  return m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

/** Stable comparison of two fingerprints ({labels, types, nodeProps, relProps}). Returns a list of differences. */
export function fingerprintDiff(a, b) {
  const diffs = [];
  for (const section of ['labels', 'types']) {
    const keys = new Set([...Object.keys(a[section] || {}), ...Object.keys(b[section] || {})]);
    for (const k of [...keys].sort()) {
      if ((a[section]?.[k] ?? 0) !== (b[section]?.[k] ?? 0)) diffs.push(`${section}.${k}: ${a[section]?.[k] ?? 0} → ${b[section]?.[k] ?? 0}`);
    }
  }
  for (const k of ['nodeProps', 'relProps']) if (a[k] !== b[k]) diffs.push(`${k}: ${a[k]} → ${b[k]}`);
  return diffs;
}

/**
 * The one difference production may show before M2 that isn't routing: the pre-PR-C1 saveCheckIn MERGEd
 * ActivationPattern {id: 'positive_state'} on a pleasant check-in, so `patterns` gains exactly that id.
 * schema/migrations/2026-10-remove-positive-state-stub.cypher removes it after the M2 deploy.
 */
export function isPositiveStateStub(c) {
  if (c.what !== 'patterns' || !Array.isArray(c.before) || !Array.isArray(c.after)) return false;
  const added = c.after.filter((p) => !c.before.includes(p));
  const removed = c.before.filter((p) => !c.after.includes(p));
  return removed.length === 0 && added.length === 1 && added[0] === 'positive_state';
}

/**
 * The changes that are NOT expected. Always allowed: nothing. With `numbMove` (M4): `numb` moving from the
 * high-unpleasant to the low-unpleasant quadrant, which E4-5 does on purpose. With `positiveStateStub`
 * (M1, before the M2 cleanup): the stub pattern above.
 */
export function unexpectedRoutingChanges(changes, { numbMove = true, positiveStateStub = false } = {}) {
  return changes.filter((c) => {
    if (positiveStateStub && isPositiveStateStub(c)) return false;
    if (!numbMove) return true;
    // Winner keys are `<quadrant>:<word>`, so the move shows as numb leaving high-unpleasant (acute_alarm → null)
    // and arriving in low-unpleasant (null → conservation_freeze).
    if (c.what === 'grid.winner high-unpleasant:numb') return !(c.before === 'acute_alarm' && c.after == null);
    if (c.what === 'grid.winner low-unpleasant:numb') return !(c.before == null && c.after === 'conservation_freeze');
    if (c.what === 'grid.winnerDistribution') {
      const b = c.before || {};
      const a = c.after || {};
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      const delta = {};
      for (const k of keys) { const d = (a[k] ?? 0) - (b[k] ?? 0); if (d) delta[k] = d; }
      const ok = Object.keys(delta).length === 2
        && Object.entries(delta).some(([k, d]) => /acute_alarm/.test(k) && d === -1)
        && Object.entries(delta).some(([k, d]) => /conservation_freeze/.test(k) && d === 1);
      return !ok;
    }
    return true;
  });
}

/** Parse KEY=value lines (the repo-root .env), without touching process.env. */
export function parseEnv(text) {
  const env = {};
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
