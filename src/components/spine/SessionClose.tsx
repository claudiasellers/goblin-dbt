import { useEffect, useState } from 'react';
import { useToolSession, type ToolSessionCloseInput } from '../../hooks/useToolSession';
import { getSpineContent, type SpineContent } from '../../services/spine';
import { asksAtClose, closeQuestion } from '../../lib/spine/close';
import { dueAtFor } from '../../lib/spine/windows';
import { newId } from '../../lib/spine/ids';
import type { ThenVsNow } from '../../data/capacityTypes';
import type { ActedOnUrge, CloseKind } from '../../data/spineTypes';

/**
 * The one-tap "did it help?" at the end of a tool (PR-S3). Graph copy (SessionCloseFlow), one tap,
 * skip always there, no numbers. Answering or skipping closes the session as completed; a skipped
 * question comes back once in Today (PR-S5). Renders nothing for tools that ask their own questions.
 */
export function SessionClose({ kind, planType, onAnswered }: {
  kind?: CloseKind;
  /** For `plan` tools: the FollowUpType the answer schedules (its window turns the chip into a time). */
  planType?: string;
  onAnswered?: (input: ToolSessionCloseInput) => void;
}) {
  const session = useToolSession();
  const closeKind = kind ?? session.closeKind;
  const asksPlan = closeKind === 'plan' && !!planType;
  const [content, setContent] = useState<SpineContent | null>(null);
  const [done, setDone] = useState<'answered' | 'skipped' | null>(null);

  useEffect(() => {
    if (!asksAtClose(closeKind) && !asksPlan) return;
    let live = true;
    getSpineContent().then((c) => { if (live) setContent(c); }).catch(() => { /* the close is optional */ });
    return () => { live = false; };
  }, [closeKind, asksPlan]);

  if ((!asksAtClose(closeKind) && !asksPlan) || !content) return null;
  const planWindow = asksPlan ? content.followUpTypes.find((t) => t.id === planType && t.enabled)?.window : undefined;
  if (asksPlan && !planWindow) return null;
  const q = asksPlan ? content.closeFlow.kinds.plan ?? null : closeQuestion(content.closeFlow, session.toolId, closeKind);
  if (!q) return null;

  if (done) {
    return done === 'answered'
      ? <p role="status" className="mt-4 text-sm text-center text-[var(--color-text-tertiary)]">{content.closeFlow.saved}</p>
      : null;
  }

  const answer = (choiceId: string) => {
    let input: ToolSessionCloseInput;
    if (asksPlan) {
      const dueAt = dueAtFor(planWindow, new Date(), choiceId);
      input = { status: 'completed', ...(dueAt ? { schedule: [{ id: newId(), type: planType!, dueAt: dueAt.toISOString(), window: choiceId }] } : {}) };
    } else if (closeKind === 'urge') {
      input = { status: 'completed', actedOnUrge: choiceId as ActedOnUrge };
    } else {
      input = { status: 'completed', thenVsNow: choiceId as ThenVsNow };
    }
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
        {content.closeFlow.skip}
      </button>
    </section>
  );
}
