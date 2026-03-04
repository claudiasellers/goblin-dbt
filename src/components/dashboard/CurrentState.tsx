import { useEffect, useState } from 'react';
import { DashboardCard } from '../DashboardCard';
import { useAuth } from '../../contexts/AuthContext';
import { getCheckInsByUser, type CheckInRecord } from '../../services/neo4j';

export function CurrentState() {
  const { user } = useAuth();
  const [lastCheckIn, setLastCheckIn] = useState<CheckInRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getCheckInsByUser(user.uid, 1)
      .then((checkIns) => setLastCheckIn(checkIns[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const quadrantColors: Record<string, string> = {
    'high-unpleasant': 'var(--color-quadrant-high-unpleasant)',
    'high-pleasant': 'var(--color-quadrant-high-pleasant)',
    'low-unpleasant': 'var(--color-quadrant-low-unpleasant)',
    'low-pleasant': 'var(--color-quadrant-low-pleasant)',
  };

  const quadrantLabels: Record<string, string> = {
    'high-unpleasant': 'High Energy / Distressed',
    'high-pleasant': 'High Energy / Pleasant',
    'low-unpleasant': 'Low Energy / Distressed',
    'low-pleasant': 'Low Energy / Pleasant',
  };

  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <DashboardCard title="Current State" icon={<StateIcon />}>
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-[var(--color-bg-elevated)] rounded w-1/2" />
          <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4" />
        </div>
      ) : lastCheckIn ? (
        <div className="space-y-4">
          {/* Quadrant indicator */}
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: quadrantColors[lastCheckIn.quadrant] || 'var(--color-accent)' }}
            />
            <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
              {quadrantLabels[lastCheckIn.quadrant] || lastCheckIn.quadrant}
            </span>
          </div>

          {/* Emotion display */}
          <div>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {lastCheckIn.emotion}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {getTimeAgo(lastCheckIn.timestamp)}
            </p>
          </div>

          {/* Intensity bar */}
          <div>
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
              <span>Intensity</span>
              <span>{Math.round(lastCheckIn.intensity.y * 100)}%</span>
            </div>
            <div className="h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${lastCheckIn.intensity.y * 100}%`,
                  backgroundColor: quadrantColors[lastCheckIn.quadrant] || 'var(--color-accent)',
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-[var(--color-text-muted)] text-sm">No check-ins yet</p>
          <a
            href="#/"
            className="inline-block mt-2 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            Start your first check-in
          </a>
        </div>
      )}
    </DashboardCard>
  );
}

function StateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
