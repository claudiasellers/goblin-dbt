import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBand } from '../hooks/useBand';
import { useToday } from '../hooks/useToday';
import { useOfficialNames } from '../hooks/useOfficialNames';
import { useProfileContext } from '../hooks/useProfileContext';
import { getToolById, tools as allTools } from '../data/tools';
import { PRACTICE_BREATH, PRACTICE_COPY as C, PRACTICE_CUES, PRACTICE_TIMES, WHY_CHIPS } from '../data/practiceHome';
import type { PracticeHomeResponse } from '../data/practiceTypes';
import type { ProfileSlices } from '../data/profileTypes';
import { dailyPick, levelOf, library, shouldBookDaily, weekFraction } from '../lib/practiceHome';
import { bookDaily, completeDaily, getPracticeHome, recordCatch, savePracticePrefs, type PracticeCatch } from '../services/practice';
import { ProgressRing } from '../components/tools/regulation/ProgressRing';

/**
 * Practice (`/practice`, MF-02, MF-B3, docs/design/practice-home.md): the Mindfulness module's home.
 *   - First visit signed in: a three-screen setup (why, when, breath), skippable, kept as `practice_prefs`.
 *   - Then: today's practice (the MF sequence's least-practised skill, never yesterday's tool, *A different kind*
 *     swaps it), *Caught one?* (a judgment or one done without the app, each one tap, one rep), this week's ring
 *     (no number), each skill's level (dots, never a count) with its practices, nothing locked.
 *   - A carried flooded reading puts *First, the body* above everything; the practice stays one tap away.
 *   - `?followUp=` is the `practice_daily` card on Today: opening it resolves it and the home books the next one.
 * Signed out: the practices themselves, and a line to sign in.
 */
const tile = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4';
const primary = 'flex items-center justify-center w-full min-h-[52px] px-4 rounded-[16px] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-[17px] font-semibold lift-primary';
const quiet = 'min-h-11 px-2 text-[15px] underline underline-offset-2 text-[var(--color-text-secondary)] bg-transparent border-none';
const h2 = 'text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-3 px-1';

/** A practice is offered only when its tool is built and listed for everyone. */
const built = (toolId: string) => { const t = getToolById(toolId); return !!t && t.listed === undefined; };

type Prefs = NonNullable<ProfileSlices['practicePrefs']>;
type PrefsDraft = { time: string | null; cue: string | null; cueOwn: string; breath: string };

export function Practice() {
  const { user } = useAuth();
  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] m-0">{C.title}</h1>
        <p className="m-0 text-[var(--color-text-secondary)]">{C.intro}</p>
      </header>
      {user ? <PracticeHome /> : <SignedOut />}
    </div>
  );
}

function SignedOut() {
  const names = useOfficialNames();
  const mf = allTools.filter((t) => t.module === 'mindfulness' && t.listed === undefined);
  return (
    <>
      <p className="m-0 text-[var(--color-text-primary)]">
        <Link to="/login" className="font-medium text-[var(--color-accent)] hover:underline">{C.signedOut}</Link>
      </p>
      <section aria-labelledby="practice-library">
        <h2 id="practice-library" className={h2}>{C.libraryTitle}</h2>
        <div className="grid gap-3">
          {mf.map((t) => (
            <Link key={t.id} to={`/tool/${t.id}`} className={`${tile} flex items-center gap-3 text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]`}>
              <span aria-hidden="true">{t.emoji}</span><span>{names.label(t)}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function PracticeHome() {
  const [params, setParams] = useSearchParams();
  const followUp = params.get('followUp');
  const { drop: dropToday, refresh: refreshToday } = useToday();
  const band = useBand();
  const profile = useProfileContext('practice');
  const [home, setHome] = useState<PracticeHomeResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  /** The kept setup once saved here (the profile read is cached for the visit). `undefined`: use the read. */
  const [savedPrefs, setSavedPrefs] = useState<Prefs | PrefsDraft | null | undefined>(undefined);
  const [setup, setSetup] = useState<null | 'why' | 'when' | 'breath'>(null);
  const [setupSkipped, setSetupSkipped] = useState(false);
  const booked = useRef(false);

  const load = useCallback(() => getPracticeHome().then(
    (h) => { setHome(h); setStatus('ready'); },
    () => setStatus('error'),
  ), []);

  // The daily card opened the home: resolve it first, so the read below sees no card waiting and books the next.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (followUp && handled.current !== followUp) {
      handled.current = followUp;
      dropToday(followUp);
      void completeDaily(followUp).catch(() => { /* the card goes stale on its own */ }).finally(() => {
        setParams((p) => { const n = new URLSearchParams(p); n.delete('followUp'); return n; }, { replace: true });
        void load();
      });
      return;
    }
    if (!followUp && !handled.current) { handled.current = '-'; void load(); }
  }, [followUp, load, setParams, dropToday]);

  const prefs = savedPrefs !== undefined ? savedPrefs : profile.slices?.practicePrefs ?? null;
  const prefsKnown = savedPrefs !== undefined || profile.status === 'ready';

  // A time of day is set and no card is waiting: book the next one (it rolls, one at a time).
  useEffect(() => {
    if (status !== 'ready' || !home || !prefsKnown || booked.current) return;
    const time = prefs?.time ?? null;
    if (shouldBookDaily(time, home.dailyPending)) {
      booked.current = true;
      void bookDaily(time as string).then(() => refreshToday()).catch(() => { booked.current = false; });
    }
  }, [status, home, prefs, prefsKnown, refreshToday]);

  const showSetup = setup !== null || (prefsKnown && profile.status !== 'error' && !prefs && !setupSkipped && status === 'ready');
  if (showSetup) {
    return (
      <Setup
        start={setup ?? 'why'}
        initial={prefs ? { time: prefs.time, cue: prefs.cue, cueOwn: prefs.cueOwn ?? '', breath: prefs.breath } : null}
        onSkip={() => { setSetup(null); setSetupSkipped(true); }}
        onDone={async (draft) => {
          const input = {
            breath: draft.breath,
            ...(draft.time ? { time: draft.time } : {}),
            ...(draft.cue ? { cue: draft.cue, ...(draft.cue === 'own' && draft.cueOwn.trim() ? { cueOwn: draft.cueOwn.trim() } : {}) } : {}),
          };
          await savePracticePrefs(input);
          setSavedPrefs(draft);
          setSetup(null);
          booked.current = false;
        }}
      />
    );
  }

  if (status === 'loading') return <p className="m-0 text-[var(--color-text-secondary)]" aria-live="polite">…</p>;
  if (status === 'error' || !home) return <p className="m-0 text-[var(--color-text-primary)]" role="status">{C.loadError}</p>;

  const flooded = band.current()?.value === 'flooded';
  return (
    <>
      <DailyCard home={home} flooded={flooded} />
      <Catches onCaught={load} />
      <WeekRing weekReps={home.weekReps} />
      <Skills home={home} />
      {home.offPhoneReps > 0 && <p className="m-0 px-1 text-[var(--color-text-secondary)]" data-testid="practice-offphone">{C.offPhoneLine}</p>}
      <button type="button" className={quiet} onClick={() => setSetup('when')}>{C.changeWhen}</button>
    </>
  );
}

function DailyCard({ home, flooded }: { home: PracticeHomeResponse; flooded: boolean }) {
  const names = useOfficialNames();
  const [swapped, setSwapped] = useState(false);
  const [anyway, setAnyway] = useState(false);
  const { pick, swap } = dailyPick(home.skills, home.recentTools, built);
  const shown = swapped && swap ? swap : pick;
  if (!shown) return null;
  const tool = getToolById(shown.toolId);
  const skill = home.skills.find((s) => s.id === shown.skillId);
  if (!tool || !skill) return null;
  if (flooded && !anyway) {
    return (
      <section className={`${tile} space-y-3`} data-testid="practice-flooded">
        <p className="m-0 text-[var(--color-text-primary)]">{C.floodedLine}</p>
        <Link to="/tool/cool-down" className={primary}>{C.floodedFirst}</Link>
        <button type="button" className={quiet} onClick={() => setAnyway(true)}>{C.tryAnyway}</button>
      </section>
    );
  }
  return (
    <section aria-labelledby="practice-today" className={`${tile} space-y-3`} data-testid="practice-daily">
      <h2 id="practice-today" className="m-0 text-sm font-medium text-[var(--color-text-secondary)]">{C.todayTitle}</h2>
      <p className="m-0 text-xl font-semibold text-[var(--color-text-primary)]">
        <span aria-hidden="true" className="mr-2">{tool.emoji}</span>{names.label(tool)}
      </p>
      {skill.label !== names.label(tool) && <p className="m-0 text-[var(--color-text-secondary)]">{skill.label}</p>}
      <Link to={`/tool/${tool.id}`} className={primary} data-testid="practice-start">{C.start}</Link>
      {swap && <button type="button" className={quiet} onClick={() => setSwapped((s) => !s)}>{C.swap}</button>}
    </section>
  );
}

function Catches({ onCaught }: { onCaught: () => void }) {
  const [state, setState] = useState<Record<PracticeCatch, 'idle' | 'saving' | 'done' | 'error'>>({ judgment: 'idle', off_phone: 'idle' });
  const tap = async (kind: PracticeCatch) => {
    setState((s) => ({ ...s, [kind]: 'saving' }));
    try { await recordCatch(kind); setState((s) => ({ ...s, [kind]: 'done' })); onCaught(); } catch { setState((s) => ({ ...s, [kind]: 'error' })); }
  };
  const row: Array<[PracticeCatch, string]> = [['judgment', C.catchJudgment], ['off_phone', C.catchOffPhone]];
  const said = row.find(([k]) => state[k] === 'error') ? C.catchError : row.find(([k]) => state[k] === 'done') ? C.catchDone : '';
  return (
    <section aria-labelledby="practice-catch">
      <h2 id="practice-catch" className={h2}>{C.catchTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {row.map(([kind, label]) => (
          <button key={kind} type="button" disabled={state[kind] === 'saving'} onClick={() => void tap(kind)} data-testid={`practice-catch-${kind}`}
            className="min-h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-left text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] disabled:opacity-60">
            {label}
          </button>
        ))}
      </div>
      <p className="m-0 mt-2 px-1 min-h-6 text-sm text-[var(--color-text-secondary)]" role="status">{said}</p>
    </section>
  );
}

function WeekRing({ weekReps }: { weekReps: number }) {
  return (
    <section aria-labelledby="practice-week" className="flex items-center gap-4">
      <ProgressRing value={weekFraction(weekReps)} size={72} stroke={8} label={C.weekLabel} />
      <div>
        <h2 id="practice-week" className="m-0 text-sm font-medium text-[var(--color-text-primary)]">{C.weekTitle}</h2>
        <p className="m-0 text-sm text-[var(--color-text-secondary)]">{weekReps > 0 ? C.weekSome : C.weekNone}</p>
      </div>
    </section>
  );
}

function Dots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="w-2 h-2 rounded-full" style={{ background: n <= level ? 'var(--color-accent)' : 'var(--color-border)' }} />
      ))}
    </span>
  );
}

function Skills({ home }: { home: PracticeHomeResponse }) {
  const names = useOfficialNames();
  return (
    <section aria-labelledby="practice-skills">
      <h2 id="practice-skills" className={h2}>{C.skillsTitle}</h2>
      <p className="m-0 mb-3 px-1 text-sm text-[var(--color-text-secondary)]">{C.libraryHint}</p>
      <div className="grid gap-3">
        {library(home.skills, built).map(({ skill, tools }) => {
          const level = levelOf(skill.reps);
          return (
            <div key={skill.id} className={`${tile} space-y-2`} data-testid={`practice-skill-${skill.id}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-base font-semibold text-[var(--color-text-primary)]">{skill.label}</h3>
                <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"><Dots level={level} />{C.skillLevel(level)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tools.map((id) => {
                  const t = getToolById(id);
                  return t ? (
                    <Link key={id} to={`/tool/${id}`} className="min-h-11 inline-flex items-center gap-2 px-3 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]">
                      <span aria-hidden="true">{t.emoji}</span>{names.label(t)}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-11 px-4 rounded-full border text-left ${on ? 'border-[var(--color-accent)] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]' : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]'}`}>
      {children}
    </button>
  );
}

/** The setup (PRD MF-02): why (nothing saved from it), when (a time, a cue or neither), breath. Skippable from any screen. */
function Setup({ start, initial, onSkip, onDone }: {
  start: 'why' | 'when' | 'breath';
  initial: PrefsDraft | null;
  onSkip: () => void;
  onDone: (draft: PrefsDraft) => Promise<void>;
}) {
  const [screen, setScreen] = useState(start);
  const [why, setWhy] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<PrefsDraft>(initial ?? { time: null, cue: null, cueOwn: '', breath: 'not_sure' });
  const [saving, setSaving] = useState<'idle' | 'saving' | 'error'>('idle');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [screen]);
  const title = screen === 'why' ? C.whyTitle : screen === 'when' ? C.whenTitle : C.breathTitle;
  const hint = screen === 'why' ? C.whyHint : screen === 'when' ? C.whenHint : C.breathHint;
  const ownMissing = draft.cue === 'own' && !draft.cueOwn.trim();
  return (
    <section aria-labelledby="practice-setup" className="space-y-4" data-testid={`practice-setup-${screen}`}>
      <h2 id="practice-setup" ref={heading} tabIndex={-1} className="m-0 text-xl font-semibold text-[var(--color-text-primary)] outline-none">{title}</h2>
      <p className="m-0 text-[var(--color-text-secondary)]">{hint}</p>
      {screen === 'why' && (
        <div className="flex flex-col gap-2">
          {WHY_CHIPS.map((c) => (
            <Chip key={c.id} on={why.has(c.id)} onClick={() => setWhy((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}>{c.label}</Chip>
          ))}
        </div>
      )}
      {screen === 'when' && (
        <>
          <h3 className="m-0 pt-3 text-sm font-medium text-[var(--color-text-secondary)]">{C.timeHeading}</h3>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_TIMES.map((t) => (
              <Chip key={t.id} on={draft.time === t.id} onClick={() => setDraft((d) => ({ ...d, time: d.time === t.id ? null : t.id, cue: null, cueOwn: '' }))}>{t.label}</Chip>
            ))}
          </div>
          <h3 className="m-0 pt-3 text-sm font-medium text-[var(--color-text-secondary)]">{C.cueHeading}</h3>
          <div className="flex flex-col gap-2">
            {PRACTICE_CUES.map((c) => (
              <Chip key={c.id} on={draft.cue === c.id} onClick={() => setDraft((d) => ({ ...d, cue: d.cue === c.id ? null : c.id, time: null }))}>{c.label}</Chip>
            ))}
          </div>
          {draft.cue === 'own' && (
            <label className="block">
              <span className="block mb-1 text-sm text-[var(--color-text-secondary)]">{C.cueOwnHint}</span>
              <input type="text" maxLength={60} value={draft.cueOwn} onChange={(e) => setDraft((d) => ({ ...d, cueOwn: e.target.value }))}
                className="w-full min-h-11 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]" />
            </label>
          )}
          <Chip on={!draft.time && !draft.cue} onClick={() => setDraft((d) => ({ ...d, time: null, cue: null, cueOwn: '' }))}>{C.noneLabel}</Chip>
        </>
      )}
      {screen === 'breath' && (
        <div className="flex flex-wrap gap-2">
          {PRACTICE_BREATH.map((b) => (
            <Chip key={b.id} on={draft.breath === b.id} onClick={() => setDraft((d) => ({ ...d, breath: b.id }))}>{b.label}</Chip>
          ))}
        </div>
      )}
      <div className="space-y-2 pt-2">
        {screen !== 'breath' ? (
          <button type="button" className={primary} disabled={screen === 'when' && ownMissing}
            onClick={() => setScreen(screen === 'why' ? 'when' : 'breath')}>{C.next}</button>
        ) : (
          <button type="button" className={primary} disabled={saving === 'saving'} data-testid="practice-setup-done"
            onClick={async () => {
              setSaving('saving');
              try { await onDone(draft); } catch { setSaving('error'); }
            }}>{C.done}</button>
        )}
        {saving === 'error' && <p className="m-0 text-sm text-[var(--color-text-primary)]" role="status">{C.catchError}</p>}
        <button type="button" className={quiet} onClick={onSkip}>{C.notNow}</button>
      </div>
    </section>
  );
}
