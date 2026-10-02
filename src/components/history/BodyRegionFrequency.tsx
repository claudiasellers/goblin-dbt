import type { CheckInRecord } from '../../services/neo4j';
import { regionLabel } from '../../data/bodyFigure';

interface BodyRegionFrequencyProps {
  checkIns: CheckInRecord[];
}

export function BodyRegionFrequency({ checkIns }: BodyRegionFrequencyProps) {
  const counts: Record<string, number> = {};
  for (const ci of checkIns) {
    // A place counts once per check-in (both shoulders, or a left and a right mark, are one place).
    for (const name of new Set(ci.bodySensations.map((s) => regionLabel(s.region)))) {
      counts[name] = (counts[name] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) return null;

  const maxCount = sorted[0][1];

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3">Body regions</h3>
      <div className="space-y-2">
        {sorted.map(([region, count]) => {
          const widthPct = (count / maxCount) * 100;
          return (
            <div key={region} className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-secondary)] w-20 truncate shrink-0">
                {region}
              </span>
              <div className="flex-1 h-5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: 'var(--color-accent)',
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)] w-6 text-right shrink-0">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
