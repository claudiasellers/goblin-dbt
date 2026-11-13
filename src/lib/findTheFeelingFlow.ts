/**
 * Step machine for "Find the feeling". Rooms (Shape / Tune) render; this decides what comes next.
 * Clinical gates come from the graph payload via lib/findTheFeeling.
 */
import type {
  Band, Close, Entry, FindTheFeelingContent, FindTheFeelingSession, Regulation, SetOff, ShapeVec, SoundVec, UrgeId, Way,
} from '../data/findTheFeelingTypes';
import {
  answerOffer, currentWord, firstOffer, isFloodedBlank, rankFamilies, regulationFor, routeNext,
  type Found, type OfferState,
} from './findTheFeeling';

export type Step =
  | 'intro' | 'find' | 'pull' | 'regulate' | 'orient' | 'word'
  | 'setOff' | 'close' | 'next' | 'collection' | 'handoff';

export interface FlowState {
  entry: Entry;
  way: Way;
  switchedWay: boolean;
  step: Step;
  found: Found | null;
  /**
   * Always null now: the capacity question ("If someone asked you for a favour…") is out
   * (Claudia, 30 Sep) until there is a better way to ask it. Kept so the gates and the session
   * shape don't change when a band comes back.
   */
  band: Band | null;
  pull: UrgeId | null;
  regulation: Regulation;
  offer: OfferState;
  word: string | null;
  wordAccepted: boolean;
  setOff: SetOff | null;
  close: Close | null;
  routedTo: string[];
  /** Transitions since the shape/sound was found: drives ambient descent. */
  stepsSinceStart: number;
  ambientDescent: boolean;
  /** The person's own words, taken as the word step opens (ER-10 part 3), so the offers can't shift under them. */
  own: string[];
}

export type Action =
  | { t: 'begin' }
  | { t: 'switchWay'; way: Way }
  | { t: 'found'; found: Found }
  | { t: 'pull'; pull: UrgeId }
  | { t: 'regulated'; skipped: boolean }
  | { t: 'oriented' }
  | { t: 'word'; answer: 'yes' | 'close' | 'no' }
  | { t: 'setOff'; value: SetOff | null }
  | { t: 'close'; value: Close }
  | { t: 'nextDone' }
  | { t: 'back' }
  | { t: 'restart' };

export interface History { stack: FlowState[] }

export function initialFlow(content: FindTheFeelingContent, entry: Entry = 'tool', way?: Way, ambientDescent = true): FlowState {
  return {
    entry, way: way ?? content.flow.defaultWay, switchedWay: false, step: 'intro', found: null,
    band: null, pull: null, regulation: 'none', offer: firstOffer(), word: null, wordAccepted: false,
    setOff: null, close: null, routedTo: [], stepsSinceStart: 0, ambientDescent, own: [],
  };
}

const afterWord = (s: FlowState): Step => (s.entry === 'checkin' ? 'handoff' : 'setOff');

/** `ownWords`: read as the word step opens (the person's own words, most used first; ER-10 part 3). */
export function makeFlowReducer(content: FindTheFeelingContent, ownWords: () => readonly string[] = () => []) {
  const g = content.flow.gates;
  const urgeRoutes = Object.fromEntries(content.urges.map(u => [u.id, u.routes]));
  const allWords = content.families.flatMap(f => f.words);

  const step = (s: FlowState, next: Step, patch: Partial<FlowState> = {}): FlowState => ({
    ...s, ...patch, ...(next === 'word' ? { own: [...ownWords()] } : {}), step: next,
    stepsSinceStart: s.found || patch.found ? s.stepsSinceStart + 1 : 0,
  });

  /** Every action belongs to one step; late taps (fade-outs, double taps, delayed dispatches after Back) are ignored. */
  function reduce(s: FlowState, a: Action): FlowState {
    switch (a.t) {
      case 'begin': return s.step === 'intro' ? { ...s, step: 'find' } : s;
      case 'switchWay':
        if (s.step !== 'intro' && s.step !== 'find') return s;
        return { ...s, way: a.way, switchedWay: true, found: null };
      case 'found':
        if (s.step !== 'find' || a.found.way !== s.way) return s;
        return { ...s, found: a.found, step: 'pull' };
      case 'pull': {
        if (s.step !== 'pull') return s;
        const reg = regulationFor(s.way, s.band, a.pull, g);
        if (reg !== 'none') return step(s, 'regulate', { pull: a.pull, regulation: reg });
        return step(s, 'word', { pull: a.pull, regulation: 'none' });
      }
      case 'regulated': {
        if (s.step !== 'regulate') return s;
        const regulation: Regulation = a.skipped ? 'skipped' : s.regulation;
        if (isFloodedBlank(s.band, s.pull)) return step(s, 'orient', { regulation });
        return step(s, 'word', { regulation });
      }
      case 'oriented': return s.step !== 'orient' ? s : step(s, afterWord(s), { word: null, wordAccepted: false });
      case 'word': {
        if (s.step !== 'word' || !s.found) return s;
        const ranked = rankFamilies(content.families, s.found, s.own);
        const r = answerOffer(ranked, s.offer, a.answer, g.maxWordsOffered);
        if (!r.done) return { ...s, offer: r.state };
        return step(s, afterWord(s), { offer: r.state, word: r.word, wordAccepted: r.word !== null });
      }
      case 'setOff': return s.step === 'setOff' ? step(s, 'close', { setOff: a.value }) : s;
      case 'close': {
        if (s.step !== 'close') return s;
        const word = s.word ? allWords.find(w => w.emotionId === s.word) ?? null : null;
        const routedTo = routeNext({
          band: s.band, pull: s.pull!, word, setOff: s.setOff, urgeRoutes, floodedBlankRoutes: content.floodedBlankRoutes,
        });
        return step(s, 'next', { close: a.value, routedTo });
      }
      case 'nextDone': return s.step === 'next' ? step(s, 'collection') : s;
      case 'back': return s; // handled by the history wrapper
      case 'restart': return initialFlow(content, s.entry, s.way, s.ambientDescent);
      default: return s; // unknown actions (e.g. the retired 'band') are ignored
    }
  }

  /** History wrapper: every step change is pushed so Back restores the previous screen exactly. */
  return function historyReducer(h: History, a: Action): History {
    const cur = h.stack[h.stack.length - 1];
    if (a.t === 'back') return h.stack.length > 1 ? { stack: h.stack.slice(0, -1) } : h;
    if (a.t === 'restart') return { stack: [reduce(cur, a)] };
    const next = reduce(cur, a);
    if (next === cur) return h;
    // Same-step changes (word offers, way switch) replace; step changes push.
    return next.step === cur.step ? { stack: [...h.stack.slice(0, -1), next] } : { stack: [...h.stack, next] };
  };
}

/** The word currently on offer (null outside the word step or when nothing is left). */
export function wordOnOffer(content: FindTheFeelingContent, s: FlowState) {
  if (!s.found) return null;
  return currentWord(rankFamilies(content.families, s.found, s.own ?? []), s.offer);
}

/** Session record for saveFindTheFeelingSession. Only valid once the flow has reached its end. */
export function toSession(s: FlowState, id: string, contentVersion: string): FindTheFeelingSession | null {
  if (!s.found || !s.pull) return null;
  if (s.entry !== 'checkin' && !s.close) return null;
  return {
    schemaVersion: 1, id, contentVersion, entry: s.entry, way: s.way, switchedWay: s.switchedWay,
    shape: s.found.way === 'shape' ? (s.found.vec as ShapeVec) : null,
    sound: s.found.way === 'tune' ? (s.found.vec as SoundVec) : null,
    band: s.band, pull: s.pull, regulation: s.regulation, offered: s.offer.offered,
    word: s.word, wordAccepted: s.wordAccepted, setOff: s.setOff, close: s.close,
    routedTo: s.routedTo, ambientDescent: s.ambientDescent,
  };
}

export const STEP_ORDER: Step[] = ['intro', 'find', 'pull', 'regulate', 'orient', 'word', 'setOff', 'close', 'next', 'collection'];
