// Ported from prototypes/goblin-lab Shape: a MeshPhysicalMaterial whose vertices are displaced by the feel uniforms.
import { Color, MeshDepthMaterial, MeshPhysicalMaterial, RGBADepthPacking, Vector4 } from 'three';

// Ashima 3D simplex noise (MIT) + the displacement field that turns features into form.
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
uniform float uTime, uSharp, uSoft, uBuzz, uStill, uClench, uHollow, uHeavy, uLight, uFlinch, uSeed;
uniform vec4 uStretch;
uniform vec4 uSpikes[22]; // xyz: direction, w: height (precomputed per seed on the CPU)
float gRidge;
float smax(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(a,b,h)+k*h*(1.0-h); }
vec3 displace(vec3 n){
  float t = uTime;
  vec3 s = vec3(uSeed, uSeed*1.37, uSeed*0.71);
  float r = 1.0;
  // hand-worked clay: slow low-frequency lumps, calmer when soft or still
  float lump = snoise(n*1.25 + s + vec3(0.0, t*0.09, 0.0));
  r += lump * 0.065 * (1.0 - 0.75*uSoft) * (1.0 - 0.4*uStill);
  // spines: cones around fibonacci directions (bold, sculptural), plus a little crag from ridged noise
  float spk = 0.0;
  for (int i = 0; i < 22; i++) {
    // chord length ~ angle for the small cone we care about (cheaper than acos)
    float ang = sqrt(max(0.0, 2.0 - 2.0*dot(n, uSpikes[i].xyz)));
    float h = max(0.0, 1.0 - ang/0.36);
    spk = max(spk, h*h*uSpikes[i].w);
  }
  float crag = snoise(n*3.1 + s*1.7);
  float sh = uSharp + uFlinch*0.55;
  r += (spk*0.62 + crag*0.05) * sh;
  gRidge = spk * clamp(sh*1.6, 0.0, 1.0);
  // buzz: fast grain + pulsing
  r += snoise(n*4.5 + vec3(t*7.0, -t*6.0, t*5.0)) * 0.035 * uBuzz;
  r += sin(t*21.0 + n.y*3.0) * 0.018 * uBuzz;
  // clench: dense fine grain
  r += snoise(n*9.0 + s*4.0) * 0.014 * uClench;
  // hollow: a dent pressed into one side, and it sags inward
  vec3 dentDir = normalize(vec3(0.3, 0.45, 0.85));
  float d = dot(n, dentDir);
  r -= uHollow * 0.5 * smoothstep(0.25, 0.97, d);
  r *= 1.0 - 0.26*uClench;
  vec3 q = n * r;
  q.y *= 1.0 - 0.14*uHollow;
  // weight: squash, bulge at base, flat bottom. light: taller, lifted
  q.y *= 1.0 - 0.3*uHeavy + 0.1*uLight;
  float base = smoothstep(0.35, -1.0, n.y);
  q.xz *= 1.0 + uHeavy*0.38*base - 0.05*uLight;
  q.y = mix(q.y, smax(q.y, -0.58, 0.14), uHeavy);
  // stretch toward a direction (reaching, clinging)
  vec3 sd = normalize(uStretch.xyz + vec3(1e-5));
  float along = max(dot(n, sd), 0.0);
  q += sd * pow(along, 3.0) * uStretch.w;
  q *= 1.0 - 0.12*uStretch.w*(1.0-along);
  return q;
}
`;

export type BlobUniforms = {
  uTime: { value: number }; uSharp: { value: number }; uSoft: { value: number }; uBuzz: { value: number }; uStill: { value: number };
  uClench: { value: number }; uHollow: { value: number }; uHeavy: { value: number }; uLight: { value: number };
  uFlinch: { value: number }; uSeed: { value: number }; uStretch: { value: Vector4 }; uSpikes: { value: Vector4[] };
  uHeatGlow: { value: number }; uHotCol: { value: Color }; uGrey: { value: number };
};

/** Fibonacci-sphere spine directions and heights for a seed (same field the prototype computed per vertex). */
function spikes(seed: number): Vector4[] {
  const out: Vector4[] = [];
  for (let i = 0; i < 22; i++) {
    const fi = i + 0.5;
    const phi = Math.acos(1 - (2 * fi) / 22);
    const th = 2.39996323 * fi + seed * 1.3;
    const fr = fi * 0.618 + seed;
    out.push(new Vector4(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th), 0.75 + 0.5 * (fr - Math.floor(fr))));
  }
  return out;
}

export function makeBlobMaterial(seed: number) {
  const uniforms: BlobUniforms = {
    uTime: { value: 0 }, uSharp: { value: 0 }, uSoft: { value: 0 }, uBuzz: { value: 0 }, uStill: { value: 0 },
    uClench: { value: 0 }, uHollow: { value: 0 }, uHeavy: { value: 0 }, uLight: { value: 0 }, uFlinch: { value: 0 },
    uSeed: { value: seed }, uStretch: { value: new Vector4(0, 0, 1, 0) }, uSpikes: { value: spikes(seed) },
    uHeatGlow: { value: 0 }, uHotCol: { value: new Color('#ff5a1a') }, uGrey: { value: 0 },
  };
  const mat = new MeshPhysicalMaterial({
    color: '#b8aea2', roughness: 0.62, metalness: 0,
    clearcoat: 0.25, clearcoatRoughness: 0.55,
    sheen: 0.5, sheenRoughness: 0.7, sheenColor: new Color('#ffffff'),
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${NOISE}\nvarying float vRidge;\nvarying float vDent;`)
      .replace('#include <beginnormal_vertex>', /* glsl */ `
        vec3 n0 = normalize(position);
        vec3 up = abs(n0.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
        vec3 tg = normalize(cross(n0, up));
        vec3 bt = cross(n0, tg);
        float eps = 0.012;
        vec3 dispPos = displace(n0);
        float ridge0 = gRidge;
        vec3 pA = displace(normalize(n0 + tg*eps));
        vec3 pB = displace(normalize(n0 + bt*eps));
        vec3 objectNormal = normalize(cross(pA - dispPos, pB - dispPos));
        if (dot(objectNormal, dispPos) < 0.0) objectNormal = -objectNormal;
        vRidge = ridge0;
        vDent = uHollow * smoothstep(0.35, 0.97, dot(n0, normalize(vec3(0.3,0.45,0.85))));
      `)
      .replace('#include <begin_vertex>', 'vec3 transformed = dispPos;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uHeatGlow; uniform vec3 uHotCol; uniform float uGrey;\nvarying float vRidge;\nvarying float vDent;`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum*0.85), uGrey);
        diffuseColor.rgb *= 1.0 - vDent*0.35;`)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += uHotCol * uHeatGlow * (0.12 + vRidge*1.5) * (1.0 - uGrey);`);
  };
  mat.customProgramCacheKey = () => 'shape-blob-v2';

  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  depth.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = displace(normalize(position));');
  };
  depth.customProgramCacheKey = () => 'shape-blob-depth-v2';
  return { mat, depth, uniforms };
}
