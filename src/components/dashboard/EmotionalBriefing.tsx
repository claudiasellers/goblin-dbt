import { useEffect, useState } from 'react';
import { DashboardCard } from '../DashboardCard';
import { useAuth } from '../../contexts/AuthContext';
import { getCheckInsByUser, type CheckInRecord } from '../../services/neo4j';

export function EmotionalBriefing() {
  const { user } = useAuth();
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getCheckInsByUser(user.uid, 7)
      .then(setRecentCheckIns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Analyze recent emotions
  const emotionCounts: Record<string, number> = {};
  const quadrantCounts: Record<string, number> = {};
  for (const ci of recentCheckIns) {
    const emotions = ci.emotion.split(',').map(e => e.trim());
    for (const e of emotions) {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    }
    quadrantCounts[ci.quadrant] = (quadrantCounts[ci.quadrant] || 0) + 1;
  }

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const dominantQuadrant = Object.entries(quadrantCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const quadrantLabels: Record<string, string> = {
    'high-unpleasant': 'high energy & distressed',
    'low-unpleasant': 'low energy & down',
    'high-pleasant': 'energized & positive',
    'low-pleasant': 'calm & content',
  };

  function getBriefingMessage(): string {
    if (recentCheckIns.length === 0) {
      return "Start your first check-in to get personalized insights about your emotional patterns.";
    }

    const quadLabel = dominantQuadrant
      ? quadrantLabels[dominantQuadrant[0]] || 'varied'
      : 'varied';

    if (recentCheckIns.length < 3) {
      return `You've checked in ${recentCheckIns.length} time${recentCheckIns.length > 1 ? 's' : ''} recently. Keep going to build a clearer picture of your patterns.`;
    }

    return `Over your last ${recentCheckIns.length} check-ins, you've been mostly feeling ${quadLabel}. Your system is showing a pattern worth paying attention to.`;
  }

  return (
    <DashboardCard
      title="Emotional Briefing"
      colSpan={2}
      icon={<BriefingIcon />}
    >
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4" />
          <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-1/2" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
            {getBriefingMessage()}
          </p>

          {topEmotions.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                Most frequent feelings
              </p>
              <div className="flex flex-wrap gap-2">
                {topEmotions.map(([emotion, count]) => (
                  <span
                    key={emotion}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                  >
                    {emotion}
                    <span className="text-[var(--color-text-muted)]">
                      {count}x
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {!user && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Sign in to see your emotional patterns over time.
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

function BriefingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
