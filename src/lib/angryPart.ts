/**
 * Pure rules for the angry-part card (docs/design/alexithymia-first-interaction.md, "Anger: the angry
 * part"; component: src/components/parts/AngryPartCard.tsx). Which wording each line takes, and the
 * order the hurts are offered in. All copy comes from the parts content (scripts/parts/content.py). The
 * wording for one person at one moment is ./angryPartCopy.ts, which loads with the card.
 */
import {
  ANGRY_LATER, ANGRY_LATER_DONE, ANGRY_LINES, ANGRY_NOT_NOW, ANGRY_OPTIONS, HOLD_HINT, type AngryCardContent, type AngryCardCopy,
  type AngryContentHurt, type AngryHurt, type AngryLaterCopy, type AngryNotNowId,
} from '../data/partsTypes';
import type { PartsContent } from '../data/partsContentTypes';
import { surfaceReady, type SurfaceIds } from './partsContent';

/** The card is for the fire back urge: its move's OFTEN_GUARDS order is the chips' default order. */
export const ANGRY_MOVE = 'hit_back';

/**
 * The prompt ids the card shows for one wording: each line's own id with parts on, its `_plain` twin off,
 * and the hold hint (one wording).
 */
export const angryPromptIds = (partsOn: boolean): string[] => [...ANGRY_LINES.map((l) => (partsOn ? l : `${l}_plain`)), HOLD_HINT];

/** The card's own "Not now" for one wording. */
export const angryNotNowId = (partsOn: boolean): AngryNotNowId => (partsOn ? ANGRY_NOT_NOW : `${ANGRY_NOT_NOW}_plain`);

/** The option ids the card shows for one wording: the shared ones and that wording's "Not now". */
export const angryOptionIds = (partsOn: boolean): string[] => [...ANGRY_OPTIONS, angryNotNowId(partsOn)];

/** What the card's gate requires for one wording (scripts/parts/review.mjs reads both). */
export const angryRequired = (partsOn: boolean): SurfaceIds => ({ prompts: angryPromptIds(partsOn), options: angryOptionIds(partsOn) });

/** "Spend a minute with it later?" (parts on only): the ask and what replaces it. */
export const ANGRY_LATER_REQUIRED: SurfaceIds = { prompts: [ANGRY_LATER_DONE], options: [ANGRY_LATER] };

/** A hurt the card can offer: its chip, its vote of confidence and its sentence all have words. */
const complete = (h: AngryContentHurt) => Boolean(h.label?.trim() && h.matters?.trim() && h.feltPhrase?.trim());

/**
 * Whether the card can show for this wording from the shipped (signed-off only) parts content: every
 * prompt and option of the person's wording, its own "Not now" included (flowReady), and at least one
 * hurt, each complete. The other wording isn't needed. Nothing renders half a card, and the card never
 * shows without its own way past.
 */
export function angryReady(content: PartsContent, partsOn: boolean): boolean {
  return surfaceReady(content, angryRequired(partsOn)) && content.hurts.length > 0 && content.hurts.every(complete);
}

/**
 * "Spend a minute with it later?" on the last screen: parts on only, and only when both its lines ship
 * (the ask and what replaces it). Null otherwise, and the screen is as it was.
 */
export function angryLaterCopy(content: PartsContent, partsOn: boolean): AngryLaterCopy | null {
  if (!partsOn || !surfaceReady(content, ANGRY_LATER_REQUIRED)) return null;
  const ask = Object.values(content.options.angry ?? {}).flat().find((o) => o.id === ANGRY_LATER)?.label?.trim();
  const done = content.prompts[ANGRY_LATER_DONE]?.copy?.trim();
  return ask && done ? { ask, done } : null;
}

/**
 * The angry flow's prompts and options from the parts content: both wordings, or only the person's
 * when `partsOn` is given (the other is left empty and never read). Throws on a missing id: a card with
 * a blank line is worse than no card (a host checks angryReady first).
 */
export function angryCopyFrom(content: Pick<AngryCardContent, 'prompts' | 'options'>, partsOn?: boolean): AngryCardCopy {
  const options = Object.values(content.options.angry ?? {}).flat();
  const out: Record<string, string> = {};
  const needed = new Set(partsOn === undefined ? [...angryPromptIds(true), ...angryPromptIds(false)] : angryPromptIds(partsOn));
  for (const id of [...ANGRY_LINES.flatMap((l) => [l, `${l}_plain`]), HOLD_HINT]) {
    const copy = content.prompts[id]?.copy;
    if (!copy && needed.has(id)) throw new Error(`parts content: no prompt ${id}`);
    out[id] = copy ?? '';
  }
  for (const id of ANGRY_OPTIONS) {
    const label = options.find((o) => o.id === id)?.label;
    if (!label) throw new Error(`parts content: no option ${id}`);
    out[id] = label;
  }
  for (const on of [true, false]) {
    const id = angryNotNowId(on);
    const label = options.find((o) => o.id === id)?.label;
    if (!label && (partsOn === undefined || partsOn === on)) throw new Error(`parts content: no option ${id}`);
    out[id] = label ?? '';
  }
  return out as AngryCardCopy;
}

/**
 * The hurts in the order to offer: what Recover's event can touch first (CAN_TOUCH, its order), then
 * the rest in hit back's OFTEN_GUARDS rank, then any left in content order. Each hurt once, and only
 * complete ones (never an empty chip or a blank vote).
 */
export function orderHurts(all: AngryContentHurt[], canTouch: Record<string, string[]>, stateId?: string | null): AngryHurt[] {
  const hurts = all.filter(complete);
  const byId = new Map(hurts.map((h) => [h.id, h]));
  const rank = (h: AngryContentHurt) => h.guardedBy.find((g) => g.moveId === ANGRY_MOVE)?.rank;
  const guarded = hurts.filter((h) => rank(h) !== undefined).sort((a, b) => rank(a)! - rank(b)!);
  const rest = [...hurts].sort((a, b) => a.order - b.order);
  const ids = [...((stateId && canTouch[stateId]) || []), ...guarded.map((h) => h.id), ...rest.map((h) => h.id)];
  return [...new Set(ids)].filter((id) => byId.has(id)).map((id) => {
    const h = byId.get(id)!;
    return { id: h.id, label: h.label, matters: h.matters!, feltPhrase: h.feltPhrase };
  });
}
