import { useState } from 'react';
import { tools as toolsData } from '../../data/tools';
import { answerToolOutcome, type TodayItem } from '../../services/spine';
import { outcomeAnswer } from '../../lib/spine/todayCard';

interface Props {
  /** Today's tool_outcome item (the same one the check-in screen's stack shows). */
  item: TodayItem;
  onAnswered?: () => void;
}

function formatRelativeTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) return '';
  const diffMins = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
}

/**
 * Desktop "did it help?" (PR-S5): repointed at Today's tool_outcome item and answerToolOutcome, so
 * it answers exactly the session it shows (F6), with the tool's own close question (R3 wording).
 */
export function ContinuityCard({ item, onAnswered }: Props) {
  const [state, setState] = useState<'asking' | 'submitting' | 'done'>('asking');
  const toolId = item.source?.toolId ?? '';
  const toolName = toolsData.find((t) => t.id === toolId)?.name || toolId;

  if (state === 'done') {
    return (
      <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-5 text-center"
        style={{ animation: 'fadeIn 0.3s var(--ease-default)' }}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">Noted. This helps your insights get smarter.</p>
      </div>
    );
  }

  const answer = async (choiceId: string) => {
    const a = outcomeAnswer(choiceId);
    const sessionId = item.source?.toolSessionId;
    if (!a || !sessionId) return;
    setState('submitting');
    try {
      await answerToolOutcome(sessionId, a);
    } catch {
      setState('asking'); // keep the card so it can be answered again (Codex, #20)
      return;
    }
    setState('done');
    onAnswered?.();
  };

  return (
    <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-5">
      <p className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{toolName}</p>
      <p className="text-sm text-[var(--color-accent)] mb-3">{formatRelativeTime(item.dueAt)}</p>
      {item.copy.body && <p className="text-sm text-[var(--color-text-secondary)] mb-3">{item.copy.body}</p>}
      <div className="grid grid-cols-2 gap-2">
        {item.choices.map((c) => (
          <button
            key={c.id}
            onClick={() => answer(c.id)}
            disabled={state === 'submitting'}
            className="py-2 rounded-lg text-xs font-medium border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
