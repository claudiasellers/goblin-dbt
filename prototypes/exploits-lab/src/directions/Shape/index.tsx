import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PCFShadowMap } from 'three';
import type { DirectionProps, SessionRecord } from '../../record';
import { askUnlocked } from '../../record';
import { CAPACITY, EXITS, SCENARIOS, VALIDATION_FOLLOW, validationFor, type Band, type Pull, type Scenario } from '../../script';
import type { ShapeStore } from './Blob';
import { NEUTRAL, ROUNDS, STEP, candidates, clamp, copyFeel, medium, type Feel } from './features';
import { Regulate } from './Regulate';
import { DARK, LIGHT, ShapeScene, type Palette, type Step } from './Scene';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const CLOSES: { id: SessionRecord['close']; label: string }[] = [
  { id: 'louder', label: 'Then' },
  { id: 'same', label: 'Somewhere between' },
  { id: 'quieter', label: 'Now' },
  { id: 'much', label: 'Now, and even calmer' },
];

function useDark() {
  const get = () => {
    const attr = document.documentElement.dataset.theme;
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  };
  const [dark, setDark] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => setDark(get());
    mq?.addEventListener('change', on);
    const mo = new MutationObserver(on); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq?.removeEventListener('change', on); mo.disconnect(); };
  }, []);
  return dark;
}

const STYLE = `
.shape-root .kicker{font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;font-weight:500}
.shape-root .plaque{display:flex;align-items:center;justify-content:center;border:1px solid;border-radius:3px;
  box-shadow:0 1px 0 rgba(255,255,255,.35) inset,0 10px 24px -16px rgba(0,0,0,.45),0 2px 4px -2px rgba(0,0,0,.12);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.shape-root .plaque:active,.shape-root .plaque[data-held=true]{transform:translateY(1px) scale(.985);box-shadow:0 4px 10px -8px rgba(0,0,0,.4)}
.shape-root .quiet{text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:1px;text-decoration-color:currentColor}
.shape-root .fade-up{background:linear-gradient(to top,var(--wall) 0%,color-mix(in oklab,var(--wall) 92%,transparent) 55%,transparent 100%)}
.shape-root .fade-down{background:linear-gradient(to bottom,var(--wall) 0%,color-mix(in oklab,var(--wall) 85%,transparent) 60%,transparent 100%)}
.engrave>span{display:inline-block;opacity:0;animation:shape-engrave .7s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes shape-engrave{0%{opacity:0;filter:blur(3px);transform:translateY(-3px) scale(1.25)}100%{opacity:1;filter:blur(0);transform:none}}
@media (prefers-reduced-motion: reduce){.engrave>span{animation:none;opacity:1}}
`;

function Plaque({ pal, onClick, children, disabled, tag, testid }: { pal: Palette; onClick?: () => void; children: ReactNode; disabled?: boolean; tag?: string; testid?: string }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} aria-disabled={disabled} data-testid={testid}
      className="plaque relative w-full min-h-[52px] px-4 py-3 text-left !justify-start"
      style={{ background: pal.paper, borderColor: pal.line, color: pal.ink, opacity: disabled ? 0.62 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      <span className="flex flex-col gap-0.5 w-full">{children}</span>
      {tag && <span className="kicker absolute -top-2 right-3 px-1.5 py-0.5 text-[9px]! tracking-[0.2em]!" style={{ background: pal.brass, color: pal.paper.startsWith('rgba(250') ? '#fbf6ec' : '#1b1418', borderRadius: 2 }}>{tag}</span>}
    </button>
  );
}

function Top({ pal, kicker, title, children, reduce }: { pal: Palette; kicker?: string; title: ReactNode; children?: ReactNode; reduce: boolean }) {
  return (
    <motion.div className="absolute inset-x-0 top-0 z-30 px-6 pt-6 pb-10 pointer-events-none"
      initial={{ opacity: 0, y: reduce ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}>
      {kicker && <p className="kicker" style={{ color: pal.ink2 }}>{kicker}</p>}
      <h2 className="mt-2 text-[24px] leading-[1.18] font-normal tracking-[-0.01em]" style={{ color: pal.ink }}>{title}</h2>
      {children}
    </motion.div>
  );
}

function Bottom({ children, reduce, className = '' }: { children: ReactNode; reduce: boolean; className?: string }) {
  return (
    <motion.div className={`absolute inset-x-0 bottom-0 z-30 px-5 pb-6 pt-14 fade-up ${className}`}
      initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : 8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.35 }}>
      {children}
    </motion.div>
  );
}

function Session({ onRecord, onRestart }: DirectionProps & { onRestart: () => void }) {
  const dark = useDark();
  const pal = dark ? DARK : LIGHT;
  const reduce = !!useReducedMotion();
  const store = useRef<ShapeStore>({ main: copyFeel(NEUTRAL), start: null, flinch: 0, pop: 0, screen: { x: 0, y: 0, r: 60 }, reduce });
  store.current.reduce = reduce;

  const [step, setStep] = useState<Step>('intro');
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notif, setNotif] = useState(false);
  const [band, setBand] = useState<Band | null>(null);
  const [pull, setPull] = useState<Pull | null>(null);
  const [cands, setCands] = useState<string[]>([]);
  const [ci, setCi] = useState(0);
  const [nots, setNots] = useState(0);
  const [word, setWord] = useState<string | null | undefined>(undefined);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [exitId, setExitId] = useState<SessionRecord['exitId'] | null>(null);
  const [startFeel, setStartFeel] = useState<Feel | null>(null);
  const recorded = useRef(false);

  const go = useCallback((s: Step, delay = 0) => { if (delay) window.setTimeout(() => setStep(s), delay); else setStep(s); }, []);

  // closer rounds
  const r = ROUNDS[Math.min(round, 4)];
  const flip = round % 2 === 1;
  const nextRound = () => {
    if (round >= 4) {
      const snap = copyFeel(store.current.main);
      store.current.start = snap; setStartFeel(snap);
      go('capacity');
    } else setRound(x => x + 1);
    setBusy(false);
  };
  const onCloser = (sign: 1 | -1) => {
    if (busy || step !== 'closer') return;
    setBusy(true);
    const m = store.current.main;
    m[r.dim] = clamp(m[r.dim] + sign * STEP);
    store.current.pop++;
    try { navigator.vibrate?.(8); } catch { /* */ }
    window.setTimeout(nextRound, reduce ? 350 : 1100);
  };

  // capacity: the text arrives, the object flinches
  useEffect(() => {
    if (step !== 'capacity') return;
    const t = window.setTimeout(() => { setNotif(true); store.current.flinch = 1; try { navigator.vibrate?.([12, 60, 12]); } catch { /* */ } }, 900);
    return () => window.clearTimeout(t);
  }, [step]);
  const onBand = (b: Band) => {
    setBand(b);
    const m = store.current.main;
    if (b === 'flooded') { m.sharp = Math.max(m.sharp, 0.45); m.buzz = Math.max(m.buzz, 0.45); store.current.flinch = 0.8; }
    if (b === 'stirred') { m.sharp = clamp(m.sharp + 0.15); }
    go('pull', 450);
    window.setTimeout(() => setNotif(false), 300);
  };

  const onPull = (p: Pull) => {
    if (step !== 'pull' || pull) return;
    setPull(p);
    const m = store.current.main;
    if (p === 'blank') { m.grey = 1; m.buzz = -1; m.weight = Math.max(m.weight, 0.7); m.heat = Math.min(m.heat, -0.35); m.sharp = Math.min(m.sharp, 0); }
    const next: Step = p === 'blank' || band === 'flooded' ? 'regulate' : 'word';
    window.setTimeout(() => enter(next), 900);
  };

  const enter = (s: Step) => {
    if (s === 'word') { setCands(candidates(store.current.start ?? store.current.main)); setCi(0); setNots(0); setWord(undefined); }
    go(s);
  };

  const onWord = (a: 'yes' | 'close' | 'not') => {
    if (word !== undefined) return;
    if (a !== 'not') { setWord(cands[ci]); return; }
    const n = nots + 1; setNots(n);
    if (n >= 3 || ci + 1 >= cands.length) setWord(null); else setCi(ci + 1);
  };

  const onScenario = (s: Scenario) => {
    setScenario(s);
    // being understood settles things a little
    const m = store.current.main;
    m.sharp *= 0.8; m.buzz = m.buzz > 0 ? m.buzz * 0.7 : m.buzz; m.heat = m.heat > 0 ? m.heat * 0.8 : m.heat; m.grey *= 0.6;
    go('validate', 350);
  };

  const unlocked = band && pull ? askUnlocked(band, pull) : false;
  const best: SessionRecord['exitId'] = unlocked ? 'ask' : band === 'flooded' || pull === 'blank' ? 'opposite' : 'land';

  const onClose = (c: SessionRecord['close']) => {
    if (recorded.current || !scenario || !band || !pull || !exitId) return;
    recorded.current = true;
    const rec: SessionRecord = { scenarioId: scenario.id as SessionRecord['scenarioId'], band, pull, word: word ?? null, exitId, close: c };
    go('shelf', 200);
    window.setTimeout(() => onRecord?.(rec), 600);
  };

  const engraved = step === 'word' || step === 'what' || step === 'validate' || step === 'exits' ? (word === undefined ? null : word ?? 'untitled') : null;

  const canvas = (
    <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 2]} camera={{ fov: 40, position: [0, 0.9, 4.9], near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }} className="!absolute inset-0">
      <ShapeScene step={step} round={round} flip={flip} store={store.current} pal={pal} dark={dark} reduce={reduce}
        onCloser={onCloser} onPull={onPull} pull={pull} engraved={engraved} todayWord={word ?? null} todayFeel={startFeel} />
    </Canvas>
  );

  const cap = CAPACITY;

  return (
    <div className="shape-root relative h-full w-full overflow-hidden select-none" style={{ background: pal.wall, color: pal.ink, ['--wall' as string]: pal.wall }}>
      <style>{STYLE}</style>
      {canvas}
      {/* vignette + grain: the room's air */}
      <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: `radial-gradient(120% 80% at 50% 38%, transparent 55%, ${dark ? 'rgba(0,0,0,.45)' : 'rgba(60,40,20,.14)'} 100%)` }} />
      <div className="absolute inset-0 pointer-events-none z-[6] opacity-[.06] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />

      <AnimatePresence>
        {step === 'intro' && (
          <motion.div key="intro" className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker="Room I · A new work" title={<span />} />
            <Bottom reduce={reduce}>
              <p className="kicker" style={{ color: pal.ink2 }}>Untitled, today</p>
              <p className="mt-3 text-[26px] leading-[1.18] tracking-[-0.015em] font-light" style={{ color: pal.ink }}>
                Something happened with someone. Before words, let’s give it a shape.
              </p>
              <button type="button" onClick={() => go('closer')} className="quiet mt-5 min-h-11 text-[16px] font-medium inline-flex items-center gap-2" style={{ color: pal.ink }} data-testid="begin">
                Begin <span aria-hidden>→</span>
              </button>
            </Bottom>
          </motion.div>
        )}

        {step === 'closer' && (
          <motion.div key={`closer`} className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker={`Study ${ROMAN[round]} · ${r.title}`} title="Which is closer to what’s inside?" />
            <div className="absolute inset-x-0 bottom-0 z-30 pb-5 flex justify-center">
              <button type="button" disabled={busy} onClick={() => { setBusy(true); window.setTimeout(nextRound, 250); }}
                className="quiet min-h-11 px-4 text-[14px]" style={{ color: pal.ink2 }} data-testid="cant-tell">can’t tell</button>
            </div>
          </motion.div>
        )}

        {step === 'capacity' && (
          <motion.div key="capacity" className="contents" exit={{ opacity: 0 }}>
            <AnimatePresence>
              {notif && (
                <motion.div className="absolute inset-x-3 top-3 z-40 rounded-[18px] px-4 py-3 flex items-center gap-3"
                  initial={{ y: reduce ? 0 : -110, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : -110, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  style={{ background: dark ? 'rgba(48,40,50,.86)' : 'rgba(255,252,247,.86)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 18px 40px -18px rgba(0,0,0,.5)', border: `1px solid ${pal.line}` }}>
                  <span className="size-9 rounded-[10px] grid place-items-center text-[13px] font-semibold shrink-0" style={{ background: pal.brass, color: dark ? '#1b1418' : '#fbf6ec' }}>T</span>
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="flex justify-between text-[12px] font-semibold" style={{ color: pal.ink2 }}><span>Them</span><span className="font-normal">now</span></span>
                    <span className="text-[15px] truncate" style={{ color: pal.ink }}>{cap.incoming}</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div className="absolute inset-x-0 z-30 px-6 pointer-events-none" style={{ top: 92 }}
              initial={{ opacity: 0 }} animate={{ opacity: notif ? 1 : 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
              <p className="kicker" style={{ color: pal.ink2 }}>Incoming</p>
              <h2 className="mt-2 text-[24px] leading-[1.18] font-normal tracking-[-0.01em]">{cap.prompt}</h2>
            </motion.div>
            {notif && (
              <Bottom reduce={reduce}>
                <div className="flex flex-col gap-2.5">
                  {cap.options.map(o => (
                    <Plaque key={o.band} pal={pal} onClick={() => onBand(o.band)} testid={`band-${o.band}`}>
                      <span className="text-[16px] leading-snug">{o.reply}</span>
                      <span className="text-[13px] italic" style={{ color: pal.ink2 }}>{o.example}</span>
                    </Plaque>
                  ))}
                </div>
              </Bottom>
            )}
          </motion.div>
        )}

        {step === 'pull' && (
          <motion.div key="pull" className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker="Four studies of an urge" title="What does it want to do?">
              <p className="mt-1.5 text-[14px]" style={{ color: pal.ink2 }}>Tap the one that looks most like it.</p>
            </Top>
          </motion.div>
        )}

        {step === 'regulate' && (
          <motion.div key="reg" className="contents" exit={{ opacity: 0 }}>
            <Regulate kind={pull === 'blank' ? 'warm' : 'smooth'} store={store.current} pal={pal} reduce={reduce} onDone={() => enter('word')} />
          </motion.div>
        )}

        {step === 'word' && (
          <motion.div key="word" className="contents" exit={{ opacity: 0 }}>
            <Bottom reduce={reduce}>
              <div className="plaque !block px-5 pt-4 pb-4 text-left" style={{ background: pal.paper, borderColor: pal.line }}>
                <p className="text-[19px] italic leading-tight" style={{ color: pal.ink }}>Untitled</p>
                <p className="text-[12.5px] mt-1" style={{ color: pal.ink2 }}>{medium(store.current.start ?? store.current.main)}</p>
                <div className="my-3 h-px" style={{ background: pal.line }} />
                <p className="text-[14px]" style={{ color: pal.ink2 }}>
                  {word === null ? 'No word yet.' : 'Things shaped like this are often called'}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p key={word === null ? '∅' : cands[ci]} className="text-[32px] leading-[1.1] tracking-[-0.02em] font-light mt-0.5"
                    initial={{ opacity: 0, y: reduce ? 0 : 6, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.45 }} style={{ color: pal.ink }}>
                    {word === null ? '—' : cands[ci]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="mt-3 min-h-[76px]">
                {word === undefined ? (
                  <div className="flex items-center justify-between px-1">
                    {(['yes', 'close', 'not'] as const).map(a => (
                      <button key={a} type="button" onClick={() => onWord(a)} className="quiet min-h-11 px-3 text-[16px]" style={{ color: pal.ink }} data-testid={`word-${a}`}>
                        {a === 'yes' ? 'Yes' : a === 'close' ? 'Close' : 'Not that'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-end justify-between gap-4 px-1">
                    <p className="text-[14px] leading-snug" style={{ color: pal.ink2 }}>
                      {word ? 'Engraved. A guess you get to keep.' : 'Not knowing is fine. It still has a shape, and that’s enough to work with.'}
                    </p>
                    <button type="button" onClick={() => go('what')} className="quiet min-h-11 text-[16px] font-medium shrink-0" style={{ color: pal.ink }} data-testid="continue">Continue →</button>
                  </motion.div>
                )}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'what' && (
          <motion.div key="what" className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker="Provenance" title="What did they do?" />
            <Bottom reduce={reduce}>
              <div className="flex flex-col gap-2">
                {SCENARIOS.map(s => (
                  <Plaque key={s.id} pal={pal} onClick={() => onScenario(s)} testid={`scn-${s.id}`}>
                    <span className="kicker text-[9.5px]!" style={{ color: pal.ink2 }}>{s.short}</span>
                    <span className="text-[15px] leading-snug">{s.question}</span>
                  </Plaque>
                ))}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'validate' && scenario && (
          <motion.div key="validate" className="contents" exit={{ opacity: 0 }}>
            <Bottom reduce={reduce}>
              <div className="plaque !block px-5 py-5 text-left" style={{ background: pal.paper, borderColor: pal.line }}>
                <p className="kicker" style={{ color: pal.ink2 }}>Note</p>
                <p className="mt-2 text-[21px] leading-[1.25] tracking-[-0.01em]" style={{ color: pal.ink }}>{validationFor(scenario)}</p>
                <p className="mt-3 text-[15px] leading-snug" style={{ color: pal.ink2 }}>{VALIDATION_FOLLOW}</p>
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => go('exits')} className="quiet min-h-11 px-1 text-[16px] font-medium" style={{ color: pal.ink }} data-testid="continue">Continue →</button>
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'exits' && pull && (
          <motion.div key="exits" className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker="Leaving the room" title="Where do you take it from here?" />
            <Bottom reduce={reduce}>
              <div className="flex flex-col gap-3">
                {([
                  { id: 'ask' as const, ...EXITS.steady, locked: !unlocked },
                  { id: 'land' as const, ...EXITS.land, locked: false },
                  { id: 'opposite' as const, ...EXITS.opposite[pull], locked: false },
                ]).map(x => (
                  <Plaque key={x.id} pal={pal} disabled={x.locked} tag={x.id === best ? 'Start here' : undefined} testid={`exit-${x.id}`}
                    onClick={() => { setExitId(x.id); go('close', 250); }}>
                    <span className="text-[16px] leading-snug flex items-center gap-2">
                      {x.locked && <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden><rect x="1" y="6" width="10" height="7.5" rx="1.2" fill="none" stroke="currentColor" /><path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" /></svg>}
                      {x.title}
                    </span>
                    <span className="text-[13px] leading-snug" style={{ color: pal.ink2 }}>{x.locked ? 'Opens once it’s quieter.' : x.body}</span>
                  </Plaque>
                ))}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'close' && (
          <motion.div key="close" className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker="Two states of one work" title="Which is closer to how you feel right now?" />
            <Bottom reduce={reduce}>
              <div className="flex flex-col">
                {CLOSES.map((c, i) => (
                  <button key={c.id} type="button" onClick={() => onClose(c.id)} className="min-h-12 text-left text-[17px] flex items-center justify-between gap-3"
                    style={{ color: pal.ink, borderTop: i ? `1px solid ${pal.line}` : undefined }} data-testid={`close-${c.id}`}>
                    <span>{c.label}</span><span aria-hidden className="text-[14px]" style={{ color: pal.ink2 }}>→</span>
                  </button>
                ))}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'shelf' && (
          <motion.div key="shelf" className="contents" exit={{ opacity: 0 }}>
            <Top pal={pal} reduce={reduce} kicker="The collection" title="Your shelf">
              <p className="mt-1.5 text-[14px] leading-snug max-w-[300px]" style={{ color: pal.ink2 }}>
                {word ? `“${word}” joins the others. Naming a feeling is a skill, and you just used it.` : 'No word this time. The shape still earns its place.'}
              </p>
            </Top>
            <Bottom reduce={reduce}>
              <div className="flex justify-center">
                <button type="button" onClick={onRestart} className="quiet min-h-11 px-3 text-[15px]" style={{ color: pal.ink2 }} data-testid="restart">Start again</button>
              </div>
            </Bottom>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export function Shape({ onRecord }: DirectionProps) {
  const [run, setRun] = useState(0);
  return <Session key={run} onRecord={onRecord} onRestart={() => setRun(r => r + 1)} />;
}
