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

// "sorry" and "apologise / apologize / apologies", as whole words, however they're written.
const SORRY = /\b(sorry|apologi[sz]e[sd]?|apologies)\b/gi;

/** How many apologies the message holds (the FAST strip shows its line when there's one). */
export function sorryCount(text: string): number {
  return (text.match(SORRY) ?? []).length;
}

/**
 * The message with its apologies taken out, keeping the rest of each sentence: "I'm so sorry, but I can't." becomes
 * "I can't." A sentence that was only an apology goes. Never touches anything else the person wrote.
 */
export function dropSorry(text: string): string {
  const out = text
    // "I'm (so / really / very) sorry(,) (but / that / for this)", "I am sorry", "sorry(,) (but)"
    // "I'm sorry to hear that / to say this(,) (but)": the whole clause goes.
    .replace(/\b(?:(?:I'?m|I am)\s+(?:(?:so|really|very|truly|terribly)\s+)*)?sorry\s+to\s+\w+(?:\s+(?:this|that|it))?[,.!]?\s*(?:\bbut\b[,]?\s*)?/gi, '')
    .replace(/\b(?:I'?m|I am)\s+(?:(?:so|really|very|truly|terribly)\s+)*(?:sorry|apologetic)\b[,.!]?\s*(?:\b(?:but|that|for that|about this|about that)\b[,]?\s*)?/gi, '')
    .replace(/\b(?:I\s+)?(?:(?:have\s+)?apologi[sz]e[sd]?|apologies)\b(?:\s+(?:already|for\s+(?:this|that)))?[,.!]?\s*(?:\bbut\b[,]?\s*)?/gi, '')
    .replace(/\bsorry\b[,.!]?\s*(?:\bbut\b[,]?\s*)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/(^|[.!?]\s+)[,.]\s*/g, '$1')
    .trim();
  // Each sentence starts with a capital again once its apology has gone.
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
