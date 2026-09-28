import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { PCFShadowMap } from 'three';
import { Anchors, sceneLabels, type LabelSpec } from './layout3d';
import type { StageProps } from './palette';
import { Scene3D } from './Scene3D';

function Placard({ spec, anchors, pal, dark }: { spec: LabelSpec; anchors: Anchors; pal: StageProps['pal']; dark: boolean }) {
  const ref = (el: HTMLElement | null) => anchors.attach(spec.id, el);
  const base = { position: 'absolute', left: 0, top: 0, visibility: 'hidden' } as const;
  if (spec.kind === 'pick') {
    return (
      <button ref={ref} type="button" className="sr-label sr-placard-in" style={{ ...base, pointerEvents: 'auto' }}
        onClick={spec.disabled ? undefined : spec.onClick} aria-disabled={spec.disabled} aria-pressed={spec.active} data-testid={spec.testid}>
        <span className="sr-label-inner" style={{ color: spec.active ? pal.brass : pal.ink }}>
          <span className="sr-label-main">{spec.text}</span>
          {spec.sub && <span className="sr-label-sub">{spec.sub}</span>}
        </span>
      </button>
    );
  }
  if (spec.kind === 'tag') return <span ref={ref} className="sr-tag sr-placard-in" style={base}>{spec.text}</span>;
  return (
    <span ref={ref} className="sr-engrave" style={{ ...base, fontSize: spec.kind === 'fresh' ? 11 : 15, color: spec.kind === 'fresh' ? pal.brass : dark ? pal.ink : pal.ink2 }} aria-hidden>
      {spec.text.split('').map((ch, i) => <span key={i} style={{ animationDelay: `${(spec.kind === 'fresh' ? 1.3 : 0.25) + i * 0.07}s` }}>{ch}</span>)}
    </span>
  );
}

/** The WebGL gallery: one canvas for every step, plus its placards as real DOM. Lazy so the SVG fallback never loads three.js. */
export default function GLStage(props: StageProps) {
  const [anchors] = useState(() => new Anchors());
  const labels = sceneLabels(props);
  useEffect(() => { anchors.sync(labels); });
  return (
    <>
      <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 2]} camera={{ fov: 40, position: [0, 0.9, 4.9], near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ position: 'absolute', inset: 0 }} data-testid="shape-canvas">
        <Scene3D {...props} anchors={anchors} />
      </Canvas>
      <div className="sr-fill sr-none" style={{ zIndex: 20, overflow: 'hidden' }}>
        {labels.map(l => <Placard key={l.id} spec={l} anchors={anchors} pal={props.pal} dark={props.dark} />)}
      </div>
    </>
  );
}
