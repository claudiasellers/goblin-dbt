import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardCard } from '../DashboardCard';
import { useAuth } from '../../contexts/AuthContext';
import { getCheckInsByUser, type CheckInRecord } from '../../services/neo4j';

export function RecentCheckins() {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getCheckInsByUser(user.uid, 5)
      .then(setCheckIns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const quadrantColors: Record<string, string> = {
    'high-unpleasant': 'var(--color-quadrant-high-unpleasant)',
    'high-pleasant': 'var(--color-quadrant-high-pleasant)',
    'low-unpleasant': 'var(--color-quadrant-low-unpleasant)',
    'low-pleasant': 'var(--color-quadrant-low-pleasant)',
  };

  function formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <DashboardCard
      title="Recent Check-ins"
      colSpan={2}
      icon={<HistoryIcon />}
      action={
        <Link
          to="/history"
          className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          View all
        </Link>
      }
    >
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="w-2 h-2 rounded-full bg-[var(--color-bg-elevated)]" />
              <div className="h-4 bg-[var(--color-bg-elevated)] rounded flex-1" />
              <div className="h-3 bg-[var(--color-bg-elevated)] rounded w-16" />
            </div>
          ))}
        </div>
      ) : checkIns.length > 0 ? (
        <div className="space-y-1">
          {checkIns.map((ci) => (
            <div
              key={ci.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors -mx-1"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: quadrantColors[ci.quadrant] || 'var(--color-accent)' }}
              />
              <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate">
                {ci.emotion}
              </span>
              {ci.note && (
                <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[120px]">
                  {ci.note}
                </span>
              )}
              <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                {formatTime(ci.timestamp)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            {user ? 'No check-ins yet. Start your journey!' : 'Sign in to see your check-in history.'}
          </p>
        </div>
      )}
    </DashboardCard>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
