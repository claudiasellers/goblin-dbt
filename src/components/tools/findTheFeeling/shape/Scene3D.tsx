import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Object3D, Vector3, type Group, type SpotLight } from 'three';
import type { Step } from '../../../../lib/findTheFeelingFlow';
import { Blob3D } from './Blob3D';
import { variant, type Feel } from './feel';
import { SX, THEN_POS, URGE_POS, mainPos, shelfItems, shelfRows, slotPos, variantPos, type Anchors } from './layout3d';
import type { StageProps } from './palette';
import { aimKey, dampCamera, dampGroup, fitFov, type Pose, type V3 } from './rig';

const HIGH: Pose = { pos: [0, 0.5, 6.4], look: [0, -0.9, 0] };
const POSES: Record<Step, Pose> = {
  intro: { pos: [0, 0.9, 4.9], look: [0, 0.12, 0] },
  find: { pos: [0, 1.25, 5.9], look: [0, -0.28, 0.55] },
  capacity: { pos: [0, 0.75, 5.2], look: [0, -0.35, 0] },
  pull: { pos: [0, 1.35, 5.9], look: [0, -0.42, 0.6] },
  regulate: { pos: [0, 0.7, 3.5], look: [0, 0.25, 0] },
  orient: HIGH,
  word: { pos: [0, 0.65, 4.6], look: [0, -0.42, 0] },
  setOff: HIGH,
  close: { pos: [0, 1.0, 6.7], look: [0, -0.4, 0] },
  next: HIGH,
  collection: { pos: [6, 0.35, 2.6], look: [6, 0.1, -2.7] },
  handoff: { pos: [0, 0.65, 4.6], look: [0, -0.42, 0] },
};

function Rig({ step, reduce, anchors }: { step: Step; reduce: boolean; anchors: Anchors }) {
  const { camera, size } = useThree();
  const look = useRef(new Vector3(...POSES.intro.look));
  const first = useRef(true);
  useFrame((state, dt) => {
    const lam = reduce || first.current ? 1000 : 2.2;
    first.current = false;
    const swayX = reduce ? 0 : Math.sin(state.clock.elapsedTime * 0.21) * 0.05;
    dampCamera(camera, look.current, POSES[step], lam, dt, swayX);
    camera.updateMatrixWorld();
    anchors.project(camera, size.width, size.height);
  });
  useEffect(() => fitFov(camera, size.width / size.height), [camera, size]);
  return null;
}

function Plinth({ position, size, color, up = true, children }: { position: V3; size: V3; color: string; up?: boolean; children?: ReactNode }) {
  const g = useRef<Group>(null);
  const cur = useRef<Vector3 | null>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const ty = up ? position[1] : position[1] - size[1] - 0.6;
    if (!cur.current) cur.current = new Vector3(position[0], ty, position[2]);
    dampGroup(g.current, cur.current, position[0], ty, position[2], dt);
  });
  return (
    <group ref={g} position={[position[0], up ? position[1] : -3, position[2]]}>
      <RoundedBox args={size} radius={0.018} smoothness={2} position={[0, -size[1] / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.92} />
      </RoundedBox>
      {children}
    </group>
  );
}

/** The gallery: plinths, objects, light. Placards are DOM, positioned via `anchors`. */
export function Scene3D(props: StageProps & { anchors: Anchors }) {
  const { step, pal, dark, reduce, store, round, flip, roundDim, onCloser, roundBusy, urges, picked, onPull, thenFeel, shelf, fresh, anchors } = props;
  const main = () => store.main;

  const inClose = step === 'close';
  const mp = mainPos(inClose);
  const mainUp = step !== 'pull' && step !== 'collection';
  const mainScale = inClose ? 0.33 : step === 'next' || step === 'orient' ? 0.36 : 0.42;

  const key = useRef<SpotLight>(null);
  const keyTarget = useMemo(() => new Object3D(), []);
  const washTarget = useMemo(() => new Object3D(), []);
  const shelfTarget = useMemo(() => new Object3D(), []);
  const low = step === 'pull' || step === 'find';
  const boost = step === 'regulate' ? 1.12 : step === 'intro' ? 0.92 : 1;
  useFrame((_, dt) => aimKey(key.current, keyTarget, low, inClose, pal.key * boost, dt));

  const { plus, minus } = variantPos(flip);
  const showVariants = step === 'find';
  const showPulls = step === 'pull';
  const shelfOn = step === 'collection';
  const items = shelfItems(shelf, fresh);

  return (
    <>
      <Rig step={step} reduce={reduce} anchors={anchors} />
      <color attach="background" args={[pal.wall]} />
      <fog attach="fog" args={[pal.wall, 7, 16]} />
      <hemisphereLight args={[pal.rim, pal.floor, pal.ambient]} />
      <primitive object={keyTarget} position={[0, 0.1, 0]} />
      <primitive object={washTarget} position={[0, 1.0, -2.8]} />
      <primitive object={shelfTarget} position={[SX, 0.2, -2.4]} />
      <spotLight ref={key} position={[1.1, 5.6, 3.0]} target={keyTarget} angle={0.5} penumbra={0.9} intensity={pal.key} decay={0}
        color="#fff4e6" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <spotLight position={[0, 4.5, 1.5]} target={washTarget} angle={0.42} penumbra={1} intensity={pal.wash} decay={0} color="#ffeedd" />
      <spotLight position={[SX + 0.4, 3.6, 2.6]} target={shelfTarget} angle={0.55} penumbra={0.9} intensity={shelfOn ? pal.key * 0.95 : 0} decay={0} color="#fff1df"
        castShadow={shelfOn} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <directionalLight position={[-3, 3, -2]} intensity={0.9} color={pal.rim} />
      <directionalLight position={[0.6, 0.4, 6]} intensity={dark ? 0.28 : 0.55} color="#fff1e2" />
      <Environment frames={1} resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[3, 4, 1]} color={pal.rim} />
        <Lightformer form="rect" intensity={0.5} position={[4, 1, 2]} rotation-y={-Math.PI / 2} scale={[3, 4, 1]} />
      </Environment>

      {/* room: floor + wall */}
      <mesh rotation-x={-Math.PI / 2} position={[3, -1.4, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color={pal.floor} roughness={0.95} />
      </mesh>
      <mesh position={[3, 4, -2.9]} receiveShadow>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color={pal.wall} roughness={1} emissive={pal.wall} emissiveIntensity={dark ? 0.1 : 0.22} />
      </mesh>

      {/* main plinth + object */}
      <Plinth position={mp} size={[inClose ? 0.72 : 1.05, 1.4, inClose ? 0.72 : 1.05]} color={pal.plinth} up={mainUp} />
      <Blob3D feel={main} position={[mp[0], 0, mp[2]]} scale={mainScale} visible={mainUp} detail={40} seed={1.7} store={store} reduce={reduce} />

      {/* "then": the snapshot from the find step */}
      <Plinth position={THEN_POS} size={[0.72, 1.4, 0.72]} color={pal.plinth} up={inClose} />
      {thenFeel && <Blob3D feel={() => thenFeel} position={THEN_POS} scale={0.33} visible={inClose} detail={36} seed={1.7} reduce={reduce} />}

      {/* find: two live variants */}
      <Plinth position={plus} size={[0.5, 0.5, 0.5]} color={pal.plinth} up={showVariants} />
      <Plinth position={minus} size={[0.5, 0.5, 0.5]} color={pal.plinth} up={showVariants} />
      <Blob3D key={`p${round}`} feel={() => variant(store.main, roundDim, 1)} position={plus} scale={0.19} visible={showVariants} detail={26} seed={1.7}
        onPick={roundBusy ? undefined : () => onCloser(1)} delay={0.15} reduce={reduce} />
      <Blob3D key={`m${round}`} feel={() => variant(store.main, roundDim, -1)} position={minus} scale={0.19} visible={showVariants} detail={26} seed={1.7}
        onPick={roundBusy ? undefined : () => onCloser(-1)} delay={0.3} reduce={reduce} />

      {/* pull: four studies of an urge, keyed by urge id */}
      {urges.map((u, i) => {
        const pos = URGE_POS[i] ?? URGE_POS[3];
        return (
          <group key={u.id}>
            <Plinth position={pos} size={[0.56, 1.2, 0.56]} color={pal.plinth} up={showPulls} />
            <Blob3D feel={main} position={pos} scale={0.17} visible={showPulls} detail={24} seed={1.7} mode={u.id}
              onPick={picked ? undefined : () => onPull(u.id)} delay={0.1 + i * 0.08} spin={false} reduce={reduce} />
          </group>
        );
      })}

      {/* the shelf */}
      {shelfRows(items.length).map((y, i) => (
        <mesh key={i} position={[SX, y - 0.04, -2.69]} receiveShadow>
          <boxGeometry args={[1.75, 0.08, 0.42]} />
          <meshStandardMaterial color={pal.wood} roughness={0.75} />
        </mesh>
      ))}
      {items.map((it, i) => (
        <ShelfFeel key={it.key} feel={it.feel} pos={slotPos(i, items.length)} fresh={!!it.fresh} visible={shelfOn} seed={2.3 + i * 1.9} reduce={reduce} />
      ))}
    </>
  );
}

function ShelfFeel({ feel, pos, fresh, visible, seed, reduce }: { feel: Feel; pos: V3; fresh: boolean; visible: boolean; seed: number; reduce: boolean }) {
  return <Blob3D feel={() => feel} position={pos} scale={0.16} visible={visible} detail={fresh ? 30 : 22} seed={fresh ? 1.7 : seed} drop={fresh} delay={fresh ? 0.9 : 0} spin reduce={reduce} />;
}
