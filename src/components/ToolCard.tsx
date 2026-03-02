import { Link } from 'react-router-dom';
import type { Tool } from '../data/tools';

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link
      to={`/tool/${tool.id}`}
      className="
        block p-4 rounded-xl border border-[var(--color-border-subtle)]
        bg-[var(--color-bg-card)]
        lift-card
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)]
      "
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" role="img" aria-hidden="true">
          {tool.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            {tool.name}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {tool.tagline}
          </p>
        </div>
      </div>
    </Link>
  );
}
