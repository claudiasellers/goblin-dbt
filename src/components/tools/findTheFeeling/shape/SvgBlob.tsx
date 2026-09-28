import { useEffect, useId, useRef } from 'react';
import { FEEL_KEYS, clamp, clayColor, css, easeInOut, easeOut, greyed, shade, tint, type Feel, type LiveStore, type UrgeMode } from './feel';

const N = 80;
const SPIKES = 9;
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smin = (a: number, b: number, k: number) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
const fract = (x: number) => x - Math.floor(x);
/** Signed angular distance, -π..π. */
const adist = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Outline of the object in local units (radius ~1, +y down), plus its lowest point. */
function outline(v: Feel, t: number, seed: number, flinch: number, reduce: boolean): { pts: [number, number][]; bottom: number } {
  const soft = Math.max(-v.sharp, 0), still = Math.max(-v.buzz, 0), buzz = Math.max(v.buzz, 0) * (reduce ? 0.35 : 1);
  const clench = Math.max(v.clench, 0), hollow = Math.max(-v.clench, 0), heavy = Math.max(v.weight, 0), light = Math.max(-v.weight, 0);
  const sh = Math.max(v.sharp, 0) * 0.95 + flinch * 0.55;
  const pts: [number, number][] = [];
  let bottom = -Infinity;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    let r = 1;
    const lump = Math.sin(3 * th + seed + t * 0.25) * 0.55 + Math.sin(5 * th + seed * 2.1 - t * 0.18) * 0.35 + Math.sin(2 * th - seed) * 0.4;
    r += lump * 0.05 * (1 - 0.75 * soft) * (1 - 0.4 * still);
    let spk = 0;
    for (let k = 0; k < SPIKES; k++) {
      const phi = (k / SPIKES) * Math.PI * 2 + seed * 1.3;
      const h = Math.max(0, 1 - Math.abs(adist(th, phi)) / 0.3);
      spk = Math.max(spk, h * h * (0.75 + 0.5 * fract(k * 0.618 + seed)));
    }
    r += (spk * 0.6 + Math.sin(7 * th + seed * 3) * 0.04) * sh;
    r += (Math.sin(th * 11 + t * 19) * 0.03 + Math.sin(th * 5 - t * 23) * 0.02) * buzz;
    r += Math.sin(th * 23 + seed * 4) * 0.014 * clench;
    r -= hollow * 0.45 * smooth(0.3, 0.97, Math.cos(th + Math.PI / 4));
    r *= 1 - 0.26 * clench;
    let x = r * Math.cos(th), y = r * Math.sin(th);
    y *= 1 - 0.14 * hollow;
    y *= 1 - 0.3 * heavy + 0.1 * light;
    const base = smooth(-0.35, 1, Math.sin(th));
    x *= 1 + heavy * 0.38 * base - 0.05 * light;
    y = y + (smin(y, 0.58, 0.14) - y) * heavy;
    pts.push([x, y]);
    bottom = Math.max(bottom, y);
  }
  return { pts, bottom };
}

function pathOf(pts: [number, number][], dx: number, dy: number, sx: number, sy: number) {
  const n = pts.length;
  const P = (i: number) => { const p = pts[(i + n) % n]; return [p[0] * sx + dx, p[1] * sy + dy]; };
  const f = (x: number) => x.toFixed(3);
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    if (i === 0) d += `M${f(p1[0])} ${f(p1[1])}`;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/** viewBox half-extent; the object sits with its lowest point on y = GROUND. */
const HALF = 1.6;
const GROUND = 1.05;

/**
 * 2D stand-in for the clay object when WebGL is unavailable: a morphing outline whose spikiness,
 * colour, weight, grain and dent follow the same vector as the 3D object.
 */
export function SvgBlob({ feel, mode = null, store, seed = 1.7, visible = true, drop = false, delay = 0, reduce, className }: {
  feel: () => Feel; mode?: UrgeMode; store?: LiveStore; seed?: number; visible?: boolean;
  drop?: boolean; delay?: number; reduce: boolean; className?: string;
}) {
  const id = useId().replace(/[:]/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const shadow = useRef<SVGEllipseElement>(null);
  const stops = useRef<(SVGStopElement | null)[]>([]);
  const feelRef = useRef(feel);
  useEffect(() => { feelRef.current = feel; });

  useEffect(() => {
    const st = {
      v: { ...feelRef.current() }, vel: { sharp: 0, heat: 0, weight: 0, buzz: 0, clench: 0, grey: 0 } as Feel,
      sc: 0, scVel: 0, lastPop: store?.pop ?? 0, flinch: 0, y: drop ? -2.2 : 0, vy: 0, squash: 0,
    };
    const t0 = performance.now();
    let last = t0, raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000 + seed * 3.1;
      const age = (now - t0) / 1000 - delay;
      const f = { ...feelRef.current() };
      let lunge = 0, reach = 0, sink = 0;
      if (mode === 'fight') {
        const p = (t % 2.1) / 2.1;
        lunge = reduce ? 0.35 : p < 0.1 ? easeOut(p / 0.1) : p < 0.35 ? 1 : 1 - easeInOut((p - 0.35) / 0.5);
        f.sharp = Math.max(f.sharp, 0.25) + lunge * 0.55; f.heat += 0.25;
      } else if (mode === 'chase') {
        const p = (t % 2.6) / 2.6;
        reach = reduce ? 0.6 : p < 0.3 ? easeInOut(p / 0.3) : p < 0.75 ? 1 : 1 - easeInOut((p - 0.75) / 0.25);
      } else if (mode === 'hide') {
        const p = (t % 3.4) / 3.4;
        sink = reduce ? 0.35 : p < 0.4 ? easeInOut(p / 0.4) : p < 0.7 ? 1 : 1 - easeInOut((p - 0.7) / 0.3);
        f.clench = Math.max(f.clench, 0) + 0.3 * sink;
      } else if (mode === 'blank') {
        f.grey = 1; f.buzz = -1; f.weight = Math.max(f.weight, 0.75); f.heat = Math.min(f.heat, -0.3); f.sharp = Math.min(f.sharp, 0);
      }
      const sub = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / sub;
      for (let i = 0; i < sub; i++) for (const k of FEEL_KEYS) {
        const a = (f[k] - st.v[k]) * 70 - st.vel[k] * 12;
        st.vel[k] += a * h; st.v[k] += st.vel[k] * h;
      }
      const live = store;
      if (live) {
        const fl = live.takeFlinch();
        if (fl > 0.001) st.flinch = Math.max(st.flinch, fl);
        if (live.pop !== st.lastPop) { st.lastPop = live.pop; if (!reduce) st.scVel += 3.2; }
      }
      st.flinch *= Math.exp(-dt * 2.6);
      const target = visible && age >= 0 ? 1 : 0;
      for (let i = 0; i < sub; i++) { const a = (target - st.sc) * 90 - st.scVel * 14; st.scVel += a * h; st.sc += st.scVel * h; }
      if (reduce) st.sc = target;
      if (drop && age >= 0) {
        if (reduce) st.y = 0;
        else for (let i = 0; i < sub; i++) {
          st.vy += 14 * h; st.y += st.vy * h;
          if (st.y > 0) { st.y = 0; if (Math.abs(st.vy) > 0.4) st.squash = Math.min(1, Math.abs(st.vy) / 6); st.vy = -st.vy * 0.42; }
        }
      }
      st.squash *= Math.exp(-dt * 7);

      const v = st.v;
      const sc = Math.max(0, st.sc) * (1 - 0.35 * sink) * (1 + 0.22 * lunge);
      const { pts, bottom } = outline(v, reduce ? t * 0.3 : t, seed, st.flinch, reduce);
      const light = Math.max(-v.weight, 0);
      const bob = reduce ? 0 : Math.sin(t * 1.3) * 0.08 * light;
      const sy = sc * (1 - 0.28 * st.squash - 0.07 * st.flinch);
      const sx = sc * (1 + 0.18 * st.squash + 0.03 * st.flinch) * (1 + 0.28 * reach);
      const jit = reduce ? 0 : Math.max(v.buzz, 0) * 0.03;
      const dx = reach * 0.3 + (Math.random() - 0.5) * jit;
      const lift = light * 0.3 + bob;
      const dy = GROUND - bottom * sy - lift * sc + sink * 0.55 * sc + st.y + (Math.random() - 0.5) * jit;
      path.current?.setAttribute('d', sc < 0.004 ? '' : pathOf(pts, dx, dy, sx, sy));

      const base = greyed(clayColor(v), v.grey);
      const s = stops.current;
      s[0]?.setAttribute('stop-color', css(tint(base, 0.32)));
      s[1]?.setAttribute('stop-color', css(base));
      s[2]?.setAttribute('stop-color', css(shade(base, 0.6)));
      const glow = Math.pow(Math.max(clamp(v.heat), 0), 1.8) * (1 - clamp(v.grey, 0, 1));
      if (path.current) path.current.style.filter = glow > 0.02 ? `drop-shadow(0 0 ${(glow * 0.12).toFixed(3)}px rgba(255,90,26,${(glow * 0.75).toFixed(2)}))` : '';
      if (shadow.current) {
        shadow.current.setAttribute('rx', String(Math.max(0, 0.85 * sx * (1 - lift * 0.4))));
        shadow.current.setAttribute('opacity', String(clamp(sc, 0, 1) * (0.32 - lift * 0.15)));
      }

      if (live && svg.current) {
        const r = svg.current.getBoundingClientRect();
        const root = svg.current.closest('[data-shape-room]')?.getBoundingClientRect();
        if (root) {
          const ppu = r.width / (HALF * 2);
          live.setScreen(r.left - root.left + (HALF + dx) * ppu, r.top - root.top + (HALF + dy) * ppu, ppu * sc);
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, store, seed, visible, drop, delay, reduce]);

  return (
    <svg ref={svg} viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} className={`sr-svg ${className ?? ''}`} aria-hidden>
      <defs>
        <radialGradient id={`g${id}`} cx="0.38" cy="0.3" r="0.8">
          <stop ref={e => { stops.current[0] = e; }} offset="0" />
          <stop ref={e => { stops.current[1] = e; }} offset="0.55" />
          <stop ref={e => { stops.current[2] = e; }} offset="1" />
        </radialGradient>
      </defs>
      <ellipse ref={shadow} cx="0" cy={GROUND + 0.02} rx="0" ry="0.09" fill="#000" opacity="0" />
      <path ref={path} fill={`url(#g${id})`} />
    </svg>
  );
}
