/**
 * Wise mind's step machine (docs/design/wise-mind.md, "The flow", screens 1–6 of the default form).
 * Pure: the screens report events, `wiseNext` says where the flow goes, `wiseExt` / `wiseMindAnswerOf` /
 * `keptLine` say what is written. The page (src/pages/tools/WiseMind.tsx) only renders and reports.
 *
 * Every screen moves on with one tap and every screen but the practice can be skipped; nothing here
 * ever blocks: *Pushed, urgent* offers *Drop in once more* (once) and *Keep it anyway*, never a stop.
 * The machine never reads what the person wrote: own words are carried, length-capped, and saved.
 */
import type { ComponentType } from 'react';
import type { WiseMindContent } from '../data/wiseMindTypes';

export const WISE_STEPS = ['question', 'minds', 'stepBack', 'dropIn', 'practice', 'comes', 'quiet', 'feel', 'next', 'close', 'handoff'] as const;
export type WiseStep = (typeof WISE_STEPS)[number];
export type MindSide = 'emotion' | 'reason';
export type WiseFeel = 'calm' | 'pushed' | 'unsure';
/** `minds`: screen 2, both minds (the default). `parts`: screen 2p, the step back (docs/design/wise-mind.md; parts on). */
export type WiseForm = 'minds' | 'parts';
export const WISE_FEELS: readonly WiseFeel[] = ['calm', 'pushed', 'unsure'];

/** What one mind said: a chip, the person's words, or *Nothing comes*. */
export interface MindSaid { id: string | null; own: string | null; nothing: boolean }

export interface WiseState {
  step: WiseStep;
  /** The form this visit runs: screen 2 or 2p after the question (the page decides at the start). */
  form: WiseForm;
  questionId: string | null;
  questionOwn: string | null;
  /** The circle whose chips are open on screen 2. */
  side: MindSide | null;
  emotion: MindSaid | null;
  reason: MindSaid | null;
  practiceId: string | null;
  /** A practice was started (the rep: sent as `practiced`). */
  dropped: boolean;
  answerId: string | null;
  answerOwn: string | null;
  feel: WiseFeel | null;
  /** *Drop in once more* was taken (it is offered once). */
  onceMore: boolean;
  nextToolId: string | null;
  kept: boolean;
  /** The step back (2p): the parts the person placed, and those that wouldn't step back. Part ids only. */
  partIds: string[];
  stillCloseIds: string[];
}

export type WiseEvent =
  | { type: 'question'; id: string }
  | { type: 'questionOwn'; text: string }
  | { type: 'side'; side: MindSide }
  | { type: 'says'; side: MindSide; id: string }
  | { type: 'saysOwn'; side: MindSide; text: string }
  | { type: 'nothing'; side: MindSide }
  | { type: 'practice'; id: string }
  | { type: 'start' }
  | { type: 'here' }
  | { type: 'answer'; id: string }
  | { type: 'answerOwn'; text: string }
  | { type: 'feel'; feel: WiseFeel }
  | { type: 'onceMore' }
  | { type: 'keepAnyway' }
  | { type: 'keep' }
  | { type: 'handoff'; toolId: string }
  | { type: 'enough' }
  /** `toStepBack`: screen 1's skip on a visit that brought parts (Two pulls' `?a=&b=`), in the parts form. */
  | { type: 'skip'; toStepBack?: boolean }
  | { type: 'continue' }
  /** The step back is done (2p): what was placed, ids only. */
  | { type: 'steppedBack'; partIds: string[]; stillCloseIds: string[] }
  /** 2p's *Use the two minds instead*. */
  | { type: 'useMinds' };

/** The parts of the content the machine decides by (ids, kinds, defaults), never the copy. */
/**
 * `breathOk: false`: the person told the Practice home's setup that breath practices aren't okay (*No* or *Not sure*,
 * `practice_prefs.breath`; MF-02): the drop-in never starts on a breath practice for them (they can still pick one).
 */
export type WiseContext = Pick<WiseMindContent, 'ownMax' | 'questions' | 'practices' | 'answers'> & { breathOk?: boolean };

/**
 * What the link carried: the question chip it may put first (never pre-selected), `?first=<question id>`;
 * and, from Two pulls' keepsake, `?a=<part id>&b=<part id>`: the parts already in the room (2p).
 */
export interface WiseEntry { firstQuestionId: string | null; presetPartIds: string[] }

export function initialWise(form: WiseForm = 'minds'): WiseState {
  return {
    step: 'question', form, questionId: null, questionOwn: null, side: null, emotion: null, reason: null,
    practiceId: null, dropped: false, answerId: null, answerOwn: null, feel: null, onceMore: false, nextToolId: null, kept: false,
    partIds: [], stillCloseIds: [],
  };
}

const own = (text: string, max: number): string | null => {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, max);
  return t || null;
};

/** The practice highlighted on screen 3: the question's (Ask and listen), else Stone on the lake. */
export function defaultPracticeId(st: WiseState, ctx: WiseContext): string | null {
  const drift = ctx.practices.find((p) => p.kind === 'drift')?.id ?? null;
  const q = ctx.questions.find((x) => x.id === st.questionId);
  const id = q ? q.defaultPracticeId
    : st.questionOwn ? ctx.practices.find((p) => p.kind === 'ask')?.id ?? ctx.practices[0]?.id ?? null
      : drift ?? ctx.practices[0]?.id ?? null;
  // Breath not okay: a breath practice (hold, ask) is never the default; the stone is.
  const kind = ctx.practices.find((p) => p.id === id)?.kind;
  if (ctx.breathOk === false && (kind === 'hold' || kind === 'ask') && drift) return drift;
  return id;
}

/** Both circles answered (a chip, own words or *Nothing comes*): the witness line shows. */
export const mindsHeard = (st: WiseState): boolean => st.emotion !== null && st.reason !== null;

/** What a heard circle shows under its name: the chip's label, their own words, or *Nothing comes*; null while unheard. */
export type MindWords = { kind: 'words'; text: string; own: boolean } | { kind: 'nothing' };
export function mindWords(st: WiseState, ctx: WiseContext, side: MindSide): MindWords | null {
  const v = st[side];
  if (!v) return null;
  if (v.nothing) return { kind: 'nothing' };
  if (v.own) return { kind: 'words', text: v.own, own: true };
  const label = voicesFor(st, ctx, side).find((x) => x.id === v.id)?.label;
  return label ? { kind: 'words', text: label, own: false } : { kind: 'nothing' };
}

/** The question chips in order, with the entry's chip first (not pressed: the page never pre-selects). */
export function orderedQuestions(ctx: WiseContext, entry: WiseEntry) {
  const qs = [...ctx.questions].sort((a, b) => a.order - b.order);
  const i = qs.findIndex((q) => q.id === entry.firstQuestionId);
  return i > 0 ? [qs[i], ...qs.slice(0, i), ...qs.slice(i + 1)] : qs;
}

/** What screen 2 offers for this side: the picked question's voices (own words alone without a question). */
export function voicesFor(st: WiseState, ctx: WiseContext, side: MindSide) {
  return ctx.questions.find((q) => q.id === st.questionId)?.voices[side] ?? [];
}

/** The tools screen 6 offers for the answer (the page drops any the app doesn't have). */
export function nextToolIdsFor(st: WiseState, ctx: WiseContext): string[] {
  return ctx.answers.find((a) => a.id === st.answerId)?.nextToolIds ?? [];
}

/** *Drop in once more* is on offer: pushed, and not taken yet. */
export const offersOnceMore = (st: WiseState): boolean => st.step === 'feel' && st.feel === 'pushed' && !st.onceMore;

/** Something to keep: a chip answer (not *Nothing yet*) or own words, not kept yet. */
export const canKeep = (st: WiseState, ctx: WiseContext): boolean =>
  !st.kept && (st.answerOwn !== null || (st.answerId !== null && ctx.answers.find((a) => a.id === st.answerId)?.kind !== 'quiet'));

export function wiseNext(st: WiseState, e: WiseEvent, ctx: WiseContext): WiseState {
  // After the question: screen 2, or the step back (2p) in the parts form.
  const second: WiseStep = st.form === 'parts' ? 'stepBack' : 'minds';
  switch (st.step) {
    case 'question':
      if (e.type === 'question' && ctx.questions.some((q) => q.id === e.id)) return { ...st, questionId: e.id, questionOwn: null, step: second };
      if (e.type === 'questionOwn') {
        const t = own(e.text, ctx.ownMax);
        return t ? { ...st, questionId: null, questionOwn: t, step: second } : st;
      }
      // No question: nothing for the minds to say about it, so straight to the practice (the stone). A
      // visit that brought parts into the room (Two pulls) still opens the room: they are what it's about.
      if (e.type === 'skip') return e.toStepBack && st.form === 'parts' ? { ...st, step: 'stepBack' } : { ...st, step: 'dropIn', practiceId: null };
      return st;
    case 'minds': {
      if (e.type === 'side') return { ...st, side: e.side };
      const said = (side: MindSide, v: MindSaid): WiseState => {
        const next = { ...st, [side]: v, side: null } as WiseState;
        // The other circle opens next, until both have been heard.
        const other: MindSide = side === 'emotion' ? 'reason' : 'emotion';
        return next[other] === null ? { ...next, side: other } : next;
      };
      if (e.type === 'says' && voicesFor(st, ctx, e.side).some((v) => v.id === e.id)) return said(e.side, { id: e.id, own: null, nothing: false });
      if (e.type === 'saysOwn') {
        const t = own(e.text, ctx.ownMax);
        return t ? said(e.side, { id: null, own: t, nothing: false }) : st;
      }
      if (e.type === 'nothing') return said(e.side, { id: null, own: null, nothing: true });
      if (e.type === 'continue' || e.type === 'skip') return { ...st, side: null, step: 'dropIn' };
      return st;
    }
    case 'stepBack': {
      const ids = (xs: readonly string[]) => [...new Set(xs.filter((x) => typeof x === 'string' && x.length > 0))].slice(0, 12);
      if (e.type === 'steppedBack') {
        const partIds = ids(e.partIds);
        return { ...st, partIds, stillCloseIds: ids(e.stillCloseIds).filter((x) => partIds.includes(x)), step: 'dropIn' };
      }
      if (e.type === 'useMinds') return { ...st, form: 'minds', partIds: [], stillCloseIds: [], step: 'minds' };
      if (e.type === 'skip' || e.type === 'continue') return { ...st, step: 'dropIn' };
      return st;
    }
    case 'dropIn':
      if (e.type === 'practice' && ctx.practices.some((p) => p.id === e.id)) return { ...st, practiceId: e.id };
      if (e.type === 'start') return { ...st, practiceId: st.practiceId ?? defaultPracticeId(st, ctx), dropped: true, step: 'practice' };
      return st;
    case 'practice':
      // The practice is the one screen that isn't skipped; *I'm here* always moves on.
      return e.type === 'here' ? { ...st, step: 'comes' } : st;
    case 'comes': {
      if (e.type === 'answer') {
        const a = ctx.answers.find((x) => x.id === e.id);
        if (!a) return st;
        return { ...st, answerId: a.id, answerOwn: null, step: a.kind === 'quiet' ? 'quiet' : 'feel' };
      }
      if (e.type === 'answerOwn') {
        const t = own(e.text, ctx.ownMax);
        return t ? { ...st, answerId: null, answerOwn: t, step: 'feel' } : st;
      }
      // Nothing said: there is nothing to check or keep, so the close.
      if (e.type === 'skip') return { ...st, answerId: null, answerOwn: null, step: 'close' };
      return st;
    }
    case 'quiet':
      return e.type === 'continue' ? { ...st, step: 'close' } : st;
    case 'feel':
      if (e.type === 'feel') return { ...st, feel: e.feel };
      if (e.type === 'onceMore' && offersOnceMore(st)) {
        // Back to the practice once; the answer is asked fresh after it.
        return { ...st, onceMore: true, feel: null, answerId: null, answerOwn: null, step: 'dropIn' };
      }
      if (e.type === 'keepAnyway' && st.feel === 'pushed') return { ...st, step: 'next' };
      if (e.type === 'continue' && st.feel !== null && st.feel !== 'pushed') return { ...st, step: 'next' };
      if (e.type === 'skip') return { ...st, step: 'next' };
      return st;
    case 'next':
      if (e.type === 'keep' && canKeep(st, ctx)) return { ...st, kept: true };
      if (e.type === 'handoff' && nextToolIdsFor(st, ctx).includes(e.toolId)) return { ...st, nextToolId: e.toolId, step: 'handoff' };
      if (e.type === 'enough' || e.type === 'skip') return { ...st, step: 'close' };
      return st;
    default:
      return st;
  }
}

/** The answer saved as `wiseMindAnswer` (ask-fresh, on this session only): the chip's id, or `own`. */
export function wiseMindAnswerOf(st: WiseState): string | null {
  if (st.answerId) return st.answerId;
  return st.answerOwn ? 'own' : null;
}

/** `ext.wm` for the close (functions/src/spine/extSchemas.ts): ids, the feel, flags, and own words as typed. */
export function wiseExt(st: WiseState): Record<string, unknown> {
  const out: Record<string, unknown> = { form: st.form };
  if (st.questionId) out.questionId = st.questionId;
  if (st.questionOwn) out.questionOwn = st.questionOwn;
  for (const side of ['emotion', 'reason'] as const) {
    const s = st[side];
    if (s?.id) out[`${side}SaysIds`] = [s.id];
    if (s?.own) out[`${side}SaysOwn`] = s.own;
  }
  if (st.dropped && st.practiceId) out.practiceId = st.practiceId;
  if (st.answerOwn) out.answerOwn = st.answerOwn;
  if (st.feel) out.feel = st.feel;
  if (st.onceMore) out.onceMore = true;
  if (st.nextToolId) out.nextToolId = st.nextToolId;
  if (st.kept) out.kept = true;
  if (st.form === 'parts' && st.partIds.length) out.partIds = st.partIds;
  if (st.form === 'parts' && st.stillCloseIds.length) out.stillCloseIds = st.stillCloseIds;
  return out;
}

/** The step id sent as `exitStep` if the person leaves here. */
export const WISE_EXIT_STEP: Record<WiseStep, string> = {
  question: 'question', minds: 'minds', stepBack: 'step_back', dropIn: 'drop_in', practice: 'practice', comes: 'comes', quiet: 'comes',
  feel: 'feel', next: 'next', close: 'close', handoff: 'next',
};

/**
 * The line *Keep what wise mind said* saves to My words, in the person's voice: the chip in the copy's
 * frame ("Wise mind said: wait, not now.") or their own words exactly as written. Null: nothing to keep.
 */
export function keptLine(st: WiseState, ctx: WiseContext, frame: string): string | null {
  if (st.answerOwn) return st.answerOwn.slice(0, ctx.ownMax);
  const a = ctx.answers.find((x) => x.id === st.answerId);
  if (!a || a.kind === 'quiet') return null;
  // Lower-case the chip's first letter mid-sentence, but never the word "I" ("I already know…").
  const label = /^I\b/.test(a.label) ? a.label : a.label.charAt(0).toLowerCase() + a.label.slice(1);
  const said = /[.!?]$/.test(label) ? label : `${label}.`;
  const line = frame.includes('{answer}') ? frame.replace('{answer}', said) : said;
  return line.slice(0, ctx.ownMax);
}

/** What the page hands screen 2p's room (the parts-aware step back). */
export interface StepBackRoomProps {
  /** The question in the chip's or the person's words (null: skipped). */
  question: string | null;
  /** Parts a link put in the room already (`?a=&b=`), unchecked: the room keeps only the caller's own. */
  presetPartIds: readonly string[];
  /** This visit's ToolSession id ('' when it isn't saved): the host for its tags and candidates. */
  sessionId: string;
  /** The step back is done: part ids only (the machine caps and de-duplicates them). */
  onDone: (r: { partIds: string[]; stillCloseIds: string[] }) => void;
  /** *Use the two minds instead*. */
  onUseMinds: () => void;
}

/**
 * The parts form, when the page is given one (parts on, a part to place, its copy shipped: decided by
 * whoever passes it): the room for screen 2p, and screen 5's *Pushed, urgent* line in that form.
 */
export interface StepBackSlot {
  Room: ComponentType<StepBackRoomProps>;
  pushedLine: string | null;
}

/** Part ids as a link carries them: the same shape the server's ids take; anything else is dropped. */
const PART_ID = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;

/**
 * `?first=<question id>` (Two pulls: What to do next; DEAR MAN's prep: Whether to say something), and
 * `?a=&b=` (Two pulls' keepsake: both figures already in the room). The preset parts are only passed on to
 * the step back; whether they are the caller's own is the room's to check against the profile slice.
 */
export function parseWiseEntry(search: string, ctx: Pick<WiseContext, 'questions'>): WiseEntry {
  const q = new URLSearchParams(search);
  const first = q.get('first');
  const presetPartIds = [...new Set([q.get('a'), q.get('b')].filter((x): x is string => !!x && PART_ID.test(x)))];
  return { firstQuestionId: first && ctx.questions.some((q2) => q2.id === first) ? first : null, presetPartIds };
}

/**
 * Screen 5's line for the answer's feel. *Pushed, urgent* says it in the form's own words: "That might be
 * emotion mind talking." (minds), or the parts form's line, which is parts copy and comes from the step
 * back's slot (`partsPushed`; until it ships, the minds line).
 */
export function feelLine(st: WiseState, copy: WiseCopy, partsPushed: string | null = null): string | null {
  if (!st.feel) return null;
  if (st.feel === 'pushed' && st.form === 'parts' && partsPushed) return partsPushed;
  return copy.feel.lines[st.feel];
}

/** The copy screens 1–6 read, typed, with '' for anything missing (the content test pins every key). */
export interface WiseCopy {
  chrome: { back: string; next: string; skip: string };
  question: { prompt: string; own: string; ownLabel: string };
  minds: { prompt: string; emotion: string; reason: string; emotionSays: string; reasonSays: string; nothingComes: string; own: string; ownLabel: string; witness: string };
  dropIn: { prompt: string; start: string; here: string; hold: string; letGo: string; holdHint: string; listen: string };
  comes: { prompt: string; own: string; ownLabel: string; quiet: string };
  feel: { prompt: string; options: Record<WiseFeel, string>; lines: Record<WiseFeel, string>; onceMore: string; keepAnyway: string };
  next: { prompt: string; enough: string; keep: string; kept: string; keptDone: string; done: string };
}

const SHAPE: { [K in keyof WiseCopy]: readonly string[] } = {
  chrome: ['back', 'next', 'skip'],
  question: ['prompt', 'own', 'ownLabel'],
  minds: ['prompt', 'emotion', 'reason', 'emotionSays', 'reasonSays', 'nothingComes', 'own', 'ownLabel', 'witness'],
  dropIn: ['prompt', 'start', 'here', 'hold', 'letGo', 'holdHint', 'listen'],
  comes: ['prompt', 'own', 'ownLabel', 'quiet'],
  feel: ['prompt', 'onceMore', 'keepAnyway'],
  next: ['prompt', 'enough', 'keep', 'kept', 'keptDone', 'done'],
};

export function wiseCopy(copy: Record<string, unknown>): WiseCopy {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const out = {} as Record<string, Record<string, unknown>>;
  for (const [screen, keys] of Object.entries(SHAPE)) {
    const src = (copy[screen] ?? {}) as Record<string, unknown>;
    out[screen] = Object.fromEntries(keys.map((k) => [k, str(src[k])]));
  }
  const feel = (copy.feel ?? {}) as Record<string, Record<string, unknown> | undefined>;
  for (const k of ['options', 'lines'] as const) out.feel[k] = Object.fromEntries(WISE_FEELS.map((f) => [f, str(feel[k]?.[f])]));
  return out as unknown as WiseCopy;
}

/** Every key the screens read is present and non-empty (the page shows nothing rather than a blank line). */
export function wiseCopyReady(c: WiseCopy): boolean {
  return Object.values(c).every((screen) => Object.values(screen as Record<string, unknown>).every((v) =>
    typeof v === 'string' ? v.length > 0 : Object.values(v as Record<string, string>).every((x) => x.length > 0)));
}
