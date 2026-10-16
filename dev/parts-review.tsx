/**
 * The parts review page (dev/parts-review.html): every parts surface, clickable, for the sign-off review.
 * Each surface is the app's real component on tests/fixtures/parts-content.json with every row treated as
 * signed off, signed in as an invented person (dev/review/data.ts), in a phone-width frame. No Firebase
 * and no network: firebase/* is stubbed and every callable is answered in the page (dev/review/), with
 * writes listed under the frame, ids only. Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts  →  dev-dist/dev/parts-review.html
 *   (cd dev-dist && python3 -m http.server 4321), then open http://localhost:4321/dev/parts-review.html
 *   node dev/review/check.mjs: every surface and branch at 390×844, screenshots, no errors
 * URL params: ?s=<surface>&b=<branch>, &ids=1 (each parts line's content id), &plain=1 (parts-off twins).
 * The old views stay on dev/parts.html (?view=meet|den|card|offer|angry).
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
import { AuthProvider } from '../src/contexts/AuthContext';
import { UserProfileProvider } from '../src/contexts/UserProfileContext';
import { AuthBandProvider } from '../src/contexts/AuthBandProvider';
import { DEFAULT_PROFILE } from '../src/services/neo4j';
import { answers, REVIEW_USER, reviewEvents, type ReviewEvent } from './review/backend';
import { slices } from './review/data';
import { drive, type DriveStep } from './review/driver';
import { SKIPPED, SURFACES, type Surface } from './review/surfaces';

const q = new URLSearchParams(location.search);
const ids = q.get('ids') === '1';
const plain = q.get('plain') === '1';
const surface: Surface | null = SURFACES.find((s) => s.id === q.get('s')) ?? null;
const branch = surface?.branches?.find((b) => b.id === q.get('b')) ?? surface?.branches?.[0] ?? null;

type Req = Record<string, unknown>;
const ok = (d: unknown) => d as Req;
answers({
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
  schedulePartCheckback: (d) => ({ id: ok(d).id }),
  answerPartCheckback: (d) => ({ status: 'done', aftercare: ok(d).answer === 'louder' }),
  tagPart: (d) => ({ id: ok(d).id, created: true }),
  deleteMyParts: () => ({ deleted: {} }),
});
if (surface && branch) surface.setup?.(branch.id);
else surface?.setup?.('');

/** Plain wording runs the card's `_plain` twins: its hold has its own label, and it has no later line. */
function stepsFor(steps: readonly DriveStep[]): DriveStep[] {
  if (!plain) return [...steps];
  return steps.filter((s) => !('opt' in s && s.opt === 'angry_later'))
    .map((s) => ('press' in s && s.press === 'angry_hold' ? { press: 'angry_hold_plain' } : s));
}

const href = (p: Record<string, string | null>) => {
  const n = new URLSearchParams();
  for (const [k, v] of Object.entries({ s: surface?.id ?? null, b: branch?.id ?? null, ids: ids ? '1' : null, plain: plain ? '1' : null, ...p })) if (v) n.set(k, v);
  const str = n.toString();
  return str ? `?${str}` : location.pathname;
};

const muted = 'text-xs text-[var(--color-text-tertiary)]';
const pill = 'inline-flex items-center min-h-9 px-3 rounded-full border text-xs';

function Toggle({ label, on, param, testId }: { label: string; on: boolean; param: string; testId: string }) {
  return (
    <a href={href({ [param]: on ? null : '1' })} role="switch" aria-checked={on} data-testid={testId}
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

function Index() {
  const groups = ['In the moment', 'Meet a part', 'Over weeks'] as const;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g} className="space-y-2">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">{g}</h2>
          <ul className="space-y-1">
            {SURFACES.filter((s) => s.group === g).map((s) => (
              <li key={s.id}>
                <a href={href({ s: s.id, b: null })} data-surface={s.id}
                  className="flex min-h-11 items-center px-3 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]">{s.title}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="space-y-1">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Not here yet</h2>
        {SKIPPED.map((s) => <p key={s} className={muted}>{s}</p>)}
      </section>
    </div>
  );
}

declare global { interface Window { __reviewMap?: { id: string; branches: string[] }[] } }
/** For dev/review/check.mjs: every surface and branch, so the check never falls behind the list. */
window.__reviewMap = SURFACES.map((s) => ({ id: s.id, branches: (s.branches ?? []).map((b) => b.id) }));

let drove = false;
function SurfaceView({ s }: { s: Surface }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (drove || !frame.current) return;
    drove = true;
    void drive(frame.current, stepsFor(branch?.steps ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <a href={href({ s: null, b: null })} className="inline-flex min-h-9 items-center text-sm text-[var(--color-text-secondary)]">← All surfaces</a>
        <h1 className="text-lg font-medium text-[var(--color-text-primary)]">{s.title}</h1>
        <p data-testid="who" className={muted}>{s.who}</p>
      </div>
      {s.branches && s.branches.length > 1 && (
        <nav aria-label="Branches" className="flex flex-wrap gap-1.5">
          {s.branches.map((b) => (
            <a key={b.id} href={href({ b: b.id })} aria-current={b.id === branch?.id ? 'page' : undefined} data-branch={b.id}
              className={`${pill} ${b.id === branch?.id ? 'border-[var(--color-border-accent)] text-[var(--color-text-primary)] font-medium' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>{b.label}</a>
          ))}
        </nav>
      )}
      <div ref={frame} data-testid="surface" data-driven="pending" className="pt-2">
        {s.render({ branch: branch?.id ?? '', plain })}
      </div>
      <Events />
    </div>
  );
}

function Review() {
  return (
    <div className="min-h-screen text-[var(--color-text-primary)] px-4 py-5">
      <div className="max-w-[420px] mx-auto space-y-5">
        <header className="space-y-2">
          <p className={muted}>Parts review · fixture copy, every row treated as signed off · invented person · nothing is saved</p>
          <div className="flex flex-wrap gap-1.5">
            <Toggle label="Show ids" on={ids} param="ids" testId="toggle-ids" />
            {surface?.id === 'angry' && <Toggle label="Plain wording" on={plain} param="plain" testId="toggle-plain" />}
          </div>
        </header>
        {surface ? <SurfaceView s={surface} /> : <Index />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <UserProfileProvider>
      <AuthBandProvider>
        <MemoryRouter initialEntries={[{ pathname: `/tool/${surface?.id ?? 'review'}`, state: surface?.routeState?.(branch?.id ?? '') ?? null }]}>
          <Review />
        </MemoryRouter>
      </AuthBandProvider>
    </UserProfileProvider>
  </AuthProvider>,
);
