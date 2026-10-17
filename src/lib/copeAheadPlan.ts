/**
 * Cope Ahead's plan line (docs/design/cope-ahead.md, "The plan line"): one pure function, so the keep card,
 * the rehearsal's plan beat and Today's after card say the same words. Composed from the visit's `ext.ca`
 * ids and cope-ahead.json each time, never from a stored string.
 *
 *   **If** {ifText}, **I'll** {move}[ **and** {move}].
 *
 * - The "If": the hardest moment's `ifText`; with `ifFrom: 'pull'`, the pull's `pullIf` line; or the
 *   person's own words (`hardMomentOwn`). A planned-for pull that no longer resolves falls back to the
 *   moment, then the own words.
 * - The moves: each `moveIds` move's `line`, then `moveOwn`, two at most.
 * - An id the content doesn't have is dropped. An id is never printed.
 *
 * Own words are the person's own (length-checked only, never linted), kept as typed except for the
 * spaces at either end and a closing full stop or comma, so the sentence reads once.
 */

/** What a plan line needs from cope-ahead.json (a structural slice of CopeAheadContent). */
export interface PlanContent {
  /** The screens' copy: `plan_if`, `plan_ill` and `plan_and` are the sentence's words. */
  copy: Readonly<Record<string, string>>;
  /** The pull as the "If", by Find the feeling's pull id. */
  pullIf: Readonly<Record<string, string>>;
  hardMoments: ReadonlyArray<{ id: string; ifText: string }>;
  moves: ReadonlyArray<{ id: string; line: string }>;
}

/** The plan's fields of `ext.ca` (functions/src/spine/extSchemas.ts). Anything missing is skipped. */
export interface PlanCa {
  hardMomentId?: string | null;
  hardMomentOwn?: string | null;
  ifFrom?: 'moment' | 'pull' | null;
  pullIds?: readonly string[] | null;
  moveIds?: readonly string[] | null;
  moveOwn?: string | null;
}

/**
 * The plan in parts, so a screen can set If / I'll / and in their own weight, and as one sentence.
 * `text` is "" (and the missing part "" or []) when the visit has no "If" or no move to say: nothing
 * to show.
 */
export type PlanParts = { ifText: string; moves: string[]; text: string };

/** At most two moves in one plan. */
export const PLAN_MAX_MOVES = 2;

/** The sentence's words, from the content (these are what the flow ships, used only if a key is missing). */
const WORDS = { plan_if: 'If', plan_ill: "I'll", plan_and: 'and' } as const;

const own = (s: string | null | undefined): string => (typeof s === 'string' ? s.trim().replace(/[\s.,]+$/u, '').trim() : '');

export const planWord = (content: Pick<PlanContent, 'copy'>, key: keyof typeof WORDS): string => {
  const w = content.copy?.[key];
  return typeof w === 'string' && w.trim() ? w.trim() : WORDS[key];
};

function ifOf(content: PlanContent, ca: PlanCa): string {
  const moment = ca.hardMomentId ? content.hardMoments.find((m) => m.id === ca.hardMomentId)?.ifText ?? '' : '';
  const pull = (ca.pullIds ?? []).map((p) => content.pullIf?.[p]).find((x): x is string => typeof x === 'string' && x.trim() !== '') ?? '';
  const ordered = ca.ifFrom === 'pull' ? [pull, moment, own(ca.hardMomentOwn)] : [moment, own(ca.hardMomentOwn)];
  return ordered.map((x) => x.trim()).find((x) => x !== '') ?? '';
}

function movesOf(content: PlanContent, ca: PlanCa): string[] {
  const lines = [...new Set(ca.moveIds ?? [])]
    .map((id) => content.moves.find((m) => m.id === id)?.line?.trim() ?? '')
    .filter((x) => x !== '');
  const mine = own(ca.moveOwn);
  return [...lines, ...(mine ? [mine] : [])].slice(0, PLAN_MAX_MOVES);
}

/** The visit's plan: its "If", its moves and the joined sentence. */
export function planLine(content: PlanContent, ca: PlanCa | null | undefined): PlanParts {
  if (!ca) return { ifText: '', moves: [], text: '' };
  const ifText = ifOf(content, ca);
  const moves = movesOf(content, ca);
  const text = ifText && moves.length
    ? `${planWord(content, 'plan_if')} ${ifText}, ${planWord(content, 'plan_ill')} ${moves.join(` ${planWord(content, 'plan_and')} `)}.`
    : '';
  return { ifText, moves, text };
}
