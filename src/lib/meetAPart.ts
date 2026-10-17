/**
 * Meet a part's step machine (docs/design/parts.md, "Meet a part": the steps table, Branches, What's
 * saved; "The flood signal" for the blending check). Pure: the screens report events, `meetNext` says
 * where the flow goes, `whatToSave` says what is written. The dev harness (dev/parts-harness.tsx) and the
 * app's page run the same rules, so the safety branches (the conservative stop, danger, the tender path,
 * "never certify Self") are decided once, here, and tested (tests/meet-a-part-flow.test.mjs).
 *
 * The machine never reads copy: chips arrive as the content's options (their `id`, `branch` and `flag`
 * decide), and own words are never inspected, only counted as the riskier case.
 */
import type { HandoffResult } from '../data/capacityTypes';

/** Every screen of the flow, in the harness's names. */
export const MEET_STEPS = [
  'find', 'blend', 'blendBody', 'where', 'shape', 'age', 'young', 'voice', 'feel', 'unblend', 'unblendEnd', 'nothing',
  'job', 'likes', 'guards', 'front', 'fear', 'stop', 'update', 'canNow', 'thank', 'tender', 'rather', 'name', 'keep', 'close', 'done',
] as const;
export type MeetStep = (typeof MEET_STEPS)[number];

/** Where each step's chips live in the parts content: [flow, step]. */
export const MEET_OPTION_STEP: Partial<Record<MeetStep, readonly [string, string]>> = {
  find: ['meet', 'find'], blend: ['gate', 'blend'], where: ['meet', 'where'], shape: ['meet', 'shape'], age: ['meet', 'age'],
  young: ['meet', 'age_young'], voice: ['meet', 'voice'], feel: ['meet', 'feel'], unblend: ['meet', 'unblend'],
  unblendEnd: ['meet', 'unblend_later'], nothing: ['meet', 'nothing'], job: ['meet', 'job'], likes: ['meet', 'likes'],
  guards: ['meet', 'guards'], fear: ['meet', 'fear'], stop: ['meet', 'stop'], update: ['meet', 'update'],
  canNow: ['meet', 'update_show'], rather: ['meet', 'rather'], name: ['meet', 'name'], keep: ['meet', 'keep'],
};

/** The prompts each step shows, so a host can ask `flowReady` for the whole flow before showing any of it. */
export const MEET_PROMPTS: Partial<Record<MeetStep, readonly string[]>> = {
  find: ['meet_find'], blend: ['gate_blend_check'], where: ['meet_where'], shape: ['meet_shape'], age: ['meet_age'],
  young: ['meet_age_young'], voice: ['meet_voice'], feel: ['meet_feel'], unblend: ['meet_unblend'],
  unblendEnd: ['meet_unblend_end', 'meet_unblend_later'], nothing: ['meet_nothing'], job: ['meet_job'], likes: ['meet_likes'],
  guards: ['meet_guards'], fear: ['meet_fear'], stop: ['meet_stop_title', 'meet_stop_body', 'meet_stop_therapist'],
  update: ['meet_update'], canNow: ['meet_update_show'], thank: ['meet_thank', 'meet_thank_hold', 'meet_thank_done'],
  tender: ['meet_tender', 'meet_tender_sub'], rather: ['meet_rather'], name: ['meet_name'], keep: ['meet_keep'],
  done: ['meet_done'],
};

/** The steps that take "In my words". */
export const OWN_WORDS_STEPS: readonly MeetStep[] = ['voice', 'job', 'fear'];

/** The 1–10 of the steps table, for the progress track; the gate's screens and done have none. */
export const MEET_TRACK: Partial<Record<MeetStep, number>> = {
  find: 1, where: 2, shape: 3, age: 3, young: 3, voice: 3, feel: 4, unblend: 4, unblendEnd: 4, nothing: 4, job: 5, likes: 5,
  guards: 5, front: 5, fear: 6, stop: 6, update: 7, canNow: 7, thank: 8, tender: 8, rather: 8, name: 9, keep: 9, close: 10,
};

/** Shape it's forced choices: five rounds, one per dimension. */
export const SHAPE_ROUNDS = 5;

export type BlendAnswer = 'notice' | 'running' | 'not_sure';
/** The blending check's answer, by option id (Two pulls' form included). Ask-fresh: a log field only. */
export const BLEND_ANSWERS: Readonly<Record<string, BlendAnswer>> = {
  blend_notice: 'notice', blend_running: 'running', blend_not_sure: 'not_sure',
  blend_pulls_notice: 'notice', blend_pulls_running: 'running', blend_pulls_not_sure: 'not_sure',
};
/** "It doesn't seem to" at Update: the only answer that goes on to "Show it something you can do now". */
export const UPDATE_NOT_YET = 'update_no';

export type MeetStopReason = 'tender' | 'own_words' | 'worried_part' | 'nothing';

/** What the person has said so far. Field names are the harness's; ask-fresh ones are marked. */
export interface MeetSession {
  move: string;
  /** The known part this visit is with (an entry from Me, or a known part picked at Find). */
  partId: string | null;
  trailheadKind: string;
  /** "Something else" at Find. */
  findId?: string;
  place: string | null;
  /** Shape it's five dimensions, -1..1. */
  shape: number[];
  ageId?: string;
  /** The answer to "It sounds young. Want to keep it gentle?" (the tender path, or going on). */
  youngId?: string;
  voiceId?: string; ownVoice?: string;
  /** Ask-fresh: in the order asked, never pre-filled, never on the part. */
  feelTowardIds: string[];
  /** Non-Self-like answers at 4 / 4b so far. */
  steppedBack: number;
  jobId?: string; ownJob?: string; likesId?: string;
  /** What was picked at Guards (a hurt id or "Not sure"); `hurtId` only when it was a hurt. */
  guardsId?: string; hurtId?: string;
  /**
   * 5d: another part the person keeps that this one stands in front of (a part id, never a non-answer).
   * Not ask-fresh: the server draws the den's thread from it, on the keep or a kept part's last save.
   */
  frontOfPartId?: string;
  fearId?: string; ownFear?: string; updateId?: string; canNowId?: string; ratherId?: string;
  name?: string;
  tender: boolean;
  /** A danger fear, or own words at voice / job on a safety-line move. */
  danger: boolean;
  stopReason: MeetStopReason | null;
  /** 9b: true only on "Yes, keep it". */
  kept: boolean | null;
  /** "Want to get to know that one another time?" answered yes: the candidate intent, nothing more. */
  candidate: boolean;
  /** The orienting close's choice; unset when skipped or never asked. */
  closeId?: string;
  /** Ask-fresh: the blending check's answer, and the P2 hand-offs it opened. Log only. */
  blendCheck?: BlendAnswer;
  handoffs: HandoffResult[];
  exitStep?: MeetStep;
}

export interface MeetContext {
  /** Moves with a safety line (the content's `safetyLine`): the move can change at Find, so all of them. */
  safetyLineMoves: readonly string[];
  /** PartsPolicy.maxNonSelfAnswers. */
  maxNonSelfAnswers: number;
  /** The entry already names the part (a trailhead, an offer, a candidate, a known part): Find is answered. */
  namedEntry: boolean;
  /** Ask the blending check. Always true in the app; the harness can turn it off. */
  blendCheck: boolean;
  /** P2 already ran on entry (a stored flood signal): "running things" offers only P2's last two choices. */
  p2OnEntry?: boolean;
  /** The band for the blend check's P2: flooded when a stored signal said so, else stirred. */
  p2Band?: 'stirred' | 'flooded';
  /**
   * 5d's chips: the person's other active or resting parts (named), most recently visited first. Empty
   * or absent (5d's copy not signed off, no other part) skips 5d; the flow goes on to Fear.
   */
  frontParts?: readonly string[];
}

/** What the host renders P2 with, while the step is blendBody. */
export interface MeetP2 { band: 'stirred' | 'flooded'; start: 'card' | 'later' }

export interface MeetState {
  step: MeetStep;
  session: MeetSession;
  /** Shape it's round, 0-based. */
  round: number;
  /** "Picking up where we were.", on the step P2 resumed to, until the next step. */
  resumeNote: boolean;
  /** P2 ended on "come back later": its own message stays until the person goes on, then done. */
  later: boolean;
  /** Crisis resources alongside (never instead): a safety-line move or a danger answer. */
  crisis: boolean;
  /** Something for the body or 5-4-3-2-1 asked for on the way to Thanks; cleared by the next event. */
  aside: 'grounding' | 'body' | null;
  p2: MeetP2 | null;
}

/** A chip as the content serves it: the machine reads only these three fields. */
export interface PickedOption { id: string; branch: string; flag?: string | null }

export type MeetEvent =
  /** Find: what's there was picked (the trailhead, or a known part with its move). */
  | { type: 'find'; move?: string; partId?: string | null }
  /** Find: "start from another move" (stays on Find). */
  | { type: 'setMove'; move: string }
  /** A chip at the current step (the blending check's answers included). */
  | { type: 'option'; option: PickedOption }
  /** A hurt chip at Guards. */
  | { type: 'hurt'; hurtId: string }
  /** 5d: one of the person's own parts, by id ("No one I know" / "Not sure" are options). */
  | { type: 'front'; partId: string }
  /** "In my words" at voice, job or fear. The text is stored, never read. */
  | { type: 'ownWords'; text: string }
  /** Where: Continue with a place (null: "Nowhere I can find"). */
  | { type: 'place'; place: string | null }
  /** Shape: one round's pick ("Can't tell" sends the current shape). */
  | { type: 'shape'; shape: number[] }
  /** P2's outcome: resume (it got quieter), override (Keep going anyway), later (come back later). */
  | { type: 'p2'; outcome: 'resume' | 'override' | 'later'; result?: HandoffResult }
  /** Thanks or the tender path's hold completed. */
  | { type: 'hold' }
  /** Name: entered, or null for "Not yet". */
  | { type: 'name'; name: string | null }
  /** The orienting close: a choice, or null for skip. */
  | { type: 'close'; choiceId: string | null }
  /** Leave P2's "come back later" message. */
  | { type: 'continue' };

/** 5d offers at most this many of the person's parts. */
export const FRONT_MAX = 4;

/** 5d's part chips for this visit: never the part being visited, at most FRONT_MAX. */
export function frontChoices(session: Pick<MeetSession, 'partId'>, ctx: MeetContext): string[] {
  return (ctx.frontParts ?? []).filter((id) => id !== session.partId).slice(0, FRONT_MAX);
}

export function firstStep(ctx: MeetContext): MeetStep {
  return ctx.namedEntry ? afterFind(ctx) : 'find';
}

/** The blending check needs "it" to point at something: right after Find, or first when the entry named it. */
const afterFind = (ctx: MeetContext): MeetStep => (ctx.blendCheck ? 'blend' : 'where');

const isSafety = (s: MeetSession, ctx: MeetContext) => ctx.safetyLineMoves.includes(s.move) || s.danger;

export function initialMeet(ctx: MeetContext, entry: { move: string; partId?: string | null; trailheadKind?: string }): MeetState {
  const session: MeetSession = {
    move: entry.move, partId: entry.partId ?? null, trailheadKind: entry.trailheadKind ?? 'move', place: null,
    shape: [0, 0, 0, 0, 0], feelTowardIds: [], steppedBack: 0, tender: false, danger: false, stopReason: null, kept: null,
    candidate: false, handoffs: [],
  };
  return { step: firstStep(ctx), session, round: 0, resumeNote: false, later: false, crisis: isSafety(session, ctx), aside: null, p2: null };
}

/**
 * The next state for an event from the current screen. An event the current step doesn't take returns
 * the state unchanged, so a stale tap can never skip a screen.
 */
export function meetNext(state: MeetState, event: MeetEvent, ctx: MeetContext): MeetState {
  const s = state.session;
  const at = state.step;
  let session: MeetSession = s;
  let next: MeetStep = at;
  let extra: Partial<MeetState> = {};
  const set = (p: Partial<MeetSession>) => { session = { ...session, ...p }; };
  const safety = () => isSafety(session, ctx);
  /** A non-Self-like answer: 4b, at most maxNonSelfAnswers times in all, then "That's enough for today". */
  const steppedBack = (): MeetStep => {
    const n = session.steppedBack + 1;
    set({ steppedBack: n });
    return n >= ctx.maxNonSelfAnswers ? 'unblendEnd' : 'unblend';
  };
  const o = event.type === 'option' ? event.option : null;

  switch (at) {
    case 'find':
      if (event.type === 'setMove') { set({ move: event.move }); break; }
      if (event.type === 'find') {
        set({ move: event.move ?? session.move, partId: event.partId ?? session.partId });
        next = afterFind(ctx);
      } else if (o) set({ findId: o.id }); // "Something else": recorded, the person still says what's there
      break;
    case 'blend': {
      const answer = o ? BLEND_ANSWERS[o.id] : undefined;
      if (!o || !answer) break;
      set({ blendCheck: answer });
      // "Not sure" is a complete answer and goes on like "I can notice it"; only body_first changes the way.
      if (o.branch === 'body_first') {
        next = 'blendBody';
        extra = { p2: { band: ctx.p2Band ?? 'stirred', start: ctx.p2OnEntry ? 'later' : 'card' } };
      } else next = 'where';
      break;
    }
    case 'blendBody':
      if (event.type === 'p2' && !state.later) {
        if (event.result) set({ handoffs: [...session.handoffs, event.result] });
        if (event.outcome === 'later') {
          // Ends without the orienting close (decided 16 Oct): P2 just asked its own reread.
          set({ exitStep: 'blend' });
          extra = { later: true };
        } else {
          // Resume or keep going: on to Where, never asking the blending check again.
          next = 'where';
          extra = { resumeNote: event.outcome === 'resume', p2: null };
        }
      } else if (event.type === 'continue' && state.later) {
        next = 'done';
        extra = { p2: null };
      }
      break;
    case 'where':
      if (event.type === 'place') { set({ place: event.place }); next = 'shape'; }
      else if (o) { set({ place: null }); next = 'shape'; } // "Nowhere I can find" is a complete answer
      break;
    case 'shape': {
      const shape = event.type === 'shape' ? event.shape : o ? session.shape : null;
      if (!shape) break;
      set({ shape: [...shape] });
      if (state.round + 1 >= SHAPE_ROUNDS) next = 'age';
      else extra = { round: state.round + 1 };
      break;
    }
    case 'age':
      if (!o) break;
      set({ ageId: o.id });
      next = o.branch === 'tender_offer' ? 'young' : 'voice';
      break;
    case 'young':
      if (!o) break;
      set({ youngId: o.id });
      // The tender path replaces 3c–8b with the presence hold.
      if (o.branch === 'tender_path') { set({ tender: true }); next = 'tender'; } else next = 'voice';
      break;
    case 'voice':
    case 'job':
      if (event.type === 'ownWords') {
        // Own words are never read: on a safety-line move they take the danger branch, straight to Thanks.
        set(at === 'voice' ? { ownVoice: event.text } : { ownJob: event.text });
        if (ctx.safetyLineMoves.includes(session.move)) { set({ danger: true }); next = 'thank'; }
        else next = at === 'voice' ? 'feel' : 'likes';
      } else if (o) {
        set(at === 'voice' ? { voiceId: o.id } : { jobId: o.id });
        next = at === 'voice' ? 'feel' : 'likes';
      }
      break;
    case 'feel':
      if (!o) break;
      set({ feelTowardIds: [...session.feelTowardIds, o.id] });
      // Self-like and "not sure" both go on: the gate never certifies Self, it only pauses on a non-Self answer.
      if (o.branch === 'unblend') next = steppedBack();
      else if (o.branch === 'grounding') { set({ stopReason: 'nothing' }); next = 'nothing'; }
      else next = 'job';
      break;
    case 'unblend':
      if (!o) break;
      next = o.branch === 'unblend' ? steppedBack() : 'feel';
      break;
    case 'unblendEnd':
      if (!o) break;
      // A yes only records the candidate; it never opens another flow.
      set({ stopReason: 'worried_part', candidate: o.branch === 'candidate' });
      next = 'close';
      break;
    case 'nothing':
      // Never called a part: grounding or the body, then Thanks and close; or straight to close.
      if (!o) break;
      if (o.branch === 'end') next = 'close';
      else { next = 'thank'; extra = { aside: o.branch === 'grounding' ? 'grounding' : o.branch === 'body_first' ? 'body' : null }; }
      break;
    case 'likes':
      if (o) { set({ likesId: o.id }); next = 'guards'; }
      break;
    case 'guards':
      // A category, never a memory: no follow-up question about it.
      if (event.type === 'hurt') set({ guardsId: event.hurtId, hurtId: event.hurtId });
      else if (o) set({ guardsId: o.id, hurtId: undefined });
      else break;
      // 5d only when there is another part to name (never on the tender path, which skips Guards).
      next = frontChoices(session, ctx).length ? 'front' : 'fear';
      break;
    case 'front':
      // One pick. A part is stored by id; "No one I know" and "Not sure" store nothing.
      if (event.type === 'front' && frontChoices(session, ctx).includes(event.partId)) { set({ frontOfPartId: event.partId }); next = 'fear'; }
      else if (o) { set({ frontOfPartId: undefined }); next = 'fear'; }
      break;
    case 'fear':
      if (event.type === 'ownWords') {
        // Own words at the fear step are never read: always the conservative branch.
        set({ ownFear: event.text, stopReason: 'own_words' });
        next = 'stop';
      } else if (o) {
        set({ fearId: o.id });
        if (o.flag === 'tender' || o.branch === 'conservative') { set({ stopReason: 'tender' }); next = 'stop'; }
        else if (o.flag === 'danger' || o.branch === 'danger') { set({ danger: true }); next = 'thank'; }
        else next = safety() ? 'thank' : 'update'; // a safety-line part never gets 7 on its own
      }
      break;
    case 'stop':
      // Nothing offers to go further: Thanks (after the body, if asked), skipping 7 and 8b.
      if (!o) break;
      next = 'thank';
      extra = { aside: o.branch === 'body_first' ? 'body' : null };
      break;
    case 'update':
      if (!o) break;
      set({ updateId: o.id });
      next = o.id === UPDATE_NOT_YET ? 'canNow' : 'thank';
      break;
    case 'canNow':
      if (o) { set({ canNowId: o.id }); next = 'thank'; }
      break;
    case 'thank':
      if (event.type !== 'hold') break;
      // Danger and "nothing there" go straight to close; any other stop or a safety-line part skips 8b.
      if (session.danger || session.stopReason === 'nothing') next = 'close';
      else next = session.stopReason || safety() ? 'name' : 'rather';
      break;
    case 'tender':
      if (event.type === 'hold') next = 'name';
      break;
    case 'rather':
      if (o) { set({ ratherId: o.id }); next = 'name'; }
      break;
    case 'name':
      if (event.type === 'name') { set({ name: event.name?.trim() || undefined }); next = 'keep'; }
      else if (o) { set({ name: undefined }); next = 'keep'; }
      break;
    case 'keep':
      // Rule 4's yes: only "Yes, keep it" writes a part.
      if (o) { set({ kept: o.branch === 'keep' }); next = 'close'; }
      break;
    case 'close':
      if (event.type === 'close') { set({ closeId: event.choiceId ?? undefined }); next = 'done'; }
      break;
    case 'done':
      break;
  }

  if (session === s && next === at && Object.keys(extra).length === 0) return state;
  const moved = next !== at;
  return {
    ...state,
    session,
    step: next,
    // Notes and asides last one screen.
    resumeNote: moved ? false : state.resumeNote,
    aside: null,
    crisis: isSafety(session, ctx),
    ...extra,
  };
}

/** The Part as `keepPart` would write it: only on 9b's yes, own words copied only then. Never ask-fresh fields. */
export interface MeetKeep {
  partId: string | null; name: string | null; tender: boolean; shapeSig: number[]; places: string[]; ageId: string | null;
  voiceIds: string[]; ownVoice: string | null; jobIds: string[]; ownJob: string | null; fearIds: string[]; ownFear: string | null;
  preferredRoleIds: string[]; uses: string[]; guards: string[];
}

export interface MeetSave {
  /** The PartSession log record (finalise-once). */
  partSession: Omit<MeetSession, 'name' | 'kept' | 'closeId' | 'candidate'>;
  /** The spine's ToolSession close. No then-vs-now at all when P2's "come back later" ended the run. */
  toolSession: { toolId: 'meet-a-part'; closeKind: 'orienting'; thenVsNow?: string | null };
  keep: MeetKeep | null;
  followUp: { type: 'part_checkback'; due: 'tomorrow' } | null;
  candidate: { origin: 'worried_part'; moveIds: string[] } | null;
}

export function whatToSave(state: MeetState): MeetSave {
  const s = state.session;
  // The name is the person's own text: it reaches the part on 9b's yes, never the log.
  const { kept, closeId, candidate } = s;
  const log: MeetSave['partSession'] = { ...s };
  for (const k of ['name', 'kept', 'closeId', 'candidate'] as const) delete (log as Partial<MeetSession>)[k];
  const list = (id?: string) => (id ? [id] : []);
  return {
    partSession: { ...log, shape: s.shape.map((n) => +n.toFixed(2)) },
    toolSession: { toolId: 'meet-a-part', closeKind: 'orienting', ...(state.later ? {} : { thenVsNow: closeId ?? null }) },
    keep: kept === true ? {
      partId: s.partId, name: s.name ?? null, tender: s.tender, shapeSig: s.shape.map((n) => +n.toFixed(2)), places: s.place ? [s.place] : [],
      ageId: s.ageId ?? null, voiceIds: list(s.voiceId), ownVoice: s.ownVoice ?? null, jobIds: list(s.jobId), ownJob: s.ownJob ?? null,
      fearIds: list(s.fearId), ownFear: s.ownFear ?? null, preferredRoleIds: list(s.ratherId), uses: [s.move], guards: list(s.hurtId),
    } : null,
    followUp: kept === true ? { type: 'part_checkback', due: 'tomorrow' } : null,
    candidate: candidate ? { origin: 'worried_part', moveIds: [s.move] } : null,
  };
}
