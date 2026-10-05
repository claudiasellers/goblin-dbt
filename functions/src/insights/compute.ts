/**
 * Reflect's numbers, from one user's log. Pure: no driver, no firebase (tests/reflect-insights.test.mjs
 * imports it directly). handler.ts decides which graph content to look up from what this returns.
 *
 * Reflect R1 (docs: the project's claude/specs/reflect.md) changed three things against the
 * pre-R1 single-file version, all deliberate:
 * - Outcomes come from the practice spine's own close answers (ToolSession.thenVsNow /
 *   actedOnUrge), as docs/design/alexithymia-first-interaction.md decided ("the replacement signal
 *   is the then-vs-now close … add it to the insight queries"). "Went well" means better or much
 *   better, the same line the what_helps pattern rule draws, so Reflect and Me never disagree. The
 *   compat ToolUsage row only ever carried outcomes for regulation / orienting closes and scored
 *   "better" as half. Urge tools (Pause, Urge Surfing) are measured on their own question.
 * - Words are counted one by one. `CheckIn.emotion` is the display join ("anxious, let down"), so
 *   counting it counted combinations.
 * - "Follow-through" counts only a tool explicitly opened from the check-in, not the compat row's
 *   "latest check-in before the tool" guess.
 * Everything else (thresholds, formulation choice, alert, somatic grouping) is unchanged.
 */
import { RESERVED_TOOL_IDS } from '../spine/types';
import type {
  CheckInRow, GrowthEvidenceInsight, GrowthInsight, LegacyUsageRow, OutcomeDirection, OutcomeMeasure, PatternFrequency, SessionRow,
  SomaticCorrelationData, TimeRange, ToolEffectivenessData, ToolOutcomeSummary,
} from './types';
import { intensityDrop, intensityTrending } from './intensity';

export const POSITIVE_STATE = 'positive_state';

// ── Thresholds (unchanged from the pre-R1 function) ──

export interface Thresholds {
  coOccurrenceMin: number; dominantRepeatMin: number;
  growthCheckIns: number; growthDaySpan: number; growthHalfMin: number;
  emotionVocabMin: number; emotionFamilyMin: number; intensityDropMin: number;
  sensationTagDelta: number; sensationTagMin: number; bodyAvgDelta: number; bodyAvgMin: number;
  followThroughRate: number; followThroughCount: number; toolRepertoireMin: number; outcomeCountMin: number;
  somaticCheckInMin: number; somaticRegionCount: number; somaticFallbackMin: number;
}

export function thresholdsFor(range: TimeRange): Thresholds {
  if (range === '7d') {
    return {
      coOccurrenceMin: 1, dominantRepeatMin: 1, growthCheckIns: 2, growthDaySpan: 2, growthHalfMin: 1,
      emotionVocabMin: 2, emotionFamilyMin: 2, intensityDropMin: 0.05, sensationTagDelta: 1, sensationTagMin: 2,
      bodyAvgDelta: 0.2, bodyAvgMin: 0.3, followThroughRate: 0.3, followThroughCount: 1, toolRepertoireMin: 2,
      outcomeCountMin: 1, somaticCheckInMin: 1, somaticRegionCount: 1, somaticFallbackMin: 2,
    };
  }
  if (range === 'all') {
    return {
      coOccurrenceMin: 4, dominantRepeatMin: 3, growthCheckIns: 8, growthDaySpan: 14, growthHalfMin: 3,
      emotionVocabMin: 5, emotionFamilyMin: 4, intensityDropMin: 0.10, sensationTagDelta: 3, sensationTagMin: 5,
      bodyAvgDelta: 0.5, bodyAvgMin: 0.8, followThroughRate: 0.4, followThroughCount: 5, toolRepertoireMin: 4,
      outcomeCountMin: 3, somaticCheckInMin: 3, somaticRegionCount: 3, somaticFallbackMin: 4,
    };
  }
  return {
    coOccurrenceMin: 2, dominantRepeatMin: 2, growthCheckIns: 4, growthDaySpan: 5, growthHalfMin: 2,
    emotionVocabMin: 3, emotionFamilyMin: 3, intensityDropMin: 0.08, sensationTagDelta: 2, sensationTagMin: 3,
    bodyAvgDelta: 0.3, bodyAvgMin: 0.5, followThroughRate: 0.4, followThroughCount: 3, toolRepertoireMin: 3,
    outcomeCountMin: 2, somaticCheckInMin: 2, somaticRegionCount: 2, somaticFallbackMin: 3,
  };
}

// ── Words ──

/**
 * The words of one check-in, one entry each: the graph ids when the check-in carries them, else the
 * display string split on its ", " join (lower-cased). A check-in with no word (display string is
 * the quadrant) has none.
 */
export function wordsOf(ci: Pick<CheckInRow, 'emotion' | 'emotionIds' | 'quadrant'>): string[] {
  if (ci.emotionIds.length) return [...new Set(ci.emotionIds)];
  if (!ci.emotion || ci.emotion === ci.quadrant) return [];
  return [...new Set(ci.emotion.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean))];
}

// ── Patterns ──

export interface PatternTally {
  counts: Record<string, number>;
  frequencies: PatternFrequency[];
  /** Clinical patterns only (positive_state is the pleasant fallback, not a graph pattern). */
  dominant: [string, number] | undefined;
  secondary: [string, number] | undefined;
}

export function tallyPatterns(checkIns: CheckInRow[]): PatternTally {
  const counts: Record<string, number> = {};
  for (const ci of checkIns) {
    if (ci.activationPatternId) counts[ci.activationPatternId] = (counts[ci.activationPatternId] || 0) + 1;
  }
  const frequencies = Object.entries(counts).map(([patternId, count]) => ({ patternId, count })).sort((a, b) => b.count - a.count);
  const clinical = Object.entries(counts).filter(([id]) => id !== POSITIVE_STATE).sort((a, b) => b[1] - a[1]);
  return { counts, frequencies, dominant: clinical[0], secondary: clinical[1] };
}

/**
 * Which formulation to look up, in order: the co-occurrence pair when both patterns repeat enough,
 * then a single pattern (the dominant when it repeats, else the most recent check-in's).
 */
export function formulationPlan(checkIns: CheckInRow[], t: PatternTally, th: Thresholds): {
  pair: [string, string] | null; single: string | null;
} {
  const { dominant, secondary } = t;
  if (!dominant) return { pair: null, single: null };
  const pair: [string, string] | null = secondary && dominant[1] >= th.coOccurrenceMin && secondary[1] >= th.coOccurrenceMin
    ? [dominant[0], secondary[0]] : null;
  const single = dominant[1] >= th.dominantRepeatMin
    ? dominant[0]
    : (checkIns.find((ci) => ci.activationPatternId)?.activationPatternId || dominant[0]);
  return { pair, single };
}

/** The escalation heads-up fires when the dominant pattern repeats or its banded intensity rises. */
export function alertDue(checkIns: CheckInRow[], dominant: [string, number], th: Thresholds): boolean {
  const own = checkIns.filter((ci) => ci.activationPatternId === dominant[0]);
  return intensityTrending(own) || dominant[1] >= th.dominantRepeatMin;
}

// ── Outcomes ──

const RESERVED = new Set<string>(RESERVED_TOOL_IDS);
/** App tools only: help-now, micro-step and guided-activity are one-shots, not tools to rank. */
export const isAppTool = (toolId: string) => Boolean(toolId) && !RESERVED.has(toolId);

/** One answered close. */
export interface OutcomeRow {
  toolId: string; patternId: string | null; at: string; measure: OutcomeMeasure; direction: OutcomeDirection | null; wentWell: boolean;
}

const DIRECTION: Record<string, OutcomeDirection> = { regulation_down: 'down', orienting: 'orient' };

/**
 * Answered closes, newest first. Sessions answer then-vs-now or the urge question; a pre-spine
 * rating maps back through D-03 read in reverse (helped ↔ much better, somewhat ↔ better,
 * not really ↔ same or worse), so "somewhat" counts as went well, like "better" does.
 */
export function outcomeRows(sessions: SessionRow[], legacy: LegacyUsageRow[]): OutcomeRow[] {
  const rows: OutcomeRow[] = [];
  for (const s of sessions) {
    if (!isAppTool(s.toolId)) continue;
    if (s.thenVsNow) {
      rows.push({
        toolId: s.toolId, patternId: s.patternId, at: s.at, measure: 'then_vs_now', direction: DIRECTION[s.closeKind ?? ''] ?? null,
        wentWell: s.thenVsNow === 'better' || s.thenVsNow === 'much_better',
      });
    } else if (s.actedOnUrge) {
      rows.push({ toolId: s.toolId, patternId: s.patternId, at: s.at, measure: 'urge', direction: null, wentWell: s.actedOnUrge === 'no' });
    }
  }
  for (const u of legacy) {
    if (!u.outcome || !isAppTool(u.toolId)) continue;
    rows.push({ toolId: u.toolId, patternId: u.patternId, at: u.timestamp, measure: 'then_vs_now', direction: null, wentWell: u.outcome !== 'not_really' });
  }
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * Per tool: how often it went well, best share first, then most answered; at most 4. `outcomes`
 * newest first, so the measure and direction are those of the most recent answer.
 */
export function toolEffectiveness(outcomes: OutcomeRow[]): ToolEffectivenessData | null {
  const by = new Map<string, { measure: OutcomeMeasure; direction: OutcomeDirection | null; answered: number; wentWell: number }>();
  for (const o of outcomes) {
    const cur = by.get(o.toolId) ?? { measure: o.measure, direction: o.direction, answered: 0, wentWell: 0 };
    cur.direction ??= o.direction;
    cur.answered++;
    if (o.wentWell) cur.wentWell++;
    by.set(o.toolId, cur);
  }
  const tools: ToolOutcomeSummary[] = [...by.entries()].map(([toolId, v]) => ({
    toolId, measure: v.measure, direction: v.measure === 'then_vs_now' ? v.direction : null, answered: v.answered, wentWell: v.wentWell,
    helpedPct: Math.round((v.wentWell / v.answered) * 100), totalUses: v.answered,
  }));
  tools.sort((a, b) => (b.wentWell / b.answered) - (a.wentWell / a.answered) || b.answered - a.answered || a.toolId.localeCompare(b.toolId));
  return tools.length ? { tools: tools.slice(0, 4) } : null;
}

/** Tools that went well at least once for this pattern, most often first; at most 3. */
export function effectiveToolsForPattern(outcomes: OutcomeRow[], patternId: string): string[] {
  const score = new Map<string, number>();
  for (const o of outcomes) {
    if (o.patternId === patternId && o.wentWell) score.set(o.toolId, (score.get(o.toolId) ?? 0) + 1);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([id]) => id);
}

// ── Growth evidence ──

const byTime = (a: string, b: string) => Date.parse(a) - Date.parse(b);

export function growthEvidence(
  checkIns: CheckInRow[], sessions: SessionRow[], legacy: LegacyUsageRow[], outcomes: OutcomeRow[], th: Thresholds,
): GrowthEvidenceInsight | null {
  if (checkIns.length < th.growthCheckIns) return null;
  const sorted = [...checkIns].sort((a, b) => byTime(a.timestamp, b.timestamp));
  const daySpan = (Date.parse(sorted[sorted.length - 1].timestamp) - Date.parse(sorted[0].timestamp)) / 86_400_000;
  if (daySpan < th.growthDaySpan) return null;
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid);
  const newer = sorted.slice(mid);
  if (older.length < th.growthHalfMin || newer.length < th.growthHalfMin) return null;
  const midMs = Date.parse(sorted[mid].timestamp);
  const isNewer = (iso: string) => Date.parse(iso) >= midMs;
  const insights: GrowthInsight[] = [];

  // 1. Vocabulary: distinct words, one by one.
  const olderWords = new Set(older.flatMap(wordsOf));
  const newerWords = new Set(newer.flatMap(wordsOf));
  if (newerWords.size > olderWords.size && newerWords.size >= th.emotionVocabMin) {
    insights.push({ key: 'emotion-vocabulary', text: 'Naming emotions precisely is itself a regulation skill.', data: { current: newerWords.size, previous: olderWords.size } });
  }

  // 2. Family breadth.
  const olderFam = new Set(older.flatMap((ci) => ci.families));
  const newerFam = new Set(newer.flatMap((ci) => ci.families));
  if (newerFam.size > olderFam.size && newerFam.size >= th.emotionFamilyMin) {
    insights.push({ key: 'emotion-family-breadth', text: "You're not collapsing everything into one feeling.", data: { current: newerFam.size, previous: olderFam.size } });
  }

  // 3. Catching it earlier: banded check-ins only (A4-3).
  const drop = intensityDrop(older, newer, th.intensityDropMin);
  if (drop) {
    insights.push({ key: 'catching-earlier', text: "You're catching things before they escalate.", data: { current: Math.round(drop.current * 100), previous: Math.round(drop.previous * 100) } });
  }

  // 4. Pattern diversity.
  const olderPat = new Set(older.map((ci) => ci.activationPatternId).filter(Boolean));
  const newerPat = new Set(newer.map((ci) => ci.activationPatternId).filter(Boolean));
  if (olderPat.size <= 2 && newerPat.size > olderPat.size) {
    insights.push({ key: 'pattern-diversity', text: "You're reading your internal signals more accurately.", data: { current: newerPat.size, previous: olderPat.size } });
  }

  // 5. Body sensation words.
  const olderTags = new Set(older.flatMap((ci) => ci.sensationTags));
  const newerTags = new Set(newer.flatMap((ci) => ci.sensationTags));
  if (newerTags.size > olderTags.size + th.sensationTagDelta && newerTags.size >= th.sensationTagMin) {
    insights.push({ key: 'sensation-richness', text: 'More body detail means earlier warning signals.', data: { current: newerTags.size, previous: olderTags.size } });
  }

  // 6. Body places per check-in.
  const avgPlaces = (xs: CheckInRow[]) => xs.reduce((s, ci) => s + ci.bodyRegions.length, 0) / xs.length;
  const olderAvg = avgPlaces(older);
  const newerAvg = avgPlaces(newer);
  if (newerAvg > olderAvg + th.bodyAvgDelta && newerAvg > th.bodyAvgMin) {
    insights.push({ key: 'body-awareness', text: 'Growing body awareness gives you a head start.', data: { current: Math.round(newerAvg * 10) / 10, previous: Math.round(olderAvg * 10) / 10 } });
  }

  // 7. Follow-through: check-ins a tool was explicitly opened from.
  const ids = new Set(checkIns.map((ci) => ci.id));
  const followed = new Set<string>();
  for (const s of sessions) if (s.checkInId && ids.has(s.checkInId)) followed.add(s.checkInId);
  for (const u of legacy) if (u.checkInId && ids.has(u.checkInId)) followed.add(u.checkInId);
  if (followed.size / checkIns.length >= th.followThroughRate && followed.size >= th.followThroughCount) {
    insights.push({ key: 'tool-follow-through', text: "Notice it, then do something about it. That's the whole loop.", data: { numerator: followed.size, denominator: checkIns.length } });
  }

  // 8. Repertoire: distinct app tools opened in each half.
  const opened = [
    ...sessions.filter((s) => isAppTool(s.toolId)).map((s) => ({ toolId: s.toolId, at: s.at })),
    ...legacy.filter((u) => isAppTool(u.toolId)).map((u) => ({ toolId: u.toolId, at: u.timestamp })),
  ];
  const olderTools = new Set(opened.filter((o) => !isNewer(o.at)).map((o) => o.toolId));
  const newerTools = new Set(opened.filter((o) => isNewer(o.at)).map((o) => o.toolId));
  if (newerTools.size > olderTools.size && newerTools.size >= th.toolRepertoireMin) {
    insights.push({ key: 'tool-repertoire', text: 'More options for different situations.', data: { current: newerTools.size, previous: olderTools.size } });
  }

  // 9. Closes going well more often.
  const olderOut = outcomes.filter((o) => !isNewer(o.at));
  const newerOut = outcomes.filter((o) => isNewer(o.at));
  if (newerOut.length >= th.outcomeCountMin) {
    const rate = (xs: OutcomeRow[]) => xs.filter((o) => o.wentWell).length / xs.length;
    const newerRate = rate(newerOut);
    const olderRate = olderOut.length >= th.outcomeCountMin ? rate(olderOut) : 0;
    if (newerRate > olderRate && newerRate >= 0.5) {
      insights.push({ key: 'positive-outcomes', text: "What you're doing is working.", data: { current: Math.round(newerRate * 100), previous: Math.round(olderRate * 100) } });
    }
  }

  return insights.length ? { insights } : null;
}

// ── Somatic correlation (unchanged) ──

/** Correlations without the narrative; `narrativeId` is the pattern (or quadrant) to look it up by. */
export function somaticCorrelation(checkIns: CheckInRow[], th: Thresholds): (Omit<SomaticCorrelationData, 'narrative'> & { narrativeId: string }) | null {
  const withBody = checkIns.filter((ci) => ci.bodyRegions.length > 0);
  if (withBody.length < th.somaticCheckInMin) return null;
  const byRegion: Record<string, Record<string, number>> = {};
  for (const ci of withBody) {
    const key = ci.activationPatternId || ci.quadrant;
    for (const region of ci.bodyRegions) {
      byRegion[region] ??= {};
      byRegion[region][key] = (byRegion[region][key] || 0) + 1;
    }
  }
  const correlations: Array<{ region: string; patternId: string; count: number }> = [];
  for (const [region, keys] of Object.entries(byRegion)) {
    const top = Object.entries(keys).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= th.somaticRegionCount) correlations.push({ region, patternId: top[0], count: top[1] });
  }
  if (correlations.length === 0 && withBody.length >= th.somaticFallbackMin) {
    const totals: Record<string, number> = {};
    for (const ci of withBody) for (const region of ci.bodyRegions) totals[region] = (totals[region] || 0) + 1;
    for (const [region, count] of Object.entries(totals)) {
      if (count < th.somaticRegionCount) continue;
      const q: Record<string, number> = {};
      for (const ci of withBody) if (ci.bodyRegions.includes(region)) q[ci.quadrant] = (q[ci.quadrant] || 0) + 1;
      correlations.push({ region, patternId: Object.entries(q).sort((a, b) => b[1] - a[1])[0][0], count });
    }
  }
  if (!correlations.length) return null;
  const top = correlations.sort((a, b) => b.count - a.count).slice(0, 3);
  return { correlations: top, narrativeId: top[0].patternId };
}
