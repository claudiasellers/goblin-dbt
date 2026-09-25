import { useEffect, useRef } from 'react';
import type { UrgeId } from '../../../../data/findTheFeelingTypes';
import { dprCap, readPalette, watchScheme, type Palette } from './palette';

const PERIOD: Record<UrgeId, number> = { chase: 1.5, fight: 2.0, hide: 3.0, blank: 3.2 };
/** Reduced motion: one telling still frame per gesture. */
const STILL: Record<UrgeId, number> = { chase: 0.3, fight: 0.18, hide: 0.45, blank: 0.9 };

/** A tiny looping string that acts out an urge, keyed by urge id. */
export function MiniString({ kind, active, reduced }: { kind: UrgeId; active: boolean; reduced: boolean }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const act = useRef(active);
  useEffect(() => { act.current = active; }, [active]);

  useEffect(() => {
    const c = cvs.current!; const ctx = c.getContext('2d');
    if (!ctx) return;
    let pal: Palette = readPalette(c);
    const dpr = dprCap();
    let w = 0, h = 0;
    const size = () => { const r = c.getBoundingClientRect(); w = r.width; h = r.height; c.width = Math.max(1, w * dpr); c.height = Math.max(1, h * dpr); };
    size();
    const ro = new ResizeObserver(() => { size(); if (reduced) draw(); }); ro.observe(c);
    const t0 = performance.now() / 1000 + Math.random() * 0.4;
    let raf = 0;
    const NS = 90;
    const draw = () => {
      const col = pal.dark ? pal.strA : pal.ink;
      const now = performance.now() / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const cy = h / 2; let xL = 10, xR = w - 10;
      let alpha = act.current ? 1 : 0.8; let lw = 1.6;
      let yFn: (u: number) => number = () => 0;
      let endX = 1;
      const period = PERIOD[kind];
      const ph = reduced ? STILL[kind] : ((now - t0) % period) / period;
      const T = ph * period;
      if (kind === 'chase') {
        // three insistent pulses, each higher, again and again
        yFn = u => {
          let y = 0;
          for (let i = 0; i < 3; i++) {
            const a = T - i * 0.3; if (a < 0) continue;
            const m = 2 + i * 1.6;
            y += 9 * Math.exp(-a / 0.22) * Math.sin(Math.PI * m * u) * Math.cos(a * 38) * Math.sin(Math.PI * u);
          }
          return y;
        };
      } else if (kind === 'fight') {
        // one sharp, jagged, accented stab
        yFn = u => {
          const a = T - 0.3; if (a < 0) return 0;
          const tri = u < 0.42 ? u / 0.42 : (1 - u) / 0.58;
          const jag = Math.sin(u * 90 + a * 60) * 0.25 * Math.exp(-a / 0.1);
          return -18 * Math.exp(-a / 0.16) * (tri + jag) * (a < 0.03 ? a / 0.03 : 1);
        };
        lw = 1.6 + 1.6 * Math.max(0, Math.exp(-Math.max(0, T - 0.3) / 0.2));
      } else if (kind === 'hide') {
        // a phrase that gets quieter as it moves away
        const k = Math.min(1, T / 2.6);
        const shrink = 1 - 0.55 * k;
        const mid = w / 2; xL = mid - (mid - 10) * shrink; xR = mid + (mid - 10) * shrink;
        alpha *= 1 - 0.85 * k; lw = 1.6 * (1 - 0.6 * k);
        yFn = u => 8 * (1 - k) * Math.sin(Math.PI * 2 * u) * Math.cos(T * 9) * Math.sin(Math.PI * u);
      } else {
        // a line that flattens and simply stops partway
        const a = T;
        endX = Math.min(0.62, 0.15 + a * 0.9);
        alpha *= a > 1.2 ? 0.55 : 0.85;
        yFn = u => 5 * Math.exp(-a / 0.35) * Math.sin(Math.PI * 3 * u) * Math.cos(a * 30);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.12)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(w - 10, cy); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= NS; i++) {
        const u = i / NS; if (u > endX) break;
        const x = xL + (xR - xL) * u; const y = cy + yFn(u);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      const c2 = act.current ? pal.accent : col;
      ctx.strokeStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},${alpha})`; ctx.lineWidth = lw; ctx.stroke();
      if (kind === 'blank') {
        const x = xL + (xR - xL) * endX;
        ctx.fillStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},${alpha})`;
        ctx.beginPath(); ctx.arc(x, cy, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    };
    const loop = () => { raf = requestAnimationFrame(loop); draw(); };
    if (reduced) draw(); else raf = requestAnimationFrame(loop);
    const unwatch = watchScheme(() => { pal = readPalette(c); if (reduced) draw(); });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); unwatch(); };
  }, [kind, reduced, active]);

  return <canvas ref={cvs} className="block w-full h-[40px]" aria-hidden />;
}
