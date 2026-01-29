import { useParams, Link } from 'react-router-dom';
import { getCategoryById } from '../data/categories';
import { getToolsBySubcategory } from '../data/tools';
import { SubcategorySection } from '../components/SubcategorySection';

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = categoryId ? getCategoryById(categoryId) : undefined;

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
          Category not found.
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

  return (
    <div>
      {/* Back link */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-1 text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] hover:text-[var(--color-sage-800)] dark:hover:text-[var(--color-warm-100)] transition-colors mb-6"
      >
        <span>←</span>
        <span>All categories</span>
      </Link>

      {/* Category header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" role="img" aria-hidden="true">
            {category.emoji}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
            {category.name}
          </h1>
        </div>
        <p className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)]">
          {category.description}
        </p>
      </div>

      {/* Subcategories */}
      <div className="space-y-8">
        {category.subcategories.map(subcategory => (
          <SubcategorySection
            key={subcategory.id}
            subcategory={subcategory}
            tools={getToolsBySubcategory(category.id, subcategory.id)}
          />
        ))}
      </div>
    </div>
  );
}
