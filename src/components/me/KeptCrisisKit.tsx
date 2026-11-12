import { Link } from 'react-router-dom';
import { kitCardCount } from '../../lib/crisisKit';

/**
 * The kept crisis kit in Me (DT-03, docs/design/crisis-kit.md): how many cards it holds, and the two ways in, open it
 * or change it (`?frame=build`, which replaces it on *Keep it*). The cards themselves show one at a time in the kit.
 */
export function KeptCrisisKit({ value }: { value: Record<string, unknown> }) {
  const n = kitCardCount(value);
  return (
    <div className="text-sm text-[var(--color-text-secondary)] space-y-1" data-kept-crisis-kit="">
      <p>{n === 1 ? 'One card.' : `${n} cards.`}</p>
      <p className="flex flex-wrap gap-4">
        <Link to="/tool/crisis-kit" className="min-h-11 inline-flex items-center underline underline-offset-2">Open it</Link>
        <Link to="/tool/crisis-kit?frame=build" className="min-h-11 inline-flex items-center underline underline-offset-2">Change it</Link>
      </p>
    </div>
  );
}
