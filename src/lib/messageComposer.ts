/**
 * The message card's rules (`messageComposer`, plan C3b, IE-owned; docs/design/say-no.md), pure. The card puts the
 * run's picks together as one message, in a fixed order (a warm opener, the line, one reason, something else), and runs
 * the FAST strip over it (DBT IE Handout 7: no extra apologies, no over-explaining). The app never sends: Copy and
 * Open messages hand the words to the person.
 */

/** The parts of the message, in the order they're said. Empty parts drop out. */
export function composeMessage(parts: readonly (readonly string[] | undefined)[]): string {
  return parts.flatMap((p) => p ?? []).map((l) => l.trim()).filter(Boolean).map(endSentence).join(' ');
}

/** A part ends as a sentence: own words without a full stop get one, so the parts read as a message. */
function endSentence(s: string): string {
  return /[.!?…]["')\]]?$/.test(s) ? s : `${s}.`;
}

// "sorry", "apologise / apologize" and "apologies", as whole words: an apology in the message, not one described
// ("I apologised", "she apologises").
const SORRY = /\b(sorry|apologi[sz]e|apologies)\b/gi;

/** How many apologies the message holds (the FAST strip shows its line when there's one). */
export function sorryCount(text: string): number {
  return (text.match(SORRY) ?? []).length;
}

// The apology clauses that go whole: "sorry to say / hear (this)", "sorry to bother / disappoint (you)", "sorry to let
// you down". Any other "sorry to / for / about …" is left as written: what follows is the person's own sentence.
const SORRY_TO = String.raw`sorry\s+to\s+(?:(?:say|hear)(?:\s+(?:this|that|it))?|(?:bother|disappoint)(?:\s+you)?|let\s+you\s+down)\b`;
const NOT_OWN = String.raw`(?!\s+(?:to|for|about)\s+(?!(?:this|that)\b))`;
const INTENS = String.raw`(?:(?:so|really|very|truly|terribly)\s+)*`;
const TAIL = String.raw`[,.!]?\s*(?:\bbut\b[,]?\s*)?`;

/**
 * The message with its apologies taken out, keeping the rest of each sentence: "I'm so sorry, but I can't." becomes
 * "I can't." A sentence that was only an apology goes. Never removes the person's own words around an apology it
 * can't take out cleanly ("sorry to the team" stays as written).
 */
export function dropSorry(text: string): string {
  const out = text
    .replace(new RegExp(String.raw`\b(?:(?:I'?m|I am)\s+${INTENS})?${SORRY_TO}${TAIL}`, 'gi'), '')
    .replace(new RegExp(String.raw`\b(?:I'?m|I am)\s+${INTENS}(?:sorry|apologetic)\b${NOT_OWN}(?:\s+(?:for|about)\s+(?:this|that))?[,.!]?\s*(?:\b(?:but|that)\b[,]?\s*)?`, 'gi'), '')
    .replace(new RegExp(String.raw`\b(?:I\s+|my\s+)?(?:apologi[sz]e|apologies)\b${NOT_OWN}(?:\s+for\s+(?:this|that))?${TAIL}`, 'gi'), '')
    .replace(new RegExp(String.raw`\bsorry\b${NOT_OWN}${TAIL}`, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/,([.!?])/g, '$1')
    .replace(/,\s*$/, '.')
    .replace(/(^|[.!?]\s+)[,.]\s*/g, '$1')
    .trim();
  // Each sentence starts with a capital again once its apology has gone.
  if (out === text.trim()) return out;
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

/** A reason long enough to read as a case to argue with (FAST: one reason at most, no justifying). */
export const LONG_REASON = 70;

export function overExplains(reason: readonly string[] | undefined): boolean {
  return (reason ?? []).some((r) => r.trim().length > LONG_REASON);
}

/** Open messages with the words in, where the device has a messages app (`sms:`); the person picks who and sends. */
export function messagesHref(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`;
}
