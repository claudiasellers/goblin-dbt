/**
 * The Practice home's numbers (MF-02), pure: the skill rows in the MF sequence, this week's reps and the recent tools.
 * The handler only reads; tests load this file directly.
 */
import type { PracticeHomeResponse, PracticeSkillRow, RepRow, SkillMetaRow } from './types';

const WEEK_MS = 7 * 86_400_000;

export function practiceHome(meta: SkillMetaRow[], reps: RepRow[], dailyPending: boolean, now: number): PracticeHomeResponse {
  const since = now - WEEK_MS;
  const inWeek = (r: RepRow) => Date.parse(r.at) >= since;
  const self = (r: RepRow) => r.offPhone || r.source === 'catch';
  const skills: PracticeSkillRow[] = [...meta]
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const mine = reps.filter((r) => r.skillId === m.id);
      return {
        id: m.id, label: m.label, order: m.order, tools: m.tools,
        reps: mine.length, weekReps: mine.filter(inWeek).length, offPhone: mine.filter(self).length,
      };
    });
  // Once per visit: Notice what's here logs observe and describe from one session.
  const visits = new Map<string, RepRow>();
  for (const r of reps) if (!visits.has(r.sessionKey)) visits.set(r.sessionKey, r);
  const byVisit = [...visits.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const recentTools: string[] = [];
  for (const r of byVisit) {
    if (r.practiceId !== 'practice' && !recentTools.includes(r.practiceId)) recentTools.push(r.practiceId);
    if (recentTools.length === 3) break;
  }
  return {
    skills,
    weekReps: byVisit.filter(inWeek).length,
    offPhoneReps: byVisit.filter(self).length,
    recentTools,
    dailyPending,
  };
}
