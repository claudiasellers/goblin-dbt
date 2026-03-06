import { activationPatterns } from '../../data/activationPatterns';
import type { SomaticCorrelationData } from '../../services/neo4j';

const quadrantLabels: Record<string, string> = {
  'high-unpleasant': 'high-energy distress',
  'high-pleasant': 'high-energy positive states',
  'low-unpleasant': 'low-energy difficult states',
  'low-pleasant': 'low-energy calm states',
};

interface Props {
  data: SomaticCorrelationData;
  delay?: number;
}

export function SomaticCorrelation({ data, delay = 0 }: Props) {
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
          style={{ background: 'var(--color-quadrant-high-unpleasant)' }}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Body signals
        </p>
      </div>
      <div className="space-y-2.5">
        {data.correlations.map((corr) => {
          const patternMeta = activationPatterns[corr.patternId];
          const label = patternMeta?.dashboardSummary
            || quadrantLabels[corr.patternId]
            || corr.patternId.replace(/_/g, ' ').replace(/-/g, ' ');
          return (
            <div key={corr.region} className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-text-secondary)] flex-1">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {corr.region.replace(/-/g, ' ')}
                </span>
                {' '}tends to show up during {label}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {corr.count}x
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
