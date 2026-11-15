/**
 * MF-03's rebuild (docs/design/unpack-a-judgment.md; PRD MF-03 step 4): the person's own picks, put together as a
 * first-person description. Not framed as better or truer than the judgment, only as described. Pure, so the card
 * and the tests read the same lines.
 *
 * - `happened` and `cost` picks are sentences already (*I didn't go.*), one line each.
 * - `feel` picks (grid words or own words) join into one line after `feelLead`: *I feel ashamed and hurt.*
 * - `want` picks each follow `wantLead`: *I wanted to be respected.*
 *
 * Own words are kept as written, apart from a closing full stop when they have none.
 */
export interface DescribePicks { happened?: readonly string[]; cost?: readonly string[]; feel?: readonly string[]; want?: readonly string[] }
export interface DescribeLeads { feelLead: string; wantLead: string }

const ENDS = /[.!?…]["”’)]?$/u;

/** A closing full stop when the words have none. */
export function sentence(text: string): string {
  const t = text.trim();
  return !t || ENDS.test(t) ? t : `${t}.`;
}

/** Lower-case the first letter so a chip label reads mid-sentence, but never the pronoun *I*. */
export function midSentence(text: string): string {
  const t = text.trim();
  if (/^I(\b|['’])/u.test(t)) return t;
  return t.charAt(0).toLocaleLowerCase() + t.slice(1);
}

/** *a*, *a and b*, *a, b and c*. */
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function describeLines(p: DescribePicks, leads: DescribeLeads): string[] {
  const clean = (xs?: readonly string[]) => (xs ?? []).map((x) => x.trim()).filter(Boolean);
  const out: string[] = [];
  for (const x of clean(p.happened)) out.push(sentence(x));
  for (const x of clean(p.cost)) out.push(sentence(x));
  const feel = clean(p.feel).map((x) => midSentence(x).replace(/[.!?…]+$/u, ''));
  if (feel.length) out.push(sentence(`${leads.feelLead} ${joinAnd(feel)}`));
  for (const x of clean(p.want)) out.push(sentence(`${leads.wantLead} ${midSentence(x).replace(/[.!?…]+$/u, '')}`));
  return out;
}
