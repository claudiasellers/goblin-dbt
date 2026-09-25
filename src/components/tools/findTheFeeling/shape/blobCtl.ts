import { Color, IcosahedronGeometry, SRGBColorSpace, Vector3, type BufferGeometry, type Camera, type Group } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeBlobMaterial } from './blobMaterial';
import { FEEL_KEYS, bottomOf, clamp, clayColor, damp, easeInOut, easeOut, type Feel, type LiveStore, type UrgeMode } from './feel';

const tmpC = new Color();
const tmpV = new Vector3();

export interface BlobFrame {
  elapsed: number; dt: number; feel: Feel; mode: UrgeMode; reduce: boolean; visible: boolean; scale: number;
  position: [number, number, number]; delay: number; drop: boolean; spin: boolean;
  store?: LiveStore; camera: Camera; size: { width: number; height: number };
  outer: Group | null; inner: Group | null;
}

/**
 * Per-object GPU resources and springs, driven imperatively once per frame. Kept outside React so
 * the component only wires it up (and disposes it).
 */
export class BlobCtl {
  readonly mat; readonly depth; readonly uniforms; readonly geo: BufferGeometry;
  private seed: number;
  private init = false;
  private v: Feel = { sharp: 0, heat: 0, weight: 0, buzz: 0, clench: 0, grey: 0 };
  private vel: Feel = { sharp: 0, heat: 0, weight: 0, buzz: 0, clench: 0, grey: 0 };
  private sc = 0; private scVel = 0; private lastPop = 0; private y: number; private vy = 0; private squash = 0; private t0 = -1; private flinch = 0;
  private pos: Vector3; private jit = new Vector3();

  constructor(seed: number, detail: number, drop: boolean, position: [number, number, number]) {
    const m = makeBlobMaterial(seed);
    this.mat = m.mat; this.depth = m.depth; this.uniforms = m.uniforms;
    // Indexed: the displacement runs once per unique vertex instead of once per triangle corner.
    const ico = new IcosahedronGeometry(1, detail);
    ico.deleteAttribute('uv');
    this.geo = mergeVertices(ico);
    ico.dispose();
    this.seed = seed;
    this.y = drop ? 2.4 : 0;
    this.pos = new Vector3(...position);
  }

  dispose() { this.mat.dispose(); this.depth.dispose(); this.geo.dispose(); }

  frame(a: BlobFrame) {
    const dt = Math.min(a.dt, 0.1);
    const live = a.store;
    if (!this.init) { this.init = true; this.v = { ...a.feel }; this.lastPop = live?.pop ?? 0; }
    const t = a.elapsed + this.seed * 3.1;
    if (this.t0 < 0) this.t0 = a.elapsed;
    const age = a.elapsed - this.t0 - a.delay;
    const reduce = a.reduce;

    // ---- feel targets (+ urge studies) -------------------------------------
    const f = { ...a.feel };
    let lunge = 0, reach = 0, sink = 0;
    if (a.mode === 'fight') {
      const p = (t % 2.1) / 2.1;
      lunge = reduce ? 0.35 : p < 0.1 ? easeOut(p / 0.1) : p < 0.35 ? 1 : 1 - easeInOut((p - 0.35) / 0.5);
      f.sharp = Math.max(f.sharp, 0.25) + lunge * 0.55; f.heat = f.heat + 0.25;
    } else if (a.mode === 'chase') {
      const p = (t % 2.6) / 2.6;
      reach = reduce ? 0.6 : p < 0.3 ? easeInOut(p / 0.3) : p < 0.75 ? 1 : 1 - easeInOut((p - 0.75) / 0.25);
    } else if (a.mode === 'hide') {
      const p = (t % 3.4) / 3.4;
      sink = reduce ? 0.35 : p < 0.4 ? easeInOut(p / 0.4) : p < 0.7 ? 1 : 1 - easeInOut((p - 0.7) / 0.3);
      f.clench = Math.max(f.clench, 0) + 0.3 * sink;
    } else if (a.mode === 'blank') {
      f.grey = 1; f.buzz = -1; f.weight = Math.max(f.weight, 0.75); f.heat = Math.min(f.heat, -0.3); f.sharp = Math.min(f.sharp, 0);
    }

    // springs: slightly under-damped so a choice lands with a little overshoot
    const sub = Math.max(1, Math.ceil(dt / (1 / 60)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) for (const k of FEEL_KEYS) {
      const acc = (f[k] - this.v[k]) * 70 - this.vel[k] * 12;
      this.vel[k] += acc * h; this.v[k] += this.vel[k] * h;
    }
    const v = this.v;

    if (live) {
      const fl = live.takeFlinch();
      if (fl > 0.001) this.flinch = Math.max(this.flinch, fl);
      if (live.pop !== this.lastPop) { this.lastPop = live.pop; if (!reduce) this.scVel += 3.2; }
    }
    this.flinch *= Math.exp(-dt * 2.6);

    // ---- uniforms ------------------------------------------------------------
    const u = this.uniforms;
    u.uTime.value = t * (0.35 + 0.65 * (1 - Math.max(-v.buzz, 0)));
    u.uSharp.value = Math.max(v.sharp, 0) * 0.95;
    u.uSoft.value = Math.max(-v.sharp, 0);
    u.uBuzz.value = Math.max(v.buzz, 0) * (reduce ? 0.4 : 1);
    u.uStill.value = Math.max(-v.buzz, 0);
    u.uClench.value = Math.max(v.clench, 0);
    u.uHollow.value = Math.max(-v.clench, 0);
    u.uHeavy.value = Math.max(v.weight, 0);
    u.uLight.value = Math.max(-v.weight, 0);
    u.uFlinch.value = reduce ? this.flinch * 0.4 : this.flinch;
    u.uGrey.value = clamp(v.grey, 0, 1);
    u.uStretch.value.set(0.35, 0.25, 1, reach * 0.75);
    const heat = clamp(v.heat);
    const c = clayColor(v);
    this.mat.color.copy(tmpC.setRGB(c[0], c[1], c[2], SRGBColorSpace));
    u.uHeatGlow.value = Math.pow(Math.max(heat, 0), 1.8) * 0.7;
    this.mat.roughness = 0.62 - 0.22 * Math.max(heat, 0) + 0.15 * Math.max(-heat, 0);
    this.mat.clearcoat = 0.25 + 0.35 * Math.max(v.clench, 0);

    // ---- transform -------------------------------------------------------------
    const targetSc = a.visible && age >= 0 ? a.scale : 0;
    for (let i = 0; i < sub; i++) {
      const scA = (targetSc - this.sc) * 90 - this.scVel * 14;
      this.scVel += scA * h; this.sc += this.scVel * h;
    }
    const sc = Math.max(0.0001, this.sc);
    const P = a.position;
    if (a.outer) {
      a.outer.visible = this.sc > 0.003 || targetSc > 0;
      this.pos.x = damp(this.pos.x, P[0], 5, dt); this.pos.y = damp(this.pos.y, P[1], 5, dt); this.pos.z = damp(this.pos.z, P[2], 5, dt);
      if (reduce) this.pos.set(P[0], P[1], P[2]);
      a.outer.position.copy(this.pos);
    }

    if (a.drop && age >= 0) {
      if (reduce) this.y = 0;
      else for (let i = 0; i < sub; i++) {
        this.vy -= 14 * h; this.y += this.vy * h;
        if (this.y < 0) { this.y = 0; if (Math.abs(this.vy) > 0.4) this.squash = Math.min(1, Math.abs(this.vy) / 6); this.vy = -this.vy * 0.42; }
      }
    }
    this.squash *= Math.exp(-dt * 7);

    const light = Math.max(-v.weight, 0);
    const bob = reduce ? 0 : Math.sin(t * 1.3) * 0.08 * light;
    const baseLift = -bottomOf(v) * 0.97 + light * 0.32 + bob;
    const squashY = 1 - 0.28 * this.squash - 0.07 * this.flinch;
    const squashXZ = 1 + 0.18 * this.squash + 0.03 * this.flinch;

    const g = a.inner;
    if (!g) return;
    const jit = reduce ? 0 : Math.max(v.buzz, 0);
    this.jit.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.035 * jit);
    g.position.set(
      this.jit.x + reach * 0.12,
      (baseLift + this.jit.y - sink * 1.25) * sc + this.y,
      this.jit.z + lunge * 2.2 * sc - this.flinch * 0.12 + reach * 0.1,
    );
    const k = 1 - 0.35 * sink;
    g.scale.set(sc * squashXZ * k, sc * squashY * k, sc * squashXZ * k);
    if (a.spin && !reduce && a.mode !== 'blank') g.rotation.y += dt * 0.16 * (1 - Math.max(-v.buzz, 0) * 0.7);
    if (a.mode === 'chase') g.rotation.set(0, 0.5, 0);

    // projected screen position of the main object (for stroking)
    if (live) {
      g.getWorldPosition(tmpV);
      const dist = tmpV.distanceTo(a.camera.position);
      tmpV.project(a.camera);
      const fov = (a.camera as unknown as { fov?: number }).fov ?? 40;
      live.setScreen((tmpV.x + 1) / 2 * a.size.width, (1 - tmpV.y) / 2 * a.size.height,
        sc / (dist * Math.tan((fov * Math.PI) / 360)) * a.size.height / 2);
    }
  }
}
