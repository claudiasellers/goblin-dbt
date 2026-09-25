/**
 * Input validation for "Find the feeling" sessions. Shape, range and gate-consistency checks;
 * ids (words, routes) are verified against the graph in the callable. No free text is accepted.
 */
export type Way = 'shape' | 'tune';
export type Band = 'steady' | 'stirred' | 'flooded';
export type UrgeId = 'fight' | 'chase' | 'hide' | 'blank';
export type Regulation = 'smooth' | 'warm' | 'tune' | 'wake' | 'skipped' | 'none';

export interface FindTheFeelingSessionInput {
  schemaVersion: 1;
  id: string;
  contentVersion: string;
  entry: 'tool' | 'checkin' | 'recover';
  way: Way;
  switchedWay: boolean;
  shape: number[] | null;
  sound: number[] | null;
  band: Band;
  pull: UrgeId;
  regulation: Regulation;
  offered: string[];
  word: string | null;
  wordAccepted: boolean;
  setOff: 'someone' | 'situation' | 'body' | 'nothing' | 'not_sure' | null;
  close: 'louder' | 'same' | 'quieter' | 'much' | null;
  routedTo: string[];
  ambientDescent: boolean;
}

export interface FindTheFeelingGates {
  regulateBands: string[];
  activateUrges: string[];
  maxWordsOffered: number;
  floodedBlankRoutes: string[];
}

const ENTRIES = ['tool', 'checkin', 'recover'] as const;
const WAYS = ['shape', 'tune'] as const;
const BANDS = ['steady', 'stirred', 'flooded'] as const;
const URGES = ['fight', 'chase', 'hide', 'blank'] as const;
const REGULATIONS = ['smooth', 'warm', 'tune', 'wake', 'skipped', 'none'] as const;
const SET_OFF = ['someone', 'situation', 'body', 'nothing', 'not_sure'] as const;
const CLOSES = ['louder', 'same', 'quieter', 'much'] as const;
const ID = /^[a-z][a-z0-9_]{0,63}$/;
const TOOL_ID = /^[a-z][a-z0-9-]{0,63}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function oneOf<T extends string>(values: readonly T[], v: unknown, key: string): T {
  if (typeof v !== 'string' || !(values as readonly string[]).includes(v)) throw new Error(`Invalid ${key}`);
  return v as T;
}

function vec(v: unknown, len: number, lo: number, hi: number, key: string): number[] {
  if (!Array.isArray(v) || v.length !== len || !v.every(x => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi)) {
    throw new Error(`Invalid ${key}`);
  }
  return v as number[];
}

function ids(v: unknown, key: string, max: number, re: RegExp): string[] {
  if (!Array.isArray(v) || v.length > max || !v.every(x => typeof x === 'string' && re.test(x))) throw new Error(`Invalid ${key}`);
  if (new Set(v).size !== v.length) throw new Error(`Duplicate ${key}`);
  return v as string[];
}

/** The regulation a session must record: same rule as the client (lib/findTheFeeling regulationFor). */
export function expectedRegulation(way: Way, band: Band, pull: UrgeId, gates: FindTheFeelingGates): Regulation {
  if (gates.regulateBands.includes(band)) return way === 'shape' ? 'smooth' : 'tune';
  if (gates.activateUrges.includes(pull)) return way === 'shape' ? 'warm' : 'wake';
  return 'none';
}

export function validateFindTheFeelingSession(input: unknown): FindTheFeelingSessionInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a session');
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion !== 1) throw new Error('Invalid schema version');
  if (typeof raw.id !== 'string' || !UUID.test(raw.id)) throw new Error('Invalid session ID');
  if (typeof raw.contentVersion !== 'string' || raw.contentVersion.length > 40) throw new Error('Invalid content version');
  for (const k of ['switchedWay', 'wordAccepted', 'ambientDescent']) {
    if (typeof raw[k] !== 'boolean') throw new Error(`Invalid ${k}`);
  }
  const entry = oneOf(ENTRIES, raw.entry, 'entry');
  const way = oneOf(WAYS, raw.way, 'way');
  // Exactly the vector for the way used.
  const shape = way === 'shape' ? vec(raw.shape, 5, -1, 1, 'shape') : null;
  const sound = way === 'tune' ? vec(raw.sound, 4, 0, 1, 'sound') : null;
  if ((way === 'shape' && raw.sound !== null) || (way === 'tune' && raw.shape !== null)) throw new Error('Vector does not match way');
  const band = oneOf(BANDS, raw.band, 'band');
  const pull = oneOf(URGES, raw.pull, 'pull');
  const regulation = oneOf(REGULATIONS, raw.regulation, 'regulation');
  const offered = ids(raw.offered, 'offered', 8, ID);
  const word = raw.word === null ? null : ids([raw.word], 'word', 1, ID)[0];
  const wordAccepted = raw.wordAccepted as boolean;
  if (wordAccepted !== (word !== null)) throw new Error('word and wordAccepted disagree');
  if (word !== null && !offered.includes(word)) throw new Error('Accepted word was not offered');
  const setOff = raw.setOff === null ? null : oneOf(SET_OFF, raw.setOff, 'setOff');
  const close = raw.close === null ? null : oneOf(CLOSES, raw.close, 'close');
  const routedTo = ids(raw.routedTo, 'routedTo', 2, TOOL_ID);
  // A tool session reaches the close; a check-in session hands back after the word.
  if (entry !== 'checkin' && close === null) throw new Error('Missing close');
  if (entry === 'checkin' && (close !== null || setOff !== null || routedTo.length)) throw new Error('Check-in sessions end at the word');
  return {
    schemaVersion: 1, id: raw.id, contentVersion: raw.contentVersion, entry, way,
    switchedWay: raw.switchedWay as boolean, shape, sound, band, pull, regulation, offered, word, wordAccepted,
    setOff, close, routedTo, ambientDescent: raw.ambientDescent as boolean,
  };
}

/**
 * Clinical consistency against the graph's gates. Flooded + blank (numb but activated) must not
 * have been offered a word: affect labelling is contraindicated there.
 */
export function checkFindTheFeelingGates(s: FindTheFeelingSessionInput, gates: FindTheFeelingGates): string | null {
  const expected = expectedRegulation(s.way, s.band, s.pull, gates);
  if (expected === 'none' ? s.regulation !== 'none' : !(s.regulation === expected || s.regulation === 'skipped')) {
    return 'regulation';
  }
  if (s.band === 'flooded' && s.pull === 'blank' && (s.offered.length || s.word !== null)) return 'floodedBlankWord';
  if (s.band === 'flooded' && s.pull === 'blank' && !s.routedTo.every(t => gates.floodedBlankRoutes.includes(t))) return 'floodedBlankRoutes';
  if (s.offered.length > gates.maxWordsOffered) return 'offered';
  return null;
}
