/**
 * Wise mind's step machine (docs/design/wise-mind.md, "The flow", screens 1–6 of the default form).
 * Pure: the screens report events, `wiseNext` says where the flow goes, `wiseExt` / `wiseMindAnswerOf` /
 * `keptLine` say what is written. The page (src/pages/tools/WiseMind.tsx) only renders and reports.
 *
 * Every screen moves on with one tap and every screen but the practice can be skipped; nothing here
 * ever blocks: *Pushed, urgent* offers *Drop in once more* (once) and *Keep it anyway*, never a stop.
 * The machine never reads what the person wrote: own words are carried, length-capped, and saved.
 */
import type { WiseMindContent } from '../data/wiseMindTypes';

export const WISE_STEPS = ['question', 'minds', 'dropIn', 'practice', 'comes', 'quiet', 'feel', 'next', 'close', 'handoff'] as const;
export type WiseStep = (typeof WISE_STEPS)[number];
export type MindSide = 'emotion' | 'reason';
export type WiseFeel = 'calm' | 'pushed' | 'unsure';
export const WISE_FEELS: readonly WiseFeel[] = ['calm', 'pushed', 'unsure'];

/** What one mind said: a chip, the person's words, or *Nothing comes*. */
export interface MindSaid { id: string | null; own: string | null; nothing: boolean }

export interface WiseState {
  step: WiseStep;
  /** The form this visit runs (piece 3 adds `parts`). */
  form: 'minds';
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
  | { type: 'skip' }
  | { type: 'continue' };

/** The parts of the content the machine decides by (ids, kinds, defaults), never the copy. */
export type WiseContext = Pick<WiseMindContent, 'ownMax' | 'questions' | 'practices' | 'answers'>;

/** The question chip a link may put first (never pre-selected): `?first=<question id>`. */
export interface WiseEntry { firstQuestionId: string | null }

export function initialWise(): WiseState {
  return {
    step: 'question', form: 'minds', questionId: null, questionOwn: null, side: null, emotion: null, reason: null,
    practiceId: null, dropped: false, answerId: null, answerOwn: null, feel: null, onceMore: false, nextToolId: null, kept: false,
  };
}

const own = (text: string, max: number): string | null => {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, max);
  return t || null;
};

/** The practice highlighted on screen 3: the question's (Ask and listen), else Stone on the lake. */
export function defaultPracticeId(st: WiseState, ctx: WiseContext): string | null {
  const q = ctx.questions.find((x) => x.id === st.questionId);
  if (q) return q.defaultPracticeId;
  if (st.questionOwn) return ctx.practices.find((p) => p.kind === 'ask')?.id ?? ctx.practices[0]?.id ?? null;
  return ctx.practices.find((p) => p.kind === 'drift')?.id ?? ctx.practices[0]?.id ?? null;
}

/** Both circles answered (a chip, own words or *Nothing comes*): the witness line shows. */
export const mindsHeard = (st: WiseState): boolean => st.emotion !== null && st.reason !== null;

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
  switch (st.step) {
    case 'question':
      if (e.type === 'question' && ctx.questions.some((q) => q.id === e.id)) return { ...st, questionId: e.id, questionOwn: null, step: 'minds' };
      if (e.type === 'questionOwn') {
        const t = own(e.text, ctx.ownMax);
        return t ? { ...st, questionId: null, questionOwn: t, step: 'minds' } : st;
      }
      // No question: nothing for the minds to say about it, so straight to the practice (the stone).
      if (e.type === 'skip') return { ...st, step: 'dropIn', practiceId: null };
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
  return out;
}

/** The step id sent as `exitStep` if the person leaves here. */
export const WISE_EXIT_STEP: Record<WiseStep, string> = {
  question: 'question', minds: 'minds', dropIn: 'drop_in', practice: 'practice', comes: 'comes', quiet: 'comes',
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

/** `?first=<question id>` (Two pulls: What to do next; DEAR MAN's prep: Whether to say something). */
export function parseWiseEntry(search: string, ctx: Pick<WiseContext, 'questions'>): WiseEntry {
  const first = new URLSearchParams(search).get('first');
  return { firstQuestionId: first && ctx.questions.some((q) => q.id === first) ? first : null };
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
