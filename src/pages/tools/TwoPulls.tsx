import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { HandoffResult } from '../../data/capacityTypes';
import type { PartsContent } from '../../data/partsContentTypes';
import { HOLD_HINT, type PartsEntry, type PullsSessionPatch } from '../../data/partsTypes';
import { getToolById } from '../../data/tools';
import { useBand } from '../../hooks/useBand';
import { useProfileContext } from '../../hooks/useProfileContext';
import { useToolSession } from '../../hooks/useToolSession';
import { HEADS_UP_GO_ON, HEADS_UP_LOOK, HEADS_UP_PROMPT, entryPlan, type EntryPlan } from '../../lib/meetAPartSave';
import { meetAPartLink } from '../../lib/partsOfMe';
import { promptCopy, stepOptions } from '../../lib/partsContent';
import { newId } from '../../lib/spine/ids';
import { initialPulls, pullsNext, keepsakeOpen, PULLS_TRACK, STEP_BACK_MAX, type PullsEvent, type PullsState } from '../../lib/twoPulls';
import {
  PULLS_CHECKBACK_NO, PULLS_CHECKBACK_PROMPT, PULLS_CHECKBACK_YES, PULLS_OPTIONS, PULLS_PROMPTS, STEP_EXIT,
  TWO_PULLS_CHECKBACK_TYPE, TWO_PULLS_TOOL, bothWantOptions, candidateRequest, checkbackRequest, entryLaterPatch, feelOptions,
  keepsakeLines, meetLinkFor, meetOptions, offerCheckback, parsePullsEntry, pullsContext, resolveVisit, startRequest, toPatch,
  wiseMindLink, worryOptions, worryPrompt, type PullsCheckbackType, type PullsVisit,
} from '../../lib/twoPullsSave';
import { MEET_OWN_WORDS_MAX, meetChrome } from '../../lib/meetAPartSave';
import { scheduleResumeLater } from '../../services/capacity';
import { getPartsEntry, keepPullsKeepsake, queuePartCandidate, savePullsSession, schedulePullsCheckback, startPullsSession } from '../../services/parts';
import { getSpineContent } from '../../services/spine';
import { loadTwoPullsContent } from '../../services/twoPulls';
import { BreakdownHandoff } from '../../components/capacity/BreakdownHandoff';
import { TooMuchLink } from '../../components/capacity/TooMuchLink';
import { CrisisBanner } from '../../components/safety/CrisisBanner';
import { SessionClose } from '../../components/spine/SessionClose';
import { useStepFocus } from '../../components/parts/stepFocus';
import { Chip, Chips, Line, OwnWords, Prompt } from '../../components/parts/meet/MeetScreens';
import { PullsStage, type StageSide } from '../../components/parts/pulls/PullsStage';
import { Keepsake, StepBack } from '../../components/parts/pulls/PullsScreens';
import { ToolNotFound } from '../../components/tools/ToolNotFound';
import { linkButton, primaryButton, secondaryText } from '../../components/tools/oppositeAction/styles';

const HOST = TWO_PULLS_TOOL;

type Phase = { k: 'p2' } | { k: 'heads_up' } | { k: 'flow' } | { k: 'ended' };

/**
 * Two pulls (docs/design/parts.md, "Two pulls (polarities)"): reached only by a link (the den, or a rule C
 * trail's More than one), with parts on and its copy signed off (ToolPage checks both first). The entry
 * gate opens first (P2, or the far-away heads-up), then the step machine (src/lib/twoPulls.ts) runs the
 * visit; every event saves the PullsSession (src/lib/twoPullsSave.ts, `toPatch`). It never names a winner
 * and never asks either part to stop.
 */
export function TwoPulls() {
  const location = useLocation();
  const [entry] = useState(() => parsePullsEntry(location.search));
  const profile = useProfileContext('two-pulls');
  const [content, setContent] = useState<PartsContent | null>(null);
  const [gate, setGate] = useState<PartsEntry | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadTwoPullsContent().then((c) => { if (live) { if (c) setContent(c); else setFailed(true); } }).catch(() => { if (live) setFailed(true); });
    // A failed gate call is "clear": nothing ever locks.
    getPartsEntry().then((g) => { if (live) setGate(g); }).catch(() => { if (live) setGate(null); });
    return () => { live = false; };
  }, []);

  if (failed || !entry) return <ToolNotFound />;
  if (!content || gate === undefined || profile.status === 'loading') {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }
  const visit = resolveVisit(content, entry, profile.slices?.parts ?? []);
  // Two parts that aren't both kept, or a pair that doesn't ship: ToolPage's "not found" (its gate
  // usually says so first; this is the same answer if the parts changed in between).
  if (!visit) return <ToolNotFound />;
  return <PullsVisitView visit={visit} plan={entryPlan(gate)} parts={content} />;
}

function PullsVisitView({ visit, plan, parts }: { visit: PullsVisit; plan: EntryPlan; parts: PartsContent }) {
  const toolSession = useToolSession();
  const band = useBand();
  useEffect(() => { band.load(); }, [band]);

  const ctx = useMemo(() => pullsContext(parts, visit, plan.open === 'p2'), [parts, visit, plan.open]);
  const [phase, setPhase] = useState<Phase>(() => ({ k: plan.open === 'p2' ? 'p2' : plan.open === 'heads_up' ? 'heads_up' : 'flow' }));
  const [st, setSt] = useState<PullsState>(() => initialPulls(ctx));
  const [light, setLight] = useState<[number, number]>([0.5, 0.5]);
  const [own, setOwn] = useState(false);
  const [extra, setExtra] = useState<HandoffResult[]>([]);
  const entryCrisis = (plan.open === 'p2' && plan.crisis) || ctx.safetyLine;

  const send = (e: PullsEvent) => { setOwn(false); setSt((x) => pullsNext(x, e, ctx)); };
  const pick = (id: string, list: readonly { id: string; branch: string; flag?: string | null; selfLike?: boolean | null }[]) => {
    const o = list.find((x) => x.id === id);
    if (o) send({ type: 'option', option: o });
  };
  const addHandoff = (r: HandoffResult) => setExtra((x) => [...x, r]);

  /* ── the PullsSession: opened at the first real screen, then one save per event, in order ── */
  const [psId] = useState(newId);
  const [opened, setOpened] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const started = useRef<Promise<boolean> | null>(null);
  const lastSaved = useRef('');
  const queued = useRef(false);
  const detail = () => (started.current ? { detail: { kind: 'two_pulls' as const, id: psId } } : {});
  const enqueue = (f: () => Promise<unknown>) => { queue.current = queue.current.then(f).catch(() => { /* the next save carries everything */ }); };
  const ensureStarted = () => {
    if (!started.current) {
      started.current = startPullsSession(startRequest(psId, visit)).then(() => { setOpened(true); return true; }).catch(() => false);
      enqueue(() => started.current!);
    }
  };
  const save = (patch: PullsSessionPatch, final: boolean) => {
    const key = JSON.stringify([patch, final]);
    if (key === lastSaved.current) return;
    lastSaved.current = key;
    enqueue(async () => { if (await started.current) await savePullsSession({ id: psId, patch, ...(final ? { final } : {}) }); });
  };
  const queueCandidate = (state: PullsState) => {
    if (queued.current) return;
    const cand = candidateRequest(state, visit, newId());
    if (cand) { queued.current = true; enqueue(async () => { if (await started.current) await queuePartCandidate(cand); }); }
  };

  useEffect(() => {
    if (phase.k !== 'flow' || !toolSession.persisted) return;
    ensureStarted();
    save(toPatch(st, extra), st.step === 'done');
    queueCandidate(st);
  }, [st, extra, phase.k]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    toolSession.setStep(STEP_EXIT[st.step]);
    if (st.step === 'close') toolSession.markComplete();
    if (st.step === 'done' && st.later) void toolSession.close({ status: 'exited_early', ...detail() });
  }, [st.step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the keepsake ("Keep this": the server builds it from the stored visit) ── */
  const [keep, setKeep] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  /** What the paper shows as picked (a later "Keep this" after "Not now" still keeps it). */
  const [keptChoice, setKeptChoice] = useState<string | null>(null);
  const [lineId] = useState(newId);
  const keepIt = () => {
    if (keep === 'saving' || keep === 'saved') return;
    setKeptChoice(PULLS_OPTIONS.keep);
    setKeep('saving');
    enqueue(async () => {
      try {
        if (!(await started.current)) throw new Error('not opened');
        await keepPullsKeepsake({ sessionId: psId, lineId });
        setKeep('saved');
      } catch { setKeep('failed'); }
    });
  };

  /* ── the check-back question after the close ── */
  const [checkType, setCheckType] = useState<PullsCheckbackType | null>(null);
  useEffect(() => {
    let live = true;
    getSpineContent().then((c) => { if (live) setCheckType(c.followUpTypes.find((t) => t.id === TWO_PULLS_CHECKBACK_TYPE) ?? null); }).catch(() => { /* no question */ });
    return () => { live = false; };
  }, []);
  const [checkback, setCheckback] = useState<string | null>(null);
  const askCheckback = offerCheckback(st, visit, { content: parts, type: checkType, opened });
  const answerCheckback = (id: string) => {
    if (checkback || !checkType) return;
    setCheckback(id);
    const req = id === PULLS_CHECKBACK_YES ? checkbackRequest(checkType, newId(), psId, new Date()) : null;
    if (req) enqueue(async () => { if (await started.current) await schedulePullsCheckback(req); });
  };

  const stepRoot = useRef<HTMLDivElement>(null);
  useStepFocus(stepRoot, `${phase.k}:${st.step}:${st.session.side}:${own}`);
  const resumeDraft = () => (toolSession.persisted && toolSession.id ? { hostSessionId: toolSession.id, stepId: STEP_EXIT[st.step], draft: {} } : undefined);
  const scheduleLater = toolSession.persisted && toolSession.id
    ? (chip: '1h' | 'evening' | 'tomorrow') => scheduleResumeLater(HOST, toolSession.id, chip) : undefined;

  const P = (id: string) => promptCopy(parts, id) ?? '';
  const s = st.session;
  const sides: [StageSide, StageSide] = [
    { name: visit.a.name, shapeSig: visit.a.part?.shapeSig ?? null },
    { name: visit.b.name, shapeSig: visit.b.part?.shapeSig ?? null },
  ];
  const stageLight: [number, number] = s.lightAt ?? light;
  const chrome = meetChrome(parts);
  const ownLabel = stepOptions(parts, 'meet', 'any').find((o) => o.id === PULLS_OPTIONS.ownWords)?.label ?? '';
  const tooMuch = (
    <div className="flex justify-center">
      <TooMuchLink host={HOST} resume={resumeDraft} onScheduleLater={scheduleLater} onResult={addHandoff} />
    </div>
  );
  const finale = (
    <div className="space-y-4 pt-2">
      <p className="font-serif text-xl text-[var(--color-text-primary)]">{P(PULLS_PROMPTS.done)}</p>
      <Link to="/profile" className={`${primaryButton} inline-flex items-center justify-center`}>{chrome.finish}</Link>
    </div>
  );

  /* ── the entry gate ── */
  if (phase.k === 'p2') {
    return (
      <div ref={stepRoot} className="space-y-5">
        {entryCrisis && <CrisisBanner />}
        <BreakdownHandoff host={HOST} band="flooded" blank={plan.open === 'p2' && plan.blank}
          resume={resumeDraft()} onScheduleLater={scheduleLater}
          onResume={(r) => { addHandoff(r); setPhase({ k: 'flow' }); }}
          onLater={(r) => {
            addHandoff(r);
            setPhase({ k: 'ended' });
            if (toolSession.persisted) {
              ensureStarted();
              save(entryLaterPatch([...extra, r]), true);
              void queue.current.then(() => toolSession.close({ status: 'exited_early', ...detail() }));
            }
          }} />
      </div>
    );
  }
  if (phase.k === 'ended') {
    return (
      <div ref={stepRoot} className="space-y-5">
        {entryCrisis && <CrisisBanner />}
        {band.content && <p className="text-[var(--color-text-primary)]">{band.content.handoff.later.scheduled}</p>}
        {finale}
      </div>
    );
  }
  if (phase.k === 'heads_up') {
    const opts = stepOptions(parts, 'gate', 'dissociation');
    const look = opts.find((o) => o.id === HEADS_UP_LOOK);
    const goOn = opts.find((o) => o.id === HEADS_UP_GO_ON);
    const to = toolSession.linkTo('five-senses');
    return (
      <div ref={stepRoot} className="space-y-5">
        {entryCrisis && <CrisisBanner />}
        <Prompt serif>{P(HEADS_UP_PROMPT)}</Prompt>
        <div className="flex flex-wrap gap-2.5">
          {look && <Link to={{ pathname: to.pathname }} state={to.state} className="den-chip den-chip--small">{look.label}</Link>}
          {goOn && <Chip label={goOn.label} onClick={() => setPhase({ k: 'flow' })} />}
        </div>
        {tooMuch}
      </div>
    );
  }

  /* ── the visit ── */
  const step = st.step;
  const sideName = s.side === 'a' ? visit.a.name : visit.b.name;
  const stage = <PullsStage a={sides[0]} b={sides[1]} light={stageLight} />;
  const want = bothWantOptions(parts, visit).find((o) => o.id === s.bothWantId) ?? null;
  const lines = want ? keepsakeLines(parts, visit, want.label) : null;
  const wise = wiseMindLink(parts, visit, st, !!getToolById('wise-mind'));
  const keepsakeAfter = (
    <>
      {keep === 'failed' && (
        <p role="status" className={secondaryText}>
          Couldn&apos;t save that. <button type="button" className={linkButton} onClick={keepIt}>Try again</button>
        </p>
      )}
      {wise && <Link to={wise.to} className={`${linkButton} inline-block`}>{wise.label}</Link>}
    </>
  );

  let body: ReactNode = null;
  if (own && (step === 'worryA' || step === 'worryB')) {
    const side = step === 'worryA' ? 'a' : 'b';
    body = <OwnWords label={worryPrompt(parts, visit, side) ?? ''} fieldLabel={ownLabel} backLabel={chrome.back} nextLabel={chrome.next} max={MEET_OWN_WORDS_MAX}
      onDone={(text) => send({ type: 'ownWords', text })} onBack={() => setOwn(false)} />;
  } else {
    switch (step) {
      case 'blend': {
        const opts = stepOptions(parts, 'gate', 'blend_pulls');
        body = (<>{stage}<Prompt>{P(PULLS_PROMPTS.blend)}</Prompt><Chips options={opts} onPick={(id) => pick(id, opts)} /></>);
        break;
      }
      case 'blendBody':
        body = (<>
          <BreakdownHandoff host={HOST} band={st.p2?.band ?? 'stirred'} blank={plan.open === 'p2' && plan.blank}
            startLater={st.p2?.start === 'later'} resume={resumeDraft()} onScheduleLater={scheduleLater}
            onResume={(r) => send({ type: 'p2', outcome: r.overridden ? 'override' : 'resume', result: r })}
            onLater={(r) => send({ type: 'p2', outcome: 'later', result: r })} />
          {st.later && <button type="button" className={linkButton} onClick={() => send({ type: 'continue' })}>{chrome.next}</button>}
        </>);
        break;
      case 'place':
        body = (<>
          {st.resumeNote && band.content?.handoff.resumeLine && <Line>{band.content.handoff.resumeLine}</Line>}
          <Prompt>{P(PULLS_PROMPTS.place)}</Prompt>
          <PullsStage a={sides[0]} b={sides[1]} light={light} onMove={setLight} label={P(PULLS_PROMPTS.place)} />
          <button type="button" className={primaryButton} onClick={() => send({ type: 'place', at: light })}>{chrome.next}</button>
        </>);
        break;
      case 'feel': {
        const all = feelOptions(parts);
        body = (<>
          {stage}
          <Prompt>{P(PULLS_PROMPTS.feel)}</Prompt>
          <p className="font-serif text-xl text-[var(--color-text-primary)]">{sideName}</p>
          {[true, false, null].map((self) => {
            const group = all.filter((o) => o.selfLike === self);
            return group.length ? <Chips key={String(self)} options={group} onPick={(id) => pick(id, all)} /> : null;
          })}
        </>);
        break;
      }
      case 'unblend': {
        const opts = meetOptions(parts, 'unblend');
        body = (<><Prompt serif>{P(PULLS_PROMPTS.unblend)}</Prompt><Chips options={opts} onPick={(id) => pick(id, opts)} /></>);
        break;
      }
      case 'needsTime': {
        const opts = stepOptions(parts, 'pulls', 'needs_time');
        const another = opts.find((o) => o.id === PULLS_OPTIONS.anotherTime);
        const notNow = opts.find((o) => o.id === PULLS_OPTIONS.needsTimeNotNow);
        const meet = meetLinkFor({ ...st, session: { ...s, anotherTime: true } }, visit);
        body = (<>
          <Prompt serif>{P(PULLS_PROMPTS.needsTime)}</Prompt>
          <div className="flex flex-wrap gap-2.5">
            {another && (meet
              // A kept part: Meet a part for it, now or whenever (the visit is saved first, as it stands).
              ? <Link to={meetAPartLink(meet.partId).pathname} state={meetAPartLink(meet.partId).state} className="den-chip den-chip--small"
                  onClick={() => { const nx = pullsNext(st, { type: 'option', option: another }, ctx); save(toPatch(nx, extra), true); }}>{another.label}</Link>
              : <Chip label={another.label} onClick={() => pick(another.id, opts)} />)}
            {notNow && <Chip label={notNow.label} onClick={() => pick(notNow.id, opts)} />}
          </div>
        </>);
        break;
      }
      case 'stepBack':
        body = <StepBack title={<Prompt>{P(PULLS_PROMPTS.stepBack)}</Prompt>} a={sides[0]} b={sides[1]} light={stageLight}
          holds={s.stepBackHolds} max={STEP_BACK_MAX} holdLabel={P(PULLS_PROMPTS.hold)} holdHint={P(HOLD_HINT)} nextLabel={chrome.next}
          onBreath={() => send({ type: 'breath' })} onNext={() => send({ type: 'next' })} />;
        break;
      case 'worryA':
      case 'worryB': {
        const side = step === 'worryA' ? 'a' : 'b';
        const opts = worryOptions(parts, visit, side);
        body = (<>
          {stage}
          <Prompt>{worryPrompt(parts, visit, side)}</Prompt>
          <Chips key={side} options={opts} onPick={(id) => pick(id, opts)} ownLabel={ownLabel} onOwn={() => setOwn(true)} />
        </>);
        break;
      }
      case 'stop': {
        const opts = meetOptions(parts, 'stop');
        body = (<>
          <Prompt serif size="large">{P(PULLS_PROMPTS.stopTitle)}</Prompt>
          <Line serif>{P(PULLS_PROMPTS.stopBody)}</Line>
          <Line>{P(PULLS_PROMPTS.stopTherapist)}</Line>
          <Chips options={opts} onPick={(id) => pick(id, opts)} />
        </>);
        break;
      }
      case 'bothWant': {
        const opts = bothWantOptions(parts, visit);
        body = (<>{stage}<Prompt>{P(PULLS_PROMPTS.bothWant)}</Prompt><Chips options={opts} onPick={(id) => pick(id, opts)} /></>);
        break;
      }
      case 'keepsake': {
        const opts = stepOptions(parts, 'pulls', 'keepsake');
        const notNow = opts.find((o) => o.branch === 'end');
        body = lines
          ? <Keepsake lines={lines} options={opts} picked={null} onPick={(id) => {
              const o = opts.find((x) => x.id === id);
              if (o?.branch === 'keep' && keepsakeOpen(st)) keepIt();
              else setKeptChoice(id);
              pick(id, opts);
            }} />
          : notNow && <button type="button" className={primaryButton} onClick={() => pick(notNow.id, opts)}>{chrome.next}</button>;
        break;
      }
      case 'close':
      case 'done':
        if (st.later) { body = (<>{band.content && <Line>{band.content.handoff.later.scheduled}</Line>}{step === 'done' && finale}</>); break; }
        body = (<>
          {lines && s.kept !== null && (
            // Kept: the paper stays, on its own. Not now: "Keep this" is still there, for a change of mind.
            <Keepsake lines={lines} options={keptChoice === PULLS_OPTIONS.keep && keep !== 'failed' ? []
              : stepOptions(parts, 'pulls', 'keepsake').filter((o) => o.branch === 'keep')}
              picked={null} onPick={(id) => { if (id === PULLS_OPTIONS.keep) keepIt(); }}
              after={keepsakeAfter} />
          )}
          <SessionClose kind="orienting" {...(opened ? { detail: { kind: 'two_pulls' as const, id: psId } } : {})}
            onAnswered={(input) => send({ type: 'close', choiceId: input.thenVsNow ?? null })}
            onSkipped={() => send({ type: 'close', choiceId: null })} />
          {(askCheckback || checkback) && (<>
            <Prompt>{P(PULLS_CHECKBACK_PROMPT)}</Prompt>
            <Chips options={stepOptions(parts, 'pulls', 'close').filter((o) => o.id === PULLS_CHECKBACK_YES || o.id === PULLS_CHECKBACK_NO)}
              picked={checkback} onPick={answerCheckback} />
          </>)}
          {step === 'done' && finale}
        </>);
        break;
    }
  }

  const track = PULLS_TRACK[step];
  const p2Open = step === 'blendBody';
  return (
    <div className="space-y-5">
      {(st.crisis || entryCrisis) && <CrisisBanner />}
      {track !== undefined && (
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`h-1 flex-1 rounded ${i < track ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-border)]'}`} />)}
        </div>
      )}
      <div ref={stepRoot} key={step === 'done' || step === 'close' ? 'close' : `${step}:${s.side}:${own}`} className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]">{body}</div>
      {!p2Open && step !== 'done' && tooMuch}
    </div>
  );
}
