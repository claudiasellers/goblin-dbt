/**
 * Rehearse it's stage, pure (IE-02; docs/design/rehearse.md; the `rehearsalStage` embed). The script for a kind and
 * tier comes from the skill's `turn` options (their reply, a pose, the moves allowed after it); the moves from its
 * `move` options (`says`: what your figure says; *Say it again* says your own line). Practising a way out (`leave`)
 * plays the same script whatever the kind.
 *
 * One exchange: your words in your bubble → *I said it out loud* / *in my head* → their reply → your move. A move to
 * step out or end the conversation ends it (`stepped_out`; never `left`, which the player reads as an inline run left early and so records no rep), *I'd lose it here* ends it (`lost_it`), Stop ends it at any point
 * (`stopped`). Their last reply takes no move: *That's the conversation* and Next end it (`finished`).
 */

export interface StageOption { value: string; label: string; [k: string]: unknown }
export interface Turn { value: string; line: string; pose: string; moves: string[] }
export interface Move { value: string; label: string; says: string | null }
export type StageEnd = 'finished' | 'stopped' | 'lost_it' | 'stepped_out';

export interface StageState {
  /** Index of the reply being shown or about to be shown. */
  at: number;
  phase: 'say' | 'their' | 'end';
  /** What your figure is saying now. */
  yours: string;
  aloud: boolean;
  used: string[];
  /** Replies seen: the exchanges practised. */
  seen: number;
  end: StageEnd | null;
}

/** Moves that end the conversation: stepping out, ending it. */
export const LEAVING = new Set(['break', 'done']);

export function scriptFor(options: readonly StageOption[], kind: string, tier: string): Turn[] {
  const k = tier === 'leave' ? 'any' : kind;
  return options
    .filter((o) => o.kind === k && o.tier === tier)
    .sort((x, y) => Number(x.n) - Number(y.n))
    .map((o) => ({
      value: o.value, line: o.label, pose: typeof o.pose === 'string' ? o.pose : 'neutral',
      moves: typeof o.moves === 'string' ? o.moves.split(',').filter(Boolean) : [],
    }));
}

export function movesFrom(options: readonly StageOption[]): Move[] {
  return options.map((o) => ({ value: o.value, label: o.label, says: typeof o.says === 'string' ? o.says : null }));
}

export function startStage(line: string): StageState {
  return { at: 0, phase: 'say', yours: line, aloud: false, used: [], seen: 0, end: null };
}

/** You said it (out loud or in your head): their next reply, or the end when there is none. */
export function said(s: StageState, turns: readonly Turn[], aloud: boolean): StageState {
  if (s.phase !== 'say') return s;
  const next = { ...s, aloud: s.aloud || aloud };
  if (s.at >= turns.length) return { ...next, phase: 'end', end: 'finished' };
  return { ...next, phase: 'their', seen: s.seen + 1 };
}

/** Their reply is the last one: no move after it. */
export function isLast(s: StageState, turns: readonly Turn[]): boolean {
  return s.phase === 'their' && s.at >= turns.length - 1;
}

/** Next after their last reply. */
export function finished(s: StageState, turns: readonly Turn[]): StageState {
  return isLast(s, turns) ? { ...s, phase: 'end', end: 'finished' } : s;
}

/** Your move after their reply. */
export function moved(s: StageState, move: Move, line: string): StageState {
  if (s.phase !== 'their') return s;
  const used = s.used.includes(move.value) || move.value === 'lost_it' ? s.used : [...s.used, move.value];
  if (move.value === 'lost_it') return { ...s, used, phase: 'end', end: 'lost_it' };
  const yours = move.says ?? line;
  if (LEAVING.has(move.value)) return { ...s, used, yours, phase: 'end', end: 'stepped_out' };
  return { ...s, used, yours, phase: 'say', at: s.at + 1 };
}

export function stopped(s: StageState): StageState {
  return s.phase === 'end' ? s : { ...s, phase: 'end', end: 'stopped' };
}

/** What the embed reports: the moves used, `aloud` if any line was said out loud, how it ended; the exchanges. */
export function stageOutput(s: StageState): { ids: string[]; doneCount: number } {
  return { ids: [...s.used, ...(s.aloud ? ['aloud'] : []), ...(s.end ? [s.end] : [])], doneCount: s.seen };
}
