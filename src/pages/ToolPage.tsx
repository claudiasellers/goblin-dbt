import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getToolById } from '../data/tools';
import { getCategoryById } from '../data/categories';
import { useAuth } from '../contexts/AuthContext';
import { trackToolUsage } from '../services/neo4j';

// Import tool components
import { CoolDown } from './tools/CoolDown';
import { FiveSenses } from './tools/FiveSenses';
import { Pause } from './tools/Pause';
import { UrgeSurfing } from './tools/UrgeSurfing';
import { OppositeAction } from './tools/OppositeAction';

// Map tool IDs to their interactive components
const toolComponents: Record<string, React.ComponentType> = {
  'cool-down': CoolDown,
  'five-senses': FiveSenses,
  'pause': Pause,
  'urge-surfing': UrgeSurfing,
  'opposite-action': OppositeAction,
};

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const { user } = useAuth();
  const tool = toolId ? getToolById(toolId) : undefined;
  const category = tool ? getCategoryById(tool.categoryId) : undefined;

  // Track tool usage when the page mounts (fire-and-forget)
  useEffect(() => {
    if (user && toolId) {
      trackToolUsage(toolId);
    }
  }, [user, toolId]);

  if (!tool || !category) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
          Tool not found.
        </p>
        <Link 
          to="/" 
          className="mt-4 inline-block text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] underline hover:no-underline"
        >
          ← Back home
        </Link>
      </div>
    );
  }

  const ToolComponent = toolComponents[tool.id];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link 
        to={`/category/${category.id}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] hover:text-[var(--color-sage-800)] dark:hover:text-[var(--color-warm-100)] transition-colors mb-6"
      >
        <span>←</span>
        <span>{category.name}</span>
      </Link>

      {/* Tool header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" role="img" aria-hidden="true">
            {tool.emoji}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
            {tool.name}
          </h1>
        </div>
        <p className="text-lg text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)]">
          {tool.tagline}
        </p>
      </div>

      {/* When to use */}
      <div className="mb-8 p-4 rounded-xl bg-[var(--color-sage-100)] dark:bg-[var(--color-sage-800)] border border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]">
        <p className="text-sm font-medium text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mb-1">
          When to use this
        </p>
        <p className="text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
          {tool.whenToUse}
        </p>
      </div>

      {/* Interactive tool component */}
      <div className="mb-8">
        {ToolComponent ? (
          <ToolComponent />
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-center">
            <p className="text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] italic">
              Interactive tool coming soon...
            </p>
          </div>
        )}
      </div>

      {/* DBT context (collapsible) */}
      {tool.dbtBasis && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] hover:text-[var(--color-sage-700)] dark:hover:text-[var(--color-sage-300)] transition-colors">
            <span className="group-open:hidden">+ What this is based on</span>
            <span className="hidden group-open:inline">− What this is based on</span>
          </summary>
          <div className="mt-2 p-4 rounded-lg bg-[var(--color-warm-100)] dark:bg-[var(--color-sage-800)]/50 text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
            <p>
              This tool is based on <strong>{tool.dbtBasis}</strong>, a skill from Dialectical Behavior Therapy (DBT).
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
