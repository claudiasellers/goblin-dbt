/**
 * The parts stats in words (docs/design/parts.md, "The part card" and Reflect): what has helped a part
 * settle, the steps that helped, how the person has felt toward it, and when it tends to show up. Pure:
 * the numbers come from the server (functions/src/parts/stats.ts, PartStats); every word from the
 * shipped parts copy (common/stats, meet/feel), the tool names from src/data/tools.ts, the steps' labels
 * from the graph in the same response. Reflect renders it now; Me's part
 * card can render the same lines later.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { PartStats, PartWhen } from '../data/partsTypes';
import { fill } from './invalidationRecovery';
import { surfaceReady, type SurfaceIds } from './partsContent';
import { UNNAMED_PROMPTS } from './partTag';

export const STATS_PROMPTS = [
  'stats_helped', 'stats_helped_line', 'stats_helped_once', 'stats_felt', 'stats_felt_then_now', 'stats_felt_since', 'stats_when',
  'stats_steps', 'stats_step_twice', 'stats_step_times',
] as const;
export const WHEN_OPTIONS: Record<PartWhen, string> = {
  mornings: 'when_mornings', afternoons: 'when_afternoons', evenings: 'when_evenings', nights: 'when_nights',
};
/** Everything Reflect's parts section says: its title, the stats lines, the unnamed parts' names. */
export const REFLECT_PROMPTS = ['reflect_title', ...STATS_PROMPTS, ...UNNAMED_PROMPTS] as const;

/** The stats lines (common/stats and the when options): what Me's part card requires. */
export const STATS_REQUIRED: SurfaceIds = { prompts: STATS_PROMPTS, options: Object.values(WHEN_OPTIONS) };
/** Reflect's parts section: the stats lines plus its title and the unnamed parts' names. */
export const REFLECT_REQUIRED: SurfaceIds = { prompts: REFLECT_PROMPTS, options: STATS_REQUIRED.options };

/** The stats lines' own gate: Me's part card uses it, and Reflect's builds on it. */
export const statsReady = (content: PartsContent): boolean => surfaceReady(content, STATS_REQUIRED);

/** Reflect shows its parts section only when every line of it ships. */
export const reflectPartsReady = (content: PartsContent): boolean =>
  statsReady(content) && surfaceReady(content, REFLECT_REQUIRED);

export interface PartStatLines {
  /** "Mostly evenings". */
  when: string | null;
  /** "What's helped it settle", then "Pause helped 3 times" / "Cool Down helped once". */
  helped: { title: string; lines: string[] } | null;
  /** "Steps that helped: Stay in the room (twice) · Reach out to one person". */
  steps: string | null;
  /** "How you've felt toward it", then "In July: tired of it. Lately: curious." / "Since July: curious." */
  felt: { title: string; line: string } | null;
}

const optionLabel = (content: PartsContent, flow: string, step: string, id: string): string | null =>
  content.options[flow]?.[step]?.find((o) => o.id === id)?.label ?? null;

/** A `YYYY-MM` as the locale's month name ("July"). */
export function monthName(month: string, locale?: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return '';
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleString(locale, { month: 'long', timeZone: 'UTC' });
}

/**
 * A part's lines. A line whose words are missing (an unknown tool, a feel answer that no longer ships)
 * is left out, never shown half-filled; a section with no lines left is null.
 */
export function partStatLines(stats: PartStats, content: PartsContent, deps: {
  toolName: (toolId: string) => string | null;
  monthName: (month: string) => string;
}): PartStatLines {
  const copy = (id: string) => content.prompts[id]?.copy ?? '';
  const whenLabel = stats.when ? optionLabel(content, 'common', 'stats', WHEN_OPTIONS[stats.when]) : null;
  const when = whenLabel ? fill(copy('stats_when'), { when: whenLabel }) : null;

  const lines = (stats.helped ?? []).flatMap(({ toolId, n }) => {
    const tool = deps.toolName(toolId);
    if (!tool || n < 1) return [];
    return [n === 1 ? fill(copy('stats_helped_once'), { tool }) : fill(copy('stats_helped_line'), { tool, n })];
  });
  const helped = lines.length ? { title: copy('stats_helped'), lines } : null;

  // `?? []`: a readout from a server before the steps shipped has no field.
  const items = (stats.steps ?? []).flatMap(({ label, n }) => {
    if (!label || n < 1) return [];
    if (n === 1) return [label];
    return [n === 2 ? fill(copy('stats_step_twice'), { step: label }) : fill(copy('stats_step_times'), { step: label, n })];
  });
  const steps = items.length ? fill(copy('stats_steps'), { steps: items.join(' · ') }) : null;

  let felt: PartStatLines['felt'] = null;
  if (stats.felt) {
    const now = optionLabel(content, 'meet', 'feel', stats.felt.now);
    const then = stats.felt.then ? optionLabel(content, 'meet', 'feel', stats.felt.then) : null;
    const month = deps.monthName(stats.felt.month);
    if (now && month && (stats.felt.then === null || then)) {
      const line = then
        ? fill(copy('stats_felt_then_now'), { month, then, now })
        : fill(copy('stats_felt_since'), { month, now });
      felt = { title: copy('stats_felt'), line };
    }
  }
  return { when, helped, steps, felt };
}

export const hasStatLine = (l: PartStatLines): boolean => l.when !== null || l.helped !== null || l.steps !== null || l.felt !== null;
