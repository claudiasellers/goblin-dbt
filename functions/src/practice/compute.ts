/**
 * The Practice home's numbers (MF-02), pure: the skill rows in the MF sequence, this week's reps and the recent tools.
 * The handler only reads; tests load this file directly.
 */
import type { DailyCardRow, LifetimeTotals, PracticeHomeResponse, PracticeSkillRow, RepRow, SkillMetaRow } from './types';

const WEEK_MS = 7 * 86_400_000;

/**
 * `daily`: the person's booked `practice_daily` cards; `lastNotice`: the then-vs-now of their last closed Notice what's
 * here (`worse` is its *further away*); `lifetime`: all-time counts when the recent rows are bounded (levels and
 * off-phone totals come from it, the week and the recent tools from `reps`).
 */
export function practiceHome(
  meta: SkillMetaRow[], reps: RepRow[], daily: DailyCardRow[], lastNotice: string | null, now: number,
  lifetime?: LifetimeTotals,
): PracticeHomeResponse {
  const since = now - WEEK_MS;
  const inWeek = (r: RepRow) => Date.parse(r.at) >= since;
  const self = (r: RepRow) => r.offPhone || r.source === 'catch';
  const skills: PracticeSkillRow[] = [...meta]
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const mine = reps.filter((r) => r.skillId === m.id);
      return {
        id: m.id, label: m.label, order: m.order, tools: m.tools,
        reps: lifetime ? lifetime.bySkill[m.id]?.reps ?? 0 : mine.length, weekReps: mine.filter(inWeek).length,
        offPhone: lifetime ? lifetime.bySkill[m.id]?.offPhone ?? 0 : mine.filter(self).length,
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
    offPhoneReps: lifetime ? lifetime.offPhoneVisits : byVisit.filter(self).length,
    recentTools,
    dailyPending: daily.some((d) => d.waiting),
    dailyWaitingId: daily.find((d) => d.waiting)?.id ?? null,
    staleDailyIds: daily.filter((d) => !d.waiting).map((d) => d.id),
    noticeFar: lastNotice === 'worse',
  };
}
