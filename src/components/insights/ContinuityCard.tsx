import { useState } from 'react';
import { tools as toolsData } from '../../data/tools';
import { recordToolOutcome } from '../../services/neo4j';
import type { ContinuityPrompt } from '../../services/neo4j';

interface Props {
  prompt: ContinuityPrompt;
}

function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

function formatEmotions(emotionStr: string): string {
  const emotions = emotionStr.split(',').map(e => e.trim()).filter(Boolean);
  if (emotions.length <= 2) return emotions.join(', ');
  return emotions.slice(0, 2).join(', ');
}

export function ContinuityCard({ prompt }: Props) {
  const [state, setState] = useState<'asking' | 'submitting' | 'done'>('asking');
  const tool = toolsData.find((t) => t.id === prompt.toolId);
  const toolName = tool?.name || prompt.toolId;

  const emotions = formatEmotions(prompt.checkInEmotion);
  const relativeTime = formatRelativeTime(prompt.checkInTimestamp);

  if (state === 'done') {
    return (
      <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-5 text-center"
        style={{ animation: 'fadeIn 0.3s var(--ease-default)' }}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">Noted — this helps your insights get smarter.</p>
      </div>
    );
  }

  const handleOutcome = async (outcome: 'helped' | 'somewhat' | 'not_really') => {
    setState('submitting');
    try {
      await recordToolOutcome(outcome);
    } catch {
      // Don't block on failure
    }
    setState('done');
  };

  return (
    <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-5">
      <p className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        {emotions}
      </p>
      <p className="text-sm text-[var(--color-accent)] mb-3">
        {relativeTime}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
        You used {toolName} after this check-in. Did it shift anything?
      </p>
      <div className="flex gap-2">
        {([
          { value: 'helped' as const, label: 'Yes' },
          { value: 'somewhat' as const, label: 'A little' },
          { value: 'not_really' as const, label: 'Not really' },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleOutcome(opt.value)}
            disabled={state === 'submitting'}
            className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
