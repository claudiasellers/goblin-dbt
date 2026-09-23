import type { ReactNode } from 'react';
import {
  OppositeActionFollowUpContext,
  useOppositeActionFollowUpsState,
} from '../hooks/useOppositeActionFollowUps';

/**
 * Mount once inside the router (DashboardLayout) so the follow-up fetch and the
 * in-tab reminder run on every page. Read with useOppositeActionFollowUpsContext().
 */
export function OppositeActionFollowUpProvider({ children }: { children: ReactNode }) {
  const value = useOppositeActionFollowUpsState();
  return <OppositeActionFollowUpContext.Provider value={value}>{children}</OppositeActionFollowUpContext.Provider>;
}
