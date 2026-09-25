/** Instrument palette read from the room's CSS custom properties (see tune.css). */
export type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const s = h.trim().replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

export interface Palette { dark: boolean; bg: RGB; bg2: RGB; strA: RGB; strB: RGB; warm: RGB; gold: RGB; accent: RGB; ink: RGB }

export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (n: string, f: string) => hex(cs.getPropertyValue(n).trim() || f);
  return {
    dark: cs.getPropertyValue('--t-dark').trim() === '1',
    bg: v('--t-bg', '#EFE8DC'), bg2: v('--t-bg-2', '#E2D6C4'), strA: v('--t-str-a', '#2B2521'), strB: v('--t-str-b', '#2E4A7A'),
    warm: v('--t-warm', '#C0532A'), gold: v('--t-gold', '#B7862F'), accent: v('--t-accent', '#B84A26'), ink: v('--t-ink', '#231F1B'),
  };
}

/** Calls back when the colour scheme or the app's data-theme changes. Returns an unsubscribe. */
export function watchScheme(cb: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change', cb);
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });
  return () => { mq.removeEventListener?.('change', cb); mo.disconnect(); };
}

/** Canvas backing size, DPR capped at 2. */
export const dprCap = () => Math.min(2, window.devicePixelRatio || 1);
