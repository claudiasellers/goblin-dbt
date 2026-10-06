/**
 * Dev-only harness for the parts proposal (docs/design/parts.md): Meet a part, the den, the part card
 * and a trail offer, in the app's own rooms, chips, Shape object (SvgBlob), heat figure and P2 overlay.
 * Fixture content only (dev/parts-fixture.ts, draft copy); no Firebase, no graph. Not part of the app build.
 *   npm run dev, then open http://localhost:5173/dev/parts.html
 *   or: npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 * URL params: ?view=meet|den|card|offer &move=hide|chase|hit_back|keep_the_peace|turn_on_myself
 *   &palette=velvet|dusk|tinted|pastel|pastel-mix|daylight &theme=dark|light
 */
import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import fixture from '../tests/fixtures/capacity-content.json';
import type { CapacityContent } from '../src/data/capacityTypes';
import { BandProvider } from '../src/contexts/BandContext';
import { TooMuchLink } from '../src/components/capacity/TooMuchLink';
import { HeatFigure, type FigureMark } from '../src/components/checkin/body/HeatFigure';
import { REGIONS, type RegionId } from '../src/data/bodyFigure';
import { SvgBlob } from '../src/components/tools/findTheFeeling/shape/SvgBlob';
import { DIMS, fromVec, variant, type Feel } from '../src/components/tools/findTheFeeling/shape/feel';
import {
  AGES, BY_MOVE, CAN_NOW, CLOSE, FEEL_TOWARD, LIKES, MOVES, OFFER, PARTS, PROMPTS, SNAPSHOTS, UNBLEND, UPDATE,
  type ExamplePart, type MoveId, type Option, type Quadrant,
} from './parts-fixture';

const q = new URLSearchParams(location.search);
const ROOMS: [string, 'dark' | 'light'][] = [['velvet', 'dark'], ['dusk', 'dark'], ['tinted', 'light'], ['pastel', 'light'], ['pastel-mix', 'light'], ['daylight', 'light']];
const startRoom = q.get('palette') || 'velvet';
document.documentElement.dataset.palette = startRoom;
document.documentElement.dataset.theme = q.get('theme') || (ROOMS.find((r) => r[0] === startRoom)?.[1] ?? 'dark');
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const capacity = fixture as unknown as CapacityContent;
const HUE: Record<Quadrant, string> = {
  hu: 'var(--color-quadrant-high-unpleasant)', hp: 'var(--color-quadrant-high-pleasant)',
  lu: 'var(--color-quadrant-low-unpleasant)', lp: 'var(--color-quadrant-low-pleasant)',
};
const SHAPE_PAIRS: [string, string][] = [['Sharp', 'Soft'], ['Hot', 'Cool'], ['Heavy', 'Light'], ['Buzzing', 'Still'], ['Clenched', 'Hollow']];

/* ───────── small shared pieces, in the app's own classes ───────── */

function Chip({ label, on, onClick, own }: { label: string; on?: boolean; onClick: () => void; own?: boolean }) {
  return (
    <button type="button" aria-pressed={on ? 'true' : 'false'} onClick={onClick}
      className={`den-chip den-chip--small ${own ? 'opacity-80 italic' : ''}`}>{label}</button>
  );
}
function Chips({ options, onPick, own, picked }: { options: Option[]; onPick: (o: Option) => void; own?: () => void; picked?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => <Chip key={o.id} label={o.label} on={picked === o.id} onClick={() => onPick(o)} />)}
      {own && <Chip label={PROMPTS.ownWords} own onClick={own} />}
    </div>
  );
}
function Primary({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="lift-primary w-full min-h-12 rounded-2xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-semibold disabled:opacity-40">{children}</button>
  );
}
function TextBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-11 text-sm underline underline-offset-4 text-[var(--color-text-secondary)]">{children}</button>;
}
function Track({ at, total }: { at: number; total: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => <span key={i} className={`h-1 flex-1 rounded ${i < at ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-border)]'}`} />)}
    </div>
  );
}
function Blob({ feel, size = 120, className = '' }: { feel: Feel; size?: number; className?: string }) {
  const ref = useRef(feel);
  ref.current = feel;
  return <div style={{ width: size, height: size }} className={className}><SvgBlob feel={() => ref.current} reduce={reduce} className="block w-full h-full overflow-visible" /></div>;
}
function OwnWords({ onDone }: { onDone: (text: string) => void }) {
  const [t, setT] = useState('');
  return (
    <div className="space-y-3">
      <textarea value={t} onChange={(e) => setT(e.target.value.slice(0, 140))} rows={3} placeholder="In your own words"
        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] font-serif text-lg" />
      <Primary disabled={!t.trim()} onClick={() => onDone(t.trim())}>Continue</Primary>
    </div>
  );
}

/* ───────── Meet a part ───────── */

type Step = 'find' | 'where' | 'shape' | 'age' | 'young' | 'voice' | 'feel' | 'unblend' | 'unblendEnd' | 'nothing' | 'job' | 'likes'
  | 'fear' | 'stop' | 'update' | 'canNow' | 'thank' | 'rather' | 'name' | 'keep' | 'tender' | 'close' | 'done';
const TRACK: Partial<Record<Step, number>> = { find: 1, where: 2, shape: 3, age: 3, young: 3, voice: 3, feel: 4, unblend: 4, job: 5, likes: 5, fear: 6, stop: 6, update: 7, canNow: 7, thank: 8, rather: 8, name: 9, keep: 9, tender: 8, close: 10 };

interface Session {
  move: MoveId; place: RegionId | null; shape: Feel; ageId?: string; voiceId?: string; ownVoice?: string;
  feelTowardIds: string[]; steppedBack: number; jobId?: string; ownJob?: string; likesId?: string;
  fearId?: string; ownFear?: string; updateId?: string; canNowId?: string; ratherId?: string; name?: string;
  tender: boolean; danger: boolean; stopReason: 'tender' | 'own_words' | 'worried_part' | 'nothing' | null; kept: boolean | null; closeId?: string;
}

function MeetAPart({ initialMove, onLog }: { initialMove: MoveId; onLog: (x: unknown) => void }) {
  const [step, setStep] = useState<Step>('find');
  const [round, setRound] = useState(0);
  const [ownFor, setOwnFor] = useState<null | 'voice' | 'job' | 'fear'>(null);
  const [s, setS] = useState<Session>({
    move: initialMove, place: null, shape: fromVec([0, 0, 0, 0, 0]), feelTowardIds: [], steppedBack: 0,
    tender: false, danger: false, stopReason: null, kept: null,
  });
  const set = (p: Partial<Session>) => setS((x) => ({ ...x, ...p }));
  const move = MOVES[s.move];
  const chips = BY_MOVE[s.move];
  const safety = !!move.safetyLine || s.danger;
  const go = (st: Step) => { setOwnFor(null); setStep(st); };
  const restart = () => { setStep('find'); setRound(0); setS({ move: initialMove, place: null, shape: fromVec([0, 0, 0, 0, 0]), feelTowardIds: [], steppedBack: 0, tender: false, danger: false, stopReason: null, kept: null }); };

  useEffect(() => {
    if (step !== 'done') return;
    const log = {
      PartSession: {
        layer: 'log', trailheadKind: 'move', moveId: s.move, place: s.place, shape: [s.shape.sharp, s.shape.heat, s.shape.weight, s.shape.buzz, s.shape.clench].map((n) => +n.toFixed(2)),
        ageId: s.ageId, voiceId: s.voiceId, ownVoice: s.ownVoice, feelTowardIds: s.feelTowardIds, steppedBack: s.steppedBack,
        jobId: s.jobId, ownJob: s.ownJob, fearId: s.fearId, ownFear: s.ownFear, stopReason: s.stopReason,
      },
      ToolSession: { layer: 'log', toolId: 'meet-a-part', closeKind: 'orienting', thenVsNow: s.closeId ?? null },
      keepPart: s.kept ? { layer: 'profile (on yes only)', name: s.name ?? null, tender: s.tender, moves: [s.move], places: s.place ? [s.place] : [], jobIds: s.jobId ? [s.jobId] : [], fearIds: s.fearId ? [s.fearId] : [], preferredRoleIds: s.ratherId ? [s.ratherId] : [] } : null,
      followUp: s.kept ? { type: 'part_checkback', due: 'tomorrow' } : null,
    };
    onLog(log);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterFeel = (o: Option) => {
    const ids = [...s.feelTowardIds, o.id];
    if (o.id === 'nothing') { set({ feelTowardIds: ids, stopReason: 'nothing' }); return go('nothing'); }
    if (o.selfLike === false) {
      const n = s.steppedBack + 1;
      set({ feelTowardIds: ids, steppedBack: n });
      return go(n >= 2 ? 'unblendEnd' : 'unblend');
    }
    set({ feelTowardIds: ids });
    go('job');
  };
  const afterFear = (o: Option | null, own?: string) => {
    if (own !== undefined) { set({ ownFear: own, stopReason: 'own_words' }); return go('stop'); }
    if (!o) return;
    if (o.flag === 'tender') { set({ fearId: o.id, stopReason: 'tender' }); return go('stop'); }
    if (o.flag === 'danger') { set({ fearId: o.id, danger: true }); return go('thank'); }
    set({ fearId: o.id });
    go(safety ? 'thank' : 'update');
  };

  const body = (): ReactNode => {
    if (ownFor) {
      return (<>
        <p className="text-lg font-medium">{ownFor === 'voice' ? PROMPTS.voice : ownFor === 'job' ? PROMPTS.job : PROMPTS.fear}</p>
        <OwnWords onDone={(t) => {
          if (ownFor === 'voice') { set({ ownVoice: t }); go('feel'); }
          else if (ownFor === 'job') { set({ ownJob: t }); go('likes'); }
          else afterFear(null, t);
        }} />
      </>);
    }
    switch (step) {
      case 'find': return (<>
        <p className="text-lg font-medium">{PROMPTS.find}</p>
        <div className="flex flex-wrap gap-2.5">
          <Chip label={`The pull to ${move.label.toLowerCase()}`} on onClick={() => go('where')} />
          {PARTS.filter((p) => !p.tender).slice(0, 2).map((p) => <Chip key={p.id} label={p.name} onClick={() => { set({ move: p.move }); go('where'); }} />)}
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)]">Or start from another move:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MOVES) as MoveId[]).filter((m) => m !== s.move).map((m) => <Chip key={m} label={MOVES[m].label} onClick={() => { set({ move: m }); }} />)}
        </div>
      </>);
      case 'where': {
        const marks: FigureMark[] = s.place ? [{ region: s.place, side: 'both', colour: 'var(--color-quadrant-low-unpleasant)', strength: 0.6 }] : [];
        return (<>
          <p className="text-lg font-medium">{PROMPTS.where}</p>
          <div className="mx-auto w-44"><HeatFigure marks={marks} selected={s.place} onPick={(r) => set({ place: r })} /></div>
          <p className="text-sm text-[var(--color-text-secondary)] min-h-5">{s.place ? `My ${REGIONS[s.place].label.toLowerCase()}` : 'Touch and drag to a place, then lift.'}</p>
          <Primary disabled={!s.place} onClick={() => go('shape')}>Continue</Primary>
          <TextBtn onClick={() => { set({ place: null }); go('shape'); }}>{PROMPTS.whereNone}</TextBtn>
        </>);
      }
      case 'shape': {
        const a = variant(s.shape, round, 1), b = variant(s.shape, round, -1);
        const next = (f: Feel) => { set({ shape: f }); if (round + 1 >= DIMS.length) go('age'); else setRound(round + 1); };
        return (<>
          <p className="text-lg font-medium">{PROMPTS.shape}</p>
          <p className="text-sm text-[var(--color-text-tertiary)]">{['I', 'II', 'III', 'IV', 'V'][round]} of V</p>
          <div className="grid grid-cols-2 gap-3">
            {[[a, SHAPE_PAIRS[round][0]], [b, SHAPE_PAIRS[round][1]]].map(([f, label]) => (
              <button key={label as string} type="button" onClick={() => next(f as Feel)}
                className="lift-secondary rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 grid place-items-center gap-1">
                <Blob feel={f as Feel} size={110} /><span className="text-sm font-medium">{label as string}</span>
              </button>
            ))}
          </div>
          <TextBtn onClick={() => next(s.shape)}>{PROMPTS.shapeCantTell}</TextBtn>
        </>);
      }
      case 'age': return (<>
        <div className="flex justify-center"><Blob feel={s.shape} size={120} /></div>
        <p className="text-lg font-medium">{PROMPTS.age}</p>
        <Chips options={AGES} onPick={(o) => { set({ ageId: o.id }); go(o.id === 'little' ? 'young' : 'voice'); }} />
      </>);
      case 'young': return (<>
        <p className="font-serif text-2xl leading-snug">{PROMPTS.youngOffer}</p>
        <Primary onClick={() => { set({ tender: true }); go('tender'); }}>Yes, keep it gentle</Primary>
        <TextBtn onClick={() => go('voice')}>No, carry on</TextBtn>
      </>);
      case 'voice': return (<>
        <p className="text-lg font-medium">{PROMPTS.voice}</p>
        <Chips options={[...chips.voice, { id: 'none', label: 'Nothing' }]} onPick={(o) => { set({ voiceId: o.id }); go('feel'); }} own={() => setOwnFor('voice')} />
      </>);
      case 'feel': return (<>
        <div className="flex justify-center"><Blob feel={s.shape} size={100} /></div>
        <p className="text-lg font-medium">{PROMPTS.feel}</p>
        <Chips options={FEEL_TOWARD.filter((o) => o.selfLike === true)} onPick={afterFeel} />
        <Chips options={FEEL_TOWARD.filter((o) => o.selfLike === false)} onPick={afterFeel} />
        <Chips options={FEEL_TOWARD.filter((o) => o.selfLike == null)} onPick={afterFeel} />
      </>);
      case 'unblend': return (<>
        <p className="font-serif text-2xl leading-snug">{PROMPTS.unblend}</p>
        <Chips options={UNBLEND} onPick={() => go('feel')} />
      </>);
      case 'unblendEnd': return (<>
        <p className="font-serif text-2xl leading-snug">{PROMPTS.unblendEnd}</p>
        <p className="text-base">{PROMPTS.unblendLater}</p>
        <Primary onClick={() => { set({ stopReason: 'worried_part' }); onLog({ PartCandidate: { layer: 'log, on yes', origin: 'worried_part' } }); go('close'); }}>Yes, another time</Primary>
        <TextBtn onClick={() => { set({ stopReason: 'worried_part' }); go('close'); }}>No</TextBtn>
      </>);
      case 'nothing': return (<>
        <p className="font-serif text-2xl leading-snug">{PROMPTS.nothing}</p>
        <div className="flex flex-wrap gap-2.5"><button type="button" className="den-chip den-chip--small den-chip--dt" onClick={() => onLog({ handoff: '5-4-3-2-1' })}>5-4-3-2-1</button></div>
        <Primary onClick={() => go('thank')}>Continue</Primary>
      </>);
      case 'job': return (<>
        <p className="text-lg font-medium">{PROMPTS.job}</p>
        <Chips options={chips.job} onPick={(o) => { set({ jobId: o.id }); go('likes'); }} own={() => setOwnFor('job')} />
      </>);
      case 'likes': return (<>
        <p className="text-lg font-medium">{PROMPTS.likes}</p>
        <Chips options={LIKES} onPick={(o) => { set({ likesId: o.id }); go('fear'); }} />
      </>);
      case 'fear': return (<>
        <p className="text-lg font-medium">{PROMPTS.fear}</p>
        <Chips options={chips.fear} onPick={(o) => afterFear(o)} own={() => setOwnFor('fear')} />
        <p className="text-xs text-[var(--color-text-tertiary)]">Harness note: some chips are flagged tender or danger; own words always take the careful branch.</p>
      </>);
      case 'stop': return (<>
        <p className="font-serif text-3xl leading-tight">{PROMPTS.stopTitle}</p>
        <p className="font-serif text-xl text-[var(--color-text-secondary)]">{PROMPTS.stopBody}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{PROMPTS.stopTherapist}</p>
        <Primary onClick={() => go('thank')}>Thank it</Primary>
        <TextBtn onClick={() => onLog({ handoff: 'body primitive (P2)' })}>Something for my body first</TextBtn>
      </>);
      case 'update': return (<>
        <p className="text-lg font-medium">{PROMPTS.update}</p>
        <Chips options={UPDATE} onPick={(o) => { set({ updateId: o.id }); go(o.id === 'no' ? 'canNow' : 'thank'); }} />
      </>);
      case 'canNow': return (<>
        <p className="text-lg font-medium">{PROMPTS.updateShow}</p>
        <Chips options={CAN_NOW} onPick={(o) => { set({ canNowId: o.id }); go('thank'); }} />
      </>);
      case 'thank': return <Thank feel={s.shape} label={PROMPTS.thank} onDone={() => go(s.stopReason || safety ? 'name' : 'rather')} />;
      case 'tender': return <Thank feel={fromVec([-0.8, 0.1, -0.4, -0.8, -0.2])} wrapped label={PROMPTS.tender} sub={PROMPTS.tenderSub} onDone={() => go('name')} />;
      case 'rather': return (<>
        <p className="text-lg font-medium">{PROMPTS.rather}</p>
        <Chips options={[...chips.rather, { id: 'unsure', label: 'Not sure yet' }]} onPick={(o) => { set({ ratherId: o.id }); go('name'); }} />
      </>);
      case 'name': return <NameStep suggestion={s.tender ? 'the little one' : move.nameHint} onDone={(n) => { set({ name: n }); go('keep'); }} />;
      case 'keep': return (<>
        <div className="flex items-center gap-4"><Blob feel={s.shape} size={72} /><p className="font-serif text-2xl">{s.name || 'This part'}</p></div>
        <p className="text-lg font-medium">{PROMPTS.keep}</p>
        <Primary onClick={() => { set({ kept: true }); go('close'); }}>Yes, keep it</Primary>
        <TextBtn onClick={() => { set({ kept: false }); go('close'); }}>Not now</TextBtn>
      </>);
      case 'close': return (<>
        <p className="text-lg font-medium">{PROMPTS.close}</p>
        <div className="grid gap-2">{CLOSE.map((o) => <button key={o.id} type="button" onClick={() => { set({ closeId: o.id }); go('done'); }} className="lift-secondary min-h-12 rounded-xl border border-[var(--color-border)] text-left px-4">{o.label}</button>)}</div>
        <TextBtn onClick={() => go('done')}>Skip</TextBtn>
      </>);
      case 'done': return (<>
        <p className="font-serif text-2xl">Noted.</p>
        <p className="text-sm text-[var(--color-text-secondary)]">What would be saved is in the log below. Profile writes happen only when the person chose to keep the part.</p>
        <TextBtn onClick={restart}>Start again</TextBtn>
      </>);
    }
  };

  return (
    <div className="space-y-5">
      {step !== 'done' && <Track at={TRACK[step] ?? 1} total={10} />}
      {safety && !['find', 'done'].includes(step) && (
        <p role="note" className="text-sm rounded-xl border border-[var(--color-danger)] px-3 py-2 text-[var(--color-text-secondary)]">{PROMPTS.dangerNote}</p>
      )}
      <div className="space-y-4">{body()}</div>
      {!['done'].includes(step) && (
        <TooMuchLink host="meet-a-part" blank={false} onResult={(r) => onLog({ tooMuch: r })}
          resume={() => ({ hostSessionId: '00000000-0000-4000-8000-0000000000aa', stepId: step, draft: {} })} />
      )}
    </div>
  );
}

function NameStep({ suggestion, onDone }: { suggestion: string; onDone: (n: string) => void }) {
  const [n, setN] = useState('');
  return (<>
    <p className="text-lg font-medium">{PROMPTS.name}</p>
    <input value={n} onChange={(e) => setN(e.target.value.slice(0, 40))} placeholder={suggestion}
      className="w-full min-h-12 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] font-serif text-xl" />
    <div className="flex flex-wrap gap-2.5"><Chip label={suggestion} onClick={() => setN(suggestion)} /></div>
    <Primary disabled={!n.trim()} onClick={() => onDone(n.trim())}>Continue</Primary>
    <TextBtn onClick={() => onDone('')}>Not yet</TextBtn>
  </>);
}

/** The flow's one earned moment: hold, and the lamp's light reaches the figure. */
function Thank({ feel, label, sub, wrapped, onDone }: { feel: Feel; label: string; sub?: string; wrapped?: boolean; onDone: () => void }) {
  const [p, setP] = useState(0);
  const [lit, setLit] = useState(false);
  const raf = useRef(0);
  const start = useRef(0);
  const HOLD = reduce ? 1 : 1400;
  const down = () => {
    if (lit) return;
    start.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / HOLD);
      setP(t);
      if (t < 1) raf.current = requestAnimationFrame(tick); else setLit(true);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const up = () => { if (!lit) { cancelAnimationFrame(raf.current); setP(0); } };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (<>
    <p className={sub ? 'font-serif text-3xl leading-tight' : 'text-lg font-medium'}>{label}</p>
    {sub && <p className="font-serif text-xl text-[var(--color-text-secondary)]">{sub}</p>}
    <div className="relative h-56 rounded-3xl overflow-hidden bg-[var(--color-bg-secondary)]" aria-hidden="true">
      <div className="absolute rounded-full" style={{
        left: '22%', top: '50%', width: lit ? 520 : 160, height: lit ? 520 : 160, transform: 'translate(-50%,-50%)',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent 68%)',
        transition: reduce ? 'none' : 'width 1.2s cubic-bezier(.2,.7,.2,1), height 1.2s cubic-bezier(.2,.7,.2,1)',
      }} />
      <div className="absolute" style={{ left: '72%', top: '50%', transform: 'translate(-50%,-50%)', opacity: lit ? 1 : 0.4, transition: reduce ? 'none' : 'opacity 1.2s' }}>
        {wrapped
          ? <div className="w-20 h-20 rounded-t-full rounded-b-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]" />
          : <Blob feel={feel} size={96} />}
      </div>
    </div>
    {lit
      ? <Primary onClick={onDone}>Continue</Primary>
      : <button type="button" onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } }}
          onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') up(); }}
          className="lift-primary relative w-full min-h-12 rounded-2xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-semibold overflow-hidden select-none touch-none">
          <span className="absolute inset-0 bg-white/30 origin-left" style={{ transform: `scaleX(${p})` }} />
          <span className="relative">{PROMPTS.hold}</span>
        </button>}
  </>);
}

/* ───────── Part card (Me) ───────── */

function PartCard({ part }: { part: ExamplePart }) {
  const feel = useMemo(() => fromVec(part.shape), [part]);
  if (part.tender) {
    return (
      <article className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-t-full rounded-b-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]" aria-hidden="true" />
          <div><p className="font-serif text-2xl leading-tight">{part.name}</p><p className="text-sm text-[var(--color-text-secondary)]">A tender part</p></div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">Here you only keep it company. The app asks it nothing.</p>
        <p className="font-serif text-lg">{PROMPTS.tender} {PROMPTS.tenderSub}</p>
      </article>
    );
  }
  const Row = ({ k, v, serif }: { k: string; v: string; serif?: boolean }) => (
    <div className="border-t border-[var(--color-border-subtle)] pt-2.5"><p className="text-xs text-[var(--color-text-tertiary)]">{k}</p><p className={serif ? 'font-serif text-lg' : 'text-[15px]'}>{v}</p></div>
  );
  return (
    <article className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative"><span className="absolute inset-x-2 bottom-1 h-3 rounded-full blur-md opacity-70" style={{ background: HUE[part.hue] }} /><Blob feel={feel} size={60} /></div>
        <div className="min-w-0"><p className="font-serif text-2xl leading-tight">{part.name}</p><p className="text-sm text-[var(--color-text-secondary)]">{part.sub}{part.resting ? ' · resting' : ''}</p></div>
      </div>
      <Row k="Where" v={part.places.map((r) => REGIONS[r].label.toLowerCase()).join(', ')} />
      <Row k="Its job, in your words" v={part.job} serif />
      <Row k="Afraid that" v={part.fear} serif />
      <Row k="Would rather" v={part.rather} serif />
      <Row k="What's helped it settle" v={part.helped} />
      <Row k="How you've felt toward it" v={part.feel} />
      {MOVES[part.move].safetyLine && <p className="text-sm text-[var(--color-danger)] border-t border-[var(--color-border-subtle)] pt-2.5">{PROMPTS.dangerNote}</p>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border-subtle)] pt-3">
        <button type="button" className="lift-primary min-h-11 px-4 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-semibold">Spend time with it</button>
        <TextBtn onClick={() => {}}>Rename</TextBtn>
        <TextBtn onClick={() => {}}>{part.resting ? 'Wake it' : 'Rest it'}</TextBtn>
      </div>
    </article>
  );
}

/* ───────── The den ───────── */

function Den() {
  const [snap, setSnap] = useState<'now' | 'july'>('now');
  const [sel, setSel] = useState('hide');
  const S = SNAPSHOTS[snap];
  const part = PARTS.find((p) => p.id === sel)!;
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-full border border-[var(--color-border)] w-max" role="group" aria-label="Snapshot">
        {(['july', 'now'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={snap === k} onClick={() => setSnap(k)}
            className={`min-h-9 px-4 rounded-full text-sm ${snap === k ? 'bg-[var(--color-bg-elevated)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
            {k === 'now' ? 'Now' : 'How it looked in July'}</button>
        ))}
      </div>
      <div className="relative w-full rounded-3xl overflow-hidden" style={{ aspectRatio: '1 / 1.05', background: 'color-mix(in srgb, var(--color-bg-secondary) 70%, #000)' }}>
        <div className="absolute rounded-full pointer-events-none" style={{
          left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: snap === 'now' ? '95%' : '58%', aspectRatio: '1',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 50%, transparent), color-mix(in srgb, var(--color-accent) 12%, transparent) 45%, transparent 70%)',
          transition: reduce ? 'none' : 'width 1s cubic-bezier(.2,.7,.2,1)',
        }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {S.links.map(([a, b, kind]) => {
            const A = S.at[a], B = S.at[b];
            return kind === 'two_pulls'
              ? <path key={a + b} d={`M${A.x * 100 + 6} ${A.y * 100} Q${(A.x + B.x) * 50} ${(A.y + B.y) * 50 - 8} ${B.x * 100 - 6} ${B.y * 100}`} fill="none" stroke="var(--color-text-secondary)" strokeWidth="0.35" strokeDasharray="0.8 1.6" vectorEffect="non-scaling-stroke" />
              : <line key={a + b} x1={A.x * 100} y1={A.y * 100 + 7} x2={B.x * 100} y2={B.y * 100 - 7} stroke="var(--color-text-tertiary)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" />;
          })}
        </svg>
        {PARTS.map((p) => {
          const at = S.at[p.id];
          return (
            <button key={p.id} type="button" onClick={() => setSel(p.id)} aria-pressed={sel === p.id} aria-label={p.name}
              className="absolute grid justify-items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-1 focus-visible:outline-2"
              style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transition: reduce ? 'none' : 'left .9s cubic-bezier(.2,.7,.2,1), top .9s cubic-bezier(.2,.7,.2,1)' }}>
              <span className="relative" style={{ filter: `brightness(${0.35 + 0.65 * at.light}) saturate(${0.4 + 0.6 * at.light})`, transition: 'filter .8s' }}>
                {p.tender
                  ? <span className="block w-11 h-11 rounded-t-full rounded-b-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]" />
                  : <><span className="absolute inset-x-1 bottom-0 h-2.5 rounded-full blur-md opacity-70" style={{ background: HUE[p.hue] }} /><Blob feel={fromVec(p.shape)} size={52} /></>}
              </span>
              <span className={`font-serif text-[13px] leading-tight max-w-28 text-center ${sel === p.id ? 'underline underline-offset-4' : ''}`} style={{ opacity: 0.45 + 0.55 * at.light }}>{p.name}</span>
              {p.resting && snap === 'now' && <span className="text-[10px] text-[var(--color-text-tertiary)]">resting</span>}
            </button>
          );
        })}
        <p className="absolute inset-x-0 bottom-3 text-center font-serif italic text-[var(--color-text-secondary)] pointer-events-none">Everyone here is in your house.</p>
      </div>
      <PartCard part={part} />
    </div>
  );
}

/* ───────── Trail offer ───────── */

function Offer({ onLog }: { onLog: (x: unknown) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <section className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-3">
        <p className="text-sm text-[var(--color-text-tertiary)]">{OFFER.eyebrow}</p>
        <p className="font-serif text-2xl leading-snug">{OFFER.statement}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{OFFER.ask}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(true)} className="lift-primary min-h-11 px-4 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-semibold">Show me</button>
          <button type="button" onClick={() => onLog({ TrailOffer: 'not_now' })} className="lift-secondary min-h-11 px-4 rounded-xl border border-[var(--color-border)]">Not now</button>
          <button type="button" onClick={() => onLog({ TrailOffer: 'no' })} className="lift-secondary min-h-11 px-4 rounded-xl border border-[var(--color-border)]">No</button>
        </div>
      </section>
      {open && (
        <section className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3">
          <p className="text-sm text-[var(--color-text-tertiary)]">{OFFER.evidenceTitle}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[440px]"><tbody>
              {OFFER.evidence.map((r) => (
                <tr key={r[0]} className="border-t border-[var(--color-border-subtle)]">
                  <td className="py-2 pr-3 text-[var(--color-text-tertiary)] whitespace-nowrap tabular-nums">{r[0]}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-secondary)]">{r[1]}</td>
                  <td className="py-2 pr-3 text-[var(--color-text-secondary)]">{r[2]}</td>
                  <td className="py-2">{r[3]}</td>
                </tr>))}
            </tbody></table>
          </div>
          <p className="font-medium">{OFFER.question}</p>
          <div className="flex flex-wrap gap-2.5">{OFFER.answers.map((a) => <Chip key={a} label={a} onClick={() => onLog({ answerTrailOffer: a, next: a.startsWith('Yes') ? 'Meet a part, with this trail as the trailhead' : a === 'More than one' ? 'split, or Two pulls' : 'recorded' })} />)}</div>
        </section>
      )}
    </div>
  );
}

/* ───────── shell ───────── */

const VIEWS = [['meet', 'Meet a part'], ['den', 'The den'], ['card', 'Part card'], ['offer', 'Trail offer']] as const;

function Harness() {
  const [view, setView] = useState(q.get('view') || 'meet');
  const [log, setLog] = useState<unknown[]>([]);
  const [room, setRoom] = useState(startRoom);
  const push = (x: unknown) => setLog((l) => [x, ...l].slice(0, 12));
  const move = (q.get('move') as MoveId) || 'hide';
  const pickRoom = (r: string) => {
    setRoom(r);
    document.documentElement.dataset.palette = r;
    document.documentElement.dataset.theme = ROOMS.find((x) => x[0] === r)?.[1] ?? 'dark';
  };
  return (
    <div className="min-h-screen text-[var(--color-text-primary)] px-4 py-5">
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-3">
          <p className="text-xs text-[var(--color-text-tertiary)]">Dev harness · parts proposal · draft copy, invented example person</p>
          <nav className="flex flex-wrap gap-2" aria-label="Views">
            {VIEWS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
                className={`min-h-10 px-3 rounded-lg border text-sm ${view === k ? 'border-[var(--color-text-secondary)] font-medium' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>{label}</button>
            ))}
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">Room
              <select value={room} onChange={(e) => pickRoom(e.target.value)} className="min-h-10 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)]">
                {ROOMS.map(([r]) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </nav>
        </header>
        {view === 'meet' && <MeetAPart key={move} initialMove={move} onLog={push} />}
        {view === 'den' && <Den />}
        {view === 'card' && <div className="space-y-4">{PARTS.map((p) => <PartCard key={p.id} part={p} />)}</div>}
        {view === 'offer' && <Offer onLog={push} />}
        {log.length > 0 && (
          <section aria-label="What would be saved" className="space-y-2">
            <p className="text-xs text-[var(--color-text-tertiary)]">What would be saved (newest first)</p>
            <pre data-testid="log" className="text-[11px] leading-snug opacity-80 whitespace-pre-wrap break-words">{log.map((i) => JSON.stringify(i, null, 1)).join('\n\n')}</pre>
          </section>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><BandProvider owner={null} content={capacity}><Harness /></BandProvider></StrictMode>,
);
