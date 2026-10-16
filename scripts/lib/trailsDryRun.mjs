// The trails dry run's pure half (scripts/parts/trails-dry-run.mjs is the CLI): argument parsing,
// threshold overrides, and the two reports. `engine` is functions/src/parts/trails (the built
// functions/lib/parts/trails/index.js in the CLI; the TypeScript itself in tests). Never prints free
// text: sources show as their graph label (`ActionUrge.label`, …) or `Label:id`; a part shows by id.

export const USAGE = `Usage (repo root; build first: npm --prefix functions run build):
  node scripts/parts/trails-dry-run.mjs --uid <uid> [--drafts] [--set rule.field=value ...]
  node scripts/parts/trails-dry-run.mjs --all [--drafts] [--set rule.field=value ...]
  node scripts/parts/trails-dry-run.mjs --records <file.json> [--content <parts-content.json>] [--now <iso>] [--set ...]`;

/** Parse argv. Throws with a message on anything unknown or incomplete. */
export function parseArgs(argv) {
  const out = { uid: null, all: false, drafts: false, sets: [], records: null, content: null, now: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--uid') out.uid = val();
    else if (a === '--all') out.all = true;
    else if (a === '--drafts') out.drafts = true;
    else if (a === '--set') out.sets.push(val());
    else if (a === '--records') out.records = val();
    else if (a === '--content') out.content = val();
    else if (a === '--now') out.now = val();
    else throw new Error(`Unknown argument ${a}`);
  }
  const modes = [out.uid !== null, out.all, out.records !== null].filter(Boolean).length;
  if (modes !== 1) throw new Error('Pick exactly one of --uid, --all, --records');
  if (out.now !== null && Number.isNaN(Date.parse(out.now))) throw new Error('--now: expected an ISO date');
  return out;
}

const RULE_FIELDS = ['minEpisodes', 'windowDays', 'minSpanDays', 'minTools', 'contextShare', 'withinHours', 'lift', 'cooldownDays'];

/** Apply `--set rule.field=value` overrides (numbers or null) to a copy of the rules. */
export function applySets(rules, sets) {
  const out = rules.map((r) => ({ ...r }));
  for (const s of sets) {
    const m = /^([a-z0-9_]+)\.([A-Za-z]+)=(.+)$/.exec(s);
    if (!m) throw new Error(`--set ${s}: expected rule.field=value`);
    const [, ruleId, field, raw] = m;
    const rule = out.find((r) => r.id === ruleId);
    if (!rule) throw new Error(`--set ${s}: no rule ${ruleId} (${out.map((r) => r.id).join(', ')})`);
    if (!RULE_FIELDS.includes(field)) throw new Error(`--set ${s}: ${field} is not a threshold (${RULE_FIELDS.join(', ')})`);
    const v = raw === 'null' ? null : Number(raw);
    if (v !== null && !Number.isFinite(v)) throw new Error(`--set ${s}: expected a number or null`);
    rule[field] = v;
  }
  return out;
}

/** Offline content from tests/fixtures/parts-content.json (the fixture lists offerable moves only). */
export function contentFromFixture(fx) {
  return {
    rules: fx.trailRules.map((r) => ({
      id: r.id, shape: r.shape, minEpisodes: r.minEpisodes, windowDays: r.windowDays ?? null, minSpanDays: r.minSpanDays ?? null,
      minTools: r.minTools ?? null, contextShare: r.contextShare ?? null, withinHours: r.withinHours ?? null, lift: r.lift ?? null,
      cooldownDays: r.cooldownDays, enabled: r.enabled === true, statementTemplate: r.statementTemplate,
    })),
    contexts: fx.contexts.map((c) => ({ id: c.id, key: c.key, value: c.value, phrase: c.phrase })),
    moves: fx.moves.map((m) => ({ id: m.id, offerable: true, safetyLine: m.safetyLine === true, trailPhrase: m.trailPhrase ?? null })),
    pairs: fx.pairs.map((p) => ({ id: p.id, a: p.a, b: p.b })),
    policy: { episodeMergeHours: fx.policy.episodeMergeHours, louderPauseHours: fx.policy.louderPauseHours },
    offersEnabled: fx.policy.offersEnabled === true,
  };
}

/** A records file: a TrailRecord[] or { records, timeZone?, parts? }. */
export function recordsFile(json) {
  if (Array.isArray(json)) return { records: json, timeZone: null, parts: [] };
  if (json && Array.isArray(json.records)) return { records: json.records, timeZone: json.timeZone ?? null, parts: json.parts ?? [] };
  throw new Error('--records: expected a TrailRecord[] or { records, timeZone, parts }');
}

const pad = (s, n) => String(s).padEnd(n);
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Local date and time in the person's zone (UTC when none). */
export function localStamp(iso, timeZone) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  let parts;
  try { parts = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: timeZone || 'UTC' }).formatToParts(new Date(iso)); }
  catch { parts = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: 'UTC' }).formatToParts(new Date(iso)); }
  const g = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
}

export function firstLine(opts) {
  if (opts.drafts) return 'DRAFTS COUNTED: draft EXPRESSES edges count as approved in this run (production counts approved edges only).';
  if (opts.records) return 'Trails dry run (read-only), offline on a records file: moves as the file gives them.';
  return 'Trails dry run (read-only). Approved EXPRESSES edges only; nothing is approved yet, so expect no moves without --drafts.';
}

/**
 * One person's report: episodes and every rule's candidates (every rule treated as enabled), each
 * with its statement and an evidence table. `sourceText(label, id)` gives a source's graph label.
 */
export function personReport({ engine, state, now, opts, who, sourceText = (l, id) => `${l}:${id}` }) {
  const rules = applySets(state.rules, opts.sets).map((r) => ({ ...r, enabled: true }));
  const run = engine.trailsFromState({ ...state, rules }, now, { allEnabled: true });
  const ctxPhrase = (e) => engine.contextIdsOf(e, state.contexts)
    .map((id) => state.contexts.find((c) => c.id === id)?.phrase).filter(Boolean).join('; ');
  const byKey = new Map(state.records.map((r) => [r.key, r]));
  const lines = [firstLine(opts)];
  lines.push(`Every rule treated as enabled.${opts.sets.length ? ` Overrides: ${opts.sets.join(', ')}` : ''}`);
  lines.push(`Person: ${who} · time zone ${state.timeZone ?? 'none (UTC)'} · parts ${state.partsOn ? 'on' : 'off'} · `
    + `${state.records.length} records · ${run.episodes.length} episodes with a move · ${run.conflicts} merge conflicts`);
  lines.push('');
  lines.push('Episodes:');
  if (!run.episodes.length) lines.push('  (none)');
  for (const e of run.episodes) {
    lines.push(`  ${localStamp(e.at, state.timeZone)}  ${pad(e.toolIds.join('+'), 46)} ${pad(e.moveIds.join(', '), 24)} ${ctxPhrase(e)}${e.taggedPartIds.length ? '  [tagged]' : ''}`);
  }
  lines.push('');
  lines.push('Candidates (ranked):');
  if (!run.candidates.length) lines.push('  (none)');
  run.candidates.forEach((c, i) => {
    const rule = rules.find((r) => r.id === c.ruleId);
    const partName = c.partId ? `‹part ${c.partId.slice(0, 8)}›` : null;
    lines.push(`${i + 1}. ${c.ruleId} (${c.shape})  "${engine.trailStatement(c, rule, state.moves, state.contexts, partName)}"`);
    const s = c.strength;
    lines.push(`   episodes ${s.episodes} · span ${fmt(s.spanDays)} days · tools ${s.tools}`
      + (s.share !== undefined ? ` · share ${fmt(s.share)}` : '')
      + (s.lift !== undefined ? ` · lift ${s.lift === null ? 'unbounded (no baseline)' : fmt(s.lift)}` : '')
      + (c.safetyLine ? ' · SAFETY-LINE MOVE' : ''));
    lines.push(`   ${pad('date', 17)} ${pad('tool', 30)} ${pad('context', 40)} source`);
    for (const ev of c.evidence) {
      const ctx = ev.contextIds.map((id) => state.contexts.find((x) => x.id === id)?.phrase).filter(Boolean).join('; ');
      for (const k of ev.recordKeys) {
        const r = byKey.get(k);
        if (!r) continue;
        const src = r.sources.map((x) => sourceText(x.label, x.id)).join('; ') || '-';
        lines.push(`   ${pad(localStamp(r.at, state.timeZone), 17)} ${pad(r.toolId, 30)} ${pad(ctx || '-', 40)} ${src}`);
      }
    }
  });
  return { lines, run };
}

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Aggregates only, never a uid: per rule, how many people would get ≥ 1 candidate; episodes per
 * person (min / median / max); merge conflicts. `people` is [{ state }] in any order.
 */
export function allReport({ engine, people, now, opts, rules: baseRules }) {
  const rules = applySets(baseRules, opts.sets).map((r) => ({ ...r, enabled: true }));
  const perRule = Object.fromEntries(rules.map((r) => [r.id, 0]));
  const episodes = [];
  let conflicts = 0;
  let withConflicts = 0;
  let withRecords = 0;
  for (const { state } of people) {
    const run = engine.trailsFromState({ ...state, rules }, now, { allEnabled: true });
    if (state.records.length) withRecords += 1;
    episodes.push(run.episodes.length);
    conflicts += run.conflicts;
    if (run.conflicts) withConflicts += 1;
    for (const id of new Set(run.candidates.map((c) => c.ruleId))) perRule[id] = (perRule[id] ?? 0) + 1;
  }
  const lines = [firstLine(opts)];
  lines.push(`Every rule treated as enabled.${opts.sets.length ? ` Overrides: ${opts.sets.join(', ')}` : ''}`);
  lines.push(`People: ${people.length} (${withRecords} with a record in the window)`);
  lines.push(`Episodes with a move per person: min ${episodes.length ? Math.min(...episodes) : 0} · median ${fmt(median(episodes))} · max ${episodes.length ? Math.max(...episodes) : 0}`);
  lines.push(`Merge conflicts: ${conflicts} (in ${withConflicts} people)`);
  lines.push('People who would get ≥ 1 candidate, per rule:');
  for (const r of rules) lines.push(`  ${pad(r.id, 24)} (${r.shape})  ${perRule[r.id] ?? 0}`);
  return { lines, perRule, episodes, conflicts };
}
