import type { Subcategory } from '../data/categories';
import type { Tool } from '../data/tools';
import { ToolCard } from './ToolCard';

interface SubcategorySectionProps {
  subcategory: Subcategory;
  tools: Tool[];
}

export function SubcategorySection({ subcategory, tools }: SubcategorySectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-secondary)]">
          {subcategory.name}
        </h3>
        <p className="text-sm text-[var(--color-text-tertiary)]">
          {subcategory.description}
        </p>
      </div>
      
      {tools.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] text-center">
          <p className="text-sm text-[var(--color-text-tertiary)] italic">
            Tools coming soon...
          </p>
        </div>
      )}
    </section>
  );
}
