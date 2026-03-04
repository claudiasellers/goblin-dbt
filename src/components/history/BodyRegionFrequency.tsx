import type { CheckInRecord } from '../../services/neo4j';

// Merge left/right body regions into a single label
const regionMerge: Record<string, string> = {
  'left-shoulder': 'Shoulders',
  'right-shoulder': 'Shoulders',
  'left-arm': 'Arms',
  'right-arm': 'Arms',
  'left-hand': 'Hands',
  'right-hand': 'Hands',
  'left-thigh': 'Thighs',
  'right-thigh': 'Thighs',
  'left-knee': 'Knees',
  'right-knee': 'Knees',
  'left-calf': 'Calves',
  'right-calf': 'Calves',
  'left-foot': 'Feet',
  'right-foot': 'Feet',
};

function mergeRegionName(regionId: string): string {
  if (regionMerge[regionId]) return regionMerge[regionId];
  // Capitalize single-word regions
  return regionId.charAt(0).toUpperCase() + regionId.slice(1);
}

interface BodyRegionFrequencyProps {
  checkIns: CheckInRecord[];
}

export function BodyRegionFrequency({ checkIns }: BodyRegionFrequencyProps) {
  const counts: Record<string, number> = {};
  for (const ci of checkIns) {
    for (const s of ci.bodySensations) {
      const name = mergeRegionName(s.region);
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
