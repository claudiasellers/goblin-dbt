import type { CSSProperties, ReactNode } from 'react';
import type { Step } from '../../../../lib/findTheFeelingFlow';
import { variant } from './feel';
import { SHELF_SLOTS, type Palette, type StageItem, type StageProps } from './palette';
import { SvgBlob } from './SvgBlob';

/** Fraction of the blob box above its ground line (SvgBlob: (HALF + GROUND) / (2 * HALF)). */
const ABOVE = 0.828;

interface Anchor { x: number; y: number; size: string; show: boolean }
const HIGH: Anchor = { x: 50, y: 25, size: 'min(36vw,150px)', show: true };
const ANCHORS: Record<Step, Anchor> = {
  intro: { x: 50, y: 42, size: 'min(74vw,320px)', show: true },
  find: { x: 50, y: 40, size: 'min(52vw,230px)', show: true },
  pull: { x: 50, y: 118, size: 'min(40vw,160px)', show: false },
  regulate: { x: 50, y: 60, size: 'min(78vw,340px)', show: true },
  orient: HIGH,
  word: { x: 50, y: 46, size: 'min(62vw,270px)', show: true },
  setOff: { x: 50, y: 22, size: 'min(30vw,120px)', show: true },
  close: { x: 70, y: 50, size: 'min(38vw,165px)', show: true },
  next: HIGH,
  collection: { x: 50, y: 118, size: 'min(40vw,160px)', show: false },
  handoff: { x: 50, y: 46, size: 'min(62vw,270px)', show: true },
};

function Engrave({ text, color, size, delay = 0.25 }: { text: string; color: string; size: number; delay?: number }) {
  return (
    <span className="sr-engrave" style={{ fontSize: size, color }}>
      {text.split('').map((ch, i) => <span key={i} style={{ animationDelay: `${delay + i * 0.07}s` }}>{ch}</span>)}
    </span>
  );
}

function Pedestal({ x, y, size, pal, reduce, children, label, style }: {
  x: number; y: number; size: string; pal: Palette; reduce: boolean; children: ReactNode; label?: ReactNode; style?: CSSProperties;
}) {
  return (
    <div className={`sr-ped ${reduce ? '' : 'sr-ped-move'}`} style={{ left: `${x}%`, top: `${y}%`, width: size, ...style }}>
      <div className="sr-plinth" style={{ width: '62%' }}>
        <div className="sr-plinth-top" style={{ background: `color-mix(in oklab, ${pal.plinth} 86%, white)` }} />
        <div className="sr-plinth-body" style={{ background: `linear-gradient(to bottom, ${pal.plinth}, color-mix(in oklab, ${pal.plinth} 80%, black))` }} />
        {label && <div className="sr-plinth-label">{label}</div>}
      </div>
      <div className="sr-ped-obj" style={{ transform: `translateY(-${ABOVE * 100}%)` }}>{children}</div>
    </div>
  );
}

/** SVG stand-in for the WebGL gallery: same objects, same picks, drawn flat. */
export function Stage2D(props: StageProps) {
  const { step, pal, dark, reduce, store, round, flip, roundDim, roundLabels, onCloser, roundBusy, urges, picked, onPull, thenFeel, thenLabel, nowLabel, engraved, shelf, fresh } = props;
  const a = ANCHORS[step];
  const main = () => store.main;
  const floor = dark ? 'rgba(0,0,0,.3)' : 'rgba(60,40,20,.09)';

  const sides: { sign: 1 | -1; x: number; label: string }[] = [
    { sign: 1, x: flip ? 74 : 26, label: roundLabels[0] },
    { sign: -1, x: flip ? 26 : 74, label: roundLabels[1] },
  ];
  const items: (StageItem & { fresh?: boolean })[] = fresh ? [...shelf.slice(-(SHELF_SLOTS - 1)), { ...fresh, fresh: true }] : shelf.slice(-SHELF_SLOTS);
  const rows = Array.from({ length: Math.ceil(items.length / 3) }, (_, r) => items.slice(r * 3, r * 3 + 3));

  return (
    <div className="sr-fill" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', background: `linear-gradient(to bottom, transparent, ${floor})` }} />

      {/* main object */}
      <Pedestal x={a.x} y={a.show ? a.y : 118} size={a.size} pal={pal} reduce={reduce} style={{ opacity: a.show ? 1 : 0 }}
        label={step === 'close' ? <span className="sr-label-main" style={{ color: pal.ink }}>{nowLabel}</span>
          : engraved && a.show ? <Engrave key={engraved} text={engraved} color={dark ? pal.ink : pal.ink2} size={14} /> : undefined}>
        <SvgBlob feel={main} store={store} reduce={reduce} />
      </Pedestal>

      {step === 'close' && thenFeel && (
        <Pedestal x={30} y={50} size="min(38vw,165px)" pal={pal} reduce={reduce} label={<span className="sr-label-main" style={{ color: pal.ink }}>{thenLabel}</span>}>
          <SvgBlob feel={() => thenFeel} reduce={reduce} />
        </Pedestal>
      )}

      {step === 'find' && sides.map(s => (
        <div key={`${round}${s.sign}`} className="sr-variant" style={{ left: `${s.x}%` }}>
          <button type="button" onClick={() => onCloser(s.sign)} aria-disabled={roundBusy} data-testid={s.sign > 0 ? 'round-plus' : 'round-minus'} className="sr-label" style={{ maxWidth: 'none' }}>
            <span className="sr-variant-obj"><SvgBlob feel={() => variant(store.main, roundDim, s.sign)} reduce={reduce} delay={s.sign > 0 ? 0.1 : 0.25} /></span>
            <span className="sr-label-main" style={{ color: pal.ink, minHeight: 28, display: 'grid', placeItems: 'center' }}>{s.label}</span>
          </button>
        </div>
      ))}

      {step === 'pull' && (
        <div className="sr-urges">
          {urges.map((u, i) => (
            <button key={u.id} type="button" onClick={() => onPull(u.id)} aria-disabled={!!picked} aria-pressed={picked === u.id} data-testid={`urge-${u.id}`}
              className="sr-label" style={{ maxWidth: 'none', color: picked === u.id ? pal.brass : pal.ink }}>
              <span className="sr-urge-obj"><SvgBlob feel={main} mode={u.id} reduce={reduce} delay={0.1 + i * 0.08} /></span>
              <span className="sr-label-main">{u.label}</span>
              <span className="sr-label-sub">{u.sub}</span>
            </button>
          ))}
        </div>
      )}

      {step === 'collection' && (
        <div className="sr-shelf">
          {rows.map((row, r) => (
            <div key={r} style={{ marginBottom: 26 }}>
              <div className="sr-shelf-row">
                {row.map(it => (
                  <div key={it.key} className="sr-shelf-item">
                    <span className="sr-shelf-obj"><SvgBlob feel={() => it.feel} reduce={reduce} drop={!!it.fresh} delay={it.fresh ? 0.8 : 0} /></span>
                  </div>
                ))}
              </div>
              <div className="sr-shelf-board" style={{ background: pal.wood }} />
              <div className="sr-shelf-names">
                {row.map(it => (
                  <span key={it.key}>{it.fresh ? <Engrave text={it.name} color={pal.brass} size={10.5} delay={1.3} /> : <span className="sr-tag">{it.name}</span>}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
