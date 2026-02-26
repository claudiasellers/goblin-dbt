import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: DashboardIcon },
  { path: '/checkin', label: 'Check-in', icon: CheckInIcon },
  { path: '/tools', label: 'Tools', icon: ToolsIcon },
  { path: '/history', label: 'History', icon: HistoryIcon },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <>
      <aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-16 hover:w-52 bg-[var(--color-sidebar-bg)] border border-[var(--color-sidebar-border)] rounded-3xl flex-col z-40 transition-all duration-300 group overflow-hidden backdrop-blur-xl shadow-[0_20px_45px_rgba(6,6,20,0.55)]">
        <div className="flex items-center h-16 px-4 border-b border-[var(--color-sidebar-border)]">
          <span className="text-2xl flex-shrink-0">🌿</span>
          <span className="ml-3 font-semibold text-[var(--color-text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Goblin
          </span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
                flex items-center h-11 px-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-[#8b5cf62f] to-[#22d3ee2a] text-[var(--color-text-primary)] border border-[var(--color-border-accent)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]/80 border border-transparent'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="py-4 border-t border-[var(--color-sidebar-border)] flex flex-col gap-1.5 px-2">
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              flex items-center h-11 px-3 rounded-xl transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-[#8b5cf62f] to-[#22d3ee2a] text-[var(--color-text-primary)] border border-[var(--color-border-accent)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]/80 border border-transparent'
              }
            `}
          >
            {user ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] flex items-center justify-center flex-shrink-0 text-white">
                <span className="text-xs font-bold">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
              </div>
            ) : (
              <ProfileIcon className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Profile
            </span>
          </NavLink>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-sidebar-bg)]/95 backdrop-blur-xl border-t border-[var(--color-sidebar-border)] z-40">
        <div className="flex px-1.5 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
                flex-1 flex flex-col items-center py-2 rounded-xl transition-colors
                ${isActive
                  ? 'text-[var(--color-text-primary)] bg-[var(--color-sidebar-active)]'
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
              flex-1 flex flex-col items-center py-2 rounded-xl transition-colors
              ${isActive
                ? 'text-[var(--color-text-primary)] bg-[var(--color-sidebar-active)]'
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
