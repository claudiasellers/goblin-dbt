import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmotionById } from '../../data/emotions';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../hooks/useProfileContext';
import {
  getInvalidationRecoveryContent, getInvalidationRecoveryProgress, saveInvalidationRecoverySession,
} from '../../services/neo4j';
import type { ExitId, InvalidationRecoveryContent, InvalidationRecoveryProgress } from '../../data/invalidationRecoveryTypes';
import { fill, gateFor, needsOrienting, repsInLastWeek, routeExits, type LockReason } from '../../lib/invalidationRecovery';
import {
  PHASES, flowReducer, initialHistory, nextStep, phaseIndex, readingsFor, type FlowData,
} from '../../lib/invalidationRecoveryFlow';
import { ExerciseProgress } from '../../components/tools/ExerciseProgress';
import { ToolLoading } from '../../components/tools/ToolLoading';
import { ToolLoadError } from '../../components/tools/ToolLoadError';
import { EmotionPicker } from '../../components/tools/EmotionPicker';
import { HoldToConfirm } from '../../components/tools/oppositeAction/HoldToConfirm';
import { UrgeScale } from '../../components/tools/oppositeAction/UrgeScale';
import { primaryButton, linkButton, secondaryText } from '../../components/tools/oppositeAction/styles';
import { Choice, Pill, StepTitle } from '../../components/tools/invalidationRecovery/shared';
import { BreathOrb, ColdReset, Orient } from '../../components/tools/regulation/body';
import { CertaintyDial, CompassionBreak, SecurityPrime, ValidationPick } from '../../components/tools/invalidationRecovery/mind';
import { LetItLand, MustPrefer, OppositeStep, ParkIt, type ExitResult } from '../../components/tools/invalidationRecovery/exits';
import type { DearManHandoff } from '../../data/dearManHandoff';
import { FollowUps, RepsRing, SkillCard, UrgeWave } from '../../components/tools/invalidationRecovery/closeout';
import { useToolSession } from '../../hooks/useToolSession';
import { getSpineContent, type SpineContent } from '../../services/spine';
import { recoverSchedule } from '../../lib/spine/wrap';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; content: InvalidationRecoveryContent };
type Save = 'idle' | 'saving' | 'saved' | 'error' | 'signed-out';

export function InvalidationRecovery() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getInvalidationRecoveryContent()
      .then(content => { if (live) setLoad({ status: 'ready', content }); })
      .catch(() => { if (live) setLoad({ status: 'error' }); });
    return () => { live = false; };
  }, [attempt]);

  if (load.status === 'loading') return <ToolLoading />;
  if (load.status === 'error') {
    return <ToolLoadError onRetry={() => { setLoad({ status: 'loading' }); setAttempt(a => a + 1); }} />;
  }
  return (
    <LazyMotion features={domAnimation} strict>
      <Flow content={load.content} />
    </LazyMotion>
  );
}

function Flow({ content }: { content: InvalidationRecoveryContent }) {
  const { flow, states, protocols, needs, social, exits, skills } = content;
  const c = flow.copy;
  const g = flow.gates;
  const reduce = useReducedMotion();
  const { user } = useAuth();
  // The single profile read path (PR-P1): only the slices this tool declared. null while loading,
  // as before (distanced self-talk falls back to "you").
  const firstName = useProfileContext('recovering-from-invalidation').slices?.name.firstName ?? null;

  const [history, dispatch] = useReducer(flowReducer, undefined, initialHistory);
  const { step, data: d } = history.stack[history.stack.length - 1];
  /** Answers from the screen the user just went Back from: prefill only, never committed data. */
  const pre = history.prefill;
  const state = states.find(s => s.id === d.stateId) ?? null;
  const pull = flow.pulls.find(p => p.id === d.pull) ?? null;
  const now = d.now ?? d.intensity ?? 0;
  const need = needs.find(n => n.id === d.needId) ?? null;
  // Curated chips carry graph names; "Another word" picks fall back to the app's display names.
  const emotionName = state?.emotions.find(e => e.id === d.emotionId)?.name ?? (d.emotionId ? getEmotionById(d.emotionId)?.name : undefined) ?? '';
  const waitMinutes = pull?.id === 'chase' ? g.chaseWaitMinutes : g.waitMinutes;
  const navigate = useNavigate();
  /** Asking is DEAR MAN's job: after closing, hand over what the user already told us. */
  const handoff: DearManHandoff | null = d.exitId === 'ask' && d.emotionId && need
    ? { source: 'recovering-from-invalidation', emotionId: d.emotionId, emotionName, needLabel: need.label,
        intensity: now, waitMinutes, oneMessageOnly: pull?.id === 'chase', waitCopy: c.wait }
    : null;

  /** Advance from the current step, merging what it collected. */
  const advance = useCallback((patch: Partial<FlowData> = {}) => {
    const merged = { ...d, ...patch };
    const st = states.find(s => s.id === merged.stateId);
    if (!st) return;
    dispatch({ type: 'go', step: nextStep(step, merged, st), patch });
  }, [d, step, states]);
  const withSkills = (...ids: string[]): Partial<FlowData> => ({ skills: [...d.skills, ...ids] });

  // Progress (skill uses, reps) for signed-in users; the flow works without it.
  const [progress, setProgress] = useState<InvalidationRecoveryProgress | null>(null);
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    getInvalidationRecoveryProgress().then(p => { if (live) setProgress(p); }).catch(() => { if (live) setProgress(null); });
    return () => { live = false; };
  }, [uid]);

  const holdCopy = c.hold;
  const renderHold = (text: string, onComplete: () => void, done: boolean) => (
    <HoldToConfirm text={text} done={done} onComplete={onComplete} holdLabel={holdCopy.hold} holdingLabel={holdCopy.holding}
      countdownLabel={holdCopy.countdown} srHint={holdCopy.srHint} doneLabel={holdCopy.done} />
  );

  // Intensity bar under the header: it shrinks and cools as the user settles.
  const started = d.intensity !== null;

  const phase = phaseIndex(step);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ExerciseProgress current={phase + 1} total={PHASES.length} stageName={c.phases[PHASES[phase].key]}
          onBack={history.stack.length > 1 && step !== 'close' && step !== 'follow' ? () => dispatch({ type: 'back' }) : undefined} />
        {started && step !== 'close' && step !== 'follow' && (
          <div aria-hidden="true" className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
            <div className="h-full rounded-full motion-safe:transition-all motion-safe:duration-1000"
              style={{ width: `${now * 10}%`, background: now >= g.downshiftAt ? 'var(--color-q-hu-fill)' : now > g.askMax ? 'var(--color-q-hp-fill)' : 'var(--color-q-lp-fill)' }} />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.section key={step === 'close' || step === 'follow' ? 'close' : `${history.stack.length}-${step}`} className="space-y-5"
          initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}>
          {step === 'what' && (
            <>
              <StepTitle eyebrow={c.what.eyebrow} title={c.what.title} sub={c.what.sub} />
              <div className="grid sm:grid-cols-2 gap-2.5">
                {states.map(s => (
                  <Choice key={s.id} selected={d.stateId === s.id}
                    onClick={() => dispatch({ type: 'go', step: 'loud', patch: { stateId: s.id, emotionId: null } })}>
                    {s.label}
                  </Choice>
                ))}
              </div>
            </>
          )}

          {step === 'loud' && state && (
            <LoudStep c={c} pulls={flow.pulls} initial={pre}
              onDone={(intensity, p, urge) => {
                const gate = gateFor(intensity, p, state, g);
                advance({ intensity, pull: p, urge, now: intensity, gate, mids: [], skills: [] });
              }} />
          )}

          {step === 'stop' && (
            <>
              <StepTitle eyebrow={`${d.intensity} / 10`} title={c.stop.title} sub={c.stop.sub} />
              {renderHold(c.stop.lockText, () => advance(withSkills('stop')), false)}
            </>
          )}

          {step === 'cold' && (
            <>
              <StepTitle eyebrow={c.cold.eyebrow} title={c.cold.title} sub={c.cold.sub} />
              <ColdReset steps={c.cold.steps} seconds={c.cold.seconds} caution={c.cold.caution}
                startLabel={c.cold.start} skipLabel={c.cold.skip} doneEarlyLabel={c.cold.doneEarly}
                onDone={() => advance(withSkills('cold'))} onSkip={() => advance()} />
            </>
          )}

          {(step === 'breathe' || step === 'unlock') && (
            <>
              <StepTitle title={c.breathe.title} sub={c.breathe.sub} />
              <BreathOrb phases={c.breathe.phases} cycles={c.breathe.cycles} compact={step === 'unlock'}
                startLabel={fill(c.breathe.start, { seconds: Math.round(c.breathe.cycles * c.breathe.phases.reduce((t: number, p: { ms: number }) => t + p.ms, 0) / 1000) })}
                skipLabel={c.breathe.skip} doneLabel={c.breathe.done}
                onDone={completed => advance(completed ? withSkills('sigh') : {})} />
            </>
          )}

          {step === 'orient' && (
            <>
              <StepTitle title={c.orient.title} sub={c.orient.sub} />
              <Orient look={c.orient.look} move={c.orient.move} moveSeconds={c.orient.moveSeconds} startMoveLabel={c.orient.startMove}
                skipLabel={c.orient.skip} seenLabel={n => fill(c.orient.seen, { n })}
                onDone={completed => advance(completed ? withSkills('orient') : {})} />
            </>
          )}

          {step === 'rerate' && (
            <>
              <StepTitle title={c.rerate.title} sub={c.rerate.sub} />
              <UrgeScale label={c.rerate.prompt} value={pre?.now ?? null} lowLabel={c.loud.low} highLabel={c.loud.high}
                onChange={v => { if (v !== null) advance({ now: v, mids: [...d.mids, v] }); }} />
            </>
          )}

          {step === 'secure' && (
            <>
              <StepTitle title={c.secure.title} sub={c.secure.sub} />
              <SecurityPrime figures={c.secure.figures} prompts={c.secure.prompts} prompt={c.secure.prompt}
                startLabel={c.secure.start} continueLabel={c.secure.continue} onDone={() => advance(withSkills('secure'))} />
            </>
          )}

          {step === 'label' && state && (
            <LabelStep c={c} emotions={state.emotions} value={pre?.emotionId ?? null} onDone={emotionId => advance({ emotionId, ...withSkills('label') })} />
          )}

          {step === 'validate' && state && (
            <>
              <StepTitle eyebrow={emotionName || undefined} title={c.validate.title} sub={c.validate.sub} />
              <ValidationPick
                lines={[
                  ...(protocols[state.protocol]?.validationLines ?? []),
                  ...(state.secondaryProtocol ? (protocols[state.secondaryProtocol]?.validationLines ?? []).slice(0, 1) : []),
                ]}
                name={firstName} phrase={state.phrase} max={g.validationMax}
                stampLabel={c.validate.stamp} doneLabel={c.validate.done} voiceLabel={voice => fill(c.validate.voice, { voice })}
                onDone={() => advance(withSkills('validate'))} />
            </>
          )}

          {step === 'compassion' && (
            <>
              <StepTitle title={c.compassion.title} sub={c.compassion.sub} />
              <CompassionBreak steps={c.compassion.steps} note={c.compassion.note} nextLabel={c.compassion.next}
                doneLabel={c.compassion.done} onDone={() => advance(withSkills('compassion'))} />
            </>
          )}

          {step === 'need' && (
            <NeedStep c={c} needs={needs} value={pre?.needId ?? null} onDone={needId => advance({ needId, ...withSkills('need') })} />
          )}

          {step === 'certainty' && (
            <>
              <StepTitle title={c.certainty.title} sub={c.certainty.sub} />
              <CertaintyDial sureLabel={c.certainty.sure} patternLabel={c.certainty.pattern} yesLabel={c.certainty.yes}
                noLabel={c.certainty.no} zones={c.certainty.zones} continueLabel={c.certainty.continue}
                initialZone={pre?.zone ?? null} gates={g} onDone={zone => advance({ zone })} />
            </>
          )}

          {step === 'them' && <ThemStep c={c} initial={pre} onDone={(safe, asks) => advance({ safe, asks })} />}

          {step === 'route' && state && pull && (
            <RouteStep c={c} exits={exits} now={now} askMax={g.askMax} chasing={pull.id === 'chase'}
              options={routeExits({ state, pull: pull.id, intensityNow: now, safe: d.safe ?? 'no', asks: d.asks ?? 2, zone: d.zone, gates: g })}
              unlockLabel={needsOrienting(pull.id) ? c.route.unlockOrient : c.route.unlockBreathe}
              onPick={exitId => advance({ exitId })}
              onUnlock={() => dispatch({ type: 'go', step: needsOrienting(pull.id) ? 'orient' : 'unlock', patch: { rerateTo: 'route' } })} />
          )}

          {step === 'exit' && state && pull && need && (
            <ExitStep c={c} exitId={d.exitId} exit={exits.find(x => x.id === d.exitId)} pull={pull.id}
              need={need} social={social} feeling={emotionName}
              tooHot={now > g.askMax} waitMinutes={waitMinutes}
              chaseMinutes={g.chaseWaitMinutes} renderHold={renderHold}
              onDone={r => advance(withSkills(...r.skills))} />
          )}

          {(step === 'close' || step === 'follow') && state && pull && (
            <CloseStep c={c} d={d} urgeLabel={pull.urgeLabel} skills={skills} progress={progress}
              contentVersion={content.version} signedIn={Boolean(user)} showFollow={step === 'follow'}
              finishLabel={handoff ? c.ask.finish : c.follow.finish}
              onNext={() => dispatch({ type: 'go', step: 'follow' })}
              onFinished={endIntensity => (handoff
                // Hand over the close rating: DEAR MAN re-gates if it went back up.
                ? navigate('/tool/dear-man', { state: { dearManHandoff: { ...handoff, intensity: endIntensity ?? handoff.intensity } } })
                : dispatch({ type: 'reset' }))} />
          )}
        </m.section>
      </AnimatePresence>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Copy = Record<string, any>;

function LoudStep({ c, pulls, initial, onDone }: {
  c: Copy; pulls: InvalidationRecoveryContent['flow']['pulls']; initial: FlowData | null;
  onDone: (intensity: number, pull: FlowData['pull'] & string, urge: number) => void;
}) {
  const [intensity, setIntensity] = useState<number | null>(initial?.intensity ?? null);
  const [pull, setPull] = useState<FlowData['pull']>(initial?.pull ?? null);
  const [urge, setUrge] = useState<number | null>(initial?.urge ?? null);
  const p = pulls.find(x => x.id === pull);
  return (
    <>
      <StepTitle title={c.loud.title} sub={c.loud.sub} />
      <UrgeScale label={c.loud.intensityLabel} value={intensity} onChange={setIntensity} lowLabel={c.loud.low} highLabel={c.loud.high} />
      <fieldset className="space-y-2">
        <legend className="font-semibold mb-2">{c.loud.pullPrompt}</legend>
        <div className="grid grid-cols-2 gap-2">
          {pulls.map(x => <Choice key={x.id} selected={pull === x.id} sub={x.sub} onClick={() => setPull(x.id)}>{x.label}</Choice>)}
        </div>
      </fieldset>
      {p && <UrgeScale label={fill(c.loud.urgeLabel, { pull: p.urgeLabel })} value={urge} onChange={setUrge} />}
      <button type="button" className={primaryButton} disabled={intensity === null || !pull || urge === null}
        onClick={() => onDone(intensity!, pull!, urge!)}>{c.common.continue}</button>
    </>
  );
}

function LabelStep({ c, emotions, value, onDone }: {
  c: Copy; emotions: { id: string; name: string }[]; value: string | null; onDone: (id: string) => void;
}) {
  const [picked, setPicked] = useState(value);
  const [more, setMore] = useState(false);
  if (more) return (
    <EmotionPicker selectionMode="single" prompt={c.label.pickerPrompt} selectedIds={picked ? [picked] : []}
      onChange={ids => setPicked(ids[ids.length - 1] ?? null)} onContinue={() => picked && onDone(picked)} />
  );
  return (
    <>
      <StepTitle title={c.label.title} sub={c.label.sub} />
      <div className="flex flex-wrap gap-2.5">
        {emotions.map(e => <Pill key={e.id} selected={picked === e.id} onClick={() => setPicked(e.id)}>{e.name}</Pill>)}
        <button type="button" className={linkButton} onClick={() => setMore(true)}>{c.label.other}</button>
      </div>
      <button type="button" className={primaryButton} disabled={!picked} onClick={() => picked && onDone(picked)}>{c.common.continue}</button>
    </>
  );
}

function NeedStep({ c, needs, value, onDone }: {
  c: Copy; needs: InvalidationRecoveryContent['needs']; value: string | null; onDone: (id: string) => void;
}) {
  const [picked, setPicked] = useState(value);
  return (
    <>
      <StepTitle title={c.need.title} sub={c.need.sub} />
      <div className="flex flex-wrap gap-2.5">{needs.map(n => <Pill key={n.id} selected={picked === n.id} onClick={() => setPicked(n.id)}>{n.label}</Pill>)}</div>
      <button type="button" className={primaryButton} disabled={!picked} onClick={() => picked && onDone(picked)}>{c.common.continue}</button>
    </>
  );
}

function ThemStep({ c, initial, onDone }: { c: Copy; initial: FlowData | null; onDone: (safe: 'yes' | 'no', asks: 0 | 1 | 2) => void }) {
  const [safe, setSafe] = useState<'yes' | 'no' | null>(initial?.safe ?? null);
  const [asks, setAsks] = useState<0 | 1 | 2 | null>(initial?.asks ?? null);
  return (
    <>
      <StepTitle title={c.them.title} sub={c.them.sub} />
      <fieldset className="space-y-2">
        <legend className="font-medium mb-2">{c.them.safe}</legend>
        <div className="flex flex-wrap gap-2">
          <Pill selected={safe === 'yes'} onClick={() => setSafe('yes')}>{c.them.safeYes}</Pill>
          <Pill selected={safe === 'no'} onClick={() => setSafe('no')}>{c.them.safeNo}</Pill>
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-medium mb-2">{c.them.asks}</legend>
        <div className="flex flex-wrap gap-2">
          {(c.them.asksOptions as string[]).map((l, i) => <Pill key={l} selected={asks === i} onClick={() => setAsks(i as 0 | 1 | 2)}>{l}</Pill>)}
        </div>
      </fieldset>
      {safe === 'no' && <p role="note" className="p-4 rounded-2xl text-sm bg-[var(--color-q-hu-bg)] text-[var(--color-q-hu-text)]">{c.them.safetyNote}</p>}
      <button type="button" className={primaryButton} disabled={!safe || asks === null} onClick={() => onDone(safe!, asks!)}>{c.them.cta}</button>
    </>
  );
}

function RouteStep({ c, exits, options, now, askMax, chasing, unlockLabel, onPick, onUnlock }: {
  c: Copy; exits: InvalidationRecoveryContent['exits']; options: ReturnType<typeof routeExits>; now: number; askMax: number; chasing: boolean;
  unlockLabel: string; onPick: (id: ExitId) => void; onUnlock: () => void;
}) {
  const lockText = (reason: LockReason) => fill(c.locks[reason], { max: askMax, now });
  return (
    <>
      <StepTitle title={c.route.title} sub={fill(c.route.sub, { now })} />
      <div className="space-y-2.5">
        {options.map(o => {
          const x = exits.find(e => e.id === o.id);
          if (!x) return null;
          const reasonId = `lock-${o.id}`;
          return (
            <div key={o.id} className="space-y-1.5">
              <button type="button" aria-disabled={Boolean(o.lock)} aria-describedby={o.lock ? reasonId : undefined}
                onClick={() => { if (!o.lock) onPick(o.id); }}
                className={`w-full text-left p-4 rounded-2xl border flex gap-3 items-start ${
                  o.lock ? 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] cursor-not-allowed'
                    : o.recommended ? 'bg-[var(--color-bg-elevated)] border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] lift-secondary'
                      : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] lift-secondary'}`}>
                <span className="flex-1 space-y-0.5">
                  {o.recommended && <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">{c.route.best}</span>}
                  <span className={`block font-semibold ${o.lock ? 'text-[var(--color-text-tertiary)]' : ''}`}>{x.title}</span>
                  <span id={reasonId} className={`block ${secondaryText}`}>{o.lock ? lockText(o.lock) : (chasing && x.chaseSub) || x.sub}</span>
                </span>
                {o.lock && <span aria-hidden="true" className="mt-1">🔒</span>}
              </button>
              {o.lock === 'tooHot' && <button type="button" className={linkButton} onClick={onUnlock}>{unlockLabel} →</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ExitStep({ c, exitId, exit, pull, need, social, feeling, tooHot, waitMinutes, chaseMinutes, renderHold, onDone }: {
  c: Copy; exitId: ExitId | null; exit: InvalidationRecoveryContent['exits'][number] | undefined; pull: FlowData['pull'] & string;
  need: InvalidationRecoveryContent['needs'][number]; social: InvalidationRecoveryContent['social'];
  feeling: string; tooHot: boolean; waitMinutes: number; chaseMinutes: number;
  renderHold: (text: string, onComplete: () => void, done: boolean) => ReactNode; onDone: (r: ExitResult) => void;
}) {
  if (!exitId || !exit) return null;
  const headings: Record<ExitId, { title: string; sub: string }> = {
    ask: c.ask, land: c.land, opposite: c.opposite, park: c.park, prefer: c.prefer,
  };
  return (
    <>
      <StepTitle title={headings[exitId].title} sub={headings[exitId].sub} />
      {exitId === 'ask' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{c.ask.carryHeading}</p>
            <ul className="space-y-1.5">
              {(c.ask.carry as string[]).map(line => (
                <li key={line} className="flex gap-2"><span aria-hidden="true" className="text-[var(--color-accent)]">✓</span>{fill(line, { feeling, need: need.label, minutes: waitMinutes })}</li>
              ))}
            </ul>
          </div>
          <button type="button" className={primaryButton} onClick={() => onDone({ skills: ['request'] })}>{c.ask.cta}</button>
        </div>
      )}
      {exitId === 'land' && <LetItLand c={c.land} pull={pull} tooHot={tooHot} elsewhere={{ ...social[need.social], social: need.social }} onDone={onDone} />}
      {exitId === 'opposite' && <OppositeStep c={c.opposite} wait={c.wait} pull={pull} chaseMinutes={chaseMinutes} renderHold={renderHold} onDone={onDone} />}
      {exitId === 'park' && <ParkIt c={c.park} onDone={onDone} />}
      {exitId === 'prefer' && <MustPrefer c={c.prefer} onDone={onDone} />}
    </>
  );
}

function CloseStep({ c, d, urgeLabel, skills, progress, contentVersion, signedIn, showFollow, finishLabel, onNext, onFinished }: {
  c: Copy; d: FlowData; urgeLabel: string; skills: InvalidationRecoveryContent['skills'];
  progress: InvalidationRecoveryProgress | null; contentVersion: string; signedIn: boolean; showFollow: boolean;
  finishLabel: string; onNext: () => void; onFinished: (endIntensity: number | null) => void;
}) {
  const [endI, setEndI] = useState<number | null>(null);
  const [endU, setEndU] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [save, setSave] = useState<Save>(signedIn ? 'idle' : 'signed-out');
  const [sessionId] = useState(() => crypto.randomUUID());
  const used = useMemo(() => [...new Set(d.skills)], [d.skills]);
  const [lastFollowUps, setLastFollowUps] = useState<string[]>([]);
  const toolSession = useToolSession();

  // PR-S4: link the visit to the saved session, log the skills used as reps, and schedule the
  // follow-ups the user picked (they used to be stored as ids and never fire; D-09 windows).
  // Loaded ahead so the close is sent synchronously (before the page can unmount).
  const [spine, setSpine] = useState<SpineContent | null>(null);
  useEffect(() => {
    let live = true;
    getSpineContent().then((c) => { if (live) setSpine(c); }).catch(() => { /* follow-ups need it; the close doesn't */ });
    return () => { live = false; };
  }, []);
  const closeSpine = (followUps: string[]) => {
    void toolSession.close({
      status: 'completed',
      detail: { kind: 'invalidation_recovery', id: sessionId },
      skillIds: used,
      schedule: recoverSchedule(followUps, spine, new Date()),
    });
  };

  const doSave = (followUps: string[]) => {
    setLastFollowUps(followUps);
    if (!signedIn || endI === null || endU === null) { onFinished(endI); return; }
    setSave('saving');
    saveInvalidationRecoverySession({
      schemaVersion: 1, id: sessionId, contentVersion,
      stateId: d.stateId!, pull: d.pull!, gate: d.gate, emotionId: d.emotionId!, needId: d.needId!, exitId: d.exitId!,
      zone: d.zone, safe: d.safe, asks: d.asks,
      startIntensity: d.intensity!, startUrge: d.urge!, readings: readingsFor(d, endI),
      endIntensity: endI, endUrge: endU, skills: used, followUps,
    }).then(() => { setSave('saved'); closeSpine(followUps); onFinished(endI); })
      .catch((e: { code?: string }) => {
        if (e?.code === 'functions/already-exists') { setSave('saved'); closeSpine(followUps); onFinished(endI); } else setSave('error');
      });
  };

  if (showFollow) return (
    <>
      <StepTitle title={c.follow.title} sub={c.follow.sub} />
      <FollowUps options={c.follow.options} submitLabel={c.follow.submit} finishLabel={finishLabel} onDone={doSave} />
      {save === 'saving' && <p className={secondaryText} aria-live="polite">{c.close.saving}</p>}
      {save === 'error' && (
        <div role="alert" className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] p-3 rounded-xl border border-[var(--color-danger)]">{c.close.saveError}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={() => doSave(lastFollowUps)}>{c.close.retry}</button>
            <button type="button" className={linkButton} onClick={() => onFinished(endI)}>{finishLabel}</button>
          </div>
        </div>
      )}
      {save === 'signed-out' && <p className={secondaryText}>{c.close.signIn}</p>}
    </>
  );

  if (!revealed) return (
    <>
      <StepTitle eyebrow={c.close.eyebrow} title={c.close.title} sub={c.close.sub} />
      <UrgeScale label={c.close.intensityPrompt} value={endI} onChange={setEndI} lowLabel={c.loud.low} highLabel={c.loud.high} />
      <UrgeScale label={fill(c.close.urgePrompt, { pull: urgeLabel })} value={endU} onChange={setEndU} />
      <button type="button" className={primaryButton} disabled={endI === null || endU === null} onClick={() => setRevealed(true)}>{c.close.reveal}</button>
    </>
  );

  const readings = readingsFor(d, endI!);
  const labels = readings.map((_, i) => (i === 0 ? c.close.waveStart : i === readings.length - 1 ? c.close.waveNow : ''));
  const delta = d.urge! - endU!;
  const reps = repsInLastWeek((progress?.sessions ?? []).map(s => s.createdAt)) + 1;
  const goal = c.close.weeklyGoal as number;
  return (
    <>
      <StepTitle title={c.close.changedTitle} />
      <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{fill(c.close.pullHeading, { pull: urgeLabel })}</p>
        <p className="text-4xl font-semibold tabular-nums" aria-label={`${d.urge} to ${endU}`}>{d.urge} <span aria-hidden="true" className="text-[var(--color-text-secondary)]">→</span> {endU}</p>
        <p className={secondaryText}>{delta > 0 ? c.close.down : delta === 0 ? c.close.same : c.close.up}</p>
      </div>
      <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <UrgeWave readings={readings} labels={labels} caption={c.close.waveCaption} />
      </div>
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{c.close.skillsHeading}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {used.map(id => {
            const skill = skills.find(k => k.id === id);
            if (!skill) return null;
            return (
              <SkillCard key={id} skill={skill} fresh uses={(progress?.skillUses[id] ?? 0) + 1}
                levelLabel={(level, toNext) => fill(c.close.level, { level, toNext, next: level + 1 })}
                lockedLabel={c.close.locked} masteredLabel={c.close.mastered} />
            );
          })}
        </div>
      </section>
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center gap-4">
        <RepsRing reps={reps} goal={goal} label={fill(c.close.repsLabel, { reps, goal })} />
        <div>
          <p className="font-semibold">{reps >= goal ? c.close.repsMet : fill(c.close.repsLabel, { reps, goal })}</p>
          <p className={secondaryText}>{c.close.reps}</p>
        </div>
      </div>
      <button type="button" className={primaryButton} onClick={onNext}>{c.close.next}</button>
    </>
  );
}
