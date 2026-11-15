/**
 * Dev-only harness for the Practice home (MF-02, docs/design/practice-home.md): the real page with Firebase stubbed
 * (dev/review/backend.ts) and the read answered from an invented week. Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 *   then open http://localhost:4321/dev/practice.html?view=setup|home|new|flooded|followup
 */
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
import { AuthProvider } from '../src/contexts/AuthContext';
import { BandContext, type BandApi } from '../src/hooks/useBand';
import { answers } from './review/backend';
import { Practice } from '../src/pages/Practice';
import type { PracticeHomeResponse } from '../src/data/practiceTypes';

const q = new URLSearchParams(location.search);
const view = q.get('view') || 'home';
const skill = (id: string, label: string, order: number, tools: string[], reps: number, weekReps = 0, offPhone = 0) =>
  ({ id, label, order, tools, reps, weekReps, offPhone });
const home: PracticeHomeResponse = view === 'new'
  ? { skills: [skill('observe', 'Notice', 1, ['notice-and-name', 'five-senses'], 0), skill('describe', 'Name', 2, ['notice-and-name', 'find-the-feeling'], 0),
      skill('nonjudge', 'Without judging', 3, ['unpack-a-judgment'], 0), skill('wise_mind', 'Wise mind', 5, ['wise-mind'], 0)],
    weekReps: 0, offPhoneReps: 0, recentTools: [], dailyPending: false }
  : { skills: [skill('observe', 'Notice', 1, ['notice-and-name', 'five-senses'], 9, 3, 2), skill('describe', 'Name', 2, ['notice-and-name', 'find-the-feeling'], 4, 2),
      skill('nonjudge', 'Without judging', 3, ['unpack-a-judgment'], 1, 1, 1), skill('wise_mind', 'Wise mind', 5, ['wise-mind'], 0)],
    weekReps: 4, offPhoneReps: 3, recentTools: ['notice-and-name'], dailyPending: true };
const prefs = view === 'setup' || view === 'new' ? null
  : { time: 'evening', cue: null, cueOwn: null, breath: 'no', meta: { id: 'p', kind: 'practice_prefs', area: 'my_progress', status: 'active', source: 'user', confirmedAt: null, revisitAt: null, prompt: 'none' } };
answers({
  getPracticeHome: () => home,
  getProfileContext: () => ({ version: 1, slices: { practicePrefs: prefs } }),
  keepProfileItem: () => ({ id: 'p', version: 2 }),
  recordToolSession: () => ({ id: 'x', reps: ['x'] }),
  scheduleFollowUp: (d: unknown) => ({ ids: ((d as { items?: Array<{ id: string }> }).items ?? []).map((i) => i.id) }),
  resolveFollowUp: () => ({ next: null, status: 'done' }),
});

function Band({ children }: { children: React.ReactNode }) {
  const api = useMemo<BandApi>(() => ({
    content: null, status: 'idle', load: () => {}, clear: () => {}, carry: () => null,
    record: () => { throw new Error('no'); },
    current: () => (view === 'flooded' ? { value: 'flooded' } as ReturnType<BandApi['current']> : null),
  }), []);
  return <BandContext.Provider value={api}>{children}</BandContext.Provider>;
}

function Harness() {
  const nav = (
    <nav className="flex flex-wrap gap-2 mb-6 text-sm">
      {['setup', 'new', 'home', 'flooded', 'followup'].map((v) => <a key={v} className="min-h-11 px-3 rounded-lg border border-[var(--color-border)]" href={`?view=${v}`}>{v}</a>)}
    </nav>
  );
  return (
    <main className="max-w-lg mx-auto p-4 bg-[var(--color-bg)] min-h-screen">
      {q.get('nav') !== '0' && nav}
      <MemoryRouter initialEntries={[view === 'followup' ? '/practice?followUp=3f2c9a0e-1b2c-4d5e-8f90-123456789abc' : '/practice']}>
        <Practice />
      </MemoryRouter>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><Band><Harness /></Band></AuthProvider></StrictMode>);
