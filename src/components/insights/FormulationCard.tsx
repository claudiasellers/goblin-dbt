import { Link } from 'react-router-dom';
import { activationPatterns } from '../../data/activationPatterns';
import { tools as toolsData } from '../../data/tools';
import { useOfficialNames } from '../../hooks/useOfficialNames';
import type { FormulationInsight } from '../../services/neo4j';
import { fromReflect } from '../../lib/reflect';

interface Props {
  formulation: FormulationInsight;
  delay?: number;
}

export function FormulationCard({ formulation, delay = 0 }: Props) {
  const { label } = useOfficialNames();
  const patternMeta = activationPatterns[formulation.primaryPatternId];
  const emoji = patternMeta?.emoji || '🧠';

  return (
    <div
      className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-7 shadow-sm"
      style={{
        animation: `fadeIn 0.5s var(--ease-default) ${delay}s both`,
      }}
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
              return (
                <Link
                  key={toolId}
                  to={`/tool/${toolId}`}
                  state={fromReflect()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:shadow-[0_2px_8px_var(--color-accent-muted)] transition-all duration-200"
                >
                  <span>{tool?.emoji || '🔧'}</span>
                  <span>{(tool && label(tool)) || toolId}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
