import { Link } from 'react-router-dom';
import { DashboardCard } from '../DashboardCard';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { tools } from '../../data/tools';

// Default featured tools when no focus categories are set
const defaultFeaturedIds = ['cool-down', 'five-senses', 'pause', 'urge-surfing'];

export function RecommendedTools() {
  const { profile } = useUserProfile();

  // If the user has focus categories set, filter tools from those categories.
  // Otherwise fall back to the default curated list.
  let filteredTools;
  if (profile.focusCategories.length > 0) {
    filteredTools = tools.filter((t) =>
      profile.focusCategories.includes(t.categoryId)
    );
    // Limit to 4 tools max
    filteredTools = filteredTools.slice(0, 4);
    // If focus categories returned nothing (unlikely), fall back
    if (filteredTools.length === 0) {
      filteredTools = tools.filter((t) => defaultFeaturedIds.includes(t.id));
    }
  } else {
    filteredTools = tools.filter((t) => defaultFeaturedIds.includes(t.id));
  }

  return (
    <DashboardCard
      title="Recommended Tools"
      icon={<ToolIcon />}
      action={
        <Link
          to="/tools"
          className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          View all
        </Link>
      }
    >
      <div className="space-y-2">
        {filteredTools.map((tool) => (
          <Link
            key={tool.id}
            to={`/tool/${tool.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-accent)] transition-colors group"
          >
            <span className="text-lg flex-shrink-0">{tool.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                {tool.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {tool.whenToUse}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}

function ToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
