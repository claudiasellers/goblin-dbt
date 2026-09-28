/** Where things stand in the 3D gallery, and which placards pin to them. Shared by the scene and its label overlay. */
import { Vector3, type Camera } from 'three';
import { SHELF_SLOTS, type StageItem, type StageProps } from './palette';
import type { V3 } from './rig';

export const SX = 6;
const ROWS_FOR: Record<number, number[]> = { 1: [0.1], 2: [0.45, -0.4], 3: [0.7, -0.08, -0.86] };
/** Shelf heights for n objects (3 to a shelf), centred on the wall. */
export const shelfRows = (n: number): number[] => ROWS_FOR[Math.min(3, Math.max(1, Math.ceil(n / 3)))];
/** Slot i of n: rows fill top-down, a short last row is centred. */
export function slotPos(i: number, n: number): V3 {
  const rows = shelfRows(n);
  const r = Math.min(rows.length - 1, Math.floor(i / 3));
  const inRow = Math.min(3, n - r * 3);
  const col = i % 3;
  const x = (col - (inRow - 1) / 2) * 0.55;
  return [SX + x, rows[r], -2.64];
}
export const URGE_POS: V3[] = [[-0.5, -0.2, 0], [0.5, -0.2, 0], [-0.5, -0.98, 1.45], [0.5, -0.98, 1.45]];
export const THEN_POS: V3 = [-0.5, 0, 0];
export const mainPos = (inClose: boolean): V3 => (inClose ? [0.5, 0, 0] : [0, 0, 0]);
export function variantPos(flip: boolean): { plus: V3; minus: V3 } {
  const VX = 0.46, VY = -0.9, VZ = 1.55;
  return { plus: flip ? [VX, VY, VZ] : [-VX, VY, VZ], minus: flip ? [-VX, VY, VZ] : [VX, VY, VZ] };
}
export function shelfItems(shelf: StageItem[], fresh: StageItem | null): (StageItem & { fresh?: boolean })[] {
  return fresh ? [...shelf.slice(-(SHELF_SLOTS - 1)), { ...fresh, fresh: true }] : shelf.slice(-SHELF_SLOTS);
}

export interface LabelSpec {
  id: string; pos: V3; kind: 'pick' | 'tag' | 'engrave' | 'fresh';
  text: string; sub?: string; onClick?: () => void; disabled?: boolean; active?: boolean; testid?: string;
}

/** Every placard the current step pins into the scene. */
export function sceneLabels(p: StageProps): LabelSpec[] {
  const out: LabelSpec[] = [];
  const add = (l: LabelSpec) => out.push(l);
  const off = (v: V3, dx: number, dy: number, dz: number): V3 => [v[0] + dx, v[1] + dy, v[2] + dz];
  if (p.step === 'find') {
    const { plus, minus } = variantPos(p.round % 2 === 1);
    add({ id: 'plus', pos: off(plus, 0, -0.24, 0.26), kind: 'pick', text: p.roundLabels[0], onClick: () => p.onCloser(1), disabled: p.roundBusy, testid: 'round-plus' });
    add({ id: 'minus', pos: off(minus, 0, -0.24, 0.26), kind: 'pick', text: p.roundLabels[1], onClick: () => p.onCloser(-1), disabled: p.roundBusy, testid: 'round-minus' });
  }
  if (p.step === 'pull') {
    p.urges.forEach((u, i) => {
      const pos = URGE_POS[i] ?? URGE_POS[3];
      add({ id: `urge-${u.id}`, pos: off(pos, 0, -0.26, 0.29), kind: 'pick', text: u.label, sub: u.sub, onClick: () => p.onPull(u.id),
        disabled: !!p.picked, active: p.picked === u.id, testid: `urge-${u.id}` });
    });
  }
  if (p.step === 'close') {
    add({ id: 'now', pos: off(mainPos(true), 0, -0.22, 0.42), kind: 'tag', text: p.nowLabel });
    add({ id: 'then', pos: off(THEN_POS, 0, -0.22, 0.42), kind: 'tag', text: p.thenLabel });
  } else if (p.engraved && p.step !== 'pull' && p.step !== 'collection') {
    add({ id: `eng-${p.engraved}`, pos: [0, -0.26, 0.53], kind: 'engrave', text: p.engraved });
  }
  if (p.step === 'collection') {
    const items = shelfItems(p.shelf, p.fresh);
    items.forEach((it, i) => {
      const s = slotPos(i, items.length);
      add({ id: `shelf-${it.key}`, pos: [s[0], s[1] - 0.17, -2.5], kind: it.fresh ? 'fresh' : 'tag', text: it.name });
    });
  }
  return out;
}

const tmp = new Vector3();
/** Positions registered DOM placards over the canvas each frame (no React renders). */
export class Anchors {
  private items = new Map<string, { pos: V3; el: HTMLElement | null }>();
  sync(specs: LabelSpec[]) {
    const keep = new Set(specs.map(s => s.id));
    for (const id of this.items.keys()) if (!keep.has(id)) this.items.delete(id);
    for (const s of specs) { const it = this.items.get(s.id); if (it) it.pos = s.pos; else this.items.set(s.id, { pos: s.pos, el: null }); }
  }
  attach(id: string, el: HTMLElement | null) {
    const it = this.items.get(id);
    if (it) it.el = el; else if (el) this.items.set(id, { pos: [0, 0, 0], el });
  }
  project(camera: Camera, w: number, h: number) {
    for (const it of this.items.values()) {
      if (!it.el) continue;
      tmp.set(it.pos[0], it.pos[1], it.pos[2]).project(camera);
      const x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h;
      it.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%)`;
      it.el.style.visibility = tmp.z < 1 ? 'visible' : 'hidden';
    }
  }
}
