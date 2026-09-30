/**
 * getToday (PR-S5): the Today stack on the check-in screen. Scheduled follow-ups (due / stale /
 * upcoming, derived), at most one derived "did it help?" for the latest unanswered tool session,
 * and (PR-P1) pattern offers. Ordering is pure (todayOrder.ts). A fresh `flooded` band collapses
 * the stack; nothing is hidden.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { BANDS, type Band } from '../capacity/types';
import { readFollowUpTypes, type FollowUpTypeContent } from './registry';
import { fillDeepLink, followUpState, orderToday, type TodayItem } from './todayOrder';

export interface GetTodayResponse {
  items: TodayItem[];
  more: TodayItem[];
  /** True when a flooded band collapsed a non-empty stack ("Your plans will keep"). */
  holding: boolean;
  /** The next in-tab reminder (content-free body), if one falls in the next 24 h. */
  nextInTab: { at: string; body: string; deepLink: string } | null;
}

interface CloseFlowContent {
  kinds: Record<string, { question: string; choices: Array<{ id: string; label: string }> }>;
  byTool: Record<string, Record<string, { question: string; choices: Array<{ id: string; label: string }> }>>;
}

/**
 * Extra Today sources registered by other modules (PR-P1 adds pattern offers). Each runs in the
 * same read transaction and returns ready items.
 */
export type TodaySource = (tx: ManagedTransaction, uid: string, now: Date) => Promise<TodayItem[]>;
const extraSources: TodaySource[] = [];
export function registerTodaySource(s: TodaySource): void {
  if (!extraSources.includes(s)) extraSources.push(s);
}

/**
 * Write steps that run before Today is read (PR-P1: lazy pattern-offer evaluation, at most once a
 * day). A failing step never blocks Today.
 */
export type TodayPrepare = (uid: string, now: Date) => Promise<void>;
const preparers: TodayPrepare[] = [];
export function registerTodayPrepare(p: TodayPrepare): void {
  if (!preparers.includes(p)) preparers.push(p);
}

async function followUpItems(tx: ManagedTransaction, uid: string, types: Map<string, FollowUpTypeContent>, now: Date) {
  const res = await tx.run(
    `MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {status: 'scheduled'})
     MATCH (t:FollowUpType {id: f.type}) WHERE t.enabled = true
     WITH f, t
     WHERE (f.snoozedUntil IS NULL OR f.snoozedUntil <= datetime())
       AND f.dueAt <= datetime() + duration({hours: 24})
       AND f.dueAt > datetime() - duration({hours: coalesce(t.staleAfterHours, 36) + 168})
     OPTIONAL MATCH (f)-[:DETAIL]->(d)
     RETURN f.id AS id, f.type AS type, toString(f.dueAt) AS dueAt, f.sourceToolId AS sourceToolId,
            f.sourceSessionId AS sourceSessionId, coalesce(f.notifyInTab, false) AS notifyInTab, d.id AS detailId
     ORDER BY f.dueAt LIMIT 25`,
    { uid },
  );
  const items: TodayItem[] = [];
  let next: GetTodayResponse['nextInTab'] = null;
  for (const r of res.records) {
    const t = types.get(r.get('type') as string);
    if (!t) continue;
    const dueAt = r.get('dueAt') as string;
    const vars = { detailId: r.get('detailId') as string | null, sourceToolId: r.get('sourceToolId') as string | null,
      sourceSessionId: r.get('sourceSessionId') as string | null, followUpId: r.get('id') as string | null };
    const deepLink = t.resolveMode === 'deeplink' ? fillDeepLink(t.deepLinkTemplate, vars) : null;
    const state = followUpState(dueAt, t.staleAfterHours, now.getTime());
    if (state) {
      items.push({
        id: r.get('id') as string, kind: 'follow_up', type: t.id, tier: t.tier, state, dueAt,
        resolveMode: t.resolveMode, deepLink,
        choices: t.choices.map(({ id, label, status, snoozeHours }) => ({
          id, label, ...(status ? { status: status as 'done' } : {}), ...(snoozeHours ? { snoozeHours } : {}),
        })),
        copy: t.copy,
        source: { ...(vars.sourceToolId ? { toolId: vars.sourceToolId } : {}), ...(vars.sourceSessionId ? { toolSessionId: vars.sourceSessionId } : {}),
          ...(vars.detailId ? { detailId: vars.detailId } : {}) },
      });
    }
    // OA plans keep their own reminder (useOppositeActionFollowUps); the rest remind from here.
    if (t.id !== 'oa_plan' && r.get('notifyInTab') === true && Date.parse(dueAt) > now.getTime() && !next) {
      next = { at: dueAt, body: t.notification, deepLink: deepLink ?? '/' };
    }
  }
  return { items, next };
}

/** The latest tool session closed (or abandoned) without an answer, as a "did it help?" card. */
async function toolOutcomeItem(
  tx: ManagedTransaction, uid: string, types: Map<string, FollowUpTypeContent>, flow: CloseFlowContent | null,
): Promise<TodayItem[]> {
  const t = types.get('tool_outcome');
  if (!t?.enabled || !flow) return [];
  const res = await tx.run(
    `MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession)
     WHERE ts.closeKind IN ['regulation_down', 'orienting', 'urge']
       AND ts.answeredAt IS NULL AND coalesce(ts.outcomeAskDismissed, false) = false
       AND coalesce(ts.endedAt, ts.startedAt) > datetime() - duration({hours: 12})
       AND (ts.status = 'completed' OR coalesce(ts.practiced, false))
       AND (ts.status <> 'open' OR ts.startedAt < datetime() - duration({hours: 2}))
     RETURN ts.id AS id, ts.toolId AS toolId, ts.closeKind AS closeKind,
            toString(coalesce(ts.endedAt, ts.startedAt)) AS at
     ORDER BY coalesce(ts.endedAt, ts.startedAt) DESC LIMIT 1`,
    { uid },
  );
  const r = res.records[0];
  if (!r) return [];
  const toolId = r.get('toolId') as string;
  const kind = r.get('closeKind') as string;
  const q = flow.byTool[toolId]?.[kind] ?? flow.kinds[kind];
  if (!q) return [];
  return [{
    id: r.get('id') as string, kind: 'tool_outcome', type: 'tool_outcome', tier: t.tier, state: 'due',
    dueAt: r.get('at') as string, resolveMode: 'inline', deepLink: null,
    choices: q.choices.map(({ id, label }) => ({ id, label })),
    copy: { title: t.copy.title, body: q.question },
    source: { toolId, toolSessionId: r.get('id') as string },
  }];
}

export const getToday = callable<unknown, GetTodayResponse>(
  { auth: 'required', label: 'getToday', errorMessage: 'Could not load Today' },
  async ({ uid, data }) => {
    const raw = (data as { band?: unknown } | null | undefined)?.band;
    const band = typeof raw === 'string' && (BANDS as readonly string[]).includes(raw) ? (raw as Band) : null;
    const now = new Date();
    for (const p of preparers) {
      try { await p(uid as string, now); } catch (e) { console.error('getToday prepare', (e as { code?: string })?.code ?? 'unknown'); }
    }
    return readTx(async (tx) => {
      const types = new Map((await readFollowUpTypes(tx)).map((t) => [t.id, t]));
      const flowRes = await tx.run(`MATCH (f:SessionCloseFlow {id: 'session_close'}) RETURN f.contentJson AS content`);
      const flowJson = flowRes.records[0]?.get('content') as string | undefined;
      const flow = flowJson ? (JSON.parse(flowJson) as CloseFlowContent) : null;
      const { items, next } = await followUpItems(tx, uid as string, types, now);
      const outcome = await toolOutcomeItem(tx, uid as string, types, flow);
      const extra: TodayItem[] = [];
      for (const s of extraSources) extra.push(...await s(tx, uid as string, now));
      const ordered = orderToday([...items, ...outcome, ...extra], band);
      return { ...ordered, nextInTab: next };
    });
  },
);
