import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { HandoffResult } from '../../data/capacityTypes';
import type { PartsContent } from '../../data/partsContentTypes';
import { HOLD_HINT, type PartsEntry, type PartSessionPatch } from '../../data/partsTypes';
import { getToolById } from '../../data/tools';
import { useBand } from '../../hooks/useBand';
import { useProfileContext } from '../../hooks/useProfileContext';
import { useToolSession } from '../../hooks/useToolSession';
import { frontChoices, initialMeet, meetNext, MEET_TRACK, SHAPE_ROUNDS, type MeetContext, type MeetEvent, type MeetState } from '../../lib/meetAPart';
import {
  HEADS_UP_GO_ON, HEADS_UP_LOOK, HEADS_UP_PROMPT, MEET_OWN_WORDS_MAX, meetLimits, STEP_PART,
  candidateRequest, entryLaterPatch, entryPlan, guardsFor, keepRequest, meetContext, optionsFor, parseMeetEntry,
  startRequest, startingMove, toPatch, showTooMany, doneTarget, TOO_MANY_PROMPT, isPaused, meetReady, PAUSED_PROMPT,
  CHECKBACK_NO, CHECKBACK_PROMPT, CHECKBACK_TYPE, CHECKBACK_YES, checkbackRequest, offerCheckback, type CheckbackType, type EntryPlan, type MeetEntry, type ShapeRoundLabels, meetChrome,
  FRONT_NONE, FRONT_NOT_SURE, FRONT_PROMPT,
} from '../../lib/meetAPartSave';
import { vecToSig } from '../../lib/partFigure';
import { promptCopy, stepOptions } from '../../lib/partsContent';
import { newId } from '../../lib/spine/ids';
import { scheduleResumeLater } from '../../services/capacity';
import { loadMeetAPartContent } from '../../services/meetAPart';
import { getPartsEntry, keepPart, queuePartCandidate, savePartSession, schedulePartCheckback, startPartSession } from '../../services/parts';
import { getSpineContent } from '../../services/spine';
import { BreakdownHandoff } from '../../components/capacity/BreakdownHandoff';
import { TooMuchLink } from '../../components/capacity/TooMuchLink';
import { CrisisBanner } from '../../components/safety/CrisisBanner';
import { SessionClose } from '../../components/spine/SessionClose';
import { LightHold } from '../../components/parts/LightHold';
import { PartFigure } from '../../components/parts/PartFigure';
import { useStepFocus } from '../../components/parts/stepFocus';
import { Chip, Chips, Line, NameScreen, OwnWords, Prompt, ShapeScreen, WhereScreen } from '../../components/parts/meet/MeetScreens';
import { linkButton, primaryButton, secondaryText } from '../../components/tools/oppositeAction/styles';

const HOST = 'meet-a-part';

type Phase = { k: 'loading' } | { k: 'unavailable' } | { k: 'p2' } | { k: 'heads_up' } | { k: 'flow' } | { k: 'ended' };

/**
 * Meet a part (docs/design/parts.md, Phase 2): reached only by a link, with parts on and its copy signed
 * off (ToolPage checks both first). The entry gate opens first (P2, or the far-away heads-up), then the
 * step machine (src/lib/meetAPart.ts) runs the visit; every event saves the PartSession
 * (src/lib/meetAPartSave.ts, `toPatch`); 9b's yes keeps the part, the worried part's yes queues a candidate.
 */
export function MeetAPart() {
  const location = useLocation();
  const [entry] = useState<MeetEntry>(() => parseMeetEntry(location.state));
  const profile = useProfileContext('meet-a-part');
  const [content, setContent] = useState<{ parts: PartsContent; rounds: ShapeRoundLabels } | null>(null);
  const [gate, setGate] = useState<PartsEntry | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadMeetAPartContent().then((c) => { if (live) { if (c) setContent(c); else setFailed(true); } }).catch(() => { if (live) setFailed(true); });
    // A failed gate call is "clear": nothing ever locks.
    getPartsEntry(entry.partId).then((g) => { if (live) setGate(g); }).catch(() => { if (live) setGate(null); });
    return () => { live = false; };
  }, [entry.partId]);

  if (failed) return null;
  if (!content || gate === undefined || profile.status === 'loading') {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }
  const paused = isPaused(gate, entry);
  // A paused visit needs its line: without it the visit isn't shown, like any other missing copy.
  if (paused && !meetReady(content.parts, content.rounds, { paused })) return null;
  const known = profile.slices?.parts ?? [];
  return <MeetVisit entry={entry} plan={entryPlan(gate)} tooMany={showTooMany(gate, entry)} paused={paused} parts={content.parts} rounds={content.rounds} known={known} />;
}

type PickedChip = { id: string; branch: string; flag?: string | null };
type KnownPart = { id: string; name: string | null; tender: boolean; moveIds: string[]; safety?: boolean };

function MeetVisit({ entry, plan, tooMany, paused, parts, rounds, known }: {
  entry: MeetEntry; plan: EntryPlan; tooMany: boolean; paused: boolean; parts: PartsContent; rounds: ShapeRoundLabels; known: readonly KnownPart[];
}) {
  const toolSession = useToolSession();
  const band = useBand();
  useEffect(() => { band.load(); }, [band]);

  const visited = known.find((p) => p.id === entry.partId) ?? null;
  const start = useMemo(() => startingMove(parts, entry, visited?.moveIds), [parts, entry, visited]);
  const ctx: MeetContext = useMemo(() => meetContext(parts, plan, start.named, known), [parts, plan, start.named, known]);
  const [phase, setPhase] = useState<Phase>(() => ({ k: plan.open === 'p2' ? 'p2' : plan.open === 'heads_up' ? 'heads_up' : 'flow' }));
  const [st, setSt] = useState<MeetState>(() => initialMeet(ctx, { move: start.move, partId: visited?.id ?? null, trailheadKind: entry.trailheadKind }));
  const [own, setOwn] = useState(false);
  /** P2 runs outside the machine: on entry, the too-much link, a body aside. They ride with the session's own. */
  const [extra, setExtra] = useState<HandoffResult[]>([]);
  const [asideDone, setAsideDone] = useState(false);
  // A visit to a safety-line or danger part (its card's link; functions/src/safety/partSafetyFlag.ts) shows
  // crisis resources from the first screen to the last, alongside the visit, never instead of it.
  const partCrisis = visited?.safety === true;
  const entryCrisis = (plan.open === 'p2' && plan.crisis) || partCrisis;

  /** The flow's first real screen is still up (the too-many line shows there, once). */
  const [firstScreen, setFirstScreen] = useState(true);
  const send = (e: MeetEvent) => { setOwn(false); setAsideDone(false); setFirstScreen(false); setSt((x) => meetNext(x, e, ctx)); };
  const pick = (id: string, list: readonly PickedChip[]) => {
    const o = list.find((x) => x.id === id);
    if (o) send({ type: 'option', option: o });
  };
  const addHandoff = (r: HandoffResult) => setExtra((x) => [...x, r]);

  /* ── the PartSession: opened once there is something to say, then one save per event, in order ── */
  const [psId] = useState(newId);
  /** The PartSession is on the server (render-side twin of `started`). */
  const [opened, setOpened] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const started = useRef<Promise<boolean> | null>(null);
  const lastSaved = useRef('');
  const kept = useRef(false);
  const queued = useRef(false);
  const [newPartId] = useState(newId);
  /** The ToolSession links to the PartSession (DETAIL) once it was opened. */
  const detail = () => (started.current ? { detail: { kind: 'meet_a_part' as const, id: psId } } : {});
  const enqueue = (f: () => Promise<unknown>) => { queue.current = queue.current.then(f).catch(() => { /* the next save carries everything */ }); };
  const ensureStarted = () => {
    if (!started.current) {
      started.current = startPartSession(startRequest(psId, st.session, entry)).then(() => { setOpened(true); return true; }).catch(() => false);
      enqueue(() => started.current!);
    }
  };
  const save = (patch: PartSessionPatch, final: boolean) => {
    const key = JSON.stringify([patch, final]);
    if (key === lastSaved.current) return;
    lastSaved.current = key;
    enqueue(async () => { if (await started.current) await savePartSession({ id: psId, patch, ...(final ? { final } : {}) }); });
  };

  useEffect(() => {
    if (phase.k !== 'flow' || !toolSession.persisted) return;
    // Opened when the first real screen is answered at Find (its move and part are the session's), or at
    // once when the entry already named it.
    if (st.step === 'find' && !started.current) return;
    ensureStarted();
    save(toPatch(st, extra), st.step === 'done');
    if (!kept.current) {
      const keep = keepRequest(st, psId, newPartId);
      if (keep) { kept.current = true; enqueue(async () => { if (await started.current) await keepPart(keep); }); }
    }
    if (!queued.current) {
      const cand = candidateRequest(st, newId(), psId);
      if (cand) { queued.current = true; enqueue(async () => { if (await started.current) await queuePartCandidate(cand); }); }
    }
  }, [st, extra, phase.k]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const at = STEP_PART[st.step];
    if (at) toolSession.setStep(at);
    if (st.step === 'close') toolSession.markComplete();
    // P2's "come back later" ends the visit without the orienting close.
    if (st.step === 'done' && st.later) void toolSession.close({ status: 'exited_early', ...detail() });
  }, [st.step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the check-back question after the close (lane 2's part_checkback) ── */
  const [checkType, setCheckType] = useState<CheckbackType | null>(null);
  useEffect(() => {
    let live = true;
    getSpineContent().then((c) => { if (live) setCheckType(c.followUpTypes.find((t) => t.id === CHECKBACK_TYPE) ?? null); }).catch(() => { /* no question */ });
    return () => { live = false; };
  }, []);
  const [checkback, setCheckback] = useState<string | null>(null);
  // Most screens' Prompt takes focus as it opens; a screen without one (the close, the ending, P2) gets
  // its first heading or line, so a chip that moved the step on never drops focus to the page.
  const stepRoot = useRef<HTMLDivElement>(null);
  useStepFocus(stepRoot, `${phase.k}:${st.step}:${own}`);
  const askCheckback = offerCheckback(st, { content: parts, type: checkType, opened, paused });
  const answerCheckback = (id: string) => {
    if (checkback || !checkType) return;
    setCheckback(id);
    const req = id === CHECKBACK_YES ? checkbackRequest(checkType, newId(), psId, new Date()) : null;
    if (req) enqueue(async () => { if (await started.current) await schedulePartCheckback(req); });
  };

  const resumeDraft = () => (toolSession.persisted && toolSession.id ? { hostSessionId: toolSession.id, stepId: STEP_PART[st.step] ?? st.step, draft: {} } : undefined);
  const scheduleLater = toolSession.persisted && toolSession.id
    ? (chip: '1h' | 'evening' | 'tomorrow') => scheduleResumeLater(HOST, toolSession.id, chip) : undefined;

  const P = (id: string) => promptCopy(parts, id) ?? '';
  const chrome = meetChrome(parts);
  const s = st.session;
  const move = parts.moves.find((m) => m.id === s.move) ?? parts.moves[0];
  const sig = s.shape.some((n) => n !== 0) ? vecToSig(s.shape) : null;
  const ownLabel = stepOptions(parts, 'meet', 'any').find((o) => o.id === 'own_words')?.label ?? '';
  const fiveSenses = getToolById('five-senses');
  const groundingLink = (label: ReactNode) => {
    const to = toolSession.linkTo('five-senses');
    return <Link to={{ pathname: to.pathname }} state={to.state} className="den-chip den-chip--small">{label}</Link>;
  };

  /* ── the entry gate ── */
  if (phase.k === 'p2') {
    return (
      <div ref={stepRoot} className="space-y-5">
        {entryCrisis && <CrisisBanner />}
        <BreakdownHandoff host={HOST} band="flooded" blank={plan.open === 'p2' && plan.blank}
          resume={resumeDraft()} onScheduleLater={scheduleLater}
          onResume={(r) => { addHandoff(r); setPhase({ k: 'flow' }); }}
          onLater={(r) => {
            // Ended at the entry: the visit is recorded as that and nothing more.
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
  /** The last screen, whichever way the visit ended: the line and the house's Done. */
  const finale = (
    <div className="space-y-4 pt-2">
      <p className="font-serif text-xl text-[var(--color-text-primary)]">{P('meet_done')}</p>
      <Link to={doneTarget(entry)} className={`${primaryButton} inline-flex items-center justify-center`}>{chrome.finish}</Link>
    </div>
  );
  if (phase.k === 'ended') {
    return (
      <div ref={stepRoot} className="space-y-5">
        {entryCrisis && <CrisisBanner />}
        {band.content && <p className="text-[var(--color-text-primary)]">{band.content.handoff.later.scheduled}</p>}
        {finale}
      </div>
    );
  }
  const tooMuch = (
    <div className="flex justify-center">
      <TooMuchLink host={HOST} resume={resumeDraft} onScheduleLater={scheduleLater} onResult={addHandoff} />
    </div>
  );
  if (phase.k === 'heads_up') {
    const opts = stepOptions(parts, 'gate', 'dissociation');
    const look = opts.find((o) => o.id === HEADS_UP_LOOK);
    const goOn = opts.find((o) => o.id === HEADS_UP_GO_ON);
    return (
      <div ref={stepRoot} className="space-y-5">
        {entryCrisis && <CrisisBanner />}
        <Prompt serif>{P(HEADS_UP_PROMPT)}</Prompt>
        <div className="flex flex-wrap gap-2.5">
          {look && groundingLink(look.label)}
          {goOn && <Chip label={goOn.label} onClick={() => setPhase({ k: 'flow' })} />}
        </div>
        {tooMuch}
      </div>
    );
  }

  /* ── the visit ── */
  const step = st.step;
  const opts = (sub: string, flow = 'meet') => optionsFor(parts, flow, sub, s.move);
  const chips = (sub: string, withOwn = false) => (
    <Chips options={opts(sub)} onPick={(id) => pick(id, opts(sub))} {...(withOwn ? { ownLabel, onOwn: () => setOwn(true) } : {})} />
  );
  const figure = (size: number) => <div className="flex justify-center"><PartFigure shapeSig={sig} size={size} /></div>;
  const p2Open = step === 'blendBody' || (step === 'thank' && st.aside === 'body' && !asideDone);

  let body: ReactNode = null;
  if (own && (step === 'voice' || step === 'job' || step === 'fear')) {
    body = <OwnWords label={P(`meet_${step}`)} fieldLabel={ownLabel} backLabel={chrome.back} nextLabel={chrome.next} max={MEET_OWN_WORDS_MAX}
      onDone={(text) => send({ type: 'ownWords', text })} onBack={() => setOwn(false)} />;
  } else {
    switch (step) {
      case 'find': {
        const others = known.filter((p) => !p.tender && p.name).slice(0, 3);
        const found = opts('find');
        body = (<>
          <Prompt>{P('meet_find')}</Prompt>
          <div className="flex flex-wrap gap-2.5">
            {parts.moves.map((m) => <Chip key={m.id} label={m.label} pressed={m.id === s.move && start.named} onClick={() => send({ type: 'find', move: m.id })} />)}
            {others.map((p) => <Chip key={p.id} own label={p.name} onClick={() => send({ type: 'find', move: p.moveIds.find((m) => parts.moves.some((x) => x.id === m)) ?? s.move, partId: p.id })} />)}
            {found.map((o) => <Chip key={o.id} label={o.label} pressed={s.findId === o.id} onClick={() => pick(o.id, found)} />)}
          </div>
        </>);
        break;
      }
      case 'blend':
        body = (<><Prompt>{P('gate_blend_check')}</Prompt>
          <Chips options={opts('blend', 'gate')} onPick={(id) => pick(id, opts('blend', 'gate'))} /></>);
        break;
      case 'blendBody':
        body = (<>
          <BreakdownHandoff host={HOST} band={st.p2?.band ?? 'stirred'} blank={plan.open === 'p2' && plan.blank}
            startLater={st.p2?.start === 'later'} resume={resumeDraft()} onScheduleLater={scheduleLater}
            onResume={(r) => send({ type: 'p2', outcome: r.overridden ? 'override' : 'resume', result: r })}
            onLater={(r) => send({ type: 'p2', outcome: 'later', result: r })} />
          {st.later && <button type="button" className={linkButton} onClick={() => send({ type: 'continue' })}>{chrome.next}</button>}
        </>);
        break;
      case 'where':
        body = <WhereScreen prompt={P('meet_where')} nextLabel={chrome.next} resumeLine={st.resumeNote ? band.content?.handoff.resumeLine ?? null : null}
          quiet={opts('where')} onPlace={(place) => send({ type: 'place', place })} onQuiet={(id) => pick(id, opts('where'))} />;
        break;
      case 'shape':
        body = <ShapeScreen key={st.round} prompt={P('meet_shape')} round={st.round} rounds={SHAPE_ROUNDS} shape={s.shape}
          labels={rounds[st.round]} quiet={opts('shape')} onShape={(shape) => send({ type: 'shape', shape })} onQuiet={(id) => pick(id, opts('shape'))} />;
        break;
      case 'age': body = (<>{figure(112)}<Prompt>{P('meet_age')}</Prompt>{chips('age')}</>); break;
      case 'young': body = (<><Prompt serif>{P('meet_age_young')}</Prompt>{chips('age_young')}</>); break;
      case 'voice': body = (<><Prompt>{P('meet_voice')}</Prompt>{chips('voice', true)}</>); break;
      case 'feel': {
        const all = opts('feel');
        body = (<>
          {figure(96)}
          <Prompt>{P('meet_feel')}</Prompt>
          {[true, false, null].map((self) => {
            const group = all.filter((o) => o.selfLike === self);
            return group.length ? <Chips key={String(self)} options={group} onPick={(id) => pick(id, all)} /> : null;
          })}
        </>);
        break;
      }
      case 'unblend': body = (<><Prompt serif>{P('meet_unblend')}</Prompt>{chips('unblend')}</>); break;
      case 'unblendEnd': body = (<><Prompt serif>{P('meet_unblend_end')}</Prompt><Line>{P('meet_unblend_later')}</Line>{chips('unblend_later')}</>); break;
      case 'nothing': body = (<><Prompt serif>{P('meet_nothing')}</Prompt>{chips('nothing')}</>); break;
      case 'job': body = (<><Prompt>{P('meet_job')}</Prompt>{chips('job', true)}</>); break;
      case 'likes': body = (<><Prompt>{P('meet_likes')}</Prompt>{chips('likes')}</>); break;
      case 'guards': {
        const hurts = guardsFor(parts, s.move);
        const rest = opts('guards');
        body = (<>
          <Prompt>{P('meet_guards')}</Prompt>
          <div className="flex flex-wrap gap-2.5">
            {hurts.map((h) => <Chip key={h.id} label={h.label} onClick={() => send({ type: 'hurt', hurtId: h.id })} />)}
            {rest.map((o) => <Chip key={o.id} label={o.label} onClick={() => pick(o.id, rest)} />)}
          </div>
        </>);
        break;
      }
      case 'front': {
        // 5d: their other parts by name (a tender one too, by its name only), then the two that aren't a part.
        const byId = new Map(known.map((p) => [p.id, p]));
        const rest = opts('front').filter((o) => o.id === FRONT_NONE || o.id === FRONT_NOT_SURE);
        body = (<>
          <Prompt>{P(FRONT_PROMPT)}</Prompt>
          <div className="flex flex-wrap gap-2.5">
            {frontChoices(s, ctx).map((id) => <Chip key={id} own label={byId.get(id)?.name ?? ''} onClick={() => send({ type: 'front', partId: id })} />)}
            {rest.map((o) => <Chip key={o.id} label={o.label} onClick={() => pick(o.id, rest)} />)}
          </div>
        </>);
        break;
      }
      case 'fear': body = (<><Prompt>{P('meet_fear')}</Prompt>{chips('fear', true)}</>); break;
      case 'stop':
        body = (<>
          <Prompt serif size="large">{P('meet_stop_title')}</Prompt>
          <Line serif>{P('meet_stop_body')}</Line>
          <Line>{P('meet_stop_therapist')}</Line>
          {chips('stop')}
        </>);
        break;
      case 'update': body = (<><Prompt>{P('meet_update')}</Prompt>{chips('update')}</>); break;
      case 'canNow': body = (<><Prompt>{P('meet_update_show')}</Prompt>{chips('update_show')}</>); break;
      case 'thank':
        if (p2Open) {
          // "Something for the body" on the way to Thanks: P2's first primitive, in the page.
          body = <BreakdownHandoff host={HOST} band={ctx.p2Band ?? 'stirred'} blank={plan.open === 'p2' && plan.blank} startWithPrimitive
            onResume={(r) => { addHandoff(r); setAsideDone(true); }} />;
        } else {
          body = (<>
            {st.aside === 'grounding' && fiveSenses && <div className="flex">{groundingLink(<><span aria-hidden="true">{fiveSenses.emoji}</span> {fiveSenses.name}</>)}</div>}
            <LightHold title={<Prompt>{P('meet_thank')}</Prompt>} holdLabel={P('meet_thank_hold')} holdHint={P(HOLD_HINT)} doneLabel={P('meet_thank_done')} nextLabel={chrome.next}
              figure={<PartFigure shapeSig={sig} size={80} />} onDone={() => send({ type: 'hold' })} />
          </>);
        }
        break;
      case 'tender':
        body = <LightHold title={<Prompt serif size="large">{P('meet_tender')}</Prompt>} sub={<Line serif>{P('meet_tender_sub')}</Line>}
          holdLabel={P('meet_thank_hold')} holdHint={P(HOLD_HINT)} nextLabel={chrome.next} onDone={() => send({ type: 'hold' })} />;
        break;
      case 'rather': body = (<><Prompt>{P('meet_rather')}</Prompt>{chips('rather')}</>); break;
      case 'name':
        body = <NameScreen prompt={P('meet_name')} nextLabel={chrome.next} max={meetLimits(parts).nameMaxChars} quiet={opts('name')}
          suggestion={visited?.name ?? (s.tender ? null : move?.nameHint ?? null)}
          onName={(name) => send({ type: 'name', name })} onQuiet={(id) => pick(id, opts('name'))} />;
        break;
      case 'keep':
        body = (<>
          <div className="flex items-center gap-4">
            <PartFigure shapeSig={sig} size={72} />
            {s.name && <p className="font-serif text-2xl text-[var(--color-text-primary)]">{s.name}</p>}
          </div>
          <Prompt>{P('meet_keep')}</Prompt>
          {chips('keep')}
        </>);
        break;
      case 'close':
      case 'done':
        // After P2's "come back later" there is no close question: its own line stays.
        if (st.later) { body = (<>{band.content && <Line>{band.content.handoff.later.scheduled}</Line>}{step === 'done' && finale}</>); break; }
        // One instance across both steps, so its "saved" line stays once answered.
        body = (<>
          <SessionClose kind="orienting" {...(opened ? { detail: { kind: 'meet_a_part' as const, id: psId } } : {})}
            onAnswered={(input) => send({ type: 'close', choiceId: input.thenVsNow ?? null })}
            onSkipped={() => send({ type: 'close', choiceId: null })} />
          {(askCheckback || checkback) && (<>
            <Prompt>{P(CHECKBACK_PROMPT)}</Prompt>
            <Chips options={stepOptions(parts, 'meet', 'close').filter((o) => o.id === CHECKBACK_YES || o.id === CHECKBACK_NO)}
              picked={checkback} onPick={answerCheckback} />
          </>)}
          {step === 'done' && finale}
        </>);
        break;
    }
  }

  const track = MEET_TRACK[step];
  return (
    <div className="space-y-5">
      {(st.crisis || entryCrisis) && <CrisisBanner />}
      {track !== undefined && (
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => <span key={i} className={`h-1 flex-1 rounded ${i < track ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-border)]'}`} />)}
        </div>
      )}
      {paused && firstScreen && <p role="status" className={secondaryText}>{P(PAUSED_PROMPT)}</p>}
      {tooMany && firstScreen && promptCopy(parts, TOO_MANY_PROMPT) && <p role="status" className={secondaryText}>{P(TOO_MANY_PROMPT)}</p>}
      <div ref={stepRoot} key={step === 'done' || step === 'close' ? 'close' : `${step}:${own}`} className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]">{body}</div>
      {!p2Open && step !== 'done' && tooMuch}
    </div>
  );
}
