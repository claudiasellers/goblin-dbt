/**
 * The witness beat's pure logic (WMP-01, plan A5-3): slot filling, which controls a beat shows,
 * the "No → another level" walk, and the recordWitnessBeat payloads. The component
 * (src/components/witness/WitnessBeat.tsx) only renders what this module decides.
 */
import type { Band } from '../data/capacityTypes';
import type {
  Landed, RecordWitnessBeatRequest, WitnessLine, WitnessMoment,
} from '../data/witnessTypes';

export type VoicePref = 'you' | 'name';

export interface WitnessSlots { name?: string | null; word?: string | null; phrase?: string | null; need?: string | null }

/**
 * The line as the user reads it. `name` voice uses the authored `textNamed` form when a first name
 * is known and preferred; otherwise the you-voice `text` (no regex grammar rewrite). Known slots are
 * filled; unknown ones stay visible (the existing `fill` convention), so a missing slot is caught.
 */
export function fillWitnessLine(line: Pick<WitnessLine, 'text' | 'textNamed'>, slots: WitnessSlots = {}, voice: VoicePref = 'you'): string {
  const useNamed = voice === 'name' && !!slots.name && !!line.textNamed;
  const template = useNamed ? line.textNamed! : line.text;
  const values: Record<string, string | null | undefined> = { N: slots.name, word: slots.word, phrase: slots.phrase, need: slots.need };
  return template.replace(/\{(N|word|phrase|need)\}/g, (m, k: string) => values[k] ?? m);
}

/** The echo (level 2): the user's own word(s), as they chose them. */
export function echoText(words: string[]): string {
  const w = words.map((x) => x.trim()).filter(Boolean);
  if (!w.length) return '';
  const lower = w.map((x, i) => (i === 0 ? x : x.toLowerCase()));
  return `${lower.join(', ')}.`;
}

/** Step descriptor for the future InterventionPlayer (E3 §A5.2.3). */
export const RECEIVE_STEP = { kind: 'receive', maxLines: 2, allowOwn: true } as const;

/** Where the beat renders on the check-in result (R21): every non-positive result. */
export function showsWitnessBeat(patternId: string): boolean {
  return patternId !== 'positive_state';
}

/** The band the beat asks the server for: the check-in's band, or `stirred` when there is none (R7). */
export function beatBand(band: Band | null | undefined): Band {
  return band ?? 'stirred';
}

/** Flooded merges one short line into the header and asks nothing (WMP-01 C). */
export function beatVariant(band: Band): 'standalone' | 'header' {
  return band === 'flooded' ? 'header' : 'standalone';
}

export type BeatQuestion = 'landed' | 'tentative' | null;

/**
 * Which question follows the line: none at flooded, none once answered or when the server says not
 * to ask; a level-3 guess always asks close · not that (it is a guess, WMP-01 A).
 */
export function beatQuestion(o: { band: Band; askLanded: boolean; line: Pick<WitnessLine, 'tentative'> | null; answered: boolean }): BeatQuestion {
  if (o.band === 'flooded' || !o.line || o.answered) return null;
  if (o.line.tentative) return 'tentative';
  return o.askLanded ? 'landed' : null;
}

/** close · not that map onto the landed scale: close = sort of, not that = no. */
export function tentativeLanded(answer: 'close' | 'not_that'): Landed {
  return answer === 'close' ? 'sort_of' : 'no';
}

/**
 * After "No" (or "not that") on the line at `index`: show the next line (a different level, the
 * server's alternate) while the beat has shown fewer than two; otherwise the postponement line.
 */
export function afterNo(lines: WitnessLine[], index: number): { next: number } | { postpone: true } {
  return index + 1 < Math.min(lines.length, RECEIVE_STEP.maxLines) ? { next: index + 1 } : { postpone: true };
}

/** What the user did in the beat (component state). */
export interface BeatAnswers {
  /** Landed answers by line id. */
  landed: Record<string, Landed | null>;
  skipped: boolean;
  noneFit: boolean;
  ownLine?: { id: string; text: string };
  keepLineId?: string;
}

/** What the beat reports to its host (E3 WitnessResult; landed per line, since No shows a second line). */
export interface WitnessResult extends BeatAnswers {
  shownLineIds: string[];
  ownLineShownId?: string;
}

/** The result after showing lines[0..index]: graph lines by id, an own line by its OwnLine id. */
export function beatResult(lines: WitnessLine[], index: number, answers: BeatAnswers): WitnessResult {
  const shown = lines.slice(0, index + 1);
  const own = shown.find((l) => l.source === 'own');
  return {
    ...answers,
    shownLineIds: shown.filter((l) => l.source === 'graph').map((l) => l.id),
    ...(own ? { ownLineShownId: own.id } : {}),
  };
}

/** The recordWitnessBeat request for a check-in host (graph lines only in `shown`). */
export function beatRequest(o: {
  checkInId: string; moment: WitnessMoment; band: Band; lines: WitnessLine[]; result: WitnessResult; emotionIds: string[];
}): RecordWitnessBeatRequest {
  const graph = new Set(o.lines.filter((l) => l.source === 'graph').map((l) => l.id));
  const req: RecordWitnessBeatRequest = {
    hostKind: 'checkin',
    hostId: o.checkInId,
    moment: o.moment,
    band: o.band,
    shown: o.result.shownLineIds.filter((id) => graph.has(id)).slice(0, 3).map((id) => ({ lineId: id, landed: o.result.landed[id] ?? null })),
    skipped: o.result.skipped,
    noneFit: o.result.noneFit,
  };
  if (o.result.ownLineShownId) req.ownLineShownId = o.result.ownLineShownId;
  if (o.result.keepLineId && graph.has(o.result.keepLineId)) req.keepLineId = o.result.keepLineId;
  if (o.result.ownLine) req.ownLine = { id: o.result.ownLine.id, text: o.result.ownLine.text, emotionIds: o.emotionIds.slice(0, 5) };
  return req;
}

/** What a result screen passes the beat so its host can log it (A5-3). */
export interface WitnessHandlers {
  onShown(result: WitnessResult, lines: WitnessLine[]): void;
  onDone(result: WitnessResult, lines: WitnessLine[]): void;
}
