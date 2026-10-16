/**
 * Recover → DEAR MAN: the hurt picked on Recover's angry-part card ("What it protects") comes over as
 * the hand-off's `hurtId` and becomes the first "I felt" chip in Express, not selected. The chip is the
 * hurt's felt phrase alone, first letter capitalised like the other chips ("Brushed off"), with no parts
 * wording, parts on or off. History shows the same.
 *
 * What is saved: the ProtectedHurt id in DearManSession.feelings, beside the DearManFeelingChip ids
 * (feel_*); never free text. The visit's ToolSession emotions are Emotion ids, so there the chip counts
 * as the hurt's NAMED_AS words. Only a hurt the shipped parts content has (signed off) with a felt
 * phrase is ever offered or read back.
 */
import type { PartsHurt } from '../data/partsContentTypes';

type ShippedHurt = Pick<PartsHurt, 'id' | 'feltPhrase' | 'namedAs'>;

/** The extra "I felt" chip: the hurt id is its saved value, the felt phrase its label. */
export interface HurtFeelingChip {
  id: string;
  label: string;
  /** NAMED_AS: the Emotion ids that name the hurt (for the visit's emotions, never the saved feelings). */
  emotionIds: string[];
}

/** A felt phrase as a chip label: its first letter capitalised, the rest as written. */
export const chipCase = (phrase: string): string => {
  const t = phrase.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const shipped = (hurtId: string, hurts: readonly ShippedHurt[] | null | undefined): ShippedHurt | null => {
  const h = hurts?.find((x) => x.id === hurtId);
  return h && h.feltPhrase?.trim() ? h : null;
};

/**
 * The chip for the hand-off's hurt, or null (no hurt, or one the shipped content lacks or can't word).
 * With no hand-off (a resumed draft), a shipped hurt already among the feelings keeps its chip, so it
 * can still be seen and unpicked.
 */
export function hurtFeelingChip(
  hurtId: string | null | undefined, hurts: readonly ShippedHurt[] | null | undefined, feelings: readonly string[] = [],
): HurtFeelingChip | null {
  const h = hurtId ? shipped(hurtId, hurts) : feelings.map((id) => shipped(id, hurts)).find(Boolean) ?? null;
  return h ? { id: h.id, label: chipCase(h.feltPhrase), emotionIds: [...h.namedAs] } : null;
}

/** A saved feeling's words: a DEAR MAN chip's label, else a shipped hurt's felt phrase (chip case), else ''. */
export function feelingLabel(
  id: string, chips: readonly { id: string; label: string }[], hurts: readonly ShippedHurt[] | null | undefined,
): string {
  return chips.find((c) => c.id === id)?.label ?? hurtLabel(id, hurts) ?? '';
}

/** A saved hurt id's words for History: the shipped felt phrase in chip case, or null (History humanizes the id). */
export function hurtLabel(id: string, hurts: readonly ShippedHurt[] | null | undefined): string | null {
  const h = shipped(id, hurts);
  return h ? chipCase(h.feltPhrase) : null;
}

/**
 * The words for the visit's emotions (useToolSession().setEmotionIds reads display names or ids): a
 * DEAR MAN chip by its label (as before), a hurt by its NAMED_AS Emotion ids. Anything else is dropped.
 */
export function feelingEmotionWords(
  feelings: readonly string[], chips: readonly { id: string; label: string }[], hurt: HurtFeelingChip | null,
): string[] {
  return feelings.flatMap((id) => {
    const label = chips.find((c) => c.id === id)?.label;
    if (label) return [label];
    return hurt && id === hurt.id ? hurt.emotionIds : [];
  });
}
