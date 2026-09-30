/**
 * Dev-only harness for the capacity band (A4-2): the probe (both wordings), BandGate carry / re-ask,
 * P2 (BreakdownHandoff) and the "too much" overlay, with the fixture content and no Firebase.
 * Not part of the app build.
 *   python3 scripts/capacity/fixture.py   # after editing scripts/capacity/content.py
 *   npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 *   then open http://localhost:4321/dev/capacity.html
 * URL params: ?view=probe|gate|handoff|toomuch&wording=default|relational&label=Sam&band=flooded&blank=1
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import fixture from '../tests/fixtures/capacity-content.json';
import type { Band, CapacityContent, HandoffResult, ProbeWording } from '../src/data/capacityTypes';
import { BandProvider } from '../src/contexts/BandContext';
import { useBand } from '../src/hooks/useBand';
import { CapacityProbe } from '../src/components/capacity/CapacityProbe';
import { BandGate } from '../src/components/capacity/BandGate';
import { BreakdownHandoff } from '../src/components/capacity/BreakdownHandoff';
import { TooMuchLink } from '../src/components/capacity/TooMuchLink';

const content = fixture as unknown as CapacityContent;
const q = new URLSearchParams(location.search);
const view = q.get('view') || 'probe';
const wording = (q.get('wording') as ProbeWording) || 'default';
const band = (q.get('band') as Band) || 'flooded';
const blank = q.get('blank') === '1';
const btn = 'min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm';

function Log({ items }: { items: unknown[] }) {
  return <pre data-testid="log" className="text-[10px] opacity-70 whitespace-pre-wrap">{items.map((i) => JSON.stringify(i)).join('\n')}</pre>;
}

function Harness() {
  const b = useBand();
  const [log, setLog] = useState<unknown[]>([]);
  const push = (x: unknown) => setLog((l) => [...l, x]);
  const [gateKey, setGateKey] = useState(0);
  const [done, setDone] = useState<HandoffResult | null>(null);
  const nav = (
    <nav className="flex flex-wrap gap-2 mb-6 text-sm">
      {['probe', 'gate', 'handoff', 'toomuch'].map((v) => <a key={v} className={btn} href={`?view=${v}&wording=${wording}&band=${band}${blank ? '&blank=1' : ''}`}>{v}</a>)}
      <button className={btn} onClick={() => { b.clear(); push('cleared'); }}>clear band</button>
      <span className="self-center" data-testid="current">current: {b.current()?.value ?? 'none'}</span>
    </nav>
  );
  return (
    <div className="max-w-md mx-auto p-4">
      {nav}
      {view === 'probe' && <CapacityProbe probe={content.probe} wording={wording} personLabel={q.get('label')} onAnswer={(v, c) => push({ v, cantTell: c })} />}
      {view === 'gate' && (
        <div className="space-y-4">
          <BandGate key={gateKey} context="dear-man" wording={wording} reaskIfFlooded onBand={(r, how) => push({ how, value: r?.value, source: r?.source })} />
          <button className={btn} onClick={() => setGateKey((k) => k + 1)}>remount gate (carries a fresh reading; re-asks flooded)</button>
        </div>
      )}
      {view === 'handoff' && (done
        ? <p>resumed. <button className={btn} onClick={() => setDone(null)}>again</button></p>
        : <BreakdownHandoff host="dear-man" band={band} blank={blank}
            resume={{ hostSessionId: '00000000-0000-4000-8000-000000000001', stepId: 'scene:0', draft: { demo: true } }}
            onScheduleLater={async (chip) => { push({ scheduled: chip }); return 'fu-demo'; }}
            onResume={(r) => { push(r); setDone(r); }} onLater={(r) => push({ later: r })} />)}
      {view === 'toomuch' && (
        <div className="space-y-4">
          <p>Host screen with a draft in progress. The overlay keeps it mounted.</p>
          <input className="w-full p-3 rounded-xl border border-[var(--color-border)]" placeholder="type something, then open the link" />
          <TooMuchLink host="dear-man" blank={blank} onResult={push}
            resume={() => ({ hostSessionId: '00000000-0000-4000-8000-000000000001', stepId: 'describe', draft: {} })} />
        </div>
      )}
      <Log items={log} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><BandProvider owner={null} content={content}><Harness /></BandProvider></StrictMode>,
);
