/**
 * The Practice home's choices (MF-02, MF-B3, docs/design/practice-home.md), pure so the page and the tests read the
 * same answers.
 *
 * - **The daily pick** walks the MF sequence (the graph's `mfOrder`: notice, name, without judging, wise mind, …):
 *   the skill practised least so far, earlier in the sequence on a tie, never the tool used last; the swap is the
 *   next skill along with a different tool (PRD: *a different kind*, not a near-duplicate). Each skill opens its own
 *   tool (the first of its `tools`); a skill whose tool isn't built yet is skipped.
 * - **The daily card** is booked when a time of day is set and none is waiting (no rrule yet: it rolls).
 * - **Levels** are Recover's (1 / 3 / 7 / 15 / 30 reps, never decaying), so practice reads the same everywhere.
 */
import { masteryOf } from './invalidationRecovery';
import type { PracticeSkillRow } from '../data/practiceTypes';

export interface DailyPick { skillId: string; toolId: string }

/** The skill's own tool: the first of its tools that's built. */
function ownTool(s: PracticeSkillRow, built: (toolId: string) => boolean): string | null {
  return s.tools.find(built) ?? null;
}

export function dailyPick(
  skills: readonly PracticeSkillRow[], recentTools: readonly string[], built: (toolId: string) => boolean,
): { pick: DailyPick | null; swap: DailyPick | null } {
  const seq = [...skills].sort((a, b) => a.order - b.order)
    .map((s) => ({ s, tool: ownTool(s, built) }))
    .filter((x): x is { s: PracticeSkillRow; tool: string } => x.tool !== null);
  if (!seq.length) return { pick: null, swap: null };
  const last = recentTools[0] ?? null;
  const fresh = seq.filter((x) => x.tool !== last);
  const pool = fresh.length ? fresh : seq;
  const least = pool.reduce((best, x) => (x.s.reps < best.s.reps ? x : best), pool[0]);
  const at = seq.indexOf(least);
  let swap: DailyPick | null = null;
  for (let i = 1; i < seq.length; i++) {
    const x = seq[(at + i) % seq.length];
    if (x.tool !== least.tool && (x.tool !== last || i === seq.length - 1)) { swap = { skillId: x.s.id, toolId: x.tool }; break; }
  }
  return { pick: { skillId: least.s.id, toolId: least.tool }, swap };
}

/** The library: each skill with its built tools, in the sequence. A skill with none isn't listed. */
export function library(skills: readonly PracticeSkillRow[], built: (toolId: string) => boolean): Array<{ skill: PracticeSkillRow; tools: string[] }> {
  return [...skills].sort((a, b) => a.order - b.order)
    .map((skill) => ({ skill, tools: skill.tools.filter(built) }))
    .filter((x) => x.tools.length > 0);
}

/** Book a daily card: a time of day is set and none is waiting. A cue books nothing (the cue is the reminder). */
export function shouldBookDaily(time: string | null | undefined, pending: boolean): boolean {
  return !!time && !pending;
}

/** Recover's levels (nothing decays): 0 until the first rep, 5 at thirty. */
export function levelOf(reps: number): number {
  return masteryOf(reps).level;
}

/** This week's ring: a week's worth is seven, and the ring never empties because of a missed day. */
export const WEEK_GOAL = 7;
export function weekFraction(weekReps: number): number {
  return Math.min(1, Math.max(0, weekReps) / WEEK_GOAL);
}
