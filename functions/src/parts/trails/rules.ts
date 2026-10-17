/**
 * The four trail rules (parts.md, "Discovery: trails → Rules"), pure. Every threshold is a field of the
 * rule's `TrailRule` node (scripts/parts/content.py TRAIL_RULES), never a constant here. A disabled rule
 * finds nothing (the dry run passes every rule enabled). Returns every candidate, ranked; the offer task
 * picks one. No rule outputs a role, a type, an age or a name.
 *
 *  A  a move in a situation   for each offerable move m: the episodes in the window with m number
 *                             ≥ minEpisodes, span ≥ minSpanDays, come from ≥ minTools tools (tools whose
 *                             records expressed m), and ≥ contextShare of them carry one context value.
 *                             One candidate per move: the highest share; ties trigger > event > timeBand,
 *                             then the most recent. A may name a safety-line move (flagged).
 *  B  sequence                ordered pairs of different offerable, non-safety-line moves (a, b): an
 *                             a-episode followed by a separate b-episode within withinHours is a hit (each
 *                             a-episode counts once); hits ≥ minEpisodes and lift ≥ lift, where lift =
 *                             P(b follows | a-episode) / P(b follows | episode without a). A zero baseline
 *                             passes with lift null (unbounded).
 *  C  two pulls               each PolarityPair (offerable, non-safety-line sides) and context value c:
 *                             episodes with a and c ≥ minEpisodes and episodes with b and c ≥ minEpisodes.
 *                             One candidate per pair: the context with the most episodes, ties as A.
 *  D  a part you know         each claimed part (active or resting, not paused): episodes after its last
 *                             visit with any of its moves (offerable or not), no PartTag, and no record the
 *                             person said No to for that part in Reflect's review (a blocked key's
 *                             `recordKeys`, for good) ≥ minEpisodes.
 *
 * Blocked keys (rule + sorted moves + context; for D, rule + part, since its matching moves shift) with
 * `until` null or ahead are skipped before a rule picks its best context, so a blocked context doesn't
 * hide another one that passes. Ranking: A, D, C, B; then episodes; then the most recent evidence.
 */
import { CONTEXT_KEYS, type BlockedKey, type ClaimedPart, type Episode, type TrailCandidate, type TrailContextKey, type TrailContextRow, type TrailCtx, type TrailEvidence, type TrailMove, type TrailRule } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SHAPE_RANK: Record<string, number> = { A: 0, D: 1, C: 2, B: 3 };

const t = (iso: string): number => Date.parse(iso);
const uniq = (xs: readonly string[]): string[] => [...new Set(xs)];

/** The episodes inside the rule's window (no window: all of them, up to now). */
export function inWindow(episodes: readonly Episode[], windowDays: number | null, now: number): Episode[] {
  return episodes.filter((e) => t(e.at) <= now && (windowDays == null || t(e.at) >= now - windowDays * DAY));
}

/** The TrailContext rows an episode carries (only values a row can phrase). */
export function contextIdsOf(e: Episode, contexts: readonly TrailContextRow[]): string[] {
  return contexts.filter((c) => e.contexts[c.key] === c.value).map((c) => c.id);
}

export function evidenceOf(e: Episode, contexts: readonly TrailContextRow[]): TrailEvidence {
  return { at: e.at, toolIds: [...e.toolIds], recordKeys: [...e.recordKeys], moveIds: [...e.moveIds], contextIds: contextIdsOf(e, contexts) };
}

const spanDays = (eps: readonly Episode[]): number => {
  if (!eps.length) return 0;
  const ts = eps.map((e) => t(e.at));
  return (Math.max(...ts) - Math.min(...ts)) / DAY;
};
const lastAt = (eps: readonly Episode[]): number => Math.max(...eps.map((e) => t(e.at)));
const byTime = (eps: readonly Episode[]): Episode[] => [...eps].sort((a, b) => t(a.at) - t(b.at));

export function isBlocked(
  blocked: readonly BlockedKey[], key: { ruleId: string; moveIds: readonly string[]; contextId: string | null; partId: string | null }, now: number,
): boolean {
  const moves = [...key.moveIds].sort().join('|');
  // A part's key is the part (D's matching moves shift from run to run); every other key is its moves.
  return blocked.some((b) => b.ruleId === key.ruleId && (key.partId != null || [...b.moveIds].sort().join('|') === moves)
    && (b.contextId ?? null) === key.contextId && (b.partId ?? null) === key.partId
    && (b.until == null || t(b.until) > now));
}

const moveMap = (moves: readonly TrailMove[]) => new Map(moves.map((m) => [m.id, m]));

interface ContextPick { ctx: TrailContextRow; eps: Episode[]; score: number; last: number }

/** Highest score; ties trigger > event > timeBand, then the most recent episode carrying it. */
function bestContext(picks: ContextPick[]): ContextPick | null {
  const keyRank = (k: TrailContextKey) => CONTEXT_KEYS.indexOf(k);
  return [...picks].sort((a, b) => b.score - a.score || keyRank(a.ctx.key) - keyRank(b.ctx.key) || b.last - a.last || (a.ctx.id < b.ctx.id ? -1 : 1))[0] ?? null;
}

function ruleA(rule: TrailRule, eps: Episode[], ctx: TrailCtx, now: number): TrailCandidate[] {
  const out: TrailCandidate[] = [];
  const moves = moveMap(ctx.moves);
  for (const m of ctx.moves) {
    if (!m.offerable) continue;
    const withM = eps.filter((e) => e.moveIds.includes(m.id));
    if (withM.length < rule.minEpisodes) continue;
    const span = spanDays(withM);
    if (span < (rule.minSpanDays ?? 0)) continue;
    const tools = uniq(withM.flatMap((e) => e.moveToolIds[m.id] ?? [])).length;
    if (tools < (rule.minTools ?? 1)) continue;
    const picks: ContextPick[] = [];
    for (const c of ctx.contexts) {
      if (isBlocked(ctx.blocked, { ruleId: rule.id, moveIds: [m.id], contextId: c.id, partId: null }, now)) continue;
      const withC = withM.filter((e) => e.contexts[c.key] === c.value);
      if (!withC.length) continue;
      const share = withC.length / withM.length;
      if (share < (rule.contextShare ?? 0)) continue;
      picks.push({ ctx: c, eps: withC, score: share, last: lastAt(withC) });
    }
    const best = bestContext(picks);
    if (!best) continue;
    out.push({
      ruleId: rule.id, shape: 'A', moveIds: [m.id], contextId: best.ctx.id, pairId: null, partId: null,
      evidence: byTime(best.eps).map((e) => evidenceOf(e, ctx.contexts)),
      strength: { episodes: withM.length, spanDays: span, tools, share: best.score },
      safetyLine: moves.get(m.id)?.safetyLine === true,
    });
  }
  return out;
}

/** The first separate episode after `e` (strictly later start) carrying `b`, within `hours` of e's start. */
function follower(e: Episode, b: string, sorted: readonly Episode[], hours: number): Episode | null {
  for (const f of sorted) {
    if (f === e || t(f.at) <= t(e.at)) continue;
    if (t(f.at) - t(e.at) > hours * HOUR) break;
    if (f.moveIds.includes(b)) return f;
  }
  return null;
}

function ruleB(rule: TrailRule, eps: Episode[], ctx: TrailCtx, now: number): TrailCandidate[] {
  const out: TrailCandidate[] = [];
  const ok = ctx.moves.filter((m) => m.offerable && !m.safetyLine).map((m) => m.id);
  const sorted = byTime(eps);
  const hours = rule.withinHours ?? 24;
  for (const a of ok) {
    for (const b of ok) {
      if (a === b) continue;
      if (isBlocked(ctx.blocked, { ruleId: rule.id, moveIds: [a, b], contextId: null, partId: null }, now)) continue;
      const withA = sorted.filter((e) => e.moveIds.includes(a));
      const hits: [Episode, Episode][] = [];
      for (const e of withA) {
        const f = follower(e, b, sorted, hours);
        if (f) hits.push([e, f]);
      }
      if (hits.length < rule.minEpisodes) continue;
      const withoutA = sorted.filter((e) => !e.moveIds.includes(a));
      const base = withoutA.filter((e) => follower(e, b, sorted, hours)).length;
      const p1 = hits.length / withA.length;
      const p0 = withoutA.length ? base / withoutA.length : 0;
      const lift = p0 === 0 ? null : p1 / p0;
      if (lift !== null && lift < (rule.lift ?? 1)) continue;
      const shown = new Set(hits.flat());
      const evEps = sorted.filter((e) => shown.has(e));
      out.push({
        ruleId: rule.id, shape: 'B', moveIds: [a, b], contextId: null, pairId: null, partId: null,
        evidence: evEps.map((e) => evidenceOf(e, ctx.contexts)),
        strength: { episodes: hits.length, spanDays: spanDays(hits.map(([e]) => e)), tools: uniq(evEps.flatMap((e) => e.toolIds)).length, lift },
        safetyLine: false,
      });
    }
  }
  return out;
}

function ruleC(rule: TrailRule, eps: Episode[], ctx: TrailCtx, now: number): TrailCandidate[] {
  const out: TrailCandidate[] = [];
  const moves = moveMap(ctx.moves);
  const fit = (id: string) => { const m = moves.get(id); return !!m && m.offerable && !m.safetyLine; };
  for (const p of ctx.pairs) {
    if (!fit(p.a) || !fit(p.b) || p.a === p.b) continue;
    const picks: ContextPick[] = [];
    for (const c of ctx.contexts) {
      if (isBlocked(ctx.blocked, { ruleId: rule.id, moveIds: [p.a, p.b], contextId: c.id, partId: null }, now)) continue;
      const withC = eps.filter((e) => e.contexts[c.key] === c.value);
      const ea = withC.filter((e) => e.moveIds.includes(p.a));
      const eb = withC.filter((e) => e.moveIds.includes(p.b));
      if (ea.length < rule.minEpisodes || eb.length < rule.minEpisodes) continue;
      const both = withC.filter((e) => e.moveIds.includes(p.a) || e.moveIds.includes(p.b));
      picks.push({ ctx: c, eps: both, score: both.length, last: lastAt(both) });
    }
    const best = bestContext(picks);
    if (!best) continue;
    out.push({
      ruleId: rule.id, shape: 'C', moveIds: [p.a, p.b], contextId: best.ctx.id, pairId: p.id, partId: null,
      evidence: byTime(best.eps).map((e) => evidenceOf(e, ctx.contexts)),
      strength: { episodes: best.eps.length, spanDays: spanDays(best.eps), tools: uniq(best.eps.flatMap((e) => e.toolIds)).length },
      safetyLine: false,
    });
  }
  return out;
}

/** Live for Rule D: active or resting, not paused by a Louder (pausedUntil still ahead). */
export function partIsLive(p: ClaimedPart, now: number): boolean {
  if (p.status !== 'active' && p.status !== 'resting') return false;
  return !(p.pausedUntil && t(p.pausedUntil) > now);
}

/** The records the person said No to for this part under this rule (Reflect's review), for good. */
export function refusedRecordKeys(blocked: readonly BlockedKey[], ruleId: string, partId: string): Set<string> {
  return new Set(blocked.filter((b) => b.ruleId === ruleId && b.partId === partId).flatMap((b) => b.recordKeys ?? []));
}

/**
 * Rule D's episodes for one part, before the threshold: after its last visit (or its confirmation), with
 * any of its moves, untagged, and holding no record the person said No to for it. Reflect's answer
 * (answerKnownPartReview) checks the answered episodes against this same list.
 */
export function knownPartEpisodes(ruleId: string, eps: readonly Episode[], p: ClaimedPart, blocked: readonly BlockedKey[]): Episode[] {
  const sinceIso = p.lastVisitedAt ?? p.confirmedAt ?? null;
  const since = sinceIso ? t(sinceIso) : -Infinity;
  const refused = refusedRecordKeys(blocked, ruleId, p.id);
  return eps.filter((e) => t(e.at) > since && !e.taggedPartIds.length && e.moveIds.some((m) => p.moveIds.includes(m))
    && !e.recordKeys.some((k) => refused.has(k)));
}

function ruleD(rule: TrailRule, eps: Episode[], ctx: TrailCtx, now: number): TrailCandidate[] {
  const out: TrailCandidate[] = [];
  for (const p of ctx.parts) {
    if (!partIsLive(p, now) || !p.moveIds.length) continue;
    const hit = knownPartEpisodes(rule.id, eps, p, ctx.blocked);
    if (hit.length < rule.minEpisodes) continue;
    const moveIds = uniq(hit.flatMap((e) => e.moveIds.filter((m) => p.moveIds.includes(m)))).sort();
    if (isBlocked(ctx.blocked, { ruleId: rule.id, moveIds, contextId: null, partId: p.id }, now)) continue;
    out.push({
      ruleId: rule.id, shape: 'D', moveIds, contextId: null, pairId: null, partId: p.id,
      evidence: byTime(hit).map((e) => evidenceOf(e, ctx.contexts)),
      strength: { episodes: hit.length, spanDays: spanDays(hit), tools: uniq(hit.flatMap((e) => e.toolIds)).length },
      safetyLine: false,
    });
  }
  return out;
}

const RULES = { A: ruleA, B: ruleB, C: ruleC, D: ruleD } as const;

export function rankTrails(cands: TrailCandidate[]): TrailCandidate[] {
  const recent = (c: TrailCandidate) => Math.max(...c.evidence.map((e) => t(e.at)), -Infinity);
  const tie = (c: TrailCandidate) => `${c.ruleId}|${c.moveIds.join(',')}|${c.contextId ?? ''}|${c.pairId ?? ''}|${c.partId ?? ''}`;
  return [...cands].sort((a, b) => SHAPE_RANK[a.shape] - SHAPE_RANK[b.shape]
    || b.strength.episodes - a.strength.episodes
    || recent(b) - recent(a)
    || (tie(a) < tie(b) ? -1 : tie(a) > tie(b) ? 1 : 0));
}

export function evaluateTrails(episodes: readonly Episode[], rules: readonly TrailRule[], ctx: TrailCtx, now: number): TrailCandidate[] {
  const out: TrailCandidate[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const run = RULES[rule.shape];
    if (!run) continue;
    out.push(...run(rule, inWindow(episodes, rule.windowDays, now), ctx, now));
  }
  return rankTrails(out);
}
