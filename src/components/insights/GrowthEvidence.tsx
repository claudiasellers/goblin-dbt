import type { GrowthEvidenceInsight } from '../../services/neo4j';

interface Props {
  data: GrowthEvidenceInsight | null;
  totalCheckIns: number;
  delay?: number;
}

export function GrowthEvidence({ data, totalCheckIns, delay = 0 }: Props) {
  const cardClass =
    'rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6';

  return (
    <div
      className={cardClass}
      style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: data ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Growth evidence
        </p>
      </div>

      {data ? (
        <div className="space-y-3">
          {data.insights.map((insight) => (
            <p key={insight.key} className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {insight.text}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {totalCheckIns < 4
            ? `This compares your earlier check-ins to more recent ones to spot progress. A few more check-ins and patterns will start to emerge.`
            : "Your intensity and frequency have been steady lately — no big shifts in either direction. That's okay. Growth isn't always linear."}
        </p>
      )}
    </div>
  );
}
