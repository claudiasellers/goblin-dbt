import { modules } from '../data/modules';
import { getToolsByModule } from '../data/tools';
import { ToolCard } from '../components/ToolCard';

export function Tools() {
  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Tools
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Skills you can use right now
        </p>
      </div>

      {/* Module sections */}
      <div className="space-y-8">
        {modules.map(mod => {
          const modTools = getToolsByModule(mod.id);

          return (
            <div key={mod.id}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-3 px-1">
                {mod.name}
              </h2>

              {modTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modTools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] text-center">
                  <span className="text-sm text-[var(--color-text-muted)]">Coming soon</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
