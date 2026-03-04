import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../DashboardCard';

export function QuickCheckin() {
  const navigate = useNavigate();

  return (
    <DashboardCard title="Check In" icon={<CheckInIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          How are you feeling right now?
        </p>

        {/* Quick quadrant buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-left hover:border-[var(--color-quadrant-high-unpleasant)]/40 transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-quadrant-high-unpleasant)]" />
            <span className="text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]">Stressed</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-left hover:border-[var(--color-quadrant-high-pleasant)]/40 transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-quadrant-high-pleasant)]" />
            <span className="text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]">Excited</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-left hover:border-[var(--color-quadrant-low-unpleasant)]/40 transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-quadrant-low-unpleasant)]" />
            <span className="text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]">Down</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-left hover:border-[var(--color-quadrant-low-pleasant)]/40 transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-quadrant-low-pleasant)]" />
            <span className="text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]">Calm</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] text-sm font-semibold lift-primary"
        >
          Full Check-in
        </button>
      </div>
    </DashboardCard>
  );
}

function CheckInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
