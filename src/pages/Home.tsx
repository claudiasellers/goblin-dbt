import { categories } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';

export function Home() {
  return (
    <div>
      {/* Hero section */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-4">
          DBT Tools
        </h1>
        <p className="text-lg text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] max-w-2xl mx-auto">
          A collection of small, simple tools for when things feel too big or complicated.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(category => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

      {/* Subtle help text */}
      <div className="mt-12 text-center">
        <p className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)]">
          Pick wherever feels right for you right now. There's no wrong place to start.
        </p>
      </div>
    </div>
  );
}
