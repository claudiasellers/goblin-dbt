import { useToday } from '../../hooks/useToday';
import { useTodayCount } from '../../hooks/useTodayCount';
import { TodayStack } from './TodayStack';

/**
 * Today in the desktop side panel (lg+), above Recent patterns. Off while a check-in is in progress
 * (`useHideToday`), so follow-ups never sit beside a result or the crisis banner.
 */
export function TodayPanel() {
  const today = useToday();
  const count = useTodayCount();
  if (today.hidden || count === 0) return null;
  return (
    <section aria-labelledby="today-panel-heading">
      <h2 id="today-panel-heading" className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        Today
      </h2>
      <TodayStack compact />
    </section>
  );
}
