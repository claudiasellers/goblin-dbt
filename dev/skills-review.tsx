/**
 * The skills review page (dev/skills-review.html): every skill the player runs, every step of it, on the app's
 * real SkillPlayer, for the UI-design and clinical QC passes each module PR goes through (docs/design/
 * dbt-modules-plan.md §5.4). Plus one review-only skill (dev/review/embeds-skill.json) that shows each shared
 * embed. Signed in as the review harness's invented person, in a phone-width frame; no Firebase and no
 * network (firebase/* stubbed, every callable answered here, writes listed under the frame, ids only).
 * Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts  →  dev-dist/dev/skills-review.html
 *   (cd dev-dist && python3 -m http.server 4321), then open http://localhost:4321/dev/skills-review.html
 *   node dev/review/skills-shots.mjs: every step of every skill at 390×844, screenshots, no errors
 * Navigation is by the hash: #k=<skill>&s=<step>&band=<steady|stirred|flooded>&theme=light; no `s` plays the skill from
 * its start. A step opens through the player's own resume (`?run=&at=`, R9): getSkillRun answers with a run
 * whose path reaches it, each earlier field answered with its first option (dev/review/skillsReview.ts).
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
import { AuthProvider } from '../src/contexts/AuthContext';
import { UserProfileProvider } from '../src/contexts/UserProfileContext';
import { AuthBandProvider } from '../src/contexts/AuthBandProvider';
import { ToolSessionProvider } from '../src/contexts/ToolSessionContext';
import { SkillPlayer } from '../src/components/skillPlayer/SkillPlayer';
import { DEFAULT_PROFILE } from '../src/services/neo4j';
import type { SkillDef } from '../src/data/skillTypes';
import { applyRoom } from '../src/data/palettes';
import skillsFile from '../src/data/content/skills.json';
import witnessLines from 'virtual:review-witness-lines';
import { answers, resetAnswers, REVIEW_USER, reviewEvents, type ReviewEvent } from './review/backend';
import { slices } from './review/data';
import { reviewOrder, reviewRun } from './review/skillsReview';

const SKILLS = (skillsFile as unknown as { content: { skills: SkillDef[] } }).content.skills;
const RUN_ID = '00000000-0000-4000-8000-00000000c0de';
const BANDS = ['steady', 'stirred', 'flooded'] as const;

interface Nav { skill: SkillDef | null; step: string | null; band: (typeof BANDS)[number] | null; light?: boolean; blank?: boolean }
function readNav(): Nav {
  const q = new URLSearchParams(location.hash.slice(1));
  const skill = SKILLS.find((s) => s.id === q.get('k')) ?? null;
  const step = skill?.steps.some((s) => s.id === q.get('s')) ? q.get('s') : null;
  const b = q.get('band');
  return { skill, step, band: (BANDS as readonly string[]).includes(b ?? '') ? (b as Nav['band']) : null, light: q.get('theme') === 'light' };
}
const ht = (nav: Nav, p: Record<string, string | null>) => {
  const n = new URLSearchParams();
  for (const [k, v] of Object.entries({ k: nav.skill?.id ?? null, s: nav.step, band: nav.band, theme: nav.light ? 'light' : null, ...p })) if (v) n.set(k, v);
  const s = n.toString();
  return s ? `#${s}` : '#';
};

type Req = Record<string, unknown>;
const ok = (d: unknown) => d as Req;
function prepare(nav: Nav) {
  // Light is a light room (Daylight), dark the default (Velvet): a room sets palette and theme together.
  applyRoom(nav.light ? 'daylight' : 'velvet');
  resetAnswers();
  answers({
    ensureUserExists: () => ({ success: true }),
    getUserProfile: () => ({
      profile: {
        ...DEFAULT_PROFILE, displayName: 'Sam', email: REVIEW_USER.email, theme: nav.light ? 'light' : 'dark', palette: nav.light ? 'daylight' : 'velvet', partsEnabled: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      },
    }),
    updateUserProfile: () => ({ success: true }),
    getProfileContext: (d) => ({ toolId: ok(d).toolId, version: 1, slices: slices() }),
    getToday: () => ({ items: [] }),
    startToolSession: (d) => ({ id: ok(d).id, toolUsageId: 'review' }),
    closeToolSession: (d) => ({ id: ok(d).id, skillPracticeIds: [], followUpIds: [] }),
    scheduleFollowUp: () => ({ ids: [] }),
    keepProfileItem: (d) => ({ version: 2, id: ok(d).id ?? 'review-item' }),
    recordWitnessBeat: () => ({ logged: true }),
    getWitnessLines: (d) => ({
      version: 'witness-v1', fadeStage: 0, firstName: null, askLanded: ok(d).band !== 'flooded',
      lines: witnessLines.slice(0, ok(d).band === 'flooded' ? 1 : 2),
    }),
    getSkillRun: (d) => ({ run: nav.skill && nav.step && ok(d).sessionId === RUN_ID ? reviewRun(nav.skill, nav.step) : null }),
  });
  reviewEvents.clear();
  for (const store of [window.sessionStorage, window.localStorage]) {
    try { store.clear(); } catch { /* storage blocked */ }
  }
}

const muted = 'text-xs text-[var(--color-text-tertiary)]';
const pill = 'inline-flex items-center min-h-9 px-3 rounded-full border text-xs';
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
      {list.length === 0 ? <p className={muted}>Nothing yet.</p> : <ol data-testid="events" className="space-y-1.5">{list.slice(0, 8).map(row)}</ol>}
    </section>
  );
}

const titleOf = (sk: SkillDef, id: string) => {
  const t = sk.steps.find((s) => s.id === id)?.title;
  const key = typeof t === 'string' ? t : t?.[0]?.key;
  return (key && sk.copy[key]) || '';
};

function Index({ nav }: { nav: Nav }) {
  return (
    <div className="space-y-6">
      {SKILLS.map((sk) => (
        <section key={sk.id} className="space-y-2" data-skill={sk.id}>
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">{sk.id} <span className={muted}>({sk.toolId}, {sk.version})</span></h2>
          <a href={ht(nav, { k: sk.id, s: null })} className="flex min-h-11 items-center px-3 rounded-lg border border-[var(--color-border-accent)] text-[var(--color-text-primary)]">Play from the start</a>
          <ul className="space-y-1">
            {reviewOrder(sk).map((id) => {
              const st = sk.steps.find((s) => s.id === id)!;
              return (
                <li key={id}>
                  <a href={ht(nav, { k: sk.id, s: id })} data-step={id}
                    className="flex min-h-11 items-center gap-2 px-3 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]">
                    <span className="font-mono text-xs text-[var(--color-text-tertiary)] shrink-0">{id} · {st.kind}{st.embed ? `:${st.embed}` : ''}</span>
                    <span className="text-sm truncate">{titleOf(sk, id)}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function StepView({ nav }: { nav: Nav }) {
  const sk = nav.skill!;
  const order = reviewOrder(sk);
  const i = nav.step ? order.indexOf(nav.step) : -1;
  const search = nav.step ? `?run=${RUN_ID}&at=${nav.step}` : '';
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <a href="#" className="inline-flex min-h-9 items-center text-sm text-[var(--color-text-secondary)]">← All skills</a>
        <h1 className="text-lg font-medium text-[var(--color-text-primary)]">{sk.id}{nav.step ? ` · ${nav.step}` : ' · from the start'}</h1>
        <nav aria-label="Steps" className="flex flex-wrap gap-1.5">
          {i > 0 && <a href={ht(nav, { s: order[i - 1] })} className={`${pill} border-[var(--color-border)]`}>← {order[i - 1]}</a>}
          {i >= 0 && i < order.length - 1 && <a href={ht(nav, { s: order[i + 1] })} className={`${pill} border-[var(--color-border)]`}>{order[i + 1]} →</a>}
          {BANDS.map((b) => (
            <a key={b} href={ht(nav, { band: nav.band === b ? null : b })} aria-pressed={nav.band === b} data-band={b}
              className={`${pill} ${nav.band === b ? 'border-[var(--color-border-accent)] text-[var(--color-text-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>band {b}</a>
          ))}
        </nav>
      </div>
      <MemoryRouter initialEntries={[{ pathname: `/tool/${sk.toolId}`, search, state: nav.band ? { skillCtx: { band: nav.band } } : null }]}>
        <div data-testid="frame" className="pt-2">
          <ToolSessionProvider toolId={sk.toolId}>
            <SkillPlayer skillId={sk.id} />
          </ToolSessionProvider>
        </div>
      </MemoryRouter>
      <Events />
    </div>
  );
}

declare global { interface Window { __skillsMap?: { skill: string; steps: string[] }[] } }
/** For dev/review/skills-shots.mjs: every skill and its steps in review order. */
window.__skillsMap = SKILLS.map((sk) => ({ skill: sk.id, steps: reviewOrder(sk) }));

function App() {
  const [nav, setNav] = useState<Nav>(() => { const n = readNav(); prepare(n); return n; });
  useEffect(() => {
    // Unmount the old screen first (its session closes into the old list), then start the new one clean.
    let t = 0;
    const onHash = () => {
      setNav({ skill: null, step: null, band: null, blank: true });
      window.clearTimeout(t);
      t = window.setTimeout(() => { const n = readNav(); prepare(n); setNav(n); window.scrollTo(0, 0); }, 60);
    };
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('hashchange', onHash); window.clearTimeout(t); };
  }, []);
  const key = `${nav.skill?.id ?? ''}/${nav.step ?? ''}/${nav.band ?? ''}`;
  return (
    <div className="min-h-screen text-[var(--color-text-primary)] px-4 py-5">
      <div className="max-w-[420px] mx-auto space-y-5">
        <p className={muted}>Skills review · shipped skills plus a review-only embeds skill · invented person · nothing is saved</p>
        {nav.blank ? null : nav.skill ? <StepView key={key} nav={nav} /> : <Index nav={nav} />}
      </div>
    </div>
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
