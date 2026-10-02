import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Check-in', icon: CheckInIcon },
  { path: '/tools', label: 'Tools', icon: ToolsIcon },
  { path: '/history', label: 'Reflect', icon: HistoryIcon },
];

// 13rem plus the left safe-area inset: installed to the Home Screen with viewport-fit=cover, a
// landscape iPhone puts the notch on the left, so the sidebar grows by the inset and pads it out.
// The inset is 0 everywhere else, so these are plain 13rem in a browser tab.
export const SIDEBAR_WIDTH_CLASS = 'md:w-[calc(13rem_+_env(safe-area-inset-left))] md:pl-[env(safe-area-inset-left)]';
export const CONTENT_OFFSET_CLASS = 'md:ml-[calc(13rem_+_env(safe-area-inset-left))] md:pr-[env(safe-area-inset-right)]';

const desktopLinkClass = ({ isActive }: { isActive: boolean }) => `
  relative flex items-center min-h-11 mx-2 px-3 rounded-lg transition-colors duration-150
  ${isActive
    ? 'bg-[var(--color-sidebar-active)] text-[var(--color-accent)] font-semibold'
    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
  }
`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) => `
  flex-1 flex flex-col items-center justify-center min-h-14 py-2 transition-colors
  ${isActive
    ? 'text-[var(--color-accent)] font-semibold'
    : 'text-[var(--color-text-secondary)]'
  }
`;

/**
 * App navigation.
 *
 * Desktop (md+): a fixed, always-labeled sidebar. It never expands on hover,
 * and DashboardLayout reserves matching space (CONTENT_OFFSET_CLASS) so it
 * never covers content.
 *
 * Mobile (<md): a labeled bottom tab bar. DashboardLayout reserves bottom
 * padding so content is never hidden behind it. The bar pads itself by the
 * bottom safe-area inset so it clears the home indicator when installed.
 */
export function Sidebar() {
  const { user } = useAuth();

  return (
    <>
      {/* Desktop sidebar — fixed on the left, labels always visible. Top / bottom safe-area padding keeps the
          logo out from under an installed iPad's status bar and "Me" clear of a landscape iPhone's home indicator. */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 bottom-0 ${SIDEBAR_WIDTH_CLASS} md:pt-[env(safe-area-inset-top)] md:pb-[env(safe-area-inset-bottom)] h-screen bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] flex-col z-40`}
      >
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 h-16 px-4 border-b border-[var(--color-sidebar-border)]">
          <span className="text-2xl flex-shrink-0" aria-hidden="true">🌿</span>
          <span className="ml-3 font-semibold text-[var(--color-text-primary)]">
            Goblin
          </span>
        </div>

        {/* Navigation — scrolls independently */}
        <nav aria-label="Main" className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={desktopLinkClass}
            >
              {({ isActive }) => (
                <>
                  {/* Non-color active indicator */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${isActive ? 'bg-[var(--color-accent)]' : 'bg-transparent'}`}
                  />
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="ml-3 text-sm">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section: Me (D-10: nav "Profile" -> "Me"; settings on the same page) */}
        <div className="flex-shrink-0 py-4 border-t border-[var(--color-sidebar-border)] flex flex-col gap-1">
          <NavLink to="/profile" className={desktopLinkClass}>
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${isActive ? 'bg-[var(--color-accent)]' : 'bg-transparent'}`}
                />
                {user ? (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent-fill)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <span className="text-xs font-bold text-[var(--color-on-accent)]">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <ProfileIcon className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="ml-3 text-sm">Me</span>
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Mobile bottom nav — always labeled */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-sidebar-bg)] border-t border-[var(--color-sidebar-border)] z-40 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={mobileLinkClass}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] font-medium mt-1">{item.label}</span>
            </NavLink>
          ))}
          <NavLink to="/profile" className={mobileLinkClass}>
            <ProfileIcon className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Me</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}

// ============================================
// Inline SVG icons (no external dependencies)
// ============================================

function CheckInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

function ToolsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0" />
      <path d="M12 7v5l3 3" />
      <path d="M3 12H1" />
      <path d="M12 21v2" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 10-16 0" />
    </svg>
  );
}
