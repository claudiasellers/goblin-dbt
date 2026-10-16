/**
 * Pure rules for the angry-part card (docs/design/alexithymia-first-interaction.md, "Anger: the angry
 * part"; component: src/components/parts/AngryPartCard.tsx). Which wording each line takes, and the
 * order the hurts are offered in. All copy comes from the parts content (scripts/parts/content.py).
 */
import {
  ANGRY_LINES, ANGRY_OPTIONS, type AngryCardContent, type AngryCardCopy, type AngryHurt, type AngryLineId, type PartsHurt,
} from '../data/partsTypes';
import { fill } from './invalidationRecovery';

/** The card is for the fire back urge: its move's OFTEN_GUARDS order is the chips' default order. */
export const ANGRY_MOVE = 'hit_back';

/**
 * The angry flow's prompts (both wordings) and options from the parts content. Throws on a missing id:
 * a card with a blank line is worse than no card, and the host can fall back to its own next step.
 */
export function angryCopyFrom(content: Pick<AngryCardContent, 'prompts' | 'options'>): AngryCardCopy {
  const options = Object.values(content.options.angry ?? {}).flat();
  const out: Record<string, string> = {};
  for (const id of ANGRY_LINES.flatMap((l) => [l, `${l}_plain`])) {
    const copy = content.prompts[id]?.copy;
    if (!copy) throw new Error(`parts content: no prompt ${id}`);
    out[id] = copy;
  }
  for (const id of ANGRY_OPTIONS) {
    const label = options.find((o) => o.id === id)?.label;
    if (!label) throw new Error(`parts content: no option ${id}`);
    out[id] = label;
  }
  return out as AngryCardCopy;
}

/**
 * The hurts in the order to offer: what Recover's event can touch first (CAN_TOUCH, its order), then
 * the rest in hit back's OFTEN_GUARDS rank, then any left in content order. Each hurt once.
 */
export function orderHurts(hurts: PartsHurt[], canTouch: Record<string, string[]>, stateId?: string | null): AngryHurt[] {
  const byId = new Map(hurts.map((h) => [h.id, h]));
  const rank = (h: PartsHurt) => h.guardedBy.find((g) => g.moveId === ANGRY_MOVE)?.rank;
  const guarded = hurts.filter((h) => rank(h) !== undefined).sort((a, b) => rank(a)! - rank(b)!);
  const rest = [...hurts].sort((a, b) => a.order - b.order);
  const ids = [...((stateId && canTouch[stateId]) || []), ...guarded.map((h) => h.id), ...rest.map((h) => h.id)];
  return [...new Set(ids)].filter((id) => byId.has(id)).map((id) => {
    const h = byId.get(id)!;
    return { id: h.id, label: h.label, matters: h.matters, feltPhrase: h.feltPhrase };
  });
}

/** Every string the card shows, for one person at one moment. */
export interface ResolvedAngryCopy {
  unblend: string;
  unblendSub: string;
  protects: string;
  /** The vote of confidence, in order. */
  vote: [string, string, string];
  hold: string;
  speak: string;
  /** The person's own sentence ("I felt brushed off."); null after "Not sure". */
  speakLine: string | null;
  next: string;
  notSure: string;
  done: string;
}

/**
 * The wording for (parts on or off, a first name or none, a hurt or "Not sure"). Parts off takes every
 * line's `_plain` twin, which never says "part". No name takes the `_noname` lines (second person).
 */
export function resolveAngryCopy(copy: AngryCardCopy, { partsOn, name, hurt }: {
  partsOn: boolean; name: string | null; hurt: Pick<AngryHurt, 'matters' | 'feltPhrase'> | null;
}): ResolvedAngryCopy {
  const first = name?.trim() || null;
  const line = (id: AngryLineId) => copy[partsOn ? id : `${id}_plain` as const];
  const slots = { name: first ?? '', matters: hurt?.matters ?? '', felt: hurt?.feltPhrase ?? '' };
  const say = (id: AngryLineId) => fill(line(id), slots);
  const vote1: AngryLineId = hurt
    ? (first ? 'angry_vote' : 'angry_vote_noname')
    : (first ? 'angry_vote_unsure' : 'angry_vote_unsure_noname');
  return {
    unblend: say('angry_unblend'),
    unblendSub: say('angry_unblend_sub'),
    protects: say('angry_protects'),
    vote: [say(vote1), say('angry_vote_2'), say(first ? 'angry_vote_3' : 'angry_vote_3_noname')],
    hold: say('angry_hold'),
    speak: say(hurt ? 'angry_speak' : 'angry_speak_unsure'),
    speakLine: hurt ? say('angry_speak_line') : null,
    next: copy.angry_next,
    notSure: copy.angry_not_sure,
    done: copy.angry_done,
  };
}
