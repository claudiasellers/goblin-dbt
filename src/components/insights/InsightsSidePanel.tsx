import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInsightsData } from '../../services/neo4j';
import type { PatternFrequency } from '../../services/neo4j';
import { useToday, useToolOutcomeItem } from '../../hooks/useToday';
import { ContinuityCard } from './ContinuityCard';
import { RecentPatterns } from './RecentPatterns';

export function InsightsSidePanel() {
  const { user } = useAuth();
  // "Did it help?" comes from Today (PR-S5): the same item and callable as the phone's stack.
  const outcomeItem = useToolOutcomeItem();
  const today = useToday();
  const [patternFrequencies, setPatternFrequencies] = useState<PatternFrequency[]>([]);
  const [totalCheckIns, setTotalCheckIns] = useState(0);

  useEffect(() => {
    if (!user) return;
    getInsightsData()
      .then((data) => {
        setPatternFrequencies(data.patternFrequencies);
        setTotalCheckIns(data.totalCheckIns);
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className="space-y-4">
      {outcomeItem && <ContinuityCard key={outcomeItem.id} item={outcomeItem} onAnswered={() => { window.setTimeout(today.refresh, 1500); }} />}
      <RecentPatterns patterns={patternFrequencies} totalCheckIns={totalCheckIns} />
      <Link
        to="/"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--color-accent-fill)] text-white text-sm font-medium lift-primary"
      >
        Check in now
      </Link>
    </div>
  );
}
