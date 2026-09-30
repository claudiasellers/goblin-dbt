import { AnimatePresence, LazyMotion, domAnimation, m } from 'motion/react';
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Close, SetOff, ShapeVec, UrgeId } from '../../../../data/findTheFeelingTypes';
import { NEUTRAL_SHAPE, SHAPE_DIMS, clampShape, fill } from '../../../../lib/findTheFeeling';
import { wordOnOffer, type FlowState } from '../../../../lib/findTheFeelingFlow';
import type { RoomProps } from '../roomTypes';
import { LiveStore, ROUND_STEP, clamp, displayedFeel, fromVec, regKindFor } from './feel';
import { DARK, LIGHT, hasWebGL, useDark, type StageItem, type StageProps } from './palette';
import { Regulate } from './Regulate';
import { Stage2D } from './Stage2D';
import './shape.css';

const GLStage = lazy(() => import('./GLStage'));

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const SET_OFF: SetOff[] = ['someone', 'situation', 'body', 'nothing', 'not_sure'];
const EASE = [0.2, 0.8, 0.2, 1] as const;
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** Room entry point (lazy-loaded by the page). */
export default function ShapeRoom(props: RoomProps) {
  return (
    <LazyMotion features={domAnimation}>
      <Room {...props} />
    </LazyMotion>
  );
}

/** Falls back to the SVG stage if the WebGL canvas fails after the up-front check passed. */
class GLBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function useLater() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => { ids.current.forEach(id => window.clearTimeout(id)); }, []);
  return useCallback((fn: () => void, ms: number) => { ids.current.push(window.setTimeout(fn, ms)); }, []);
}

const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* optional */ } };

function Plaque({ onClick, children, testid, disabled }: { onClick: () => void; children: ReactNode; testid?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} aria-disabled={disabled} data-testid={testid} className="sr-plaque sr-choice">
      {children}
    </button>
  );
}

function Top({ kicker, title, children, reduce }: { kicker?: string; title?: ReactNode; children?: ReactNode; reduce: boolean }) {
  return (
    <m.div className="sr-top"
      initial={{ opacity: 0, y: reduce ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE, delay: reduce ? 0 : 0.15 }}>
      {kicker && <p className="sr-kicker">{kicker}</p>}
      {title && <h2 className="sr-title">{title}</h2>}
      {children}
    </m.div>
  );
}

function Bottom({ children, reduce }: { children: ReactNode; reduce: boolean }) {
  return (
    <m.div className="sr-bottom"
      initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : 8, transition: { duration: 0.2 } }}
      transition={{ duration: reduce ? 0.2 : 0.7, ease: EASE, delay: reduce ? 0 : 0.3 }}>
      {children}
    </m.div>
  );
}

/** A panel in the app's own tokens, for the page's slots (orient, next, save status). */
function SlotCard({ children, testid }: { children: ReactNode; testid?: string }) {
  return <div data-testid={testid} className="sr-card">{children}</div>;
}

function Room({ content, state, dispatch, name, collection, reducedMotion: reduce, slots }: RoomProps) {
  const c = content.flow.copy;
  const gates = content.flow.gates;
  const dark = useDark();
  const pal = dark ? DARK : LIGHT;
  const [gl, setGl] = useState(hasWebGL);
  const later = useLater();
  const t = useCallback((s: string, vars: Record<string, string | number> = {}) => fill(s, { name: name ?? '', ...vars }), [name]);
  const step = state.step;

  const [store] = useState(() => new LiveStore());
  const regProgress = useRef(0);

  // ── local, per-step UI state (reset whenever the step changes) ──
  const [round, setRound] = useState(0);
  const [findVec, setFindVec] = useState<ShapeVec>(NEUTRAL_SHAPE);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<UrgeId | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [prevStep, setPrevStep] = useState(step);
  if (prevStep !== step) {
    setPrevStep(step);
    setBusy(false); setPicked(null); setAccepting(false);
    if (step === 'find') { setRound(0); setFindVec(NEUTRAL_SHAPE); }
  }

  const allWords = useMemo(() => new Map(content.families.flatMap(f => f.words).map(w => [w.emotionId, w])), [content.families]);
  const wordName = (id: string | null) => (id ? (allWords.get(id)?.name ?? id).toLowerCase() : null);
  const offer = step === 'word' ? wordOnOffer(content, state) : null;

  // ── what the main object shows ──
  const latest = useRef({ state, findVec, picked });
  useEffect(() => { latest.current = { state, findVec, picked }; });
  const target = useCallback((s: FlowState, fv: ShapeVec, pk: UrgeId | null) =>
    s.step === 'intro' || s.step === 'find' || !s.found ? fromVec(fv) : displayedFeel(s, gates, regProgress.current, pk), [gates]);
  useEffect(() => {
    store.setReduce(reduce);
    store.setMain(target(state, findVec, picked));
  }, [state, findVec, picked, reduce, target, store]);
  /** Delayed moves (so a pick can land visibly) are dropped if the step changed meanwhile, e.g. via Back. */
  const laterOn = (onStep: FlowState['step'], fn: () => void, ms: number) => later(() => { if (latest.current.state.step === onStep) fn(); }, ms);
  const onRegProgress = useCallback((p: number) => {
    regProgress.current = p;
    const l = latest.current;
    store.setMain(target(l.state, l.findVec, l.picked));
  }, [target, store]);

  // ── find: five forced-choice rounds ──
  const nRounds = Math.min(SHAPE_DIMS.length, c.shape.rounds.length || SHAPE_DIMS.length);
  const advance = (vec: ShapeVec) => {
    if (round >= nRounds - 1) dispatch({ t: 'found', found: { way: 'shape', vec: clampShape(vec) } });
    else setRound(r => r + 1);
    setBusy(false);
  };
  const onCloser = (sign: 1 | -1) => {
    if (busy || step !== 'find') return;
    setBusy(true);
    const next = [...findVec] as ShapeVec;
    next[round] = clamp(next[round] + sign * ROUND_STEP);
    setFindVec(next);
    store.bumpPop();
    vibrate(8);
    laterOn('find', () => advance(next), reduce ? 350 : 1100);
  };
  const onCantTell = () => {
    if (busy || step !== 'find') return;
    setBusy(true);
    laterOn('find', () => advance(findVec), 250);
  };

  const onPull = (id: UrgeId) => {
    if (picked || step !== 'pull') return;
    setPicked(id);
    laterOn('pull', () => dispatch({ t: 'pull', pull: id }), reduce ? 250 : 900);
  };

  const onWord = (answer: 'yes' | 'close' | 'no') => {
    if (accepting) return;
    if (answer === 'no' || !offer) { dispatch({ t: 'word', answer }); return; }
    setAccepting(true);
    vibrate(10);
    laterOn('word', () => dispatch({ t: 'word', answer }), reduce ? 400 : 1500);
  };

  const regKind = step === 'regulate' ? regKindFor(state, gates) : null;
  const urges = useMemo(() => [...content.urges].sort((a, b) => a.order - b.order).map(u => ({ id: u.id, label: u.label, sub: u.sub })), [content.urges]);

  // ── collection: the shelf ──
  const found = state.found?.way === 'shape' ? state.found.vec : null;
  const shelf: StageItem[] = useMemo(() => [...collection]
    .filter(w => w.emotionId !== state.word)
    .sort((a, b) => a.firstAt.localeCompare(b.firstAt))
    .map(w => ({ key: w.emotionId, name: w.name.toLowerCase(), feel: w.shape ? fromVec(w.shape) : fromVec(NEUTRAL_SHAPE, 0.5) })), [collection, state.word]);
  const fresh: StageItem | null = state.word && found ? { key: `new-${state.word}`, name: wordName(state.word) ?? '', feel: fromVec(found) } : null;

  const engraved = step === 'word' && accepting && offer ? offer.name.toLowerCase()
    : (step === 'setOff' || step === 'handoff' || step === 'next') ? wordName(state.word) : null;

  const roundLabels = (c.shape.rounds[round] ?? ['+', '−']) as [string, string];
  const stageProps: StageProps = {
    step, pal, dark, reduce, store,
    round, flip: round % 2 === 1, roundDim: round, roundLabels, onCloser, roundBusy: busy,
    urges, picked, onPull,
    thenFeel: found ? fromVec(found) : null, thenLabel: c.close.then, nowLabel: c.close.now,
    engraved, shelf, fresh,
  };

  const setOffLabel = (k: SetOff) => c.setOff[k];
  const wordNote = step === 'setOff' && !state.word && state.offer.offered.length > 0 ? c.word.none : null;

  const vars = {
    '--wall': pal.wall, '--ink': pal.ink, '--ink2': pal.ink2, '--paper': pal.paper, '--line': pal.line, '--brass': pal.brass,
  } as CSSProperties;

  return (
    <div data-shape-room className={`sr-root ${reduce ? 'sr-reduce' : ''}`} style={vars}>
      {gl ? (
        <GLBoundary onFail={() => setGl(false)}>
          <Suspense fallback={null}><GLStage {...stageProps} /></Suspense>
        </GLBoundary>
      ) : <Stage2D {...stageProps} />}

      {/* the room's air: vignette + grain */}
      <div className="sr-fill sr-none sr-z5" style={{ background: `radial-gradient(120% 80% at 50% 38%, transparent 55%, ${dark ? 'rgba(0,0,0,.45)' : 'rgba(60,40,20,.14)'} 100%)` }} />
      <div className="sr-fill sr-none sr-z6" style={{ opacity: 0.06, mixBlendMode: 'multiply', backgroundImage: GRAIN }} />

      {slots.back && step !== 'handoff' && <div className="sr-back" data-testid="back-slot">{slots.back}</div>}

      <AnimatePresence>
        {step === 'intro' && (
          <m.div key="intro" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Top reduce={reduce} kicker={t(c.entry.title)} />
            <Bottom reduce={reduce}>
              <p className="sr-kicker">{t(c.entry.sub)}</p>
              <p className="sr-lede">{t(c.shape.intro)}</p>
              <button type="button" onClick={() => dispatch({ t: 'begin' })} className="sr-go" data-testid="begin">
                {t(c.shape.begin)} <span aria-hidden>→</span>
              </button>
              <div className="sr-col-start">
                <button type="button" onClick={() => dispatch({ t: 'switchWay', way: 'tune' })} className="sr-quiet" data-testid="switch-tune">
                  {t(c.entry.switchToTune)}
                </button>
                {c.entry.tuneHint && <p className="sr-small">{t(c.entry.tuneHint)}</p>}
              </div>
            </Bottom>
          </m.div>
        )}

        {step === 'find' && (
          <m.div key="find" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Top reduce={reduce} kicker={`${ROMAN[round] ?? round + 1} / ${ROMAN[nRounds - 1] ?? nRounds}`} title={t(c.shape.round)} />
            <div className="sr-bottom-bare">
              <button type="button" aria-disabled={busy} onClick={onCantTell} className="sr-quiet" data-testid="cant-tell">{t(c.shape.cantTell)}</button>
              <button type="button" onClick={() => dispatch({ t: 'switchWay', way: 'tune' })} className="sr-quiet" data-testid="switch-tune">{t(c.entry.switchToTune)}</button>
            </div>
          </m.div>
        )}

        {step === 'pull' && (
          <m.div key="pull" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Top reduce={reduce} title={t(c.pull.title)} />
          </m.div>
        )}

        {step === 'regulate' && regKind && (
          <m.div key="regulate" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Regulate kind={regKind} store={store} reduce={reduce} gates={gates}
              copy={regKind === 'smooth'
                ? { title: t(c.shape.smooth.title), sub: t(c.shape.smooth.sub), tooFast: t(c.shape.smooth.tooFast), hold: t(c.shape.smooth.hold), enough: t(c.shape.smooth.enough) }
                : { title: t(c.shape.warm.title), sub: t(c.shape.warm.sub), hold: t(c.shape.warm.hold), enough: t(c.shape.warm.enough) }}
              onProgress={onRegProgress} onDone={skipped => dispatch({ t: 'regulated', skipped })} />
          </m.div>
        )}

        {step === 'orient' && (
          <m.div key="orient" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Top reduce={reduce} title={t(c.orient.title)}>
              <p className="sr-sub">{t(c.orient.sub)}</p>
            </Top>
            <Bottom reduce={reduce}>
              {c.word.floodedBlank && <p className="sr-note" style={{ color: pal.ink }}>{t(c.word.floodedBlank)}</p>}
              <SlotCard testid="orient-card">{slots.orient}</SlotCard>
            </Bottom>
          </m.div>
        )}

        {step === 'word' && (
          <m.div key="word" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Bottom reduce={reduce}>
              <div className="sr-plaque sr-placard">
                <p className="sr-small" style={{ fontSize: 15 }}>{offer ? t(c.shape.wordLead) : t(c.word.none)}</p>
                <AnimatePresence mode="wait">
                  <m.p key={offer?.emotionId ?? 'none'} className="sr-word" data-testid="word-offer" aria-live="polite"
                    initial={{ opacity: 0, y: reduce ? 0 : 6, filter: reduce ? 'none' : 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: reduce ? 'none' : 'blur(4px)' }} transition={{ duration: reduce ? 0.15 : 0.45 }}>
                    {offer ? offer.name.toLowerCase() : '—'}
                  </m.p>
                </AnimatePresence>
              </div>
              <div className="sr-row sr-answers">
                {offer ? (['yes', 'close', 'no'] as const).map(a => (
                  <button key={a} type="button" onClick={() => onWord(a)} aria-disabled={accepting} className="sr-answer" data-testid={`word-${a}`}>
                    {t(c.word[a])}
                  </button>
                )) : (
                  <button type="button" onClick={() => onWord('no')} className="sr-answer" style={{ marginLeft: 'auto' }} data-testid="word-continue" aria-label={t(c.word.none)}>→</button>
                )}
              </div>
            </Bottom>
          </m.div>
        )}

        {step === 'setOff' && (
          <m.div key="setOff" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Bottom reduce={reduce}>
              {wordNote && <p className="sr-note">{t(wordNote)}</p>}
              <h2 className="sr-h" style={{ marginBottom: 12 }}>{t(c.setOff.title)}</h2>
              <div className="sr-stack">
                {SET_OFF.map(k => <Plaque key={k} onClick={() => dispatch({ t: 'setOff', value: k })} testid={`setoff-${k}`}>{t(setOffLabel(k))}</Plaque>)}
              </div>
              <div className="sr-center" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => dispatch({ t: 'setOff', value: null })} className="sr-quiet" data-testid="setoff-skip">{t(c.setOff.skip)}</button>
              </div>
            </Bottom>
          </m.div>
        )}

        {step === 'close' && (
          <m.div key="close" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Top reduce={reduce} title={t(c.close.prompt)} />
            <Bottom reduce={reduce}>
              <div>
                {(Object.keys(c.close.options) as Close[]).map(k => (
                  <button key={k} type="button" onClick={() => dispatch({ t: 'close', value: k })} className="sr-close" data-testid={`close-${k}`}>
                    <span>{t(c.close.options[k])}</span><span aria-hidden>→</span>
                  </button>
                ))}
              </div>
            </Bottom>
          </m.div>
        )}

        {step === 'next' && (
          <m.div key="next" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Bottom reduce={reduce}>
              <h2 className="sr-h">{t(c.next.title)}</h2>
              <p className="sr-note" style={{ marginTop: 4 }}>{t(c.next.sub)}</p>
              <SlotCard testid="next-card">{slots.next}</SlotCard>
            </Bottom>
          </m.div>
        )}

        {step === 'collection' && (
          <m.div key="collection" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Top reduce={reduce} kicker={t(c.collection.title)} title={t(c.shape.shelf)}>
              <p className="sr-sub" data-testid="collection-line">
                {state.word ? t(c.collection.new, { word: wordName(state.word) ?? '' }) : t(c.collection.noWord)}
              </p>
              {shelf.length === 0 && !fresh && <p className="sr-sub">{t(c.collection.empty)}</p>}
            </Top>
            <Bottom reduce={reduce}>
              <SlotCard testid="save-card">{slots.saveStatus}</SlotCard>
            </Bottom>
          </m.div>
        )}

        {step === 'handoff' && (
          <m.div key="handoff" style={{ display: 'contents' }} exit={{ opacity: 0 }}>
            <Bottom reduce={reduce}>
              <div className="sr-plaque sr-placard" data-testid="handoff">
                <p className="sr-kicker">{t(c.entry.title)}</p>
                <p style={{ marginTop: 8, fontSize: 17, lineHeight: 1.4, color: pal.ink }}>
                  {state.word ? t(c.collection.new, { word: wordName(state.word) ?? '' }) : t(c.collection.noWord)}
                </p>
              </div>
            </Bottom>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
