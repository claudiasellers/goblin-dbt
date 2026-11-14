/**
 * The pocket card's rules (`pocketCard`, plan C3b, IE-01 Mode C; docs/design/dear-man-prep.md), pure. The plan on
 * three cards, each listing its fields' picks in order (labels, own words last). An ask with a [blank] reads the fill
 * field's words in its place (DEAR MAN's "I'd like help with [this]" + "the shopping this week"); a blank nobody
 * filled stays as written. One field can be joined into a sentence behind a lead ("I felt hurt and unheard"), up to
 * two can carry a small label ("I won't accept"), the say card can open with how firmly to ask (IE-07), and the
 * steady card can end with fixed notes. Empty cards drop out,
 * so the card never shows an empty side.
 */
export interface PocketLine { label?: string; text: string }
export interface PocketCardSide { key: 'say' | 'steady' | 'push'; lines: PocketLine[] }

export interface PocketProps {
  say?: readonly string[]; steady?: readonly string[]; push?: readonly string[]; fill?: string; detail?: string;
  /** The field whose picks join into one sentence after `joinLead` (DEAR MAN's feelings). */
  joinField?: string; joinLead?: string;
  /** Fields whose lines carry a small label above them (`labels[field]`). */
  labels?: Readonly<Record<string, string>>;
  /** Fixed lines at the end of the steady card (non-empty only). */
  steadyNotes?: readonly string[];
  /** A line at the top of the say card (how firmly to ask, IE-07), with its small label; only on a card with picks. */
  lead?: PocketLine;
}

const BLANK = /\[[^\]]*\]/g;

/** One field's lines: its picks, with the fill field's words in any [blank] of `fill`'s picks. */
export function fieldLines(field: string, picked: Readonly<Record<string, readonly string[]>> | undefined,
  fill?: string, detail?: string): string[] {
  const lines = (picked?.[field] ?? []).map((l) => l.trim()).filter(Boolean);
  if (!fill || field !== fill || !detail) return lines;
  const words = (picked?.[detail] ?? []).map((l) => l.trim()).filter(Boolean).join(', ');
  if (!words) return lines;
  return lines.map((l) => l.replace(BLANK, words));
}

/** "a", "a and b", "a, b and c". */
export function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** A chip label inside a sentence: lower-cased, unless it reads as a name or an acronym (two capitals in a row). */
const inSentence = (w: string) => (/^[A-Z][a-z]/.test(w) ? w[0].toLowerCase() + w.slice(1) : w);

export function pocketSides(props: PocketProps, picked: Readonly<Record<string, readonly string[]>> | undefined): PocketCardSide[] {
  const linesOf = (f: string): PocketLine[] => {
    const ls = fieldLines(f, picked, props.fill, props.detail);
    if (!ls.length) return [];
    if (props.joinField === f && props.joinLead) return [{ text: `${props.joinLead} ${joinWords(ls.map(inSentence))}.` }];
    const label = props.labels?.[f];
    return ls.map((text) => (label ? { label, text } : { text }));
  };
  const side = (key: PocketCardSide['key'], fields: readonly string[] | undefined, notes: readonly string[] = [], lead?: PocketLine): PocketCardSide => {
    const lines = (fields ?? []).flatMap(linesOf);
    // Notes (and the lead) never make a card on their own: they ride on a card that has the person's own picks.
    if (!lines.length) return { key, lines: [] };
    return { key, lines: [...(lead?.text ? [lead] : []), ...lines, ...notes.filter(Boolean).map((text) => ({ text }))] };
  };
  return [side('say', props.say, [], props.lead), side('steady', props.steady, props.steadyNotes), side('push', props.push)].filter((s) => s.lines.length > 0);
}

/** One line as text: its label, a colon, then the line. */
export const lineText = (l: PocketLine) => (l.label ? `${l.label}: ${l.text}` : l.text);

/** The whole plan as text, for Copy: each card's heading, then its lines. */
export function pocketText(sides: readonly PocketCardSide[], heading: (k: PocketCardSide['key']) => string): string {
  return sides.map((s) => [heading(s.key), ...s.lines.map(lineText)].filter(Boolean).join('\n')).join('\n\n');
}
