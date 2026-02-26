import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
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
    <div className="min-h-screen text-[var(--color-text-primary)]">
      <Sidebar />

      <div className="md:ml-20 pb-16 md:pb-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/65 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                {dateStr}
              </p>
              <h1 className="text-xl md:text-2xl font-bold mt-1 bg-gradient-to-r from-white via-[#d4d6ff] to-[#9ea4ff] bg-clip-text text-transparent">
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

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 backdrop-blur-sm p-3 md:p-4 shadow-[0_18px_60px_rgba(8,8,22,0.55)]">
            <Outlet />
          </div>
        </main>

        <footer className="hidden md:block border-t border-[var(--color-border-subtle)] mt-auto bg-[var(--color-bg-secondary)]/35">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">Simple tools for when things feel too big.</p>
            <p className="text-xs text-[var(--color-text-muted)]">Based on DBT skills</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
