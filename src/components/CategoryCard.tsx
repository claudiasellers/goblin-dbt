import { Link } from 'react-router-dom';
import type { Category } from '../data/categories';

interface CategoryCardProps {
  category: Category;
}

const colorClasses: Record<string, { bg: string; border: string; hover: string }> = {
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    hover: 'hover:border-rose-400 dark:hover:border-rose-600',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    hover: 'hover:border-emerald-400 dark:hover:border-emerald-600',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800',
    hover: 'hover:border-sky-400 dark:hover:border-sky-600',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    hover: 'hover:border-violet-400 dark:hover:border-violet-600',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    hover: 'hover:border-amber-400 dark:hover:border-amber-600',
  },
};

export function CategoryCard({ category }: CategoryCardProps) {
  const colors = colorClasses[category.color] || colorClasses.emerald;

  return (
    <Link
      to={`/category/${category.id}`}
      className={`
        block p-6 rounded-2xl border-2 transition-all duration-200
        ${colors.bg} ${colors.border} ${colors.hover}
        hover:shadow-lg hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-sage-400)]
      `}
    >
      <div className="text-center">
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">
          {category.emoji}
        </span>
        <h2 className="text-lg font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-2">
          {category.name}
        </h2>
        <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)]">
          {category.description}
        </p>
      </div>
    </Link>
  );
}
