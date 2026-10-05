import type { CheckInRecord } from '../../services/neo4j';
import { topWords } from '../../lib/reflect';

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

  // One bar per word: a check-in with two words counts once for each (emotion is the ", " join).
  const sorted = topWords(checkIns);
  if (sorted.length === 0) return null;
  const maxCount = sorted[0].count;

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3">Top emotions</h3>
      <div className="space-y-2">
        {sorted.map(({ word: emotion, count, quadrant }) => {
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
