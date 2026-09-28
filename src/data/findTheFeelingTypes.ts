/**
 * Types for "Find the feeling" (Shape it / Tune it). All clinical content (word signatures,
 * families, urge routing, gates, copy) comes from the graph via getFindTheFeelingContent;
 * nothing here describes what an emotion is.
 */

export type Way = 'shape' | 'tune';
export type Band = 'steady' | 'stirred' | 'flooded';
export type UrgeId = 'fight' | 'chase' | 'hide' | 'blank';
export type Regulation = 'smooth' | 'warm' | 'tune' | 'wake' | 'skipped' | 'none';
export type SetOff = 'someone' | 'situation' | 'body' | 'nothing' | 'not_sure';
export type Close = 'louder' | 'same' | 'quieter' | 'much';
export type Entry = 'tool' | 'checkin' | 'recover';

/** Shape features, each -1..1 (0 = neutral grey clay): sharp, heat, weight, buzz, clench. */
export type ShapeVec = [number, number, number, number, number];
/** Sound features, each 0..1: rough, grit, register, pulse. */
export type SoundVec = [number, number, number, number];

export interface FeelingWord {
  emotionId: string;
  name: string;
  shape: ShapeVec;
  sound: SoundVec;
  /** Order within its family ("Close" walks the family, "Not that" jumps family). */
  offer: number;
  /** App tool ids whose graph concept ADDRESSES this emotion (word routes). */
  addressedBy: string[];
}

export interface FeelingFamily {
  id: string;
  label: string;
  order: number;
  words: FeelingWord[];
}

export interface FeelingUrge {
  id: UrgeId;
  label: string;
  sub: string;
  order: number;
  /** App tool ids this urge routes to, best first. */
  routes: string[];
}

export interface FindTheFeelingGates {
  regulateBands: Band[];
  activateUrges: UrgeId[];
  floodedBlank: 'regulate_then_orient_no_label';
  maxWordsOffered: number;
  slowStrokePxPerSec: [number, number];
  fastStrokePxPerSec: number;
  breathHoldMs: number;
  breathsToSettle: number;
  plucksToWake: number;
  regulationEscapeSeconds: number;
  ambientDescent: {
    perStep: number;
    maxTotal: number;
    startAfter: string;
    blankDirection: 'brighten';
    floodedBlankDirection: 'calm';
  };
}

/** Copy lives in the graph (FindTheFeelingFlow.contentJson.copy). Shape kept loose on purpose. */
export interface FindTheFeelingCopy {
  entry: Record<string, string>;
  shape: {
    intro: string; begin: string; round: string; cantTell: string; rounds: [string, string][];
    smooth: { title: string; sub: string; tooFast: string; hold: string; enough: string };
    warm: { title: string; sub: string; hold: string; enough: string };
    wordLead: string; shelf: string;
  };
  tune: {
    intro: string; begin: string; sound: string; continue: string;
    search: string; closer: string; further: string; thatsIt: string;
    breathe: Record<string, string>; wake: Record<string, string>; wordLead: string; harp: string;
  };
  capacity: { prompt: string; incoming: string; options: Record<Band, string> };
  pull: { title: string };
  word: { yes: string; close: string; no: string; none: string; floodedBlank: string };
  setOff: { title: string; optional: boolean; skip: string } & Record<SetOff, string>;
  close: { prompt: string; then: string; now: string; options: Record<Close, string> };
  orient: { title: string; sub: string; look: string; move: string; moveSeconds: number; startMove: string; skip: string; seen: string };
  next: { title: string; sub: string; none: string; open: string; done: string };
  collection: {
    title: string; new: string; empty: string; noWord: string; again: string; saving: string; saved: string;
    saveError: string; retry: string; signedOut: string; rooms: Record<string, string>;
  };
  nav: { back: string; skip: string };
  [k: string]: unknown;
}

export interface FindTheFeelingFlowDoc {
  version: string;
  ways: Way[];
  defaultWay: Way;
  gates: FindTheFeelingGates;
  bandIntensity: Record<Band, number>;
  copy: FindTheFeelingCopy;
  sourceIds: string[];
}

export interface FindTheFeelingContent {
  version: string;
  flow: FindTheFeelingFlowDoc;
  families: FeelingFamily[];
  urges: FeelingUrge[];
  /** Fixed routes when flooded + blank (no word step): regulation tools only. */
  floodedBlankRoutes: string[];
}

export interface CollectedWord {
  emotionId: string;
  name: string;
  shape: ShapeVec | null;
  sound: SoundVec | null;
  count: number;
  ways: Way[];
  firstAt: string;
}

export interface FindTheFeelingSession {
  schemaVersion: 1;
  id: string;
  contentVersion: string;
  entry: Entry;
  way: Way;
  switchedWay: boolean;
  shape: ShapeVec | null;
  sound: SoundVec | null;
  band: Band;
  pull: UrgeId;
  regulation: Regulation;
  offered: string[];
  word: string | null;
  wordAccepted: boolean;
  setOff: SetOff | null;
  close: Close | null;
  routedTo: string[];
  ambientDescent: boolean;
}
