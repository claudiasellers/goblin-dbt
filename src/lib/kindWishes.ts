/**
 * Kind wishes (MF-06, docs/design/kind-wishes.md): the wishes the person picked, as the lines the offer shows one at a
 * time. A chip's label (*Be safe*) goes into the template (*May you {wish}.*) lower-cased at its first letter. Own
 * words that already read as a whole wish are shown as typed, capitalised and with a full stop when they have no
 * ending: words starting with *May* or with a subject (*I'm enough*, *You deserve rest*, *Everyone gets home safe*).
 * Other own words finish the template, and a leading *I* is never lower-cased.
 * Pure: the wishOffer embed (src/components/skillPlayer/WishOffer.tsx) and its tests read it.
 */
const WHOLE = /^(may|i|i'm|i've|i'll|i'd|im|you|you're|we|we're|they|they're|everyone|everybody|my|your|our|their|he|she|it)\b/i;
const KEEP_I = /^(i|i'm|i've|i'll|i'd)\b/i;

export function wishLines(picked: readonly string[] | undefined, template: string): string[] {
  const out: string[] = [];
  for (const raw of picked ?? []) {
    const w = raw.trim().replace(/\s+/g, ' ');
    if (!w) continue;
    if (WHOLE.test(w)) {
      const line = w.charAt(0).toUpperCase() + w.slice(1);
      out.push(/[.!?]$/.test(line) ? line : `${line}.`);
      continue;
    }
    const bare = w.replace(/[.!?]+$/, '');
    const wish = KEEP_I.test(bare) ? bare : bare.charAt(0).toLowerCase() + bare.slice(1);
    out.push(template.includes('{wish}') ? template.replace('{wish}', wish) : `${template} ${wish}.`);
  }
  return out;
}

/**
 * Which picks the offer uses: all of them (labels, own words last), or with `chipsOnly` the chip labels only (the
 * first `chipCount`, since own words come last), for a step that offers to someone else wishes written for another
 * tier. Nothing left → the fallback wish, when there is one.
 */
export function offerWishes(picked: readonly string[] | undefined, chipCount: number, chipsOnly: boolean, fallback: string): string[] {
  const all = [...(picked ?? [])];
  const use = chipsOnly ? all.slice(0, Math.max(0, chipCount)) : all;
  return use.length || !fallback ? use : [fallback];
}

/** What the offer reports: every wish offered, some, or none (the person moved on first). */
export function offerResult(count: number, offered: number): 'offered' | 'partly' | 'skipped' {
  if (offered <= 0) return 'skipped';
  return offered >= count ? 'offered' : 'partly';
}
