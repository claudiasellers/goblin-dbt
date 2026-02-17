import { useEffect, useState } from 'react';
import { DashboardCard } from '../DashboardCard';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getCheckInsByUser, getWeeklyToolUsageCount, type CheckInRecord } from '../../services/neo4j';

export function StatsBar() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [weeklyTools, setWeeklyTools] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      getCheckInsByUser(user.uid, 50).catch(() => [] as CheckInRecord[]),
      getWeeklyToolUsageCount().catch(() => 0),
    ])
      .then(([checkins, toolCount]) => {
        setCheckIns(checkins);
        setWeeklyTools(toolCount);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Calculate streak (consecutive days with at least one check-in)
  function calculateStreak(): number {
    if (checkIns.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateSet = new Set(
      checkIns.map((ci) => {
        const d = new Date(ci.timestamp);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    let streak = 0;
    const day = new Date(today);

    while (dateSet.has(day.getTime())) {
      streak++;
      day.setDate(day.getDate() - 1);
    }

    return streak;
  }

  // Count today's check-ins
  function todayCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkIns.filter((ci) => {
      const d = new Date(ci.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
  }

  const streak = calculateStreak();
  const todayCheckins = todayCount();
  const dailyGoal = profile.dailyCheckInGoal;
  const weeklyGoal = profile.weeklyToolGoal;

  return (
    <DashboardCard title="Your Stats" colSpan={1} icon={<StatsIcon />}>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 bg-[var(--color-bg-elevated)] rounded w-20 mb-2" />
              <div className="h-1.5 bg-[var(--color-bg-elevated)] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Daily check-in goal */}
          <GoalProgress
            label="Today's Check-ins"
            current={todayCheckins}
            goal={dailyGoal}
            color="var(--color-accent)"
          />

          {/* Weekly tool usage goal */}
          <GoalProgress
            label="Tools This Week"
            current={weeklyTools}
            goal={weeklyGoal}
            color="var(--color-tag-purple)"
          />

          {/* Streak */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">Day Streak</span>
            <span className={`text-lg font-bold ${streak > 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>
              {streak}
            </span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">Total Check-ins</span>
            <span className="text-lg font-bold text-[var(--color-text-primary)]">
              {checkIns.length}
            </span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

function GoalProgress({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  const pct = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
        <span className={`text-sm font-bold ${isComplete ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>
          {current} / {goal}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: isComplete ? 'var(--color-success)' : color }}
        />
      </div>
    </div>
  );
}

function StatsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}
