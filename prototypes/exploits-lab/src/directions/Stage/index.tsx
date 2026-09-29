import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PCFShadowMap, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { DirectionProps, SessionRecord } from '../../record';
import { askUnlocked } from '../../record';
import { CAPACITY, EXITS, PULLS, SCENARIOS, VALIDATION_FOLLOW, validationFor, type Band, type Pull, type Scenario } from '../../script';
import {
  DARK, FIG_H, LIGHT, OTHER_IDS, R, READING, WALK, centroid, clamp, clampToStage, cloneArr, dist, huddleFor, len, readPull, readScene,
  type Arr, type Cue, type FigId, type P2, type Pal, type ScenarioId, type Step,
} from './model';
import { DRUM, FOV, MINI, SHELF_SLOTS, SHELF_X, StageScene, type SceneUI } from './Scene';
import { STAGE_RY, applyArr, makeStore, type Cam, type StageStore } from './store';

// ------------------------------------------------------------------ theme
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

function useSerif() {
  useEffect(() => {
    if (document.getElementById('stage-serif')) return;
    const l = document.createElement('link');
    l.id = 'stage-serif'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..600;1,400..600&display=swap';
    document.head.appendChild(l);
  }, []);
}

const SERIF = `Lora, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif`;

const CSS = (p: Pal) => `
.stage-root{--ink:${p.ink};--ink2:${p.ink2};--line:${p.line};--paper:${p.paper};--paper-solid:${p.paperSolid};--bg:${p.bg};--accent:${p.accent};--rust:${p.rust}}
.stage-root .serif{font-family:${SERIF}}
.stage-root .sc{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;font-weight:600;font-family:"DM Sans",ui-sans-serif,system-ui,sans-serif}
.stage-root .rule{display:inline-block;width:22px;height:1px;background:currentColor;opacity:.5;vertical-align:middle;margin-right:10px}
.stage-root .cue{font-family:${SERIF};font-style:italic;font-size:15px;line-height:1.2;min-height:44px;display:flex;align-items:center;gap:6px;text-align:left;
  color:var(--ink);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--ink) 35%,transparent);text-underline-offset:5px;text-decoration-thickness:1px}
.stage-root .cue[data-on=true]{color:var(--accent);text-decoration-color:color-mix(in srgb,var(--accent) 60%,transparent)}
.stage-root .cue:active{transform:translateY(1px)}
.stage-root .plaque{display:flex;flex-direction:column;gap:2px;width:100%;min-height:52px;padding:11px 16px;text-align:left;border:1px solid var(--line);border-radius:3px;
  background:var(--paper);color:var(--ink);box-shadow:0 1px 0 rgba(255,255,255,.3) inset,0 12px 26px -18px rgba(0,0,0,.5);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .2s}
.stage-root .plaque:active{transform:translateY(1px) scale(.99)}
.stage-root .plaque[data-sel=true]{border-color:var(--accent)}
.stage-root .go{white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:0 22px;border-radius:2px;background:var(--ink);color:var(--bg);
  font-size:11.5px;letter-spacing:.24em;text-transform:uppercase;font-weight:600;box-shadow:0 12px 24px -14px rgba(0,0,0,.55)}
.stage-root .go:active{transform:translateY(1px)}
.stage-root .quiet{font-size:14px;min-height:44px;color:var(--ink2);text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:1px;text-decoration-color:color-mix(in srgb,var(--ink2) 45%,transparent)}
.stage-root .tray{background:var(--bg);box-shadow:0 -1px 0 var(--line),0 -22px 22px -8px color-mix(in srgb,var(--bg) 80%,transparent)}
@media (max-height:720px){.stage-root .hint-line{display:none}}
.stage-root .fade-up{background:linear-gradient(to top,var(--bg) 0%,color-mix(in srgb,var(--bg) 94%,transparent) 62%,transparent 100%)}
.stage-root .fade-down{background:linear-gradient(to bottom,var(--bg) 0%,color-mix(in srgb,var(--bg) 88%,transparent) 55%,transparent 100%)}
.stage-root .handle{position:relative;display:grid;place-items:center;width:30px;height:30px;border-radius:99px;border:1px solid var(--line);background:var(--paper);color:var(--ink);
  box-shadow:0 6px 14px -8px rgba(0,0,0,.5)}
.stage-root .handle-label{position:absolute;left:50%;bottom:35px;transform:translateX(-50%);font:600 8.5px/1 "DM Sans",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--ink2);white-space:nowrap}
.stage-root .name-tag{display:block;padding-top:8px;font:600 9px/1 "DM Sans",sans-serif;letter-spacing:.26em;text-transform:uppercase;white-space:nowrap;opacity:.9}
.stage-root .incoming{width:176px;margin-bottom:10px;padding:9px 12px 10px;border-radius:12px;background:var(--paper-solid);color:var(--ink);border:1px solid var(--line);
  box-shadow:0 16px 30px -16px rgba(0,0,0,.55);position:relative;animation:stage-rise .6s cubic-bezier(.2,.9,.25,1.2) both}
.stage-root .incoming:after{content:"";position:absolute;left:var(--tail,50%);bottom:-6px;width:10px;height:10px;background:var(--paper-solid);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:translateX(-50%) rotate(45deg)}
.stage-root .incoming-top{display:flex;justify-content:space-between;font:600 9.5px/1.2 "DM Sans",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--ink2)}
.stage-root .incoming-text{margin-top:4px;font-size:15px;line-height:1.25}
.stage-root .hypo{display:flex;flex-direction:column;align-items:center;text-align:center;width:max-content;max-width:240px;animation:stage-rise .8s cubic-bezier(.2,.8,.2,1) both}
.stage-root .hypo-card{padding:10px 14px 12px;border-radius:3px;background:var(--paper);border:1px solid var(--line);box-shadow:0 14px 30px -18px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.stage-root .hypo-lead{font-family:${SERIF};font-style:italic;font-size:13px;color:var(--ink2);white-space:nowrap}
.stage-root .hypo-word{font-family:${SERIF};font-size:30px;line-height:1.15;color:var(--ink);letter-spacing:-.01em;animation:stage-word .6s cubic-bezier(.2,.8,.2,1) both}
.stage-root .hypo-stem{align-self:flex-start;margin-left:var(--tail,50%);width:1px;height:30px;background:linear-gradient(var(--ink2),transparent)}
.stage-root .caption{font-family:${SERIF};font-style:italic;font-size:15px;color:var(--ink);white-space:nowrap;margin-bottom:10px;padding:3px 8px;border-radius:2px;background:var(--paper);animation:stage-rise .6s ease both}
.stage-root .stage-label{font:600 10px/1 "DM Sans",sans-serif;letter-spacing:.3em;text-transform:uppercase;white-space:nowrap}
.stage-root .shelf-label{font-family:${SERIF};font-style:italic;font-size:13px;white-space:nowrap}
.stage-root .shelf-today{font-size:14px;font-weight:600;animation:stage-word .8s ease both}
.stage-root .find-hit{width:64px;height:64px;border-radius:99px;background:transparent;border:0}
.stage-root .find-hit:focus-visible{outline:2px dashed var(--accent);outline-offset:0}
.stage-root .lamp{width:9px;height:9px;border-radius:99px;border:1px solid var(--ink2);transition:all .6s}
.stage-root .lamp[data-on=true]{background:var(--accent);border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent),0 0 14px var(--accent)}
@keyframes stage-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes stage-word{from{opacity:0;filter:blur(4px)}to{opacity:1;filter:none}}
@media (prefers-reduced-motion: reduce){.stage-root .incoming,.stage-root .hypo,.stage-root .hypo-word,.stage-root .caption{animation:none}}
`;

// ------------------------------------------------------------------ camera poses
type Pose = Partial<Cam>;
const BASE: Cam = { span: 3.6, elev: 0.74, azim: 0, tx: 0, ty: 0.3, tz: 0, frac: 0.45, fit: 0 };
const POSE: Record<Step, Pose> = {
  set: { ...BASE, fit: 1 },
  closest: { ...BASE, span: 4.4, frac: 0.25 },
  capacity: { ...BASE, span: 3.5, elev: 0.46, ty: 0.5, frac: 0.47 },
  pull: { ...BASE, span: 4.3, elev: 0.78, ty: 0.2, frac: 0.44 },
  breathe: BASE,
  wake: { ...BASE, span: 4.1, elev: 0.34, ty: 0.78, tz: -0.2, frac: 0.47 },
  word: {},
  validate: {},
  need: { ...BASE, fit: 1 },
  exits: { ...BASE, span: 4.5, frac: 0.31 },
  perform: { ...BASE, span: 3.9, frac: 0.39 },
  close: { ...BASE, span: 5.1, elev: 0.6, ty: 0.15, frac: 0.42 },
  shelf: { span: 4.95, elev: 0.16, azim: 0, tx: SHELF_X, ty: 0.72, tz: 0, frac: 0.5, fit: 0 },
};
/** Stepping back: z = 0 on the stage, 1 = the whole room. */
function zoomPose(z: number): Cam {
  const e = z;
  return { span: 3.6 * Math.pow(30 / 3.6, e), elev: 0.74 + 0.3 * e, azim: 0.12 * e, tx: 0, ty: 0.3 * (1 - e), tz: 0, frac: 0.45 + 0.08 * e, fit: 0 };
}

const CLOSES: { id: SessionRecord['close']; label: string }[] = [
  { id: 'louder', label: 'Then' },
  { id: 'same', label: 'In between' },
  { id: 'quieter', label: 'Now' },
  { id: 'much', label: 'Now, and lighter' },
];

const TAP_PULLS: { id: Pull; cue: string }[] = [
  { id: 'chase', cue: '(walk toward them, slowly)' },
  { id: 'fight', cue: '(rush at them)' },
  { id: 'hide', cue: '(back away, off the edge)' },
  { id: 'blank', cue: '(it won’t move. I’m blank)' },
];
const EXIT_CAPTION: Record<string, string> = {
  chase: '(sits, and waits)', fight: '(steps back)', hide: '(says hi)', blank: '(stands up, looks around)',
  ask: '(asks to be heard)', land: '(lets it land)',
};
const FIND: { id: 'blue' | 'round' | 'high'; ask: string; name: string }[] = [
  { id: 'blue', ask: 'Find something blue.', name: 'the blue box' },
  { id: 'round', ask: 'Now something round.', name: 'the moon' },
  { id: 'high', ask: 'And the highest thing.', name: 'the star' },
];

const buzz = (p: number | number[] = 8) => { try { navigator.vibrate?.(p); } catch { /* */ } };

// ------------------------------------------------------------------ overlay pieces
function Top({ kicker, title, sub, children, k }: { kicker: string; title: ReactNode; sub?: ReactNode; children?: ReactNode; k: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div key={k} className="absolute inset-x-0 top-0 z-30 px-6 pt-5 pb-12 fade-down pointer-events-none"
      initial={{ opacity: 0, y: reduce ? 0 : -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}>
      <div data-safe-top>
        <p className="sc" style={{ color: 'var(--ink2)' }}><span className="rule" />{kicker}</p>
        <h2 className="serif mt-2 text-[25px] leading-[1.16] tracking-[-0.01em] font-normal" style={{ color: 'var(--ink)' }}>{title}</h2>
        {sub && <p className="mt-1.5 text-[14px] leading-snug max-w-[330px]" style={{ color: 'var(--ink2)' }}>{sub}</p>}
        {children}
      </div>
    </motion.div>
  );
}
function Bottom({ children, k, solid }: { children: ReactNode; k: string; solid?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div key={k} className={`absolute inset-x-0 bottom-0 z-30 px-5 pb-5 ${solid ? 'pt-2 tray' : 'pt-12 fade-up'}`} data-ui data-safe-bottom={solid ? '' : undefined}
      initial={{ opacity: 0, y: reduce ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.25 }}>
      {children}
    </motion.div>
  );
}
function Cue({ children, on, onClick, testid, className = '' }: { children: ReactNode; on?: boolean; onClick: () => void; testid?: string; className?: string }) {
  return (
    <button type="button" className={`cue ${className}`} data-on={!!on} data-testid={testid} onClick={() => { buzz(6); onClick(); }}>
      {children}
    </button>
  );
}
function Go({ children, onClick, testid, disabled }: { children: ReactNode; onClick: () => void; testid?: string; disabled?: boolean }) {
  return (
    <button type="button" className="go" data-testid={testid} disabled={disabled} style={disabled ? { opacity: 0.35 } : undefined} onClick={() => { buzz(10); onClick(); }}>
      {children} <span aria-hidden>→</span>
    </button>
  );
}

// ------------------------------------------------------------------ anchored overlays
type Place = 'above' | 'center' | 'below';
interface AnchorSpec { fig: FigId; dy: number; head: boolean; place: Place }
const AnchorCtx = createContext<Map<HTMLElement, AnchorSpec> | null>(null);
function Anchor({ fig, dy = 0, head = true, place = 'above', children }: { fig: FigId; dy?: number; head?: boolean; place?: Place; children: ReactNode }) {
  const map = useContext(AnchorCtx)!;
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const el = ref.current!; map.set(el, { fig, dy, head, place }); return () => { map.delete(el); }; }, [map, fig, dy, head, place]);
  return <div ref={ref} className="absolute left-0 top-0 z-20 pointer-events-none" style={{ visibility: 'hidden', willChange: 'transform' }}>{children}</div>;
}
const Arrows = () => <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden><path d="M6 1.5 L10 6 H2 Z M6 14.5 L2 10 H10 Z" fill="currentColor" /></svg>;

// ------------------------------------------------------------------ session
function Session({ onRecord, onRestart }: DirectionProps & { onRestart: () => void }) {
  useSerif();
  const dark = useDark();
  const pal = dark ? DARK : LIGHT;
  const reduce = !!useReducedMotion();
  const store = useMemo<StageStore>(() => makeStore(reduce), []); // eslint-disable-line react-hooks/exhaustive-deps
  store.reduce = reduce;
  const D = reduce ? 0.25 : 1; // duration scale

  const [step, setStep] = useState<Step>('set');
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick(t => t + 1), []);
  const lastCue = useRef<Cue | null>(null);
  const [reading, setReading] = useState<ScenarioId | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [card, setCard] = useState(false);
  const [pull, setPull] = useState<Pull | null>(null);
  const [pullRead, setPullRead] = useState<Pull | null>(null);
  const [pullHint, setPullHint] = useState<string | null>(null);
  const [breaths, setBreaths] = useState(0);
  const [phase, setPhase] = useState<'rest' | 'in' | 'out'>('rest');
  const [hint, setHint] = useState<string | null>(null);
  const [found, setFound] = useState(0);
  const [wi, setWi] = useState(0);
  const [word, setWord] = useState<string | null | undefined>(undefined);
  const [needMoved, setNeedMoved] = useState(false);
  const [exitId, setExitId] = useState<SessionRecord['exitId'] | null>(null);
  const [performed, setPerformed] = useState(false);
  const [landed, setLanded] = useState(false);
  const [thenArr, setThenArr] = useState<Arr | null>(null);
  const zoom = useRef({ z: 0 });
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const recorded = useRef(false);
  const anchors = useMemo(() => new Map<HTMLElement, AnchorSpec>(), []);

  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); gsap.killTweensOf([store.cam, store.light, store.stageT, store.thenT, zoom.current, store.fig.you, store.fig.them]); }, [store]);

  // ---------------- choreography
  const camTo = useCallback((p: Pose, dur = 1.6, ease = 'power3.inOut') => {
    gsap.killTweensOf(store.cam);
    gsap.to(store.cam, { ...p, duration: dur * D, ease });
  }, [store, D]);
  const lightTo = useCallback((p: Partial<StageStore['light']>, dur = 1.2, ease = 'power2.inOut') => {
    gsap.to(store.light, { ...p, duration: dur * D, ease, overwrite: 'auto' });
  }, [store, D]);

  // curtain up
  useEffect(() => {
    gsap.to(store.light, { lv: 1, duration: 1.8 * D, ease: 'power2.out', delay: 0.2 });
    camTo(POSE.set, 2.6, 'power3.out');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((s: Step) => {
    setStep(s);
    const p = POSE[s];
    if (s !== 'word' && s !== 'validate' && s !== 'set') camTo(p);
  }, [camTo]);

  const recompute = useCallback(() => {
    applyArr(store);
    setReading(readScene(store.arr, lastCue.current));
    bump();
  }, [store, bump]);

  // ---------------- arrangement edits (tap alternatives)
  const A = store.arr;
  const dYT = dist(A.you, A.them);
  const isFar = dYT > 1.55 || len(A.them.x, A.them.z) > 1.1;
  const cues: { id: Cue; on: boolean; label: string; alt: string; act: () => void }[] = [
    { id: 'far', on: isFar, label: '(they step away)', alt: '(they come back)', act: () => {
      const a = store.arr; const dx = a.them.x - a.you.x, dz = a.them.z - a.you.z; const l = Math.max(0.01, Math.hypot(dx, dz));
      if (!isFar) {
        let p = clampToStage({ x: a.you.x + (dx / l) * 2.5, z: a.you.z + (dz / l) * 2.5 });
        if (dist(p, a.you) < 1.6) { const yl = Math.max(0.01, len(a.you.x, a.you.z)); p = { x: (-a.you.x / yl) * WALK, z: (-a.you.z / yl) * WALK }; }
        a.them.x = p.x; a.them.z = p.z;
      } else { const p = clampToStage({ x: a.you.x + (dx / l) * 0.95, z: a.you.z + (dz / l) * 0.95 }); a.them.x = p.x; a.them.z = p.z; }
    } },
    { id: 'turn', on: A.them.turned, label: '(they turn away)', alt: '(they turn back)', act: () => { store.arr.them.turned = !store.arr.them.turned; } },
    { id: 'tall', on: A.them.s > 1.15, label: '(they grow taller)', alt: '(they shrink back)', act: () => { store.arr.them.s = store.arr.them.s > 1.15 ? 1 : 1.6; } },
    { id: 'small', on: A.you.s < 0.85, label: '(you get smaller)', alt: '(you, full size)', act: () => { store.arr.you.s = store.arr.you.s < 0.85 ? 1 : 0.62; } },
    { id: 'others', on: !!A.others, label: '(others arrive)', alt: '(others leave)', act: () => { store.arr.others = store.arr.others ? null : huddleFor(store.arr); } },
    { id: 'speech', on: A.them.speech, label: '(they say something)', alt: '(they unsay it)', act: () => { store.arr.them.speech = !store.arr.them.speech; } },
  ];
  const doCue = (c: (typeof cues)[number]) => { lastCue.current = c.on ? null : c.id; c.act(); recompute(); };

  // need-step alternatives
  const needCues: { id: string; label: string; act: () => void }[] = [];
  if (A.them.turned) needCues.push({ id: 'face', label: '(they turn to face you)', act: () => { store.arr.them.turned = false; } });
  if (A.them.speech) needCues.push({ id: 'unsay', label: '(they take it back)', act: () => { store.arr.them.speech = false; } });
  if (dYT > 1.2) needCues.push({ id: 'closer', label: '(they come closer)', act: () => {
    const a = store.arr; const dx = a.them.x - a.you.x, dz = a.them.z - a.you.z; const l = Math.max(0.01, Math.hypot(dx, dz));
    const p = clampToStage({ x: a.you.x + (dx / l) * 0.85, z: a.you.z + (dz / l) * 0.85 }); a.them.x = p.x; a.them.z = p.z;
  } });
  if (Math.abs(A.them.s - 1) > 0.05 || Math.abs(A.you.s - 1) > 0.05) needCues.push({ id: 'level', label: '(you stand level)', act: () => { store.arr.them.s = 1; store.arr.you.s = 1; } });
  if (A.others && !A.open) needCues.push({ id: 'room', label: '(they make room for you)', act: () => {
    const a = store.arr; if (!a.others) return;
    const c = centroid(a.others);
    const mid = { x: (a.you.x + c.x) / 2, z: (a.you.z + c.z) / 2 };
    const r = Math.max(0.55, Math.min(0.7, dist(a.you, mid)));
    const ang0 = Math.atan2(a.you.z - mid.z, a.you.x - mid.x);
    a.others = a.others.map((_, i) => clampToStage({ x: mid.x + Math.cos(ang0 + ((i + 1) * Math.PI) / 2) * r, z: mid.z + Math.sin(ang0 + ((i + 1) * Math.PI) / 2) * r }));
    const yp = clampToStage({ x: mid.x + Math.cos(ang0) * r, z: mid.z + Math.sin(ang0) * r }); a.you.x = yp.x; a.you.z = yp.z;
    a.open = true;
  } });
  const doNeed = (c: { act: () => void }) => { c.act(); setNeedMoved(true); recompute(); };

  // ---------------- screen helpers
  const el = useRef<HTMLDivElement>(null);
  const ray = useMemo(() => new Raycaster(), []);
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const v3 = useMemo(() => new Vector3(), []);
  const toScreen = useCallback((x: number, y: number, z: number) => {
    const st = store.stage, cam = store.camera; if (!st || !cam) return { x: -999, y: -999 };
    v3.set(x, y, z); st.localToWorld(v3); v3.project(cam);
    return { x: (v3.x + 1) / 2 * store.size.w, y: (1 - v3.y) / 2 * store.size.h };
  }, [store, v3]);
  const toLocal = useCallback((sx: number, sy: number): P2 | null => {
    const st = store.stage, cam = store.camera; if (!st || !cam) return null;
    ray.setFromCamera(new Vector2((sx / store.size.w) * 2 - 1, -(sy / store.size.h) * 2 + 1), cam);
    plane.constant = -st.position.y;
    const hit = ray.ray.intersectPlane(plane, v3); if (!hit) return null;
    st.worldToLocal(hit);
    return { x: hit.x, z: hit.z };
  }, [store, ray, plane, v3]);
  const pick = useCallback((sx: number, sy: number, ids: FigId[], handles: boolean): { kind: 'fig' | 'handle'; id: FigId } | null => {
    if (handles) {
      for (const id of ['them', 'you'] as FigId[]) {
        const L = store.live[id];
        const p = toScreen(L.x, L.y + FIG_H * L.s + 0.26, L.z);
        if (Math.hypot(p.x - sx, p.y - sy) < 26) return { kind: 'handle', id };
      }
    }
    let best: FigId | null = null, bd = 1e9;
    for (const id of ids) {
      if (!store.fig[id].show) continue;
      const L = store.live[id];
      const a = toScreen(L.x, 0.05, L.z), b = toScreen(L.x, FIG_H * L.s, L.z);
      const abx = b.x - a.x, aby = b.y - a.y; const t = clamp(((sx - a.x) * abx + (sy - a.y) * aby) / Math.max(1, abx * abx + aby * aby));
      const d = Math.hypot(a.x + abx * t - sx, a.y + aby * t - sy);
      const lim = id === 'you' && step === 'pull' ? 60 : 30;
      if (d < lim && d < bd) { bd = d; best = id; }
    }
    return best ? { kind: 'fig', id: best } : null;
  }, [store, toScreen, step]);

  // expose for automated walkthroughs
  useEffect(() => {
    const w = window as unknown as { __stage?: unknown };
    w.__stage = {
      screen: (id: FigId, h = 0.5) => { const L = store.live[id]; const r = el.current?.getBoundingClientRect(); const p = toScreen(L.x, FIG_H * L.s * h, L.z); return { x: p.x + (r?.left ?? 0), y: p.y + (r?.top ?? 0) }; },
      handle: (id: FigId) => { const L = store.live[id]; const r = el.current?.getBoundingClientRect(); const p = toScreen(L.x, L.y + FIG_H * L.s + 0.26, L.z); return { x: p.x + (r?.left ?? 0), y: p.y + (r?.top ?? 0) }; },
      local: (x: number, z: number) => { const r = el.current?.getBoundingClientRect(); const p = toScreen(x, 0, z); return { x: p.x + (r?.left ?? 0), y: p.y + (r?.top ?? 0) }; },
      arr: () => store.arr,
      peak: () => lastPeak.current,
    };
    return () => { delete w.__stage; };
  }, [store, toScreen]);

  // ---------------- gestures
  type Drag = { kind: 'fig' | 'handle' | 'hold'; id?: FigId; pid: number; sx: number; sy: number; t0: number; moved: boolean; s0: number; start: P2; samples: { t: number; x: number; z: number }[] };
  const drag = useRef<Drag | null>(null);
  const holdT0 = useRef(0);
  const lastPeak = useRef(0);

  const separate = (id: FigId, p: P2): P2 => {
    const a = store.arr; const others: P2[] = [];
    if (id !== 'you') others.push(a.you);
    if (id !== 'them') others.push(a.them);
    a.others?.forEach((o, i) => { if (OTHER_IDS[i] !== id) others.push(o); });
    let q = { ...p };
    for (let it = 0; it < 3; it++) for (const o of others) {
      const d = dist(q, o);
      if (d < 0.34) { const dx = q.x - o.x, dz = q.z - o.z; const l = Math.max(0.001, Math.hypot(dx, dz)); q = { x: o.x + (dx / l) * 0.34, z: o.z + (dz / l) * 0.34 }; }
    }
    return clampToStage(q);
  };

  const editable = step === 'set' || step === 'need';
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-ui],button')) return;
    const r = el.current!.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (step === 'breathe') { if (breaths < 3) { try { el.current!.setPointerCapture(e.pointerId); } catch { /* synthetic */ } drag.current = { kind: 'hold', pid: e.pointerId, sx, sy, t0: e.timeStamp, moved: false, s0: 1, start: { x: 0, z: 0 }, samples: [] }; startHold(); } return; }
    let hit: ReturnType<typeof pick> = null;
    if (editable) hit = pick(sx, sy, ['them', 'o1', 'o2', 'o3', 'you'], step === 'set');
    else if (step === 'pull' && !pullRead && !pull) hit = pick(sx, sy, ['you'], false);
    if (!hit) return;
    try { el.current!.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const L = store.live[hit.id];
    drag.current = { kind: hit.kind, id: hit.id, pid: e.pointerId, sx, sy, t0: e.timeStamp, moved: false, s0: hit.id === 'you' ? store.arr.you.s : store.arr.them.s, start: { x: L.x, z: L.z }, samples: [] };
    if (hit.kind === 'fig') store.fig[hit.id].hop = 0.06;
    setPullHint(null);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d || d.pid !== e.pointerId || d.kind === 'hold') return;
    const r = el.current!.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) > 7) d.moved = true;
    if (!d.moved || !d.id) return;
    if (d.kind === 'handle') {
      const s = clamp(d.s0 - (sy - d.sy) / 140, 0.55, 1.8);
      if (d.id === 'them') store.arr.them.s = s; else store.arr.you.s = s;
      lastCue.current = d.id === 'them' ? 'tall' : 'small';
      if (step === 'need') setNeedMoved(true);
      recompute(); return;
    }
    const p = toLocal(sx, sy); if (!p) return;
    if (step === 'pull') {
      const l = len(p.x, p.z), max = R * 1.2;
      const q = l > max ? { x: (p.x / l) * max, z: (p.z / l) * max } : p;
      store.fig.you.x = q.x; store.fig.you.z = q.z;
      store.fig.you.drop = Math.max(0, len(q.x, q.z) - R * 0.98) * 3;
      d.samples.push({ t: e.timeStamp, x: q.x, z: q.z });
      return;
    }
    const q = separate(d.id, p);
    if (d.id === 'you') { store.arr.you.x = q.x; store.arr.you.z = q.z; lastCue.current = null; }
    else if (d.id === 'them') { store.arr.them.x = q.x; store.arr.them.z = q.z; lastCue.current = 'far'; }
    else { const i = OTHER_IDS.indexOf(d.id); if (store.arr.others) { store.arr.others[i] = q; lastCue.current = 'others'; store.arr.open = step === 'need' ? store.arr.open : false; } }
    if (step === 'need') setNeedMoved(true);
    recompute();
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d || d.pid !== e.pointerId) return;
    drag.current = null;
    try { el.current!.releasePointerCapture(e.pointerId); } catch { /* */ }
    if (d.kind === 'hold') { endHold(); return; }
    if (d.id) store.fig[d.id].hop = 0;
    if (!d.moved && d.id && d.kind === 'fig') {
      // tap
      if (d.id === 'them' && editable) {
        store.arr.them.turned = !store.arr.them.turned; lastCue.current = store.arr.them.turned ? 'turn' : null;
        if (step === 'need') setNeedMoved(true);
        recompute(); buzz(6);
      } else if (step === 'pull') setPullHint('Drag your figure where it wants to go.');
      return;
    }
    if (step === 'pull' && d.id === 'you') {
      const s = d.samples;
      let peak = 0;
      for (let i = 2; i < s.length; i++) { const dt = (s[i].t - s[i - 2].t) / 1000; if (dt > 0.008) peak = Math.max(peak, Math.hypot(s[i].x - s[i - 2].x, s[i].z - s[i - 2].z) / dt); }
      const end = s.length ? s[s.length - 1] : d.start;
      // pointer moves coalesce on slow frames, so also use the average speed of the whole gesture
      if (s.length) { const dur = Math.max(0.016, (s[s.length - 1].t - d.t0) / 1000); peak = Math.max(peak, dist(d.start, end) / dur); }
      const got = readPull(d.start, end, store.arr.them, peak);
      lastPeak.current = peak;
      later(() => { store.fig.you.x = store.arr.you.x; store.fig.you.z = store.arr.you.z; store.fig.you.drop = 0; }, 380);
      if (!got) { setPullHint('Try a bigger move. Wherever it wants to go.'); return; }
      setPullRead(got); buzz([8, 40, 8]);
    }
  };

  // ---------------- step 1 → 2
  const confirmScene = (id: ScenarioId) => {
    const s = SCENARIOS.find(x => x.id === id)!;
    setScenario(s);
    setThenArr(cloneArr(store.arr));
    go('capacity');
    later(() => { setCard(true); store.fig.them.phone = 1; buzz([12, 60, 12]); }, 1100 * D + 200);
  };

  // ---------------- step 2
  const onBand = (b: Band) => {
    if (band) return;
    setBand(b); store.mood = b;
    later(() => { setCard(false); store.fig.them.phone = 0; }, 500);
    later(() => { store.mood = null; go('pull'); }, 1100);
  };

  // ---------------- step 3
  const tapPull = (p: Pull) => {
    if (pullRead || pull) return;
    setPullHint(null);
    const f = store.fig.you, a = store.arr;
    const dx = a.them.x - a.you.x, dz = a.them.z - a.you.z; const l = Math.max(0.01, Math.hypot(dx, dz));
    if (p === 'blank') { f.slump = 1; setPullRead('blank'); return; }
    if (p === 'chase') {
      const to = { x: a.them.x - (dx / l) * 0.4, z: a.them.z - (dz / l) * 0.4 };
      gsap.to(f, { x: to.x, z: to.z, duration: 1.8 * D, ease: 'sine.inOut' });
    } else if (p === 'fight') {
      f.x = a.them.x - (dx / l) * 0.36; f.z = a.them.z - (dz / l) * 0.36; f.hop = 0.12; later(() => { f.hop = 0; }, 180);
    } else {
      const to = { x: a.you.x - (dx / l) * 1.6, z: a.you.z - (dz / l) * 1.6 };
      const tl = len(to.x, to.z); const q = tl > R * 1.15 ? { x: (to.x / tl) * R * 1.15, z: (to.z / tl) * R * 1.15 } : to;
      gsap.to(f, { x: q.x, z: q.z, duration: 1.1 * D, ease: 'power2.in', onUpdate: () => { f.drop = Math.max(0, len(f.x, f.z) - R * 0.98) * 3; } });
    }
    later(() => { gsap.killTweensOf(f); f.x = a.you.x; f.z = a.you.z; f.drop = 0; }, (p === 'chase' ? 2300 : 1400) * D + 200);
    setPullRead(p);
  };
  const retryPull = () => { setPullRead(null); store.fig.you.slump = 0; };
  const confirmPull = () => {
    const p = pullRead!; setPull(p);
    if (p === 'blank') enterWake();
    else if (band === 'flooded') enterBreathe();
    else enterWord(false);
  };

  // ---------------- step 4a: step back (flooded)
  const enterBreathe = () => { go('breathe'); zoom.current.z = 0; };
  const applyZoom = () => { Object.assign(store.cam, zoomPose(zoom.current.z)); store.light.world = zoom.current.z; };
  const startHold = () => {
    if (breaths >= 3) return;
    holdT0.current = performance.now(); setPhase('in'); setHint(null); buzz(6);
    gsap.killTweensOf(zoom.current); gsap.killTweensOf(store.cam);
    gsap.to(zoom.current, { z: (breaths + 1) / 3, duration: 4.2 * D, ease: 'sine.inOut', onUpdate: applyZoom });
    lightTo({ key: 1.1, fill: 1.05 }, 3.5, 'sine.inOut');
  };
  const endHold = () => {
    const held = performance.now() - holdT0.current;
    gsap.killTweensOf(zoom.current);
    if (held >= 2800) {
      const n = breaths + 1; setBreaths(n); setPhase('out'); buzz(10);
      gsap.to(zoom.current, { z: n / 3, duration: 1.4 * D, ease: 'power2.out', onUpdate: applyZoom });
      lightTo({ key: 1, fill: 1, soft: Math.min(1, n / 3 + 0.1) }, 4.5, 'sine.out');
      later(() => setPhase('rest'), 4200 * D);
    } else {
      setPhase('rest');
      setHint(held < 900 ? 'Slower. Press and keep holding, like a long breath in.' : 'Nearly. Hold it a little longer, about four counts.');
      gsap.to(zoom.current, { z: breaths / 3, duration: 1.1 * D, ease: 'power2.out', onUpdate: applyZoom });
      lightTo({ key: 1, fill: 1 }, 1);
    }
  };
  const holdKey = (e: React.KeyboardEvent, down: boolean) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (down && !e.repeat && phase !== 'in') startHold();
    if (!down) endHold();
  };

  // ---------------- step 4b: come back into the room (blank)
  const enterWake = () => {
    go('wake');
    store.propsLit = {};
    lightTo({ key: 0.12, fill: 0.08, house: 0.15 }, 1.4);
    setFound(0);
  };
  const onFind = (id: 'blue' | 'round' | 'high') => {
    const want = FIND[found];
    if (!want) return;
    if (id !== want.id) { store.wiggle[id] = 1; setHint(`That’s ${FIND.find(f => f.id === id)!.name}. Keep looking.`); return; }
    setHint(null); buzz([10, 30, 10]);
    store.propsLit = { ...store.propsLit, [id]: true };
    const n = found + 1; setFound(n);
    if (id === 'blue') lightTo({ fill: 1 }, 0.9, 'power3.out');
    if (id === 'round') lightTo({ house: 1 }, 0.9, 'power3.out');
    if (id === 'high') lightTo({ key: 1 }, 0.9, 'power3.out');
    store.fig.you.slump = Math.max(0, 1 - n * 0.36);
    if (n === 3) { store.fig.you.slump = 0; store.fig.you.look = 1; later(() => { store.fig.you.look = 0; }, 3200); }
  };
  const skipReg = () => {
    gsap.killTweensOf(zoom.current);
    lightTo({ key: 1, fill: 1, house: 1, soft: 0.4 }, 1);
    store.fig.you.slump = 0; store.propsLit = { blue: true, round: true, high: true };
    enterWord(step === 'breathe' && zoom.current.z > 0.3);
  };

  // ---------------- step 5: the word from above
  const enterWord = (keepWide: boolean) => {
    setStep('word'); setWi(0); setWord(undefined); setHint(null);
    const z = keepWide ? Math.max(zoom.current.z, 0.7) : 0.62;
    zoom.current.z = z;
    camTo({ ...zoomPose(z), frac: 0.52 }, 2.4, 'power3.inOut');
    lightTo({ world: z, house: 1, fill: 1, key: 1 }, 2);
  };
  const onWord = (a: 'yes' | 'close' | 'not') => {
    if (!scenario || word !== undefined) return;
    if (a !== 'not') { setWord(scenario.words[wi]); buzz([8, 30, 8]); return; }
    if (wi + 1 >= scenario.words.length) setWord(null); else setWi(wi + 1);
  };

  // ---------------- step 7: need
  const enterNeed = () => {
    setStep('need'); setNeedMoved(false);
    camTo(POSE.need, 2.2, 'power3.inOut');
    lightTo({ world: 0, soft: Math.min(store.light.soft, 0.4) }, 2);
  };

  // ---------------- exits + performance
  const unlocked = band && pull ? askUnlocked(band, pull) : false;
  const best: SessionRecord['exitId'] = unlocked ? 'ask' : band === 'flooded' || pull === 'blank' ? 'opposite' : 'land';
  const chooseExit = (id: SessionRecord['exitId']) => {
    if (!pull) return;
    setExitId(id); setPerformed(false); go('perform');
    const f = store.fig.you, a = store.arr;
    const dx = a.them.x - a.you.x, dz = a.them.z - a.you.z; const l = Math.max(0.01, Math.hypot(dx, dz));
    const t0 = 900 * D;
    if (id === 'ask') { a.them.turned = false; a.them.speech = false; applyArr(store); later(() => { f.hop = 0.05; later(() => { f.hop = 0; }, 200); }, t0); }
    if (id === 'land') { later(() => lightTo({ soft: 0.9, key: 1.15 }, 3, 'sine.inOut'), t0); }
    if (id === 'opposite') {
      if (pull === 'chase') later(() => { f.sit = 1; }, t0);
      if (pull === 'fight') later(() => {
        const p = clampToStage({ x: a.you.x - (dx / l) * 0.7, z: a.you.z - (dz / l) * 0.7 });
        gsap.to(a.you, { x: p.x, z: p.z, duration: 1.6 * D, ease: 'sine.inOut', onUpdate: () => applyArr(store) });
      }, t0);
      if (pull === 'hide') later(() => {
        if (!a.others) {
          const px = -dz / l, pz = dx / l;
          a.others = [clampToStage({ x: a.you.x + px * 0.95, z: a.you.z + pz * 0.95 })];
          if (dist(a.others[0], a.them) < 0.5) a.others = [clampToStage({ x: a.you.x - px * 0.95, z: a.you.z - pz * 0.95 })];
          applyArr(store);
        }
        const o = a.others.reduce((b, c) => dist(c, a.you) < dist(b, a.you) ? c : b, a.others[0]);
        const oi = a.others.indexOf(o);
        const ox = o.x - a.you.x, oz = o.z - a.you.z; const ol = Math.max(0.01, Math.hypot(ox, oz));
        const to = { x: o.x - (ox / ol) * 0.42, z: o.z - (oz / ol) * 0.42 };
        f.face = Math.atan2(ox, oz);
        store.fig[OTHER_IDS[oi]].face = Math.atan2(-ox, -oz);
        later(() => { gsap.to(a.you, { x: to.x, z: to.z, duration: 1.6 * D, ease: 'sine.inOut', onUpdate: () => applyArr(store), onComplete: () => { f.wave = 1; later(() => { f.wave = 0; }, 1800); } }); }, 300);
      }, t0);
      if (pull === 'blank') later(() => { f.slump = 0; f.sit = 0; f.hop = 0.05; later(() => { f.hop = 0; f.look = 1; }, 250); later(() => { f.look = 0; }, 3600); }, t0);
    }
    later(() => setPerformed(true), 1800 * D + 400);
  };

  // ---------------- close
  const enterClose = () => {
    store.fig.you.face = null; OTHER_IDS.forEach(i => { store.fig[i].face = null; });
    setStep('close');
    camTo(POSE.close, 2, 'power3.inOut');
    gsap.to(store.stageT, { x: 1.12, s: 0.62, duration: 1.8 * D, ease: 'power3.inOut' });
    store.thenT.show = 1;
    gsap.fromTo(store.thenT, { y: -1.4 }, { y: 0, duration: 1.6 * D, delay: 0.5 * D, ease: 'back.out(1.4)' });
    lightTo({ world: 0, soft: 0.3 }, 1.5);
  };
  const onClose = (c: SessionRecord['close']) => {
    if (recorded.current || !scenario || !band || !pull || !exitId) return;
    recorded.current = true;
    const rec: SessionRecord = { scenarioId: scenario.id as SessionRecord['scenarioId'], band, pull, word: word ?? null, exitId, close: c };
    setStep('shelf');
    camTo(POSE.shelf, 2.4, 'power3.inOut');
    lightTo({ shelf: 1 }, 2);
    gsap.to(store.thenT, { y: -1.6, duration: 0.9 * D, ease: 'power2.in', onComplete: () => { store.thenT.show = 0; } });
    const [sx, sy] = SHELF_SLOTS[4];
    const tl = gsap.timeline();
    tl.to(store.stageT, { y: 1.6, s: 0.4, duration: 0.9 * D, ease: 'power2.out' })
      .to(store.stageT, { x: SHELF_X + sx, z: 0.02, s: MINI, ry: STAGE_RY, duration: 1.3 * D, ease: 'power2.inOut' }, '>-0.2')
      .to(store.stageT, { y: sy, duration: 0.7 * D, ease: 'bounce.out' }, '>-0.05')
      .call(() => { setLanded(true); buzz([6, 40, 12]); });
    void DRUM;
    later(() => onRecord?.(rec), 600);
  };

  // ---------------- scene UI
  const ui: SceneUI = {
    step,
    find: step === 'wake' && found < 3 ? { want: FIND[found].id, onFind } : null,
    compare: step === 'close',
    shelf: step === 'shelf' ? { today: word ?? null, landed } : null,
    askBubble: (step === 'perform' || step === 'close') && exitId === 'ask',
  };
  const showHandles = step === 'set' || step === 'need';
  const caption = step === 'perform' && exitId && pull ? EXIT_CAPTION[exitId === 'opposite' ? pull : exitId] : null;
  const hypo = step === 'word' && scenario ? (word === undefined ? scenario.words[wi] : word) : undefined;

  // anchored overlays: follow figures every frame, clamped inside the screen
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const host = el.current;
      if (host) {
        const r0 = host.getBoundingClientRect();
        const root = host.parentElement!;
        const ts = root.querySelectorAll('[data-safe-top]'), bs = root.querySelectorAll('[data-safe-bottom]');
        const t = ts[ts.length - 1], b = bs[bs.length - 1];
        store.safe = {
          top: t ? t.getBoundingClientRect().bottom - r0.top + 10 : 0,
          bottom: b ? b.getBoundingClientRect().top - r0.top - 8 : r0.height,
        };
      }
      const W = store.size.w;
      anchors.forEach((sp, node) => {
        const L = store.live[sp.fig];
        if (L.s < 0.05 || !store.stage) { node.style.visibility = 'hidden'; return; }
        const p = toScreen(L.x, L.y + (sp.head ? FIG_H * L.s : 0) + sp.dy, L.z);
        const w = node.offsetWidth, h = node.offsetHeight;
        const x = Math.min(W - w - 10, Math.max(10, p.x - w / 2));
        const y = sp.place === 'above' ? p.y - h : sp.place === 'center' ? p.y - h / 2 : p.y;
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        node.style.setProperty('--tail', `${(p.x - x).toFixed(1)}px`);
        node.style.visibility = 'visible';
      });
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [store, toScreen, anchors]);

  // ---------------- render
  const readLine = reading ? READING[reading] : null;
  const exitRows = pull ? [
    { id: 'ask' as const, ...EXITS.steady, locked: !unlocked },
    { id: 'land' as const, ...EXITS.land, locked: false },
    { id: 'opposite' as const, ...EXITS.opposite[pull], locked: false },
  ] : [];
  const chosenExit = exitRows.find(x => x.id === exitId);
  const pullMeta = pullRead ? PULLS.find(p => p.id === pullRead)! : null;

  return (
    <div className="stage-root relative h-full w-full overflow-hidden select-none" style={{ background: pal.bg, color: pal.ink }}>
      <style>{CSS(pal)}</style>
      <div ref={el} className="absolute inset-0" style={{ touchAction: 'none' }} data-testid="stage-surface"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 2]} camera={{ fov: FOV, position: [0, 6, 18], near: 1, far: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }} className="!absolute inset-0" events={undefined}>
          <StageScene store={store} ui={ui} pal={pal} dark={dark} then={thenArr} />
        </Canvas>
      </div>
      {/* the room's air */}
      <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: `radial-gradient(120% 75% at 50% 45%, transparent 55%, ${dark ? 'rgba(4,2,10,.55)' : 'rgba(90,64,34,.13)'} 100%)` }} />

      <AnchorCtx.Provider value={anchors}>
        {showHandles && (
          <>
            <Anchor fig="them" dy={0.26} place="center"><span className="handle">{step === 'set' && <span className="handle-label">taller</span>}<Arrows /></span></Anchor>
            <Anchor fig="you" dy={0.26} place="center"><span className="handle">{step === 'set' && <span className="handle-label">smaller</span>}<Arrows /></span></Anchor>
            <Anchor fig="you" head={false} dy={-0.02} place="below"><span className="name-tag" style={{ color: 'var(--accent)' }}>you</span></Anchor>
            <Anchor fig="them" head={false} dy={-0.02} place="below"><span className="name-tag" style={{ color: 'var(--ink2)' }}>them</span></Anchor>
          </>
        )}
        {card && (
          <Anchor fig="them" dy={0.14}>
            <div className="incoming">
              <div className="incoming-top"><span>Them</span><span>now</span></div>
              <div className="incoming-text">{CAPACITY.incoming}</div>
            </div>
          </Anchor>
        )}
        {hypo !== undefined && (
          <Anchor fig="you" dy={0.04}>
            <div className="hypo">
              <div className="hypo-card">
                <div className="hypo-lead">Someone standing here might feel…</div>
                <div className="hypo-word" key={hypo ?? 'none'} data-testid="hypo">{hypo ?? 'not sure yet'}</div>
              </div>
              <div className="hypo-stem" />
            </div>
          </Anchor>
        )}
        {caption && <Anchor fig="you" dy={exitId === 'ask' ? 0.5 : 0.12}><div className="caption">{caption}</div></Anchor>}
      </AnchorCtx.Provider>

      <AnimatePresence mode="popLayout">
        {step === 'set' && (
          <motion.div key="set" className="contents">
            <Top k="t-set" kicker="Scene one" title="Set the scene." sub="Move things until it looks like what happened.">
              <p className="hint-line mt-2 text-[12.5px] leading-snug" style={{ color: 'var(--ink2)', opacity: 0.85 }}>Drag anyone. Tap them to turn them. Pull <span aria-hidden>⇕</span> to change size.</p>
            </Top>
            <Bottom k="b-set" solid>
              <div className="grid grid-cols-2 gap-x-4 -mb-1">
                {cues.map(c => <Cue key={c.id} on={c.on} onClick={() => doCue(c)} testid={`cue-${c.id}`}>{c.on ? c.alt : c.label}</Cue>)}
              </div>
              <div className="mt-3 pt-3 flex items-end justify-between gap-3" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="min-w-0 min-h-[46px]" aria-live="polite">
                  <p className="sc flex items-center gap-3 whitespace-nowrap" style={{ color: 'var(--ink2)' }}>Looks like
                    {reading && <button type="button" className="quiet !min-h-[44px] -my-[15px] !text-[12px] normal-case tracking-normal font-normal whitespace-nowrap" onClick={() => go('closest')} data-testid="not-quite">not quite?</button>}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.p key={readLine ?? 'none'} className="serif italic text-[16px] leading-snug mt-1" style={{ color: readLine ? 'var(--ink)' : 'var(--ink2)' }}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }} data-testid="reading">
                      {readLine ?? 'nothing yet. Move something.'}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <Go testid="thats-it" onClick={() => reading ? confirmScene(reading) : go('closest')}>That’s it</Go>
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'closest' && (
          <motion.div key="closest" className="contents">
            <Top k="t-closest" kicker="Scene one" title="Which is closest?" />
            <Bottom k="b-closest">
              <div className="flex flex-col gap-2">
                {SCENARIOS.map(s => (
                  <button key={s.id} type="button" className="plaque" onClick={() => confirmScene(s.id as ScenarioId)} data-testid={`scn-${s.id}`}>
                    <span className="text-[15px] leading-snug">{s.question}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="quiet mt-1" onClick={() => { setStep('set'); camTo(POSE.set); }}>Back to the stage</button>
            </Bottom>
          </motion.div>
        )}

        {step === 'capacity' && (
          <motion.div key="capacity" className="contents">
            <Top k="t-cap" kicker="Scene two" title={CAPACITY.prompt} sub={card ? 'They’re holding up their phone.' : ' '} />
            {card && (
              <Bottom k="b-cap">
                <div className="flex flex-col gap-2">
                  {CAPACITY.options.map(o => (
                    <button key={o.band} type="button" className="plaque" data-sel={band === o.band} data-testid={`band-${o.band}`}
                      onPointerEnter={() => { if (!band) store.mood = o.band; }} onPointerLeave={() => { if (!band) store.mood = null; }}
                      onFocus={() => { if (!band) store.mood = o.band; }} onBlur={() => { if (!band) store.mood = null; }}
                      onClick={() => onBand(o.band)}>
                      <span className="text-[16px] leading-snug">{o.reply}</span>
                      <span className="serif italic text-[13.5px]" style={{ color: 'var(--ink2)' }}>{o.example}</span>
                    </button>
                  ))}
                </div>
              </Bottom>
            )}
          </motion.div>
        )}

        {step === 'pull' && (
          <motion.div key="pull" className="contents">
            <Top k="t-pull" kicker="Scene three" title="Where does your figure want to go?" sub={pullRead ? ' ' : 'Drag yourself. Don’t think too hard about it.'} />
            <Bottom k="b-pull">
              <AnimatePresence mode="wait">
                {!pullMeta ? (
                  <motion.div key="alts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-[12.5px] min-h-[18px]" style={{ color: pullHint ? 'var(--rust)' : 'var(--ink2)' }} aria-live="polite">{pullHint ?? 'Or pick the stage direction:'}</p>
                    <div className="grid grid-cols-2 gap-x-4">
                      {TAP_PULLS.map(p => <Cue key={p.id} onClick={() => tapPull(p.id)} testid={`pull-${p.id}`}>{p.cue}</Cue>)}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="conf" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }}>
                    <p className="sc" style={{ color: 'var(--ink2)' }}>Your figure wants to</p>
                    <p className="serif text-[26px] leading-tight mt-1.5" data-testid="pull-read">{pullMeta.label}</p>
                    <p className="serif italic text-[15px] mt-0.5" style={{ color: 'var(--ink2)' }}>{pullMeta.detail}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <button type="button" className="quiet" onClick={retryPull} data-testid="pull-retry">Not that. Try again</button>
                      <Go onClick={confirmPull} testid="pull-yes">Yes, that</Go>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Bottom>
          </motion.div>
        )}

        {step === 'breathe' && (
          <motion.div key="breathe" className="contents">
            <Top k="t-br" kicker="Interval" title="Step back from it." sub={breaths >= 3 ? 'From up here it’s one small lit stage among many.' : 'Press and hold anywhere to breathe in. Let go to breathe out.'} />
            <Bottom k="b-br">
              <div className="flex items-center gap-2.5" aria-label={`${breaths} of 3 breaths`}>
                {[0, 1, 2].map(i => <span key={i} className="lamp" data-on={i < breaths} />)}
                <span className="serif italic text-[16px] ml-2" style={{ color: 'var(--ink)' }} aria-live="polite">
                  {breaths >= 3 ? 'That’s enough. Stay up here a moment.' : phase === 'in' ? 'Breathe in… and keep holding' : phase === 'out' ? '…and let it all the way out.' : breaths ? 'Again, when you’re ready.' : ''}
                </span>
              </div>
              <p className="text-[13px] mt-2 min-h-[18px]" style={{ color: 'var(--rust)' }} aria-live="polite">{hint}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <button type="button" className="quiet" onClick={skipReg} data-testid="skip">Skip</button>
                {breaths >= 3 ? <Go onClick={() => enterWord(true)} testid="continue">Continue</Go> : (
                  <button type="button" className="plaque !w-auto !min-h-[48px] !items-center !justify-center px-6" data-testid="hold"
                    style={phase === 'in' ? { borderColor: 'var(--accent)' } : undefined}
                    onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold(); }} onPointerUp={endHold} onPointerCancel={endHold}
                    onKeyDown={e => holdKey(e, true)} onKeyUp={e => holdKey(e, false)}>
                    <span className="sc" style={{ color: 'var(--ink)' }}>{phase === 'in' ? 'Holding' : 'Hold to breathe in'}</span>
                  </button>
                )}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'wake' && (
          <motion.div key="wake" className="contents">
            <Top k="t-wake" kicker="Interval" title="Come back into the room." sub="The lights come up one at a time. Look around the set." />
            <Bottom k="b-wake">
              <div className="flex items-center gap-2.5">
                {[0, 1, 2].map(i => <span key={i} className="lamp" data-on={i < found} />)}
                <span className="serif text-[21px] ml-2" style={{ color: 'var(--ink)' }} aria-live="polite">{found < 3 ? FIND[found].ask : 'There you are.'}</span>
              </div>
              <p className="text-[13px] mt-2 min-h-[18px]" style={{ color: hint ? 'var(--rust)' : 'var(--ink2)' }} aria-live="polite">{hint ?? (found < 3 ? 'Tap it on the stage.' : 'Lights up. You’re here.')}</p>
              <div className="mt-2 flex items-center justify-between">
                <button type="button" className="quiet" onClick={skipReg} data-testid="skip">Skip</button>
                {found >= 3 && <Go onClick={() => enterWord(false)} testid="continue">Continue</Go>}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'word' && scenario && (
          <motion.div key="word" className="contents">
            <Top k="t-word" kicker="Scene four" title="Look at the small figure in the light." sub="Just a guess, from up here." />
            <Bottom k="b-word">
              {word === undefined ? (
                <>
                  <p className="sc mb-1" style={{ color: 'var(--ink2)' }}>Does that fit?</p>
                  <div className="flex items-center justify-between">
                    {(['yes', 'close', 'not'] as const).map(a => (
                      <Cue key={a} onClick={() => onWord(a)} testid={`word-${a}`} className="!text-[17px] px-2">{a === 'yes' ? 'Yes' : a === 'close' ? 'Close' : 'Not that'}</Cue>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-end justify-between gap-4">
                  <p className="serif italic text-[15px] leading-snug" style={{ color: 'var(--ink2)' }}>
                    {word ? `“${word}.” A guess you get to keep.` : 'Not sure is a fine answer. The scene says enough.'}
                  </p>
                  <Go onClick={() => setStep('validate')} testid="continue">Go on</Go>
                </div>
              )}
            </Bottom>
          </motion.div>
        )}

        {step === 'validate' && scenario && (
          <motion.div key="validate" className="contents">
            <Bottom k="b-val">
              <div className="plaque !gap-0 px-5 py-5" style={{ cursor: 'default' }}>
                <p className="sc" style={{ color: 'var(--ink2)' }}><span className="rule" />Stage note</p>
                <p className="serif mt-3 text-[21px] leading-[1.28]" style={{ color: 'var(--ink)' }}>{validationFor(scenario)}</p>
                <p className="mt-3 text-[14.5px] leading-snug" style={{ color: 'var(--ink2)' }}>{VALIDATION_FOLLOW}</p>
              </div>
              <div className="mt-3 flex justify-end"><Go onClick={enterNeed} testid="continue">Go on</Go></div>
            </Bottom>
          </motion.div>
        )}

        {step === 'need' && scenario && (
          <motion.div key="need" className="contents">
            <Top k="t-need" kicker="Scene five" title="Now set it the way you wanted it." sub="Move anything. There’s no wrong way." />
            <Bottom k="b-need" solid>
              <div className="grid grid-cols-2 gap-x-4 -mb-1">
                {needCues.map(c => <Cue key={c.id} onClick={() => doNeed(c)} testid={`need-${c.id}`}>{c.label}</Cue>)}
                {!needCues.length && <p className="serif italic text-[15px] min-h-[44px] flex items-center col-span-2" style={{ color: 'var(--ink2)' }}>(everyone is where you want them)</p>}
              </div>
              <div className="mt-3 pt-3 flex items-end justify-between gap-3" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="min-w-0 min-h-[46px]" aria-live="polite">
                  <p className="sc" style={{ color: 'var(--ink2)' }}>{needMoved ? 'What you needed' : 'Your scene'}</p>
                  <p className="serif italic text-[16px] leading-snug mt-1" style={{ color: needMoved ? 'var(--ink)' : 'var(--ink2)' }} data-testid="need-read">
                    {needMoved ? `${scenario.need.charAt(0).toUpperCase()}${scenario.need.slice(1)}.` : 'as it happened.'}
                  </p>
                </div>
                <Go testid="thats-it" onClick={() => go('exits')}>That’s it</Go>
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'exits' && pull && (
          <motion.div key="exits" className="contents">
            <Top k="t-exits" kicker="Exit" title="Where do you take it from here?" />
            <Bottom k="b-exits">
              <div className="flex flex-col gap-2.5">
                {exitRows.map(x => (
                  <button key={x.id} type="button" className="plaque relative" aria-disabled={x.locked} data-testid={`exit-${x.id}`}
                    style={x.locked ? { opacity: 0.6, cursor: 'default' } : x.id === best ? { borderColor: 'var(--accent)' } : undefined}
                    onClick={x.locked ? undefined : () => chooseExit(x.id)}>
                    <span className="text-[16px] leading-snug flex items-center gap-2">
                      {x.locked && <svg width="11" height="13" viewBox="0 0 12 14" aria-hidden><rect x="1" y="6" width="10" height="7.5" rx="1.2" fill="none" stroke="currentColor" /><path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" /></svg>}
                      {x.title}
                    </span>
                    <span className="text-[13px] leading-snug" style={{ color: 'var(--ink2)' }}>{x.locked ? 'Opens once it’s quieter.' : x.body}</span>
                    {x.id === best && !x.locked && <span className="sc absolute -top-2 right-3 px-1.5 py-0.5 !text-[8.5px]" style={{ background: 'var(--accent)', color: 'var(--paper-solid)', borderRadius: 2 }}>Start here</span>}
                  </button>
                ))}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'perform' && chosenExit && (
          <motion.div key="perform" className="contents">
            <Top k="t-perf" kicker="Exit" title={chosenExit.title} />
            <Bottom k="b-perf">
              <p className="serif italic text-[17px] leading-snug" style={{ color: 'var(--ink)' }}>{chosenExit.body}</p>
              <div className="mt-4 flex justify-end min-h-[48px]">
                {performed && <Go onClick={enterClose} testid="continue">Curtain</Go>}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'close' && (
          <motion.div key="close" className="contents">
            <Top k="t-close" kicker="Curtain" title="Which is closer to how it feels now?" />
            <Bottom k="b-close">
              <div className="flex flex-col">
                {CLOSES.map((c, i) => (
                  <button key={c.id} type="button" onClick={() => onClose(c.id)} className="serif min-h-[50px] text-left text-[18px] flex items-center justify-between gap-3"
                    style={{ color: 'var(--ink)', borderTop: i ? '1px solid var(--line)' : undefined }} data-testid={`close-${c.id}`}>
                    <span>{c.label}</span><span aria-hidden className="text-[14px]" style={{ color: 'var(--ink2)' }}>→</span>
                  </button>
                ))}
              </div>
            </Bottom>
          </motion.div>
        )}

        {step === 'shelf' && (
          <motion.div key="shelf" className="contents">
            <Top k="t-shelf" kicker="Repertoire" title="Scenes you’ve worked through"
              sub={word ? `“${word}” joins the others. You found a word for it.` : 'No word this time. The scene still earns its place.'} />
            <Bottom k="b-shelf">
              <div className="flex justify-center"><button type="button" className="quiet !text-[15px]" onClick={onRestart} data-testid="restart">Start again</button></div>
            </Bottom>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Stage({ onRecord }: DirectionProps) {
  const [run, setRun] = useState(0);
  return <Session key={run} onRecord={onRecord} onRestart={() => setRun(r => r + 1)} />;
}
