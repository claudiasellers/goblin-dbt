#!/usr/bin/env node
/**
 * The parts sign-off pack: every line of parts copy, grouped by the surface that shows it, with what each
 * surface needs before it can switch on. Markdown to stdout, for Claudia and the clinical reviewer.
 *
 *   node scripts/parts/review.mjs > parts-copy-review.md
 *
 * Sources, no network: scripts/parts/content.py (the lines, the vocabulary, the policy and SIGNED_OFF,
 * through python3), schema/parts.cypher (each line's lint kind, from the voice lint's own rows) and the
 * ids each surface's gate requires, read from the code that declares them (`*_REQUIRED` /
 * `*Required()` in src/lib, bundled with esbuild), so the pack can't drift from what the app checks.
 * tests/parts-review.test.mjs runs it and checks every required id is in the document.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PARTS_KINDS, partsCopyFromCypher } from '../voice-lint.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The content as content.py defines it (the source the cypher and the fixture are built from). */
export function loadContent() {
  const py = `
import sys, json
sys.path.insert(0, ${JSON.stringify(join(root, 'scripts/parts'))})
import content as c
from build import pair_chips
st = lambda i: {"status": c.review_status(i), "signedOff": c.SIGNED_OFF.get(i), "pending": c.PENDING.get(i)}
print(json.dumps({
  "version": c.VERSION,
  "prompts": [dict(id=p[0], flow=p[1], step=p[2], text=p[3], **st(p[0])) for p in c.PROMPTS]
           + [dict(id=k[0], flow="pulls", step="keepsake", text=k[1], **st(k[0])) for k in c.KEEPSAKE],
  "options": [dict(id=o["id"], flow=o["flow"], step=o["step"], text=o["label"], kind=o["kind"], flag=o.get("flag"), **st(o["id"]))
              for o in c.OPTIONS + pair_chips()],
  "moves": [dict(m, **st(m["id"])) for m in c.MOVES],
  "hurts": [dict(h, **st(h["id"])) for h in c.HURTS],
  "expresses": [dict(label=l, source=s, move=v[0], why=v[1], **st(s)) for l, rows in c.EXPRESSES.items() for s, v in rows.items()],
  "held": [dict(label=l, source=s, why=r) for l, rows in c.HELD.items() for s, r in rows.items()],
  "canTouch": [dict(event=e, hurts=h, **st(e)) for e, h in c.CAN_TOUCH.items()],
  "canTouchHeld": [dict(event=e, why=r) for e, r in c.CAN_TOUCH_HELD.items()],
  "policy": dict(c.POLICY, **st(c.POLICY["id"])),
}, ensure_ascii=False))
`;
  return JSON.parse(execFileSync('python3', ['-c', py], { cwd: root, encoding: 'utf8' }));
}

/** Every surface's required ids, from the gates' own constants. */
export async function loadGates() {
  const contents = `
export { UNBLEND_REQUIRED } from './src/lib/unblendLine';
export { angryRequired, ANGRY_LATER_REQUIRED } from './src/lib/angryPart';
export { meetRequired, MEET_OPTION_STEPS, CLOSE_CHECKBACK_REQUIRED } from './src/lib/meetAPartSave';
export { PART_CHECKBACK_REQUIRED } from './src/lib/partCheckback';
export { TAG_ROW_REQUIRED } from './src/lib/partTag';
export { PARTS_OF_ME_REQUIRED, PART_REVISIT_REQUIRED, PART_CANDIDATE_REQUIRED } from './src/lib/partsOfMe';
export { STATS_REQUIRED, REFLECT_REQUIRED } from './src/lib/partStats';
export { PARTS_SETTINGS_REQUIRED, SETTINGS_LINK_REQUIRED } from './src/lib/partsSettings';
export { COPE_REQUIRED } from './src/lib/copeAhead';
export { DEBRIEF_WHO_REQUIRED } from './src/lib/debriefWho';
export { PS_LATER_REQUIRED } from './src/lib/psAmbivalence';
export { OA_GOAL_LINE_REQUIRED } from './src/lib/oaGoalLine';
`;
  const out = await build({
    stdin: { contents, resolveDir: root, loader: 'ts', sourcefile: 'parts-surfaces.ts' },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

/**
 * The surfaces, most exposed first: where each shows and to whom, and the id sets its gates require.
 * `choices` (Meet a part): option steps that need at least one signed-off option each.
 */
export function surfaces(g) {
  return [
    {
      id: 'unblend', title: 'The unblend line',
      where: 'With parts on, right after a pull or urge the person picked in Find the feeling, Do the Opposite or Recover: one line, "A part of you {move} right now.", from the move the pick EXPRESSES (never while the P2 hand-off is open). It also needs the move\'s `unblendPhrase` and the pick\'s EXPRESSES edge signed off (see The vocabulary).',
      groups: [{ label: null, ids: g.UNBLEND_REQUIRED }],
    },
    {
      id: 'angry', title: 'The angry-part card',
      where: 'In Recover, on the fight pull: a short card in the moment. With parts on it speaks of "a part of you"; with parts off it shows its plain wording (the `_plain` twins), so it reaches people who never turned parts on. It also needs every protected hurt complete (label, `feltPhrase`, `matters`).',
      groups: [
        { label: 'Parts on', ids: g.angryRequired(true) },
        { label: 'Parts off (the plain wording)', ids: g.angryRequired(false) },
        { label: '"Spend a minute with it later?" (parts on only; the card shows without it)', ids: g.ANGRY_LATER_REQUIRED },
      ],
    },
    {
      id: 'meet', title: 'Meet a part',
      where: 'The parts tool, by link only (Me, Settings, a candidate, the angry card), with parts on: the whole visit from the entry gate to the close. It also needs at least one move, Shape it\'s words (Find the feeling) and a "Keep it" yes.',
      groups: [
        { label: 'The visit (the paused line shows only for a paused part)', ids: g.meetRequired({ paused: true }) },
        { label: 'The close\'s "Check back with it tomorrow?" (the visit shows without it)', ids: g.CLOSE_CHECKBACK_REQUIRED },
      ],
      choices: g.MEET_OPTION_STEPS,
    },
    {
      id: 'checkback', title: 'The check-back card',
      where: 'On Today, the day after a visit whose close said yes to checking back: "How\'s {name} today?" and, on Louder, the aftercare line. Parts on only.',
      groups: [{ label: null, ids: g.PART_CHECKBACK_REQUIRED }],
    },
    {
      id: 'tag', title: 'The tag row',
      where: 'Under a better close, with parts on: better or much better then-vs-now (Cool Down, Five senses, Find the feeling) or Held off (Pause, Urge Surfing). "Was this a part you know?" with the person\'s parts as chips.',
      groups: [{ label: null, ids: g.TAG_ROW_REQUIRED }],
    },
    {
      id: 'me', title: 'Parts of me',
      where: 'Me, with parts on: the person\'s kept parts as cards (their actions, the 30-day check-back, the readout), set-aside parts, and the parts they said they\'d come back to. Each group below lights up on its own once the area does.',
      groups: [
        { label: 'The area, the cards and their actions', ids: g.PARTS_OF_ME_REQUIRED },
        { label: 'The 30-day check-back', ids: g.PART_REVISIT_REQUIRED },
        { label: 'To come back to', ids: g.PART_CANDIDATE_REQUIRED },
        { label: 'The card\'s readout', ids: g.STATS_REQUIRED },
      ],
    },
    {
      id: 'settings', title: 'Settings',
      where: 'Privacy & Data, for everyone signed in: the parts switch (off by default), what it does, and Delete your parts (there whether parts are on or off).',
      groups: [
        { label: null, ids: g.PARTS_SETTINGS_REQUIRED },
        { label: 'The one-time link right after turning parts on (also needs Meet a part)', ids: g.SETTINGS_LINK_REQUIRED },
      ],
    },
    {
      id: 'reflect', title: 'Reflect',
      where: 'Reflect, with parts on: a quiet block per part with a line past its threshold (what\'s helped it settle, how they\'ve felt toward it, when it shows up).',
      groups: [{ label: null, ids: g.REFLECT_REQUIRED }],
    },
    {
      id: 'dearman', title: 'DEAR MAN',
      where: 'DEAR MAN prep, with parts on and a kept part: "Who might show up in this conversation?", then that part\'s anchor before the script; and in the debrief, who showed up.',
      groups: [
        { label: null, ids: g.COPE_REQUIRED },
        { label: 'The debrief, after "Underneath that": "Did {name} show up?" when prep chose that part, else "Was one of your parts there?" with the tag row\'s chips', ids: g.DEBRIEF_WHO_REQUIRED },
      ],
    },
    {
      id: 'ps', title: 'Problem Solve',
      where: 'In Problem Solve, with parts on, after the "Part of me doesn\'t actually want this to change" barrier and its answer: one quiet line offering to come back to that part another time (a yes queues it in Me\'s "To come back to"). It never opens a parts flow mid-tool.',
      groups: [{ label: null, ids: g.PS_LATER_REQUIRED }],
    },
    {
      id: 'oa', title: 'Do the Opposite',
      where: 'In Do the Opposite, with parts on, on the check\'s "will it help you move toward your goal" card, above the question: two quiet lines setting the pull beside the goal the person picked, when the picked urge EXPRESSES an offerable move that isn\'t a safety-line move (never for "My urge is different", never while P2 is open). {pull} is the move\'s `trailPhrase`; {goal} is Do the Opposite\'s own goal label with its first letter lower-cased ("You want to stay connected."). It also needs the move and the urge\'s EXPRESSES edge signed off (see The vocabulary).',
      groups: [{ label: null, ids: g.OA_GOAL_LINE_REQUIRED }],
    },
  ];
}

/** What each PartsPolicy number guards. A key without a line stops the script (the pack can't skip one). */
export const POLICY_NOTES = {
  offersEnabled: 'The kill switch for trail offers only (never anyone\'s parts). Off.',
  episodeMergeHours: 'Records this close together are one moment: a hand-off is never two pieces of evidence.',
  floodGateHours: 'A flooding or crisis check-in this recent opens any parts flow on the P2 hand-off first.',
  crisisPauseHours: 'No offer within this long of a crisis flag.',
  dissociationCount: 'This many dissociation / freeze results (with the next number) means no offers and a heads-up on entry.',
  dissociationDays: '… within this many days.',
  louderPauseHours: 'After "Louder" at the check-back, no more of that part for this long.',
  maxNonSelfAnswers: 'A second non-Self-like answer at feel-toward ends the visit kindly.',
  tooManyPartsCount: 'This many parts made (with the next number) shows "You don\'t need to get to know everyone at once."',
  tooManyPartsDays: '… within this many days.',
  nameMaxChars: 'The longest name a person can give a part.',
};

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (s) => `\`${s}\``;
const statusOf = (r) => (r.status === 'approved' ? `signed off ${r.signedOff}` : r.pending ? `pending: ${esc(r.pending)}` : 'draft');
const table = (head, rows) => [
  `| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
].join('\n');

/** The whole document. */
export function render(content, gates, kinds = lintKinds()) {
  const surfs = surfaces(gates);
  const lines = new Map([
    ...content.prompts.map((p) => [p.id, { ...p, kind: 'prompt', field: 'copy' }]),
    ...content.options.map((o) => [o.id, { ...o, kind: o.kind === 'voice' ? 'voice' : 'option', field: 'label' }]),
  ]);
  const scope = (l) => {
    const k = kinds.get(`${l.id}:${l.field}`);
    return k && PARTS_KINDS[k] ? PARTS_KINDS[k].scope : '(not linted)';
  };
  const required = (s) => [...new Set(s.groups.flatMap((gr) => [...gr.ids.prompts, ...gr.ids.options]))];
  // Shared lines: every surface that requires each id (a `_plain` twin counts with its line).
  const base = (id) => (id.endsWith('_plain') && lines.has(id.slice(0, -6)) ? id.slice(0, -6) : id);
  const usedBy = new Map();
  for (const s of surfs) for (const id of required(s)) {
    const k = base(id);
    usedBy.set(k, [...new Set([...(usedBy.get(k) ?? []), s.title])]);
  }
  const missing = surfs.flatMap((s) => required(s).filter((id) => !lines.has(id)).map((id) => `${s.title}: ${id}`));
  if (missing.length) throw new Error(`Required ids with no line in content.py: ${missing.join(', ')}`);
  const unknownPolicy = Object.keys(content.policy).filter((k) => !['id', 'status', 'signedOff', 'pending'].includes(k) && !(k in POLICY_NOTES));
  if (unknownPolicy.length) throw new Error(`PartsPolicy fields with no line in POLICY_NOTES: ${unknownPolicy.join(', ')}`);

  const all = [...lines.values()];
  const signed = all.filter((l) => l.status === 'approved').length;
  const pending = all.filter((l) => l.status !== 'approved' && l.pending).length;
  const out = [];
  const A = (...x) => out.push(...x);

  A('# Parts copy: the sign-off pack', '',
    `Generated by \`node scripts/parts/review.mjs\` from \`scripts/parts/content.py\` (${content.version}) and the gates in \`src/lib\`. Don't edit it by hand.`, '',
    `**${all.length} lines in all: ${signed} signed off, ${all.length - signed} drafts${pending ? ` (${pending} pending a decision)` : ''}.** A line is a prompt or an option.`, '',
    table(['Surface', 'Signed off'], surfs.map((s) => {
      const ids = required(s);
      return [s.title, ids.length ? `${ids.filter((id) => lines.get(id).status === 'approved').length} of ${ids.length}` : 'nothing to sign'];
    })), '');

  A('## How sign-off works', '',
    '1. Add each id to `SIGNED_OFF` in `scripts/parts/content.py` with its review date (`"meet_find": "2026-10-20"`).',
    '2. Rebuild (`python3 scripts/parts/build.py > schema/parts.cypher`, then `python3 scripts/parts/fixture.py`), commit, and load it with `node scripts/load-graph.mjs --only parts` (which refreshes the app\'s copy; then deploy hosting).',
    '3. A surface lights up only when every id it needs below is signed off and the person has parts on (the angry card\'s plain wording is the one exception: it reaches people with parts off).', '');

  A('## Surfaces', '', 'Most exposed first. "Plain twin" is the parts-off wording of the same line. "Shared" names the other surfaces that need the same line (sign it once).', '');
  surfs.forEach((s, n) => {
    A(`### ${n + 1}. ${s.title}`, '', s.where, '');
    const seen = new Set();
    for (const gr of s.groups) {
      const ids = [...gr.ids.prompts, ...gr.ids.options];
      // A `_plain` id whose line is listed in this surface is shown as that line's twin, not as its own row.
      const listed = new Set(s.groups.flatMap((x) => [...x.ids.prompts, ...x.ids.options]));
      const rows = ids.filter((id) => !(id.endsWith('_plain') && listed.has(base(id)) && base(id) !== id) && !seen.has(id)).map((id) => {
        seen.add(id);
        const l = lines.get(id);
        const twin = lines.get(`${id}_plain`);
        const also = (usedBy.get(base(id)) ?? []).filter((t) => t !== s.title);
        return [code(id), l.text, twin ? `${code(twin.id)}: ${twin.text}` : '', l.kind, scope(l), statusOf(l), also.length ? `also in ${also.join(', ')}` : ''];
      });
      if (gr.label) A(`**${gr.label}**`, '');
      A(rows.length ? table(['id', 'Text', 'Plain twin', 'Kind', 'Lint scope', 'Status', 'Shared'], rows) : 'Every one of these is a plain twin in the table above.', '');
    }
    if (s.choices) {
      const req = new Set(required(s));
      const rows = s.choices.flatMap(([flow, step]) => content.options.filter((o) => o.flow === flow && o.step === step && !req.has(o.id)).map((o) => {
        const l = lines.get(o.id);
        return [`${flow} / ${step}`, code(o.id), o.text, l.kind, scope(l), statusOf(l), o.flag ?? ''];
      }));
      A('**Choices** (each step needs at least one signed off; the ones listed above by id are needed themselves)', '',
        table(['Step', 'id', 'Text', 'Kind', 'Lint scope', 'Status', 'Flag'], rows), '');
    }
  });

  A('## The vocabulary', '', 'What the lines lean on. Edges are signed off by their source id.', '', '### Protective moves', '',
    table(['id', 'Label', 'unblendPhrase', 'trailPhrase', 'Offerable', 'Status'],
      content.moves.map((m) => [code(m.id), m.label, m.unblendPhrase ?? '—', m.trailPhrase ?? '—', m.offerable ? 'yes' : 'no (shutdown)', statusOf(m)])), '',
    '### Protected hurts', '',
    table(['id', 'Label', 'feltPhrase', 'matters', 'Status'], content.hurts.map((h) => [code(h.id), h.label, h.feltPhrase, h.matters, statusOf(h)])), '',
    '### EXPRESSES (another module\'s pick → the move it expresses)', '',
    table(['Source', 'id', 'Move', 'Why', 'Status'], content.expresses.map((e) => [e.label, code(e.source), e.move, e.why, statusOf(e)])), '',
    'Held (no edge, on purpose):', '',
    table(['Source', 'id', 'Why'], content.held.map((h) => [h.label, code(h.source), h.why])), '',
    '### CAN_TOUCH (Recover\'s "what happened" → the hurts it can touch)', '',
    table(['Event', 'Hurts', 'Status'], content.canTouch.map((c) => [code(c.event), c.hurts.join(', '), statusOf(c)])), '',
    'Held:', '', table(['Event', 'Why'], content.canTouchHeld.map((c) => [code(c.event), c.why])), '');

  A('## The numbers (PartsPolicy)', '', `Status: ${statusOf(content.policy)}.`, '',
    table(['Field', 'Value', 'What it guards'], Object.keys(POLICY_NOTES).filter((k) => k in content.policy).map((k) => [code(k), String(content.policy[k]), POLICY_NOTES[k]])), '');

  const onSurface = new Set(surfs.flatMap((s) => [...required(s).map(base), ...required(s)]));
  for (const s of surfs) for (const [flow, step] of s.choices ?? []) content.options.filter((o) => o.flow === flow && o.step === step).forEach((o) => onSurface.add(o.id));
  const rest = all.filter((l) => !onSurface.has(l.id) && !onSurface.has(base(l.id)));
  const byFlow = new Map();
  for (const l of rest) byFlow.set(l.flow, (byFlow.get(l.flow) ?? 0) + 1);
  A('## Lines no surface shows yet', '', `${rest.length} lines belong to flows with no screen yet (${[...byFlow.entries()].map(([f, n]) => `${f}: ${n}`).join(', ')}); none of them is needed for anything above.`, '',
    table(['Flow / step', 'id', 'Text', 'Kind', 'Lint scope', 'Status'], rest.map((l) => [`${l.flow} / ${l.step}`, code(l.id), l.text, l.kind, scope(l), statusOf(l)])), '');
  return out.join('\n');
}

/** id:field → lint kind, from the voice lint's own rows in schema/parts.cypher. */
export function lintKinds(file = join(root, 'schema/parts.cypher')) {
  return new Map(partsCopyFromCypher(readFileSync(file, 'utf8')).map((r) => [`${r.id}:${r.field}`, r.kind]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${render(loadContent(), await loadGates())}\n`);
}
