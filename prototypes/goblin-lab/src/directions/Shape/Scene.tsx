import { Environment, Html, Lightformer, RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Object3D, Vector3, type Group, type SpotLight } from 'three';
import { Blob, damp, type Mode, type ShapeStore } from './Blob';
import { ROUNDS, SEED_SHAPES, STEP, clamp, type Feel } from './features';
import { PULLS, STARTING_WORDS, type Pull } from '../../script';

export type Step = 'intro' | 'closer' | 'capacity' | 'pull' | 'regulate' | 'word' | 'what' | 'validate' | 'exits' | 'close' | 'shelf';

export interface Palette {
  wall: string; floor: string; plinth: string; ink: string; ink2: string; brass: string; wood: string; paper: string; line: string;
  ambient: number; key: number; wash: number; rim: string;
}
export const LIGHT: Palette = {
  wall: '#e2d8c8', floor: '#d6c9b5', plinth: '#f3ede3', ink: '#2a241d', ink2: '#6c6254', brass: '#8a6a3f', wood: '#bf9f78',
  paper: 'rgba(250,246,239,0.92)', line: 'rgba(42,36,29,0.16)', ambient: 0.4, key: 3.1, wash: 1.3, rim: '#ffe9cf',
};
export const DARK: Palette = {
  wall: '#2c1f2f', floor: '#1b141d', plinth: '#4a4049', ink: '#efe6da', ink2: '#b3a898', brass: '#d2ad6e', wood: '#5e4838',
  paper: 'rgba(30,24,32,0.9)', line: 'rgba(239,230,218,0.16)', ambient: 0.2, key: 2.3, wash: 1.9, rim: '#b9a6ff',
};

type V3 = [number, number, number];
interface Pose { pos: V3; look: V3 }
const POSES: Record<Step, Pose> = {
  intro: { pos: [0, 0.9, 4.9], look: [0, 0.12, 0] },
  closer: { pos: [0, 1.25, 5.9], look: [0, -0.28, 0.55] },
  capacity: { pos: [0, 0.75, 5.2], look: [0, -0.35, 0] },
  pull: { pos: [0, 1.35, 5.9], look: [0, -0.42, 0.6] },
  regulate: { pos: [0, 0.7, 3.5], look: [0, 0.25, 0] },
  word: { pos: [0, 0.65, 4.6], look: [0, -0.42, 0] },
  what: { pos: [0, 0.5, 6.4], look: [0, -0.9, 0] },
  validate: { pos: [0, 0.7, 5.0], look: [0, -0.3, 0] },
  exits: { pos: [0, 0.5, 6.4], look: [0, -0.88, 0] },
  close: { pos: [0, 0.9, 5.5], look: [0, -0.3, 0] },
  shelf: { pos: [6, 0.55, 2.4], look: [6, 0.25, -2.7] },
};

function Rig({ step, reduce }: { step: Step; reduce: boolean }) {
  const { camera, size } = useThree();
  const look = useRef(new Vector3(...POSES.intro.look));
  useFrame((state, dt) => {
    const p = POSES[step];
    const lam = reduce ? 30 : 2.2;
    const swayX = reduce ? 0 : Math.sin(state.clock.elapsedTime * 0.21) * 0.05;
    camera.position.x = damp(camera.position.x, p.pos[0] + swayX, lam, dt);
    camera.position.y = damp(camera.position.y, p.pos[1], lam, dt);
    camera.position.z = damp(camera.position.z, p.pos[2], lam, dt);
    look.current.x = damp(look.current.x, p.look[0], lam, dt);
    look.current.y = damp(look.current.y, p.look[1], lam, dt);
    look.current.z = damp(look.current.z, p.look[2], lam, dt);
    camera.lookAt(look.current);
  });
  // keep roughly the same horizontal framing on wider screens
  useEffect(() => {
    const cam = camera as unknown as { fov: number; updateProjectionMatrix: () => void };
    const aspect = size.width / size.height;
    cam.fov = aspect > 0.6 ? Math.max(24, 40 * 0.6 / aspect * 1.3) : 40;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Plinth({ position, size, color, up = true, children }: { position: V3; size: V3; color: string; up?: boolean; children?: ReactNode }) {
  const g = useRef<Group>(null);
  const cur = useRef(new Vector3(position[0], up ? position[1] : -3, position[2]));
  useFrame((_, dt) => {
    if (!g.current) return;
    const ty = up ? position[1] : position[1] - size[1] - 0.6;
    cur.current.x = damp(cur.current.x, position[0], 4, dt);
    cur.current.y = damp(cur.current.y, ty, 4, dt);
    cur.current.z = damp(cur.current.z, position[2], 4, dt);
    g.current.position.copy(cur.current);
  });
  return (
    <group ref={g} position={cur.current.toArray() as V3}>
      <RoundedBox args={size} radius={0.018} smoothness={2} position={[0, -size[1] / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.92} />
      </RoundedBox>
      {children}
    </group>
  );
}

/** Small-caps placard pinned in the scene. */
function Label({ position, children, onClick, sub, big = false, color }: { position: V3; children: ReactNode; onClick?: () => void; sub?: string; big?: boolean; color: string }) {
  const inner = (
    <span className="flex flex-col items-center gap-0.5 text-center" style={{ color }}>
      <span className={`uppercase whitespace-nowrap ${big ? 'text-[12px] tracking-[0.2em]' : 'text-[10px] tracking-[0.2em]'} font-medium leading-tight`}>{children}</span>
      {sub && <span className="whitespace-nowrap text-[11.5px] italic leading-tight opacity-75 normal-case tracking-normal">{sub}</span>}
    </span>
  );
  return (
    <Html position={position} center zIndexRange={[20, 10]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
      {onClick ? (
        <button type="button" onClick={onClick} className="min-h-11 min-w-[112px] px-2 py-1.5 grid place-items-center select-none">
          {inner}
        </button>
      ) : <div className="whitespace-nowrap select-none">{inner}</div>}
    </Html>
  );
}

/** Letters pressed into the plinth one by one. */
export function Engraving({ text, color, size = 15 }: { text: string; color: string; size?: number }) {
  return (
    <span className="engrave uppercase font-medium whitespace-nowrap" style={{ fontSize: size, letterSpacing: '0.28em', color }}>
      {text.split('').map((ch, i) => (
        <span key={i} style={{ animationDelay: `${0.25 + i * 0.07}s` }}>{ch}</span>
      ))}
    </span>
  );
}

export function ShapeScene(props: {
  step: Step; round: number; flip: boolean; store: ShapeStore; pal: Palette; dark: boolean; reduce: boolean;
  onCloser: (sign: 1 | -1) => void; onPull: (p: Pull) => void; pull: Pull | null;
  engraved: string | null; todayWord: string | null; todayFeel: Feel | null;
}) {
  const { step, round, flip, store, pal, dark, reduce, onCloser, onPull, pull, engraved, todayWord, todayFeel } = props;
  const main = () => store.main;
  const r = ROUNDS[Math.min(round, ROUNDS.length - 1)];
  const variant = (sign: 1 | -1) => () => {
    const m = store.main;
    return { ...m, [r.dim]: clamp(m[r.dim] + sign * STEP) } as Feel;
  };

  const inClose = step === 'close';
  const mainPlinthPos: V3 = inClose ? [0.56, 0, 0] : [0, 0, 0];
  const mainPlinthUp = step !== 'pull' && step !== 'shelf';
  const mainVisible = mainPlinthUp;
  const mainScale = inClose ? 0.33 : 0.42;

  const key = useRef<SpotLight>(null);
  const wash = useRef<SpotLight>(null);
  const keyTarget = useMemo(() => new Object3D(), []);
  const washTarget = useMemo(() => new Object3D(), []);
  const shelfTarget = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    // light follows the work: brighter pool, warmer when regulating, cooler when blank
    const k = key.current; if (!k) return;
    const tgtX = step === 'pull' || step === 'closer' ? 0 : inClose ? 0 : 0;
    keyTarget.position.x = damp(keyTarget.position.x, tgtX, 3, dt);
    keyTarget.position.y = damp(keyTarget.position.y, step === 'pull' || step === 'closer' ? -0.5 : 0.1, 3, dt);
    keyTarget.position.z = damp(keyTarget.position.z, step === 'pull' || step === 'closer' ? 0.7 : 0, 3, dt);
    k.angle = damp(k.angle, step === 'pull' || step === 'closer' || inClose ? 0.56 : 0.5, 3, dt);
    const boost = step === 'regulate' ? 1.12 : step === 'intro' ? 0.92 : 1;
    k.intensity = damp(k.intensity, pal.key * boost, 3, dt);
  });

  const pulls: { id: Pull; pos: V3; mode: Mode }[] = [
    { id: 'fight', pos: [-0.5, -0.2, 0], mode: 'fight' },
    { id: 'chase', pos: [0.5, -0.2, 0], mode: 'chase' },
    { id: 'hide', pos: [-0.5, -0.98, 1.45], mode: 'hide' },
    { id: 'blank', pos: [0.5, -0.98, 1.45], mode: 'blank' },
  ];
  const VX = 0.46, VY = -0.9, VZ = 1.55;
  const plus: V3 = flip ? [VX, VY, VZ] : [-VX, VY, VZ];
  const minus: V3 = flip ? [-VX, VY, VZ] : [VX, VY, VZ];
  const showVariants = step === 'closer';
  const showPulls = step === 'pull';
  const shelfOn = step === 'shelf';

  const SX = 6;
  const shelfItems: { word: string; feel: Feel; pos: V3 }[] = [
    { word: STARTING_WORDS[0], feel: SEED_SHAPES[STARTING_WORDS[0]] ?? SEED_SHAPES.frustrated, pos: [SX - 0.6, 0.62, -2.64] },
    { word: STARTING_WORDS[1], feel: SEED_SHAPES[STARTING_WORDS[1]] ?? SEED_SHAPES.lonely, pos: [SX, 0.62, -2.64] },
    { word: STARTING_WORDS[2], feel: SEED_SHAPES[STARTING_WORDS[2]] ?? SEED_SHAPES.anxious, pos: [SX + 0.6, 0.62, -2.64] },
    { word: STARTING_WORDS[3], feel: SEED_SHAPES[STARTING_WORDS[3]] ?? SEED_SHAPES.tired, pos: [SX - 0.42, -0.2, -2.64] },
  ];

  return (
    <>
      <Rig step={step} reduce={reduce} />
      <color attach="background" args={[pal.wall]} />
      <fog attach="fog" args={[pal.wall, 7, 16]} />
      <hemisphereLight args={[pal.rim, pal.floor, pal.ambient]} />
      <primitive object={keyTarget} position={[0, 0.1, 0]} />
      <primitive object={washTarget} position={[0, 1.0, -2.8]} />
      <primitive object={shelfTarget} position={[SX, 0.2, -2.4]} />
      <spotLight ref={key} position={[1.1, 5.6, 3.0]} target={keyTarget} angle={0.5} penumbra={0.9} intensity={pal.key} decay={0}
        color="#fff4e6" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <spotLight ref={wash} position={[0, 4.5, 1.5]} target={washTarget} angle={0.42} penumbra={1} intensity={pal.wash} decay={0} color="#ffeedd" />
      <spotLight position={[SX + 0.4, 3.6, 2.6]} target={shelfTarget} angle={0.5} penumbra={0.9} intensity={shelfOn ? pal.key * 0.95 : 0} decay={0} color="#fff1df"
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
      <Plinth position={mainPlinthPos} size={[inClose ? 0.8 : 1.05, 1.4, inClose ? 0.8 : 1.05]} color={pal.plinth} up={mainPlinthUp}>
        {engraved && !inClose && (
          <Html position={[0, -0.26, 0.53]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <Engraving key={engraved} text={engraved} color={pal.ink2} />
          </Html>
        )}
        {inClose && <Label position={[0, -0.22, 0.42]} color={pal.ink2}>Now</Label>}
      </Plinth>
      <Blob feel={main} position={[mainPlinthPos[0], 0, mainPlinthPos[2]]} scale={mainScale} visible={mainVisible} detail={44} seed={1.7} store={store} />

      {/* start snapshot for the close comparison */}
      <Plinth position={[-0.56, 0, 0]} size={[0.8, 1.4, 0.8]} color={pal.plinth} up={inClose}>
        {inClose && <Label position={[0, -0.22, 0.42]} color={pal.ink2}>Then</Label>}
      </Plinth>
      {store.start && <Blob feel={() => store.start ?? store.main} position={[-0.56, 0, 0]} scale={0.33} visible={inClose} detail={40} seed={1.7} store={undefined} />}

      {/* two live variants */}
      <Plinth position={[plus[0], plus[1], plus[2]]} size={[0.5, 0.5, 0.5]} color={pal.plinth} up={showVariants} />
      <Plinth position={[minus[0], minus[1], minus[2]]} size={[0.5, 0.5, 0.5]} color={pal.plinth} up={showVariants} />
      <Blob key={`p${round}`} feel={variant(1)} position={plus} scale={0.19} visible={showVariants} detail={26} seed={1.7} onPick={() => onCloser(1)} delay={0.15} />
      <Blob key={`m${round}`} feel={variant(-1)} position={minus} scale={0.19} visible={showVariants} detail={26} seed={1.7} onPick={() => onCloser(-1)} delay={0.3} />
      {showVariants && (
        <>
          <Label position={[plus[0], plus[1] - 0.24, plus[2] + 0.26]} onClick={() => onCloser(1)} color={pal.ink}>{r.plus}</Label>
          <Label position={[minus[0], minus[1] - 0.24, minus[2] + 0.26]} onClick={() => onCloser(-1)} color={pal.ink}>{r.minus}</Label>
        </>
      )}

      {/* four urges */}
      {pulls.map((p, i) => (
        <group key={p.id}>
          <Plinth position={p.pos} size={[0.56, 1.2, 0.56]} color={pal.plinth} up={showPulls} />
          <Blob feel={main} position={p.pos} scale={0.17} visible={showPulls} detail={24} seed={1.7} mode={p.mode} onPick={() => onPull(p.id)} delay={0.1 + i * 0.08} spin={false} />
          {showPulls && (() => { const meta = PULLS.find(x => x.id === p.id)!; return (
            <Label position={[p.pos[0], p.pos[1] - 0.24, p.pos[2] + 0.29]} onClick={() => onPull(p.id)} sub={meta.detail} color={pull === p.id ? pal.brass : pal.ink}>{meta.label}</Label>
          ); })()}
        </group>
      ))}

      {/* the shelf */}
      <group>
        {[0.62, -0.2].map((y, i) => (
          <mesh key={i} position={[SX, y - 0.04, -2.69]} castShadow receiveShadow>
            <boxGeometry args={[1.95, 0.08, 0.42]} />
            <meshStandardMaterial color={pal.wood} roughness={0.75} />
          </mesh>
        ))}
        {shelfItems.map((it, i) => (
          <group key={it.word}>
            <Blob feel={() => it.feel} position={it.pos} scale={0.16} visible={shelfOn} detail={22} seed={2.3 + i * 1.9} spin />
            {shelfOn && <Label position={[it.pos[0], it.pos[1] - 0.17, -2.5]} color={pal.ink2}>{it.word}</Label>}
          </group>
        ))}
        {shelfOn && todayFeel && (
          <>
            <Blob feel={() => todayFeel} position={[SX + 0.42, -0.2, -2.64]} scale={0.16} visible detail={30} seed={1.7} drop delay={0.9} store={undefined} />
            <Html position={[SX + 0.42, -0.37, -2.5]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <Engraving text={todayWord ?? 'untitled'} color={pal.brass} size={11} />
            </Html>
          </>
        )}
      </group>
    </>
  );
}
