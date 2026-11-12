import { Link } from 'react-router-dom';
import { modules } from '../data/modules';
import { getToolsByModule, intents } from '../data/tools';
import { ToolCard } from '../components/ToolCard';
import { useToolGate } from '../hooks/useToolGate';
import { toolsMeetLink } from '../lib/partsOfMe';
import { toolsIntro } from '../lib/toolsIntro';
import { useAuth } from '../contexts/AuthContext';

export function Tools() {
  const { phase } = useAuth();
  // Parts tools join the list only when Meet a part may open (parts on, its copy shipped): the gate
  // ToolPage opens it with. Never while that loads, so no card flickers in and out.
  const parts = useToolGate('meet-a-part') === 'open';
  // Only modules with at least one built tool appear in the actionable directory.
  const populatedModules = modules
    .map(mod => ({ mod, tools: getToolsByModule(mod.id, { parts }) }))
    .filter(({ tools }) => tools.length > 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Tools
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {toolsIntro(phase)}
        </p>
      </div>

      {/* Intent layer: plain-language needs → one tool each */}
      <section aria-labelledby="intent-heading" className="mb-10">
        <h2 id="intent-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-3 px-1">
          What do you need?
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {intents.map(intent => (
            <li key={intent.id}>
              <Link
                to={`/tool/${intent.toolId}`}
                className="flex items-center gap-3 min-h-14 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] font-medium lift-card"
              >
                <span className="text-xl" aria-hidden="true">{intent.emoji}</span>
                <span>{intent.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Full directory, grouped by DBT module as secondary information */}
      <section aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-4 px-1">
          Browse all tools
        </h2>
        <div className="space-y-8">
          {populatedModules.map(({ mod, tools }) => (
            <div key={mod.id}>
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 px-1">
                {mod.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} state={tool.id === 'meet-a-part' ? toolsMeetLink().state : undefined} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
