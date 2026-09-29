// Shared geometries, materials and textures for one Canvas. Created once, disposed on unmount.
import { createContext, useContext, useEffect, useMemo } from 'react';
import {
  CanvasTexture, CapsuleGeometry, CircleGeometry, Color, CylinderGeometry, ExtrudeGeometry, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, Shape, SphereGeometry, SRGBColorSpace, TorusGeometry,
  type BufferGeometry, type Material, type Texture, BoxGeometry, ConeGeometry, AdditiveBlending, DoubleSide, ShaderMaterial,
} from 'three';
import type { Pal } from './model';
import { R } from './model';

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!; draw(c);
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function starShape(outer: number, inner: number, n: number, jitter = 0, seed = 1) {
  const s = new Shape();
  let r = seed;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2;
    const rad = (i % 2 === 0 ? outer : inner) * (1 + (rnd() - 0.5) * jitter);
    const x = Math.cos(a) * rad * 1.25, y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

export function makeKit(pal: Pal) {
  const geos: BufferGeometry[] = [];
  const g = <T extends BufferGeometry>(x: T) => { geos.push(x); return x; };
  const mats: Material[] = [];
  const m = <T extends Material>(x: T) => { mats.push(x); return x; };
  const texs: Texture[] = [];
  const t = (x: Texture) => { texs.push(x); return x; };

  const blobTex = t(canvasTex(128, 128, c => {
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  }));
  const poolTex = t(canvasTex(128, 128, c => {
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  }));

  const boardsTex = (bright: boolean) => t(canvasTex(1024, 1024, c => {
    c.fillStyle = pal.boards; c.fillRect(0, 0, 1024, 1024);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 1024; i += 56) {
      c.fillStyle = `rgba(${bright ? '255,255,255' : '0,0,0'},${0.02 + rnd() * 0.05})`;
      c.fillRect(i, 0, 56, 1024);
      c.fillStyle = pal.boardsLine; c.fillRect(i, 0, 2, 1024);
      // staggered butt joints
      let y = rnd() * 300;
      while (y < 1024) { c.fillRect(i, y, 56, 2); y += 260 + rnd() * 380; }
    }
    // worn centre + dark rim
    const gr = c.createRadialGradient(512, 512, 60, 512, 512, 512);
    gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(0.86, 'rgba(0,0,0,0)'); gr.addColorStop(0.97, 'rgba(0,0,0,.16)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
    c.fillStyle = gr; c.fillRect(0, 0, 1024, 1024);
  }));

  const backdropTex = t(canvasTex(1024, 256, c => {
    const gr = c.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, pal.sky1); gr.addColorStop(0.75, pal.sky2); gr.addColorStop(1, pal.sky2);
    c.fillStyle = gr; c.fillRect(0, 0, 1024, 256);
    // painted hills, Monument Valley flat
    c.fillStyle = pal.hill1;
    c.beginPath(); c.moveTo(0, 256); c.lineTo(0, 175); c.bezierCurveTo(160, 110, 300, 120, 430, 175); c.bezierCurveTo(560, 140, 760, 95, 1024, 160); c.lineTo(1024, 256); c.fill();
    c.fillStyle = pal.hill2;
    c.beginPath(); c.moveTo(0, 256); c.lineTo(0, 215); c.bezierCurveTo(220, 180, 380, 200, 560, 228); c.bezierCurveTo(700, 200, 860, 190, 1024, 208); c.lineTo(1024, 256); c.fill();
    // a thin painted horizon line
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, 1024, 3);
  }));
  
  const topMat = m(new MeshStandardMaterial({ map: boardsTex(true), roughness: 0.82 }));
  const topDim = m(new MeshStandardMaterial({ map: topMat.map, roughness: 0.9, color: new Color('#b9b2a8') }));
  const drumMat = m(new MeshStandardMaterial({ color: pal.drum, roughness: 0.6, metalness: 0.05 }));
  const bandMat = m(new MeshStandardMaterial({ color: pal.band, roughness: 0.35, metalness: 0.6 }));

  const kit = {
    geos, mats, texs,
    body: g(new CapsuleGeometry(0.15, 0.32, 6, 18)),
    head: g(new SphereGeometry(0.14, 24, 18)),
    eye: g(new SphereGeometry(0.021, 8, 6)),
    arm: g(new CapsuleGeometry(0.043, 0.16, 4, 10)),
    phone: g(new BoxGeometry(0.1, 0.16, 0.022)),
    blob: g(new PlaneGeometry(1, 1)),
    top: g(new CylinderGeometry(R, R, 0.1, 96, 1)),
    drum: g(new CylinderGeometry(R + 0.04, R + 0.1, 0.32, 96, 1, true)),
    drumBase: g(new CylinderGeometry(R + 0.1, R + 0.12, 0.02, 64, 1)),
    band: g(new TorusGeometry(R + 0.045, 0.016, 8, 128)),
    backdrop: g(new CylinderGeometry(R - 0.02, R - 0.02, 1.05, 48, 1, true, Math.PI + 0.42 - 1.15, 2.3)),
    moon: g(new CircleGeometry(0.15, 40)),
    box: g(new BoxGeometry(0.21, 0.21, 0.21)),
    star: g(new ExtrudeGeometry(starShape(0.12, 0.052, 5, 0, 3), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 })),
    string: g(new CylinderGeometry(0.004, 0.004, 3, 4)),
    burst: g(new ExtrudeGeometry(starShape(0.21, 0.12, 9, 0.55, 11), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 })),
    burstIn: g(new ExtrudeGeometry(starShape(0.12, 0.07, 7, 0.5, 5), { depth: 0.04, bevelEnabled: false })),
    softBubble: g(new SphereGeometry(0.16, 20, 14)),
    cone: g((() => { const c = new ConeGeometry(1, 1, 40, 1, true); c.rotateX(-Math.PI / 2); c.translate(0, 0, 0); return c; })()),
    floor: g(new PlaneGeometry(260, 260)),
    wall: g(new PlaneGeometry(260, 60)),
    pane: g(new PlaneGeometry(1, 1)),
    plank: g(new BoxGeometry(1, 1, 1)),
    ring: g(new TorusGeometry(0.5, 0.012, 6, 64)),

    topMats: [drumMat, topMat, topMat] as Material[],
    topDimMats: [drumMat, topDim, topDim] as Material[],
    drumMat, bandMat,
    backdropMat: m(new MeshStandardMaterial({ map: backdropTex, roughness: 0.95, side: DoubleSide, emissive: new Color('#ffffff'), emissiveMap: backdropTex, emissiveIntensity: 0.12 })),
    eyeMat: m(new MeshStandardMaterial({ color: pal.eye, roughness: 0.4 })),
    phoneMat: m(new MeshStandardMaterial({ color: '#1d1a22', emissive: new Color('#bfe0ff'), emissiveIntensity: 0.9, roughness: 0.3 })),
    blobMat: m(new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, color: '#000', opacity: 0.4, polygonOffset: true, polygonOffsetFactor: -2 })),
    poolMat: m(new MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, color: pal.pool, opacity: 0, blending: AdditiveBlending })),
    poolTopMat: m(new MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, color: pal.pool, opacity: 0, blending: AdditiveBlending })),
    coneMat: m(new ShaderMaterial({
      uniforms: { uColor: { value: new Color(pal.keyColor) }, uOpacity: { value: pal.cone } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.5); float along = smoothstep(0.0, 0.25, 1.0 - vUv.y) * (0.35 + 0.65 * vUv.y);
          gl_FragColor = vec4(uColor, uOpacity * edge * along); }`,
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    })),
    moonMat: m(new MeshStandardMaterial({ color: pal.moon, emissive: new Color(pal.moon), emissiveIntensity: 0.25, roughness: 0.9 })),
    blueMat: m(new MeshStandardMaterial({ color: pal.blue, roughness: 0.55 })),
    starMat: m(new MeshStandardMaterial({ color: pal.star, emissive: new Color(pal.star), emissiveIntensity: 0.15, roughness: 0.35, metalness: 0.4 })),
    stringMat: m(new MeshBasicMaterial({ color: pal.ink2, transparent: true, opacity: 0.5 })),
    burstMat: m(new MeshStandardMaterial({ color: pal.speech, roughness: 0.5, emissive: new Color(pal.speech), emissiveIntensity: 0.15 })),
    burstInMat: m(new MeshStandardMaterial({ color: pal.speechIn, roughness: 0.6 })),
    softMat: m(new MeshStandardMaterial({ color: '#F7F0E4', emissive: new Color('#F7F0E4'), emissiveIntensity: 0.25, roughness: 0.7 })),
    floorMat: m(new MeshStandardMaterial({ color: pal.floor, roughness: 1, emissive: new Color(pal.floor), emissiveIntensity: pal.floorGlow })),
    wallMat: m(new MeshStandardMaterial({ color: pal.bg2, roughness: 1 })),
    windowMat: m(new MeshBasicMaterial({ color: pal.window })),
    windowGlowMat: m(new MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, color: pal.windowGlow, opacity: 0.35, blending: AdditiveBlending })),
    frameMat: m(new MeshStandardMaterial({ color: pal.drum, roughness: 0.8 })),
    woodMat: m(new MeshStandardMaterial({ color: pal.drum, roughness: 0.7 })),
    ringMat: m(new MeshBasicMaterial({ color: pal.ink2, transparent: true, opacity: 0.45 })),
  };
  return kit;
}
export type Kit = ReturnType<typeof makeKit>;

const KitCtx = createContext<Kit | null>(null);
export const KitProvider = KitCtx.Provider;
export function useKit() { const k = useContext(KitCtx); if (!k) throw new Error('kit'); return k; }

/** Build once per palette identity (light/dark), dispose the old one. */
export function useMakeKit(pal: Pal) {
  const kit = useMemo(() => makeKit(pal), [pal]);
  useEffect(() => () => { kit.geos.forEach(x => x.dispose()); kit.mats.forEach(x => x.dispose()); kit.texs.forEach(x => x.dispose()); }, [kit]);
  return kit;
}
