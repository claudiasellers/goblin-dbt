import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-50)] dark:bg-[var(--color-sage-900)]">
      {/* Header */}
      <header className="border-b border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)] bg-white/50 dark:bg-[var(--color-sage-800)]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-[var(--color-sage-700)] dark:text-[var(--color-warm-100)] hover:text-[var(--color-sage-600)] dark:hover:text-white transition-colors"
          >
            <span className="text-2xl">🌿</span>
            <span className="font-semibold text-lg">DBT Tools</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)]">
          <p>Simple tools for when things feel too big.</p>
          <p className="mt-1 text-xs">
            Based on Dialectical Behavior Therapy (DBT) skills.
          </p>
        </div>
      </footer>
    </div>
  );
}
