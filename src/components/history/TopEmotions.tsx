import type { CheckInRecord } from '../../services/neo4j';

const quadrantPrefix: Record<string, string> = {
  'high-unpleasant': 'hu',
  'high-pleasant': 'hp',
  'low-unpleasant': 'lu',
  'low-pleasant': 'lp',
};

interface TopEmotionsProps {
  checkIns: CheckInRecord[];
}

export function TopEmotions({ checkIns }: TopEmotionsProps) {
  if (checkIns.length === 0) return null;

  // Count emotions and track their quadrant
  const emotionData: Record<string, { count: number; quadrant: string }> = {};
  for (const ci of checkIns) {
    if (!emotionData[ci.emotion]) {
      emotionData[ci.emotion] = { count: 0, quadrant: ci.quadrant };
    }
    emotionData[ci.emotion].count++;
  }

  const sorted = Object.entries(emotionData)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const maxCount = sorted[0][1].count;

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3">Top emotions</h3>
      <div className="space-y-2">
        {sorted.map(([emotion, { count, quadrant }]) => {
          const prefix = quadrantPrefix[quadrant] || 'hu';
          const widthPct = (count / maxCount) * 100;
          return (
            <div key={emotion} className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-secondary)] w-20 truncate shrink-0">
                {emotion}
              </span>
              <div className="flex-1 h-5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: `var(--color-q-${prefix}-fill)`,
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
