import { useState } from 'react';
import { tools as toolsData } from '../../data/tools';
import { recordToolOutcome } from '../../services/neo4j';
import type { ContinuityPrompt } from '../../services/neo4j';

interface Props {
  prompt: ContinuityPrompt;
}

export function ContinuityCard({ prompt }: Props) {
  const [state, setState] = useState<'asking' | 'submitting' | 'done'>('asking');
  const tool = toolsData.find((t) => t.id === prompt.toolId);
  const toolName = tool?.name || 'that tool';

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
      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
        You've been using {tool?.emoji} <span className="font-medium text-[var(--color-text-primary)]">{toolName}</span> lately — does it feel like a good fit?
      </p>
      <div className="flex gap-2">
        {([
          { value: 'helped' as const, label: 'Yeah, it lands' },
          { value: 'somewhat' as const, label: 'Sometimes' },
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
