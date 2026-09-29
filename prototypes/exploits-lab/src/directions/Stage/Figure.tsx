// Soft clay figures: capsule body, sphere head, two dots for eyes. Springy, breathing, leaning into motion.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Color, MeshStandardMaterial, type Group, type Mesh } from 'three';
import { useKit } from './Kit';
import type { FigId } from './model';
import { autoFace, type StageStore } from './store';

export interface DollRig {
  root: RefObject<Group | null>; body: RefObject<Group | null>; head: RefObject<Group | null>;
  armL: RefObject<Group | null>; armR: RefObject<Group | null>; phone: RefObject<Mesh | null>; blob: RefObject<Mesh | null>;
}

/** Pure visual doll. Faces +z. */
export function Doll({ mat, rig, shadow = true, phone = false }: { mat: MeshStandardMaterial; rig?: DollRig; shadow?: boolean; phone?: boolean }) {
  const k = useKit();
  return (
    <group ref={rig?.root}>
      <mesh ref={rig?.blob} geometry={k.blob} material={k.blobMat} rotation-x={-Math.PI / 2} position-y={0.004} scale={[0.62, 0.5, 1]} renderOrder={1} />
      <group ref={rig?.body}>
        <mesh geometry={k.body} material={mat} position-y={0.31} castShadow={shadow} receiveShadow />
        <group ref={rig?.armL} position={[-0.158, 0.5, 0]} rotation-z={-0.14}>
          <mesh geometry={k.arm} material={mat} position-y={-0.1} castShadow={shadow} />
        </group>
        <group ref={rig?.armR} position={[0.158, 0.5, 0]} rotation-z={0.14}>
          <mesh geometry={k.arm} material={mat} position-y={-0.1} castShadow={shadow} />
          {phone && <mesh ref={rig?.phone} geometry={k.phone} material={k.phoneMat} position={[0, -0.23, 0.035]} rotation-x={Math.PI / 2} visible={false} />}
        </group>
        <group ref={rig?.head} position-y={0.745}>
          <mesh geometry={k.head} material={mat} castShadow={shadow} />
          <mesh geometry={k.eye} material={k.eyeMat} position={[-0.047, 0.012, 0.127]} />
          <mesh geometry={k.eye} material={k.eyeMat} position={[0.047, 0.012, 0.127]} />
        </group>
      </group>
    </group>
  );
}

export function useDollMat(color: string, emissive = 0) {
  const mat = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, emissive: new Color(color), emissiveIntensity: emissive }), [color, emissive]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

const angDiff = (a: number, b: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const dampT = (a: number, b: number, lam: number, dt: number) => a + (b - a) * (1 - Math.exp(-lam * dt));
const GREY = new Color('#8f8a86');

/** Live, springy figure driven by store.fig[id]. */
export function Figure({ id, store, color, emissive = 0, seed = 0 }: { id: FigId; store: StageStore; color: string; emissive?: number; seed?: number }) {
  const mat = useDollMat(color, emissive);
  const base = useMemo(() => new Color(color), [color]);
  const rig: DollRig = {
    root: useRef<Group>(null), body: useRef<Group>(null), head: useRef<Group>(null),
    armL: useRef<Group>(null), armR: useRef<Group>(null), phone: useRef<Mesh>(null), blob: useRef<Mesh>(null),
  };
  const sp = useRef({ vx: 0, vz: 0, rot: 0, vr: 0, vs: 0, walk: 0, leanX: 0, leanZ: 0, sit: 0, slump: 0, look: 0, wave: 0, phone: 0, drop: 0, hop: 0, vh: 0, shake: 0, lift: 0, back: 0, init: false });

  useFrame((state, rawDt) => {
    const root = rig.root.current, body = rig.body.current, head = rig.head.current;
    if (!root || !body || !head) return;
    const f = store.fig[id], L = store.live[id], S = sp.current;
    const reduce = store.reduce;
    const dt = Math.min(rawDt, 0.08);
    const t = state.clock.elapsedTime + seed * 1.7;
    if (!S.init) { S.rot = autoFace(store, id); S.init = true; }

    // position / scale springs, substepped for stability on slow frames
    const kP = reduce ? 420 : 150, cP = reduce ? 41 : 15.5;
    const tgtS = f.show ? f.s : 0;
    const kS = reduce ? 420 : 170, cS = reduce ? 41 : 11;
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) {
      S.vx += ((f.x - L.x) * kP - S.vx * cP) * h; S.vz += ((f.z - L.z) * kP - S.vz * cP) * h;
      L.x += S.vx * h; L.z += S.vz * h;
      S.vs += ((tgtS - L.s) * kS - S.vs * cS) * h; L.s += S.vs * h;
      const tf = f.face ?? autoFace(store, id);
      S.vr += (angDiff(S.rot, tf) * 95 - S.vr * 13) * h; S.rot += S.vr * h;
      S.vh += ((f.hop - S.hop) * 260 - S.vh * 12) * h; S.hop += S.vh * h;
    }
    L.rot = S.rot;
    const speed = Math.hypot(S.vx, S.vz);
    S.walk += speed * dt * 16;

    // pose params ease
    const lam = reduce ? 30 : 5;
    S.sit = dampT(S.sit, f.sit, lam, dt); S.slump = dampT(S.slump, f.slump, lam * 0.7, dt);
    S.look = dampT(S.look, f.look, lam, dt); S.wave = dampT(S.wave, f.wave, lam, dt); S.phone = dampT(S.phone, f.phone, lam, dt);
    S.drop = dampT(S.drop, f.drop, 10, dt);

    // mood of "you" during the capacity probe
    let shake = 0, lift = 0, back = 0, shrink = 1;
    if (id === 'you') {
      if (store.mood === 'steady') { lift = 1; }
      if (store.mood === 'stirred') { back = 1; }
      if (store.mood === 'flooded') { shake = 1; shrink = 0.9; }
    }
    S.shake = dampT(S.shake, shake, 6, dt); S.lift = dampT(S.lift, lift, 5, dt); S.back = dampT(S.back, back, 5, dt);

    const s = Math.max(0.0001, L.s) * (1 - (1 - shrink) * S.shake);
    const bob = reduce ? 0 : Math.abs(Math.sin(S.walk)) * Math.min(1, speed * 0.6) * 0.05;
    const jit = reduce ? 0 : S.shake * Math.sin(t * 47) * 0.012;
    L.y = bob + S.hop - S.drop;
    root.position.set(L.x + jit, L.y, L.z);
    root.rotation.y = S.rot;
    root.scale.setScalar(s);
    root.visible = L.s > 0.02;

    // lean into motion (in the figure's own frame)
    const cs = Math.cos(S.rot), sn = Math.sin(S.rot);
    const fwd = S.vx * sn + S.vz * cs, side = S.vx * cs - S.vz * sn;
    S.leanX = dampT(S.leanX, reduce ? 0 : Math.max(-0.35, Math.min(0.35, fwd * 0.16)), 10, dt);
    S.leanZ = dampT(S.leanZ, reduce ? 0 : Math.max(-0.3, Math.min(0.3, -side * 0.14)), 10, dt);
    const breathe = reduce ? 0 : Math.sin(t * 1.55) * 0.014;
    body.rotation.x = S.leanX + S.slump * 0.32 - S.back * 0.14 + S.lift * 0.03;
    body.rotation.z = S.leanZ;
    body.position.y = -S.sit * 0.2 - S.slump * 0.03 + S.lift * 0.02;
    body.scale.set(1 + S.sit * 0.12 - S.back * 0.04, 1 + breathe - S.sit * 0.08 + S.lift * 0.02, 1 + S.sit * 0.12);

    head.position.y = 0.745 - S.slump * 0.06;
    head.position.z = S.slump * 0.06;
    head.rotation.x = S.slump * 0.5 - S.lift * 0.12 * (0.6 + 0.4 * Math.sin(t * 2.2)) + (reduce ? 0 : Math.sin(t * 0.9) * 0.02);
    head.rotation.y = S.look * Math.sin(t * 1.4) * 0.9;

    const aL = rig.armL.current, aR = rig.armR.current;
    if (aL && aR) {
      const sway = reduce ? 0 : Math.sin(S.walk) * Math.min(1, speed) * 0.5;
      aL.rotation.set(sway - S.slump * 0.2, 0, -0.14 - S.back * 0.1);
      const waveZ = S.wave * (2.5 + (reduce ? 0 : Math.sin(t * 9) * 0.3));
      aR.rotation.set(-sway - S.phone * 2.05 - S.slump * 0.2, 0, 0.14 + S.back * 0.1 + waveZ);
      const ph = rig.phone.current; if (ph) ph.visible = S.phone > 0.5;
    }
    const b = rig.blob.current;
    if (b) {
      const hgt = Math.max(0, L.y);
      b.position.y = (0.004 - L.y) / s;
      const k = Math.max(0.4, 1 - hgt * 2.5);
      b.scale.set(0.62 * k * (1 + S.sit * 0.3), 0.5 * k * (1 + S.sit * 0.3), 1);
      b.visible = S.drop < 0.05;
    }

    // blank drains colour
    mat.color.copy(base).lerp(GREY, S.slump * 0.45);
  });

  return <Doll mat={mat} rig={rig} phone={id === 'them'} />;
}
