import { useState } from 'react';
import { Stage } from './directions/Stage';
import { Shape } from './directions/Shape';
import { Tune } from './directions/Tune';
import type { SessionRecord } from './record';

const DIRECTIONS = [
  { id: 'stage', name: 'Stage it', bet: 'Showing what happened with figures on a little stage is easier than describing it, and zooming out calms it down.', C: Stage },
  { id: 'shape', name: 'Shape it', bet: 'Matching the feeling to an object is easier than naming it, and smoothing it slowly settles you.', C: Shape },
  { id: 'tune', name: 'Tune it', bet: 'Finding how it sounds is easier than finding the word, and breathing the strings back into tune calms you.', C: Tune },
] as const;

export default function App() {
  const [dir, setDir] = useState<(typeof DIRECTIONS)[number]['id']>('stage');
  const [run, setRun] = useState(0);
  const [last, setLast] = useState<SessionRecord | null>(null);
  const d = DIRECTIONS.find(x => x.id === dir)!;
  return (
    <div className="h-dvh sm:h-auto sm:min-h-dvh flex flex-col items-center gap-3 sm:py-6">
      <div className="w-full max-w-[430px] px-4 pt-3 sm:pt-0 flex flex-col gap-2">
        <div className="flex gap-1 p-1 rounded-full" role="tablist" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
          {DIRECTIONS.map(x => (
            <button key={x.id} role="tab" aria-selected={x.id === dir} type="button" onClick={() => { setDir(x.id); setRun(r => r + 1); setLast(null); }}
              className="flex-1 min-h-10 rounded-full text-[14px] font-semibold transition-colors"
              style={x.id === dir ? { background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' } : { color: 'var(--ink-2)' }}>
              {x.name}
            </button>
          ))}
        </div>
        <p className="text-[13px] leading-snug px-1" style={{ color: 'var(--ink-2)' }}>
          <b style={{ color: 'var(--ink)' }}>Bet:</b> {d.bet}{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => { setRun(r => r + 1); setLast(null); }}>Restart</button>
        </p>
      </div>
      <div className="w-full sm:w-[390px] flex-1 min-h-0 sm:flex-none sm:h-[780px] sm:rounded-[44px] overflow-hidden sm:border-[10px] relative"
        style={{ background: 'var(--bg)', borderColor: '#111318', boxShadow: '0 30px 80px -30px rgba(0,0,0,.45)' }}>
        <d.C key={`${dir}-${run}`} onRecord={setLast} />
      </div>
      {last && (
        <details className="w-full max-w-[430px] px-5 pb-4 text-[12px]" style={{ color: 'var(--ink-2)' }}>
          <summary className="cursor-pointer">What this session would save to the graph</summary>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(last, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
