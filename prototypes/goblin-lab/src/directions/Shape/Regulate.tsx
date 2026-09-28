import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ShapeStore } from './Blob';
import { copyFeel, lerp, type Feel } from './features';
import type { Palette } from './Scene';

type Kind = 'smooth' | 'warm';
const SLOW_MIN = 45, SLOW_MAX = 380, FAST = 600;

/**
 * Stroking as regulation. Slow strokes (C-tactile range) smooth the object down; fast ones make it flinch.
 * In shutdown the same surface asks for brisk rubbing instead: activation, not calming.
 */
export function Regulate({ kind, store, pal, reduce, onDone }: { kind: Kind; store: ShapeStore; pal: Palette; reduce: boolean; onDone: () => void }) {
  const base = useRef<Feel>(copyFeel(store.main));
  const progress = useRef(0);
  const cvs = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const ptr = useRef<{ down: boolean; x: number; y: number; t: number; ema: number; lastFlinch: number }>({ down: false, x: 0, y: 0, t: 0, ema: 0, lastFlinch: 0 });
  const holding = useRef(false);
  const [hint, setHint] = useState<'start' | 'good' | 'slower' | 'fast' | 'brisker' | 'done'>('start');
  const [enough, setEnough] = useState(false);
  const [held, setHeld] = useState(false);
  const finished = useRef(false);
  const doneCb = useRef(onDone); doneCb.current = onDone;

  const apply = (p: number) => {
    const b = base.current, m = store.main;
    if (kind === 'smooth') {
      m.sharp = lerp(b.sharp, Math.min(b.sharp, -0.45), p);
      m.heat = lerp(b.heat, b.heat > 0 ? 0 : b.heat, p);
      m.buzz = lerp(b.buzz, Math.min(b.buzz, -0.6), p);
      m.clench = lerp(b.clench, b.clench * 0.45, p);
    } else {
      m.grey = lerp(b.grey, 0, p);
      m.heat = lerp(b.heat, 0.42, p);
      m.buzz = lerp(b.buzz, 0.15, p);
      m.weight = lerp(b.weight, 0.1, p);
    }
  };
  const bump = (d: number) => {
    if (finished.current) return;
    progress.current = Math.max(0, Math.min(1, progress.current + d));
    apply(progress.current);
    if (progress.current >= 1) {
      finished.current = true; setHint('done');
      try { navigator.vibrate?.(15); } catch { /* optional */ }
      window.setTimeout(() => doneCb.current(), 1700);
    }
  };

  useEffect(() => { const t = window.setTimeout(() => setEnough(true), 20000); return () => window.clearTimeout(t); }, []);

  // trail canvas: fade + draw
  const trail = useRef<{ x: number; y: number; hot: boolean }[]>([]);
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf = 0, last = performance.now(), sweep = 0;
    const resize = () => { const d = Math.min(2, window.devicePixelRatio || 1); c.width = c.clientWidth * d; c.height = c.clientHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 1.4)})`;
      ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
      // tap alternative: holding does a slow automatic stroke
      if (holding.current && !finished.current) {
        sweep += dt;
        const sc = store.screen;
        const x = sc.x + Math.sin(sweep * 1.1) * sc.r * 0.75;
        const y = sc.y + Math.sin(sweep * 0.55) * sc.r * 0.35 - sc.r * 0.1;
        trail.current.push({ x, y, hot: false });
        bump(dt / (kind === 'smooth' ? 7 : 6));
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const p of trail.current) {
        const R = p.hot ? 12 : 18;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        const col = p.hot ? '255,96,64' : kind === 'warm' ? '255,150,70' : '255,214,160';
        g.addColorStop(0, `rgba(${col},0.16)`); g.addColorStop(0.5, `rgba(${col},0.07)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      }
      trail.current.length = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, store]);

  const addTrail = (x0: number, y0: number, x1: number, y1: number, hot: boolean) => {
    const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.ceil(d / 5));
    const sc = store.screen, lim = sc.r * 1.05;
    for (let i = 1; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (Math.hypot(x - sc.x, y - sc.y) < lim) trail.current.push({ x, y, hot });
    }
  };

  const local = (e: React.PointerEvent) => { const r = surface.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => {
    const { x, y } = local(e);
    ptr.current = { ...ptr.current, down: true, x, y, t: e.timeStamp, ema: 0 };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* */ }
  };
  const onMove = (e: React.PointerEvent) => {
    const P = ptr.current; if (!P.down || finished.current) return;
    const { x, y } = local(e);
    const dist = Math.hypot(x - P.x, y - P.y);
    const dt = (e.timeStamp - P.t) / 1000;
    if (dt <= 0.001 || dist < 0.5) return;
    const inst = dist / dt;
    const a = 1 - Math.exp(-dt / 0.09);
    P.ema = P.ema === 0 ? inst : P.ema + (inst - P.ema) * a;
    const sc = store.screen;
    const rad = Math.max(60, sc.r * 1.45);
    const near = (px: number, py: number) => Math.hypot(px - sc.x, py - sc.y) < rad;
    const on = near(x, y) || near(P.x, P.y) || near((x + P.x) / 2, (y + P.y) / 2);
    if (on) {
      if (kind === 'smooth') {
        if (P.ema >= SLOW_MIN && P.ema <= SLOW_MAX) { bump(dist / 1900); addTrail(P.x, P.y, x, y, false); setHint('good'); }
        else if (P.ema > FAST) {
          addTrail(P.x, P.y, x, y, true); setHint('fast');
          if (e.timeStamp - P.lastFlinch > 450) { P.lastFlinch = e.timeStamp; store.flinch = 0.75; bump(-0.035); }
        } else if (P.ema > SLOW_MAX) { bump(dist / 7000); addTrail(P.x, P.y, x, y, false); setHint('slower'); }
      } else {
        if (P.ema > 420) { bump(dist / 3600); addTrail(P.x, P.y, x, y, false); setHint('good'); }
        else { bump(dist / 9000); addTrail(P.x, P.y, x, y, false); setHint('brisker'); }
      }
    }
    P.x = x; P.y = y; P.t = e.timeStamp;
  };
  const onUp = () => { ptr.current.down = false; };

  const title = kind === 'smooth' ? 'Smooth it down. Slowly.' : 'Warm it up.';
  const hints: Record<typeof hint, string> = kind === 'smooth' ? {
    start: 'Stroke across it with one finger, slow and even.',
    good: 'Like that. Keep going.',
    slower: 'A little slower.',
    fast: 'Slower, like stroking a sleeping cat.',
    brisker: '',
    done: 'Softer now.',
  } : {
    start: 'Rub it briskly, like warming cold hands.',
    good: 'Yes. Keep rubbing.',
    slower: '', fast: '',
    brisker: 'Brisker. Quick little rubs.',
    done: 'There you are.',
  };

  return (
    <>
      <canvas ref={cvs} className="absolute inset-0 w-full h-full pointer-events-none z-[25]" style={{ mixBlendMode: 'screen' }} />
      <div ref={surface} className="absolute inset-0 z-[24]" style={{ touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-testid="stroke-surface" />
      <div className="absolute inset-x-0 top-0 z-30 px-6 pt-6 pointer-events-none">
        <p className="kicker" style={{ color: pal.ink2 }}>{kind === 'smooth' ? 'Hands on' : 'Hands on, briskly'}</p>
        <h2 className="mt-2 text-[25px] leading-[1.15] font-normal tracking-[-0.01em]">{title}</h2>
        <AnimatePresence mode="wait">
          <motion.p key={hint} initial={{ opacity: 0, y: reduce ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            className="mt-2 text-[15px] min-h-[22px]" style={{ color: hint === 'fast' ? pal.brass : pal.ink2 }} aria-live="polite">
            {hints[hint]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-30 px-6 pb-7 pt-10 flex flex-col items-center gap-3 fade-up" style={{ ['--wall' as string]: pal.wall }}>
        <button type="button" aria-label={kind === 'smooth' ? 'Press and hold to smooth it slowly' : 'Press and hold to warm it'}
          onPointerDown={() => { holding.current = true; setHeld(true); }}
          onPointerUp={() => { holding.current = false; setHeld(false); }}
          onPointerLeave={() => { holding.current = false; setHeld(false); }}
          onPointerCancel={() => { holding.current = false; setHeld(false); }}
          onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holding.current = true; setHeld(true); } }}
          onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { holding.current = false; setHeld(false); } }}
          className="plaque min-h-12 px-5 touch-none" data-held={held}
          style={{ background: pal.paper, borderColor: pal.line }}>
          <span className="kicker" style={{ color: pal.ink }}>{held ? (kind === 'smooth' ? 'Smoothing…' : 'Warming…') : kind === 'smooth' ? 'Or press and hold here' : 'Or press and hold to warm'}</span>
        </button>
        <div className="h-11 grid place-items-center">
          <AnimatePresence>
            {enough && hint !== 'done' && (
              <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="quiet min-h-11 text-[14px]" style={{ color: pal.ink2 }}
                onClick={() => { finished.current = true; doneCb.current(); }}>
                That’s enough for now
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
