import { Link } from 'react-router-dom';
import type { Category } from '../data/categories';

interface CategoryCardProps {
  category: Category;
}

const colorClasses: Record<string, { bg: string; border: string; hover: string }> = {
  rose: {
    bg: 'bg-[var(--color-cat-rose-bg)]',
    border: 'border-[var(--color-cat-rose-border)]',
    hover: 'hover:border-[var(--color-cat-rose-hover)]',
  },
  emerald: {
    bg: 'bg-[var(--color-cat-emerald-bg)]',
    border: 'border-[var(--color-cat-emerald-border)]',
    hover: 'hover:border-[var(--color-cat-emerald-hover)]',
  },
  sky: {
    bg: 'bg-[var(--color-cat-sky-bg)]',
    border: 'border-[var(--color-cat-sky-border)]',
    hover: 'hover:border-[var(--color-cat-sky-hover)]',
  },
  violet: {
    bg: 'bg-[var(--color-cat-violet-bg)]',
    border: 'border-[var(--color-cat-violet-border)]',
    hover: 'hover:border-[var(--color-cat-violet-hover)]',
  },
  amber: {
    bg: 'bg-[var(--color-cat-amber-bg)]',
    border: 'border-[var(--color-cat-amber-border)]',
    hover: 'hover:border-[var(--color-cat-amber-hover)]',
  },
};

export function CategoryCard({ category }: CategoryCardProps) {
  const colors = colorClasses[category.color] || colorClasses.emerald;

  return (
    <Link
      to={`/category/${category.id}`}
      className={`
        block p-6 rounded-2xl border-2
        ${colors.bg} ${colors.border} ${colors.hover}
        lift-card
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)]
      `}
    >
      <div className="text-center">
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">
          {category.emoji}
        </span>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          {category.name}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {category.description}
        </p>
      </div>
    </Link>
  );
}
