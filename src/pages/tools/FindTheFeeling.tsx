import { Suspense, lazy, useEffect, useMemo, useReducer, useRef, useState, type ComponentType } from 'react';
import { useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../hooks/useProfileContext';
import { getFeelingCollection, getFindTheFeelingContent, saveFindTheFeelingSession } from '../../services/neo4j';
import type { Band, CollectedWord, Entry, FindTheFeelingContent, Way } from '../../data/findTheFeelingTypes';
import { getToolById } from '../../data/tools';
import { fill } from '../../lib/findTheFeeling';
import { initialFlow, makeFlowReducer, toSession, type History } from '../../lib/findTheFeelingFlow';
import { ToolLoading } from '../../components/tools/ToolLoading';
import { ToolLoadError } from '../../components/tools/ToolLoadError';
import { Orient } from '../../components/tools/regulation/body';
import { linkButton, primaryButton, secondaryText } from '../../components/tools/oppositeAction/styles';
import { useToolSession } from '../../hooks/useToolSession';
import { useUnblendLine } from '../../hooks/useUnblendLine';
import { recordToolSession } from '../../services/spine';
import { thenVsNowFromFtf } from '../../lib/band';
import { useBand } from '../../hooks/useBand';
import { newId } from '../../lib/spine/ids';
import { sessionEmotionIds } from '../../lib/spine/toolLink';
import type { RoomProps } from '../../components/tools/findTheFeeling/roomTypes';
import { PartTagSlot } from '../../components/spine/PartTagSlot';

// Rooms carry three.js / Web Audio: loaded only when the tool opens, one room at a time.
const rooms: Record<Way, React.LazyExoticComponent<ComponentType<RoomProps>>> = {
  shape: lazy(() => import('../../components/tools/findTheFeeling/shape/ShapeRoom')),
  tune: lazy(() => import('../../components/tools/findTheFeeling/tune/TuneRoom')),
};

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; content: FindTheFeelingContent };
type Save = 'idle' | 'saving' | 'saved' | 'error' | 'signed-out';

/**
 * Check-in handoff. intensityY is the band's graph-defined intensity (no scale is ever shown).
 * Both are null now that the capacity question isn't asked (Claudia, 30 Sep).
 */
export interface FindTheFeelingResult {
  emotionId: string | null; band: Band | null; intensityY: number | null;
  /** The pull was `blank` (E4-4): the check-in's routing never offers a calming tool then. */
  blank?: boolean;
  /** The embedded ToolSession (PR-S4); the check-in links it with EMBEDDED. */
  toolSessionId?: string | null;
}

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
  // The single profile read path (PR-P1); null while loading, as before.
  const name = useProfileContext('find-the-feeling').slices?.name.firstName ?? null;
  const reduced = useReducedMotion() ?? false;
  const navigate = useNavigate();
  const c = content.flow.copy;

  const reducer = useMemo(() => makeFlowReducer(content), [content]);
  const [history, dispatch] = useReducer(reducer, undefined, (): History => ({ stack: [initialFlow(content, entry)] }));
  const state = history.stack[history.stack.length - 1];

  // FTF's capacity answer is a band reading like any other (A4-2): recorded so the check-in and the
  // next tool within 20 minutes carry it. The capacity step is out for now, so this doesn't fire;
  // kept for when a band question comes back.
  const band = useBand();
  useEffect(() => {
    if (!state.band) return;
    band.record({ value: state.band, source: 'ftf', framing: 'now', wording: 'default', context: entry === 'checkin' ? 'checkin' : 'find-the-feeling' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.band]);

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
  const toolSession = useToolSession();
  // "Was this a part you know?" (PartTagSlot) under the close, in the next step and then the collection:
  // it waits for the server to have the close, and folds away in both once tapped.
  const [closeSaved, setCloseSaved] = useState(false);
  const [tagGone, setTagGone] = useState(false);
  // The word found here is the session's emotion when it opened without any (a hand-off's are kept).
  useEffect(() => { toolSession.setEmotionIds(state.word ? [state.word] : []); }, [state.word, toolSession]);
  /** PR-S4: link the run to its spine session once the FTF session is saved (DETAIL needs it). */
  const wrap = (embedId: string | null) => {
    const detail = { kind: 'find_the_feeling' as const, id: sessionId.current };
    const skills = state.word ? {} : { skillIds: [] as string[] }; // a rep of `label` only when a word was accepted
    if (embedId) {
      // Inside the check-in there is no tool page: a one-shot embedded session the check-in links to.
      const emotionIds = state.word ? sessionEmotionIds([state.word]) : [];
      void recordToolSession({ id: embedId, toolId: 'find-the-feeling', entry: 'embedded', status: 'completed', detail, ...skills,
        ...(emotionIds.length ? { emotionIds } : {}) })
        .catch(() => { /* best effort */ });
      return;
    }
    const tvn = thenVsNowFromFtf(state.close);
    toolSession.close({ status: 'completed', detail, ...(tvn ? { thenVsNow: tvn.thenVsNow } : {}), ...skills })
      .then((r) => { if (r) setCloseSaved(true); }, () => { /* best effort */ });
  };
  const doSave = (embedId: string | null = null) => {
    const session = toSession(state, sessionId.current, content.version);
    if (!session) return;
    if (!user) { setSave('signed-out'); return; }
    setSave('saving');
    saveFindTheFeelingSession(session)
      .then(() => { setSave('saved'); wrap(embedId); })
      .catch((e: { code?: string }) => {
        if (e?.code === 'functions/already-exists') { setSave('saved'); wrap(embedId); } else setSave('error');
      });
  };
  const finished = state.step === 'next' || state.step === 'collection' || state.step === 'handoff';
  useEffect(() => {
    if (!finished || savedFor.current === sessionId.current) return;
    savedFor.current = sessionId.current;
    const embedId = state.step === 'handoff' && user ? newId() : null;
    doSave(embedId);
    if (state.step === 'handoff') onHandoff?.({ emotionId: state.word, band: state.band, intensityY: state.band ? content.flow.bandIntensity[state.band] : null, blank: state.pull === 'blank', toolSessionId: embedId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const restart = () => { sessionId.current = newId(); setSave('idle'); setCloseSaved(false); setTagGone(false); dispatch({ t: 'restart' }); };
  const tagRow = !tagGone && (
    <PartTagSlot toolId="find-the-feeling" toolSessionId={toolSession.id} thenVsNow={thenVsNowFromFtf(state.close)?.thenVsNow}
      saved={closeSaved} onGone={() => setTagGone(true)} />
  );

  // Parts on: "A part of you … right now." on the step right after the pull (parts.md, in the moment).
  // The tool only: inside the check-in nothing parts-related shows.
  const afterPull = entry === 'tool' && state.step !== 'pull' && history.stack[history.stack.length - 2]?.step === 'pull';
  const unblend = useUnblendLine('ftf', state.pull, afterPull);

  const o = c.orient;
  const slots: RoomProps['slots'] = {
    unblend,
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
        {tagRow}
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
            <button type="button" className={linkButton} onClick={() => doSave()}>{c.collection.retry}</button>
          </div>
        )}
        <button type="button" className={linkButton} onClick={restart}>{c.collection.again}</button>
        {tagRow}
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
