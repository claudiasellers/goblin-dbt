import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { BlobCtl } from './blobCtl';
import type { Feel, LiveStore, UrgeMode } from './feel';

/**
 * One clay object. Springs toward whatever `feel()` returns each frame, so choices land with a
 * little overshoot. `mode` loops an urge study (fight lunges, chase reaches, hide sinks, blank greys).
 */
export function Blob3D({ feel, position, scale, visible = true, detail = 18, seed = 1, mode = null, store, onPick, drop = false, spin = true, delay = 0, reduce }: {
  feel: () => Feel; position: [number, number, number]; scale: number; visible?: boolean; detail?: number; seed?: number;
  mode?: UrgeMode; store?: LiveStore; onPick?: () => void; drop?: boolean; spin?: boolean; delay?: number; reduce: boolean;
}) {
  const [ctl] = useState(() => new BlobCtl(seed, detail, drop, position));
  useEffect(() => () => ctl.dispose(), [ctl]);
  useEffect(() => () => { if (onPick) document.body.style.cursor = ''; }, [onPick]);

  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const { camera, size } = useThree();

  useFrame((state, dt) => ctl.frame({
    elapsed: state.clock.elapsedTime, dt, feel: feel(), mode, reduce, visible, scale, position, delay, drop, spin,
    store, camera, size, outer: outer.current, inner: inner.current,
  }));

  const pick = onPick ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(); } : undefined;
  return (
    <group ref={outer} position={position}>
      <group ref={inner} scale={0.0001}>
        <mesh geometry={ctl.geo} material={ctl.mat} customDepthMaterial={ctl.depth} castShadow receiveShadow />
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
