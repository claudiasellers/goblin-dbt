/**
 * The angry-part card's wording for one person at one moment (src/components/parts/AngryPartCard.tsx).
 * Pure. Split from ./angryPart.ts (the rules Recover reads eagerly to decide whether to offer the card)
 * so it loads with the card.
 */
import type { AngryCardCopy, AngryHurt, AngryLineId } from '../data/partsTypes';
import { angryNotNowId } from './angryPart';
import { fill } from './invalidationRecovery';

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
  /** The card's own way past, in this wording (the host's skip link on the first screen). */
  notNow: string;
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
    notNow: copy[angryNotNowId(partsOn)],
  };
}
