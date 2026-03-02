import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';

export function TabLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] pb-20">
      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Tab bar */}
      <TabBar />
    </div>
  );
}
