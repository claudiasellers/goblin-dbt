import { useParams, Link, useLocation, Navigate } from 'react-router-dom';
import { getToolById, toolIdFromUrl, TOOL_URL_SLUGS } from '../data/tools';
import { ToolSessionProvider } from '../contexts/ToolSessionContext';

// Import tool components
import { CoolDown } from './tools/CoolDown';
import { FiveSenses } from './tools/FiveSenses';
import { Pause } from './tools/Pause';
import { UrgeSurfing } from './tools/UrgeSurfing';
import { OppositeAction } from './tools/OppositeAction';
import { DearMan } from './tools/DearMan';
import { ProblemSolve } from './tools/ProblemSolve';
import { InvalidationRecovery } from './tools/InvalidationRecovery';
import { FindTheFeeling } from './tools/FindTheFeeling';

// Map tool IDs to their interactive components
const toolComponents: Record<string, React.ComponentType> = {
  'cool-down': CoolDown,
  'five-senses': FiveSenses,
  'pause': Pause,
  'urge-surfing': UrgeSurfing,
  'opposite-action': OppositeAction,
  'dear-man': DearMan,
  'problem-solve': ProblemSolve,
  'recovering-from-invalidation': InvalidationRecovery,
  'find-the-feeling': FindTheFeeling,
};

export function ToolPage() {
  const { toolId: segment } = useParams<{ toolId: string }>();
  const location = useLocation();
  const toolId = segment ? toolIdFromUrl(segment) : undefined;
  const tool = toolId ? getToolById(toolId) : undefined;

  // Old address (/tool/cool-down): forward to the tool's own name, keeping the query and the
  // link state (Help me now / check-in / hand-off context for the session).
  if (segment && TOOL_URL_SLUGS[segment]) {
    return <Navigate to={{ pathname: `/tool/${TOOL_URL_SLUGS[segment]}`, search: location.search }} state={location.state} replace />;
  }

  if (!tool) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-secondary)]">
          Tool not found.
        </p>
        <Link
          to="/tools"
          className="mt-4 inline-block text-[var(--color-text-secondary)] underline hover:no-underline"
        >
          ← Tools
        </Link>
      </div>
    );
  }

  const ToolComponent = toolComponents[tool.id];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
      >
        <span aria-hidden="true">←</span>
        <span>All tools</span>
      </Link>

      {/* Tool header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" role="img" aria-hidden="true">
            {tool.emoji}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            {tool.name}
          </h1>
        </div>
        {!tool.bare && (
          <p className="text-lg text-[var(--color-text-secondary)]">
            {tool.tagline}
          </p>
        )}
      </div>

      {/* When to use */}
      {!tool.bare && (
        <div className="mb-8 p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            When to use this
          </p>
          <p className="text-[var(--color-text-primary)]">
            {tool.whenToUse}
          </p>
        </div>
      )}

      {/* Interactive tool component */}
      <div className="mb-8">
        {ToolComponent ? (
          // One ToolSession per visit (PR-S3). It replaces trackToolUsage: startToolSession writes the
          // compat ToolUsage at the same moment, linked to the check-in the tool was opened from.
          <ToolSessionProvider key={location.key} toolId={tool.id}>
            <ToolComponent />
          </ToolSessionProvider>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-[var(--color-border)] text-center">
            <p className="text-[var(--color-text-tertiary)] italic">
              Interactive tool coming soon...
            </p>
          </div>
        )}
      </div>

      {/* DBT context (collapsible) */}
      {tool.dbtBasis && (
        <details className="group">
          <summary className="cursor-pointer inline-flex items-center min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded">
            <span aria-hidden="true" className="mr-1 group-open:hidden">+</span>
            <span aria-hidden="true" className="mr-1 hidden group-open:inline">−</span>
            What this is based on
          </summary>
          <div className="mt-2 p-4 rounded-lg bg-[var(--color-bg-elevated)]/50 text-sm text-[var(--color-text-secondary)]">
            <p>
              This tool is based on <strong>{tool.dbtBasis}</strong>, a skill from Dialectical Behavior Therapy (DBT).
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
