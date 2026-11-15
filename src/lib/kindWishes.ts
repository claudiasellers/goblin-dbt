/**
 * Kind wishes (MF-06, docs/design/kind-wishes.md): the wishes the person picked, as the lines the offer shows one at a
 * time. A chip's label (*Be safe*) goes into the template (*May you {wish}.*) lower-cased at its first letter; own words
 * that already read as a wish (*May you sleep well*) are shown as typed, with a full stop when they have no ending.
 * Pure: the wishOffer embed (src/components/skillPlayer/WishOffer.tsx) and its tests read it.
 */
export function wishLines(picked: readonly string[] | undefined, template: string): string[] {
  const out: string[] = [];
  for (const raw of picked ?? []) {
    const w = raw.trim().replace(/\s+/g, ' ');
    if (!w) continue;
    if (/^may\b/i.test(w)) {
      out.push(/[.!?]$/.test(w) ? w : `${w}.`);
      continue;
    }
    const wish = w.charAt(0).toLowerCase() + w.slice(1).replace(/[.!?]+$/, '');
    out.push(template.includes('{wish}') ? template.replace('{wish}', wish) : `${template} ${wish}.`);
  }
  return out;
}

/** What the offer reports: every wish offered, some, or none (the person moved on first). */
export function offerResult(count: number, offered: number): 'offered' | 'partly' | 'skipped' {
  if (offered <= 0) return 'skipped';
  return offered >= count ? 'offered' : 'partly';
}
