import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Color, Fog, Matrix4, Object3D, Quaternion, Vector3, type Group, type Mesh, type PerspectiveCamera, type SpotLight, type HemisphereLight, type DirectionalLight, type MeshStandardMaterial, type ShaderMaterial } from 'three';
import { KitProvider, useKit, useMakeKit } from './Kit';
import { Doll, Figure, useDollMat } from './Figure';
import { FIG_H, SEEDS, STAGE_RY, wl, type Arr, type Pal, type Step } from './model';
import type { StageStore } from './store';

export const FOV = 22;
export const SHELF_X = 16;
export const SHELF_SLOTS: [number, number][] = [[-1.3, 1.25], [0, 1.25], [1.3, 1.25], [-1.3, 0], [0, 0], [1.3, 0]];
export const MINI = 0.3;
export const DRUM = 0.42;
const MOON_A = Math.PI + 0.42 + 0.55;

export interface SceneUI {
  step: Step;
  find: null | { want: 'blue' | 'round' | 'high'; onFind: (id: 'blue' | 'round' | 'high') => void };
  compare: boolean;
  shelf: null | { today: string | null; landed: boolean };
  askBubble: boolean;
}

const tmpV = new Vector3();

function Rig({ store }: { store: StageStore }) {
  const { camera, size, scene } = useThree();
  const look = useMemo(() => new Vector3(), []);
  useEffect(() => { store.camera = camera as PerspectiveCamera; }, [camera, store]);
  useFrame(state => {
    const cam = camera as PerspectiveCamera;
    const c = store.cam;
    const aspect = size.width / size.height;
    const tanH = Math.tan((FOV * Math.PI) / 360);
    let span = c.span, frac = c.frac;
    if (c.fit > 0.001 && store.safe) {
      // fit the whole set (backdrop top to drum base, drum width) into the free band
      const UP = 1.8, DOWN = 1.72, WIDE = 3.62;
      const band = Math.max(60, store.safe.bottom - store.safe.top);
      const ppu = Math.min((size.width - 12) / WIDE, band / (UP + DOWN));
      const fs = (size.width * Math.min(aspect, 0.85)) / (ppu * aspect);
      const ff = (store.safe.top + UP * ppu + (band - (UP + DOWN) * ppu) / 2) / size.height;
      span += (fs - span) * c.fit; frac += (ff - frac) * c.fit;
    }
    const d = Math.max(span / (2 * tanH * Math.min(aspect, 0.85)), span * 0.62 / (2 * tanH));
    const sway = store.reduce ? 0 : Math.sin(state.clock.elapsedTime * 0.17) * 0.018;
    const az = c.azim + sway;
    look.set(c.tx, c.ty, c.tz);
    cam.position.set(c.tx + d * Math.sin(az) * Math.cos(c.elev), c.ty + d * Math.sin(c.elev), c.tz + d * Math.cos(az) * Math.cos(c.elev));
    cam.lookAt(look);
    cam.near = Math.max(0.1, d * 0.25); cam.far = d * 4 + 60;
    const h = size.height;
    cam.setViewOffset(size.width, h, 0, (0.5 - frac) * h, size.width, h);
    cam.updateProjectionMatrix();
    store.size = { w: size.width, h: size.height };
    const fog = scene.fog as Fog | null;
    if (fog) { fog.near = d * 0.92; fog.far = d * 1.9 + 8; }
  });
  return null;
}

/** The round set itself: boards, drum, brass band, painted backdrop. Origin = centre of the stage floor. */
function StageSet({ dim = false, backdrop = true, children }: { dim?: boolean; backdrop?: boolean; children?: ReactNode }) {
  const k = useKit();
  return (
    <group>
      <mesh geometry={k.top} material={dim ? k.topDimMats : k.topMats} position-y={-0.05} receiveShadow />
      <mesh geometry={k.drum} material={k.drumMat} position-y={-0.26} castShadow receiveShadow />
      <mesh geometry={k.drumBase} material={k.drumMat} position-y={-0.41} />
      <mesh geometry={k.band} material={k.bandMat} position-y={-0.115} rotation-x={Math.PI / 2} />
      {backdrop && <mesh geometry={k.backdrop} material={k.backdropMat} position-y={0.52} receiveShadow />}
      {children}
    </group>
  );
}

export function MiniStage({ arr, dim, pal, children }: { arr: Arr; dim: boolean; pal: Pal; children?: ReactNode }) {
  const k = useKit();
  const you = useDollMat(dim ? mix(pal.you, pal.other, 0.35) : pal.you, dim ? 0 : 0.05);
  const them = useDollMat(dim ? mix(pal.them, pal.other, 0.35) : pal.them);
  const other = useDollMat(pal.other);
  const face = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(tx - fx, tz - fz);
  const c = arr.others ? { x: arr.others.reduce((s, o) => s + o.x, 0) / 3, z: arr.others.reduce((s, o) => s + o.z, 0) / 3 } : null;
  return (
    <StageSet dim={dim}>
      <mesh geometry={k.moon} material={k.moonMat} position={[Math.sin(MOON_A) * 1.55, 0.78, Math.cos(MOON_A) * 1.55]} rotation-y={MOON_A + Math.PI} />
      <group position={[arr.you.x, 0, arr.you.z]} rotation-y={face(arr.you.x, arr.you.z, arr.them.x, arr.them.z)} scale={arr.you.s}><Doll mat={you} shadow={false} /></group>
      <group position={[arr.them.x, 0, arr.them.z]} rotation-y={face(arr.them.x, arr.them.z, arr.you.x, arr.you.z) + (arr.them.turned ? Math.PI : 0)} scale={arr.them.s}><Doll mat={them} shadow={false} /></group>
      {arr.others?.map((o, i) => (
        <group key={i} position={[o.x, 0, o.z]} rotation-y={arr.open ? face(o.x, o.z, arr.you.x, arr.you.z) : face(o.x, o.z, c!.x, c!.z)} scale={0.92}><Doll mat={other} shadow={false} /></group>
      ))}
      {arr.them.speech && (
        <group position={[arr.them.x, FIG_H * arr.them.s + 0.3, arr.them.z]} rotation-y={-STAGE_RY}>
          <mesh geometry={k.burst} material={k.burstMat} />
        </group>
      )}
      {children}
    </StageSet>
  );
}

function mix(a: string, b: string, t: number) { return '#' + new Color(a).lerp(new Color(b), t).getHexString(); }

function Speech({ store }: { store: StageStore }) {
  const k = useKit();
  const g = useRef<Group>(null);
  const v = useRef({ s: 0, vs: 0 });
  const { camera } = useThree();
  useFrame((state, dt) => {
    const G = g.current; if (!G) return;
    const S = v.current; const d = Math.min(dt, 0.05);
    const tgt = store.speech;
    const kk = store.reduce ? 400 : 220, cc = store.reduce ? 40 : 12;
    S.vs += ((tgt - S.s) * kk - S.vs * cc) * d; S.s += S.vs * d;
    const L = store.live.them;
    const rot = L.rot;
    // float in front of their face, toward where they face
    let bx = L.x + Math.sin(rot) * 0.26, bz = L.z + Math.cos(rot) * 0.26;
    const bl = Math.hypot(bx, bz); if (bl > 1.2) { bx *= 1.2 / bl; bz *= 1.2 / bl; }
    G.position.set(bx, L.y + FIG_H * L.s + 0.24, bz);
    G.visible = S.s > 0.02;
    G.scale.setScalar(Math.max(0.001, S.s) * (1 + (store.reduce ? 0 : Math.sin(state.clock.elapsedTime * 7) * 0.035)));
    // billboard toward camera
    const parent = G.parent; if (parent) {
      camera.getWorldPosition(tmpV); parent.worldToLocal(tmpV);
      G.rotation.set(0, Math.atan2(tmpV.x - G.position.x, tmpV.z - G.position.z), store.reduce ? 0 : Math.sin(state.clock.elapsedTime * 3.1) * 0.08);
    }
  });
  return (
    <group ref={g} visible={false}>
      <mesh geometry={k.burst} material={k.burstMat} position-z={-0.02} />
      <mesh geometry={k.burstIn} material={k.burstInMat} position-z={0.03} />
    </group>
  );
}

function Props({ store, ui, pal }: { store: StageStore; ui: SceneUI; pal: Pal }) {
  const k = useKit();
  const star = useRef<Group>(null);
  const box = useRef<Mesh>(null);
  const moon = useRef<Mesh>(null);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const W = store.wiggle;
    for (const key of Object.keys(W)) W[key] = Math.max(0, W[key] - dt * 1.6);
    if (star.current) {
      star.current.rotation.y = store.reduce ? 0.3 : Math.sin(t * 0.6) * 0.5 + (W.high ?? 0) * Math.sin(t * 30) * 0.4;
      star.current.position.y = 1.72 + (store.reduce ? 0 : Math.sin(t * 0.8) * 0.02);
    }
    if (star.current) star.current.visible = ui.step !== 'shelf';
    if (box.current) box.current.rotation.z = (W.blue ?? 0) * Math.sin(t * 30) * 0.12;
    if (moon.current) moon.current.scale.setScalar(1 + (W.round ?? 0) * Math.sin(t * 30) * 0.08);
    const lit = store.propsLit;
    (k.starMat as MeshStandardMaterial).emissiveIntensity = lit.high ? 0.9 : 0.15;
    (k.moonMat as MeshStandardMaterial).emissiveIntensity = lit.round ? 0.8 : 0.25;
    (k.blueMat as MeshStandardMaterial).emissive.set(pal.blue);
    (k.blueMat as MeshStandardMaterial).emissiveIntensity = lit.blue ? 0.35 : 0;
  });
  const moonA = MOON_A;
  const [bx, bz] = wl(0.42, 1.3);
  const [sx, sz] = wl(0.62, -0.78);
  const btn = (id: 'blue' | 'round' | 'high', label: string) => ui.find && (
    <Html center zIndexRange={[30, 20]} style={{ pointerEvents: 'auto' }}>
      <button type="button" data-ui data-testid={`find-${id}`} aria-label={label} onClick={() => ui.find?.onFind(id)}
        className="find-hit" />
    </Html>
  );
  return (
    <group>
      <mesh ref={moon} geometry={k.moon} material={k.moonMat} position={[Math.sin(moonA) * 1.55, 0.78, Math.cos(moonA) * 1.55]} rotation-y={moonA + Math.PI}>
        {btn('round', 'The round moon')}
      </mesh>
      <mesh ref={box} geometry={k.box} material={k.blueMat} position={[bx, 0.12, bz]} rotation-y={0.9} castShadow receiveShadow>
        {btn('blue', 'The blue box')}
      </mesh>
      <group ref={star} position={[sx, 1.72, sz]}>
        <mesh geometry={k.string} material={k.stringMat} position-y={1.6} />
        <mesh geometry={k.star} material={k.starMat} position-z={-0.02} castShadow />
        {btn('high', 'The star, highest of all')}
      </group>
    </group>
  );
}

function KeyLight({ store, pal }: { store: StageStore; pal: Pal }) {
  const k = useKit();
  const key = useRef<SpotLight>(null);
  const cone = useRef<Mesh>(null);
  const target = useMemo(() => new Object3D(), []);
  const warm = useMemo(() => new Color(pal.keyColor), [pal]);
  const warmer = useMemo(() => new Color('#ffb877'), []);
  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const KP = useMemo(() => new Vector3(1.3, 5.4, 3.4), []);
  useFrame(() => {
    const Lt = store.light;
    const you = store.live.you;
    target.position.set(you.x, 0.3, you.z);
    target.updateMatrixWorld();
    const lv = Lt.lv;
    if (key.current) {
      key.current.intensity = pal.key * lv * Lt.key * (1 - 0.25 * Lt.soft);
      key.current.angle = 0.2 + 0.1 * Lt.soft;
      key.current.penumbra = 0.55 + 0.4 * Lt.soft;
      key.current.color.copy(warm).lerp(warmer, Lt.soft * 0.6);
    }
    if (cone.current) {
      const tgt = tmpV.set(you.x, 0, you.z);
      const d = KP.distanceTo(tgt);
      const mid = KP.clone().add(tgt).multiplyScalar(0.5);
      m4.lookAt(tgt, mid, new Vector3(0, 1, 0)); q.setFromRotationMatrix(m4);
      cone.current.position.copy(mid); cone.current.quaternion.copy(q);
      const rad = d * Math.tan(0.2 + 0.1 * Lt.soft) * 0.85;
      cone.current.scale.set(rad, rad, d);
      (cone.current.material as ShaderMaterial).uniforms.uOpacity.value = pal.cone * lv * Lt.key;
      cone.current.visible = pal.cone > 0;
    }
  });
  return (
    <>
      <primitive object={target} />
      <spotLight ref={key} position={KP.toArray()} target={target} angle={0.2} penumbra={0.55} decay={0} intensity={pal.key} color={pal.keyColor}
        castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} shadow-normalBias={0.02} />
      <mesh ref={cone} geometry={k.cone} material={k.coneMat} renderOrder={5} />
    </>
  );
}

function Ambient({ store, pal, dark }: { store: StageStore; pal: Pal; dark: boolean }) {
  const hemi = useRef<HemisphereLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  useFrame(() => {
    const Lt = store.light, lv = Lt.lv;
    if (hemi.current) hemi.current.intensity = pal.amb * (0.18 + 0.82 * lv * (0.25 + 0.75 * Lt.house)) * (1 + Lt.soft * 0.1);
    if (fill.current) fill.current.intensity = pal.fill * lv * Lt.fill * (1 - 0.2 * Lt.soft);
    if (rim.current) rim.current.intensity = (dark ? 0.9 : 0.5) * lv * Lt.house;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={[pal.rim, pal.floor, pal.amb]} />
      <directionalLight ref={fill} position={[-3, 5, 4]} intensity={pal.fill} color="#fff6ea" />
      <directionalLight ref={rim} position={[-2, 3, -5]} intensity={0.6} color={pal.rim} />
    </>
  );
}

function Room({ store, pal }: { store: StageStore; pal: Pal }) {
  const k = useKit();
  const others: { p: [number, number, number]; r: number; arr: Arr }[] = useMemo(() => [
    { p: [-5.6, 0, -4.2], r: 0.5, arr: SEEDS[1].arr },
    { p: [5.4, 0, -5.6], r: -0.6, arr: SEEDS[2].arr },
    { p: [-8.8, 0, 3.0], r: 0.9, arr: SEEDS[3].arr },
    { p: [8.6, 0, 1.8], r: -0.2, arr: SEEDS[0].arr },
    { p: [0.4, 0, -10.5], r: 0.2, arr: SEEDS[1].arr },
    { p: [-12, 0, -9], r: 0.4, arr: SEEDS[2].arr },
    { p: [12.5, 0, -10], r: -0.4, arr: SEEDS[3].arr },
  ], []);
  const world = useRef<Group>(null);
  useFrame(() => {
    (k.poolMat as { opacity: number }).opacity = (pal.cone > 0 ? 0.7 : 0.55) * store.light.world;
    (k.poolTopMat as { opacity: number }).opacity = (pal.cone > 0 ? 0.22 : 0.12) * store.light.world;
    (k.windowGlowMat as { opacity: number }).opacity = 0.14 * store.light.world;
    if (world.current) world.current.visible = store.light.world > 0.01;
  });
  return (
    <group>
      <mesh geometry={k.floor} material={k.floorMat} rotation-x={-Math.PI / 2} position-y={-DRUM} receiveShadow />
      {/* back wall with a tall window */}
      <mesh geometry={k.wall} material={k.wallMat} position={[0, 28, -22]} />
      <group position={[1.5, 5.2, -21.9]}>
        {[[-1.8, 1.9], [1.8, 1.9], [-1.8, -1.9], [1.8, -1.9]].map(([x, y], i) => (
          <mesh key={i} geometry={k.pane} material={k.windowMat} position={[x, y, 0.02]} scale={[3.4, 3.6, 1]} />
        ))}
        <mesh geometry={k.plank} material={k.frameMat} scale={[7.8, 0.3, 0.3]} position-y={-3.85} />
      </group>
      <group ref={world}>
        <mesh geometry={k.pane} material={k.windowGlowMat} rotation-x={-Math.PI / 2} position={[1.5, -DRUM + 0.01, -17]} scale={[14, 9, 1]} />
        {others.map((o, i) => (
          <group key={i} position={o.p} rotation-y={o.r}>
            <mesh geometry={k.pane} material={k.poolMat} rotation-x={-Math.PI / 2} position-y={-DRUM + 0.02} scale={[6, 6, 1]} />
            <mesh geometry={k.pane} material={k.poolTopMat} rotation-x={-Math.PI / 2} position-y={0.012} scale={[2.9, 2.9, 1]} />
            <MiniStage arr={o.arr} dim pal={pal} />
          </group>
        ))}
      </group>
    </group>
  );
}

function Shelf({ store, ui, pal }: { store: StageStore; ui: SceneUI; pal: Pal }) {
  const k = useKit();
  const g = useRef<Group>(null);
  const spot = useRef<SpotLight>(null);
  const tgt = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (spot.current) spot.current.intensity = pal.key * 0.7 * store.light.shelf;
    if (g.current) g.current.visible = store.light.shelf > 0.01 || ui.step === 'shelf';
  });
  const plank = (y: number) => <mesh geometry={k.plank} material={k.woodMat} position={[0, y - 0.04, 0]} scale={[4.3, 0.08, 1.05]} castShadow receiveShadow />;
  return (
    <group position={[SHELF_X, 0, 0]}>
      <primitive object={tgt} position={[0, 0.6, 0]} />
      <spotLight ref={spot} position={[0.6, 5.5, 5]} target={tgt} angle={0.45} penumbra={0.8} decay={0} intensity={0} color={pal.keyColor} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
      <group ref={g}>
        <mesh geometry={k.plank} material={k.wallMat} position={[0, 1.0, -0.56]} scale={[4.6, 3.6, 0.06]} receiveShadow />
        {plank(1.25 - DRUM * MINI)}
        {plank(-DRUM * MINI)}
        {[-2.2, 2.2].map(x => <mesh key={x} geometry={k.plank} material={k.woodMat} position={[x, 0.95, -0.02]} scale={[0.08, 2.9, 1.05]} castShadow />)}
        {SEEDS.map((s, i) => {
          const [x, y] = SHELF_SLOTS[i === 3 ? 3 : i];
          return (
            <group key={s.word} position={[x, y, 0]} scale={MINI} rotation-y={STAGE_RY}>
              <MiniStage arr={s.arr} dim pal={pal} />
              {ui.shelf && (
                <Html position={[0, -0.9, 1.9]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
                  <span className="shelf-label" style={{ color: pal.ink2 }}>{s.word}</span>
                </Html>
              )}
            </group>
          );
        })}
        {/* empty slot for next time */}
        <group position={[SHELF_SLOTS[5][0], SHELF_SLOTS[5][1] - DRUM * MINI + 0.005, 0]}>
          <mesh geometry={k.ring} material={k.ringMat} rotation-x={-Math.PI / 2} scale={[0.95, 0.95, 1]} />
          {ui.shelf && (
            <Html position={[0, -0.02, 0.62]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <span className="shelf-label" style={{ color: pal.ink2, opacity: 0.6 }}>next time</span>
            </Html>
          )}
        </group>
      </group>
    </group>
  );
}

function MainStage({ store, ui, pal, dark }: { store: StageStore; ui: SceneUI; pal: Pal; dark: boolean }) {
  const g = useRef<Group>(null);
  const { camera } = useThree();
  const k = useKit();
  const soft = useRef<Group>(null);
  useEffect(() => { store.stage = g.current; return () => { store.stage = null; }; }, [store]);
  useFrame((state, dt) => {
    const G = g.current; if (!G) return;
    const T = store.stageT;
    G.position.set(T.x, T.y, T.z); G.scale.setScalar(T.s); G.rotation.y = T.ry;
    if (soft.current) {
      const want = ui.askBubble ? 1 : 0;
      const sc = soft.current.scale.x + (want - soft.current.scale.x) * (1 - Math.exp(-6 * dt));
      soft.current.scale.setScalar(Math.max(0.001, sc)); soft.current.visible = sc > 0.02;
      const L = store.live.you;
      soft.current.position.set(L.x + Math.sin(L.rot) * 0.22, FIG_H * L.s + 0.24 + (store.reduce ? 0 : Math.sin(state.clock.elapsedTime * 1.4) * 0.02), L.z + Math.cos(L.rot) * 0.22);
      camera.getWorldPosition(tmpV); G.worldToLocal(tmpV);
      soft.current.rotation.y = Math.atan2(tmpV.x - soft.current.position.x, tmpV.z - soft.current.position.z);
    }
  });
  return (
    <group ref={g}>
      <StageSet>
        <KeyLight store={store} pal={pal} />
        <Props store={store} ui={ui} pal={pal} />
        <Figure id="you" store={store} color={pal.you} emissive={dark ? 0.12 : 0.03} seed={0} />
        <Figure id="them" store={store} color={pal.them} seed={1} />
        <Figure id="o1" store={store} color={pal.other} seed={2} />
        <Figure id="o2" store={store} color={pal.other} seed={3} />
        <Figure id="o3" store={store} color={pal.other} seed={4} />
        <Speech store={store} />
        <group ref={soft} visible={false}>
          <mesh geometry={k.softBubble} material={k.softMat} scale={[1.25, 0.78, 0.3]} />
          {[-0.07, 0, 0.07].map(x => <mesh key={x} geometry={k.eye} material={k.eyeMat} position={[x, 0, 0.05]} scale={1.3} />)}
        </group>
        {ui.compare && (
          <Html position={[0.2, -0.3, 2.1]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <span className="stage-label" style={{ color: pal.accent }}>Now</span>
          </Html>
        )}
        {ui.shelf?.landed && (
          <Html position={[0, -0.9, 1.9]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <span className="shelf-label shelf-today" style={{ color: pal.accent }}>{ui.shelf.today ?? 'untitled'}</span>
          </Html>
        )}
      </StageSet>
    </group>
  );
}

function ThenStage({ store, then, pal, show }: { store: StageStore; then: Arr | null; pal: Pal; show: boolean }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    const G = g.current; if (!G) return;
    const T = store.thenT;
    G.position.set(T.x, T.y, T.z); G.scale.setScalar(T.s); G.rotation.y = T.ry; G.visible = T.show > 0.01;
  });
  if (!then) return null;
  return (
    <group ref={g} visible={false}>
      <MiniStage arr={then} dim={false} pal={pal}>
        {show && (
          <Html position={[0.2, -0.3, 2.1]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <span className="stage-label" style={{ color: pal.ink2 }}>Then</span>
          </Html>
        )}
      </MiniStage>
    </group>
  );
}

export function StageScene({ store, ui, pal, dark, then }: { store: StageStore; ui: SceneUI; pal: Pal; dark: boolean; then: Arr | null }) {
  const kit = useMakeKit(pal);
  const { scene } = useThree();
  useEffect(() => { scene.fog = new Fog(pal.bg, 20, 40); scene.background = new Color(pal.bg); return () => { scene.fog = null; }; }, [scene, pal]);
  return (
    <KitProvider value={kit}>
      <Rig store={store} />
      <Ambient store={store} pal={pal} dark={dark} />
      <Room store={store} pal={pal} />
      <MainStage store={store} ui={ui} pal={pal} dark={dark} />
      <ThenStage store={store} then={then} pal={pal} show={ui.compare} />
      <Shelf store={store} ui={ui} pal={pal} />
    </KitProvider>
  );
}
