import { useMemo } from 'react';
import type { CheckInRecord } from '../../services/neo4j';

export type TimeRange = '7d' | '30d' | 'all';

export function useFilteredCheckIns(checkIns: CheckInRecord[], range: TimeRange): CheckInRecord[] {
  return useMemo(() => {
    if (range === 'all') return checkIns;

    const now = Date.now();
    const days = range === '7d' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return checkIns.filter((ci) => ci.timestamp.getTime() >= cutoff);
  }, [checkIns, range]);
}
