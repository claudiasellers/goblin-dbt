import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Check-in', icon: '💭' },
  { path: '/tools', label: 'Tools', icon: '🧰' },
  { path: '/history', label: 'History', icon: '📊' },
];

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-sage-200)] z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center py-3 transition-colors
              ${isActive 
                ? 'text-[var(--color-sage-700)]' 
                : 'text-[var(--color-sage-400)] hover:text-[var(--color-sage-600)]'
              }
            `}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
