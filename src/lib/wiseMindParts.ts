/**
 * Wise mind's step back, the parts-aware form (docs/design/wise-mind.md, 2p): who's here about this, a
 * step back for everyone, and *It won't step back* for any part that stays close. Pure: the gate, the
 * copy, the room's state and what it writes (part ids only: `ext.wm.partIds` / `stillCloseIds`, the
 * `wise_mind` tags, the `wise_mind` candidate). StepBackRoom draws it; Wise mind's step machine owns the
 * screen order and when the writes go.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { ProfileSlices } from '../data/profileTypes';
import type { QueuePartCandidateRequest, TagPartRequest } from '../data/partsTypes';
import { surfaceReady, type SurfaceIds } from './partsContent';
import { partChipLabel, UNNAMED_PROMPTS } from './partTag';

export const WISE_MIND_PARTS_PROMPTS = [
  'wm_who', 'wm_who_help', 'wm_room', 'wm_step_back', 'wm_hold', 'wm_held', 'wm_tap_one', 'wm_wont_line', 'wm_later_done',
  'wm_use_minds', 'wm_pushed',
] as const;
export const WISE_MIND_PARTS_OPTIONS = ['wm_unmet', 'wm_no_one', 'wm_wont', 'wm_meet_later', 'wm_next'] as const;
/** Every line 2p and screen 5's parts wording say, the unnamed parts' names and the hold's hint. */
export const WISE_MIND_PARTS_REQUIRED: SurfaceIds = {
  prompts: [...WISE_MIND_PARTS_PROMPTS, ...UNNAMED_PROMPTS, 'hold_hint'],
  options: WISE_MIND_PARTS_OPTIONS,
};

export type WiseMindPartsCopyId = (typeof WISE_MIND_PARTS_PROMPTS)[number] | (typeof WISE_MIND_PARTS_OPTIONS)[number] | 'hold_hint';
export type WiseMindPartsCopy = Record<WiseMindPartsCopyId, string>;

export const wiseMindPartsReady = (content: PartsContent | null): content is PartsContent =>
  !!content && surfaceReady(content, WISE_MIND_PARTS_REQUIRED);

/** The step back's words by id, or null while any line is missing (the tool then shows the two minds). */
export function wiseMindPartsCopy(content: PartsContent | null): WiseMindPartsCopy | null {
  if (!wiseMindPartsReady(content)) return null;
  const options = new Map(Object.values(content.options).flatMap((steps) => Object.values(steps).flat()).map((o) => [o.id, o.label]));
  const out: Partial<WiseMindPartsCopy> = { hold_hint: content.prompts.hold_hint.copy };
  for (const id of WISE_MIND_PARTS_PROMPTS) out[id] = content.prompts[id].copy;
  for (const id of WISE_MIND_PARTS_OPTIONS) out[id] = options.get(id)!;
  return out as WiseMindPartsCopy;
}

type SlicePart = ProfileSlices['parts'][number];

/**
 * The parts form instead of the two minds: parts on, at least one active or resting part (the `parts`
 * slice is empty while parts are off), and every line of it shipped. Anything else: the two minds.
 */
export function partsFormOn(o: { partsOn: boolean; parts: readonly SlicePart[] | null | undefined; content: PartsContent | null }): boolean {
  return o.partsOn && (o.parts ?? []).some((p) => p.status === 'active' || p.status === 'resting') && wiseMindPartsReady(o.content);
}

/** *A part I haven't met*: a figure of its own, never a stored part. */
export const UNMET = 'unmet';

/** A part as the room draws it. */
export interface StepBackPart {
  /** A kept part's id, or UNMET. */
  id: string;
  /** Its name as the person kept it, the unnamed lines, or *A part I haven't met*. */
  name: string;
  tender: boolean;
  resting: boolean;
  shapeSig: number[] | null;
  /** The part safety flag (a placed one shows CrisisBanner alongside). */
  safety: boolean;
}

/** The person's parts (the slice's order: most recently visited first), then *A part I haven't met*. */
export function roomParts(parts: readonly SlicePart[], content: PartsContent, copy: Pick<WiseMindPartsCopy, 'wm_unmet'>): StepBackPart[] {
  return [
    ...parts.filter((p) => p.status === 'active' || p.status === 'resting').map((p) => ({
      id: p.id, name: partChipLabel(p, content), tender: p.tender, resting: p.status === 'resting',
      shapeSig: p.shapeSig, safety: p.safety === true,
    })),
    { id: UNMET, name: copy.wm_unmet, tender: false, resting: false, shapeSig: null, safety: false },
  ];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `?a=<id>&b=<id>` (Two pulls' keepsake: both figures already in the room): the ids that are the
 * person's active or resting parts, each once, in that order. Anything else is dropped.
 */
export function presetPartIds(search: string, parts: readonly Pick<SlicePart, 'id' | 'status'>[]): string[] {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const kept = new Set(parts.filter((p) => p.status === 'active' || p.status === 'resting').map((p) => p.id));
  const out: string[] = [];
  for (const k of ['a', 'b']) {
    const v = q.get(k);
    if (v && UUID.test(v) && kept.has(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

export interface StepBackState {
  /** Figures near the light, in the order placed (kept part ids and UNMET). */
  placed: string[];
  /** The step back was held all the way. */
  held: boolean;
  /** Figures that wouldn't step back. */
  stillClose: string[];
  /** The figure whose *It won't step back* is showing. */
  open: string | null;
  /** *Meet it another time* tapped for *A part I haven't met* (its candidate is queued). */
  unmetLater: boolean;
}

export const stepBackStart = (preset: readonly string[] = []): StepBackState =>
  ({ placed: [...new Set(preset)], held: false, stillClose: [], open: null, unmetLater: false });

export type StepBackAction =
  | { type: 'toggle'; id: string }
  | { type: 'held' }
  | { type: 'open'; id: string | null }
  | { type: 'wont'; id: string }
  | { type: 'unmet_later' };

/**
 * Before the step back, a tap places a figure near the light or takes it back; after, a tap on a placed
 * figure opens its *It won't step back*. Nothing locks: every action is allowed at any point it's shown.
 */
export function stepBackReducer(s: StepBackState, a: StepBackAction): StepBackState {
  switch (a.type) {
    case 'toggle':
      if (s.held) return s;
      return { ...s, placed: s.placed.includes(a.id) ? s.placed.filter((x) => x !== a.id) : [...s.placed, a.id] };
    case 'held':
      return { ...s, held: true };
    case 'open':
      return { ...s, open: a.id && s.placed.includes(a.id) ? a.id : null };
    case 'wont':
      return s.placed.includes(a.id) && !s.stillClose.includes(a.id) ? { ...s, stillClose: [...s.stillClose, a.id], open: a.id } : s;
    case 'unmet_later':
      return s.stillClose.includes(UNMET) ? { ...s, unmetLater: true } : s;
  }
}

/** A placed part with the safety flag: CrisisBanner compact under the room. */
export const showSafety = (s: StepBackState, parts: readonly StepBackPart[]): boolean =>
  parts.some((p) => p.safety && s.placed.includes(p.id));

const kept = (ids: readonly string[]) => ids.filter((id) => id !== UNMET);

/** `ext.wm`'s part fields: kept part ids only (never UNMET, never a name). */
export const stepBackExt = (s: StepBackState): { partIds: string[]; stillCloseIds: string[] } =>
  ({ partIds: kept(s.placed), stillCloseIds: kept(s.stillClose) });

/** One `wise_mind` tag per placed kept part on this visit's ToolSession (placing it was the yes). */
export function stepBackTags(s: StepBackState, toolSessionId: string, newId: () => string): TagPartRequest[] {
  return kept(s.placed).map((partId) => ({ id: newId(), partId, toolSessionId, source: 'wise_mind' as const }));
}

/** *A part I haven't met* → *Meet it another time*: a candidate on that tap, no moves, no session. */
export const stepBackCandidate = (id: string): QueuePartCandidateRequest => ({ id, origin: 'wise_mind', moveIds: [] });

/** A kept part's *Meet it another time*: Meet a part for it. */
export function stepBackMeetLink(partId: string): { pathname: '/tool/meet-a-part'; state: { parts: { trailheadKind: 'wise_mind'; partId: string } } } {
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'wise_mind', partId } } };
}

/** Screen 5's *Pushed, urgent* line id: the parts form's own; the two minds keep Wise mind's. */
export const PUSHED_PARTS_LINE = 'wm_pushed';

/** In the room's 0–1 box: how near the light the placed figures sit, and the room's edge. */
export const NEAR = 0.24;
export const EDGE = 0.4;

/**
 * Where each placed figure sits: evenly round the light, the first at the top. `t` 0–1 is how far the
 * step back has gone; a figure that won't step back stays near.
 */
export function placedSpots(s: Pick<StepBackState, 'placed' | 'stillClose'>, t: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const n = s.placed.length;
  s.placed.forEach((id, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(n, 1) + (n === 2 ? Math.PI / 2 : 0);
    const r = s.stillClose.includes(id) ? NEAR : NEAR + (EDGE - NEAR) * Math.min(1, Math.max(0, t));
    out.set(id, { x: 0.5 + r * Math.cos(angle), y: 0.5 + r * Math.sin(angle) });
  });
  return out;
}
