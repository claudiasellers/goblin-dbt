import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border-subtle)] bg-[var(--color-glass-panel)] backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
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
      <footer className="border-t border-[var(--color-border-subtle)] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
          <p>Simple tools for when things feel too big.</p>
          <p className="mt-1 text-xs">
            Based on Dialectical Behavior Therapy (DBT) skills.
          </p>
        </div>
      </footer>
    </div>
  );
}
