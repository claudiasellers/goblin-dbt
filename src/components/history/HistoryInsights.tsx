import { useState } from 'react';
import type { CheckInRecord } from '../../services/neo4j';
import { TimeFilter } from './TimeFilter';
import { useFilteredCheckIns, type TimeRange } from './useFilteredCheckIns';
import { MoodTimeline } from './MoodTimeline';
import { QuadrantDistribution } from './QuadrantDistribution';
import { TopEmotions } from './TopEmotions';
import { BodyRegionFrequency } from './BodyRegionFrequency';
import { CalendarView } from './CalendarView';

interface HistoryInsightsProps {
  checkIns: CheckInRecord[];
}

export function HistoryInsights({ checkIns }: HistoryInsightsProps) {
  const [range, setRange] = useState<TimeRange>('30d');
  const filtered = useFilteredCheckIns(checkIns, range);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Patterns</h2>
        <TimeFilter value={range} onChange={setRange} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No check-ins in this time range.
        </p>
      ) : (
        <div className="space-y-4">
          <CalendarView checkIns={filtered} range={range} />
          <MoodTimeline checkIns={filtered} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuadrantDistribution checkIns={filtered} />
            <TopEmotions checkIns={filtered} />
          </div>
          <BodyRegionFrequency checkIns={filtered} />
        </div>
      )}
    </section>
  );
}
