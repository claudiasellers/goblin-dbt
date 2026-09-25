import { Suspense, lazy, useEffect, useMemo, useReducer, useRef, useState, type ComponentType } from 'react';
import { useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getFeelingCollection, getFindTheFeelingContent, saveFindTheFeelingSession } from '../../services/neo4j';
import type { Band, CollectedWord, Entry, FindTheFeelingContent, Way } from '../../data/findTheFeelingTypes';
import { getToolById } from '../../data/tools';
import { fill } from '../../lib/findTheFeeling';
import { initialFlow, makeFlowReducer, toSession, type History } from '../../lib/findTheFeelingFlow';
import { ToolLoading } from '../../components/tools/ToolLoading';
import { ToolLoadError } from '../../components/tools/ToolLoadError';
import { Orient } from '../../components/tools/regulation/body';
import { linkButton, primaryButton, secondaryText } from '../../components/tools/oppositeAction/styles';
import type { RoomProps } from '../../components/tools/findTheFeeling/roomTypes';

// Rooms carry three.js / Web Audio: loaded only when the tool opens, one room at a time.
const rooms: Record<Way, React.LazyExoticComponent<ComponentType<RoomProps>>> = {
  shape: lazy(() => import('../../components/tools/findTheFeeling/shape/ShapeRoom')),
  tune: lazy(() => import('../../components/tools/findTheFeeling/tune/TuneRoom')),
};

/** crypto.randomUUID needs a secure context; fall back for plain-http testing on a LAN. */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; content: FindTheFeelingContent };
type Save = 'idle' | 'saving' | 'saved' | 'error' | 'signed-out';

/** Check-in handoff. intensityY is the band's graph-defined intensity (no scale is ever shown). */
export interface FindTheFeelingResult { emotionId: string | null; band: Band; intensityY: number }

/** Tool page and check-in embed. `entry="checkin"` ends after the word and calls onHandoff. */
export function FindTheFeeling({ entry = 'tool', onHandoff }: { entry?: Entry; onHandoff?: (r: FindTheFeelingResult) => void } = {}) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getFindTheFeelingContent()
      .then(content => { if (live) setLoad({ status: 'ready', content }); })
      .catch(() => { if (live) setLoad({ status: 'error' }); });
    return () => { live = false; };
  }, [attempt]);

  if (load.status === 'loading') return <ToolLoading />;
  if (load.status === 'error') return <ToolLoadError onRetry={() => { setLoad({ status: 'loading' }); setAttempt(a => a + 1); }} />;
  return <Flow content={load.content} entry={entry} onHandoff={onHandoff} />;
}

function Flow({ content, entry, onHandoff }: { content: FindTheFeelingContent; entry: Entry; onHandoff?: (r: FindTheFeelingResult) => void }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const name = profile.displayName?.trim().split(/\s+/)[0] || null;
  const reduced = useReducedMotion() ?? false;
  const navigate = useNavigate();
  const c = content.flow.copy;

  const reducer = useMemo(() => makeFlowReducer(content), [content]);
  const [history, dispatch] = useReducer(reducer, undefined, (): History => ({ stack: [initialFlow(content, entry)] }));
  const state = history.stack[history.stack.length - 1];

  const [collection, setCollection] = useState<CollectedWord[]>([]);
  useEffect(() => {
    if (!user) return;
    let live = true;
    getFeelingCollection().then(w => { if (live) setCollection(w); }).catch(() => { /* collection is optional */ });
    return () => { live = false; };
  }, [user]);

  // Save once per completed run (collection step for the tool, handoff for check-in).
  const [save, setSave] = useState<Save>('idle');
  const sessionId = useRef<string>('');
  if (!sessionId.current) sessionId.current = newId();
  const savedFor = useRef<string | null>(null);
  const doSave = () => {
    const session = toSession(state, sessionId.current, content.version);
    if (!session) return;
    if (!user) { setSave('signed-out'); return; }
    setSave('saving');
    saveFindTheFeelingSession(session)
      .then(() => setSave('saved'))
      .catch((e: { code?: string }) => setSave(e?.code === 'functions/already-exists' ? 'saved' : 'error'));
  };
  const finished = state.step === 'next' || state.step === 'collection' || state.step === 'handoff';
  useEffect(() => {
    if (!finished || savedFor.current === sessionId.current) return;
    savedFor.current = sessionId.current;
    doSave();
    if (state.step === 'handoff') onHandoff?.({ emotionId: state.word, band: state.band!, intensityY: content.flow.bandIntensity[state.band!] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const restart = () => { sessionId.current = newId(); setSave('idle'); dispatch({ t: 'restart' }); };

  const o = c.orient;
  const slots: RoomProps['slots'] = {
    back: history.stack.length > 1 && !finished
      ? <button type="button" className={linkButton} onClick={() => dispatch({ t: 'back' })}>{c.nav.back}</button>
      : null,
    orient: (
      <div className="space-y-3">
        <Orient look={o.look} move={o.move} moveSeconds={o.moveSeconds} startMoveLabel={o.startMove}
          skipLabel={o.skip} seenLabel={n => fill(o.seen, { n })}
          onDone={() => dispatch({ t: 'oriented' })} />
      </div>
    ),
    next: (
      <div className="space-y-3">
        {state.routedTo.length === 0 && <p className={secondaryText}>{c.next.none}</p>}
        {state.routedTo.map(id => {
          const tool = getToolById(id);
          if (!tool) return null;
          return (
            <button key={id} type="button" onClick={() => { dispatch({ t: 'nextDone' }); navigate(`/tool/${id}`); }}
              className="w-full text-left p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] lift-secondary">
              <span className="block font-semibold text-[var(--color-text-primary)]"><span aria-hidden="true">{tool.emoji} </span>{tool.name}</span>
              <span className="block text-sm text-[var(--color-text-secondary)]">{tool.tagline}</span>
            </button>
          );
        })}
        <button type="button" className={primaryButton} onClick={() => dispatch({ t: 'nextDone' })}>{c.next.done}</button>
      </div>
    ),
    saveStatus: (
      <div className="space-y-2" aria-live="polite">
        {save === 'saving' && <p className={secondaryText}>{c.collection.saving}</p>}
        {save === 'saved' && <p className={secondaryText}>{c.collection.saved}</p>}
        {save === 'signed-out' && <p className={secondaryText}>{c.collection.signedOut}</p>}
        {save === 'error' && (
          <div className="flex items-center gap-2">
            <p className={secondaryText}>{c.collection.saveError}</p>
            <button type="button" className={linkButton} onClick={doSave}>{c.collection.retry}</button>
          </div>
        )}
        <button type="button" className={linkButton} onClick={restart}>{c.collection.again}</button>
      </div>
    ),
  };

  // Newly accepted word shows in the collection right away (the server upsert follows).
  const shownCollection = useMemo(() => {
    if (!state.word || collection.some(w => w.emotionId === state.word)) return collection;
    const w = content.families.flatMap(f => f.words).find(x => x.emotionId === state.word);
    return w ? [...collection, { emotionId: w.emotionId, name: w.name, shape: w.shape, sound: w.sound, count: 1, ways: [state.way], firstAt: new Date().toISOString() }] : collection;
  }, [collection, state.word, state.way, content.families]);

  const Room = rooms[state.way];
  return (
    <div className="relative w-full h-[min(780px,calc(100dvh-9rem))] min-h-[560px] rounded-3xl overflow-hidden border border-[var(--color-border)]">
      <Suspense fallback={<ToolLoading />}>
        <Room content={content} state={state} dispatch={dispatch} name={name} collection={shownCollection}
          reducedMotion={reduced} slots={slots} />
      </Suspense>
    </div>
  );
}
