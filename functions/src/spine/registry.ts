/**
 * Spine content: the session close question and the follow-up type registry (PR-S2 content,
 * schema/practice-spine.cypher). Public content, cached by the client per page load.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';

export const SPINE_VERSION = 'spine-v1';

export interface CloseChoice { id: string; label: string }
export interface CloseQuestion { dir?: 'down' | 'orient' | 'up'; question: string; choices: CloseChoice[] }
export interface FollowUpChoice { id: string; label: string; status?: string; snoozeHours?: number; thenVsNow?: string }
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
  choices: FollowUpChoice[];
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

/** The follow-up type rows (enabled or not; callers filter). Used by getToday / scheduleFollowUp too. */
export async function readFollowUpTypes(tx: ManagedTransaction): Promise<FollowUpTypeContent[]> {
  const res = await tx.run(
    `MATCH (t:FollowUpType) WHERE coalesce(t.reserved, false) = false
     RETURN t {.*} AS t ORDER BY t.id`);
  return res.records.map((r) => {
    const t = r.get('t') as Record<string, unknown>;
    const content = JSON.parse((t.contentJson as string | null) ?? '{}') as Partial<FollowUpTypeContent>;
    return {
      id: t.id as string,
      ownerModule: t.ownerModule as string,
      tier: t.hierarchyTier as FollowUpTypeContent['tier'],
      resolveMode: t.resolveMode as FollowUpTypeContent['resolveMode'],
      deepLinkTemplate: (t.deepLinkTemplate as string | null) ?? null,
      staleAfterHours: int(t.staleAfterHours),
      missedPath: t.missedPath as string,
      notify: { push: t.notifyPush === true, inTab: t.notifyInTab === true, ics: t.notifyIcs === true },
      enabled: t.enabled === true,
      ...(content.dir ? { dir: content.dir } : {}),
      copy: content.copy ?? { title: '' },
      choices: content.choices ?? [],
      window: (content.window as Record<string, unknown>) ?? {},
      notification: content.notification ?? '',
    };
  });
}

export const getSpineContent = callable<unknown, SpineContent>(
  { auth: 'public', label: 'getSpineContent', errorMessage: 'Could not load content' },
  async () => readTx(async (tx) => {
    const flow = await tx.run(
      `MATCH (f:SessionCloseFlow {id: 'session_close'}) RETURN f.version AS version, f.contentJson AS content`);
    const rec = flow.records[0];
    if (!rec || rec.get('version') !== SPINE_VERSION) {
      throw new HttpsError('failed-precondition', 'Spine content migration is required');
    }
    const closeFlow = JSON.parse(rec.get('content') as string) as SpineContent['closeFlow'] & { version?: string };
    delete closeFlow.version;
    return { version: SPINE_VERSION, closeFlow, followUpTypes: await readFollowUpTypes(tx) };
  }),
);
