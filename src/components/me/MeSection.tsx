import { useCallback, useEffect, useState } from 'react';
import { getToolById } from '../../data/tools';
import type { ProfileAreaId } from '../../data/profileTypes';
import {
  confirmProfileItem, getMe, restoreProfileItem, setAsideProfileItem, upsertQuietHours,
  type GetMeResponse, type MeItem,
} from '../../services/profile';
import { profileCache } from '../../lib/profileCache';
import { fillToolName } from '../../lib/spine/todayCard';
import { StillTrue } from './StillTrue';
import { QuietHoursEditor } from './QuietHoursEditor';
import { PatternOfferCard } from './PatternOfferCard';

/** Areas shown in Phase A (plan §5.4). My people / My plans / My progress appear when their owners register kinds. */
const PHASE_A_AREAS: ProfileAreaId[] = ['about_me', 'my_body', 'my_words', 'my_patterns'];

/**
 * The Me surface (PR-P2): everything the app keeps about you, in one place, registry-driven from
 * getMe. Stale items float to the top ("A few things to check"). Found words are read-only (a log
 * aggregate, D-10). My words also lists lines in the user's own words (A5-2; set aside / restore)
 * and witness lines they kept. Settings stay below on the same page.
 */
export function MeSection() {
  const [me, setMe] = useState<GetMeResponse | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    getMe().then((m) => { if (live) { setMe(m); setError(false); } }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [reload]);

  const after = useCallback(async (p: Promise<number>) => {
    profileCache.bump(await p);
    setEditing(null);
    setReload((r) => r + 1);
  }, []);

  if (error) return <p className="text-sm text-[var(--color-text-secondary)]">Couldn't load Me right now.</p>;
  if (!me) return <div className="h-24 animate-pulse rounded-xl bg-[var(--color-bg-card)]" />;

  const ref = (i: MeItem) => ({ id: i.meta.id, label: i.label });
  const stale = me.areas.flatMap((a) => a.items).filter((i) => i.meta.prompt === 'ask');
  const areas = me.areas.filter((a) => PHASE_A_AREAS.includes(a.id)).filter((a) => {
    if (a.id === 'my_patterns') return a.items.length > 0 || me.offers.length > 0;
    return true;
  });

  const row = (i: MeItem) => {
    const toolName = i.toolId ? getToolById(i.toolId)?.name : null;
    const key = `${i.label}:${i.meta.id}`;
    return (
      <li key={key} className="py-3 border-t border-[var(--color-border-subtle)] first:border-t-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{i.title}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{fillToolName(i.summary, toolName)}</p>
            {i.meta.status === 'set_aside' && <p className="text-xs text-[var(--color-text-tertiary)]">Set aside</p>}
          </div>
          {i.meta.status === 'set_aside' && (
            <button type="button" onClick={() => { after(restoreProfileItem(ref(i))).catch(() => { /* stays set aside */ }); }}
              className="min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
              Restore
            </button>
          )}
          {i.label === 'OwnLine' && i.meta.status === 'active' && (
            <button type="button" onClick={() => { after(setAsideProfileItem(ref(i))).catch(() => { /* stays */ }); }}
              className="min-h-11 text-sm text-[var(--color-text-tertiary)] underline underline-offset-2">
              Set aside
            </button>
          )}
        </div>
        {editing === key && i.editor === 'quiet_hours' ? (
          <QuietHoursEditor value={i.value as { start: string; end: string } | undefined ?? null}
            onSave={(v) => after(upsertQuietHours(v))} onCancel={() => setEditing(null)} />
        ) : (
          <StillTrue meta={i.meta} question={i.stillTrueCopy}
            onYes={() => after(confirmProfileItem(ref(i)))}
            onNotAnyMore={() => after(setAsideProfileItem(ref(i)))}
            onChange={i.editor ? () => setEditing(key) : undefined} />
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {stale.length > 0 && (
        <section aria-label="A few things to check" className="p-4 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-bg-card)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">A few things to check</h3>
          <ul>{stale.map(row)}</ul>
        </section>
      )}
      {areas.map((a) => (
        <section key={a.id} aria-label={a.label} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{a.label}</h3>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">{a.blurb}</p>
          {a.id === 'about_me' && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {me.name.firstName ? <>The app calls you <strong>{me.name.firstName}</strong>. Change it under Basic info.</> : 'No name yet. Add one under Basic info.'}
            </p>
          )}
          {a.id === 'my_body' && !a.items.some((i) => i.meta.kind === 'quiet_hours') && (
            editing === 'new:quiet_hours'
              ? <QuietHoursEditor value={null} onSave={(v) => after(upsertQuietHours(v))} onCancel={() => setEditing(null)} />
              : (
                <button type="button" onClick={() => setEditing('new:quiet_hours')}
                  className="min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
                  Set quiet hours
                </button>
              )
          )}
          {a.id === 'my_words' && (
            me.readOnly.foundWords.length > 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Words you've found: {me.readOnly.foundWords.map((w) => w.name ?? w.emotionId).join(', ')}
              </p>
            ) : <p className="text-sm text-[var(--color-text-tertiary)]">Words you find with Find the feeling land here.</p>
          )}
          {a.id === 'my_words' && me.readOnly.savedLines.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-[var(--color-text-tertiary)]">Lines you kept</p>
              <ul className="mt-1 space-y-1">
                {me.readOnly.savedLines.map((l) => (
                  <li key={l.lineId} className="text-sm text-[var(--color-text-secondary)]">{l.text}</li>
                ))}
              </ul>
            </div>
          )}
          {a.id === 'my_patterns' && me.offers.map((o) => (
            <div key={o.id} className="mt-2">
              <PatternOfferCard id={o.id} statement={o.statement} offerCopy={o.offerCopy} toolId={o.toolId}
                onDone={() => setReload((r) => r + 1)} />
            </div>
          ))}
          {a.items.filter((i) => i.meta.prompt !== 'ask').length > 0 && <ul className="mt-1">{a.items.filter((i) => i.meta.prompt !== 'ask').map(row)}</ul>}
        </section>
      ))}
    </div>
  );
}
