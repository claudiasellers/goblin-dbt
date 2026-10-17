/**
 * The parts review page (dev/parts-review.html): every parts surface, clickable, for the sign-off review.
 * The index is the sign-off pack's surface list (scripts/parts/review.mjs), so a surface the pack gains
 * shows here as missing until the harness has it. Each surface is the app's real component on tests/fixtures/parts-content.json with every row treated as
 * signed off, signed in as an invented person (dev/review/data.ts), in a phone-width frame. No Firebase
 * and no network: firebase/* is stubbed and every callable is answered in the page (dev/review/), with
 * writes listed under the frame, ids only. Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts  →  dev-dist/dev/parts-review.html
 *   (cd dev-dist && python3 -m http.server 4321), then open http://localhost:4321/dev/parts-review.html
 *   node dev/review/check.mjs: every surface and branch at 390×844, screenshots, no errors
 * Navigation is by the hash, never the query string (an Artifact frame needn't keep a query string across
 * in-frame navigation): #s=<surface>&b=<branch>, &ids=1 (each parts line's content id), &plain=1 (parts-off
 * twins); # is the index. A hash change swaps the screen in place, nothing reloads: the callable answers,
 * the event list, the tag row's once-per-session memory and this origin's storage start fresh, the screen
 * remounts and the page scrolls to the top. Only Show ids reloads (the copy is tagged when parts.json loads).
 * The old views stay on dev/parts.html (?view=meet|den|card|offer|angry).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
import { AuthProvider } from '../src/contexts/AuthContext';
import { UserProfileProvider } from '../src/contexts/UserProfileContext';
import { AuthBandProvider } from '../src/contexts/AuthBandProvider';
import { DEFAULT_PROFILE } from '../src/services/neo4j';
import { answers, resetAnswers, REVIEW_USER, reviewEvents, type ReviewEvent } from './review/backend';
import { resetTagRowAnswers } from '../src/lib/tagRowOnce';
import { slices } from './review/data';
import { drive, type DriveStep } from './review/driver';
import { SKIPPED, SURFACES, type Surface } from './review/surfaces';
import PARTS_PACK from 'virtual:review-pack';
import { WISE_MIND_ABSENT, WISE_MIND_EXPECT, WISE_MIND_PACK } from './review/wiseMind'; // lane 1: Wise mind, not parts

/** The sign-off pack's surfaces, then the non-parts tools shown here for review (Wise mind). */
const PACK = [...PARTS_PACK, WISE_MIND_PACK];

interface Nav { surface: Surface | null; branch: NonNullable<Surface['branches']>[number] | null; ids: boolean; plain: boolean }
function readNav(): Nav {
  const q = new URLSearchParams(location.hash.slice(1));
  const surface = SURFACES.find((s) => s.id === q.get('s')) ?? null;
  const branch = surface?.branches?.find((b) => b.id === q.get('b')) ?? surface?.branches?.[0] ?? null;
  return { surface, branch, ids: q.get('ids') === '1', plain: q.get('plain') === '1' };
}
/** Show ids is read once: the served parts copy is tagged when it loads (dev/review/ids.ts). */
const IDS = readNav().ids;

type Req = Record<string, unknown>;
const ok = (d: unknown) => d as Req;
/** Every callable's default answer; a surface's setup overrides what it needs. */
const defaults = () => answers({
  ensureUserExists: () => ({ success: true }),
  getUserProfile: () => ({
    profile: {
      ...DEFAULT_PROFILE, displayName: 'Sam', email: REVIEW_USER.email, theme: 'dark', palette: 'velvet', partsEnabled: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    },
  }),
  updateUserProfile: () => ({ success: true }),
  getProfileContext: (d) => ({ toolId: ok(d).toolId, version: 1, slices: slices() }),
  getPartsEntry: () => ({ open: 'clear', reasons: [] }),
  getToday: () => ({ items: [] }),
  startToolSession: (d) => ({ id: ok(d).id, toolUsageId: 'review' }),
  closeToolSession: (d) => ({ id: ok(d).id, skillPracticeIds: [], followUpIds: [] }),
  scheduleFollowUp: () => ({ ids: [] }),
  startPartSession: (d) => ({ id: ok(d).id, status: 'open' }),
  savePartSession: (d) => ({ id: ok(d).id, status: 'saved' }),
  keepPart: (d) => ({ partId: ok(d).partId, created: true }),
  queuePartCandidate: (d) => ({ id: ok(d).id }),
  answerPartCandidate: (d) => ({ id: ok(d).id, status: 'dismissed' }),
  renamePart: () => ({ version: 2 }),
  restPart: () => ({ version: 2 }),
  setAsidePart: () => ({ version: 2 }),
  restorePart: () => ({ version: 2 }),
  setPartTender: () => ({ version: 2 }),
  answerPartRevisit: () => ({ version: 2 }),
  setPartAnchor: () => ({ version: 2 }),
  setPartShape: () => ({ version: 2 }),
  answerTrailOffer: (d) => {
    const r = ok(d);
    const next = r.answer === 'yes' ? 'meet' : r.answer === 'more_than_one' ? 'candidates' : 'none';
    return { offerId: r.offerId, status: 'answered', answer: r.answer, next, ...(r.answer === 'more_than_one' ? { candidateIds: r.candidateIds } : {}) };
  },
  schedulePartCheckback: (d) => ({ id: ok(d).id }),
  answerPartCheckback: (d) => ({ status: 'done', aftercare: ok(d).answer === 'louder' }),
  tagPart: (d) => ({ id: ok(d).id, created: true }),
  deleteMyParts: () => ({ deleted: {} }),
});

/** A fresh page for one screen, without reloading: answers, events, the tag row's memory, storage. */
function prepare(nav: Nav) {
  resetAnswers();
  defaults();
  nav.surface?.setup?.(nav.branch?.id ?? '');
  reviewEvents.clear();
  resetTagRowAnswers();
  for (const store of [window.sessionStorage, window.localStorage]) {
    try { store.clear(); } catch { /* storage blocked: nothing to clear */ }
  }
}

/** Plain wording runs the card's `_plain` twins: its hold has its own label, and it has no later line. */
function stepsFor(steps: readonly DriveStep[], plain: boolean): DriveStep[] {
  if (!plain) return [...steps];
  return steps.filter((s) => !('opt' in s && s.opt === 'angry_later'))
    .map((s) => ('press' in s && s.press === 'angry_hold' ? { press: 'angry_hold_plain' } : s));
}

/** A link to another screen of this page: the hash only (`#` is the index). */
const ht = (nav: Nav, p: Record<string, string | null>) => {
  const n = new URLSearchParams();
  const base = { s: nav.surface?.id ?? null, b: nav.branch?.id ?? null, ids: nav.ids ? '1' : null, plain: nav.plain ? '1' : null };
  for (const [k, v] of Object.entries({ ...base, ...p })) if (v) n.set(k, v);
  const str = n.toString();
  return str ? `#${str}` : '#';
};

const muted = 'text-xs text-[var(--color-text-tertiary)]';
const pill = 'inline-flex items-center min-h-9 px-3 rounded-full border text-xs';

function Toggle({ nav, label, on, param, testId }: { nav: Nav; label: string; on: boolean; param: string; testId: string }) {
  return (
    <a href={ht(nav, { [param]: on ? null : '1' })} role="switch" aria-checked={on} data-testid={testId}
      className={`${pill} ${on ? 'border-[var(--color-border-accent)] text-[var(--color-text-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
      {label}: {on ? 'on' : 'off'}
    </a>
  );
}

const SHOWN_EVENTS = 6;
const row = (e: ReviewEvent) => (
  <li key={e.n} className="text-[11px] leading-snug font-mono break-words text-[var(--color-text-secondary)]">
    <span className="font-semibold text-[var(--color-text-primary)]">{e.name}{e.failed ? ' (failed)' : ''}</span> {JSON.stringify(e.data)}
  </li>
);

function Events() {
  const list = useSyncExternalStore(reviewEvents.subscribe, reviewEvents.get);
  return (
    <section aria-label="What would be saved" className="space-y-2 pt-4 border-t border-[var(--color-border-subtle)]">
      <p className={muted}>What would be saved (newest first, ids only; own words show as ‹own words›)</p>
      {list.length === 0 ? <p className={muted}>Nothing yet.</p> : (
        <>
          <ol data-testid="events" className="space-y-1.5">{list.slice(0, SHOWN_EVENTS).map(row)}</ol>
          {list.length > SHOWN_EVENTS && (
            <details className="text-xs text-[var(--color-text-tertiary)]">
              <summary className="min-h-9 cursor-pointer">{list.length - SHOWN_EVENTS} earlier</summary>
              <ol className="mt-1.5 space-y-1.5">{list.slice(SHOWN_EVENTS).map(row)}</ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}

/** The sign-off pack's surfaces in its order, each with the harness screens that show it. */
const uncovered = PACK.filter((p) => !SURFACES.some((s) => s.pack === p.id));
const unknown = SURFACES.filter((s) => !PACK.some((p) => p.id === s.pack));

function Index({ nav }: { nav: Nav }) {
  return (
    <div className="space-y-6">
      {PACK.map((p) => (
        <section key={p.id} className="space-y-2" data-pack={p.id}>
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">{p.title}</h2>
          <ul className="space-y-1">
            {SURFACES.filter((s) => s.pack === p.id).map((s) => (
              <li key={s.id}>
                <a href={ht(nav, { s: s.id, b: null })} data-surface={s.id}
                  className="flex min-h-11 items-center px-3 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]">{s.title}</a>
              </li>
            ))}
          </ul>
          {!SURFACES.some((s) => s.pack === p.id) && <p className="text-xs text-[var(--color-danger)]">In the sign-off pack but not in this harness yet.</p>}
        </section>
      ))}
      {unknown.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-sm font-medium text-[var(--color-danger)]">Not in the sign-off pack</h2>
          {unknown.map((s) => <p key={s.id} className={muted}>{s.title}</p>)}
        </section>
      )}
      <section className="space-y-1">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Not here yet</h2>
        {SKIPPED.map((s) => <p key={s} className={muted}>{s}</p>)}
      </section>
    </div>
  );
}

declare global {
  interface Window {
    __reviewMap?: {
      surfaces: { id: string; branches: string[] }[]; uncovered: string[]; unknown: string[];
      /** Non-parts screens' lines to show / not show, by `surface/branch` (Wise mind's copy isn't the parts fixture). */
      expect: Record<string, string>; absent: Record<string, string>;
    };
  }
}
/** For dev/review/check.mjs: every surface and branch, and any pack surface the harness lacks. */
window.__reviewMap = {
  surfaces: SURFACES.map((s) => ({ id: s.id, branches: (s.branches ?? []).map((b) => b.id) })),
  uncovered: uncovered.map((p) => p.id),
  unknown: unknown.map((s) => s.id),
  expect: WISE_MIND_EXPECT,
  absent: WISE_MIND_ABSENT,
};

/** One screen; remounted (by its key) for every hash change, so its branch is driven once per visit. */
function SurfaceView({ s, nav }: { s: Surface; nav: Nav }) {
  const frame = useRef<HTMLDivElement>(null);
  const branch = nav.branch;
  useEffect(() => {
    if (!frame.current) return;
    void drive(frame.current, stepsFor(branch?.steps ?? [], nav.plain));
  }, [branch, nav.plain]);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <a href={ht(nav, { s: null, b: null })} className="inline-flex min-h-9 items-center text-sm text-[var(--color-text-secondary)]">← All surfaces</a>
        <h1 className="text-lg font-medium text-[var(--color-text-primary)]">{s.title}</h1>
        <p data-testid="who" className={muted}>{s.who}</p>
      </div>
      {s.branches && s.branches.length > 1 && (
        <nav aria-label="Branches" className="flex flex-wrap gap-1.5">
          {s.branches.map((b) => (
            <a key={b.id} href={ht(nav, { b: b.id })} aria-current={b.id === branch?.id ? 'page' : undefined} data-branch={b.id}
              className={`${pill} ${b.id === branch?.id ? 'border-[var(--color-border-accent)] text-[var(--color-text-primary)] font-medium' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>{b.label}</a>
          ))}
        </nav>
      )}
      <div ref={frame} data-testid="surface" data-driven="pending" className="pt-2">
        {s.render({ branch: branch?.id ?? '', plain: nav.plain })}
      </div>
      <Events />
    </div>
  );
}

function Review({ nav }: { nav: Nav }) {
  const key = `${nav.surface?.id ?? ''}/${nav.branch?.id ?? ''}/${nav.plain ? 'plain' : ''}`;
  return (
    <div className="min-h-screen text-[var(--color-text-primary)] px-4 py-5">
      <div className="max-w-[420px] mx-auto space-y-5">
        <header className="space-y-2">
          <p className={muted}>Parts review · fixture copy, every row treated as signed off · invented person · nothing is saved</p>
          <div className="flex flex-wrap gap-1.5">
            <Toggle nav={nav} label="Show ids" on={nav.ids} param="ids" testId="toggle-ids" />
            {nav.surface?.id === 'angry' && <Toggle nav={nav} label="Plain wording" on={nav.plain} param="plain" testId="toggle-plain" />}
          </div>
        </header>
        {nav.surface ? <SurfaceView key={key} s={nav.surface} nav={nav} /> : <Index nav={nav} />}
      </div>
    </div>
  );
}

/** The selection lives in state, driven by `hashchange`: nothing reloads but a Show ids toggle. */
function App() {
  const [nav, setNav] = useState<Nav>(() => {
    const n = readNav();
    prepare(n);
    return n;
  });
  useEffect(() => {
    const onHash = () => {
      const n = readNav();
      if (n.ids !== IDS) { location.reload(); return; }
      prepare(n);
      setNav(n);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const key = `${nav.surface?.id ?? 'review'}/${nav.branch?.id ?? ''}/${nav.plain ? 'plain' : ''}`;
  return (
    <MemoryRouter key={key} initialEntries={[{ pathname: `/tool/${nav.surface?.id ?? 'review'}`, state: nav.surface?.routeState?.(nav.branch?.id ?? '') ?? null }]}>
      <Review nav={nav} />
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <UserProfileProvider>
      <AuthBandProvider>
        <App />
      </AuthBandProvider>
    </UserProfileProvider>
  </AuthProvider>,
);
