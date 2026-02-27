import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { DashboardStatsPanel } from './dashboard/DashboardStatsPanel';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';

export function DashboardLayout() {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const displayName = profile.displayName || user?.email?.split('@')[0] || 'Friend';

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar on the left (desktop) + bottom nav (mobile) */}
      <Sidebar />

      {/* Center column: header + main content — scrolls independently */}
      <div className="flex-1 min-w-0 flex flex-col h-screen md:ml-16 pb-16 md:pb-0 overflow-hidden">
        <header className="flex-shrink-0 z-30 bg-[var(--color-glass-panel)] backdrop-blur-xl border-b border-[var(--color-glass-border)]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {dateStr}
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
                {greeting}, {displayName}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {!user && (
                <a
                  href="#/login"
                  className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                >
                  Sign in
                </a>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
            <Outlet />
          </div>
        </main>

        <footer className="hidden md:block flex-shrink-0 border-t border-[var(--color-border-subtle)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              Simple tools for when things feel too big.
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Based on DBT skills
            </p>
          </div>
        </footer>
      </div>

      {/* Right column: dashboard stats — hidden on mobile, scrolls independently */}
      <aside className="hidden md:flex flex-col flex-shrink-0 w-[280px] h-screen border-l border-[var(--color-glass-border)] bg-[var(--color-glass-panel)] backdrop-blur-xl overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <DashboardStatsPanel />
        </div>
      </aside>
    </div>
  );
}
