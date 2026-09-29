import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { readPalette, useReducedMotion } from './Instrument';

const ROW = 46;

/** The collection: every word you've found is a string. Today's is strung on, then it all rings once. */
export function Harp({ words, fresh, isNew = true, onStrum }: { words: string[]; fresh: string | null; isNew?: boolean; onStrum?: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const freshIdx = fresh ? words.indexOf(fresh) : -1;
  const strum = useRef(onStrum); strum.current = onStrum;
  const H = words.length * ROW + 28;

  useEffect(() => {
    const c = cvs.current!; const ctx = c.getContext('2d')!;
    const pal = readPalette(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect(); const w = r.width; const h = r.height;
    c.width = w * dpr; c.height = h * dpr;
    const start = performance.now() / 1000;
    const stringAt = reduced ? 0 : 0.5, stringDur = reduced ? 0.01 : 1.1;
    const strumAt = reduced ? 0.1 : 1.9;
    let strummed = false; let raf = 0;
    const n = words.length;
    const x0 = 26;
    const len = (i: number) => (w - x0 - 14) * (0.62 + 0.38 * (i / Math.max(1, n - 1)));
    const col = pal.dark ? pal.strA : pal.ink;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const now = performance.now() / 1000; const T = now - start;
      if (!strummed && T >= strumAt) { strummed = true; strum.current?.(); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      // pillar
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${pal.dark ? 0.22 : 0.28})`;
      ctx.beginPath(); ctx.roundRect(x0 - 12, 8, 6, h - 16, 3); ctx.fill();
      // neck: a curve through the string ends
      // frame: the neck runs through every string end (lengths are linear, so it's one clean line), plus a crossbar to the pillar
      const yEnd = (i: number) => 14 + i * ROW + ROW - 6;
      const slope = n > 1 ? (len(n - 1) - len(0)) / (yEnd(n - 1) - yEnd(0)) : 0;
      const topY = 8; const topX = x0 + len(0) + 6 - slope * (yEnd(0) - topY);
      ctx.beginPath();
      ctx.moveTo(x0 - 9, topY + 2); ctx.quadraticCurveTo((x0 + topX) / 2, topY - 6, topX, topY);
      ctx.lineTo(x0 + len(n - 1) + 6, yEnd(n - 1) + 6);
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${pal.dark ? 0.2 : 0.25})`; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
      for (let i = 0; i < n; i++) {
        const y = 14 + i * ROW + ROW - 6;
        const L = len(i);
        const isFresh = i === freshIdx;
        let drawn = 1;
        if (isFresh) drawn = Math.max(0, Math.min(1, (T - stringAt) / stringDur)), drawn = 1 - Math.pow(1 - drawn, 3);
        const age = T - (strumAt + i * 0.07);
        const vib = !reduced && age > 0 ? 5 * Math.exp(-age / 0.6) * Math.cos(age * 40) : 0;
        const c2 = isFresh ? pal.accent : col;
        const lw = 1 + (i / n) * 1.8;
        if (pal.dark) {
          ctx.strokeStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},${isFresh ? 0.14 : 0.05})`; ctx.lineWidth = lw * 4;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 + L * drawn / 2, y + vib, x0 + L * drawn, y); ctx.stroke();
        }
        ctx.strokeStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},${isFresh ? 1 : pal.dark ? 0.8 : 0.75})`; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 + L * drawn / 2, y + vib * 2, x0 + L * drawn, y); ctx.stroke();
        ctx.fillStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},0.9)`;
        ctx.beginPath(); ctx.arc(x0 - 3, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      if (T > strumAt + 3) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [words, freshIdx, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full" style={{ height: H }}>
      <canvas ref={cvs} className="absolute inset-0 w-full h-full" aria-hidden />
      <ul className="absolute inset-0" aria-label="Words you've found">
        {words.map((wd, i) => (
          <motion.li key={wd} className="absolute left-[34px] text-[14px] tracking-[0.02em]"
            style={{ top: 14 + i * ROW + ROW - 30, color: i === freshIdx ? 'var(--t-accent)' : 'var(--t-ink-2)', fontWeight: i === freshIdx ? 600 : 500 }}
            initial={i === freshIdx && !reduced ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }} transition={{ delay: i === freshIdx ? 1.2 : 0, duration: 0.6 }}>
            {wd}{i === freshIdx && <span className="ml-2 text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--t-ink-2)' }}>{isNew ? 'new' : 'again'}</span>}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
