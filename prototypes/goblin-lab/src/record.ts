import type { Band, Pull } from './script';
export interface SessionRecord {
  scenarioId: 'brushed' | 'mocked' | 'left-out' | 'pulled-away' | 'small';
  band: Band;
  pull: Pull;
  word: string | null;
  exitId: 'ask' | 'land' | 'opposite';
  close: 'louder' | 'same' | 'quieter' | 'much';
}
export type DirectionProps = { onRecord?: (r: SessionRecord) => void };
/** Ask only opens when there's capacity for it. */
export const askUnlocked = (band: Band, pull: Pull) => band === 'steady' && pull !== 'blank';
