import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInsightsData } from '../../services/neo4j';
import type { PatternFrequency } from '../../services/neo4j';
import { TodayPanel } from '../today/TodayPanel';
import { RecentPatterns } from './RecentPatterns';
import { CHECK_IN_PATH, isCheckInRoute } from '../../lib/checkInRoute';

export function InsightsSidePanel() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  // On the check-in itself the link would go to the page already open: a dead button.
  const showCheckInLink = !isCheckInRoute(pathname);
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
      {/* Today (follow-ups, "did it help?", OA plans, pattern offers): moved here off the check-in
          screen, and it replaces the old ContinuityCard, which showed the same "did it help?" twice. */}
      <TodayPanel />
      <RecentPatterns patterns={patternFrequencies} totalCheckIns={totalCheckIns} />
      {showCheckInLink && (
        <Link
          to={CHECK_IN_PATH}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium lift-primary"
        >
          Check in now
        </Link>
      )}
    </div>
  );
}
