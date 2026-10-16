import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PartsOption } from '../../../data/partsContentTypes';
import { REGIONS, type RegionId } from '../../../data/bodyFigure';
import { HeatFigure, type FigureMark } from '../../checkin/body/HeatFigure';
import { linkButton, primaryButton, secondaryText } from '../../tools/oppositeAction/styles';
import { fromVec, toVec, variant } from '../../tools/findTheFeeling/shape/feel';
import { vecToSig } from '../../../lib/partFigure';
import { PartFigure } from '../PartFigure';

/**
 * Meet a part's screens (docs/design/parts.md). Presentation only: every string arrives from the page
 * (parts.json through promptCopy / stepOptions, or the person's own words); the page reports events to
 * the step machine. House chrome only: Back and Next.
 */

/** A step's question. Takes focus when its screen opens, so keyboard and screen-reader users land on it. */
export function Prompt({ children, serif = false, size = 'base' }: { children: ReactNode; serif?: boolean; size?: 'base' | 'large' }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  const cls = serif
    ? `font-serif ${size === 'large' ? 'text-3xl leading-tight' : 'text-2xl leading-snug'}`
    : 'text-lg font-medium';
  return <h2 ref={ref} tabIndex={-1} className={`${cls} text-[var(--color-text-primary)] text-balance focus:outline-none`}>{children}</h2>;
}

/** A line said after the question (serif when it is a statement to sit with). */
export function Line({ children, serif = false }: { children: ReactNode; serif?: boolean }) {
  return <p className={serif ? 'font-serif text-xl text-[var(--color-text-secondary)]' : secondaryText}>{children}</p>;
}

export function Chip({ label, pressed, onClick, own = false }: { label: ReactNode; pressed?: boolean; onClick: () => void; own?: boolean }) {
  return (
    <button type="button" aria-pressed={pressed ? 'true' : 'false'} onClick={onClick}
      className={`den-chip den-chip--small ${own ? 'font-serif' : ''}`}>{label}</button>
  );
}

/** One decision: the step's chips (and "In my words" when the step takes it). */
export function Chips({ options, onPick, picked, ownLabel, onOwn }: {
  options: readonly Pick<PartsOption, 'id' | 'label'>[]; onPick: (id: string) => void; picked?: string | null;
  ownLabel?: string; onOwn?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => <Chip key={o.id} label={o.label} pressed={picked === o.id} onClick={() => onPick(o.id)} />)}
      {ownLabel && onOwn && <Chip label={ownLabel} onClick={onOwn} />}
    </div>
  );
}

/** Quiet ways past a step ("Nowhere I can find", "Can't tell", "Not yet"). */
export function QuietOptions({ options, onPick }: { options: readonly Pick<PartsOption, 'id' | 'label'>[]; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4">
      {options.map((o) => <button key={o.id} type="button" className={linkButton} onClick={() => onPick(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1 min-h-11 px-2 -ml-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </button>
  );
}

/**
 * The person's own words: a plain field, kept as written (never linted, parsed or read back to them
 * except as their own words, in the serif). `label` is the step's own question.
 */
export function OwnWords({ label, fieldLabel, max, onDone, onBack }: {
  label: string; fieldLabel: string; max: number; onDone: (text: string) => void; onBack: () => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <Prompt>{label}</Prompt>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, max))} maxLength={max} rows={3} aria-label={fieldLabel}
        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-serif text-lg focus:ring-2 focus:ring-[var(--color-accent)]" />
      <button type="button" className={primaryButton} disabled={!text.trim()} onClick={() => onDone(text.trim())}>Next</button>
    </div>
  );
}

/** Where: one place on the heat figure; "Nowhere I can find" is a complete answer. */
export function WhereScreen({ prompt, resumeLine, quiet, onPlace, onQuiet }: {
  prompt: string; resumeLine: string | null; quiet: readonly Pick<PartsOption, 'id' | 'label'>[];
  onPlace: (place: RegionId) => void; onQuiet: (id: string) => void;
}) {
  const [place, setPlace] = useState<RegionId | null>(null);
  const marks: FigureMark[] = place ? [{ region: place, side: 'both', colour: 'var(--color-quadrant-low-unpleasant)', strength: 0.6 }] : [];
  return (
    <div className="space-y-4">
      {resumeLine && <p className={secondaryText}>{resumeLine}</p>}
      <Prompt>{prompt}</Prompt>
      <div className="mx-auto w-44"><HeatFigure marks={marks} selected={place} onPick={setPlace} /></div>
      <p className={`${secondaryText} min-h-5 text-center`} aria-live="polite">{place ? REGIONS[place].label : ''}</p>
      <button type="button" className={primaryButton} disabled={!place} onClick={() => { if (place) onPlace(place); }}>Next</button>
      <QuietOptions options={quiet} onPick={onQuiet} />
    </div>
  );
}

/**
 * Shape it: one round of two, the current shape nudged along this round's dimension. The words are
 * Find the feeling's own (`labels`: the + side first). Reports the picked shape as -1..1.
 */
export function ShapeScreen({ prompt, round, rounds, shape, labels, quiet, onShape, onQuiet }: {
  prompt: string; round: number; rounds: number; shape: readonly number[]; labels: readonly [string, string];
  quiet: readonly Pick<PartsOption, 'id' | 'label'>[]; onShape: (shape: number[]) => void; onQuiet: (id: string) => void;
}) {
  const now = fromVec(shape);
  const sides = [[variant(now, round, 1), labels[0]], [variant(now, round, -1), labels[1]]] as const;
  return (
    <div className="space-y-4">
      <Prompt>{prompt}</Prompt>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: rounds }).map((_, i) => <span key={i} className={`h-1 flex-1 rounded ${i <= round ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-border)]'}`} />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sides.map(([f, label]) => (
          <button key={label} type="button" onClick={() => onShape(toVec(f))}
            className="lift-secondary min-h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 grid place-items-center gap-1">
            <PartFigure shapeSig={vecToSig(toVec(f))} size={104} />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          </button>
        ))}
      </div>
      <QuietOptions options={quiet} onPick={onQuiet} />
    </div>
  );
}

/** Name: the person's own name for it, or a describing suggestion, or "Not yet". */
export function NameScreen({ prompt, suggestion, max, quiet, onName, onQuiet }: {
  prompt: string; suggestion: string | null; max: number; quiet: readonly Pick<PartsOption, 'id' | 'label'>[];
  onName: (name: string) => void; onQuiet: (id: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <div className="space-y-4">
      <Prompt>{prompt}</Prompt>
      <input value={name} onChange={(e) => setName(e.target.value.slice(0, max))} maxLength={max} aria-label={prompt}
        className="w-full min-h-12 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-serif text-xl focus:ring-2 focus:ring-[var(--color-accent)]" />
      {suggestion && <div className="flex flex-wrap gap-2.5"><Chip own label={suggestion} onClick={() => setName(suggestion.slice(0, max))} /></div>}
      <button type="button" className={primaryButton} disabled={!name.trim()} onClick={() => onName(name.trim())}>Next</button>
      <QuietOptions options={quiet} onPick={onQuiet} />
    </div>
  );
}
