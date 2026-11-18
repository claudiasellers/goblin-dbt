import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { modules } from '../data/modules';
import { STARTER_INTENT_IDS, getToolById, getToolsByModule, intents, type Intent } from '../data/tools';
import { chunkSize } from '../lib/choiceChunks';
import { ToolCard } from '../components/ToolCard';
import { useToolGate } from '../hooks/useToolGate';
import { toolsMeetLink } from '../lib/partsOfMe';
import { toolsIntro } from '../lib/toolsIntro';
import { useAuth } from '../contexts/AuthContext';
import { OfficialNamesToggle } from '../components/admin/OfficialNamesToggle';
import { useOfficialNames } from '../hooks/useOfficialNames';

const moreControl = 'mt-2 w-full min-h-14 rounded-xl border-[1.5px] border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] bg-transparent cursor-pointer hover:text-[var(--color-text-primary)]';
const moreButton = 'min-h-11 px-2 text-sm font-semibold text-[var(--color-accent)] bg-transparent border-none cursor-pointer hover:underline';

/**
 * A list shown in chunks (the tools' seven-choice rule, src/lib/choiceChunks.ts): up to seven when they fit, else
 * six and a *More* button that adds the next six as their own group, so no group on screen holds more than seven.
 */
function Chunked({ items, more, className }: { items: { key: string; node: ReactNode }[]; more: string; className: string }) {
  const size = chunkSize(items.length, 0);
  const [chunks, setChunks] = useState(1);
  const groups: { key: string; node: ReactNode }[][] = [];
  for (let i = 0; i < Math.min(items.length, chunks * size); i += size) groups.push(items.slice(i, i + size));
  return (
    <div className="space-y-3">
      {groups.map((g, i) => <ul key={i} className={className}>{g.map((it) => <li key={it.key}>{it.node}</li>)}</ul>)}
      {chunks * size < items.length && (
        <div className="flex justify-center"><button type="button" className={moreButton} onClick={() => setChunks((n) => n + 1)}>{more}</button></div>
      )}
    </div>
  );
}

export function Tools() {
  const { phase } = useAuth();
  // Parts tools join the list only when Meet a part may open (parts on, its copy shipped): the gate
  // ToolPage opens it with. Never while that loads, so no card flickers in and out.
  const parts = useToolGate('meet-a-part') === 'open';
  const { label, names } = useOfficialNames();
  // Only modules with at least one built tool appear in the actionable directory.
  const populatedModules = modules
    .map(mod => ({ mod, tools: getToolsByModule(mod.id, { parts }) }))
    .filter(({ tools }) => tools.length > 0);
  // Six intents lead (D5); the rest wait behind *More*, grouped by the module of the tool each opens.
  const [allIntentsOpen, setAllIntentsOpen] = useState(false);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const starters = STARTER_INTENT_IDS.flatMap(id => intents.filter(i => i.id === id));
  const intentGroups = modules
    .map(mod => ({ mod, list: intents.filter(i => !starters.includes(i) && getToolById(i.toolId)?.module === mod.id) }))
    .filter(({ list }) => list.length > 0);
  const intentLink = (intent: Intent) => (
      <Link
        to={`/tool/${intent.toolId}${intent.query ? `?${intent.query}` : ''}`}
        className="flex items-center gap-3 min-h-14 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] font-medium lift-card"
      >
        <span className="text-xl" aria-hidden="true">{intent.emoji}</span>
        <span className="min-w-0">
          <span className="block">{intent.label}</span>
          {names && (() => {
            const t = getToolById(intent.toolId);
            return t && names[t.id] ? <span className="block text-xs font-normal text-[var(--color-text-tertiary)]">{label(t)}</span> : null;
          })()}
        </span>
      </Link>
  );

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
        <div className="mt-4 empty:hidden"><OfficialNamesToggle /></div>
      </div>

      {/* Intent layer: plain-language needs → one tool each */}
      <section aria-labelledby="intent-heading" className="mb-10">
        <h2 id="intent-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-3 px-1">
          What do you need?
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {starters.map(i => <li key={i.id}>{intentLink(i)}</li>)}
        </ul>
        {!allIntentsOpen ? (
          <button type="button" className={moreControl} aria-expanded="false" onClick={() => setAllIntentsOpen(true)} data-testid="tools-more-intents">
            Something else? See {intents.length - starters.length} more
          </button>
        ) : (
          <div className="mt-6 space-y-6">
            {intentGroups.map(({ mod, list }) => (
              <div key={mod.id}>
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 px-1">{mod.name}</h3>
                <Chunked items={list.map(i => ({ key: i.id, node: intentLink(i) }))} more={`More for ${mod.name}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full directory, grouped by DBT module as secondary information */}
      <section aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-4 px-1">
          Browse all tools
        </h2>
        {/* One row per module (what it's for, how many), opened in place: four choices, not every card at once. */}
        <div className="space-y-2.5">
          {populatedModules.map(({ mod, tools }) => {
            const cards = tools.flatMap(tool => [
              { key: tool.id, node: <ToolCard tool={tool} state={tool.id === 'meet-a-part' ? toolsMeetLink().state : undefined} /> },
              ...(tool.moreCards ?? []).map(m => ({ key: `${tool.id}:${m.key}`, node: <ToolCard tool={tool} mode={m} /> })),
            ]);
            const open = openModule === mod.id;
            return (
              <div key={mod.id}>
                <button type="button" aria-expanded={open} aria-controls={`module-${mod.id}`} data-testid={`tools-module-${mod.id}`}
                  onClick={() => setOpenModule(open ? null : mod.id)}
                  className="w-full flex items-center justify-between gap-3 min-h-16 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-left text-[var(--color-text-primary)] lift-card cursor-pointer">
                  <span className="min-w-0">
                    <span className="block font-semibold">{mod.name}</span>
                    <span className="block text-sm text-[var(--color-text-tertiary)]">{mod.blurb} · {cards.length}</span>
                  </span>
                  <span aria-hidden="true" className={`text-xl text-[var(--color-text-secondary)] transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                </button>
                {open && (
                  <div id={`module-${mod.id}`} className="mt-3 mb-5 space-y-3">
                    {/* MF-02: Mindfulness is practised, so its module opens on its home too. */}
                    {mod.id === 'mindfulness' && (
                      <div className="flex justify-end px-1">
                        <Link to="/practice" className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)] hover:underline" data-testid="tools-practice-link">
                          Practice
                        </Link>
                      </div>
                    )}
                    <Chunked
                      more={`More in ${mod.name}`}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      items={cards}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
