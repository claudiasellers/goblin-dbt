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
        block p-4 rounded-xl border border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]
        bg-white dark:bg-[var(--color-sage-800)]
        hover:border-[var(--color-sage-400)] dark:hover:border-[var(--color-sage-500)]
        hover:shadow-md hover:-translate-y-0.5
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-sage-400)]
      "
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" role="img" aria-hidden="true">
          {tool.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="font-medium text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
            {tool.name}
          </h3>
          <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] mt-1">
            {tool.tagline}
          </p>
        </div>
      </div>
    </Link>
  );
}
