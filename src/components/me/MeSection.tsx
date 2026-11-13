import { Link } from 'react-router-dom';
import { Suspense, lazy, useCallback, useEffect, useState, type ComponentProps } from 'react';
import { getToolById } from '../../data/tools';
import type { ProfileAreaId } from '../../data/profileTypes';
import {
  confirmProfileItem, getMe, keepProfileItem, restoreProfileItem, setAsideProfileItem, upsertQuietHours,
  type GetMeResponse, type MeItem,
} from '../../services/profile';
import { profileCache } from '../../lib/profileCache';
import { fillToolName } from '../../lib/spine/todayCard';
import { StillTrue } from './StillTrue';
import { QuietHoursEditor } from './QuietHoursEditor';
import { KeptProsCons } from './KeptProsCons';
import { KeptHabitPlan } from './KeptHabitPlan';
import { KeptCrisisKit } from './KeptCrisisKit';
import { KeptPleaseRows, PleaseRowsEditor, PleaseRowsNew } from './PleaseRows';
import { PatternOfferCard } from './PatternOfferCard';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getPartsContent } from '../../services/partsContent';
import { dismissCandidateRequest, partsOfMeCopy } from '../../lib/partsOfMe';
import { partsMeOffCopy, partsOffCardShown } from '../../lib/partsSettings';
import type { PartsContent } from '../../data/partsContentTypes';
import { focusStepStart } from '../../lib/focusStart';
import type { CopeAheadContent } from '../../data/copeAheadTypes';
import { planCaFromKept, planLine } from '../../lib/copeAheadPlan';
import { getCopeAheadContent } from '../../services/copeAhead';
import { ForgetPerson } from './ForgetPerson';

// Parts' callables load on demand, when a candidate is dismissed.
const answerPartCandidate: typeof import('../../services/parts').answerPartCandidate = (req) => import('../../services/parts').then((m) => m.answerPartCandidate(req));
// Parts of me is fetched only with parts on and its copy signed off, so nobody else downloads it.
const LazyPartsOfMe = lazy(() => import('./PartsOfMe').then((m) => ({ default: m.PartsOfMe })));
function PartsOfMe(p: ComponentProps<typeof LazyPartsOfMe>) { return <Suspense fallback={null}><LazyPartsOfMe {...p} /></Suspense>; }
// With parts off, the card that turns them on: fetched only once its copy (and Parts of me's) has shipped.
const LazyPartsOffCard = lazy(() => import('../parts/PartsOffCard').then((m) => ({ default: m.PartsOffCard })));
function PartsOffCard(p: ComponentProps<typeof LazyPartsOffCard>) { return <Suspense fallback={null}><LazyPartsOffCard {...p} /></Suspense>; }

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
  const { profile, updateProfile } = useUserProfile();
  const partsOn = profile.partsEnabled === true;
  const [partsContent, setPartsContent] = useState<PartsContent | null>(null);
  // Parts turned on from the card this visit: it stays (switch on) until getMe brings Parts of me.
  const [turnedOnHere, setTurnedOnHere] = useState(false);

  useEffect(() => {
    let live = true;
    getMe().then((m) => { if (live) { setMe(m); setError(false); } }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
    // Parts switched (here or in Settings): getMe again, which brings or drops the my_parts area.
  }, [reload, partsOn]);

  // The parts copy: Parts of me's with parts on, the switch card's with parts off (Settings reads the same file on this page).
  useEffect(() => {
    let live = true;
    getPartsContent().then((c) => { if (live) setPartsContent(c); }).catch(() => { /* both stay hidden */ });
    return () => { live = false; };
  }, []);

  // A kept Cope Ahead plan (cope_ahead_plan) is ids: its words are composed here, as the keep card composed them.
  const [cope, setCope] = useState<CopeAheadContent | null>(null);
  const hasPlan = !!me?.areas.some((a) => a.items.some((i) => i.meta.kind === 'cope_ahead_plan'));
  useEffect(() => {
    if (!hasPlan || cope) return;
    let live = true;
    getCopeAheadContent().then((c) => { if (live) setCope(c); }).catch(() => { /* the title says enough */ });
    return () => { live = false; };
  }, [hasPlan, cope]);

  // Turned on from the card: the card (with focus on its switch) gives way to Parts of me, so focus goes
  // to the area's start, never <body> (the parts screens' stepFocus convention; only when focus was lost).
  const partsArrived = useCallback((el: HTMLElement | null) => { if (el) focusStepStart(el); }, []);

  const after = useCallback(async (p: Promise<number>) => {
    profileCache.bump(await p);
    setEditing(null);
    setReload((r) => r + 1);
  }, []);

  // Running low's rows (ER-07): one per person (the server's id is the kind), so a change or a re-keep after setting
  // it aside is the same item.
  const keepPleaseRows = (hidden: string[]) =>
    after(keepProfileItem({ kind: 'please_rows', value: { hidden } }).then((r) => r.version));

  if (error) return <p className="text-sm text-[var(--color-text-secondary)]">Couldn't load Me right now.</p>;
  if (!me) return <div className="h-24 animate-pulse rounded-xl bg-[var(--color-bg-card)]" />;

  const ref = (i: MeItem) => ({ id: i.meta.id, label: i.label });
  // Parts of me joins (after My patterns, getMe's order) only with parts on and its copy signed off.
  const partsCopy = partsOn ? partsOfMeCopy(partsContent) : null;
  // My plans (a rewritten nightmare, ER-15; a Cope Ahead plan, ER-05) and My people (IE-03) show once something is kept there; the order is getMe's.
  const shown: ProfileAreaId[] = [...PHASE_A_AREAS, 'my_people', 'my_plans', ...(partsCopy ? ['my_parts' as const] : [])];
  const areas = me.areas.filter((a) => shown.includes(a.id)).filter((a) => {
    if (a.id === 'my_patterns') return a.items.length > 0 || me.offers.length > 0;
    if (a.id === 'my_plans' || a.id === 'my_people') return a.items.length > 0;
    return true;
  });
  // Only from the areas shown: an item of an area not rendered yet never surfaces here. Parts are left
  // out too: checking back with a part is its own flow (with {name} filled), not this generic row.
  const stale = areas.flatMap((a) => a.items).filter((i) => i.meta.prompt === 'ask' && i.label !== 'Part');
  // Parts off: the switch card, where Parts of me would be (once on, getMe brings the area and it replaces the card).
  const offCopy = partsMeOffCopy(partsContent);
  const showOffCard = partsOffCardShown({ copyReady: offCopy !== null, partsOn, turnedOnHere, partsAreaShown: areas.some((a) => a.id === 'my_parts') });
  const togglePartsHere = (on: boolean) => {
    // Marked first, so the card never blinks out between the write landing and getMe bringing the area.
    if (on) setTurnedOnHere(true);
    updateProfile({ partsEnabled: on }).catch(() => { /* the context keeps the stored value (still off: the card stays) */ });
  };

  const row = (i: MeItem) => {
    const toolName = i.toolId ? getToolById(i.toolId)?.name : null;
    const key = `${i.label}:${i.meta.id}`;
    return (
      <li key={key} className="py-3 border-t border-[var(--color-border-subtle)] first:border-t-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{i.title}</p>
            {i.meta.kind === 'pros_cons' && i.value
              ? <KeptProsCons value={i.value} />
              : i.meta.kind === 'abstinence_plan' && i.value
              ? <KeptHabitPlan value={i.value} />
              : i.meta.kind === 'please_rows'
              ? <KeptPleaseRows value={i.value} />
              : i.meta.kind === 'crisis_kit' && i.value
              ? <KeptCrisisKit value={i.value as Record<string, unknown>} />
              : i.meta.kind === 'safety_plan' && i.meta.status === 'active'
              ? <Link to="/safety/plan?use=1" className="inline-flex min-h-11 items-center text-sm underline underline-offset-2 text-[var(--color-text-secondary)]">Open it</Link>
              : <p className="text-sm text-[var(--color-text-secondary)]">{i.meta.kind === 'cope_ahead_plan'
                ? (cope ? planLine(cope, planCaFromKept(i.value as Record<string, unknown> | undefined)).text : '')
                : fillToolName(i.summary, toolName)}</p>}
            {i.meta.status === 'set_aside' && <p className="text-xs text-[var(--color-text-tertiary)]">Set aside</p>}
          </div>
          {i.meta.status === 'set_aside' && (
            <button type="button" onClick={() => { after(restoreProfileItem(ref(i))).catch(() => { /* stays set aside */ }); }}
              className="min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
              Restore
            </button>
          )}
          {i.label === 'Person' && (
            <ForgetPerson itemRef={ref(i)} after={after} />
          )}
          {(i.label === 'OwnLine' || i.meta.kind === 'nightmare_script' || i.meta.kind === 'cope_ahead_plan' || i.meta.kind === 'pros_cons' || i.meta.kind === 'abstinence_plan' || i.meta.kind === 'thing_i_like' || i.meta.kind === 'crisis_kit' || i.meta.kind === 'safety_plan' || i.meta.kind === 'values' || i.meta.kind === 'i_can' || i.meta.kind === 'please_rows' || i.meta.kind === 'sleep_anchor' || i.label === 'Person') && i.meta.status === 'active' && (
            <button type="button" onClick={() => { after(setAsideProfileItem(ref(i))).catch(() => { /* stays */ }); }}
              className="min-h-11 text-sm text-[var(--color-text-tertiary)] underline underline-offset-2">
              Set aside
            </button>
          )}
        </div>
        {editing === key && i.editor === 'quiet_hours' ? (
          <QuietHoursEditor value={i.value as { start: string; end: string } | undefined ?? null}
            onSave={(v) => after(upsertQuietHours(v))} onCancel={() => setEditing(null)} />
        ) : editing === key && i.editor === 'please_rows' ? (
          <PleaseRowsEditor value={i.value} onSave={keepPleaseRows} onCancel={() => setEditing(null)} />
        ) : (
          <StillTrue meta={i.meta} question={i.stillTrueCopy}
            onYes={() => after(confirmProfileItem(ref(i)))}
            onNotAnyMore={() => after(setAsideProfileItem(ref(i)))}
            onChange={i.editor ? () => setEditing(key) : undefined} />
        )}
      </li>
    );
  };

  // A part write (the card's actions, Bring it back, the check-back): Me's usual refresh after.
  const partWrite = (p: Promise<{ version: number }>) => after(p.then((r) => r.version));
  // "Not any more" on a candidate: a log write (no profile version), so just reload.
  const dismissCandidate = async (id: string) => {
    await answerPartCandidate(dismissCandidateRequest(id));
    setReload((r) => r + 1);
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
        <section key={a.id} aria-label={a.label} ref={a.id === 'my_parts' && turnedOnHere ? partsArrived : undefined}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
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
          {/* Set aside, it comes back with Restore on its row: the link is for nothing kept yet. */}
          {a.id === 'my_body' && !a.items.some((i) => i.meta.kind === 'please_rows') && (
            <PleaseRowsNew onSave={keepPleaseRows} />
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
          {a.id === 'my_parts' && partsCopy && partsContent && (
            <PartsOfMe items={a.items} candidates={me.partCandidates ?? []} content={partsContent} copy={partsCopy}
              onWrite={partWrite} onDismiss={dismissCandidate} />
          )}
          {a.id !== 'my_parts' && a.items.filter((i) => i.meta.prompt !== 'ask').length > 0 && <ul className="mt-1">{a.items.filter((i) => i.meta.prompt !== 'ask').map(row)}</ul>}
        </section>
      ))}
      {showOffCard && offCopy && <PartsOffCard copy={offCopy} enabled={partsOn} onToggle={togglePartsHere} />}
    </div>
  );
}

