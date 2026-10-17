/**
 * The invented person the review harness runs as (dev/parts-review.html): their kept parts in the shapes
 * the real components read (profile slices, Me items, Reflect stats, Today check-backs). Demo data, never
 * graph content: every word a surface shows comes from the parts fixture, except the names this person
 * gave their parts. Their parts are dev/parts-example.ts's.
 */
import type { MePartCandidate, MeItem } from '../../src/services/profile';
import type { ProfileSlices } from '../../src/data/profileTypes';
import type { PartReflect } from '../../src/data/partsTypes';
import type { TodayItem } from '../../src/services/spine';
import { vecToSig } from '../../src/lib/partFigure';
import { PARTS } from '../parts-example';
import fixture from '../../tests/fixtures/parts-content.json';
import ftf from '../../src/data/content/find-the-feeling.json';
import hostCopy from 'virtual:review-host-copy';
import type { GetReflectTrailsResponse, GetTrailOfferEvidenceResponse } from '../../src/data/partsTypes';
import { showIds } from './ids';
import { CHASE_STEPS, LONG_STEPS } from './steps'; // lane 4: steps that helped

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]));
const sig = (id: string) => vecToSig(byId[id].shape);

/** Kept parts, by role in the review. Ids are fixed so the event list is readable. */
export const PART_IDS = { chase: uuid(101), hide: uuid(102), critic: uuid(103), peace: uuid(104), little: uuid(105), unnamed: uuid(106) } as const;

type SlicePart = ProfileSlices['parts'][number];
const meta = (id: string, status: 'active' | 'resting' | 'set_aside', prompt: 'none' | 'quiet' | 'ask' = 'quiet') => ({
  id, kind: 'part', area: 'my_parts' as const, status, source: 'meet_a_part', confirmedAt: '2026-09-02T18:00:00.000Z',
  revisitAt: prompt === 'ask' ? '2026-10-02T00:00:00.000Z' : '2026-11-14T00:00:00.000Z', prompt,
});
const slicePart = (key: keyof typeof PART_IDS, name: string | null, o: Partial<SlicePart> = {}): SlicePart => {
  const ex = byId[key === 'unnamed' ? 'hide' : key];
  return {
    id: PART_IDS[key], name, status: 'active', tender: !!ex.tender, moveIds: [ex.move], firstPlace: ex.places[0] ?? 'chest',
    shapeSig: ex.tender ? null : sig(ex.id), lastVisitedAt: '2026-10-14T19:00:00.000Z', pausedUntil: null, safety: false, meta: meta(PART_IDS[key], 'active'), ...o,
  };
};

/** The profile slices every tool asks for (each tool reads only what it declared). */
export function slices(): ProfileSlices {
  const parts: SlicePart[] = [
    slicePart('chase', byId.chase.name),
    slicePart('hide', byId.hide.name),
    slicePart('unnamed', null, { firstPlace: 'stomach', moveIds: ['keep_watch'] }),
    slicePart('peace', byId.peace.name, { status: 'resting', meta: meta(PART_IDS.peace, 'resting') }),
    slicePart('little', byId.little.name, { tender: true }),
  ];
  return {
    name: { firstName: 'Sam' }, quietHours: null, patterns: [], ownLines: [],
    savedLines: [
      { lineId: 'wl_makes_sense', text: 'It makes sense this got to you.', confirmedAt: '2026-09-10T09:00:00.000Z' },
      { lineId: 'wl_still_here', text: "You're still here, and that counts.", confirmedAt: '2026-09-12T09:00:00.000Z' },
    ],
    people: [], bodyFlags: null, values: [], goals: [], copeAheadPlans: [], boundaryLines: [], practicePrefs: null, fadeLevels: {},
    ownWords: [], thingsILike: [], crisisKit: null, safetyPlan: null, country: null,
    parts,
    partDetail: parts.map((p) => ({
      id: p.id, ageId: null, voiceIds: [], ownVoice: null, jobIds: [], ownJob: null, fearIds: [], ownFear: null, preferredRoleIds: [],
      anchorLineId: null, places: p.firstPlace ? [p.firstPlace] : [], shapeSig: p.shapeSig, hurtIds: [],
    })),
    partAnchors: { [PART_IDS.chase]: 'Ask them when they’ll be back, once.' },
  };
}

const mePart = (key: keyof typeof PART_IDS, status: 'active' | 'resting' | 'set_aside', prompt: 'none' | 'quiet' | 'ask', o: Partial<NonNullable<MeItem['part']>> = {}): MeItem => {
  const ex = byId[key === 'unnamed' ? 'hide' : key];
  return {
    label: 'Part', meta: meta(PART_IDS[key], status, prompt), title: ex.name, summary: '', editor: null,
    stillTrueCopy: '', setAsideCopy: '', toolId: 'meet-a-part',
    part: {
      name: ex.name, tender: !!ex.tender, places: ex.places, shapeSig: ex.tender ? null : sig(ex.id),
      jobIds: ex.tender ? [] : [`${ex.move === 'chase' ? 'chase' : 'hide'}_job_${ex.move === 'chase' ? 'dont_leave' : 'pushed_out'}`],
      ownJob: null, fearIds: ex.tender ? [] : ['fear_old_hurt'], preferredRoleIds: ex.tender ? [] : ['rather_not_sure'],
      moveIds: [ex.move], lastVisitedAt: '2026-10-12T19:00:00.000Z', ...o,
    },
  };
};

/** The chase part's readout: every line (Me's card and Reflect show the same stats). */
const CHASE_STATS: PartReflect['stats'] = {
  helped: [{ toolId: 'pause', n: 3 }, { toolId: 'recovering-from-invalidation', n: 1 }], felt: { month: '2026-08', then: 'feel_annoyed', now: 'feel_warm' }, when: 'evenings',
  steps: CHASE_STEPS,
};

/** Parts of me: a card with its readout, a tender card, a resting card whose 30-day check-back is due, one set aside. */
export const ME_ITEMS: MeItem[] = [
  mePart('chase', 'active', 'quiet', { lastVisitedAt: '2026-10-14T19:00:00.000Z', ownJob: 'make sure they don’t leave', stats: CHASE_STATS }),
  mePart('little', 'active', 'quiet'),
  mePart('peace', 'resting', 'ask', { jobIds: ['peace_job_calm'], fearIds: ['peace_fear_angry'], preferredRoleIds: ['peace_rather_notice'], moveIds: ['keep_the_peace'] }),
  mePart('critic', 'set_aside', 'none', { jobIds: ['turn_job_not_again'], moveIds: ['turn_on_myself'] }),
];

/**
 * Parts of me at its longest, for the 390 px review: a 40-character name (nameMaxChars), a 200-character
 * job in the person's own words (OWN_WORDS_MAX), four places, three helped lines and both feel-toward lines.
 */
export const LONG_NAME = 'the one who keeps checking all the texts';
export const ME_LONG: MeItem[] = [{
  ...mePart('chase', 'active', 'quiet', {
    name: LONG_NAME, places: ['chest', 'throat', 'stomach', 'hands'], lastVisitedAt: '2026-10-14T19:00:00.000Z',
    ownJob: 'make sure nobody I love can quietly drift away without me noticing first, so I keep checking, asking, reading every message twice, and I never get caught off guard by a goodbye I could see coming soon',
    stats: {
      helped: [{ toolId: 'pause', n: 4 }, { toolId: 'recovering-from-invalidation', n: 3 }, { toolId: 'cool-down', n: 2 }],
      felt: { month: '2026-08', then: 'feel_annoyed', now: 'feel_warm' }, when: 'evenings',
      steps: LONG_STEPS,
    },
  }),
  title: LONG_NAME,
}];

export const CANDIDATES: MePartCandidate[] = [
  { id: uuid(201), origin: 'worried_part', moveIds: ['hide'], createdAt: '2026-10-11T20:00:00.000Z' },
  { id: uuid(202), origin: 'angry_card', moveIds: ['hit_back'], createdAt: '2026-10-13T20:00:00.000Z' },
  { id: uuid(203), origin: 'new_one', moveIds: [], createdAt: '2026-10-15T20:00:00.000Z' },
];

/** Reflect: one part with every line, one unnamed part felt the same throughout ("Since …"). */
export const REFLECT: PartReflect[] = [
  {
    id: PART_IDS.chase, name: byId.chase.name, firstPlace: 'chest', shapeSig: sig('chase'),
    stats: CHASE_STATS,
  },
  {
    id: PART_IDS.unnamed, name: null, firstPlace: 'stomach', shapeSig: sig('hide'),
    stats: { helped: [{ toolId: 'cool-down', n: 2 }], felt: { month: '2026-09', then: null, now: 'feel_curious' }, when: null, steps: null },
  },
];

/** Today's next-day check-backs: a named part and an unnamed one. */
export function checkbackItem(named: boolean): TodayItem {
  return {
    id: uuid(named ? 301 : 302), kind: 'follow_up', type: 'part_checkback', tier: 'quality', state: 'due', dueAt: '2026-10-16T10:00:00.000Z',
    resolveMode: 'inline', deepLink: null, choices: [], copy: { title: '' },
    part: named ? { id: PART_IDS.chase, name: byId.chase.name, tender: false } : { id: PART_IDS.unnamed, name: null, tender: false },
  };
}

export const ids = { uuid };

/* ── trail offers: the statement the server would build (rule template, context phrase, moves' trailPhrases) ── */

type Raw = { trailRules: { id: string; shape: string; statementTemplate: string }[]; contexts: { id: string; phrase: string }[]; moves: { id: string; trailPhrase: string }[] };
const raw = fixture as unknown as Raw;
const tagged = (text: string, id: string) => (showIds() ? `${text} ⟨${id}⟩` : text);
const rule = (id: string) => raw.trailRules.find((r) => r.id === id)!;
const ctx = (id: string) => tagged(raw.contexts.find((c) => c.id === id)!.phrase, id);
const pull = (id: string) => tagged(raw.moves.find((m) => m.id === id)!.trailPhrase, id);
const ftfUrge = (id: string) => ((ftf as unknown as { content: { urges: { id: string; label: string }[] } }).content.urges.find((u) => u.id === id)?.label ?? id);

export type TrailKind = 'A' | 'B' | 'C';
const TRAILS: Record<TrailKind, { rule: string; moves: string[]; context: string | null }> = {
  A: { rule: 'trail_move_in_context', moves: ['hide'], context: 'ctx_event_brushed' },
  B: { rule: 'trail_sequence', moves: ['chase', 'hide'], context: null },
  C: { rule: 'trail_two_pulls', moves: ['chase', 'hide'], context: 'ctx_event_ignored' },
};

/** A trail offer on Today, as getToday would send it. */
export function trailItem(kind: TrailKind): TodayItem {
  const t = TRAILS[kind];
  const r = rule(t.rule);
  return {
    id: uuid(800 + kind.charCodeAt(0)), kind: 'trail_offer', type: 'trail_offer', tier: 'quality', state: 'due', dueAt: null,
    resolveMode: 'inline', deepLink: null, choices: [], copy: { title: '' },
    trail: { ruleId: t.rule, shape: kind, template: tagged(r.statementTemplate, r.id), pulls: t.moves.map(pull), context: t.context ? ctx(t.context) : null },
  };
}

/** Its evidence: three moments, each with tool ids, the context phrase and the picks' graph labels. */
export function trailEvidence(kind: TrailKind): GetTrailOfferEvidenceResponse {
  const t = TRAILS[kind];
  const c = t.context ? ctx(t.context) : null;
  const urge = (id: string) => hostCopy.actionUrges[id] ?? id;
  return {
    offerId: uuid(800 + kind.charCodeAt(0)), shape: kind, moveIds: t.moves,
    rows: [
      { at: '2026-10-02T19:10:00.000Z', toolIds: ['find-the-feeling'], context: c, sources: t.moves.map(ftfUrge) },
      { at: '2026-10-07T21:30:00.000Z', toolIds: ['opposite-action'], context: c, sources: t.moves.includes('chase') ? [urge('jealousy-check'), urge('shame-hide')] : [urge('shame-hide')] },
      { at: '2026-10-12T18:05:00.000Z', toolIds: ['recovering-from-invalidation'], context: c, sources: [] },
    ],
  };
}

/* ── Reflect's trails: rule D's batch and the plain patterns, as getReflectTrails would send them ── */

/**
 * Two parts with a rule D candidate (a named one, and an unnamed one with the safety flag: the crisis
 * resources alongside), a row per moment as labels; and two trails answered "It's how things go".
 */
export function reflectTrails(): GetReflectTrailsResponse {
  const d = rule('trail_known_part');
  const urge = (id: string) => hostCopy.actionUrges[id] ?? id;
  const brushed = ctx('ctx_event_brushed');
  const leaving = ctx('ctx_event_leaving');
  return {
    reviews: [
      {
        partId: PART_IDS.chase, template: tagged(d.statementTemplate, d.id), name: byId.chase.name, firstPlace: 'chest', shapeSig: sig('chase'), safety: false,
        rows: [
          { episodeId: uuid(901), at: '2026-10-03T19:10:00.000Z', toolIds: ['opposite-action'], context: leaving, sources: [urge('jealousy-check')] },
          { episodeId: uuid(902), at: '2026-10-08T21:30:00.000Z', toolIds: ['find-the-feeling'], context: null, sources: [ftfUrge('chase')] },
          { episodeId: uuid(903), at: '2026-10-13T18:05:00.000Z', toolIds: ['checkin'], context: null, sources: [] },
        ],
      },
      {
        partId: PART_IDS.unnamed, template: tagged(d.statementTemplate, d.id), name: null, firstPlace: 'stomach', shapeSig: sig('hide'), safety: true,
        rows: [
          { episodeId: uuid(911), at: '2026-10-04T08:40:00.000Z', toolIds: ['recovering-from-invalidation'], context: brushed, sources: [] },
          { episodeId: uuid(912), at: '2026-10-09T22:15:00.000Z', toolIds: ['opposite-action'], context: null, sources: [urge('shame-hide')] },
          { episodeId: uuid(913), at: '2026-10-14T13:00:00.000Z', toolIds: ['dear-man'], context: null, sources: [] },
        ],
      },
    ],
    patterns: [
      { offerId: 'trail_move_in_context:hide:ctx_event_leaving', shape: 'A', template: tagged(rule('trail_move_in_context').statementTemplate, 'trail_move_in_context'), pulls: [pull('hide')], context: leaving },
      { offerId: 'trail_sequence:chase+hide:none', shape: 'B', template: tagged(rule('trail_sequence').statementTemplate, 'trail_sequence'), pulls: [pull('chase'), pull('hide')], context: null },
    ],
  };
}
