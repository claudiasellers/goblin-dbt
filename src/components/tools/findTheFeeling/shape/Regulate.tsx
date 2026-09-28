import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { FindTheFeelingGates } from '../../../../data/findTheFeelingTypes';
import type { LiveStore, RegKind } from './feel';

export interface RegulateCopy { title: string; sub?: string; tooFast?: string; hold: string; enough: string }

/**
 * Stroking as regulation. Slow strokes (the gate's C-tactile range) smooth the object down; fast
 * ones make it flinch. In shutdown the same surface asks for brisk rubbing instead: activation,
 * not calming. Press-and-hold (pointer or keyboard) does a slow automatic stroke for anyone who
 * can't or won't swipe. The escape link appears after the gate's escape delay.
 */
export function Regulate({ kind, store, reduce, copy, gates, onProgress, onDone }: {
  kind: RegKind; store: LiveStore; reduce: boolean; copy: RegulateCopy;
  gates: Pick<FindTheFeelingGates, 'slowStrokePxPerSec' | 'fastStrokePxPerSec' | 'regulationEscapeSeconds'>;
  onProgress: (p: number) => void; onDone: (skipped: boolean) => void;
}) {
  const [slowMin, slowMax] = gates.slowStrokePxPerSec;
  const fast = gates.fastStrokePxPerSec;
  const progress = useRef(0);
  const cvs = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const ptr = useRef({ down: false, x: 0, y: 0, t: 0, ema: 0, lastFlinch: 0 });
  const holding = useRef(false);
  const [tooFast, setTooFast] = useState(false);
  const [done, setDone] = useState(false);
  const [enough, setEnough] = useState(false);
  const [held, setHeld] = useState(false);
  const finished = useRef(false);
  const doneTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(doneTimer.current), []);
  const cb = useRef({ onProgress, onDone });
  useEffect(() => { cb.current = { onProgress, onDone }; });

  const bump = useRef((d: number) => {
    if (finished.current) return;
    progress.current = Math.max(0, Math.min(1, progress.current + d));
    cb.current.onProgress(progress.current);
    if (progress.current >= 1) {
      finished.current = true; setDone(true); setTooFast(false);
      try { navigator.vibrate?.(15); } catch { /* optional */ }
      doneTimer.current = window.setTimeout(() => cb.current.onDone(false), reduce ? 700 : 1700);
    }
  });

  useEffect(() => { cb.current.onProgress(0); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setEnough(true), gates.regulationEscapeSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [gates.regulationEscapeSeconds]);
  useEffect(() => {
    if (!tooFast) return;
    const t = window.setTimeout(() => setTooFast(false), 1600);
    return () => window.clearTimeout(t);
  }, [tooFast]);

  // trail canvas: fade + draw; also drives press-and-hold
  const trail = useRef<{ x: number; y: number; hot: boolean }[]>([]);
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf = 0, last = performance.now(), sweep = 0;
    // Hold accrues on real elapsed time so it takes the same time on a slow device (capped for tab switches).
    const resize = () => { const d = Math.min(2, window.devicePixelRatio || 1); c.width = c.clientWidth * d; c.height = c.clientHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    const loop = (now: number) => {
      const real = Math.min(1, (now - last) / 1000); last = now;
      const dt = Math.min(0.25, real);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 1.4)})`;
      ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
      if (holding.current && !finished.current) {
        sweep += dt;
        const sc = store.screen;
        trail.current.push({ x: sc.x + Math.sin(sweep * 1.1) * sc.r * 0.75, y: sc.y + Math.sin(sweep * 0.55) * sc.r * 0.35 - sc.r * 0.1, hot: false });
        bump.current(real / (kind === 'smooth' ? 7 : 6));
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

  const local = (e: RPointerEvent) => { const r = surface.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: RPointerEvent) => {
    const { x, y } = local(e);
    ptr.current = { ...ptr.current, down: true, x, y, t: performance.now(), ema: 0 };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* optional */ }
  };
  const onMove = (e: RPointerEvent) => {
    const P = ptr.current; if (!P.down || finished.current) return;
    const { x, y } = local(e);
    const dist = Math.hypot(x - P.x, y - P.y);
    const now = performance.now();
    const dt = (now - P.t) / 1000;
    if (dt <= 0.001 || dist < 0.5) return;
    const inst = dist / dt;
    const a = 1 - Math.exp(-dt / 0.09);
    P.ema = P.ema === 0 ? inst : P.ema + (inst - P.ema) * a;
    const sc = store.screen;
    const rad = Math.max(60, sc.r * 1.45);
    const near = (px: number, py: number) => Math.hypot(px - sc.x, py - sc.y) < rad;
    if (near(x, y) || near(P.x, P.y) || near((x + P.x) / 2, (y + P.y) / 2)) {
      if (kind === 'smooth') {
        if (P.ema >= slowMin && P.ema <= slowMax) { bump.current(dist / 1900); addTrail(P.x, P.y, x, y, false); }
        else if (P.ema > fast) {
          addTrail(P.x, P.y, x, y, true); setTooFast(true);
          if (now - P.lastFlinch > 450) { P.lastFlinch = now; store.flinch(0.75); bump.current(-0.035); }
        } else if (P.ema > slowMax) { bump.current(dist / 7000); addTrail(P.x, P.y, x, y, false); }
      } else {
        // brisk rubbing: anything above the slow-stroke range warms quickly
        bump.current(dist / (P.ema > slowMax ? 3600 : 9000)); addTrail(P.x, P.y, x, y, false);
      }
    }
    P.x = x; P.y = y; P.t = now;
  };
  const onUp = () => { ptr.current.down = false; };
  const hold = (on: boolean) => { holding.current = on; setHeld(on); };

  const hint = done ? '' : tooFast && copy.tooFast ? copy.tooFast : copy.sub ?? '';
  return (
    <>
      <canvas ref={cvs} className="sr-fill sr-none" style={{ zIndex: 25, width: '100%', height: '100%', mixBlendMode: 'screen' }} aria-hidden />
      <div ref={surface} className="sr-fill" style={{ zIndex: 24, touchAction: 'none' }} aria-hidden
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-testid="stroke-surface" />
      <div className="sr-top">
        <h2 className="sr-title" style={{ fontSize: 25 }}>{copy.title}</h2>
        <AnimatePresence mode="wait">
          <m.p key={hint} initial={{ opacity: 0, y: reduce ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="sr-sub" style={{ fontSize: 16, minHeight: 24, color: tooFast ? 'var(--brass)' : undefined, fontWeight: tooFast ? 600 : undefined }} aria-live="polite">
            {hint}
          </m.p>
        </AnimatePresence>
      </div>
      <div className="sr-reg-bottom">
        <button type="button" data-held={held} data-testid="hold" className="sr-plaque sr-hold"
          onPointerDown={() => hold(true)} onPointerUp={() => hold(false)} onPointerLeave={() => hold(false)} onPointerCancel={() => hold(false)}
          onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold(true); } }}
          onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') hold(false); }}
          onBlur={() => hold(false)} onContextMenu={e => e.preventDefault()}>
          <span className="sr-kicker" style={{ color: 'var(--ink)' }}>{copy.hold}</span>
        </button>
        <div className="sr-slot44">
          {enough && !done && (
            <m.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sr-quiet"
              data-testid="reg-skip" onClick={() => { if (finished.current) return; finished.current = true; cb.current.onDone(true); }}>
              {copy.enough}
            </m.button>
          )}
        </div>
      </div>
    </>
  );
}
