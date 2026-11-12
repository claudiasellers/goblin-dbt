import { Link } from 'react-router-dom';
import type { Tool, ToolModeCard } from '../data/tools';
import { useOfficialNames } from '../hooks/useOfficialNames';

interface ToolCardProps {
  tool: Tool;
  /** Router state the tool reads on entry (Meet a part: where the visit started). */
  state?: unknown;
  /** One of the tool's other modes (`Tool.moreCards`): its own name, tagline and query; the official name stays the tool's. */
  mode?: ToolModeCard;
}

export function ToolCard({ tool, state, mode }: ToolCardProps) {
  const { label, names } = useOfficialNames();
  const official = Boolean(names?.[tool.id]);
  return (
    <Link
      to={`/tool/${tool.id}${mode ? `?${mode.query}` : ''}`}
      state={state}
      className="
        block p-4 rounded-xl border border-[var(--color-border-subtle)]
        bg-[var(--color-bg-card)]
        lift-card
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)]
      "
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" role="img" aria-hidden="true">
          {mode?.emoji ?? tool.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            {official || !mode ? label(tool) : mode.name}
          </h3>
          {official && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">In the app: {mode?.name ?? tool.name}</p>
          )}
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {mode?.tagline ?? tool.tagline}
          </p>
        </div>
      </div>
    </Link>
  );
}
