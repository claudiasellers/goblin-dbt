import type { Camera, Object3D, PerspectiveCamera, SpotLight, Vector3 } from 'three';
import { damp } from './feel';

export type V3 = [number, number, number];
export interface Pose { pos: V3; look: V3 }

/** Ease the camera toward a pose (imperative; called from useFrame). */
export function dampCamera(camera: Camera, look: Vector3, p: Pose, lam: number, dt: number, swayX: number) {
  camera.position.x = damp(camera.position.x, p.pos[0] + swayX, lam, dt);
  camera.position.y = damp(camera.position.y, p.pos[1], lam, dt);
  camera.position.z = damp(camera.position.z, p.pos[2], lam, dt);
  look.x = damp(look.x, p.look[0], lam, dt);
  look.y = damp(look.y, p.look[1], lam, dt);
  look.z = damp(look.z, p.look[2], lam, dt);
  camera.lookAt(look);
}

/** Keep roughly the same horizontal framing on wider screens. */
export function fitFov(camera: Camera, aspect: number) {
  const cam = camera as PerspectiveCamera;
  cam.fov = aspect > 0.6 ? Math.max(24, (40 * 0.6 / aspect) * 1.3) : 40;
  cam.updateProjectionMatrix();
}

/** The key light follows the work: a lower, wider pool when the small objects are out. */
export function aimKey(k: SpotLight | null, target: Object3D, low: boolean, wide: boolean, intensity: number, dt: number) {
  if (!k) return;
  target.position.y = damp(target.position.y, low ? -0.5 : 0.1, 3, dt);
  target.position.z = damp(target.position.z, low ? 0.7 : 0, 3, dt);
  k.angle = damp(k.angle, low || wide ? 0.56 : 0.5, 3, dt);
  k.intensity = damp(k.intensity, intensity, 3, dt);
}

/** Damp a group toward a position (plinths rising and sinking). */
export function dampGroup(g: Object3D, cur: Vector3, x: number, y: number, z: number, dt: number) {
  cur.x = damp(cur.x, x, 4, dt); cur.y = damp(cur.y, y, 4, dt); cur.z = damp(cur.z, z, 4, dt);
  g.position.copy(cur);
}
