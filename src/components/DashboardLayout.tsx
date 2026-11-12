import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar, CONTENT_OFFSET_CLASS } from './Sidebar';
import { InsightsSidePanel } from './insights/InsightsSidePanel';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { OppositeActionFollowUpProvider } from '../contexts/OppositeActionFollowUpContext';
import { TodayProvider } from '../contexts/TodayContext';
import { TodayButton } from './today/TodayButton';

/**
 * App shell: sidebar + header + scrolling main column.
 *
 * Exercise pages (/tool/:id) and the Tools directory use a "focused" layout:
 * no greeting, no side panel, no competing "Check in now" CTA. The exercise's
 * own title and next action stay dominant.
 */
export function DashboardLayout() {
  const { user, phase } = useAuth();
  // Until Firebase says who this is, render the shell only: never the signed-out page or a Sign in link
  // to someone whose session is still being restored.
  const resolving = phase === 'resolving';
  const { profile } = useUserProfile();
  const { pathname } = useLocation();

  const isExercise = pathname.startsWith('/tool/');
  const isToolsDirectory = pathname === '/tools';
  const focusedLayout = isExercise || isToolsDirectory;
  // Side panel only has content for signed-in users, and never during exercises.
  const showSidePanel = Boolean(user) && !focusedLayout;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const displayName = profile.displayName || user?.email?.split('@')[0] || null;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar on the left (desktop) + bottom nav (mobile) */}
      <Sidebar />

      {/* Center column: header + main content — scrolls independently.
          Bottom padding: mobile clears the tab bar + home indicator; md+ still clears the home indicator,
          because a landscape iPhone (844–932px) is md-wide with a nonzero bottom inset when installed. */}
      <div className={`flex-1 min-w-0 flex flex-col h-screen ${CONTENT_OFFSET_CLASS} pb-[calc(4rem_+_env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)] overflow-hidden`}>
        {/* Today (PR-S5): one fetch shared by the header's Today button (below lg) and the side panel (lg+).
            App-level Opposite Action follow-ups: one fetch + in-tab reminder for every page. */}
        <TodayProvider>
        <OppositeActionFollowUpProvider>
        {/* pt: the top safe-area inset (0 in a browser tab; the status bar / notch when installed) */}
        <header className="flex-shrink-0 z-30 bg-[var(--color-glass-panel)] backdrop-blur-xl border-b border-[var(--color-glass-border)] pt-[env(safe-area-inset-top)]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
            {focusedLayout ? (
              /* Compact bar: exercise pages keep their own title as the principal heading */
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <span aria-hidden="true">🌿</span>
                <span>Goblin</span>
              </Link>
            ) : (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  {dateStr}
                </p>
                <p className="text-lg md:text-xl font-semibold text-[var(--color-text-primary)] mt-0.5">
                  {displayName ? `${greeting}, ${displayName}` : greeting}
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              {user && !focusedLayout && <TodayButton />}
              {phase === 'signed_out' && (
                <Link
                  to="/login"
                  className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex gap-6">
            <div className="flex-1 min-w-0">
              {resolving ? null : <Outlet />}
            </div>
            {showSidePanel && (
              <aside className="hidden lg:block w-[280px] flex-shrink-0" aria-label="Today and recent patterns">
                {/* Scrolls on its own when Today's cards make it taller than the window (sticky would clip it). */}
                <div className="sticky top-0 max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain -mx-1 px-1 pb-2">
                  <InsightsSidePanel />
                </div>
              </aside>
            )}
          </div>
        </main>

        {!isExercise && (
          <footer className="hidden md:block flex-shrink-0 border-t border-[var(--color-border-subtle)]">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Simple tools for when things feel too big.
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Based on DBT skills
              </p>
            </div>
          </footer>
        )}
        </OppositeActionFollowUpProvider>
        </TodayProvider>
      </div>
    </div>
  );
}
