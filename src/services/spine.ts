/** Practice spine callables (PR-S3+): tool sessions, reps, spine content. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { CapacityReading, ThenVsNow } from '../data/capacityTypes';
import type { ActedOnUrge, CloseStatus, DetailKind, RepSource, ToolEntry } from '../data/spineTypes';

export interface StartToolSessionRequest {
  id: string;
  toolId: string;
  flowVersion?: string;
  entry: ToolEntry;
  checkInId?: string;
  hostSessionId?: string;
  followUpId?: string;
  patternId?: string;
  emotionIds?: string[];
  bandAtStart?: CapacityReading;
}

/** Namespaced tool detail (R18): ids / enums / booleans; integers only on *Sec / *Count keys. */
export type SessionExt = Record<string, Record<string, unknown>>;

export interface CloseToolSessionRequest {
  id: string;
  status: CloseStatus;
  exitStep?: string;
  practiced?: boolean;
  thenVsNow?: ThenVsNow;
  actedOnUrge?: ActedOnUrge;
  /** A band asked after the session opened (set once, only if the start had none). */
  bandAtStart?: CapacityReading;
  bandAtEnd?: CapacityReading;
  urgeIds?: string[];
  /** Emotions picked inside the tool (set once, only if the start had none). */
  emotionIds?: string[];
  durationSec?: number;
  detail?: { kind: DetailKind; id: string };
  skillIds?: string[];
  repSource?: RepSource;
  ext?: SessionExt;
  /** Follow-ups this close schedules (≤5; e.g. Problem Solve's ps_step, Recover's three). */
  schedule?: ScheduleFollowUpInput[];
}

export interface CloseToolSessionResponse { id: string; skillPracticeIds: string[]; followUpIds: string[] }

export type RecordToolSessionRequest = StartToolSessionRequest & Omit<CloseToolSessionRequest, 'id'>;

export interface CloseQuestion { dir?: 'down' | 'orient' | 'up'; question: string; choices: Array<{ id: string; label: string }> }
export interface FollowUpTypeContent {
  id: string;
  ownerModule: string;
  tier: 'safety' | 'practice' | 'quality' | 'skills';
  resolveMode: 'inline' | 'deeplink';
  deepLinkTemplate: string | null;
  staleAfterHours: number;
  missedPath: string;
  notify: { push: boolean; inTab: boolean; ics: boolean };
  enabled: boolean;
  dir?: 'down' | 'orient';
  copy: { title: string; body?: string };
  choices: Array<{ id: string; label: string; status?: string; snoozeHours?: number; thenVsNow?: string }>;
  window: Record<string, unknown>;
  notification: string;
}
export interface SpineContent {
  version: string;
  closeFlow: {
    kinds: Partial<Record<'regulation_down' | 'orienting' | 'urge' | 'plan', CloseQuestion>>;
    byTool: Record<string, Partial<Record<string, CloseQuestion>>>;
    skip: string;
    saved: string;
  };
  followUpTypes: FollowUpTypeContent[];
}

const startFn = httpsCallable<StartToolSessionRequest, { id: string; toolUsageId: string }>(functions, 'startToolSession');
const closeFn = httpsCallable<CloseToolSessionRequest, CloseToolSessionResponse>(functions, 'closeToolSession');
const recordFn = httpsCallable<RecordToolSessionRequest, CloseToolSessionResponse & { toolUsageId: string }>(functions, 'recordToolSession');

export async function startToolSession(req: StartToolSessionRequest): Promise<{ id: string; toolUsageId: string }> {
  return (await startFn(req)).data;
}

export async function closeToolSession(req: CloseToolSessionRequest): Promise<CloseToolSessionResponse> {
  return (await closeFn(req)).data;
}

export async function recordToolSession(req: RecordToolSessionRequest): Promise<CloseToolSessionResponse> {
  return (await recordFn(req)).data;
}

let spineContent: Promise<SpineContent> | null = null;
/**
 * Close copy + follow-up types, read from the file the app ships (src/data/content/spine.json,
 * generated from the graph by scripts/content-snapshot/build.mjs) instead of the getSpineContent Cloud
 * Function. Fetched as its own chunk the first time it is needed, kept for the page's life; a failed
 * fetch can be retried. The server still checks follow-up types itself (getToday, scheduleFollowUp).
 */
export function getSpineContent(): Promise<SpineContent> {
  if (!spineContent) {
    spineContent = import('../data/content/spine.json').then((m) => m.default.content as unknown as SpineContent).catch((e) => {
      spineContent = null;
      throw e;
    });
  }
  return spineContent;
}

// ---- Follow-ups and Today (PR-S5) ----

export type TodayState = 'due' | 'stale' | 'upcoming';
export interface TodayItem {
  id: string;
  kind: 'follow_up' | 'tool_outcome' | 'pattern_offer' | 'profile_revisit' | 'trail_offer';
  type: string;
  tier: 'safety' | 'practice' | 'quality' | 'skills';
  state: TodayState;
  dueAt: string | null;
  resolveMode: 'inline' | 'deeplink';
  deepLink: string | null;
  choices: Array<{ id: string; label: string; status?: 'done' | 'partly' | 'didnt' | 'dismissed'; snoozeHours?: number }>;
  /** May contain {toolName}: fill it from src/data/tools.ts. */
  copy: { title: string; body?: string };
  source?: { toolId?: string; toolSessionId?: string; detailId?: string };
  /** A parts check-back's part (parts on only): its name and tenderness from the profile slice. */
  part?: { id: string; name: string | null; tender: boolean };
  /**
   * A parts trail offer (kind `trail_offer`, shapes A–C): the rule's signed-off statement and what fills
   * it, every phrase signed-off graph content. The card fills the template (src/lib/trailOffer.ts).
   */
  trail?: { ruleId: string; shape: 'A' | 'B' | 'C'; template: string; pulls: string[]; context: string | null };
}
export interface GetTodayResponse {
  items: TodayItem[];
  more: TodayItem[];
  holding: boolean;
  nextInTab: { at: string; body: string; deepLink: string } | null;
}
export interface ScheduleFollowUpInput {
  id: string;
  type: string;
  dueAt: string;
  window?: string;
  cueId?: string;
  notify?: { push?: boolean; inTab?: boolean; ics?: boolean };
}

const getTodayFn = httpsCallable<{ band?: string }, GetTodayResponse>(functions, 'getToday');
const resolveFn = httpsCallable<{ id: string; choiceId?: string; status?: string }, { next: null | 'missing_links'; status: string | null }>(functions, 'resolveFollowUp');
const snoozeFn = httpsCallable<{ id: string; until: string }, { ok: true }>(functions, 'snoozeFollowUp');
const answerFn = httpsCallable<{ toolSessionId: string; thenVsNow?: ThenVsNow; actedOnUrge?: ActedOnUrge; dismissed?: boolean }, { ok: true; recorded: boolean }>(functions, 'answerToolOutcome');
const scheduleFn = httpsCallable<{ items: ScheduleFollowUpInput[]; sourceSessionId?: string; sourceToolId?: string }, { ids: string[] }>(functions, 'scheduleFollowUp');

export async function getToday(band?: string): Promise<GetTodayResponse> {
  return (await getTodayFn(band ? { band } : {})).data;
}
export async function resolveFollowUp(id: string, choiceId: string): Promise<void> {
  await resolveFn({ id, choiceId });
}
export async function dismissFollowUp(id: string): Promise<void> {
  await resolveFn({ id, status: 'dismissed' });
}
export async function snoozeFollowUp(id: string, until: Date): Promise<void> {
  await snoozeFn({ id, until: until.toISOString() });
}
export async function answerToolOutcome(toolSessionId: string, answer: { thenVsNow?: ThenVsNow; actedOnUrge?: ActedOnUrge; dismissed?: boolean }): Promise<boolean> {
  return (await answerFn({ toolSessionId, ...answer })).data.recorded;
}
export async function scheduleFollowUps(items: ScheduleFollowUpInput[], source?: { sourceSessionId?: string; sourceToolId?: string }): Promise<string[]> {
  return (await scheduleFn({ items, ...source })).data.ids;
}
