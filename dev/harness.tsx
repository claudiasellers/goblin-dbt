/**
 * Dev-only harness: renders a Find the feeling room with the fixture content and the real flow
 * reducer, no Firebase / Neo4j. Not part of the app build.
 *   npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 *   then open http://localhost:4321/dev/find-the-feeling.html
 * URL params: ?way=shape|tune&entry=tool|checkin&name=Claudia
 */
import { StrictMode, Suspense, lazy, useMemo, useReducer, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import fixture from '../tests/fixtures/find-the-feeling-content.json';
import type { FindTheFeelingContent, Way, Entry } from '../src/data/findTheFeelingTypes';
import { initialFlow, makeFlowReducer, type History } from '../src/lib/findTheFeelingFlow';
import type { RoomProps } from '../src/components/tools/findTheFeeling/roomTypes';

const content = fixture as unknown as FindTheFeelingContent;
const q = new URLSearchParams(location.search);
const way = (q.get('way') as Way) || 'shape';
const entry = (q.get('entry') as Entry) || 'tool';
const rooms: Record<Way, React.LazyExoticComponent<ComponentType<RoomProps>>> = {
  shape: lazy(() => import('../src/components/tools/findTheFeeling/shape/ShapeRoom')),
  tune: lazy(() => import('../src/components/tools/findTheFeeling/tune/TuneRoom')),
};

function Harness() {
  const reducer = useMemo(() => makeFlowReducer(content), []);
  const [h, dispatch] = useReducer(reducer, undefined, (): History => ({ stack: [initialFlow(content, entry, way)] }));
  const state = h.stack[h.stack.length - 1];
  (window as unknown as { __ftf: unknown }).__ftf = { state, dispatch };
  const Room = rooms[state.way];
  const btn = 'min-h-11 px-3 rounded-lg border border-[var(--color-border)]';
  return (
    <div style={{ height: '100dvh' }}>
      <Suspense fallback={<p>loading room…</p>}>
        <Room content={content} state={state} dispatch={dispatch} name={q.get('name')} reducedMotion={matchMedia('(prefers-reduced-motion: reduce)').matches}
          collection={[]}
          slots={{
            back: h.stack.length > 1 ? <button className={btn} onClick={() => dispatch({ t: 'back' })}>Back</button> : null,
            orient: <button className={btn} data-testid="orient-done" onClick={() => dispatch({ t: 'oriented' })}>[orient slot] done</button>,
            next: <div data-testid="next-slot">[next slot] {state.routedTo.join(', ') || 'none'} <button className={btn} onClick={() => dispatch({ t: 'nextDone' })}>Finish</button></div>,
            saveStatus: <p data-testid="save-slot">[save slot]</p>,
            // ?unblend=<text>: preview the parts unblend line's place in a room
            unblend: q.get('unblend'),
          }} />
      </Suspense>
      <pre data-testid="state" style={{ position: 'fixed', bottom: 0, left: 0, fontSize: 9, opacity: 0.5, pointerEvents: 'none', maxWidth: '100vw', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify({ step: state.step, band: state.band, pull: state.pull, regulation: state.regulation, word: state.word, offered: state.offer.offered, routedTo: state.routedTo })}
      </pre>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
