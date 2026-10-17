import { useRef, useState } from 'react';
import type { PartsContent } from '../../data/partsContentTypes';
import type { TodayItem } from '../../services/spine';
import { answerPartCheckback } from '../../services/parts';
import { checkbackChoices, checkbackItemTitle, checkbackReady, louderAftercare, TWO_PULLS_CHECKBACK_TYPE, twoCheckbackReady } from '../../lib/partCheckback';
import { TooMuchLink } from '../capacity/TooMuchLink';
import { CrisisBanner } from '../safety/CrisisBanner';
import { useStepFocus } from './stepFocus';

const chip = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] aria-disabled:opacity-50 transition-colors';

/**
 * The next-day check-back on Today (docs/design/parts.md, Meet a part step 10): "How's {name} today?"
 * Settled · Same · Louder · Skip, one tap, one write. Louder (the part is now paused) stays on the card
 * with the aftercare line, "Something for my body" (the same P2 body tools as the too-much link) and
 * "Not now". Every word is signed-off parts content; without all of it the card is nothing. A tender
 * part gets the same card. A failed save keeps the card, answerable. A safety-line or danger part
 * (`item.part.safety`, functions/src/safety/partSafetyFlag.ts) gets CrisisBanner under the answers,
 * alongside them, never instead, and through the aftercare too. Two pulls' week check-back
 * (`two_pulls_checkback`) is the same card with both names; its Louder shows the aftercare and pauses nothing.
 */
export function PartCheckbackCard({ item, content, onDone }: {
  item: TodayItem;
  content: PartsContent | null;
  onDone: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [aftercare, setAftercare] = useState(false);
  // Louder keeps the card with its aftercare: focus moves to the aftercare line.
  const root = useRef<HTMLElement>(null);
  useStepFocus(root, aftercare);
  const two = item.type === TWO_PULLS_CHECKBACK_TYPE;
  if (!content || !(two ? twoCheckbackReady(content) : checkbackReady(content))) return null;

  // Two pulls' week check-back asks about both parts at once ("How are {A} and {B} today?").
  const title = checkbackItemTitle(content, item);
  const crisis = item.part?.safety === true || item.parts?.some((p) => p.safety === true) ? <div className="mt-3"><CrisisBanner compact /></div> : null;
  const answer = async (a: 'settled' | 'same' | 'louder' | 'skip') => {
    // aria-disabled while it saves, not disabled: a disabled button would drop keyboard focus.
    if (busy) return;
    setBusy(true);
    try {
      const res = await answerPartCheckback({ id: item.id, answer: a });
      if (res.aftercare) setAftercare(true);
      else onDone(item.id);
    } catch {
      // Only a saved answer removes the card.
    } finally {
      setBusy(false);
    }
  };

  if (aftercare) {
    const after = louderAftercare(content);
    return (
      <section ref={root} aria-label={after.line} data-testid="part-checkback-aftercare"
        className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <p className="font-medium text-[var(--color-text-primary)] focus:outline-none">{after.line}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {after.body && (
            <TooMuchLink host="meet-a-part" label={after.body.label} className={chip} onClose={() => onDone(item.id)} />
          )}
          {after.notNow && (
            <button type="button" className={chip} onClick={() => onDone(item.id)}>{after.notNow.label}</button>
          )}
        </div>
        {crisis}
      </section>
    );
  }

  return (
    <section ref={root} aria-label={title} data-testid="part-checkback"
      className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <p className="font-medium text-[var(--color-text-primary)]">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {checkbackChoices(content).map((c) => (
          <button key={c.id} type="button" aria-disabled={busy || undefined} className={chip} onClick={() => void answer(c.answer)}>
            {c.label}
          </button>
        ))}
      </div>
      {crisis}
    </section>
  );
}
