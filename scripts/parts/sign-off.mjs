#!/usr/bin/env node
/**
 * Sign parts content off: adds ids to `SIGNED_OFF` in scripts/parts/content.py (sorted, one per line, with
 * the review date), then rebuilds schema/parts.cypher and tests/fixtures/parts-content.json. Signing off
 * only marks ids reviewed: it never changes a TrailRule's `enabled` or PartsPolicy's `offersEnabled`.
 *
 *   node scripts/parts/sign-off.mjs --all [--date YYYY-MM-DD] [--dry-run]
 *   node scripts/parts/sign-off.mjs --surface meet [--surface settings …] [--date …] [--dry-run]
 *   node scripts/parts/sign-off.mjs --ids meet_find,meet_keep [--date …] [--dry-run]
 *
 * --all      every id the build would mark a draft (prompts, keepsake lines, options and pair chips,
 *            moves, hurts, EXPRESSES sources, CAN_TOUCH events, body signals, ANSWERS and Underneath
 *            sources, pairs, trail rules, contexts, the policy), except PENDING ids (listed, skipped).
 * --surface  the ids a surface of the sign-off pack needs (scripts/parts/review.mjs: `loadGates()` and
 *            `surfaces()`, their groups and choices), plus the vocabulary it shows through (`vocab`).
 * --ids      exactly these ids (an unknown one stops it).
 * --date     the review date for new entries (default: today, local); existing entries keep theirs.
 * --dry-run  print what it would sign off and change nothing.
 * --root     (tests) a copy of the repo layout to work in instead of this one.
 *
 * On a failed rebuild content.py is put back as it was. Every id ever passed stays reviewed until removed
 * from SIGNED_OFF by hand.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGates, surfaces } from './review.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Every id the build asks review_status about, by kind, with PENDING and SIGNED_OFF (python3, no network). */
export function loadIds(root = repo) {
  const py = `
import sys, json, io, contextlib
sys.path.insert(0, ${JSON.stringify(join(root, 'scripts/parts'))})
import content as c
import build as b
asked = []
real = b.review_status
b.review_status = lambda i: (asked.append(i), real(i))[1]
with contextlib.redirect_stdout(io.StringIO()):
    b.main()
kinds = {}
def put(kind, ids):
    for i in ids:
        kinds.setdefault(i, kind)
put("prompt", [p[0] for p in c.PROMPTS])
put("keepsake", [k[0] for k in c.KEEPSAKE])
put("option", [o["id"] for o in c.OPTIONS])
put("pair chip", [o["id"] for o in b.pair_chips()])
put("move", [m["id"] for m in c.MOVES])
put("hurt", [h["id"] for h in c.HURTS])
put("EXPRESSES source", [s for rows in c.EXPRESSES.values() for s in rows])
put("CAN_TOUCH event", list(c.CAN_TOUCH))
put("body signal", list(c.AT_PLACE))
put("ANSWERS source", list(c.ANSWERS))
put("Underneath source", list(c.UNDERNEATH_SAME_AS))
put("pair", [p["id"] for p in c.PAIRS])
put("trail rule", [r["id"] for r in c.TRAIL_RULES])
put("context", [x[0] for x in c.CONTEXTS])
put("policy", [c.POLICY["id"]])
seen = list(dict.fromkeys(asked))
print(json.dumps({
  "ids": [dict(id=i, kind=kinds.get(i, "other")) for i in seen],
  "pending": c.PENDING, "signedOff": c.SIGNED_OFF,
  "moves": [m["id"] for m in c.MOVES], "hurts": [h["id"] for h in c.HURTS],
  "contexts": [x[0] for x in c.CONTEXTS], "expresses": list(dict.fromkeys(s for rows in c.EXPRESSES.values() for s in rows)),
  "trailRules": [dict(id=r["id"], shape=r["shape"]) for r in c.TRAIL_RULES],
  "options": [dict(id=o["id"], flow=o["flow"], step=o["step"]) for o in b.all_options()],
}, ensure_ascii=False))
`;
  return JSON.parse(execFileSync('python3', ['-c', py], { cwd: root, encoding: 'utf8' }));
}

/** The vocabulary a surface's `vocab` names, as ids. */
function vocabIds(names, ids) {
  const out = [];
  for (const v of names ?? []) {
    if (v === 'moves') out.push(...ids.moves);
    else if (v === 'hurts') out.push(...ids.hurts);
    else if (v === 'contexts') out.push(...ids.contexts);
    else if (v === 'expresses') out.push(...ids.expresses);
    else if (v === 'trailRules') out.push(...ids.trailRules.filter((r) => r.shape !== 'D').map((r) => r.id));
    else if (v === 'trailRuleD') out.push(...ids.trailRules.filter((r) => r.shape === 'D').map((r) => r.id));
    else throw new Error(`unknown vocab ${v}`);
  }
  return out;
}

/** Every id one pack surface lists (its groups and its choices) and the vocabulary it shows through. */
export function surfaceIds(surface, ids) {
  const lines = surface.groups.flatMap((g) => [...g.ids.prompts, ...g.ids.options]);
  const choices = (surface.choices ?? []).flatMap(([flow, step]) => ids.options.filter((o) => o.flow === flow && o.step === step).map((o) => o.id));
  return [...new Set([...lines, ...choices, ...vocabIds(surface.vocab, ids)])];
}

/** content.py with SIGNED_OFF replaced by `entries`, sorted; nothing else changes. */
export function withSignedOff(src, entries) {
  const re = /^SIGNED_OFF = \{[^}]*\}/m;
  if (!re.test(src)) throw new Error('content.py has no SIGNED_OFF = {…} literal');
  const keys = Object.keys(entries).sort();
  const literal = keys.length ? `SIGNED_OFF = {\n${keys.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(entries[k])},`).join('\n')}\n}` : 'SIGNED_OFF = {}';
  return src.replace(re, literal);
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function parseArgs(argv) {
  const o = { all: false, surfaces: [], ids: [], date: null, dryRun: false, root: repo };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`); return v; };
    if (a === '--all') o.all = true;
    else if (a === '--surface') o.surfaces.push(val());
    else if (a === '--ids') o.ids.push(...val().split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--date') o.date = val();
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--root') o.root = resolve(val());
    else throw new Error(`unknown argument ${a}`);
  }
  if ([o.all, o.surfaces.length > 0, o.ids.length > 0].filter(Boolean).length !== 1) throw new Error('give exactly one of --all, --surface <id>…, --ids <id>[,<id>…]');
  if (o.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw new Error('--date: YYYY-MM-DD');
  return o;
}

export async function signOff(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  const o = parseArgs(argv);
  const date = o.date ?? today();
  const ids = loadIds(o.root);
  const kindOf = new Map(ids.ids.map((x) => [x.id, x.kind]));

  let wanted;
  if (o.all) wanted = ids.ids.map((x) => x.id);
  else if (o.surfaces.length) {
    const surfs = surfaces(await loadGates());
    const unknown = o.surfaces.filter((s) => !surfs.some((x) => x.id === s));
    if (unknown.length) {
      log(`Unknown surface${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Valid: ${surfs.map((s) => s.id).join(', ')}`);
      return 2;
    }
    wanted = [...new Set(o.surfaces.flatMap((id) => surfaceIds(surfs.find((s) => s.id === id), ids)))];
    const notInContent = wanted.filter((id) => !kindOf.has(id));
    if (notInContent.length) throw new Error(`surface ids with no content row: ${notInContent.join(', ')}`);
  } else {
    const unknown = o.ids.filter((id) => !kindOf.has(id));
    if (unknown.length) { log(`Not parts content ids: ${unknown.join(', ')}`); return 2; }
    wanted = [...new Set(o.ids)];
  }

  const skipped = wanted.filter((id) => id in ids.pending);
  const already = wanted.filter((id) => !(id in ids.pending) && id in ids.signedOff);
  const fresh = wanted.filter((id) => !(id in ids.pending) && !(id in ids.signedOff));
  const byKind = new Map();
  for (const id of fresh) byKind.set(kindOf.get(id), [...(byKind.get(kindOf.get(id)) ?? []), id]);

  log(`${o.dryRun ? 'Would sign off' : 'Signing off'} ${fresh.length} id${fresh.length === 1 ? '' : 's'} (${date})${already.length ? `; ${already.length} already signed off (dates kept)` : ''}.`);
  for (const [kind, list] of byKind) log(`  ${kind}: ${list.length}${o.dryRun ? `  ${list.join(', ')}` : ''}`);
  if (skipped.length) log(`Skipped (PENDING, waiting on something else): ${skipped.map((id) => `${id} (${ids.pending[id]})`).join(', ')}`);
  if (o.dryRun || fresh.length === 0) {
    if (!o.dryRun) log('Nothing to change.');
    return 0;
  }

  const file = join(o.root, 'scripts/parts/content.py');
  const before = readFileSync(file, 'utf8');
  writeFileSync(file, withSignedOff(before, { ...ids.signedOff, ...Object.fromEntries(fresh.map((id) => [id, date])) }));
  try {
    const cypher = execFileSync('python3', [join(o.root, 'scripts/parts/build.py')], { cwd: o.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    execFileSync('python3', [join(o.root, 'scripts/parts/fixture.py')], { cwd: o.root, stdio: ['ignore', 'ignore', 'pipe'] });
    writeFileSync(join(o.root, 'schema/parts.cypher'), cypher);
  } catch (e) {
    writeFileSync(file, before);
    execFileSync('python3', [join(o.root, 'scripts/parts/fixture.py')], { cwd: o.root, stdio: 'ignore' });
    log(`The rebuild failed, so content.py is back as it was:\n${String(e.stderr ?? e.message).trim()}`);
    return 1;
  }
  log(['', 'Rebuilt schema/parts.cypher and tests/fixtures/parts-content.json. Next, on your Mac:',
    '  1. node scripts/load-graph.mjs --only parts   (refreshes src/data/content/parts.json)',
    '  2. commit content.py, schema/parts.cypher, the fixture and src/data/content/parts.json',
    '  3. firebase deploy --only hosting'].join('\n'));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await signOff(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 2;
  }
}
