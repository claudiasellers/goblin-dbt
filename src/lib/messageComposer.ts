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

// An apology that stands as its own clause: "I'm (so) sorry", "Sorry about this", "My apologies", "I apologise",
// "Sorry to say / hear that", "Sorry to bother / disappoint you", "Sorry to let you down". Only a whole clause is
// ever taken out, so the person's own words around it are never cut into ("I'm sorry that's how it is", "I'm not
// sorry", "Sorry for the late reply" stay as written).
const APOLOGY = String.raw`(?:(?:I['’]?m|I am)\s+(?:(?:so|really|very|truly|terribly)\s+)*sorry|(?:(?:so|really|very)\s+)?sorry|(?:my\s+)?apologies|I\s+apologi[sz]e)(?:\s+(?:about|for)\s+(?:this|that)|\s+to\s+(?:say|hear)(?:\s+(?:this|that|it))?|\s+to\s+(?:bother|disappoint)(?:\s+you)?|\s+to\s+let\s+you\s+down)?`;
const WHOLE = new RegExp(`^${APOLOGY}$`, 'i');
// "Sorry but I can't": the apology and its "but" go, the rest stays.
const LEADS = new RegExp(`^${APOLOGY}\\s+but\\s+(.+)$`, 'i');

/**
 * The message with its apologies taken out, clause by clause: "I'm so sorry, but I can't." becomes "I can't.", and
 * "Sorry. No." becomes "No.". A clause that only apologises goes, with the "but" after it; nothing else changes. When
 * there's nothing it can take out whole, the text comes back as it was (the card then hides its button).
 */
export function dropSorry(text: string): string {
  const sentences = text.trim().match(/[^.!?]+[.!?]*\s*|[.!?]+\s*/g) ?? [];
  const out = sentences.map((sentence) => {
    const end = sentence.match(/[.!?]*\s*$/)?.[0] ?? '';
    const clauses = sentence.slice(0, sentence.length - end.length).split(',');
    const kept: string[] = [];
    let afterApology = false;
    let changed = false;
    for (const c of clauses) {
      let t = c.trim();
      if (WHOLE.test(t)) { afterApology = true; changed = true; continue; }
      const lead = t.match(LEADS);
      if (lead) { t = lead[1]; changed = true; }
      else if (afterApology && /^but\s+/i.test(t)) t = t.replace(/^but\s+/i, '');
      afterApology = false;
      kept.push(t);
    }
    if (!changed) return sentence;
    if (!kept.some(Boolean)) return '';
    const body = kept.filter(Boolean).join(', ');
    return body.charAt(0).toUpperCase() + body.slice(1) + (end.trim() || '.') + ' ';
  }).join('').trim();
  return out;
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
