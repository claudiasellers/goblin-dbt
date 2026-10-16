import { useEffect, useState } from 'react';
import { useToolSession, type ToolSessionCloseInput } from '../../hooks/useToolSession';
import { getSpineContent, type SpineContent } from '../../services/spine';
import { asksAtClose, closeQuestion } from '../../lib/spine/close';
import { dueAtFor } from '../../lib/spine/windows';
import { newId } from '../../lib/spine/ids';
import type { ThenVsNow } from '../../data/capacityTypes';
import type { ActedOnUrge, CloseKind } from '../../data/spineTypes';
import { PartTagSlot } from './PartTagSlot';

/**
 * The one-tap "did it help?" at the end of a tool (PR-S3). Graph copy (SessionCloseFlow), one tap,
 * skip always there, no numbers. Answering or skipping closes the session as completed; a skipped
 * question comes back once in Today (PR-S5). Renders nothing for tools that ask their own questions.
 */
export function SessionClose({ kind, planType, detail, onAnswered, onSkipped }: {
  kind?: CloseKind;
  /** For `plan` tools: the FollowUpType the answer schedules (its window turns the chip into a time). */
  planType?: string;
  /** The tool's own session record, linked with DETAIL on whichever close happens (answer or skip). */
  detail?: ToolSessionCloseInput['detail'];
  onAnswered?: (input: ToolSessionCloseInput) => void;
  onSkipped?: () => void;
}) {
  const session = useToolSession();
  const closeKind = kind ?? session.closeKind;
  const asksPlan = closeKind === 'plan' && !!planType;
  const [content, setContent] = useState<SpineContent | null>(null);
  const [done, setDone] = useState<'answered' | 'skipped' | null>(null);
  // "Was this a part you know?" (PartTagSlot): its gate needs the answer and the saved close.
  const [closeAnswer, setCloseAnswer] = useState<ThenVsNow | null>(null);
  const [saved, setSaved] = useState(false);

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
    if (done !== 'answered') return null;
    return (
      <>
        <p role="status" className="mt-4 text-sm text-center text-[var(--color-text-tertiary)]">{content.closeFlow.saved}</p>
        <PartTagSlot toolId={session.toolId} toolSessionId={session.id} thenVsNow={closeAnswer} saved={saved} />
      </>
    );
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
      setCloseAnswer(choiceId as ThenVsNow);
    }
    if (detail) input = { ...input, detail };
    setDone('answered');
    // The tag row waits for the server to have the close (tagPart refuses an open session).
    session.close(input).then((r) => { if (r) setSaved(true); }, () => { /* the close is optional */ });
    onAnswered?.(input);
  };
  const skip = () => {
    setDone('skipped');
    void session.close({ status: 'completed', ...(detail ? { detail } : {}) });
    onSkipped?.();
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
