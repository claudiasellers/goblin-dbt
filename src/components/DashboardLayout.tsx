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

  // Read from profile context so name updates instantly when saved
  const displayName = profile.displayName || user?.email?.split('@')[0] || 'Friend';

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Sidebar (desktop) + bottom nav (mobile) */}
      <Sidebar />

      {/* Main content area -- offset by sidebar on desktop, bottom padding on mobile */}
      <div className="md:ml-16 pb-16 md:pb-0 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {dateStr}
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
                {greeting}, {displayName}
              </h1>
            </div>

            {/* Right side actions */}
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

        {/* Page content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
          <Outlet />
        </main>

        {/* Footer -- hidden on mobile since bottom nav takes that space */}
        <footer className="hidden md:block border-t border-[var(--color-border-subtle)] mt-auto">
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
    </div>
  );
}
