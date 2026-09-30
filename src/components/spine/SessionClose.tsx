import { useEffect, useState } from 'react';
import { useToolSession, type ToolSessionCloseInput } from '../../hooks/useToolSession';
import { getSpineContent, type SpineContent } from '../../services/spine';
import { asksAtClose, closeQuestion } from '../../lib/spine/close';
import type { ThenVsNow } from '../../data/capacityTypes';
import type { ActedOnUrge, CloseKind } from '../../data/spineTypes';

/**
 * The one-tap "did it help?" at the end of a tool (PR-S3). Graph copy (SessionCloseFlow), one tap,
 * skip always there, no numbers. Answering or skipping closes the session as completed; a skipped
 * question comes back once in Today (PR-S5). Renders nothing for tools that ask their own questions.
 */
export function SessionClose({ kind, onAnswered }: { kind?: CloseKind; onAnswered?: (input: ToolSessionCloseInput) => void }) {
  const session = useToolSession();
  const closeKind = kind ?? session.closeKind;
  const [content, setContent] = useState<SpineContent['closeFlow'] | null>(null);
  const [done, setDone] = useState<'answered' | 'skipped' | null>(null);

  useEffect(() => {
    if (!asksAtClose(closeKind)) return;
    let live = true;
    getSpineContent().then((c) => { if (live) setContent(c.closeFlow); }).catch(() => { /* the close is optional */ });
    return () => { live = false; };
  }, [closeKind]);

  if (!asksAtClose(closeKind) || !content) return null;
  const q = closeQuestion(content, session.toolId, closeKind);
  if (!q) return null;

  if (done) {
    return done === 'answered'
      ? <p role="status" className="mt-4 text-sm text-center text-[var(--color-text-tertiary)]">{content.saved}</p>
      : null;
  }

  const answer = (choiceId: string) => {
    const input: ToolSessionCloseInput = closeKind === 'urge'
      ? { status: 'completed', actedOnUrge: choiceId as ActedOnUrge }
      : { status: 'completed', thenVsNow: choiceId as ThenVsNow };
    setDone('answered');
    void session.close(input);
    onAnswered?.(input);
  };
  const skip = () => {
    setDone('skipped');
    void session.close({ status: 'completed' });
  };

  return (
    <section aria-label={q.question} className="mt-6 p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">{q.question}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => answer(c.id)}
            className="min-h-11 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={skip}
        className="mt-2 min-h-11 w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
      >
        {content.skip}
      </button>
    </section>
  );
}
