/**
 * The pros & cons card's lines (DT-10, docs/design/pros-cons.md), pure: what the card says from a run's answers
 * (`prosConsCard`) or from a kept card (`prosConsReplay`; src/components/skillPlayer/ProsConsCard.tsx).
 */
import type { SkillDef } from '../data/skillTypes';

export interface ProsConsLines { reasons: string[]; pro: string }

/** Own words first (they count most), then picks, two at most; the pro is their words, a pick, or the fallback. */
export function cardLines(reasons: { own: string | null; picks: string[] }[], pro: { own: string | null; picks: string[] }, fallback: string): ProsConsLines {
  const own = reasons.map((r) => r.own).filter((x): x is string => !!x && !!x.trim());
  const picks = reasons.flatMap((r) => r.picks);
  return { reasons: [...own, ...picks].slice(0, 2), pro: pro.own?.trim() || pro.picks[0] || fallback };
}

/** One sentence per part, ending in a single full stop (own words may already end in one). */
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** The card read as one group by a screen reader: its title (if any), the reasons, the pro (if shown). */
export function cardLabel(parts: { title?: string; reasonsLabel: string; reasons: string[]; proLabel?: string; pro?: string | null }) {
  const out = parts.title ? [sentence(parts.title)] : [];
  out.push(`${parts.reasonsLabel}: ${parts.reasons.map(sentence).join(' ')}`);
  if (parts.proLabel && parts.pro) out.push(`${parts.proLabel}: ${sentence(parts.pro)}`);
  return out.join(' ');
}

/** A field's answer from the run: own words are the last label when there are more labels than ids. */
export function answerOf(picked: Readonly<Record<string, readonly string[]>>, ids: Readonly<Record<string, readonly string[]>>, field: string) {
  const labels = picked[field] ?? [];
  const n = (ids[field] ?? []).length;
  return { own: labels.length > n ? labels[labels.length - 1] : null, picks: labels.slice(0, n) };
}

/** A kept card as the `prosCons` slice gives it (functions/src/profile/slices.ts). */
export interface KeptCard {
  id: string; pullIds?: string[]; longIds?: string[]; longOwn?: string | null; keepsIds?: string[]; keepsOwn?: string | null;
  givesIds?: string[]; givesOwn?: string | null;
}

/** The newest kept card for this pull (the slice comes newest first), or null. */
export function cardFor(slice: unknown, pullId: string | undefined): KeptCard | null {
  if (!pullId || !Array.isArray(slice)) return null;
  return (slice as KeptCard[]).find((c) => c && Array.isArray(c.pullIds) && c.pullIds.includes(pullId)) ?? null;
}

/** A kept card's lines, its ids named through the card's own skill (never a copy of its labels). */
export function keptLines(card: KeptCard, skill: SkillDef, fallback: string): ProsConsLines {
  const name = (list: string, ids: string[] | undefined) => (ids ?? [])
    .map((id) => skill.options[list]?.find((o) => o.value === id)?.label)
    .filter((x): x is string => !!x);
  return cardLines(
    [{ own: card.longOwn ?? null, picks: name('long', card.longIds) }, { own: card.keepsOwn ?? null, picks: name('keeps', card.keepsIds) }],
    { own: card.givesOwn ?? null, picks: name('gives', card.givesIds) },
    fallback,
  );
}
