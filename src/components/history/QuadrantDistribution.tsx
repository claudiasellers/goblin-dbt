import type { CheckInRecord } from '../../services/neo4j';

const quadrants = [
  { id: 'high-unpleasant', label: 'High Unpleasant', prefix: 'hu', gridPos: 'col-start-1 row-start-1' },
  { id: 'high-pleasant', label: 'High Pleasant', prefix: 'hp', gridPos: 'col-start-2 row-start-1' },
  { id: 'low-unpleasant', label: 'Low Unpleasant', prefix: 'lu', gridPos: 'col-start-1 row-start-2' },
  { id: 'low-pleasant', label: 'Low Pleasant', prefix: 'lp', gridPos: 'col-start-2 row-start-2' },
] as const;

interface QuadrantDistributionProps {
  checkIns: CheckInRecord[];
}

export function QuadrantDistribution({ checkIns }: QuadrantDistributionProps) {
  const total = checkIns.length;
  const counts: Record<string, number> = {};
  for (const ci of checkIns) {
    counts[ci.quadrant] = (counts[ci.quadrant] || 0) + 1;
  }

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3">Quadrant distribution</h3>
      <div className="grid grid-cols-2 gap-2">
        {quadrants.map((q) => {
          const count = counts[q.id] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={q.id}
              className={`${q.gridPos} relative overflow-hidden rounded-lg p-3`}
              style={{ backgroundColor: `var(--color-q-${q.prefix}-bg)` }}
            >
              {/* Water-level fill */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out rounded-b-lg"
                style={{
                  height: `${pct}%`,
                  backgroundColor: `var(--color-q-${q.prefix}-fill)`,
                  opacity: 0.1,
                }}
              />
              <div className="relative">
                <span
                  className="text-2xl font-bold block"
                  style={{ color: `var(--color-q-${q.prefix}-fill)` }}
                >
                  {pct}%
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{q.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
