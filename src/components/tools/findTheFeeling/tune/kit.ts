import type { RefObject } from 'react';
import type { FindTheFeelingCopy, SoundVec } from '../../../../data/findTheFeelingTypes';
import type { RoomProps } from '../roomTypes';
import type { TuneAudio } from './audio';
import type { InstState, Layout } from './instState';
import type { Search, Sound } from './sound';
import type { Step } from '../../../../lib/findTheFeelingFlow';

export interface RegHandlers { onHoldStart?: () => void; onHoldEnd?: () => void; onPluck?: (i: number) => void }

/** What every step body gets from the room. Refs are only read in handlers and effects. */
export interface Kit {
  room: RoomProps;
  copy: FindTheFeelingCopy;
  instRef: RefObject<InstState>;
  audioRef: RefObject<TuneAudio | null>;
  searchRef: RefObject<Search | null>;
  regHandlersRef: RefObject<RegHandlers>;
  /** Glide the strings (and the synth, if on) toward a sound. tau: settle time constant in seconds. */
  apply: (s: Sound, tau?: number, glideTc?: number) => void;
  /** The scene sound: the found sound with ambient descent (and any completed regulation) applied. */
  base: Sound;
  /** The found sound (the snapshot), never drifted. */
  found: SoundVec | null;
  reduced: boolean;
  /** Fill {name} and friends in copy. */
  t: (s: string, vars?: Record<string, string | number>) => string;
}

/** Slow glide used for ambient descent and scene changes (~1.5–2 s to settle). */
export const SLOW = 0.6;

/** Where the strings sit for each step (fraction of height), how far apart, how big. */
export const LAYOUT: Record<Step, Layout> = {
  intro: { cy: 0.47, gap: 96, amp: 1 },
  find: { cy: 0.45, gap: 100, amp: 1 },
  capacity: { cy: 0.34, gap: 64, amp: 0.75 },
  pull: { cy: 0.25, gap: 44, amp: 0.5 },
  regulate: { cy: 0.46, gap: 100, amp: 1 },
  orient: { cy: 0.27, gap: 40, amp: 0.4 },
  word: { cy: 0.38, gap: 70, amp: 0.8 },
  setOff: { cy: 0.24, gap: 40, amp: 0.4 },
  close: { cy: 0.36, gap: 64, amp: 0.8 },
  next: { cy: 0.25, gap: 44, amp: 0.45 },
  collection: { cy: 0.3, gap: 60, amp: 0.6 },
  handoff: { cy: 0.3, gap: 56, amp: 0.6 },
};
