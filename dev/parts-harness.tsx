/**
 * Dev-only harness for the parts proposal (docs/design/parts.md): Meet a part, the den, the part card,
 * a trail offer and the angry-part card (the app's own AngryPartCard, not mounted in the app yet), in the
 * app's own rooms, chips, PartFigure, LightHold, heat figure and P2 overlay.
 * Every move, prompt and option comes from tests/fixtures/parts-content.json (generated from
 * scripts/parts/content.py by scripts/parts/fixture.py; drafts, not signed off); the invented person is
 * dev/parts-example.ts; the close is the spine's own copy. No Firebase, no graph. Not part of the app build.
 *   npm run dev, then open http://localhost:5173/dev/parts.html
 *   or: npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)
 * URL params: ?view=meet|den|card|offer|angry
 *   &move=hide|chase|hit_back|keep_the_peace|turn_on_myself|… starts Meet a part from that named trailhead
 *     (Find is already answered, so the blend check is the first screen); without it, Find comes first
 *   &palette=velvet|dusk|tinted|pastel|pastel-mix|daylight &theme=dark|light
 *   &blend=0 skips the blending check (decided 16 Oct; asked once "it" is named), to walk the rest of the flow
 *   angry: &parts=0|1 (default 1: parts wording; 0: plain distanced self-talk) &name=Sam (default none:
 *   the no-name lines) &state=<Recover state id> (brushed, mocked, ignored, …: pre-orders the hurts via CAN_TOUCH)
 */
import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import fixture from '../tests/fixtures/capacity-content.json';
import partsFixture from '../tests/fixtures/parts-content.json';
import spineFile from '../src/data/content/spine.json';
import type { CapacityContent } from '../src/data/capacityTypes';
import { BandProvider } from '../src/contexts/BandContext';
import { TooMuchLink } from '../src/components/capacity/TooMuchLink';
import { BreakdownHandoff } from '../src/components/capacity/BreakdownHandoff';
import { CrisisBanner } from '../src/components/safety/CrisisBanner';
import { HeatFigure, type FigureMark } from '../src/components/checkin/body/HeatFigure';
import { REGIONS, type RegionId } from '../src/data/bodyFigure';
import { PartFigure } from '../src/components/parts/PartFigure';
import { LightHold } from '../src/components/parts/LightHold';
import { vecToSig } from '../src/lib/partFigure';
import { fromVec, toVec, variant, type Feel } from '../src/components/tools/findTheFeeling/shape/feel';
import { initialMeet, meetNext, whatToSave, MEET_TRACK, type MeetContext, type MeetEvent, type MeetState } from '../src/lib/meetAPart';
import { AngryPartCard } from '../src/components/parts/AngryPartCard';
import { angryCopyFrom, angryNotNowId, orderHurts } from '../src/lib/angryPart';
import type { AngryCardContent, AngryStep } from '../src/data/partsTypes';
import { OFFER, PARTS, SNAPSHOTS, type ExamplePart, type MoveId, type Quadrant } from './parts-example';

/* ───────── parts content (the generated fixture: what a future getPartsContent would return) ───────── */

interface Move { id: MoveId; label: string; unblendPhrase: string; trailPhrase: string; nameHint: string; kind: string; safetyLine: boolean; order: number }
interface Option {
  id: string; label: string; kind: 'chip' | 'voice'; flag: 'tender' | 'danger' | null; selfLike: boolean | null;
  branch: string; order: number; moves: MoveId[]; pending?: string;
}
interface Hurt { id: string; label: string; hurtPhrase: string; feltPhrase: string; order: number; guardedBy: { moveId: MoveId; rank: number }[] }
interface PartsContent {
  version: string; moves: Move[]; prompts: Record<string, { flow: string; step: string; copy: string; pending?: string }>;
  options: Record<string, Record<string, Option[]>>; hurts: Hurt[];
  trailRules: { id: string; statementTemplate: string }[]; contexts: { id: string; phrase: string }[];
  policy: { maxNonSelfAnswers: number; nameMaxChars: number };
}
interface CloseKind { question: string; choices: { id: string; label: string }[] }
const PC = partsFixture as unknown as PartsContent;
const SPINE = (spineFile as unknown as { content: { closeFlow: { kinds: Record<string, CloseKind>; saved: string; skip: string } } }).content.closeFlow;
const MOVES: Record<MoveId, Move> = Object.fromEntries(PC.moves.map((m) => [m.id, m]));
const MOVE_IDS = PC.moves.map((m) => m.id);
/** A prompt's copy by id. */
const P = (id: string) => PC.prompts[id].copy;
/** Options at a flow's step, for a move (an option with no moves is offered for any move, and comes last). */
const opts = (flow: string, step: string, move?: MoveId) => (PC.options[flow]?.[step] ?? [])
  .filter((o) => !move || o.moves.length === 0 || o.moves.includes(move))
  .sort((a, b) => Number(a.moves.length === 0) - Number(b.moves.length === 0) || a.order - b.order);
const OWN_WORDS = PC.options.meet.any.find((o) => o.id === 'own_words')!;
/** What a move may be guarding, in its OFTEN_GUARDS rank order. */
const guardsFor = (move: MoveId) => PC.hurts
  .flatMap((h) => h.guardedBy.filter((g) => g.moveId === move).map((g) => ({ h, rank: g.rank })))
  .sort((a, b) => a.rank - b.rank).map(({ h }) => h);
const fill = (template: string, slots: Record<string, string>) => template.replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m);

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
function Chips<T extends { id: string; label: string }>({ options, onPick, own, picked }: { options: T[]; onPick: (o: T) => void; own?: () => void; picked?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => <Chip key={o.id} label={o.label} on={picked === o.id} onClick={() => onPick(o)} />)}
      {own && <Chip label={OWN_WORDS.label} own onClick={own} />}
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
/** The app's own PartFigure (Shape it's -1..1 vector as the stored 0–1 signature). */
function Blob({ feel, size = 120, className = '' }: { feel: Feel; size?: number; className?: string }) {
  return <PartFigure shapeSig={vecToSig(toVec(feel))} size={size} className={className} />;
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

// The rules are the app's own (src/lib/meetAPart.ts); this view only draws the screens and reports events.
const ORIENTING = SPINE.kinds.orienting;
/**
 * The blending check needs something for "it" to point at: it comes right after Find, or first when the
 * flow starts from a named trailhead (?move=…, which already answers Find). ?blend=0 skips it.
 */
const MEET_CTX: MeetContext = {
  safetyLineMoves: PC.moves.filter((m) => m.safetyLine).map((m) => m.id),
  maxNonSelfAnswers: PC.policy.maxNonSelfAnswers,
  namedEntry: !!MOVES[q.get('move') ?? ''],
  blendCheck: q.get('blend') !== '0',
};

function MeetAPart({ initialMove, onLog }: { initialMove: MoveId; onLog: (x: unknown) => void }) {
  const fresh = () => initialMeet(MEET_CTX, { move: initialMove, trailheadKind: 'move' });
  const [st, setSt] = useState<MeetState>(fresh);
  const [ownFor, setOwnFor] = useState<null | 'voice' | 'job' | 'fear'>(null);
  /** The place being chosen on the figure, until Continue reports it. */
  const [placeDraft, setPlaceDraft] = useState<RegionId | null>(null);
  const { step, session: s } = st;
  const move = MOVES[s.move];
  const shape = fromVec(s.shape);
  const send = (e: MeetEvent) => { setOwnFor(null); setSt((x) => meetNext(x, e, MEET_CTX)); };
  const option = (o: Option) => send({ type: 'option', option: o });
  const restart = () => { setSt(fresh()); setPlaceDraft(null); setOwnFor(null); };

  useEffect(() => {
    if (st.aside) onLog({ handoff: st.aside === 'grounding' ? '5-4-3-2-1' : 'body primitive (P2)' });
  }, [st.aside]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (step !== 'done') return;
    const save = whatToSave(st);
    onLog({
      PartSession: { layer: 'log', ...save.partSession },
      // After P2's "come back later" the session still closes, but nobody was asked: no thenVsNow at all.
      ToolSession: { layer: 'log', ...save.toolSession },
      keepPart: save.keep && { layer: 'profile (on yes only)', ...save.keep },
      followUp: save.followUp,
      PartCandidate: save.candidate && { layer: 'log, on yes', ...save.candidate },
    });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The options at a step as chips, each reported as picked. */
  const pick = (flow: string, sub: string) => <Chips options={opts(flow, sub, s.move)} onPick={option} />;

  const body = (): ReactNode => {
    if (ownFor) {
      return (<>
        <p className="text-lg font-medium">{P(ownFor === 'voice' ? 'meet_voice' : ownFor === 'job' ? 'meet_job' : 'meet_fear')}</p>
        <OwnWords onDone={(t) => send({ type: 'ownWords', text: t })} />
      </>);
    }
    switch (step) {
      case 'blend': return (<>
        <p className="text-lg font-medium">{P('gate_blend_check')}</p>
        {pick('gate', 'blend')}
        <p className="text-xs text-[var(--color-text-tertiary)]">Harness note: asked once "it" is named, never on the check-in; ?blend=0 skips it.</p>
      </>);
      // "It's running things": the real P2 hand-off, card first, in the page (no band is recorded, so stirred).
      case 'blendBody': return (<>
        <BreakdownHandoff host="meet-a-part" band={st.p2?.band ?? 'stirred'} blank={false}
          resume={{ hostSessionId: '00000000-0000-4000-8000-0000000000aa', stepId: 'where', draft: {} }}
          onScheduleLater={async (chip) => { onLog({ FollowUp: { layer: 'log', type: 'resume_skill', window: chip } }); return 'fu-demo'; }}
          onResume={(r) => send({ type: 'p2', outcome: r.overridden ? 'override' : 'resume', result: r })}
          onLater={(r) => send({ type: 'p2', outcome: 'later', result: r })} />
        {st.later && <Primary onClick={() => send({ type: 'continue' })}>Continue</Primary>}
      </>);
      case 'find': return (<>
        <p className="text-lg font-medium">{P('meet_find')}</p>
        <div className="flex flex-wrap gap-2.5">
          <Chip label={`The pull to ${move.label.toLowerCase()}`} on onClick={() => send({ type: 'find' })} />
          {PARTS.filter((p) => !p.tender).slice(0, 2).map((p) => <Chip key={p.id} label={p.name} onClick={() => send({ type: 'find', move: p.move })} />)}
          {opts('meet', 'find').map((o) => <Chip key={o.id} label={o.label} onClick={() => { onLog({ find: o.id }); option(o); }} />)}
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)]">Or start from another move:</p>
        <div className="flex flex-wrap gap-2">
          {MOVE_IDS.filter((m) => m !== s.move).map((m) => <Chip key={m} label={MOVES[m].label} onClick={() => send({ type: 'setMove', move: m })} />)}
        </div>
      </>);
      case 'where': {
        const marks: FigureMark[] = placeDraft ? [{ region: placeDraft, side: 'both', colour: 'var(--color-quadrant-low-unpleasant)', strength: 0.6 }] : [];
        return (<>
          {st.resumeNote && <p className="text-sm text-[var(--color-text-secondary)]">{capacity.handoff.resumeLine}</p>}
          <p className="text-lg font-medium">{P('meet_where')}</p>
          <div className="mx-auto w-44"><HeatFigure marks={marks} selected={placeDraft} onPick={setPlaceDraft} /></div>
          <p className="text-sm text-[var(--color-text-secondary)] min-h-5">{placeDraft ? `My ${REGIONS[placeDraft].label.toLowerCase()}` : 'Touch and drag to a place, then lift.'}</p>
          <Primary disabled={!placeDraft} onClick={() => send({ type: 'place', place: placeDraft })}>Continue</Primary>
          {opts('meet', 'where').map((o) => <TextBtn key={o.id} onClick={() => { setPlaceDraft(null); option(o); }}>{o.label}</TextBtn>)}
        </>);
      }
      case 'shape': {
        const a = variant(shape, st.round, 1), b = variant(shape, st.round, -1);
        const next = (f: Feel) => send({ type: 'shape', shape: toVec(f) });
        return (<>
          <p className="text-lg font-medium">{P('meet_shape')}</p>
          <p className="text-sm text-[var(--color-text-tertiary)]">{['I', 'II', 'III', 'IV', 'V'][st.round]} of V</p>
          <div className="grid grid-cols-2 gap-3">
            {[[a, SHAPE_PAIRS[st.round][0]], [b, SHAPE_PAIRS[st.round][1]]].map(([f, label]) => (
              <button key={label as string} type="button" onClick={() => next(f as Feel)}
                className="lift-secondary rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 grid place-items-center gap-1">
                <Blob feel={f as Feel} size={110} /><span className="text-sm font-medium">{label as string}</span>
              </button>
            ))}
          </div>
          {opts('meet', 'shape').map((o) => <TextBtn key={o.id} onClick={() => option(o)}>{o.label}</TextBtn>)}
        </>);
      }
      case 'age': return (<>
        <div className="flex justify-center"><Blob feel={shape} size={120} /></div>
        <p className="text-lg font-medium">{P('meet_age')}</p>
        {pick('meet', 'age')}
      </>);
      case 'young': return (<>
        <p className="font-serif text-2xl leading-snug">{P('meet_age_young')}</p>
        {pick('meet', 'age_young')}
      </>);
      case 'voice': return (<>
        <p className="text-lg font-medium">{P('meet_voice')}</p>
        <Chips options={opts('meet', 'voice', s.move)} onPick={option} own={() => setOwnFor('voice')} />
      </>);
      case 'feel': {
        const feel = opts('meet', 'feel');
        return (<>
          <div className="flex justify-center"><Blob feel={shape} size={100} /></div>
          <p className="text-lg font-medium">{P('meet_feel')}</p>
          <Chips options={feel.filter((o) => o.selfLike === true)} onPick={option} />
          <Chips options={feel.filter((o) => o.selfLike === false)} onPick={option} />
          <Chips options={feel.filter((o) => o.selfLike == null)} onPick={option} />
        </>);
      }
      case 'unblend': return (<>
        <p className="font-serif text-2xl leading-snug">{P('meet_unblend')}</p>
        {pick('meet', 'unblend')}
      </>);
      case 'unblendEnd': return (<>
        <p className="font-serif text-2xl leading-snug">{P('meet_unblend_end')}</p>
        <p className="text-base">{P('meet_unblend_later')}</p>
        {pick('meet', 'unblend_later')}
      </>);
      case 'nothing': return (<>
        <p className="font-serif text-2xl leading-snug">{P('meet_nothing')}</p>
        {pick('meet', 'nothing')}
      </>);
      case 'job': return (<>
        <p className="text-lg font-medium">{P('meet_job')}</p>
        <Chips options={opts('meet', 'job', s.move)} onPick={option} own={() => setOwnFor('job')} />
      </>);
      case 'likes': return (<>
        <p className="text-lg font-medium">{P('meet_likes')}</p>
        {pick('meet', 'likes')}
      </>);
      case 'guards': return (<>
        <p className="text-lg font-medium">{P('meet_guards')}</p>
        <Chips options={[...guardsFor(s.move), ...opts('meet', 'guards')]}
          onPick={(o) => ('branch' in o ? option(o) : send({ type: 'hurt', hurtId: o.id }))} />
      </>);
      case 'fear': return (<>
        <p className="text-lg font-medium">{P('meet_fear')}</p>
        <Chips options={opts('meet', 'fear', s.move)} onPick={option} own={() => setOwnFor('fear')} />
        <p className="text-xs text-[var(--color-text-tertiary)]">Harness note: some chips are flagged tender or danger; own words always take the careful branch.</p>
      </>);
      case 'stop': return (<>
        <p className="font-serif text-3xl leading-tight">{P('meet_stop_title')}</p>
        <p className="font-serif text-xl text-[var(--color-text-secondary)]">{P('meet_stop_body')}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{P('meet_stop_therapist')}</p>
        {pick('meet', 'stop')}
      </>);
      case 'update': return (<>
        <p className="text-lg font-medium">{P('meet_update')}</p>
        {pick('meet', 'update')}
      </>);
      case 'canNow': return (<>
        <p className="text-lg font-medium">{P('meet_update_show')}</p>
        {pick('meet', 'update_show')}
      </>);
      // The app's own hold (LightHold, shared with the angry card).
      case 'thank': return <LightHold title={<p className="text-lg font-medium">{P('meet_thank')}</p>} holdLabel={P('meet_thank_hold')} holdHint={P('hold_hint')}
        doneLabel={P('meet_thank_done')} nextLabel="Next" figure={<Blob feel={shape} size={80} />} onDone={() => send({ type: 'hold' })} />;
      case 'tender': return <LightHold title={<p className="font-serif text-3xl leading-tight">{P('meet_tender')}</p>}
        sub={<p className="font-serif text-xl text-[var(--color-text-secondary)]">{P('meet_tender_sub')}</p>}
        holdLabel={P('meet_thank_hold')} holdHint={P('hold_hint')} nextLabel="Next" onDone={() => send({ type: 'hold' })} />;
      case 'rather': return (<>
        <p className="text-lg font-medium">{P('meet_rather')}</p>
        {pick('meet', 'rather')}
      </>);
      case 'name': return <NameStep suggestion={s.tender ? 'the little one' : move.nameHint} onDone={(n) => send({ type: 'name', name: n || null })} />;
      case 'keep': return (<>
        <div className="flex items-center gap-4"><Blob feel={shape} size={72} /><p className="font-serif text-2xl">{s.name || 'This part'}</p></div>
        <p className="text-lg font-medium">{P('meet_keep')}</p>
        {pick('meet', 'keep')}
      </>);
      case 'close': return (<>
        <p className="text-lg font-medium">{ORIENTING.question}</p>
        <div className="grid gap-2">{ORIENTING.choices.map((o) => <button key={o.id} type="button" onClick={() => send({ type: 'close', choiceId: o.id })} className="lift-secondary min-h-12 rounded-xl border border-[var(--color-border)] text-left px-4">{o.label}</button>)}</div>
        <TextBtn onClick={() => send({ type: 'close', choiceId: null })}>{SPINE.skip}</TextBtn>
      </>);
      case 'done': return (<>
        <p className="font-serif text-2xl">{SPINE.saved}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">What would be saved is in the log below. Profile writes happen only when the person chose to keep the part.</p>
        <TextBtn onClick={restart}>Start again</TextBtn>
      </>);
    }
  };

  const track = MEET_TRACK[step];
  return (
    <div className="space-y-5">
      {track !== undefined && <Track at={track} total={10} />}
      {/* Crisis resources alongside, never instead: the app's own banner (the crisis seam's copy). */}
      {st.crisis && !['find', 'done'].includes(step) && <CrisisBanner />}
      <div className="space-y-4">{body()}</div>
      {/* Every screen but P2 itself (no hand-off inside the hand-off). */}
      {!['done', 'blendBody'].includes(step) && (
        <TooMuchLink host="meet-a-part" blank={false} onResult={(r) => onLog({ tooMuch: r })}
          resume={() => ({ hostSessionId: '00000000-0000-4000-8000-0000000000aa', stepId: step, draft: {} })} />
      )}
    </div>
  );
}

function NameStep({ suggestion, onDone }: { suggestion: string; onDone: (n: string) => void }) {
  const [n, setN] = useState('');
  return (<>
    <p className="text-lg font-medium">{P('meet_name')}</p>
    <input value={n} onChange={(e) => setN(e.target.value.slice(0, PC.policy.nameMaxChars))} placeholder={suggestion}
      className="w-full min-h-12 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] font-serif text-xl" />
    <div className="flex flex-wrap gap-2.5"><Chip label={suggestion} onClick={() => setN(suggestion)} /></div>
    <Primary disabled={!n.trim()} onClick={() => onDone(n.trim())}>Continue</Primary>
    {opts('meet', 'name').map((o) => <TextBtn key={o.id} onClick={() => onDone('')}>{o.label}</TextBtn>)}
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
        <p className="font-serif text-lg">{P('meet_tender')} {P('meet_tender_sub')}</p>
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
      {MOVES[part.move]?.safetyLine && <div className="border-t border-[var(--color-border-subtle)] pt-2.5"><CrisisBanner /></div>}
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

/** What the answer to the offer's question leads to, by the option's branch. */
const OFFER_NEXT: Record<string, string> = { meet: 'Meet a part, with this trail as the trailhead', split: 'split, or Two pulls', end: 'recorded' };

function Offer({ onLog }: { onLog: (x: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const rule = PC.trailRules.find((r) => r.id === OFFER.ruleId)!;
  const statement = fill(rule.statementTemplate, {
    context: PC.contexts.find((c) => c.id === OFFER.contextId)!.phrase, pull: MOVES[OFFER.pull].trailPhrase, pull2: MOVES[OFFER.pull2].trailPhrase,
  });
  return (
    <div className="space-y-4">
      <section className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-3">
        <p className="text-sm text-[var(--color-text-tertiary)]">{P('offer_eyebrow')}</p>
        <p className="font-serif text-2xl leading-snug">{statement}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{P('offer_ask')}</p>
        <div className="flex flex-wrap gap-2">
          {opts('offer', 'card').map((o) => (
            <button key={o.id} type="button" onClick={() => (o.branch === 'continue' ? setOpen(true) : onLog({ TrailOffer: o.id }))}
              className={o.branch === 'continue'
                ? 'lift-primary min-h-11 px-4 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-semibold'
                : 'lift-secondary min-h-11 px-4 rounded-xl border border-[var(--color-border)]'}>{o.label}</button>
          ))}
        </div>
      </section>
      {open && (
        <section className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3">
          <p className="text-sm text-[var(--color-text-tertiary)]">{P('offer_evidence')}</p>
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
          <p className="font-medium">{P('offer_question')}</p>
          <div className="flex flex-wrap gap-2.5">{opts('offer', 'evidence').map((o) => <Chip key={o.id} label={o.label} onClick={() => onLog({ answerTrailOffer: o.id, next: OFFER_NEXT[o.branch] ?? o.branch })} />)}</div>
        </section>
      )}
    </div>
  );
}

/* ───────── The angry-part card ───────── */

const ANGRY_CONTENT = partsFixture as unknown as AngryCardContent;
// The fixture's CAN_TOUCH carries its review; the harness shows drafts, so only the hurt lists are read.
const CAN_TOUCH: Record<string, string[]> = Object.fromEntries(
  Object.entries((partsFixture as unknown as { canTouch: Record<string, { hurts: string[] }> }).canTouch).map(([ev, t]) => [ev, t.hurts]),
);

function AngryCardView({ onLog }: { onLog: (x: unknown) => void }) {
  const partsOn = q.get('parts') !== '0';
  const name = q.get('name')?.trim() || null;
  const state = q.get('state');
  const copy = useMemo(() => angryCopyFrom(ANGRY_CONTENT), []);
  const hurts = useMemo(() => orderHurts(ANGRY_CONTENT.hurts, CAN_TOUCH, state), [state]);
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const step = useRef<AngryStep>('unblend');
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Harness note: parts {partsOn ? 'on' : 'off'} · {name ? `name ${name}` : 'no name'} · {state ? `Recover state ${state}` : 'no Recover state'}.
        Change with &amp;parts=0|1 &amp;name= &amp;state=.
      </p>
      {done ? (<>
        <p className="font-serif text-2xl">{SPINE.saved}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">What the card hands its host is in the log below. The card saves nothing itself.</p>
        <TextBtn onClick={() => { setDone(false); setRun((n) => n + 1); }}>Start again</TextBtn>
      </>) : (
        <AngryPartCard key={run} copy={copy} hurts={hurts} partsOn={partsOn} name={name}
          onStep={(st) => { step.current = st; }}
          onSkip={() => { onLog({ AngryCardResult: { layer: 'log', hurtId: null, voteHeld: false, exitStep: 'unblend', skipped: true } }); setDone(true); }}
          skipLabel={copy[angryNotNowId(partsOn)]}
          onDone={(r) => { onLog({ AngryCardResult: { layer: 'log', ...r } }); setDone(true); }}
          tooMuch={<TooMuchLink host="angry-part" blank={false} onResult={(r) => onLog({ tooMuch: r })}
            resume={() => ({ hostSessionId: '00000000-0000-4000-8000-0000000000ab', stepId: step.current, draft: {} })} />} />
      )}
    </div>
  );
}

/* ───────── shell ───────── */

const VIEWS = [['meet', 'Meet a part'], ['den', 'The den'], ['card', 'Part card'], ['offer', 'Trail offer'], ['angry', 'Angry part']] as const;

function Harness() {
  const [view, setView] = useState(q.get('view') || 'meet');
  const [log, setLog] = useState<unknown[]>([]);
  const [room, setRoom] = useState(startRoom);
  const push = (x: unknown) => setLog((l) => [x, ...l].slice(0, 12));
  // Only offerable moves are in the content's `moves`: go_blank / zone_out never start Meet a part.
  const move: MoveId = MOVES[q.get('move') ?? ''] ? q.get('move')! : 'hide';
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
        {view === 'angry' && <AngryCardView onLog={push} />}
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
