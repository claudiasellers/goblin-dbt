import type { GrowthEvidenceInsight } from '../../services/neo4j';

interface Props {
  data: GrowthEvidenceInsight;
  delay?: number;
}

export function GrowthEvidence({ data, delay = 0 }: Props) {
  return (
    <div
      className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6"
      style={{
        animation: `fadeIn 0.5s var(--ease-default) ${delay}s both`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--color-accent)' }}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Growth evidence
        </p>
      </div>
      <div className="space-y-3">
        {data.insights.map((insight) => (
          <p key={insight.key} className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {insight.text}
          </p>
        ))}
      </div>
    </div>
  );
}
