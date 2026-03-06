import { Link } from 'react-router-dom';
import { activationPatterns } from '../../data/activationPatterns';
import { tools as toolsData } from '../../data/tools';
import type { FormulationInsight } from '../../services/neo4j';

interface Props {
  formulation: FormulationInsight | null;
  totalCheckIns: number;
  delay?: number;
}

export function FormulationCard({ formulation, totalCheckIns, delay = 0 }: Props) {
  const cardClass =
    'rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-7 shadow-sm';

  if (!formulation) {
    const needsMoreData = totalCheckIns < 1;
    return (
      <div className={cardClass} style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-elevated)] flex items-center justify-center text-lg">
            🧠
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Your pattern
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {needsMoreData
            ? "Once you check in, patterns in your nervous system will start to show up here — what it tends to do, and why certain tools help."
            : "Your recent check-ins don't show a dominant pattern right now. That's not a bad thing — it can mean your nervous system is responding to different situations in different ways."}
        </p>
      </div>
    );
  }

  const patternMeta = activationPatterns[formulation.primaryPatternId];
  const emoji = patternMeta?.emoji || '🧠';

  return (
    <div
      className={cardClass}
      style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-muted)] flex items-center justify-center text-lg">
          {emoji}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {formulation.episodeCount >= 2
            ? `${formulation.episodeCount} episodes recently`
            : 'Most recent pattern'}
        </span>
      </div>

      {/* Headline */}
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
        {formulation.headline}
      </h2>

      {/* Body */}
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
        {formulation.body}
      </p>

      {/* Mechanism box */}
      <div className="rounded-xl bg-[var(--color-bg-elevated)] p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5">
          Why certain tools help
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {formulation.mechanism}
        </p>
      </div>

      {/* Effective tools pills */}
      {formulation.effectiveTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
            What's been working for you
          </p>
          <div className="flex flex-wrap gap-2">
            {formulation.effectiveTools.map((toolId) => {
              const tool = toolsData.find((t) => t.id === toolId);
              if (!tool) return null;
              return (
                <Link
                  key={toolId}
                  to={`/tool/${toolId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:shadow-[0_2px_8px_var(--color-accent-muted)] transition-all duration-200"
                >
                  <span>{tool.emoji}</span>
                  <span>{tool.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
