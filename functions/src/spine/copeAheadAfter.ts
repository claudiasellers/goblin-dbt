/**
 * Cope Ahead's after card (docs/design/cope-ahead.md, "Today, afterwards"; FollowUpType `cope_ahead_after`
 * in scripts/practice-spine/content.py). Pure, no imports beyond types.
 *
 * - Scheduled only on the caller's own `cope-ahead` ToolSession (followUp.ts), so the card can always find
 *   the visit it asks about through `(ToolSession)-[:SCHEDULED]->(FollowUp)`.
 * - getToday sends the card the plan's ids from that session's `ext.ca` (planIdsFromExt). The client
 *   composes the words with planLine (src/lib/copeAheadPlan.ts) over cope-ahead.json: never a stored plan
 *   string, never anything that pre-fills a new visit. The situation's own words never leave the visit
 *   (the card names it "it").
 * - The two answers are log fields on the follow-up, written in one resolve: `howItWent` (the first
 *   question's choice: better, as_expected or harder; It hasn't happened yet snoozes 24 h and stores
 *   nothing) and `planHelped` (helped, unsure or unused; Skip or leaving after the first question: null).
 * - planHelped `helped` with parts on, and ext.ca.partId naming the caller's active or resting part, also
 *   writes PartTag {source: 'cope_ahead'} on that ToolSession (parts/tag.ts, one per session).
 */

export const COPE_AHEAD_AFTER = 'cope_ahead_after';
export const COPE_AHEAD_TOOL = 'cope-ahead';

/** The first question's answers that resolve the card (the type's done choices). */
export const HOW_IT_WENT = ['better', 'as_expected', 'harder'] as const;
export type HowItWent = (typeof HOW_IT_WENT)[number];

/** Follow-up types that only a session of one tool may schedule: the type → that tool. */
export const FOLLOW_UP_SESSION_TOOL: Readonly<Record<string, string>> = {
  [COPE_AHEAD_AFTER]: COPE_AHEAD_TOOL,
  // Ending a relationship's opt-in check-ins (docs/design/ending-relationships.md): only from an Ending visit that saved.
  ending_after: 'ending-relationships',
  ending_again: 'ending-relationships',
  ending_revisit: 'ending-relationships',
  // DEAR MAN's "How did it go?" (IE-B2, docs/design/dear-man-debrief.md): only from a DEAR MAN prep that saved.
  ask_outcome: 'dear-man',
  // Say no's "How did it go?" (IE-B3, docs/design/say-no.md): only from a Say no visit that made its no.
  no_outcome: 'say-no',
  ask_delayed: 'dear-man',
  // Do the Opposite's plan for later (ER-B3): only from a Do the Opposite visit.
  oa_try: 'opposite-action',
  // Keep it warm's break and return, and its repair's "How did it go?" (IE-B4, docs/design/give.md).
  break_return: 'give',
  repair_outcome: 'give',
  // When it's a habit's renewal (DT-09, docs/design/habit-plan.md): only from a habit-plan visit (it reopens that run).
  habit_renew: 'habit-plan',
  // Running low's evening check (ER-B4): only from a Running low visit.
  please_fix: 'please-skill',
  good_thing: 'good-things',
  good_week_one: 'good-things',
  good_week_two: 'good-things',
  good_week_three: 'good-things',
  value_step: 'values-clarification',
  mastery_step: 'build-mastery',
  reach_out_outcome: 'finding-connection',
  notice_back: 'mindfulness-of-others',
  // Sleep reset's morning check (ER-13): only from a Sleep reset visit (it reopens that run).
  sleep_morning: 'sleep-reset',
};

/** The plan's ids, as the after card needs them. Own words are the visit's (its Today card may show them). */
export interface CopeAheadPlanIds {
  situationId: string | null;
  hardMomentId: string | null;
  hardMomentOwn: string | null;
  ifFrom: 'moment' | 'pull' | null;
  pullIds: string[];
  moveIds: string[];
  moveOwn: string | null;
}

const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (v: unknown): string | null => (typeof v === 'string' && ID.test(v) ? v : null);
const ids = (v: unknown, max: number): string[] => (Array.isArray(v) ? [...new Set(v.map(id).filter((x): x is string => !!x))].slice(0, max) : []);
const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null);

/** `ext.ca` from a ToolSession's stored ext (a JSON string), or null. */
function caOf(ext: unknown): Record<string, unknown> | null {
  if (typeof ext !== 'string' || !ext) return null;
  try {
    const ca = (JSON.parse(ext) as { ca?: unknown } | null)?.ca;
    return ca && typeof ca === 'object' && !Array.isArray(ca) ? (ca as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * A skill-runtime visit's own words for a field, from `ext.run` (the projection writes `ext.ca` with ids only, so
 * the record fits 6 KB). Null for the hand-built page's sessions, whose own words are in `ext.ca`.
 */
function runOwn(ext: unknown, fieldId: string): unknown {
  if (typeof ext !== 'string' || !ext) return null;
  try {
    const run = (JSON.parse(ext) as { run?: { skillId?: unknown; answers?: unknown } } | null)?.run;
    if (!run || run.skillId !== 'cope_ahead' || !Array.isArray(run.answers)) return null;
    const a = (run.answers as Array<Record<string, unknown>>).find((x) => x && x.fieldId === fieldId);
    return a?.valueOwn ?? null;
  } catch {
    return null;
  }
}

/** The plan's ids from the session's ext, or null when the visit stored none. */
export function planIdsFromExt(ext: unknown): CopeAheadPlanIds | null {
  const ca = caOf(ext);
  if (!ca) return null;
  return {
    situationId: id(ca.situationId),
    hardMomentId: id(ca.hardMomentId),
    hardMomentOwn: text(ca.hardMomentOwn ?? runOwn(ext, 'moment'), 140),
    ifFrom: ca.ifFrom === 'moment' || ca.ifFrom === 'pull' ? ca.ifFrom : null,
    pullIds: ids(ca.pullIds, 4),
    moveIds: ids(ca.moveIds, 2),
    moveOwn: text(ca.moveOwn ?? runOwn(ext, 'moves'), 90),
  };
}

/** The part the person picked in the visit (parts on), as the tag needs it: a UUID or null. */
export function partIdFromExt(ext: unknown): string | null {
  const p = caOf(ext)?.partId;
  return typeof p === 'string' && UUID.test(p) ? p : null;
}
