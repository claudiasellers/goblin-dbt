/**
 * Dev-only harness for the person picker and its safety route (IE-03 + D4, docs/design/people.md): every stage with
 * the copy as schema/dear-man-safety-gates.cypher loads it (read raw at build time, never retyped), Firebase stubbed.
 * Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 *   then open http://localhost:4321/dev/people.html?view=list|new|signedout|route
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
import cypher from '../schema/dear-man-safety-gates.cypher?raw';
import { PersonPicker } from '../src/components/people/PersonPicker';
import { PersonSafetyRoute } from '../src/components/people/PersonSafetyRoute';
import { pickerCopy, type KeptPerson, type PickedPerson } from '../src/lib/people';

const copy: Record<string, string> = {};
for (const m of cypher.matchAll(/c\.(\w+) = (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) copy[m[1]] = (m[2] ?? m[3]).replace(/\\(.)/g, '$1');
const pc = pickerCopy(copy)!;
const q = new URLSearchParams(location.search);
const view = q.get('view') || 'list';
const day = 86_400_000;
const meta = { id: '', kind: 'person', area: 'my_people' as const, status: 'active' as const, source: 'user', confirmedAt: null, revisitAt: null, prompt: 'none' as const };
const kept: KeptPerson[] = [
  { id: '6f1c0d3a-1111-4222-8333-444455556661', label: 'Mum', role: 'parent', safe: 'no', risk: 'invalidating', safeAskedAt: new Date(Date.now() - 20 * day).toISOString(), meta },
  { id: '6f1c0d3a-1111-4222-8333-444455556662', label: 'Jo', role: 'boss', safe: 'yes', risk: 'none', safeAskedAt: new Date(Date.now() - 120 * day).toISOString(), meta },
  { id: '6f1c0d3a-1111-4222-8333-444455556663', label: 'Sam', role: 'partner', safe: null, risk: null, safeAskedAt: null, meta },
];

function Harness() {
  const [done, setDone] = useState<PickedPerson | null>(null);
  const nav = (
    <nav className="flex flex-wrap gap-2 mb-6 text-sm">
      {['list', 'new', 'signedout', 'route'].map((v) => <a key={v} className="min-h-11 px-3 rounded-lg border border-[var(--color-border)]" href={`?view=${v}`}>{v}</a>)}
    </nav>
  );
  const body = view === 'route'
    ? <PersonSafetyRoute copy={{ safetyRouteHeading: copy.safetyRouteHeading, safetyRouteBody: copy.safetyRouteBody, safetyRouteEnding: copy.safetyRouteEnding, safetyRouteBack: copy.safetyRouteBack }} label="Sam" onBack={() => undefined} />
    : done
      ? <pre data-testid="picked" className="text-xs whitespace-pre-wrap">{JSON.stringify(done, null, 2)}</pre>
      : <PersonPicker people={view === 'list' ? kept : null} signedIn={view !== 'signedout'} copy={pc} onDone={setDone} />;
  return <main className="max-w-lg mx-auto p-4">{nav}{body}{done?.route === 'heads_up' && <p className="mt-4 text-sm">{copy.badlyHeadsUp}</p>}</main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><MemoryRouter><Harness /></MemoryRouter></StrictMode>);
