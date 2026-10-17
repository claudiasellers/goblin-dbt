/**
 * The Me part card's logic (src/components/me/PartsOfMe.tsx): its rows, order, candidate lines and
 * links, actions and the 30-day check-back's answers. Pure. Split from ./partsOfMe.ts (the area's gates
 * and copy, which Me reads eagerly) so it loads with the card, only with parts on.
 *
 * Card rules: a fear is never shown on a tender part (the conservative branch told the person "we'll
 * leave that be"), nor a fear chip flagged tender or danger on any part, and the person's own-words fear
 * is never shown at all (getMe doesn't send it). Option ids that aren't signed off, and place ids the
 * figure doesn't know, are left out.
 */
import { REGIONS, isRegionId } from '../data/bodyFigure';
import type { PartsContent, PartsMove, PartsOption } from '../data/partsContentTypes';
import {
  RATHER_IDS_MAX, type AnswerPartRevisitRequest, type PartRefRequest, type PartRevisitAnswer, type RenamePartRequest, type RestPartRequest,
} from '../data/partsTypes';
import type { MeItem, MePart, MePartCandidate } from '../services/profile';
import { stepOptions } from './partsContent';
import {
  PART_NAME_MAX, type MeetAPartLink, type PartCandidatePromptId, type PartRevisitChoice, type PartRevisitCopy, type PartsOfMePromptId,
} from './partsOfMe';

/** The card's rows, already labelled. `job` is the person's own words when they gave them, else chips. */
export interface PartCardRows {
  where: string[];
  job: { own: string } | { labels: string[] } | null;
  fears: string[];
  rather: string[];
}

function labels(content: PartsContent, step: string, ids: readonly string[], plainOnly = false): string[] {
  const byId = new Map((content.options.meet?.[step] ?? []).filter((o) => !plainOnly || o.flag === null).map((o) => [o.id, o.label]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

export function partCardRows(part: MePart, content: PartsContent): PartCardRows {
  const jobs = labels(content, 'job', part.jobIds);
  const own = part.ownJob?.trim();
  return {
    where: part.places.filter(isRegionId).map((id) => REGIONS[id].label),
    job: own ? { own } : jobs.length ? { labels: jobs } : null,
    // A fear that sent Meet a part down its tender or danger branch is never echoed either.
    fears: part.tender ? [] : labels(content, 'fear', part.fearIds, true),
    rather: labels(content, 'rather', part.preferredRoleIds),
  };
}

/** Most recently visited first; never-visited ones after, newest kept first; then by id. */
export function sortPartItems(items: readonly MeItem[]): MeItem[] {
  const t = (v: string | null | undefined) => {
    const n = v ? Date.parse(v) : Number.NaN;
    return Number.isNaN(n) ? -Infinity : n;
  };
  return [...items].sort((a, b) =>
    t(b.part?.lastVisitedAt) - t(a.part?.lastVisitedAt) || t(b.meta.confirmedAt) - t(a.meta.confirmedAt)
    || (a.meta.id < b.meta.id ? -1 : a.meta.id > b.meta.id ? 1 : 0));
}

/** The candidate's move as the app can name it: the first of its moves that ships with a phrase, else none. */
export function candidateMove(content: PartsContent, c: MePartCandidate): PartsMove | null {
  for (const id of c.moveIds) {
    const m = content.moves.find((x) => x.id === id);
    if (m?.unblendPhrase) return m;
  }
  return null;
}

/** "The one that wants to hide", or "One you wanted to come back to" with no nameable move. */
export function candidateLine(copy: Record<PartCandidatePromptId, string>, content: PartsContent, c: MePartCandidate): string {
  const m = candidateMove(content, c);
  return m ? copy.candidate_line.split('{move}').join(m.unblendPhrase) : copy.candidate_line_plain;
}

/** "Get to know it": Meet a part on the candidate trailhead, opening on the move the line names. */
export function candidateMeetLink(content: PartsContent, c: MePartCandidate): MeetAPartLink {
  const m = candidateMove(content, c);
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'candidate', candidateId: c.id, ...(m ? { moveId: m.id } : {}) } } };
}

/** One call to lane 2's part writers (src/services/parts.ts), by name, with its request. */
export type PartWriteCall =
  | { fn: 'renamePart'; req: RenamePartRequest }
  | { fn: 'restPart'; req: RestPartRequest }
  | { fn: 'setAsidePart' | 'restorePart' | 'setPartTender'; req: PartRefRequest }
  | { fn: 'answerPartRevisit'; req: AnswerPartRevisitRequest };

export type PartActionId = 'rename' | 'rest' | 'back' | 'set_aside' | 'tender';
/** A quiet action on the card. Rename opens the name field (no call until Save). */
export interface PartAction { id: PartActionId; label: string; call: PartWriteCall | null }

/**
 * The card's row after "Spend time with it": Rename, Rest it (It's back on a resting part), Set aside,
 * and "It feels young or hurt" only on a part that isn't tender (one way: there is no unmark yet).
 * A set-aside part has no card (its row has Bring it back, `restoreCall`).
 */
export function partActions(item: MeItem, copy: Record<PartsOfMePromptId, string>): PartAction[] {
  const partId = item.meta.id;
  if (!item.part || item.meta.status === 'set_aside') return [];
  const resting = item.meta.status === 'resting';
  return [
    { id: 'rename', label: copy.card_rename, call: null },
    resting
      ? { id: 'back', label: copy.card_back, call: { fn: 'restPart', req: { partId, resting: false } } }
      : { id: 'rest', label: copy.card_rest, call: { fn: 'restPart', req: { partId, resting: true } } },
    { id: 'set_aside', label: copy.card_set_aside, call: { fn: 'setAsidePart', req: { partId } } },
    ...(item.part.tender ? [] : [{ id: 'tender' as const, label: copy.card_tender, call: { fn: 'setPartTender' as const, req: { partId } } }]),
  ];
}

export function renameCall(partId: string, typed: string): PartWriteCall {
  return { fn: 'renamePart', req: { partId, name: renameValue(typed) } };
}

export function restoreCall(partId: string): PartWriteCall {
  return { fn: 'restorePart', req: { partId } };
}

/** What Save sends: the person's words as typed (trimmed); empty clears the name ("A part"). Never linted. */
export function renameValue(typed: string): string | null {
  const t = typed.trim().slice(0, PART_NAME_MAX);
  return t ? t : null;
}

/** Whether the card asks now: past its revisit date (getMe's `prompt: 'ask'`), active or resting. */
export function partAsksBack(item: MeItem): boolean {
  return !!item.part && item.meta.prompt === 'ask' && (item.meta.status === 'active' || item.meta.status === 'resting');
}

/** The question, with the person's name for the part, or the unnamed line. */
export function revisitQuestion(copy: PartRevisitCopy, part: MePart, resting: boolean): string {
  const name = part.name?.trim();
  if (!name) return copy.prompts[resting ? 'revisit_resting_noname' : 'revisit_title_noname'];
  return copy.prompts[resting ? 'revisit_resting' : 'revisit_title'].split('{name}').join(name);
}

/** Not a job: mirrors functions/src/parts/keepPlan.ts `NON_ANSWER` (the server refuses these). */
export const NON_ANSWER = /^(own_words|.*_not_sure|.*_nothing|.*_cant_tell|.*_not_yet)$/;

/**
 * "What does it do now?": the meet flow's would-rather chips, non-answers left out, the part's own
 * moves' chips first (then the ones for every move). A part with no move, or whose moves have no
 * signed-off chip, sees them all. Empty only when no chip ships: the card then leaves out "new".
 */
export function revisitRatherOptions(content: PartsContent, part: MePart): PartsOption[] {
  const mine = (o: PartsOption) => o.moves.length > 0 && o.moves.some((m) => part.moveIds.includes(m));
  const all = stepOptions(content, 'meet', 'rather').filter((o) => !NON_ANSWER.test(o.id) && o.flag === null);
  const fits = all.filter((o) => o.moves.length === 0 || mine(o));
  return (part.moveIds.length > 0 && fits.some(mine) ? fits : all).sort((a, b) => Number(mine(b)) - Number(mine(a)));
}

/** The answers this card offers: an active part's four (no "new" without a chip to pick), or a resting part's two. */
export function revisitChoices(copy: PartRevisitCopy, content: PartsContent, part: MePart, resting: boolean): PartRevisitChoice[] {
  if (resting) return copy.resting;
  const canNew = revisitRatherOptions(content, part).length > 0;
  return copy.active.filter((c) => c.answer !== 'new' || canNew);
}

/** Toggle a would-rather chip, never past three. */
export function toggleRather(picked: readonly string[], id: string): string[] {
  if (picked.includes(id)) return picked.filter((x) => x !== id);
  return picked.length >= RATHER_IDS_MAX ? [...picked] : [...picked, id];
}

/** One answer's call (`id` a fresh uuid), or null when it can't be sent (`new` needs 1 to 3 chips). */
export function revisitCall(id: string, partId: string, answer: PartRevisitAnswer, ratherIds: readonly string[] = []): PartWriteCall | null {
  if (answer !== 'new') return { fn: 'answerPartRevisit', req: { id, partId, answer } };
  const ids = [...new Set(ratherIds)].filter((x) => !NON_ANSWER.test(x));
  if (ids.length < 1 || ids.length > RATHER_IDS_MAX) return null;
  return { fn: 'answerPartRevisit', req: { id, partId, answer, ratherIds: ids } };
}
