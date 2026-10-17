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
  "trailRules": [dict(id=r["id"], shape=r["shape"], statement=r["statementTemplate"], enabled=r["enabled"], **st(r["id"])) for r in c.TRAIL_RULES],
  "contexts": [dict(id=x[0], key=x[1], value=x[2], phrase=x[3], **st(x[0])) for x in c.CONTEXTS],
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
export { meetRequired, MEET_OPTION_STEPS, CLOSE_CHECKBACK_REQUIRED, MEET_FRONT_REQUIRED } from './src/lib/meetAPartSave';
export { PART_CHECKBACK_REQUIRED } from './src/lib/partCheckback';
export { TAG_ROW_REQUIRED } from './src/lib/partTag';
export { TAG_SHAPE_REQUIRED } from './src/lib/partShape';
export { PARTS_OF_ME_REQUIRED, PART_REVISIT_REQUIRED, PART_CANDIDATE_REQUIRED } from './src/lib/partsOfMe';
export { STATS_REQUIRED, REFLECT_REQUIRED } from './src/lib/partStats';
export { PARTS_SETTINGS_REQUIRED, SETTINGS_LINK_REQUIRED, PARTS_ME_OFF_REQUIRED } from './src/lib/partsSettings';
export { COPE_REQUIRED } from './src/lib/copeAhead';
export { DEBRIEF_WHO_REQUIRED } from './src/lib/debriefWho';
export { PS_LATER_REQUIRED } from './src/lib/psAmbivalence';
export { TRAIL_OFFER_REQUIRED } from './src/lib/trailOffer';
export { KNOWN_PART_REVIEW_REQUIRED, PLAIN_PATTERNS_REQUIRED } from './src/lib/knownPartReview';
export { OA_GOAL_LINE_REQUIRED } from './src/lib/oaGoalLine';
export { DEN_REQUIRED } from './src/lib/den';
export { WISE_MIND_PARTS_REQUIRED } from './src/lib/wiseMindParts';
export { PART_STORY_REQUIRED } from './src/lib/partStory';
`;
  const out = await build({
    stdin: { contents, resolveDir: root, loader: 'ts', sourcefile: 'parts-surfaces.ts' },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

/**
 * The surfaces, most exposed first: where each shows and to whom, and the id sets its gates require.
 * `choices` (Meet a part): option steps that need at least one signed-off option each. `vocab`: the
 * signed-off vocabulary its lines show through, as its `where` says (moves, hurts, contexts, EXPRESSES
 * sources, trail rules A–C or D); scripts/parts/sign-off.mjs --surface signs these off with the lines.
 */
export function surfaces(g) {
  return [
    {
      id: 'unblend', title: 'The unblend line',
      vocab: ['moves', 'expresses'],
      where: 'With parts on, right after a pull or urge the person picked in Find the feeling, Do the Opposite or Recover: one line, "A part of you {move} right now.", from the move the pick EXPRESSES (never while the P2 hand-off is open). It also needs the move\'s `unblendPhrase` and the pick\'s EXPRESSES edge signed off (see The vocabulary).',
      groups: [{ label: null, ids: g.UNBLEND_REQUIRED }],
    },
    {
      id: 'angry', title: 'The angry-part card',
      vocab: ['hurts'],
      where: 'In Recover, on the fight pull: a short card in the moment. With parts on it speaks of "a part of you"; with parts off it shows its plain wording (the `_plain` twins), so it reaches people who never turned parts on. It also needs every protected hurt complete (label, `feltPhrase`, `matters`).',
      groups: [
        { label: 'Parts on', ids: g.angryRequired(true) },
        { label: 'Parts off (the plain wording)', ids: g.angryRequired(false) },
        { label: '"Spend a minute with it later?" (parts on only; the card shows without it)', ids: g.ANGRY_LATER_REQUIRED },
      ],
    },
    {
      id: 'meet', title: 'Meet a part',
      vocab: ['moves', 'hurts'],
      where: 'The parts tool, with parts on: in the Tools list (Mindfulness) once this is signed off, and by its links (Me, Settings, a candidate, the angry card, an offer): the whole visit from the entry gate to the close. It also needs at least one move, Shape it\'s words (Find the feeling) and a "Keep it" yes.',
      groups: [
        { label: 'The visit (the paused line shows only for a paused part)', ids: g.meetRequired({ paused: true }) },
        { label: 'The close\'s "Check back with it tomorrow?" (the visit shows without it)', ids: g.CLOSE_CHECKBACK_REQUIRED },
        { label: 'After "What do you think it\'s protecting?", when the person keeps another part: "Does it stand in front of another part you know?" with their parts by name, then these two (a part picked draws the den\'s thread when the part is kept; the visit shows without it, skipping the step)', ids: g.MEET_FRONT_REQUIRED },
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
      groups: [
        { label: null, ids: g.TAG_ROW_REQUIRED },
        { label: 'Find the feeling only, when the visit made a shape: right after a part chip, "Use this shape for {name}?" (Yes gives the part that shape; the row shows without it)', ids: g.TAG_SHAPE_REQUIRED },
      ],
    },
    {
      id: 'me', title: 'Parts of me',
      vocab: ['moves'],
      where: 'Me, with parts on (with parts off, the switch card in the last group): the person\'s kept parts as cards (their actions, the 30-day check-back, the readout), set-aside parts, and the parts they said they\'d come back to. Each group below lights up on its own once the area does.',
      groups: [
        { label: 'The area, the cards and their actions', ids: g.PARTS_OF_ME_REQUIRED },
        { label: 'The 30-day check-back', ids: g.PART_REVISIT_REQUIRED },
        { label: 'To come back to', ids: g.PART_CANDIDATE_REQUIRED },
        { label: 'The card\'s readout', ids: g.STATS_REQUIRED },
        { label: 'With parts off: a quiet card in its place with the parts switch (Settings\' label, blurb and small print). It also needs the area\'s lines, so turning parts on there shows Parts of me', ids: g.PARTS_ME_OFF_REQUIRED },
      ],
    },
    {
      id: 'den', title: 'The den',
      where: 'Me → Parts of me → "See them together" (the link shows once the person has two active or resting parts), with parts on: the room seen from above with the person as the light (never labelled), each part where they put it (drag, or the keyboard), "Everyone here is in your house." under it. Tap one figure, then another: "These two pull against each other" (opens Two pulls, once it is built) or "This one stands in front of that one", then "Which one stands in front?" with both names; a confirmed thread has a remove. "How it looked in {month}" shows a past layout beside today. A part with a safety-line move or a danger fear shows the crisis resources under the room.',
      groups: [{ label: null, ids: g.DEN_REQUIRED }],
    },
    {
      id: 'wise_mind', title: 'Wise mind\'s step back',
      where: 'Wise mind (Tools, Mindfulness), with parts on and at least one active or resting part: its second screen becomes the step back, with "Use the two minds instead" to switch. The den\'s room, small, the light in the middle (the person, never labelled). "Who\'s here about this?": the person\'s parts on a shelf (tender ones covered), "A part I haven\'t met" and "No one in particular"; a tap places a figure near the light. One hold asks everyone to take a step back and the figures move to the edge. After it, a tap on a figure: "It won\'t step back", "That\'s fine. It might need its own time." and "Meet it another time" (a kept part: Meet a part for it; the unmet one: queued in Me\'s "To come back to"). A placed part with a safety-line move or a danger fear shows the crisis resources under the room. On "Is this wise mind?", "Pushed, urgent" says "A part might still be close." Placing a part tags it to the visit.',
      groups: [{ label: null, ids: g.WISE_MIND_PARTS_REQUIRED }],
    },
    {
      id: 'story', title: 'A part\'s story',
      where: 'Me → Parts of me: "Its story" on each active or resting part\'s card opens it in place; in the den, tap one figure for "Its story" and "Spend time with it" (Meet a part for that part). Oldest first, each line only when there is something to say: "Met in {month}", "Rested in {month}" / "Back in {month}", "Its job then: …" / "Its job now: …" (never on a tender part), the card\'s readout (how they\'ve felt toward it, what\'s helped it settle), and "Where it stands": its confirmed threads in words, and an earlier month\'s room beside today\'s when there is one. Months only; no score, no percentage, never a fear.',
      groups: [{ label: null, ids: g.PART_STORY_REQUIRED }],
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
      id: 'offer', title: 'The trail offer (Today)',
      vocab: ['trailRules', 'moves', 'contexts'],
      where: 'Today only, with parts on and offers switched on (PartsPolicy.offersEnabled), at most one a week shared with what_helps, never near flooding, a crisis flag, repeated dissociation or a harm signal: "Something keeps showing up", the rule\'s statement, "Want to take a look?", then the evidence and the four answers. It also needs the rule\'s statement, the moves\' `trailPhrase` and the context\'s phrase signed off (see Trail rules and Trail contexts). Rule D ("Was this {name}?") is never on Today: Reflect asks it in a batch (below).',
      groups: [{ label: null, ids: g.TRAIL_OFFER_REQUIRED }],
    },
    {
      id: 'review', title: '"Was this {name}?" (Reflect)',
      vocab: ['trailRuleD'],
      where: 'Reflect, with parts on and offers switched on, never a push and never near flooding, a crisis flag, repeated dissociation or a harm signal (the trail offer\'s gate, without the weekly budget): one block per part the person knows that rule D found (at most two at once). The part\'s name and figure, then rule D\'s statement ("Was this {name}?"; for a part with no name, its chip label and the line below), a row per moment (date, tool, context, what was picked: labels only, never their words) with Yes / No / Not sure, then Done / Not now. Yes tags that moment to the part; No never asks about it again for that part; Not sure does nothing. Done or Not now: the part rests for the rule\'s cooldown (14 days). A part with a safety-line move or a danger fear shows the crisis resources alongside. It also needs the rule\'s statement signed off (see Trail rules).',
      groups: [{ label: null, ids: g.KNOWN_PART_REVIEW_REQUIRED }],
    },
    {
      id: 'patterns', title: 'Plain patterns (Reflect)',
      vocab: ['trailRules', 'moves', 'contexts'],
      where: 'Reflect, with parts on: the trails the person answered "It\'s how things go", as the offer\'s own statement with no parts language ("When someone pulls away, the pull is to hide."), under this heading, each with a × to remove it for good. It also needs each statement\'s rule, moves\' `trailPhrase` and context phrase signed off.',
      groups: [{ label: null, ids: g.PLAIN_PATTERNS_REQUIRED }],
    },
    {
      id: 'oa', title: 'Do the Opposite',
      vocab: ['moves', 'expresses'],
      where: 'In Do the Opposite, with parts on, on the check\'s "will it help you move toward your goal" card, above the question: two quiet lines setting the pull beside the goal the person picked, when the picked urge EXPRESSES an offerable move that isn\'t a safety-line move (never for "My urge is different", never while P2 is open). {move} is the move\'s `unblendPhrase` (the unblend line\'s); {goal} is Do the Opposite\'s own goal label with its first letter lower-cased ("You want to stay connected."). It also needs the move and the urge\'s EXPRESSES edge signed off (see The vocabulary).',
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
  harmWindowDays: 'The harm signals (functions/src/parts/harm.ts, scripts/parts/report.cypher) look back this many days.',
  tenderRepeatCount: 'This many tender / own-words stops, or not-Self endings, in that window is a harm signal (pauses offers, goes to review).',
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
    'Held:', '', table(['Event', 'Why'], content.canTouchHeld.map((c) => [code(c.event), c.why])), '',
    '### Trail rules (the statement a trail offer shows)', '',
    '`{context}` is a trail context\'s phrase, `{pull}` / `{pull2}` a move\'s `trailPhrase`, `{name}` the part\'s name. Every rule ships switched off.', '',
    table(['id', 'Shape', 'Statement', 'Enabled', 'Status'], (content.trailRules ?? []).map((r) => [code(r.id), r.shape, r.statement, r.enabled ? 'yes' : 'no', statusOf(r)])), '',
    '### Trail contexts (what fills {context})', '',
    table(['id', 'Kind', 'Phrase', 'Status'], (content.contexts ?? []).map((c) => [code(c.id), `${c.key} = ${c.value}`, c.phrase, statusOf(c)])), '');

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
