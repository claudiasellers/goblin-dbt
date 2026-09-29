// Mutable per-session store: the React tree writes intentions, the render loop reads them every frame.
import type { Group, PerspectiveCamera } from 'three';
import type { Band } from '../../script';
import { FIG_IDS, START_ARR, type Arr, type FigId } from './model';

export interface FigTarget {
  x: number; z: number; s: number; show: boolean;
  /** explicit facing (radians, 0 = +z); null = the director decides */
  face: number | null;
  sit: number; slump: number; look: number; lean: number; wave: number; phone: number;
  /** extra drop when dragged past the edge */
  drop: number;
  hop: number;
}
export interface FigLive { x: number; z: number; y: number; s: number; rot: number }

export interface Cam { span: number; elev: number; azim: number; tx: number; ty: number; tz: number; frac: number; /** 1 = fit the whole stage between the header and the tray */ fit: number }
export interface Lights { lv: number; key: number; fill: number; house: number; soft: number; world: number; shelf: number }
export interface Xform { x: number; y: number; z: number; s: number; ry: number }

export interface StageStore {
  arr: Arr;
  fig: Record<FigId, FigTarget>;
  live: Record<FigId, FigLive>;
  cam: Cam;
  light: Lights;
  stageT: Xform;
  thenT: Xform & { show: number };
  mood: Band | null;
  speech: number;
  soft: number;
  reduce: boolean;
  camera: PerspectiveCamera | null;
  stage: Group | null;
  size: { w: number; h: number };
  safe: { top: number; bottom: number } | null;
  wiggle: Record<string, number>;
  propsLit: Record<string, boolean>;
}

export { STAGE_RY } from './model';
import { STAGE_RY } from './model';

const fig = (): FigTarget => ({ x: 0, z: 0, s: 1, show: true, face: null, sit: 0, slump: 0, look: 0, lean: 0, wave: 0, phone: 0, drop: 0, hop: 0 });

export function makeStore(reduce: boolean): StageStore {
  const s: StageStore = {
    arr: START_ARR(),
    fig: Object.fromEntries(FIG_IDS.map(id => [id, fig()])) as Record<FigId, FigTarget>,
    live: Object.fromEntries(FIG_IDS.map(id => [id, { x: 0, z: 0, y: 0, s: 1, rot: 0 }])) as Record<FigId, FigLive>,
    cam: { span: 3.1, elev: 0.3, azim: 0, tx: 0, ty: 0.4, tz: 0, frac: 0.43, fit: 0 },
    light: { lv: 0, key: 1, fill: 1, house: 1, soft: 0, world: 0, shelf: 0 },
    stageT: { x: 0, y: 0, z: 0, s: 1, ry: STAGE_RY },
    thenT: { x: -1.12, y: -1.4, z: 0, s: 0.62, ry: STAGE_RY, show: 0 },
    mood: null, speech: 0, soft: 0, reduce,
    camera: null, stage: null, size: { w: 390, h: 750 }, safe: null,
    wiggle: {}, propsLit: {},
  };
  applyArr(s);
  (['o1', 'o2', 'o3'] as FigId[]).forEach(id => { s.fig[id].show = false; });
  // start figures where they belong (no fly-in from origin)
  FIG_IDS.forEach(id => { const f = s.fig[id]; s.live[id] = { x: f.x, z: f.z, y: 0, s: f.show ? f.s : 0, rot: 0 }; });
  return s;
}

/** Write the logical arrangement into per-figure targets. */
export function applyArr(st: StageStore) {
  const a = st.arr;
  Object.assign(st.fig.you, { x: a.you.x, z: a.you.z, s: a.you.s, show: true });
  Object.assign(st.fig.them, { x: a.them.x, z: a.them.z, s: a.them.s, show: true });
  (['o1', 'o2', 'o3'] as FigId[]).forEach((id, i) => {
    const o = a.others?.[i];
    if (o) Object.assign(st.fig[id], { x: o.x, z: o.z, show: true, s: 0.92 });
    else st.fig[id].show = false;
  });
  st.speech = a.them.speech ? 1 : 0;
}

/** Facing the director gives each figure when not overridden. */
export function autoFace(st: StageStore, id: FigId): number {
  const a = st.arr, L = st.live;
  const toward = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(tx - fx, tz - fz);
  if (id === 'you') return toward(L.you.x, L.you.z, L.them.x, L.them.z);
  if (id === 'them') return toward(L.them.x, L.them.z, L.you.x, L.you.z) + (a.them.turned ? Math.PI : 0);
  const others = (['o1', 'o2', 'o3'] as FigId[]).filter(o => st.fig[o].show);
  const ring = a.open ? [...others, 'you' as FigId] : others;
  const cx = ring.reduce((s, o) => s + L[o].x, 0) / Math.max(1, ring.length);
  const cz = ring.reduce((s, o) => s + L[o].z, 0) / Math.max(1, ring.length);
  return toward(L[id].x, L[id].z, cx, cz);
}
