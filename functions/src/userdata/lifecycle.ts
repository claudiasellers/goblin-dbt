/**
 * Finalise-once (plan §5.3, ruling R2). Pure: no firebase imports.
 *
 * A log record is upserted by `key` only during its episode, only on the fields its label declares,
 * and only forward along its state machine. After its terminal event its properties are frozen;
 * what stays allowed forever is incoming edges from newer log records and deletion. The user is
 * never asked again about a finalised record.
 *
 * Every writer that updates an existing log record puts the matching GUARD in its WHERE clause, so
 * a late or replayed write is a no-op rather than a rewrite of history. `writable()` is the same
 * rule in TypeScript; tests/user-data-layers.test.mjs keeps the two in step and checks that the
 * writers use the guards.
 */

/** A check-in's result stays writable (re-analysis, sensations, queued beats) for 2 h. */
export const CHECKIN_OPEN_HOURS = 2;
/** A closed tool session can still take its "did it help?" answer for 12 h. */
export const TOOL_SESSION_ANSWER_HOURS = 12;
/** An open tool session older than this reads as abandoned (derived, never stored). */
export const TOOL_SESSION_ABANDONED_HOURS = 2;

/**
 * Cypher boolean expressions over the record bound to `v`. They read only the record's own
 * properties and `datetime()`.
 */
export const GUARDS = {
  /** saveCheckIn upsert / setCheckInNextAction: v2 records only; a stub waiting for its full save is writable. */
  CheckIn: {
    upsert: (v: string) =>
      `(${v}.pendingFullSave = true OR (coalesce(${v}.schemaVersion, 1) >= 2 AND ${v}.nextActionKind IS NULL` +
      ` AND (${v}.resultShownAt IS NULL OR ${v}.resultShownAt > datetime() - duration({hours: ${CHECKIN_OPEN_HOURS}}))))`,
  },
  ToolSession: {
    /** closeToolSession: accepted while open, whatever its age. */
    close: (v: string) => `${v}.status = 'open'`,
    /** answerToolOutcome (Today / SessionClose): once, within 12 h of the end (or the start, if never closed). */
    answer: (v: string) =>
      `(${v}.answeredAt IS NULL AND coalesce(${v}.outcomeAskDismissed, false) = false` +
      ` AND coalesce(${v}.endedAt, ${v}.startedAt) > datetime() - duration({hours: ${TOOL_SESSION_ANSWER_HOURS}}))`,
    /** recordWitnessBeat (SHOWED_LINE, a queued beat): while open, or within 12 h of the end. */
    showLine: (v: string) =>
      `(${v}.status = 'open' OR coalesce(${v}.endedAt, ${v}.startedAt) > datetime() - duration({hours: ${TOOL_SESSION_ANSWER_HOURS}}))`,
  },
  FollowUp: {
    /** resolve / snooze / notify: only while scheduled. */
    update: (v: string) => `${v}.status = 'scheduled'`,
  },
  PatternOffer: {
    /** answer / not now: only while offered. */
    answer: (v: string) => `${v}.status = 'offered'`,
  },
  ToolUsage: {
    /** outcome is set once. */
    outcome: (v: string) => `${v}.outcome IS NULL`,
  },
  PartSession: {
    /** savePartSession: only while open; a saved session is frozen. */
    save: (v: string) => `${v}.status = 'open'`,
    /**
     * keepPart (9b's yes) links the session to its part: while open, or within 12 h of the save, so a
     * slow keep after the close still lands (the same episode a closed ToolSession's answer gets).
     */
    keep: (v: string) =>
      `(${v}.status = 'open' OR (${v}.status = 'saved' AND ${v}.savedAt > datetime() - duration({hours: ${TOOL_SESSION_ANSWER_HOURS}})))`,
  },
  PartCandidate: {
    /** keepPart accepts a candidate once; any other status is final. */
    accept: (v: string) => `${v}.status = 'open'`,
  },
} as const;

type Props = Record<string, unknown>;
const HOUR = 3_600_000;
const ms = (v: unknown): number | null => {
  if (v == null) return null;
  const t = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
};

/** The TypeScript mirror of GUARDS (for tests and for callers that already hold the record). */
export function writable(
  label: 'CheckIn' | 'ToolSession' | 'FollowUp' | 'PatternOffer' | 'ToolUsage' | 'SkillPractice' | 'PartSession' | 'PartCandidate',
  op: string,
  p: Props,
  now: number = Date.now(),
): boolean {
  switch (label) {
    case 'CheckIn': {
      if (p.pendingFullSave === true) return true;
      if (Number(p.schemaVersion ?? 1) < 2 || p.nextActionKind != null) return false;
      const shown = ms(p.resultShownAt);
      return shown === null || shown > now - CHECKIN_OPEN_HOURS * HOUR;
    }
    case 'ToolSession': {
      if (op === 'close') return p.status === 'open';
      if (op === 'answer') {
        if (p.answeredAt != null || p.outcomeAskDismissed === true) return false;
        const end = ms(p.endedAt) ?? ms(p.startedAt);
        return end !== null && end > now - TOOL_SESSION_ANSWER_HOURS * HOUR;
      }
      if (op === 'showLine') {
        if (p.status === 'open') return true;
        const end = ms(p.endedAt) ?? ms(p.startedAt);
        return end !== null && end > now - TOOL_SESSION_ANSWER_HOURS * HOUR;
      }
      return false;
    }
    case 'FollowUp': return p.status === 'scheduled';
    case 'PatternOffer': return p.status === 'offered';
    case 'ToolUsage': return p.outcome == null;
    case 'PartSession': {
      if (p.status === 'open') return true;
      if (op !== 'keep' || p.status !== 'saved') return false;
      const saved = ms(p.savedAt);
      return saved !== null && saved > now - TOOL_SESSION_ANSWER_HOURS * HOUR;
    }
    case 'PartCandidate': return p.status === 'open';
    case 'SkillPractice': return false; // terminal at creation
    default: return false;
  }
}

/** Derived state of a tool session (never stored). */
export function toolSessionState(p: Props, now: number = Date.now()): 'open' | 'abandoned' | 'completed' | 'exited_early' {
  if (p.status === 'completed' || p.status === 'exited_early') return p.status;
  const started = ms(p.startedAt);
  return started !== null && started < now - TOOL_SESSION_ABANDONED_HOURS * HOUR ? 'abandoned' : 'open';
}
