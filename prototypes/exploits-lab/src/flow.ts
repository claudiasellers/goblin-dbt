import { useReducer } from 'react';
import { SCENARIOS, STARTING_WORDS, type Band, type Pull, type Scenario } from './script';

export type Step = 'scenario' | 'capacity' | 'pull' | 'settle' | 'word' | 'validate' | 'exit' | 'close' | 'done';

export interface FlowState {
  step: Step;
  scenarioIdx: number;
  scenario: Scenario | null;
  band: Band | null;
  pull: Pull | null;
  wordIdx: number;
  word: string | null;
  exit: string | null;
  close: string | null;
  words: string[];
  newWord: boolean;
}

type Action =
  | { t: 'scenario'; answer: 'yes' | 'kind' | 'no' }
  | { t: 'band'; band: Band }
  | { t: 'pull'; pull: Pull }
  | { t: 'settled' }
  | { t: 'word'; answer: 'yes' | 'sort' | 'no' }
  | { t: 'validated' }
  | { t: 'exit'; id: string }
  | { t: 'close'; id: string }
  | { t: 'restart' };

const init = (): FlowState => ({
  step: 'scenario', scenarioIdx: 0, scenario: null, band: null, pull: null,
  wordIdx: 0, word: null, exit: null, close: null, words: STARTING_WORDS, newWord: false,
});

function reduce(s: FlowState, a: Action): FlowState {
  switch (a.t) {
    case 'scenario': {
      const current = SCENARIOS[s.scenarioIdx];
      if (a.answer !== 'no') return { ...s, scenario: current, step: 'capacity' };
      const next = s.scenarioIdx + 1;
      // Nothing matched: fall back to the most common one rather than trapping the user.
      if (next >= SCENARIOS.length) return { ...s, scenario: SCENARIOS[0], step: 'capacity' };
      return { ...s, scenarioIdx: next };
    }
    case 'band': return { ...s, band: a.band, step: 'pull' };
    case 'pull': return { ...s, pull: a.pull, step: s.band === 'flooded' || a.pull === 'blank' ? 'settle' : 'word' };
    case 'settled': return { ...s, band: s.band === 'flooded' ? 'stirred' : s.band, step: 'word' };
    case 'word': {
      const words = s.scenario!.words;
      if (a.answer === 'yes' || a.answer === 'sort') {
        const w = words[s.wordIdx];
        const isNew = !s.words.includes(w);
        return { ...s, word: w, step: 'validate', words: isNew ? [...s.words, w] : s.words, newWord: isNew };
      }
      if (s.wordIdx + 1 < words.length) return { ...s, wordIdx: s.wordIdx + 1 };
      return { ...s, word: null, step: 'validate' }; // "not sure" is a valid answer
    }
    case 'validated': return { ...s, step: 'exit' };
    case 'exit': return { ...s, exit: a.id, step: 'close' };
    case 'close': return { ...s, close: a.id, step: 'done' };
    case 'restart': return { ...init(), words: s.words };
  }
}

export function useFlow() {
  return useReducer(reduce, undefined, init);
}

export interface ExitOption { id: string; title: string; body: string; locked?: string; best?: boolean }

export function exitOptions(s: FlowState, E: typeof import('./script').EXITS): ExitOption[] {
  const opp = E.opposite[s.pull ?? 'hide'];
  const ask = { id: 'ask', ...E.steady };
  const land = { id: 'land', ...E.land };
  const opposite = { id: 'opposite', ...opp };
  if (s.band === 'steady' && s.pull !== 'blank') return [{ ...ask, best: true }, opposite, land];
  return [{ ...opposite, best: true }, land, { ...ask, locked: 'Opens once it’s quieter. Asking lands better then.' }];
}

export const stepIndex: Record<Step, number> = {
  scenario: 0, capacity: 1, pull: 2, settle: 3, word: 4, validate: 5, exit: 6, close: 7, done: 8,
};
