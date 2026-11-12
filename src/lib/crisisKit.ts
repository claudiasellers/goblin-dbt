/**
 * My crisis kit (DT-03, docs/design/crisis-kit.md), pure: which of the tool's two skills opens, and the deck the
 * `kitDeck` embed plays (src/components/skillPlayer/KitDeck.tsx).
 *
 * The cards come from what the person kept (`crisis_kit`, the `crisisKit` slice: option ids and own words per
 * section), named through the make-it skill's own options (never a copy of their labels), plus up to two kept pros &
 * cons cards. Someone who hasn't made a kit (signed out, or never made one) gets the starter cards the skill marks.
 */
import type { SkillDef } from '../data/skillTypes';
import { keptLines, type KeptCard } from './prosConsCard';

export type KitSkill = 'crisis_kit_use' | 'crisis_kit_build';

/** `?frame=build` makes the kit; anything else opens it (a crisis route's `frame=crisis` too). */
export function crisisKitSkillFor(frame: string | null): KitSkill {
  return frame === 'build' ? 'crisis_kit_build' : 'crisis_kit_use';
}

/** The sections, in the kit's own order (PRD: body first). The make-it skill's field ids are the same. */
export const KIT_SECTIONS = ['body', 'hands', 'soothe', 'words', 'place', 'reasons'] as const;
export type KitSection = (typeof KIT_SECTIONS)[number] | 'pros_cons';

/** A kept kit as the `crisisKit` slice gives it (functions/src/profile/slices.ts). */
export type KeptKit = { id?: string } & Partial<Record<`${(typeof KIT_SECTIONS)[number]}Ids`, string[]>>
  & Partial<Record<`${(typeof KIT_SECTIONS)[number]}Own`, string | null>>;

export interface KitCard {
  id: string;
  section: KitSection;
  /** The card's words: a body move, a line to read, a place, or the section's heading for a list card. */
  title: string;
  /** One instruction line (a copy key's text, or the option's own `how`). */
  how?: string;
  /** A caution under the card (cold: First, the body's line). */
  caution?: string;
  /** A list card's lines (reasons; a pros & cons card's reasons not to). */
  lines?: string[];
}

export interface KitCopy {
  secReasons: string; secProsCons: string; placeHow: string; wordsHow: string; reasonsLabel: string;
  /** Copy keys the options name (a `caution` prop), resolved by the caller. */
  copy: Readonly<Record<string, string>>;
}

const clean = (s: unknown): string | null => (typeof s === 'string' && s.trim() ? s.trim() : null);

/** How many cards a kept kit's value holds (Me): a safe place and the reasons each show as one card. */
export function kitCardCount(value: Record<string, unknown>): number {
  return KIT_SECTIONS.reduce((n, s) => {
    const ids = Array.isArray(value[`${s}Ids`]) ? (value[`${s}Ids`] as unknown[]).length : 0;
    const own = typeof value[`${s}Own`] === 'string' && (value[`${s}Own`] as string).trim() ? 1 : 0;
    return n + (s === 'place' || s === 'reasons' ? Math.min(1, ids + own) : ids + own);
  }, 0);
}

/** Whether a kept kit has anything in it. */
export function kitHasCards(kit: KeptKit | null | undefined): boolean {
  return !!kit && KIT_SECTIONS.some((s) => (kit[`${s}Ids`] ?? []).length > 0 || !!clean(kit[`${s}Own`]));
}

/**
 * Every card, grouped by section in the kit's order. A kept kit with cards → its cards; otherwise the starter
 * cards (`starter: true` on the make-it skill's options). Kept pros & cons cards (newest first, two at most) go last.
 */
export function kitCards(kit: KeptKit | null | undefined, build: SkillDef, copy: KitCopy,
  pros: { cards: readonly KeptCard[]; skill: SkillDef | null } = { cards: [], skill: null }): { cards: KitCard[]; starter: boolean } {
  const starter = !kitHasCards(kit);
  const out: KitCard[] = [];
  const opt = (section: string, id: string) => build.options[section]?.find((o) => o.value === id);
  const card = (section: KitSection, id: string, title: string, o?: Record<string, unknown>): KitCard => {
    const how = section === 'words' ? copy.wordsHow : section === 'place' ? copy.placeHow : clean(o?.how) ?? undefined;
    const caution = typeof o?.caution === 'string' ? copy.copy[o.caution] : undefined;
    return { id: `${section}:${id}`, section, title, ...(how ? { how } : {}), ...(caution ? { caution } : {}) };
  };
  for (const section of KIT_SECTIONS) {
    if (starter) {
      for (const o of build.options[section] ?? []) if (o.starter === true) out.push(card(section, o.value, o.label, o));
      continue;
    }
    const own = clean(kit![`${section}Own`]);
    const picks = (kit![`${section}Ids`] ?? []).map((id) => ({ id, o: opt(section, id) })).filter((x) => !!x.o);
    if (section === 'reasons') {
      const lines = [...(own ? [own] : []), ...picks.map((x) => x.o!.label)];
      if (lines.length) out.push({ id: 'reasons', section, title: copy.secReasons, how: copy.reasonsLabel, lines });
      continue;
    }
    if (section === 'place') {
      // One place, described in their words if they did; the pick names it otherwise.
      const title = own ?? picks[0]?.o?.label;
      if (title) out.push(card(section, 'place', title));
      continue;
    }
    // Their own words first: they count most.
    if (own) out.push(card(section, 'own', own));
    for (const { id, o } of picks) out.push(card(section, id, o!.label, o));
  }
  if (pros.skill) {
    for (const c of pros.cards.slice(0, 2)) {
      const lines = keptLines(c, pros.skill, '').reasons;
      // The card's own label for them, from the pros & cons skill (never a copy).
      const how = clean(pros.skill.copy.card_reasons) ?? undefined;
      if (lines.length) out.push({ id: `pros_cons:${c.id}`, section: 'pros_cons', title: copy.secProsCons, ...(how ? { how } : {}), lines });
    }
  }
  return { cards: out, starter };
}

/**
 * The order the deck plays them in. Each *Another card* changes the kind of card (PRD: *next* changes modality):
 * one from each section in turn, then round again. A carried flooded reading: body cards only, one and one swap.
 */
export function deckOrder(cards: readonly KitCard[], flooded: boolean): KitCard[] {
  if (flooded) return cards.filter((c) => c.section === 'body').slice(0, 2);
  const by = new Map<KitSection, KitCard[]>();
  for (const c of cards) by.set(c.section, [...(by.get(c.section) ?? []), c]);
  const out: KitCard[] = [];
  for (let round = 0; out.length < cards.length; round += 1) {
    for (const list of by.values()) if (list[round]) out.push(list[round]);
  }
  return out;
}

/**
 * The deck to play: their cards in `deckOrder`. Flooded, a kit with fewer than two body cards is topped up from the
 * starter's body cards (one and one swap, never an empty deck). `starter` only when every card is a starter card.
 */
export function playDeck(mine: { cards: readonly KitCard[]; starter: boolean }, starterCards: readonly KitCard[],
  flooded: boolean): { order: KitCard[]; starter: boolean } {
  const order = deckOrder(mine.cards, flooded);
  if (!flooded || order.length >= 2) return { order, starter: mine.starter };
  const have = new Set(order.map((c) => c.id));
  const fill = deckOrder(starterCards, true).filter((c) => !have.has(c.id)).slice(0, 2 - order.length);
  return { order: [...order, ...fill], starter: mine.starter || order.length === 0 };
}

/** What the deck reports: the kinds of card it showed (and `starter`, when it was the starter kit). */
export function deckOutput(shown: readonly KitCard[], starter: boolean): string[] {
  return [...new Set(shown.map((c) => c.section)), ...(starter ? ['starter'] : [])];
}
