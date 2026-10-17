/**
 * A part's figure, as geometry (src/components/parts/PartFigure.tsx draws it). The five numbers are the
 * stored `shapeSig` (each 0–1, Shape it's dimensions in order: sharp, heat, weight, buzz, clench; 0.5 is
 * neutral), the same vector Find the feeling's object follows (SvgBlob's outline, held still). Colour is
 * a room token mix, never a literal. Pure: no React, no DOM.
 */

export const SIG_LENGTH = 5;
/** The figure's own box: a 100×100 viewBox, the shape resting on GROUND. */
export const FIGURE_BOX = 100;
const GROUND = 84;
const RADIUS = 30;
const MARGIN = 4;
const N = 64;
const SPIKES = 9;
const SEED = 1.7;

const clamp = (v: number, a = -1, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smin = (a: number, b: number, k: number) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
const fract = (x: number) => x - Math.floor(x);
const adist = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** A stored signature (0–1) as the -1..1 vector the outline reads; null or malformed → null. */
export function sigToVec(sig: readonly number[] | null | undefined): number[] | null {
  if (!sig || sig.length !== SIG_LENGTH || !sig.every((n) => Number.isFinite(n))) return null;
  return sig.map((n) => clamp(n, 0, 1) * 2 - 1);
}

/** Shape it's -1..1 vector as the stored 0–1 signature, two decimals. */
export function vecToSig(vec: readonly number[]): number[] {
  return Array.from({ length: SIG_LENGTH }, (_, i) => +((clamp(vec[i] ?? 0) + 1) / 2).toFixed(2));
}

/** Outline points in local units (radius ~1, +y down), still: SvgBlob's outline at rest. */
function outline(v: number[]): [number, number][] {
  const [sharp, , weight, buzzV, clenchV] = v;
  const soft = Math.max(-sharp, 0), still = Math.max(-buzzV, 0), buzz = Math.max(buzzV, 0) * 0.35;
  const clench = Math.max(clenchV, 0), hollow = Math.max(-clenchV, 0), heavy = Math.max(weight, 0), light = Math.max(-weight, 0);
  const sh = Math.max(sharp, 0) * 0.95;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    let r = 1;
    const lump = Math.sin(3 * th + SEED) * 0.55 + Math.sin(5 * th + SEED * 2.1) * 0.35 + Math.sin(2 * th - SEED) * 0.4;
    r += lump * 0.05 * (1 - 0.75 * soft) * (1 - 0.4 * still);
    let spk = 0;
    for (let k = 0; k < SPIKES; k++) {
      const phi = (k / SPIKES) * Math.PI * 2 + SEED * 1.3;
      const h = Math.max(0, 1 - Math.abs(adist(th, phi)) / 0.3);
      spk = Math.max(spk, h * h * (0.75 + 0.5 * fract(k * 0.618 + SEED)));
    }
    r += (spk * 0.6 + Math.sin(7 * th + SEED * 3) * 0.04) * sh;
    r += (Math.sin(th * 11) * 0.03 + Math.sin(th * 5) * 0.02) * buzz;
    r += Math.sin(th * 23 + SEED * 4) * 0.014 * clench;
    r -= hollow * 0.45 * smooth(0.3, 0.97, Math.cos(th + Math.PI / 4));
    r *= 1 - 0.26 * clench;
    let x = r * Math.cos(th), y = r * Math.sin(th);
    y *= 1 - 0.14 * hollow;
    y *= 1 - 0.3 * heavy + 0.1 * light;
    const base = smooth(-0.35, 1, Math.sin(th));
    x *= 1 + heavy * 0.38 * base - 0.05 * light;
    y = y + (smin(y, 0.58, 0.14) - y) * heavy;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * The figure's path in the 100×100 box, resting on the ground line (a light shape floats a little).
 * Null: a plain round figure, nothing said about its shape.
 */
export function figurePath(sig: readonly number[] | null | undefined): string {
  const v = sigToVec(sig) ?? [0, 0, 0, 0, 0];
  const pts = outline(v);
  const bottom = Math.max(...pts.map((p) => p[1]));
  const top = Math.min(...pts.map((p) => p[1]));
  const wide = Math.max(...pts.map((p) => Math.abs(p[0])));
  const lift = Math.max(-v[2], 0) * 0.3;
  // A spiky or heavy shape is scaled down to stay inside the box, never cropped.
  const scale = Math.min(RADIUS, (FIGURE_BOX / 2 - MARGIN) / wide, (GROUND - MARGIN) / (bottom - top + lift));
  const dy = GROUND - (bottom + lift) * scale;
  const P = (i: number) => { const p = pts[(i + N) % N]; return [p[0] * scale + FIGURE_BOX / 2, p[1] * scale + dy]; };
  const f = (x: number) => x.toFixed(2);
  let d = '';
  for (let i = 0; i < N; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    if (i === 0) d += `M${f(p1[0])} ${f(p1[1])}`;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/**
 * The figure's fill: `hue` when the host gives one; else heat leans it from the low-unpleasant room
 * colour (cool) to the high-unpleasant one (hot). Null: the room's quiet border colour.
 */
export function figureFill(sig: readonly number[] | null | undefined, hue?: string): string {
  if (hue) return hue;
  const v = sigToVec(sig);
  if (!v) return 'var(--color-border)';
  const hot = Math.round(((v[1] + 1) / 2) * 100);
  return `color-mix(in oklab, var(--color-q-hu-fill) ${hot}%, var(--color-q-lu-fill))`;
}
