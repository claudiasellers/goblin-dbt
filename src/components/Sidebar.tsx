import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Check-in', icon: CheckInIcon },
  { path: '/tools', label: 'Tools', icon: ToolsIcon },
  { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { path: '/history', label: 'History', icon: HistoryIcon },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <>
      {/* Desktop sidebar — fixed on the left */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-16 hover:w-48 h-screen bg-[var(--color-glass-panel)] backdrop-blur-xl border-r border-[var(--color-glass-border)] flex-col z-40 transition-all duration-200 group overflow-hidden">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 h-16 px-4 border-b border-[var(--color-sidebar-border)]">
          <span className="text-2xl flex-shrink-0">🌿</span>
          <span className="ml-3 font-semibold text-[var(--color-text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Goblin
          </span>
        </div>

        {/* Navigation — scrolls independently */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
                flex items-center h-11 mx-2 px-3 rounded-lg transition-all duration-150
                ${isActive
                  ? 'bg-[var(--color-sidebar-active)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section: Profile */}
        <div className="flex-shrink-0 py-4 border-t border-[var(--color-sidebar-border)] flex flex-col gap-1">
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              flex items-center h-11 mx-2 px-3 rounded-lg transition-all duration-150
              ${isActive
                ? 'bg-[var(--color-sidebar-active)] text-[var(--color-accent)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]'
              }
            `}
          >
            {user ? (
              <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[var(--color-bg-primary)]">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </span>
              </div>
            ) : (
              <ProfileIcon className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Profile
            </span>
          </NavLink>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-sidebar-bg)] border-t border-[var(--color-sidebar-border)] z-40">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
                flex-1 flex flex-col items-center py-2.5 transition-colors
                ${isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              flex-1 flex flex-col items-center py-2.5 transition-colors
              ${isActive
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
              }
            `}
          >
            <ProfileIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">Profile</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}

// ============================================
// Inline SVG icons (no external dependencies)
// ============================================

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

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
