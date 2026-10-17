/**
 * The parts harm signals (docs/design/parts.md, "Measuring it" and "Build order": each phase is gated
 * on the previous phase's harm signals; a signal pauses offers for that person, never their parts, and
 * goes to review). Defined once, here: scripts/parts/report.cypher computes the same signals for
 * Claudia's review (tests/parts-harm-report.test.mjs pins the two together), and Phase 4 gates offers
 * on `harmSignalsFor`. Pure, no imports.
 *
 * Over a window (PartsPolicy.harmWindowDays, 28) ending now, both ends inclusive:
 * - louder: next-day check-backs answered Louder (`FollowUp` part_checkback, `harmSignal`), by when
 *   they were answered;
 * - crisisAfterMeet: Meet a part sessions (by when they started) followed by a crisis-flagged check-in
 *   strictly after the start and at most PartsPolicy.crisisPauseHours (48) later;
 * - tenderRepeat: sessions that stopped `tender` or `own_words`, PartsPolicy.tenderRepeatCount (2) or more;
 * - notSelfRepeat: sessions ended by a second non-Self answer (`not_self`), the same count or more.
 * Watched, not harms: P2 opened in a visit, "it's running things" at the blending check, and three or
 * more parts made within 7 days (PartsPolicy.tooManyPartsCount / tooManyPartsDays). Deleting parts and
 * turning parts off are not recorded anywhere (deleteMyParts removes the records; the setting keeps only
 * its current value), so they are null here and no tracking is added. "Not me" needs offers (Phase 4).
 */

export interface HarmPolicy {
  windowDays: number;
  crisisPauseHours: number;
  tenderRepeatCount: number;
  tooManyPartsCount: number;
  tooManyPartsDays: number;
}

/** PartsPolicy's numbers (scripts/parts/content.py POLICY); the report's coalesce defaults are the same. */
export const DEFAULT_HARM_POLICY: HarmPolicy = {
  windowDays: 28, crisisPauseHours: 48, tenderRepeatCount: 2, tooManyPartsCount: 3, tooManyPartsDays: 7,
};

/** PartsPolicy property → HarmPolicy key. */
export const HARM_POLICY_PROPS: Readonly<Record<keyof HarmPolicy, string>> = {
  windowDays: 'harmWindowDays', crisisPauseHours: 'crisisPauseHours', tenderRepeatCount: 'tenderRepeatCount',
  tooManyPartsCount: 'tooManyPartsCount', tooManyPartsDays: 'tooManyPartsDays',
};

/** The stop reasons that count, as PartSession.stopReason stores them. */
export const TENDER_STOPS = ['tender', 'own_words'] as const;
export const NOT_SELF_STOP = 'not_self';
export const CHECKBACK_TYPE = 'part_checkback';

/** A PartsPolicy node's values over the defaults; anything not a positive number keeps its default. */
export function resolveHarmPolicy(raw: Record<string, unknown> | null | undefined): HarmPolicy {
  const out = { ...DEFAULT_HARM_POLICY };
  for (const k of Object.keys(HARM_POLICY_PROPS) as Array<keyof HarmPolicy>) {
    const v = raw?.[HARM_POLICY_PROPS[k]];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

/** One person's records, as ISO timestamps (unparseable ones are ignored). */
export interface HarmRows {
  /** Answered part_checkback follow-ups: `at` = resolvedAt. */
  checkbacks: ReadonlyArray<{ at: string; harmSignal: boolean }>;
  /** Meet a part sessions: `at` = createdAt (the visit's start). `p2`: a P2 hand-off ran in it. */
  sessions: ReadonlyArray<{ at: string; stopReason: string | null; blendCheck: string | null; p2: boolean }>;
  /** Check-ins that carried a crisis flag (`safetyFlagId`): `at` = timestamp. */
  crisisCheckIns: ReadonlyArray<{ at: string }>;
  /** Parts made: `at` = Part.createdAt. */
  partsMade: ReadonlyArray<{ at: string }>;
}

export interface WatchedCounts {
  p2Opened: number;
  blendRunning: number;
  /** The most parts made within any tooManyPartsDays (starting at a part's making). */
  maxPartsInSpan: number;
  tooManyParts: boolean;
  /** Not recorded anywhere today; no tracking added. */
  partsDeleted: null;
  partsTurnedOff: null;
  /** Needs offers (Phase 4). */
  notMeRate: null;
}

export interface HarmSignals {
  louder: number;
  crisisAfterMeet: number;
  tenderStops: number;
  tenderRepeat: boolean;
  notSelfStops: number;
  notSelfRepeat: boolean;
  any: boolean;
  /** The most recent event behind a signal that is on (ISO), or null. */
  lastAt: string | null;
  watched: WatchedCounts;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ms = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

export function harmSignalsFor(rows: HarmRows, now: Date = new Date(), policy: HarmPolicy = DEFAULT_HARM_POLICY): HarmSignals {
  const end = now.getTime();
  const start = end - policy.windowDays * DAY;
  const inWindow = (t: number | null): t is number => t !== null && t >= start && t <= end;
  let last: number | null = null;
  const seen = (t: number) => { if (last === null || t > last) last = t; };

  let louder = 0;
  for (const c of rows.checkbacks) {
    const t = ms(c.at);
    if (c.harmSignal === true && inWindow(t)) { louder++; seen(t); }
  }

  const sessions = rows.sessions.map((s) => ({ ...s, t: ms(s.at) })).filter((s): s is typeof s & { t: number } => inWindow(s.t));
  const crises = rows.crisisCheckIns.map((c) => ms(c.at)).filter((t): t is number => t !== null);
  let crisisAfterMeet = 0;
  for (const s of sessions) {
    const after = crises.filter((t) => t > s.t && t - s.t <= policy.crisisPauseHours * HOUR && t <= end);
    if (after.length) { crisisAfterMeet++; seen(Math.max(...after)); }
  }

  const tender = sessions.filter((s) => (TENDER_STOPS as readonly string[]).includes(s.stopReason ?? ''));
  const notSelf = sessions.filter((s) => s.stopReason === NOT_SELF_STOP);
  const tenderRepeat = tender.length >= policy.tenderRepeatCount;
  const notSelfRepeat = notSelf.length >= policy.tenderRepeatCount;
  if (tenderRepeat) for (const s of tender) seen(s.t);
  if (notSelfRepeat) for (const s of notSelf) seen(s.t);

  const made = rows.partsMade.map((p) => ms(p.at)).filter(inWindow);
  const span = policy.tooManyPartsDays * DAY;
  const maxPartsInSpan = made.reduce((m, t) => Math.max(m, made.filter((x) => x >= t && x < t + span).length), 0);

  return {
    louder, crisisAfterMeet,
    tenderStops: tender.length, tenderRepeat, notSelfStops: notSelf.length, notSelfRepeat,
    any: louder > 0 || crisisAfterMeet > 0 || tenderRepeat || notSelfRepeat,
    lastAt: last === null ? null : new Date(last).toISOString(),
    watched: {
      p2Opened: sessions.filter((s) => s.p2).length,
      blendRunning: sessions.filter((s) => s.blendCheck === 'running').length,
      maxPartsInSpan, tooManyParts: maxPartsInSpan >= policy.tooManyPartsCount,
      partsDeleted: null, partsTurnedOff: null, notMeRate: null,
    },
  };
}
