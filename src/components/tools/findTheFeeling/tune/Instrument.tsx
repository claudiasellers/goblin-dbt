import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import type { InstState } from './instState';
import { beatHz, tremHz, type Sound } from './sound';
import { dprCap, mix, readPalette, rgba, watchScheme, type Palette, type RGB } from './palette';

// cheap value noise (module-level table: fixed once per page load)
const RND = Array.from({ length: 512 }, () => Math.random() * 2 - 1);
const vnoise = (x: number, seed: number) => {
  const i = Math.floor(x); const f = x - i; const k = f * f * (3 - 2 * f);
  const a = RND[(i + seed) & 511]; const b = RND[(i + 1 + seed) & 511];
  return a + (b - a) * k;
};

export type Interact = 'none' | 'hold' | 'pluck';

interface Props {
  instRef: RefObject<InstState>;
  interact: Interact;
  reduced: boolean;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  onPluck?: (i: number) => void;
  label?: string;
}

const N = 150;

/**
 * Two strings on a wooden body. Their standing waves carry the sound: beating (rough), a jagged
 * fuzzy line (grit), wave count and thickness (register), shimmering beads (pulse). One rAF loop,
 * stopped on unmount; DPR capped at 2; reduced motion draws still waves with the beat as markers.
 */
export function Instrument({ instRef, interact, reduced, onHoldStart, onHoldEnd, onPluck, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onHoldStart, onHoldEnd, onPluck });
  useLayoutEffect(() => { cb.current = { onHoldStart, onHoldEnd, onPluck }; });
  const geo = useRef({ w: 390, h: 700, yA: 0, yB: 0, xL: 0, xR: 0 });
  const down = useRef<{ id: number; y: number } | null>(null);
  const keyHeld = useRef(false);

  useEffect(() => {
    const canvas = cvs.current!; const host = wrap.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let pal: Palette = readPalette(host);
    let bgCache: HTMLCanvasElement | null = null;
    let dpr = 1;

    const buildBg = () => {
      const { w, h } = geo.current;
      if (w < 2 || h < 2) return;
      const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const g = c.getContext('2d'); if (!g) return;
      g.scale(dpr, dpr);
      const lg = g.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, rgba(pal.bg, 1)); lg.addColorStop(1, rgba(pal.bg2, 1));
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      // grain: long, slightly wavy fibres
      const grainC: RGB = pal.dark ? [255, 240, 215] : [120, 86, 48];
      for (let i = 0; i < 70; i++) {
        const y0 = Math.random() * h; const amp = 2 + Math.random() * 6; const fr = 0.004 + Math.random() * 0.01; const ph = Math.random() * 6;
        g.beginPath();
        for (let x = -10; x <= w + 10; x += 8) { const y = y0 + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 3.1) * amp * 0.3; if (x === -10) g.moveTo(x, y); else g.lineTo(x, y); }
        g.strokeStyle = rgba(grainC, pal.dark ? 0.018 + Math.random() * 0.02 : 0.03 + Math.random() * 0.04);
        g.lineWidth = 0.6 + Math.random() * 1.4; g.stroke();
      }
      const rg = g.createRadialGradient(w / 2, h * 0.42, h * 0.1, w / 2, h * 0.45, h * 0.8);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(90,60,30,0.10)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      bgCache = c;
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      dpr = dprCap();
      geo.current.w = r.width; geo.current.h = r.height;
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      buildBg();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(host);
    const unwatch = watchScheme(() => { pal = readPalette(host); buildBg(); });

    let raf = 0; let last = performance.now() / 1000;
    const ys = new Float32Array(N + 1);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const I = instRef.current;
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last); last = now;
      const t = reduced ? 0 : now;
      const S = I.cur; const T = I.target;
      const k = reduced ? 1 : 1 - Math.exp(-dt / I.tau);
      (Object.keys(T) as (keyof Sound)[]).forEach(key => {
        if (key === 'glide') {
          const tau = T.glide > S.glide ? 1.3 : 1.8;
          S.glide += (T.glide - S.glide) * (reduced ? 1 : 1 - Math.exp(-dt / tau));
        } else S[key] += (T[key] - S[key]) * k;
      });
      const L = I.layout; const Lc = I.layoutCur; const kl = reduced ? 1 : 1 - Math.exp(-dt / 0.35);
      Lc.cy += (L.cy - Lc.cy) * kl; Lc.gap += (L.gap - Lc.gap) * kl; Lc.amp += (L.amp - Lc.amp) * kl;

      const { w, h } = geo.current;
      const xL = 30, xR = w - 30;
      const cy = h * Lc.cy; const yA = cy - Lc.gap / 2; const yB = cy + Lc.gap / 2;
      Object.assign(geo.current, { yA, yB, xL, xR });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bgCache) ctx.drawImage(bgCache, 0, 0, w, h); else ctx.clearRect(0, 0, w, h);

      const vis = 1 - S.hush;
      if (vis < 0.01) return;

      // body: a rosette behind the strings
      ctx.save();
      ctx.globalAlpha = vis;
      const rr = Math.min(w * 0.3, 118) * (0.6 + 0.4 * Lc.amp);
      const holeC: RGB = pal.dark ? [0, 0, 0] : [70, 48, 26];
      const hg = ctx.createRadialGradient(w / 2, cy, rr * 0.2, w / 2, cy, rr);
      hg.addColorStop(0, rgba(holeC, pal.dark ? 0.55 : 0.10)); hg.addColorStop(1, rgba(holeC, pal.dark ? 0.2 : 0.03));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(w / 2, cy, rr, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(w / 2, cy, rr + 7 + i * 5, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(pal.dark ? pal.strA : pal.ink, pal.dark ? 0.07 - i * 0.015 : 0.10 - i * 0.025); ctx.lineWidth = i === 1 ? 2 : 0.8; ctx.stroke();
      }
      if (S.bloom > 0.01) {
        const bg2 = ctx.createRadialGradient(w / 2, cy, 0, w / 2, cy, rr * 1.9);
        bg2.addColorStop(0, rgba(pal.gold, (pal.dark ? 0.22 : 0.16) * S.bloom)); bg2.addColorStop(1, rgba(pal.gold, 0));
        ctx.fillStyle = bg2; ctx.fillRect(0, cy - rr * 2, w, rr * 4);
      }
      const nutC = pal.dark ? pal.strA : pal.ink;
      const top = yA - 22, bot = yB + 22 + S.bloom * Lc.gap * 0.55;
      for (const x of [xL - 8, xR + 8]) {
        ctx.fillStyle = rgba(nutC, pal.dark ? 0.16 : 0.22);
        ctx.beginPath(); ctx.roundRect(x - 2.5, top, 5, bot - top, 2.5); ctx.fill();
      }
      ctx.restore();

      // --- strings
      const roughEff = S.rough * (1 - 0.88 * S.glide);
      const beat = Math.min(6.5, beatHz(S));
      const depth = Math.min(0.88, 0.18 + roughEff * 0.95);
      const throb = reduced ? 1 : 1 - depth + depth * Math.abs(Math.cos(Math.PI * beat * t));
      const tw = reduced ? 0 : Math.exp(-(now - I.twitchAt) / 0.32);
      const trem = Math.min(9, tremHz(S.pulse));
      const shimmer = reduced ? 1 : 1 - 0.55 * S.pulse * (0.5 + 0.5 * Math.sin(Math.PI * 2 * trem * t));
      const mA = 1 + S.register * 4.2;
      const fvis = 0.9 + S.register * 2.4;
      const baseAmp = (3 + S.loud * 40 + tw * 18) * Lc.amp;
      const lw0 = 1.15 + (1 - S.register) * 2.9;
      const warmK = Math.min(1, S.warm * 0.75 + S.bloom * 0.35);
      const colA = mix(pal.strA, pal.warm, warmK * 0.7);
      const colB = mix(mix(pal.strB, pal.warm, warmK * 0.5), colA, Math.min(1, S.glide * 0.55 + S.bloom * 0.8));
      const bright = pal.dark ? 0.5 + S.loud * 0.5 + S.bloom * 0.2 : 0.72 + S.loud * 0.28;

      const strings = [
        { y: yA, m: mA, col: colA, lw: lw0, ph: 0, seed: 11, a: 1 },
        { y: yB, m: mA * (1 + roughEff * 0.32), col: colB, lw: lw0 * 0.86, ph: 1.7, seed: 97, a: 1 },
      ];
      if (S.bloom > 0.01) strings.push({ y: yB + Lc.gap * 0.55 * S.bloom + 4, m: mA * 1.5, col: mix(pal.gold, colA, 0.3), lw: lw0 * 0.7, ph: 3.1, seed: 211, a: S.bloom });

      const nStep = Math.floor(now * 24);
      strings.forEach((st, si) => {
        const env = throb * (si === 2 ? 0.55 : 1);
        const amp = baseAmp * env;
        const plucks = I.plucks[si] ?? [];
        const path = (noiseSeed: number, noiseAmt: number) => {
          for (let i = 0; i <= N; i++) {
            const u = i / N;
            const pin = Math.pow(Math.sin(Math.PI * u), 0.55);
            let s = Math.sin(Math.PI * st.m * u) * Math.cos(Math.PI * 2 * fvis * t + st.ph)
              + 0.16 * Math.sin(Math.PI * (st.m * 2 + 1) * u + t * 1.3 + st.ph) * Math.cos(Math.PI * 2 * fvis * 0.5 * t);
            if (S.grit > 0.01) {
              const sq = Math.sign(s) * Math.pow(Math.abs(s), 1 - 0.7 * S.grit);
              const zig = 2 * ((st.m * u * 1.5 + t * fvis * 0.3) % 1) - 1;
              s = s * (1 - S.grit) + sq * S.grit * 0.8 + zig * S.grit * 0.22;
            }
            const nz = (S.grit * 3.2 + tw * 7) * vnoise(u * 70, noiseSeed + (reduced ? 0 : nStep * 7)) * Math.pow(Math.sin(Math.PI * u), 0.3);
            let y = amp * pin * s + nz * noiseAmt;
            for (const p of plucks) {
              const age = now - p.t0; if (age > 2.2) continue;
              const tri = u < p.u ? u / p.u : (1 - u) / (1 - p.u);
              // reduced motion: the string is pulled and eases back, without ringing
              const ring = reduced ? 1 : Math.cos(Math.PI * 2 * 7 * age);
              y += p.s * 26 * Lc.amp * tri * Math.exp(-age / 0.5) * ring;
            }
            ys[i] = st.y + y;
          }
          const stride = noiseAmt > 1 ? 1 : 1 + Math.round(S.grit * 4);
          ctx.beginPath();
          for (let i = 0; i <= N; i += stride) { const x = xL + (xR - xL) * (i / N); if (i) ctx.lineTo(x, ys[i]); else ctx.moveTo(x, ys[i]); }
          if (N % stride) ctx.lineTo(xR, ys[N]);
        };

        ctx.save();
        ctx.globalAlpha = vis * st.a;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        path(st.seed, 1);
        if (pal.dark) {
          ctx.globalCompositeOperation = 'lighter';
          const glow = 0.35 + S.loud * 1.1 + S.bloom * 0.5 + tw;
          ctx.strokeStyle = rgba(st.col, 0.035 * glow * shimmer); ctx.lineWidth = st.lw * 9; ctx.stroke();
          ctx.strokeStyle = rgba(st.col, 0.08 * glow * shimmer); ctx.lineWidth = st.lw * 3.6; ctx.stroke();
          ctx.strokeStyle = rgba(st.col, bright * shimmer); ctx.lineWidth = st.lw; ctx.stroke();
        } else {
          ctx.save(); ctx.translate(2, 7);
          ctx.strokeStyle = 'rgba(70,45,20,0.10)'; ctx.lineWidth = st.lw * 2.6; ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = rgba(st.col, bright * (0.75 + 0.25 * shimmer)); ctx.lineWidth = st.lw; ctx.stroke();
        }
        if (S.grit > 0.15 || tw > 0.1) {
          const fz = Math.max(S.grit, tw);
          for (let j = 0; j < 2; j++) {
            path(st.seed + 53 * (j + 1), 1.8);
            ctx.strokeStyle = rgba(st.col, (pal.dark ? 0.28 : 0.22) * fz * shimmer); ctx.lineWidth = Math.max(0.6, st.lw * 0.45); ctx.stroke();
          }
        }
        if (S.pulse > 0.12 && si < 2) {
          const n = Math.max(1, Math.round(st.m));
          for (let q = 0; q < n; q++) {
            const u = (q + 0.5) / st.m; if (u >= 1) break;
            const i = Math.round(u * N);
            const x = xL + (xR - xL) * u;
            const a = reduced ? S.pulse * 0.8 : S.pulse * (0.5 + 0.5 * Math.sin(Math.PI * 2 * trem * t + q * 1.3));
            ctx.fillStyle = rgba(st.col, (pal.dark ? 0.9 : 0.7) * a);
            ctx.beginPath(); ctx.arc(x, ys[i], 1.2 + S.pulse * 2.2, 0, Math.PI * 2); ctx.fill();
          }
        }
        // reduced motion: the beat envelope as static markers instead of a moving throb
        if (reduced && si < 2) {
          const lobes = 1 + Math.round(roughEff * 7);
          ctx.setLineDash([2, 4]); ctx.lineWidth = 1; ctx.strokeStyle = rgba(st.col, 0.45);
          for (const sgn of [-1, 1]) {
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
              const u = i / N; const e = (1 - depth) + depth * Math.abs(Math.cos(Math.PI * lobes * u));
              const y = st.y + sgn * (baseAmp + 6) * e * Math.pow(Math.sin(Math.PI * u), 0.55);
              const x = xL + (xR - xL) * u; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        ctx.restore();

        ctx.save(); ctx.globalAlpha = vis * st.a;
        ctx.fillStyle = rgba(st.col, pal.dark ? 0.9 : 0.85);
        ctx.beginPath(); ctx.arc(xL - 8, st.y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(xR + 8, st.y, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // breath bow: grows from the middle while you hold, lights up once it's a full breath
      const holdAge = I.holding ? now - I.holdStart : 0;
      const fade = I.holding ? 1 : Math.max(0, 1 - (now - I.holdEnd) / 0.8);
      if (fade > 0 && I.holdStart > 0) {
        const p = I.holding ? Math.min(1, holdAge / I.holdSecs) : Math.min(1, (I.holdEnd - I.holdStart) / I.holdSecs);
        const full = p >= 1;
        const yb = yB + Lc.gap * 0.95 + S.bloom * Lc.gap * 0.5;
        const half = ((xR - xL) / 2) * p;
        ctx.save(); ctx.globalAlpha = fade * vis; ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(pal.dark ? pal.strA : pal.ink, 0.16); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xL, yb); ctx.lineTo(xR, yb); ctx.stroke();
        ctx.strokeStyle = rgba(full ? pal.accent : (pal.dark ? pal.strA : pal.ink), full ? 0.95 : 0.6); ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(w / 2 - half, yb); ctx.lineTo(w / 2 + half, yb); ctx.stroke();
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); unwatch(); };
  }, [instRef, reduced]);

  // Let go of a hold if the interaction mode changes mid-press.
  useEffect(() => {
    if (interact !== 'hold') { down.current = null; keyHeld.current = false; }
  }, [interact]);

  // --- gestures
  const nearest = (y: number) => {
    const g = geo.current;
    return Math.abs(y - g.yA) < Math.abs(y - g.yB) ? 0 : 1;
  };
  const local = (e: PointerEvent) => { const r = wrap.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const pluckAt = (i: number, x: number) => {
    const g = geo.current; const u = Math.min(0.9, Math.max(0.1, (x - g.xL) / (g.xR - g.xL)));
    instRef.current.pluck(i, u, 1); cb.current.onPluck?.(i);
  };

  const onDown = (e: PointerEvent) => {
    if (interact === 'none') return;
    e.preventDefault();
    wrap.current?.focus({ preventScroll: true });
    try { wrap.current!.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const p = local(e);
    down.current = { id: e.pointerId, y: p.y };
    if (interact === 'hold') cb.current.onHoldStart?.();
    if (interact === 'pluck') pluckAt(nearest(p.y), p.x);
  };
  const onMove = (e: PointerEvent) => {
    if (interact !== 'pluck' || !down.current || down.current.id !== e.pointerId) return;
    const p = local(e); const g = geo.current; const y0 = down.current.y;
    [g.yA, g.yB].forEach((sy, i) => { if ((y0 - sy) * (p.y - sy) < 0) pluckAt(i, p.x); });
    down.current.y = p.y;
  };
  const onUp = (e: PointerEvent) => {
    if (!down.current || down.current.id !== e.pointerId) return;
    down.current = null;
    if (interact === 'hold') cb.current.onHoldEnd?.();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== wrap.current) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    if (interact === 'hold' && !keyHeld.current) { keyHeld.current = true; cb.current.onHoldStart?.(); }
    if (interact === 'pluck') { const g = geo.current; pluckAt(e.key === ' ' ? 0 : 1, g.xL + (g.xR - g.xL) * 0.4); }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (interact === 'hold' && keyHeld.current && (e.key === ' ' || e.key === 'Enter')) { keyHeld.current = false; cb.current.onHoldEnd?.(); }
  };

  const live = interact !== 'none';
  return (
    <div ref={wrap} className="absolute inset-0 outline-none tune-focus"
      style={{ touchAction: live ? 'none' : 'auto', cursor: interact === 'hold' ? 'grab' : interact === 'pluck' ? 'pointer' : 'default' }}
      role={live ? 'button' : undefined} tabIndex={live ? 0 : -1} aria-label={live ? label : undefined}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}
      onKeyDown={onKeyDown} onKeyUp={onKeyUp} onContextMenu={e => { if (live) e.preventDefault(); }}>
      <canvas ref={cvs} className="absolute inset-0 block" aria-hidden />
    </div>
  );
}
