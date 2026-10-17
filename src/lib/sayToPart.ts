/**
 * "Say something to it" (17 Oct): something the person says to one of their kept parts, on its card in
 * Parts of me and after Thanks in Meet a part (a visit to a kept part). IFS works through the relationship
 * with each part; DBT's self-validation is the same muscle. Pure: which lines it needs, its copy, the
 * chips for a part (the gentle set for a tender one), the request, and the quiet "You told it: …" line.
 *
 * Every word comes from the shipped parts copy (flow `say`); the person's own words (≤ SAY_OWN_MAX) are
 * kept as written and never linted. Nothing shows until every line it needs ships (`surfaceReady`).
 */
import type { PartsContent, PartsOption } from '../data/partsContentTypes';
import { SAY_OWN_MAX, type PartMessageLine, type SayToPartRequest } from '../data/partsTypes';
import { fill } from './invalidationRecovery';
import { stepOptions, surfaceReady, type SurfaceIds } from './partsContent';

export { SAY_OWN_MAX };

export const SAY_PROMPTS = [
  'say_open', 'say_prompt', 'say_prompt_noname', 'say_own_label', 'say_send', 'say_cancel', 'say_told',
] as const;
export type SayPromptId = (typeof SAY_PROMPTS)[number];
/** The chips, both sets: the usual (step `say`) and the gentle one for a tender part (step `say_tender`). */
export const SAY_OPTIONS = [
  'say_thanks', 'say_got_this', 'say_rest', 'say_listening', 'say_see', 'say_own',
  'say_here', 'say_safe', 'say_tender_listening', 'say_tender_own',
] as const;
/** What the card's button and Meet a part's step need (scripts/parts/review.mjs reads it). */
export const SAY_TO_PART_REQUIRED: SurfaceIds = { prompts: SAY_PROMPTS, options: SAY_OPTIONS };
/** The part story's line: shown only when it ships too (the story itself never waits on it). */
export const SAY_STORY_PROMPT = 'say_story';

export type SayCopy = Record<SayPromptId, string>;

/** The copy, or null while any line or chip is missing (no button, no Meet step). */
export function sayCopy(content: PartsContent | null): SayCopy | null {
  if (!content || !surfaceReady(content, SAY_TO_PART_REQUIRED)) return null;
  return Object.fromEntries(SAY_PROMPTS.map((id) => [id, content.prompts[id].copy])) as SayCopy;
}

/** The question, with the part's own name when it has one. */
export const sayQuestion = (copy: SayCopy, name: string | null | undefined): string =>
  name?.trim() ? fill(copy.say_prompt, { name: name.trim() }) : copy.say_prompt_noname;

/** A part's chips: the gentle set for a tender part. Own words is the chip whose branch is `own_words`. */
export function sayChoices(content: PartsContent, tender: boolean): { chips: PartsOption[]; own: PartsOption | null } {
  const all = stepOptions(content, 'say', tender ? 'say_tender' : 'say');
  return { chips: all.filter((o) => o.branch !== 'own_words'), own: all.find((o) => o.branch === 'own_words') ?? null };
}

/** Exactly one of a chip or their own words (trimmed, ≤ SAY_OWN_MAX); null when there's nothing to send. */
export function sayRequest(id: string, partId: string, said: { chipId: string } | { own: string }): SayToPartRequest | null {
  if ('chipId' in said) return said.chipId ? { id, partId, chipId: said.chipId } : null;
  const own = said.own.trim().slice(0, SAY_OWN_MAX);
  return own ? { id, partId, own } : null;
}

/** What was said, in words: the chip's label (any set: a part may have turned tender since), or their own words. */
export function saidWords(content: PartsContent, m: Pick<PartMessageLine, 'chipId' | 'own'>): { words: string; own: boolean } | null {
  const own = m.own?.trim();
  if (own) return { words: own, own: true };
  if (!m.chipId) return null;
  const label = [...stepOptions(content, 'say', 'say'), ...stepOptions(content, 'say', 'say_tender')].find((o) => o.id === m.chipId)?.label;
  return label ? { words: label, own: false } : null;
}

/** A template split around `{said}`, so the words can be set apart (the serif for own words). */
export interface SaidLine { before: string; words: string; after: string; own: boolean }

/** The card's quiet line, "You told it: …" (the latest), or null. */
export function toldLine(copy: SayCopy, content: PartsContent, m: PartMessageLine | null | undefined): SaidLine | null {
  if (!m) return null;
  const w = saidWords(content, m);
  if (!w) return null;
  const [before, after = ''] = copy.say_told.split('{said}');
  return { before, words: w.words, after, own: w.own };
}

/**
 * The Meet a part step after Thanks: only for a visit to a kept part, when its copy ships. The tender path
 * (presence only) gets it with the gentle set, as does a part kept as tender.
 */
export const meetSayReady = (content: PartsContent | null, partId: string | null | undefined): boolean =>
  !!partId && sayCopy(content) !== null;
