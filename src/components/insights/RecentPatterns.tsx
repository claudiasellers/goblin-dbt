import { activationPatterns } from '../../data/activationPatterns';
import type { PatternFrequency } from '../../services/neo4j';

interface Props {
  patterns: PatternFrequency[];
  totalCheckIns: number;
}

const patternQuadrantColor: Record<string, string> = {
  acute_alarm: 'var(--color-quadrant-high-unpleasant)',
  chronic_vigilance: 'var(--color-quadrant-high-unpleasant)',
  emotional_flooding: 'var(--color-quadrant-high-unpleasant)',
  reactive_aggression: 'var(--color-quadrant-high-unpleasant)',
  conservation_freeze: 'var(--color-quadrant-low-unpleasant)',
  dissociation_overmodulation: 'var(--color-quadrant-low-unpleasant)',
  rumination_loop: 'var(--color-quadrant-low-unpleasant)',
  reward_drive_low: 'var(--color-quadrant-low-unpleasant)',
  grief_yearning: 'var(--color-quadrant-low-unpleasant)',
  social_threat_shame: 'var(--color-quadrant-high-unpleasant)',
};

export function RecentPatterns({ patterns, totalCheckIns }: Props) {
  if (patterns.length === 0) return null;

  const maxCount = patterns[0]?.count || 1;

  return (
    <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
        Recent patterns
      </p>
      <div className="space-y-2.5">
        {patterns.slice(0, 5).map((pf) => {
          const meta = activationPatterns[pf.patternId];
          const label = meta?.dashboardSummary || pf.patternId.replace(/_/g, ' ');
          const emoji = meta?.emoji || '🧠';
          const color = patternQuadrantColor[pf.patternId] || 'var(--color-accent)';
          const pct = Math.round((pf.count / Math.max(totalCheckIns, 1)) * 100);
          const barWidth = Math.round((pf.count / maxCount) * 100);

          return (
            <div key={pf.patternId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {emoji} {label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {pf.count} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
