import { Link } from 'react-router-dom';

/**
 * ToolPage's "Tool not found." (an unknown tool, or a gated one that may not open), also what Two pulls
 * shows for an address it can't resolve (a part no longer kept, a pair that doesn't ship): never a blank
 * page, never a hint of what was there.
 */
export function ToolNotFound() {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--color-text-secondary)]">
        Tool not found.
      </p>
      <Link
        to="/tools"
        className="mt-4 inline-flex items-center min-h-11 px-2 text-[var(--color-text-secondary)] underline hover:no-underline"
      >
        ← Tools
      </Link>
    </div>
  );
}
