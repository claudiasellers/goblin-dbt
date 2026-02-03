import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen">
      {/* Header - glassmorphic with gold accent */}
      <header className="border-b border-[rgba(212,175,55,0.2)] bg-white/60 backdrop-blur-md sticky top-0 z-10 shadow-[0_4px_20px_rgba(155,89,182,0.05)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-[var(--color-text-primary)] hover:text-[var(--color-sage-600)] transition-colors group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">✨</span>
            <span className="font-semibold text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>DBT Tools</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer - soft and elegant */}
      <footer className="border-t border-[rgba(212,175,55,0.15)] mt-auto bg-white/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          <p>Simple tools for when things feel too big.</p>
          <p className="mt-1 text-xs opacity-70">
            Based on Dialectical Behavior Therapy (DBT) skills.
          </p>
        </div>
      </footer>
    </div>
  );
}
