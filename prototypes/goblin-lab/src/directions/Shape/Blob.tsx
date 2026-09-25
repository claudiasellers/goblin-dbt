import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, IcosahedronGeometry, Vector3, type Group, type Mesh } from 'three';
import { makeBlobMaterial } from './blobMaterial';
import type { Feel } from './features';

export type Mode = 'fight' | 'chase' | 'hide' | 'blank' | null;
export interface ShapeStore {
  main: Feel;
  start: Feel | null;
  flinch: number;
  pop: number;
  screen: { x: number; y: number; r: number };
  reduce: boolean;
}

const COOL = new Color('#71829a');
const CLAY = new Color('#b3a697');
const WARM = new Color('#c27a45');
const HOT = new Color('#b3301a');
const tmpC = new Color();
const tmpV = new Vector3();
const KEYS = ['sharp', 'heat', 'weight', 'buzz', 'clench', 'grey'] as const;

export const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeInOut = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** Approximate lowest point of the displaced form (local units), so it sits on its plinth. */
function bottomOf(v: Record<string, number>) {
  const c = Math.max(v.clench, 0), h = Math.max(-v.clench, 0), H = Math.max(v.weight, 0), L = Math.max(-v.weight, 0);
  const b = -(1 - 0.26 * c) * (1 - 0.14 * h) * (1 - 0.3 * H + 0.1 * L) - 0.05 - Math.max(v.sharp, 0) * 0.12;
  return b + (Math.max(b, -0.6) - b) * H;
}

export function Blob({ feel, position, scale, visible = true, detail = 18, seed = 1, mode = null, store, onPick, drop = false, spin = true, delay = 0 }: {
  feel: () => Feel; position: [number, number, number]; scale: number; visible?: boolean; detail?: number; seed?: number;
  mode?: Mode; store?: ShapeStore; onPick?: () => void; drop?: boolean; spin?: boolean; delay?: number;
}) {
  const { mat, depth, uniforms } = useMemo(() => makeBlobMaterial(seed), [seed]);
  const geo = useMemo(() => new IcosahedronGeometry(1, detail), [detail]);
  useEffect(() => () => { mat.dispose(); depth.dispose(); geo.dispose(); }, [mat, depth, geo]);
  useEffect(() => () => { if (onPick) document.body.style.cursor = ''; }, [onPick]);

  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const { camera, size } = useThree();
  const s = useRef({
    v: { ...feel() } as Record<string, number>, vel: { sharp: 0, heat: 0, weight: 0, buzz: 0, clench: 0, grey: 0 } as Record<string, number>,
    sc: 0, scVel: 0, lastPop: store?.pop ?? 0, y: drop ? 2.4 : 0, vy: 0, squash: 0, t0: -1, born: 0, flinch: 0,
    pos: new Vector3(...position), jit: new Vector3(),
  });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const st = s.current;
    const t = state.clock.elapsedTime + seed * 3.1;
    if (st.t0 < 0) st.t0 = state.clock.elapsedTime;
    const age = state.clock.elapsedTime - st.t0 - delay;
    const reduce = store?.reduce ?? false;

    // ---- feel targets (+ behaviour overrides) -----------------------------
    const f = { ...feel() } as Record<string, number>;
    let lunge = 0, reach = 0, sink = 0;
    if (mode === 'fight') {
      const p = (t % 2.1) / 2.1;
      lunge = reduce ? 0.7 : p < 0.1 ? easeOut(p / 0.1) : p < 0.35 ? 1 : 1 - easeInOut((p - 0.35) / 0.5);
      f.sharp = Math.max(f.sharp, 0.25) + lunge * 0.55; f.heat = f.heat + 0.25;
    } else if (mode === 'chase') {
      const p = (t % 2.6) / 2.6;
      reach = reduce ? 0.8 : p < 0.3 ? easeInOut(p / 0.3) : p < 0.75 ? 1 : 1 - easeInOut((p - 0.75) / 0.25);
    } else if (mode === 'hide') {
      const p = (t % 3.4) / 3.4;
      sink = reduce ? 0.5 : p < 0.4 ? easeInOut(p / 0.4) : p < 0.7 ? 1 : 1 - easeInOut((p - 0.7) / 0.3);
      f.clench = Math.max(f.clench, 0) + 0.3 * sink;
    } else if (mode === 'blank') {
      f.grey = 1; f.buzz = -1; f.weight = Math.max(f.weight, 0.75); f.heat = Math.min(f.heat, -0.3); f.sharp = Math.min(f.sharp, 0);
    }

    // springs: slightly under-damped so a choice lands with a little overshoot
    const sub = Math.max(1, Math.ceil(dt / (1 / 60)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) for (const k of KEYS) {
      const a = (f[k] - st.v[k]) * 70 - st.vel[k] * 12;
      st.vel[k] += a * h; st.v[k] += st.vel[k] * h;
    }
    const v = st.v;

    // flinch impulse (main object only)
    if (store) {
      if (store.flinch > 0.001) { st.flinch = Math.max(st.flinch, store.flinch); store.flinch = 0; }
      if (store.pop !== st.lastPop) { st.lastPop = store.pop; st.scVel += 3.2; }
    }
    st.flinch *= Math.exp(-dt * 2.6);

    // ---- uniforms --------------------------------------------------------
    uniforms.uTime.value = t * (0.35 + 0.65 * (1 - Math.max(-v.buzz, 0)));
    uniforms.uSharp.value = Math.max(v.sharp, 0) * 0.95;
    uniforms.uSoft.value = Math.max(-v.sharp, 0);
    uniforms.uBuzz.value = Math.max(v.buzz, 0) * (reduce ? 0.4 : 1);
    uniforms.uStill.value = Math.max(-v.buzz, 0);
    uniforms.uClench.value = Math.max(v.clench, 0);
    uniforms.uHollow.value = Math.max(-v.clench, 0);
    uniforms.uHeavy.value = Math.max(v.weight, 0);
    uniforms.uLight.value = Math.max(-v.weight, 0);
    uniforms.uFlinch.value = st.flinch;
    uniforms.uGrey.value = Math.min(1, Math.max(0, v.grey));
    uniforms.uStretch.value.set(0.35, 0.25, 1, reach * 0.75);
    const heat = Math.max(-1, Math.min(1, v.heat));
    if (heat >= 0.5) tmpC.copy(WARM).lerp(HOT, (heat - 0.5) * 2); else if (heat >= 0) tmpC.copy(CLAY).lerp(WARM, heat * 2); else tmpC.copy(CLAY).lerp(COOL, -heat);
    tmpC.multiplyScalar(1 - 0.22 * Math.max(v.clench, 0) + 0.08 * Math.max(-v.clench, 0));
    mat.color.copy(tmpC);
    uniforms.uHeatGlow.value = Math.pow(Math.max(heat, 0), 1.8) * 0.7;
    mat.roughness = 0.62 - 0.22 * Math.max(heat, 0) + 0.15 * Math.max(-heat, 0);
    mat.clearcoat = 0.25 + 0.35 * Math.max(v.clench, 0);

    // ---- transform --------------------------------------------------------
    // scale spring (appear / pop)
    const targetSc = visible && age >= 0 ? scale : 0;
    for (let i = 0; i < sub; i++) {
      const scA = (targetSc - st.sc) * 90 - st.scVel * 14;
      st.scVel += scA * h; st.sc += st.scVel * h;
    }
    const sc = Math.max(0.0001, st.sc);
    if (outer.current) outer.current.visible = st.sc > 0.003 || targetSc > 0;

    if (outer.current) {
      st.pos.x = damp(st.pos.x, position[0], 5, dt); st.pos.y = damp(st.pos.y, position[1], 5, dt); st.pos.z = damp(st.pos.z, position[2], 5, dt);
      if (reduce) st.pos.set(...position);
      outer.current.position.copy(st.pos);
    }

    // drop onto shelf with a physical bounce
    if (drop && age >= 0) {
      if (reduce) st.y = 0;
      else {
        for (let i = 0; i < sub; i++) {
          st.vy -= 14 * h; st.y += st.vy * h;
          if (st.y < 0) { st.y = 0; if (Math.abs(st.vy) > 0.4) st.squash = Math.min(1, Math.abs(st.vy) / 6); st.vy = -st.vy * 0.42; }
        }
      }
    }
    st.squash *= Math.exp(-dt * 7);

    const light = Math.max(-v.weight, 0);
    const bob = reduce ? 0 : Math.sin(t * 1.3) * 0.08 * light;
    const baseLift = -bottomOf(v) * 0.97 + light * 0.32 + bob;
    const squashY = 1 - 0.28 * st.squash - 0.07 * st.flinch;
    const squashXZ = 1 + 0.18 * st.squash + 0.03 * st.flinch;

    if (inner.current) {
      const jit = reduce ? 0 : Math.max(v.buzz, 0);
      st.jit.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.035 * jit);
      inner.current.position.set(
        st.jit.x + reach * 0.12,
        (baseLift + st.jit.y - sink * 1.25) * sc + st.y,
        st.jit.z + lunge * 2.2 * sc - st.flinch * 0.12 + reach * 0.1,
      );
      inner.current.scale.set(sc * squashXZ * (1 - 0.35 * sink), sc * squashY * (1 - 0.35 * sink), sc * squashXZ * (1 - 0.35 * sink));
      if (spin && !reduce && mode !== 'blank') inner.current.rotation.y += dt * 0.16 * (1 - Math.max(-v.buzz, 0) * 0.7);
      if (mode === 'chase') inner.current.rotation.set(0, 0.5, 0);
    }

    // projected screen position of the main object (for stroking)
    if (store && inner.current) {
      inner.current.getWorldPosition(tmpV);
      const dist = tmpV.distanceTo(camera.position);
      tmpV.project(camera);
      const fov = (camera as unknown as { fov: number }).fov ?? 40;
      store.screen.x = (tmpV.x + 1) / 2 * size.width;
      store.screen.y = (1 - tmpV.y) / 2 * size.height;
      store.screen.r = sc / (dist * Math.tan((fov * Math.PI) / 360)) * size.height / 2;
    }
  });

  const pick = onPick ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(); } : undefined;
  return (
    <group ref={outer} position={position}>
      <group ref={inner} scale={0.0001}>
        <mesh ref={mesh} geometry={geo} material={mat} customDepthMaterial={depth} castShadow receiveShadow />
        {onPick && (
          <mesh onClick={pick}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}>
            <sphereGeometry args={[1.35, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}
