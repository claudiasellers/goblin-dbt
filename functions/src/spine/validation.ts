/**
 * Validators for the tool-session callables (PR-S3). Pure: no firebase imports.
 * Messages name the rule, never the value.
 */
import { ValidationError, GRAPH_ID, obj, oneOf, str, uuid, intIn, isoDateTime } from '../shared/validate';
import { validateCapacityReading } from '../capacity/reading';
import { THEN_VS_NOW, type CapacityReading, type ThenVsNow } from '../capacity/types';
import { validateExt } from './extSchemas';
import { RESERVED_ENTRIES, SPINE_TOOLS, thenVsNowDirFor } from './tools';
import {
  ACTED_ON_URGE, CLOSE_STATUSES, DETAIL_KINDS, REP_SOURCES, TOOL_ENTRIES,
  type ActedOnUrge, type CloseKind, type CloseStatus, type DetailKind, type RepSource, type SpineModule, type ToolEntry,
} from './types';

const STEP = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;
const FLOW_VERSION = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const opt = <T>(v: unknown, f: (x: unknown) => T): T | null => (v === undefined || v === null || v === '' ? null : f(v));
const ids = (v: unknown, max: number): string[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) throw new ValidationError(`Expected at most ${max} ids`);
  return [...new Set(v.map((x) => str(x, { max: 100, pattern: GRAPH_ID })))];
};
const reading = (v: unknown, now: Date): CapacityReading | null =>
  opt(v, (x) => validateCapacityReading(x, { now, allowSources: ['probe', 'ftf', 'carried', 'handoff'], freshMinutes: 20 }));

export interface StartInput {
  id: string;
  toolId: string;
  module: SpineModule;
  closeKind: CloseKind;
  flowVersion: string | null;
  entry: ToolEntry;
  checkInId: string | null;
  hostSessionId: string | null;
  followUpId: string | null;
  patternId: string | null;
  emotionIds: string[];
  bandAtStart: CapacityReading | null;
}

export function validateStart(raw: unknown, now: Date): StartInput {
  const d = obj(raw);
  const toolId = str(d.toolId, { max: 64 });
  const tool = SPINE_TOOLS[toolId];
  if (!tool) throw new ValidationError('Unknown tool');
  const entry = oneOf(d.entry ?? 'direct', TOOL_ENTRIES);
  const allowed = RESERVED_ENTRIES[toolId];
  if (allowed && !allowed.includes(entry)) throw new ValidationError('Tool not allowed from this entry');
  return {
    id: uuid(d.id),
    toolId,
    module: tool.module,
    closeKind: tool.closeKind,
    flowVersion: opt(d.flowVersion, (x) => str(x, { max: 40, pattern: FLOW_VERSION })),
    entry,
    checkInId: opt(d.checkInId, uuid),
    hostSessionId: opt(d.hostSessionId, uuid),
    followUpId: opt(d.followUpId, uuid),
    patternId: opt(d.patternId, (x) => str(x, { max: 100, pattern: GRAPH_ID })),
    emotionIds: ids(d.emotionIds, 20),
    bandAtStart: reading(d.bandAtStart, now),
  };
}

export interface CloseInput {
  id: string;
  status: CloseStatus;
  exitStep: string | null;
  practiced: boolean;
  thenVsNow: ThenVsNow | null;
  actedOnUrge: ActedOnUrge | null;
  /** A band asked after the session opened (e.g. DEAR MAN's gate, A4-4): set once, only if start had none. */
  bandAtStart: CapacityReading | null;
  bandAtEnd: CapacityReading | null;
  urgeIds: string[];
  /** Emotions picked inside the tool: set once, only if the start (a hand-off) had none. */
  emotionIds: string[];
  durationSec: number | null;
  detail: { kind: DetailKind; id: string } | null;
  /** null → the tool's PracticeSkill.defaultFor; [] → no rep (e.g. FTF without a word). */
  skillIds: string[] | null;
  repSource: RepSource;
  ext: string | null;
  schedule: ScheduleInput[];
  /** Wise mind's answer (a WiseMindAnswer id, or `own`): ask-fresh, on this session only; kept for wise-mind only. */
  wiseMindAnswer: string | null;
  /** Check the Facts' "Does it fit?" (FITS_FACTS): ask-fresh, on this session only; kept for FITS_FACTS_TOOLS only. */
  fitsFacts: FitsFacts | null;
}

export const FITS_FACTS = ['fits', 'partly', 'doesnt_fit', 'unsure'] as const;
export type FitsFacts = (typeof FITS_FACTS)[number];
/** The tools that ask "Does it fit?": another tool's fitsFacts is dropped at the write. */
export const FITS_FACTS_TOOLS: readonly string[] = ['check-the-facts'];

/** `closeKind` is the tool's (from SPINE_TOOLS): an answer the kind doesn't ask is rejected. */
export function validateClose(raw: unknown, now: Date, closeKind?: CloseKind): CloseInput {
  const d = obj(raw);
  const thenVsNow = opt(d.thenVsNow, (x) => oneOf(x, THEN_VS_NOW));
  const actedOnUrge = opt(d.actedOnUrge, (x) => oneOf(x, ACTED_ON_URGE));
  if (closeKind) {
    if (thenVsNow && !thenVsNowDirFor(closeKind)) throw new ValidationError('This tool does not ask then-vs-now');
    if (actedOnUrge && closeKind !== 'urge') throw new ValidationError('This tool does not ask about the urge');
  }
  const detail = opt(d.detail, (x) => {
    const o = obj(x);
    return { kind: oneOf(o.kind, DETAIL_KINDS), id: uuid(o.id) };
  });
  return {
    id: uuid(d.id),
    status: oneOf(d.status, CLOSE_STATUSES),
    exitStep: opt(d.exitStep, (x) => str(x, { max: 64, pattern: STEP })),
    practiced: d.practiced === true,
    thenVsNow,
    actedOnUrge,
    bandAtStart: reading(d.bandAtStart, now),
    bandAtEnd: reading(d.bandAtEnd, now),
    urgeIds: ids(d.urgeIds, 10),
    emotionIds: ids(d.emotionIds, 20),
    durationSec: opt(d.durationSec, (x) => intIn(x, { min: 0, max: 86_400 })),
    detail,
    skillIds: d.skillIds === undefined || d.skillIds === null ? null : ids(d.skillIds, 20),
    repSource: oneOf(d.repSource ?? 'standalone', REP_SOURCES),
    ext: validateExt(d.ext),
    schedule: validateSchedule(d.schedule, now),
    wiseMindAnswer: opt(d.wiseMindAnswer, (x) => str(x, { max: 64, pattern: GRAPH_ID })),
    fitsFacts: opt(d.fitsFacts, (x) => oneOf(x, FITS_FACTS)),
  };
}

/** One-shot (help-now, micro-step, guided activity, FTF in the check-in): start + close together. */
export function validateRecord(raw: unknown, now: Date): { start: StartInput; close: CloseInput } {
  const start = validateStart(raw, now);
  const close = validateClose(raw, now, start.closeKind);
  return { start, close };
}


// ---- Follow-ups (PR-S5) ----

export const FOLLOW_UP_WINDOWS = ['hour', 'afternoon', 'evening', 'tomorrow', 'this_week', 'next_time', 'unsure', 'today', '1h', 'later'] as const;
export type FollowUpWindow = (typeof FOLLOW_UP_WINDOWS)[number];
const TYPE_ID = /^[a-z][a-z0-9_]{0,63}$/;
const MINUTE = 60_000;

export interface ScheduleInput {
  id: string;
  type: string;
  dueAt: string;
  window: FollowUpWindow | null;
  cueId: string | null;
  notify: { push: boolean | null; inTab: boolean | null; ics: boolean | null };
}

/** One follow-up to schedule: dueAt within [now − 5 min, now + 14 d]. */
export function validateScheduleItem(raw: unknown, now: Date): ScheduleInput {
  const d = obj(raw);
  const dueAt = isoDateTime(d.dueAt);
  const t = Date.parse(dueAt);
  if (t < now.getTime() - 5 * MINUTE || t > now.getTime() + 14 * 24 * 60 * MINUTE) throw new ValidationError('dueAt out of range');
  const n = d.notify === undefined || d.notify === null ? {} : obj(d.notify);
  const flag = (v: unknown) => (typeof v === 'boolean' ? v : null);
  return {
    id: uuid(d.id),
    type: str(d.type, { max: 64, pattern: TYPE_ID }),
    dueAt,
    window: opt(d.window, (x) => oneOf(x, FOLLOW_UP_WINDOWS)),
    cueId: opt(d.cueId, (x) => str(x, { max: 64, pattern: STEP })),
    notify: { push: flag(n.push), inTab: flag(n.inTab), ics: flag(n.ics) },
  };
}

/** Up to 5 follow-ups (a close's `schedule`, or scheduleFollowUp's items). */
export function validateSchedule(raw: unknown, now: Date): ScheduleInput[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 5) throw new ValidationError('Expected at most 5 follow-ups');
  return raw.map((x) => validateScheduleItem(x, now));
}

export const RESOLVE_STATUSES = ['done', 'partly', 'didnt', 'dismissed'] as const;
export type ResolveStatus = (typeof RESOLVE_STATUSES)[number];

/**
 * Cope Ahead's after card, its second question ("Did your plan help?"): Used it, it helped · Used it, not
 * sure · Didn't use it. Skip (or leaving after the first question) is null. A log field on the follow-up.
 */
export const PLAN_HELPED = ['helped', 'unsure', 'unused'] as const;
export type PlanHelped = (typeof PLAN_HELPED)[number];

export interface ResolveInput {
  id: string;
  choiceId: string | null;
  status: ResolveStatus | null;
  missedReason: string | null;
  /** cope_ahead_after only (the server refuses it on any other type): null for Skip or not asked. */
  planHelped: PlanHelped | null;
}

export function validateResolve(raw: unknown): ResolveInput {
  const d = obj(raw);
  const out = {
    id: uuid(d.id),
    choiceId: opt(d.choiceId, (x) => str(x, { max: 64, pattern: STEP })),
    status: opt(d.status, (x) => oneOf(x, RESOLVE_STATUSES)),
    missedReason: opt(d.missedReason, (x) => str(x, { max: 64, pattern: STEP })),
    planHelped: opt(d.planHelped, (x) => oneOf(x, PLAN_HELPED)),
  };
  if (!out.choiceId && !out.status) throw new ValidationError('Expected a choice or a status');
  if (out.planHelped && !out.choiceId) throw new ValidationError('planHelped: with the first answer only');
  return out;
}

/** Snooze: until within (now, now + 7 d]. */
export function validateSnooze(raw: unknown, now: Date): { id: string; until: string } {
  const d = obj(raw);
  const until = isoDateTime(d.until);
  const t = Date.parse(until);
  if (t <= now.getTime() || t > now.getTime() + 7 * 24 * 60 * MINUTE) throw new ValidationError('Snooze out of range');
  return { id: uuid(d.id), until };
}

export function validateAnswer(raw: unknown): { toolSessionId: string; thenVsNow: ThenVsNow | null; actedOnUrge: ActedOnUrge | null; dismissed: boolean } {
  const d = obj(raw);
  const out = {
    toolSessionId: uuid(d.toolSessionId),
    thenVsNow: opt(d.thenVsNow, (x) => oneOf(x, THEN_VS_NOW)),
    actedOnUrge: opt(d.actedOnUrge, (x) => oneOf(x, ACTED_ON_URGE)),
    dismissed: d.dismissed === true,
  };
  if (!out.dismissed && !out.thenVsNow && !out.actedOnUrge) throw new ValidationError('Expected an answer');
  return out;
}
