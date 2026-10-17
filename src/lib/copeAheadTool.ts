/**
 * Cope Ahead's step machine (docs/design/cope-ahead.md, "The flow": seven screens). Pure: the screens
 * report events, `copeNext` says where the flow goes, `copeExt` says what the visit writes (`ext.ca`).
 * The page (src/pages/tools/CopeAhead.tsx) only renders and reports; the plan line itself is composed by
 * src/lib/copeAheadPlan.ts (`planLine(content, ca)`), from `planCa` for each rehearsal pass.
 *
 * Not to be confused with src/lib/copeAhead.ts: DEAR MAN's per-part step, which screen 2 reuses as is.
 *
 * Every screen moves on with one tap; nothing here ever blocks. A danger moment pre-selects its one move
 * (still changeable) and the flow goes on. The machine never reads what the person wrote: own words are
 * carried, length-capped, and saved.
 */
import type { CopeAheadContent, CopeMoveItem, CopePull, CopeWhen, HardMomentItem } from '../data/copeAheadTypes';

export const COPE_STEPS = ['what', 'feel', 'moment', 'plan', 'rehearse', 'again', 'newMoment', 'settle', 'keep'] as const;
export type CopeStep = (typeof COPE_STEPS)[number];
export type CopeSettle = 'breath' | 'five_senses' | 'ok';
export const COPE_PULLS: readonly CopePull[] = ['fight', 'chase', 'hide', 'blank'];
/** Up to two feelings, up to two moves (own words fill a move slot). */
export const COPE_FEEL_MAX = 2;
export const COPE_MOVE_MAX = 2;
/** The other moments *once more* offers, besides Something else. */
export const COPE_NEW_MOMENTS = 2;
/** The situation that takes own words. */
export const OWN_SITUATION = 'other';

/** The moves picked for one pass: chips, and the person's own words in a slot. */
export interface CopeMoves { ids: string[]; own: string | null }

export interface CopeState {
  step: CopeStep;
  situationId: string | null;
  situationOwn: string | null;
  when: CopeWhen | null;
  feelIds: string[];
  /** The pull (one), or 'not_sure', or null while not answered. */
  pull: CopePull | 'not_sure' | null;
  partId: string | null;
  hardMomentId: string | null;
  hardMomentOwn: string | null;
  /** The plan's "If": the moment (default) or the pull (only when a pull was picked). */
  ifFrom: 'moment' | 'pull';
  moves: CopeMoves;
  /** *Add one more* was tapped: the next move chip adds rather than replaces. */
  adding: boolean;
  /** Rehearsal passes finished: 0, 1, or 2 after *once more*. */
  rehearsed: 0 | 1 | 2;
  /** The rehearsal in progress (1, or 2 for *once more*). */
  pass: 1 | 2;
  /** *Once more* was answered (it is offered once). */
  againAnswered: boolean;
  newMomentId: string | null;
  newMomentOwn: string | null;
  /** *Once more*: null until answered, false to keep the plan's move, true to change it. */
  changeMove: boolean | null;
  newMoves: CopeMoves;
  settle: CopeSettle | null;
  kept: boolean | null;
  followUp: boolean | null;
}

export type CopeEvent =
  | { type: 'situation'; id: string }
  | { type: 'situationOwn'; text: string }
  | { type: 'when'; when: CopeWhen }
  | { type: 'feel'; id: string }
  /** The grid word list's picks (Something else): replaces the picks, capped at two. */
  | { type: 'feelIds'; ids: string[] }
  | { type: 'pull'; pull: CopePull | 'not_sure' }
  | { type: 'part'; partId: string | null }
  | { type: 'moment'; id: string }
  | { type: 'momentOwn'; text: string }
  | { type: 'ifFrom'; from: 'moment' | 'pull' }
  | { type: 'move'; id: string }
  | { type: 'add' }
  | { type: 'moveOwn'; text: string | null }
  | { type: 'rehearsed' }
  | { type: 'again'; yes: boolean }
  | { type: 'newMoment'; id: string }
  | { type: 'newMomentOwn'; text: string }
  | { type: 'changeMove'; change: boolean }
  | { type: 'settle'; settle: CopeSettle }
  | { type: 'kept'; kept: boolean }
  | { type: 'followUp'; yes: boolean }
  | { type: 'next' };

/** The parts of the content the machine decides by (ids, lists, limits), never the copy. */
export type CopeContext = Pick<CopeAheadContent, 'ownMax' | 'moveOwnMax' | 'situations' | 'hardMoments' | 'moves'>;

const NO_MOVES: CopeMoves = { ids: [], own: null };

export function initialCope(): CopeState {
  return {
    step: 'what', situationId: null, situationOwn: null, when: null, feelIds: [], pull: null, partId: null,
    hardMomentId: null, hardMomentOwn: null, ifFrom: 'moment', moves: NO_MOVES, adding: false,
    rehearsed: 0, pass: 1, againAnswered: false, newMomentId: null, newMomentOwn: null, changeMove: null, newMoves: NO_MOVES,
    settle: null, kept: null, followUp: null,
  };
}

const cap = (text: string, max: number): string | null => {
  const t = text.trim().slice(0, max).trim();
  return t || null;
};

export function situationOf(s: Pick<CopeState, 'situationId'>, c: Pick<CopeContext, 'situations'>) {
  return c.situations.find((x) => x.id === s.situationId) ?? null;
}

/** Screen 2's feeling chips: the situation's four, then any word picked from the grid list. */
export function feelChoices(s: CopeState, c: Pick<CopeContext, 'situations'>): string[] {
  const likely = situationOf(s, c)?.likelyFeelings ?? [];
  return [...likely, ...s.feelIds.filter((id) => !likely.includes(id))];
}

/** Screen 3's moments, in the situation's order (danger moments last). */
export function momentChoices(s: CopeState, c: Pick<CopeContext, 'situations' | 'hardMoments'>): HardMomentItem[] {
  const ids = situationOf(s, c)?.hardMoments ?? [];
  return ids.map((id) => c.hardMoments.find((m) => m.id === id)).filter((m): m is HardMomentItem => !!m);
}

/** The danger moments of the visit's situation. */
export function dangerIds(s: CopeState, c: Pick<CopeContext, 'situations'>): string[] {
  return situationOf(s, c)?.dangerMomentIds ?? [];
}

/** A danger moment is the plan's (screens 3 and 4 show CrisisBanner compact alongside). */
export function isDanger(s: CopeState, c: Pick<CopeContext, 'situations'>): boolean {
  return !!s.hardMomentId && dangerIds(s, c).includes(s.hardMomentId);
}

/** The danger moment's first move (exactly one per danger moment). */
export function dangerMove(momentId: string | null, c: Pick<CopeContext, 'moves'>): CopeMoveItem | null {
  return momentId ? c.moves.find((m) => m.forMoments.includes(momentId)) ?? null : null;
}

/** A pull was picked (not Not sure): the plan can be for the pull instead. */
export const canPlanForPull = (s: CopeState): boolean => s.pull !== null && s.pull !== 'not_sure';

/**
 * Screen 4's move chips for a moment: its forMoments move first, then the moves for the pull (or the
 * general ones when no pull was picked, or Not sure), in content order. Danger moves never show elsewhere.
 */
export function movesFor(s: CopeState, c: Pick<CopeContext, 'moves'>, momentId: string | null = s.hardMomentId): CopeMoveItem[] {
  const ordered = [...c.moves].sort((a, b) => a.order - b.order);
  const first = ordered.filter((m) => momentId && m.forMoments.includes(momentId));
  const pull = canPlanForPull(s) ? (s.pull as CopePull) : null;
  const rest = ordered.filter((m) => !m.forMoments.length && (pull ? m.forPulls.includes(pull) : m.general));
  return [...first, ...rest];
}

const slots = (m: CopeMoves) => m.ids.length + (m.own ? 1 : 0);

/** Moves picked for the plan (or the *once more* change): at least one to go on. */
export const hasMove = (m: CopeMoves): boolean => slots(m) > 0;

/** *Add one more* shows: one move in, room for another, not already adding. */
export const offersAdd = (s: CopeState, m: CopeMoves = activeMoves(s)): boolean => slots(m) === 1 && !s.adding;

/** The moves being edited: the plan's, or the *once more* change. */
export function activeMoves(s: CopeState): CopeMoves {
  return s.step === 'newMoment' ? s.newMoves : s.moves;
}

/**
 * A move chip: tapping a picked one takes it out; otherwise it adds after *Add one more* (up to two),
 * else it replaces (one plan, not a checklist).
 */
function toggleMove(m: CopeMoves, id: string, adding: boolean): CopeMoves {
  if (m.ids.includes(id)) return { ...m, ids: m.ids.filter((x) => x !== id) };
  if (adding && slots(m) < COPE_MOVE_MAX) return { ...m, ids: [...m.ids, id] };
  return { ids: [id], own: null };
}

function setOwnMove(m: CopeMoves, own: string | null, adding: boolean): CopeMoves {
  if (!own) return { ...m, own: null };
  if (m.own || adding) return { ids: m.ids.slice(0, COPE_MOVE_MAX - 1), own };
  return { ids: [], own };
}

/** The other moments *once more* offers: the first two of the situation's, not the plan's, never danger. */
export function newMomentChoices(s: CopeState, c: Pick<CopeContext, 'situations' | 'hardMoments'>): HardMomentItem[] {
  const danger = dangerIds(s, c);
  return momentChoices(s, c).filter((m) => m.id !== s.hardMomentId && !danger.includes(m.id)).slice(0, COPE_NEW_MOMENTS);
}

/** The moment and moves one rehearsal pass plays: pass 2 is the new moment, with the same or changed moves. */
export function passOf(s: CopeState, pass: 1 | 2 = s.pass): { momentId: string | null; momentOwn: string | null; moves: CopeMoves; ifFrom: 'moment' | 'pull' } {
  if (pass === 1) return { momentId: s.hardMomentId, momentOwn: s.hardMomentOwn, moves: s.moves, ifFrom: s.ifFrom };
  return { momentId: s.newMomentId, momentOwn: s.newMomentOwn, moves: s.changeMove ? s.newMoves : s.moves, ifFrom: 'moment' };
}

/** The moment's words for the rehearsal's {moment}: the chip's ifText, or the person's own words. */
export function momentText(c: Pick<CopeContext, 'hardMoments'>, momentId: string | null, own: string | null): string {
  return own ?? c.hardMoments.find((m) => m.id === momentId)?.ifText ?? '';
}

/**
 * The `ext.ca` slice planLine reads for one pass (the plan card and the first pass: pass 1; *once more*:
 * pass 2's moment and moves). Built from the same copeExt, so the line and the session never disagree.
 */
export function planCa(s: CopeState, pass: 1 | 2 = 1): Record<string, unknown> {
  const p = passOf(s, pass);
  const base = copeExt(s);
  const out: Record<string, unknown> = { ...base, ifFrom: p.ifFrom };
  delete out.hardMomentId; delete out.hardMomentOwn; delete out.moveIds; delete out.moveOwn;
  if (p.momentId) out.hardMomentId = p.momentId;
  if (p.momentOwn) out.hardMomentOwn = p.momentOwn;
  if (p.moves.ids.length) out.moveIds = p.moves.ids;
  if (p.moves.own) out.moveOwn = p.moves.own;
  return out;
}

export function copeNext(st: CopeState, e: CopeEvent, c: CopeContext): CopeState {
  const s = { ...st };
  switch (e.type) {
    case 'situation': {
      if (s.step !== 'what') return st;
      const changed = s.situationId !== e.id;
      s.situationId = e.id;
      s.situationOwn = e.id === OWN_SITUATION ? s.situationOwn : null;
      // A new situation brings its own feelings and moments: what was picked for the old one goes.
      if (changed) Object.assign(s, { feelIds: [], hardMomentId: null, hardMomentOwn: null, moves: NO_MOVES, adding: false });
      return s;
    }
    case 'situationOwn': {
      if (s.step !== 'what') return st;
      const text = cap(e.text, c.ownMax);
      if (!text) return s.situationId === OWN_SITUATION ? { ...s, situationOwn: null } : st;
      if (s.situationId !== OWN_SITUATION) Object.assign(s, { feelIds: [], hardMomentId: null, hardMomentOwn: null, moves: NO_MOVES, adding: false });
      return { ...s, situationId: OWN_SITUATION, situationOwn: text };
    }
    case 'when':
      return s.step === 'what' ? { ...s, when: e.when } : st;
    case 'feel': {
      if (s.step !== 'feel') return st;
      const ids = s.feelIds.includes(e.id) ? s.feelIds.filter((x) => x !== e.id) : [...s.feelIds, e.id].slice(-COPE_FEEL_MAX);
      return { ...s, feelIds: ids };
    }
    case 'feelIds':
      return s.step === 'feel' ? { ...s, feelIds: [...new Set(e.ids)].slice(-COPE_FEEL_MAX) } : st;
    case 'pull': {
      if (s.step !== 'feel') return st;
      const pull = s.pull === e.pull ? null : e.pull;
      // The plan's moves follow the pull: a new pull clears moves picked for the old one.
      return { ...s, pull, ifFrom: pull && pull !== 'not_sure' ? s.ifFrom : 'moment', moves: NO_MOVES, adding: false };
    }
    case 'part':
      return s.step === 'feel' ? { ...s, partId: e.partId } : st;
    case 'moment': {
      if (s.step !== 'moment') return st;
      const wasDanger = dangerMove(s.hardMomentId, c);
      s.hardMomentId = e.id;
      s.hardMomentOwn = null;
      const d = dangerMove(e.id, c);
      if (d) s.moves = { ids: [d.id], own: null };
      else if (wasDanger) s.moves = { ...s.moves, ids: s.moves.ids.filter((x) => x !== wasDanger.id) };
      s.adding = false;
      return s;
    }
    case 'momentOwn': {
      if (s.step !== 'moment') return st;
      const text = cap(e.text, c.ownMax);
      if (!text) return { ...s, hardMomentOwn: null };
      const wasDanger = dangerMove(s.hardMomentId, c);
      const moves = wasDanger ? { ...s.moves, ids: s.moves.ids.filter((x) => x !== wasDanger.id) } : s.moves;
      return { ...s, hardMomentId: null, hardMomentOwn: text, moves, adding: false };
    }
    case 'ifFrom':
      if (s.step !== 'plan') return st;
      return { ...s, ifFrom: e.from === 'pull' && canPlanForPull(s) ? 'pull' : 'moment' };
    case 'move': {
      if (s.step === 'plan') return { ...s, moves: toggleMove(s.moves, e.id, s.adding), adding: false };
      if (s.step === 'newMoment' && s.changeMove) return { ...s, newMoves: toggleMove(s.newMoves, e.id, s.adding), adding: false };
      return st;
    }
    case 'add':
      return (s.step === 'plan' || (s.step === 'newMoment' && s.changeMove)) && offersAdd(s) ? { ...s, adding: true } : st;
    case 'moveOwn': {
      const own = e.text === null ? null : cap(e.text, c.moveOwnMax);
      if (s.step === 'plan') return { ...s, moves: setOwnMove(s.moves, own, s.adding), adding: false };
      if (s.step === 'newMoment' && s.changeMove) return { ...s, newMoves: setOwnMove(s.newMoves, own, s.adding), adding: false };
      return st;
    }
    case 'rehearsed': {
      if (s.step !== 'rehearse') return st;
      const rehearsed = s.pass;
      // Once more is offered once, after the first pass.
      return { ...s, rehearsed, step: rehearsed === 1 && !s.againAnswered ? 'again' : 'settle' };
    }
    case 'again':
      if (s.step !== 'again') return st;
      return e.yes ? { ...s, againAnswered: true, step: 'newMoment', adding: false } : { ...s, againAnswered: true, step: 'settle' };
    case 'newMoment':
      return s.step === 'newMoment' ? { ...s, newMomentId: e.id, newMomentOwn: null } : st;
    case 'newMomentOwn': {
      if (s.step !== 'newMoment') return st;
      const text = cap(e.text, c.ownMax);
      return text ? { ...s, newMomentId: null, newMomentOwn: text } : { ...s, newMomentOwn: null };
    }
    case 'changeMove':
      if (s.step !== 'newMoment') return st;
      return { ...s, changeMove: e.change, newMoves: e.change ? s.newMoves : NO_MOVES, adding: false };
    case 'settle':
      return s.step === 'settle' ? { ...s, settle: e.settle, step: 'keep' } : st;
    case 'kept':
      return s.step === 'keep' ? { ...s, kept: e.kept } : st;
    case 'followUp':
      return s.step === 'keep' ? { ...s, followUp: e.yes } : st;
    case 'next':
      return advance(s);
  }
}

/** Whether a screen's Next goes on (screens 1, 3, 4 and the *once more* pick need their answer). */
export function canGoOn(s: CopeState): boolean {
  switch (s.step) {
    case 'what': return !!s.situationId;
    case 'feel': return true;
    case 'moment': return !!(s.hardMomentId || s.hardMomentOwn);
    case 'plan': return hasMove(s.moves);
    case 'newMoment': return !!(s.newMomentId || s.newMomentOwn) && s.changeMove !== null && (!s.changeMove || hasMove(s.newMoves));
    default: return false;
  }
}

function advance(s: CopeState): CopeState {
  if (!canGoOn(s)) return s;
  switch (s.step) {
    case 'what': return { ...s, step: 'feel' };
    case 'feel': return { ...s, step: 'moment' };
    case 'moment': return { ...s, step: 'plan', adding: false };
    case 'plan': return { ...s, step: 'rehearse', pass: 1, adding: false };
    case 'newMoment': return { ...s, step: 'rehearse', pass: 2, adding: false };
    default: return s;
  }
}

/**
 * What the visit writes (`ext.ca`, functions/src/spine/extSchemas.ts): ids, closed sets and the person's own
 * words on `*Own` keys. Never the plan line itself, never a part's name or anchor.
 */
export function copeExt(s: CopeState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const put = (k: string, v: unknown) => {
    if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return;
    out[k] = v;
  };
  put('situationId', s.situationId);
  put('situationOwn', s.situationOwn);
  put('when', s.when);
  put('feelIds', s.feelIds);
  put('pullIds', s.pull && s.pull !== 'not_sure' ? [s.pull] : null);
  put('partId', s.partId);
  put('hardMomentId', s.hardMomentId);
  put('hardMomentOwn', s.hardMomentOwn);
  if (s.hardMomentId || s.hardMomentOwn) put('ifFrom', s.ifFrom);
  put('moveIds', s.moves.ids);
  put('moveOwn', s.moves.own);
  if (s.rehearsed) put('rehearsed', s.rehearsed);
  put('newMomentId', s.newMomentId);
  put('newMomentOwn', s.newMomentOwn);
  if (s.changeMove) {
    put('newMoveIds', s.newMoves.ids);
    put('newMoveOwn', s.newMoves.own);
  }
  put('settle', s.settle);
  if (s.kept !== null) put('kept', s.kept);
  if (s.followUp !== null) put('followUp', s.followUp);
  return out;
}

/** The step sent as exitStep if the person leaves mid-visit. */
export const COPE_EXIT_STEP: Record<CopeStep, string> = {
  what: 'what', feel: 'feel', moment: 'moment', plan: 'plan', rehearse: 'rehearse', again: 'rehearse',
  newMoment: 'rehearse', settle: 'settle', keep: 'keep',
};

/** The visit's progress (1-7) for the screen counter. */
export const COPE_TRACK: Record<CopeStep, number> = {
  what: 1, feel: 2, moment: 3, plan: 4, rehearse: 5, again: 5, newMoment: 5, settle: 6, keep: 7,
};

/** `?first=<situation id>`: the situation a link puts first (DEAR MAN's *Rehearse it*), never pre-selected. */
export function parseCopeEntry(search: string, c: Pick<CopeContext, 'situations'>): { firstSituationId: string | null } {
  const id = new URLSearchParams(search).get('first');
  return { firstSituationId: id && c.situations.some((x) => x.id === id) ? id : null };
}

/** Screen 1's chips: the content's order, with a linked situation first. */
export function orderedSituations(c: Pick<CopeContext, 'situations'>, first: string | null) {
  const all = [...c.situations].sort((a, b) => a.order - b.order);
  const lead = all.filter((x) => x.id === first);
  return [...lead, ...all.filter((x) => x.id !== first)];
}
