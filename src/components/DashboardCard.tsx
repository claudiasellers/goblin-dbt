import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  colSpan?: 1 | 2;
  rowSpan?: 1 | 2;
  noPadding?: boolean;
  children: ReactNode;
}

export function DashboardCard({
  title,
  icon,
  action,
  colSpan = 1,
  rowSpan = 1,
  noPadding = false,
  children,
}: DashboardCardProps) {
  const colClass = colSpan === 2 ? 'col-span-2' : 'col-span-1';
  const rowClass = rowSpan === 2 ? 'row-span-2' : 'row-span-1';

  return (
    <div
      className={`
        ${colClass} ${rowClass}
        bg-[var(--color-bg-card)] border border-[var(--color-border)]
        rounded-xl overflow-hidden
        transition-colors duration-150
        hover:border-[var(--color-border-accent)]
      `}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-[var(--color-accent)] text-sm">{icon}</span>
          )}
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Card content */}
      <div className={noPadding ? '' : 'px-5 pb-5'}>
        {children}
      </div>
    </div>
  );
}
