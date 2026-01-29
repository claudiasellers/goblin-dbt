import { categories } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';

export function Tools() {
  return (
    <div>
      {/* Hero section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-sage-800)] mb-2">
          Tools
        </h1>
        <p className="text-[var(--color-sage-600)]">
          Simple tools for when things feel too big.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid gap-4">
        {categories.map(category => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
