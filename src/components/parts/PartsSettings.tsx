import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPartsContent } from '../../services/partsContent';
import { deleteMyParts } from '../../services/parts';
import { partsSettingsCopy, type PartsSettingsPromptId } from '../../lib/partsSettings';
import { promptCopy } from '../../lib/partsContent';
import { settingsMeetLink } from '../../lib/partsOfMe';
import { useToolGate } from '../../hooks/useToolGate';

/**
 * Parts in Privacy & Data (docs/design/parts.md, "The switch", "Deleting"). Opt-in, off by default;
 * turning it off hides everything and deletes nothing, so "Delete your parts" is its own confirmed
 * action, there whether parts are on or off. Renders nothing until all its copy is signed off (and
 * nothing while it loads), so the section never jumps for anyone else.
 *
 * Right after turning parts on here (that switch's success, this visit only), one "Get to know a part"
 * link sits under the switch, once Meet a part may open (useToolGate) and the line is signed off.
 */
export function PartsSettings({ enabled, onToggle }: { enabled: boolean; onToggle: (on: boolean) => Promise<void> }) {
  const [copy, setCopy] = useState<Record<PartsSettingsPromptId, string> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [getToKnow, setGetToKnow] = useState<string | null>(null);
  const [justOn, setJustOn] = useState(false);
  const labelId = useId();
  const blurbId = useId();

  useEffect(() => {
    let live = true;
    getPartsContent().then((c) => {
      if (!live) return;
      setCopy(partsSettingsCopy(c));
      setGetToKnow(c ? promptCopy(c, 'me_get_to_know') : null);
    }).catch(() => { /* stays hidden */ });
    return () => { live = false; };
  }, []);

  if (!copy) return null;

  function toggle() {
    const on = !enabled;
    setJustOn(false);
    onToggle(on).then(() => setJustOn(on)).catch(() => { /* the context keeps the stored value */ });
  }

  async function handleDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await deleteMyParts();
      setDone(true);
      setConfirming(false);
    } catch {
      setFailed(true); // the confirm stays open to try again
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id={labelId} className="text-sm font-medium text-[var(--color-text-primary)]">{copy.settings_label}</p>
          <p id={blurbId} className="text-xs text-[var(--color-text-muted)] mt-0.5">{copy.settings_blurb}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={labelId}
          aria-describedby={blurbId}
          onClick={toggle}
          className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${
            enabled ? 'bg-[var(--color-accent-fill)]' : 'bg-[var(--color-border-accent)]'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-sm ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      {justOn && enabled && getToKnow && <GetToKnowLink label={getToKnow} />}
      <p className="text-xs text-[var(--color-text-secondary)]">{copy.settings_dissociation}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{copy.settings_off}</p>

      {done ? (
        <p role="status" className="text-xs text-[var(--color-text-secondary)]">{copy.settings_delete_done}</p>
      ) : !confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="px-4 py-2 rounded-lg border border-[var(--color-danger)]/30 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
        >
          {copy.settings_delete}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-danger)]">{copy.settings_delete_confirm}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)] text-[var(--color-on-danger)] text-xs font-medium hover:bg-[var(--color-danger)]/80 disabled:opacity-40 transition-colors"
            >
              {copy.settings_delete_yes}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setFailed(false); }}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {copy.settings_delete_no}
            </button>
          </div>
          {failed && <p role="status" className="text-xs text-[var(--color-danger)]">{copy.settings_delete_failed}</p>}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-[var(--color-text-tertiary)]">{copy.settings_about_1}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{copy.settings_about_2}</p>
      </div>
    </div>
  );
}

/** Mounted only right after turning parts on, so Meet a part's gate loads only then. */
function GetToKnowLink({ label }: { label: string }) {
  const meet = useToolGate('meet-a-part');
  if (meet !== 'open') return null;
  const link = settingsMeetLink();
  return (
    <Link to={link.pathname} state={link.state}
      className="inline-flex items-center min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
      {label}
    </Link>
  );
}
