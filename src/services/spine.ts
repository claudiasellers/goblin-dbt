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
  bandAtEnd?: CapacityReading;
  urgeIds?: string[];
  durationSec?: number;
  detail?: { kind: DetailKind; id: string };
  skillIds?: string[];
  repSource?: RepSource;
  ext?: SessionExt;
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
const contentFn = httpsCallable<void, SpineContent>(functions, 'getSpineContent', { timeout: 20_000 });

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
/** Close copy + follow-up types, cached per page load (a failed load can be retried). */
export function getSpineContent(): Promise<SpineContent> {
  if (!spineContent) {
    spineContent = contentFn().then((r) => r.data).catch((e) => {
      spineContent = null;
      throw e;
    });
  }
  return spineContent;
}
