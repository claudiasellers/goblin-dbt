import { PartsSwitch } from '../parts/PartsSwitch';
import { useOfficialNames } from '../../hooks/useOfficialNames';

/**
 * The admin "Official DBT names" switch (src/lib/officialNames.ts): shown only to the admin allowlist
 * (or in a dev build). On, every tool list in the app shows each tool's official skill name and module.
 */
export function OfficialNamesToggle() {
  const { allowed, on, setOn } = useOfficialNames();
  if (!allowed) return null;
  return (
    <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-dashed border-[var(--color-border)] text-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Admin</span>
      <span id="official-names-label" className="text-[var(--color-text-secondary)]">Official DBT names</span>
      <span id="official-names-desc" className="sr-only">Shows every tool by its official DBT skill name and module.</span>
      <PartsSwitch enabled={on} onClick={() => setOn(!on)} labelledBy="official-names-label" describedBy="official-names-desc" />
    </div>
  );
}
