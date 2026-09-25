import { useEffect, useState } from 'react';
import type { UrgeId } from '../../../../data/findTheFeelingTypes';
import type { Step } from '../../../../lib/findTheFeelingFlow';
import type { Feel, LiveStore } from './feel';

/** The gallery's own palette: light plaster by day, dark velvet at night. Text pairs meet WCAG AA. */
export interface Palette {
  wall: string; floor: string; plinth: string; ink: string; ink2: string; brass: string; onBrass: string; wood: string;
  paper: string; paperSolid: string; line: string; ambient: number; key: number; wash: number; rim: string;
}
export const LIGHT: Palette = {
  wall: '#e2d8c8', floor: '#d6c9b5', plinth: '#f3ede3', ink: '#2a241d', ink2: '#554b3f', brass: '#6e5128', onBrass: '#fbf6ec', wood: '#bf9f78',
  paper: 'rgba(250,246,239,0.94)', paperSolid: '#faf6ef', line: 'rgba(42,36,29,0.2)', ambient: 0.4, key: 3.1, wash: 1.3, rim: '#ffe9cf',
};
export const DARK: Palette = {
  wall: '#2c1f2f', floor: '#1b141d', plinth: '#4a4049', ink: '#efe6da', ink2: '#bdb2a2', brass: '#d8b477', onBrass: '#1b1418', wood: '#5e4838',
  paper: 'rgba(30,24,32,0.92)', paperSolid: '#1e1820', line: 'rgba(239,230,218,0.2)', ambient: 0.2, key: 2.3, wash: 1.9, rim: '#b9a6ff',
};

/** Follows the app's [data-theme] (light | dark | system), falling back to the OS preference. */
export function useDark() {
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
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq?.removeEventListener('change', on); mo.disconnect(); };
  }, []);
  return dark;
}

let glSupport: boolean | null = null;
/** Checked once per page load. */
export function hasWebGL(): boolean {
  if (glSupport !== null) return glSupport;
  try {
    const c = document.createElement('canvas');
    const ctx = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    glSupport = !!ctx;
    ctx?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { glSupport = false; }
  return glSupport;
}

/** Objects the shelf holds at once (3 rows of 3); older words stay in the saved collection. */
export const SHELF_SLOTS = 9;

export interface StageItem { key: string; name: string; feel: Feel }
export interface StageUrge { id: UrgeId; label: string; sub: string }

/** What either stage (WebGL scene or SVG fallback) needs to draw the room. */
export interface StageProps {
  step: Step; pal: Palette; dark: boolean; reduce: boolean;
  store: LiveStore;
  /** Find rounds. */
  round: number; flip: boolean; roundDim: number; roundLabels: [string, string]; onCloser: (sign: 1 | -1) => void; roundBusy: boolean;
  urges: StageUrge[]; picked: UrgeId | null; onPull: (id: UrgeId) => void;
  thenFeel: Feel | null; thenLabel: string; nowLabel: string;
  engraved: string | null;
  shelf: StageItem[]; fresh: StageItem | null;
}
