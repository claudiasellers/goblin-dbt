/**
 * Wise mind content (docs/design/wise-mind.md): what getWiseMindContent returns and wise-mind.json ships.
 * Mirror of functions/src/wiseMind/types.ts (tests/wise-mind-content.test.mjs asserts they stay identical).
 */
export type MindSide = 'emotion' | 'reason';
export type WiseMindPracticeKind = 'drift' | 'hold' | 'ask';

export interface MindVoiceItem { id: string; label: string }

export interface WiseMindQuestionItem {
  id: string;
  label: string;
  order: number;
  /** The practice highlighted on screen 3 for this question (Ask and listen, or the stone when there's none). */
  defaultPracticeId: string;
  /** What each mind says about this question (screen 2), in order. */
  voices: Record<MindSide, MindVoiceItem[]>;
}

export interface WiseMindPracticeItem {
  id: string;
  name: string;
  sub: string;
  kind: WiseMindPracticeKind;
  lines: string[];
  /** hold / ask: how many breaths; drift: null. */
  breaths: number | null;
  /** drift: about how long the lines take; hold / ask: null. */
  seconds: number | null;
  order: number;
}

export interface WiseMindAnswerItem {
  id: string;
  label: string;
  order: number;
  /** App tool ids (src/data/tools.ts) offered on screen 6. */
  nextToolIds: string[];
  /** 'quiet': Nothing yet (the quiet line, then the close). */
  kind: 'quiet' | null;
}

export interface WiseMindContent {
  version: string;
  /** Own words anywhere in the flow: length-checked only, never linted. */
  ownMax: number;
  /** Every other visible line of screens 1-6, by screen. */
  copy: Record<string, unknown>;
  questions: WiseMindQuestionItem[];
  practices: WiseMindPracticeItem[];
  answers: WiseMindAnswerItem[];
}
