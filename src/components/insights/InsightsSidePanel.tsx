import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInsightsData } from '../../services/neo4j';
import type { ContinuityPrompt, PatternFrequency } from '../../services/neo4j';
import { ContinuityCard } from './ContinuityCard';
import { RecentPatterns } from './RecentPatterns';

export function InsightsSidePanel() {
  const { user } = useAuth();
  const [continuityPrompt, setContinuityPrompt] = useState<ContinuityPrompt | null>(null);
  const [patternFrequencies, setPatternFrequencies] = useState<PatternFrequency[]>([]);
  const [totalCheckIns, setTotalCheckIns] = useState(0);

  useEffect(() => {
    if (!user) return;
    getInsightsData()
      .then((data) => {
        setContinuityPrompt(data.continuityPrompt);
        setPatternFrequencies(data.patternFrequencies);
        setTotalCheckIns(data.totalCheckIns);
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className="space-y-4">
      {continuityPrompt && <ContinuityCard prompt={continuityPrompt} />}
      <RecentPatterns patterns={patternFrequencies} totalCheckIns={totalCheckIns} />
      <Link
        to="/"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium lift-primary"
      >
        Check in now
      </Link>
    </div>
  );
}
