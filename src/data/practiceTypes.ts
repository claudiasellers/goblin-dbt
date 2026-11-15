/**
 * The Practice home's read (MF-02, MF-B3, docs/design/practice-home.md). Mirrors functions/src/practice/types.ts (a test keeps them equal).
 * Counts are for the person's own view and are never shown as a figure on the home (PRD runtime rule 6: returns are
 * marks); the reps ring draws this week's reps, the skill cards a level that never decays.
 */
export interface PracticeSkillRow {
  /** PracticeSkill id (`observe`, `describe`, `nonjudge`, `wise_mind`). */
  id: string;
  /** The library's plain name (`PracticeSkill.practiceLabel`). */
  label: string;
  /** The MF sequence (`PracticeSkill.mfOrder`). */
  order: number;
  /** The tools whose visits practise it (`defaultFor`), in the graph's order: the first is the skill's own. */
  tools: string[];
  /** Reps ever (nothing decays), this week's (rolling 7 days), and the ones done without the app. */
  reps: number;
  weekReps: number;
  offPhone: number;
}

export interface PracticeHomeResponse {
  skills: PracticeSkillRow[];
  /** Every MF rep in the last 7 days, once per visit (a Notice what's here visit logs observe and describe: one rep here). */
  weekReps: number;
  /** MF reps done without the app (off-phone and caught ones), ever. */
  offPhoneReps: number;
  /** The tools of the last few MF practices, newest first: the daily pick doesn't offer yesterday's again. */
  recentTools: string[];
  /** A `practice_daily` card is booked and not yet stale: the home doesn't book another. */
  dailyPending: boolean;
  /** That card's id (null when none waits): a changed time of day dismisses it before booking the new one. */
  dailyWaitingId: string | null;
  /** Booked cards past their 12 h: the home dismisses them, so a missed day leaves nothing behind. */
  staleDailyIds: string[];
  /** The last Notice what's here closed *further away*: the daily pick opens it outside-only (`frame=far`). */
  noticeFar: boolean;
}

/** The person's booked `practice_daily` cards as the query returns them. */
export interface DailyCardRow {
  id: string;
  /** Booked and not yet stale. */
  waiting: boolean;
}

/** One SkillPractice as the query returns it. */
export interface RepRow {
  skillId: string;
  /** The ToolSession the rep came from: one visit can log two MF skills. */
  sessionKey: string;
  practiceId: string;
  at: string;
  offPhone: boolean;
  source: string;
}

export interface SkillMetaRow {
  id: string;
  label: string;
  order: number;
  tools: string[];
}
