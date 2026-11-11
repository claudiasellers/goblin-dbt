import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { HandoffResult, ThenVsNow } from '../../data/capacityTypes';
import { PROFILE_NEEDS, type ClientProfileConsumer } from '../../data/profileTypes';
import { emotions, getEmotionById } from '../../data/emotions';
import type { ExitDef, FieldDef, SkillDef, SkillsContent, StepDef } from '../../data/skillTypes';
import { getToolById } from '../../data/tools';
import { useToolSession } from '../../hooks/useToolSession';
import { useProfileContext } from '../../hooks/useProfileContext';
import { ToolSessionProvider } from '../../contexts/ToolSessionContext';
import { newId } from '../../lib/spine/ids';
import { dueAtFor } from '../../lib/spine/windows';
import { profileCache } from '../../lib/profileCache';
import { handoffExt } from '../../lib/bandStore';
import { closeQuestion, closeKindFor } from '../../lib/spine/close';
import { emotionIdsFromLink } from '../../lib/spine/toolLink';
import {
  askFresh, canGoOn, carried as carriedOf, contextIn, copyText, crisisFor, ctxAfterResume, seededFrom, stepLinks, emotionChoices, fieldLinks, fieldList, followUpFor,
  handoffLine, initialRun, inlineResult, keepFor, optionGroups, ownMaxOf, persistence, pickedLabels, resumeRun, runEmotionIds, runNext, runRecord,
  scope, shownFields, stepOf, titleSlots,
  type Answer, type RunContext, type RunEvent, type RunState,
} from '../../lib/skillRuntime/machine';
import { holds } from '../../lib/skillRuntime/conditions';
import { getSkillRun, getSkillsContent } from '../../services/skills';
import { getSpineContent, scheduleFollowUps } from '../../services/spine';
import { keepProfileItem } from '../../services/profile';
import { TooMuchLink } from '../capacity/TooMuchLink';
import { CrisisBanner } from '../safety/CrisisBanner';
import { SafetyOpen } from '../safety/SafetyOpen';
import { QuickExit } from '../safety/QuickExit';
import { useBand } from '../../hooks/useBand';
import { SessionClose } from '../spine/SessionClose';
import { EmotionPicker } from '../tools/EmotionPicker';
import { Chip, Line, Prompt } from '../tools/wiseMind/bits';
import { choiceButton, linkButton, primaryButton, secondaryText } from '../tools/oppositeAction/styles';
import { EMBEDS, EMBED_OUTPUTS, EMBED_PROPS } from './embeds';
import { resolveEmbedProps } from '../../lib/skillRuntime/embedProps';

/**
 * The skill player (docs/design/skill-runtime.md): runs any skill from skills.json inside the page's
 * ToolSessionProvider. The step machine (src/lib/skillRuntime/machine.ts) decides; this renders it and keeps
 * the visit's ToolSession current (`setStep`, `ext.run`, the feeling, the ask-fresh answer).
 *
 * Safety and overwhelm, as every tool without a band gate: TooMuchLink (P2) under every screen, its
 * hand-offs recorded in `ext.run.handoffs`; no band gate and no capacity question. Leaving (an offer, a
 * quiet link, Done) asks the tool's close question first, then goes through `linkTo` with the exit's
 * emotions and query, so the next tool's session is linked to this one.
 *
 * A step may show crisis resources (its `crisis` slots) above its questions, and any skill may offer the reserved
 * `safety.open` exit: it opens the crisis resources over the skill (SafetyOpen), the run underneath, and going
 * back returns to the same screen. A whole-screen embed step hands the screen to its embed; its `onDone` output
 * goes into the run (docs/design/dbt-modules-plan.md C1, C3a).
 *
 * F2: the tool's profile slices (PROFILE_NEEDS) feed `$p.*` and kept-item options; a step's keep and follow-up
 * run on its primary tap (the tap is the yes; a failure never stops the run); `?run=<sessionId>&at=<stepId>`
 * reopens the person's own earlier run (R9); `mode="inline"` runs the skill inside a host screen with its own
 * session (entry `embedded`, the host's session as `hostSessionId`), no close question and no P2 link of its own
 * (the host has them), and hands `onReturn` its `returns` answers when it reaches its hand-off or the person
 * goes back (R8).
 */
export interface InlineReturn {
  /** The `returns` fields' answers (own words included: the host shows them back in this visit only). */
  answers: Record<string, Answer>;
  /** Reached its end (true) or the person went back early (false). */
  finished: boolean;
}

export function SkillPlayer({ skillId, mode = 'page', enterAt, hostSessionId, onReturn, resumeKeepsFresh }: {
  skillId: string;
  mode?: 'page' | 'inline';
  /** Inline: the step to start at (one the skill's `inline.enterAt` lists; otherwise its start). */
  enterAt?: string;
  /** Inline: the host's ToolSession id. */
  hostSessionId?: string;
  onReturn?: (r: InlineReturn) => void;
  /** The review page only (dev/skills-review.tsx): a resumed run keeps its ask-fresh answers, so every step shows. */
  resumeKeepsFresh?: boolean;
}) {
  const [content, setContent] = useState<SkillsContent | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    getSkillsContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  const skill = content?.skills.find((s) => s.id === skillId) ?? null;
  if (failed || (content && !skill)) return null;
  if (!content || !skill) {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }
  if (mode === 'inline') {
    if (!skill.inline || !hostSessionId) return null;
    return (
      <ToolSessionProvider toolId={skill.toolId} inside={{ hostSessionId }}>
        <SkillRun skill={skill} content={content} inline={{ enterAt, onReturn }} />
      </ToolSessionProvider>
    );
  }
  return <SkillRun skill={skill} content={content} resumeKeepsFresh={resumeKeepsFresh} />;
}

const needsProfile = (toolId: string) => ((PROFILE_NEEDS as Record<string, readonly string[]>)[toolId]?.length ?? 0) > 0;
const UUID = /^[0-9a-f-]{36}$/i;

const GRID = new Set(emotions.map((e) => e.id));
const emotionLabel = (id: string) => (getEmotionById(id)?.name ?? id.replace(/_/g, ' ')).toLowerCase();

/**
 * Context in: the query's keys, then route state's `skillCtx`, narrowed by `contextIn` to what the skill accepts.
 * The band never comes from a link: a hand-off's route state carries it, else the person's carried reading
 * (`band.current()`, ≤ 20 min, C6.2), never asked or inferred (D1).
 */
function contextFrom(skill: SkillDef, search: string, state: unknown, carriedBand: string | null): Record<string, string> {
  const { band: _band, ...q } = Object.fromEntries(new URLSearchParams(search));
  void _band;
  const fromState = (state && typeof state === 'object' && 'skillCtx' in state ? (state as { skillCtx?: unknown }).skillCtx : null);
  const st = fromState && typeof fromState === 'object' ? fromState as Record<string, unknown> : {};
  return contextIn(skill, { ...q, ...(carriedBand && typeof st.band !== 'string' ? { band: carriedBand } : {}), ...st });
}

/** Emotions the visit was opened with: `?feel=<grid id>` first, then a hand-off's or check-in's words. */
function carriedFrom(search: string, state: unknown): string[] {
  const feel = new URLSearchParams(search).get('feel');
  return [...new Set([...(feel ? [feel] : []), ...emotionIdsFromLink(state)])].filter((id) => GRID.has(id));
}

function SkillRun({ skill, content, inline, resumeKeepsFresh }: {
  skill: SkillDef; content: SkillsContent; inline?: { enterAt?: string; onReturn?: (r: InlineReturn) => void }; resumeKeepsFresh?: boolean;
}) {
  const toolSession = useToolSession();
  const navigate = useNavigate();
  const location = useLocation();
  const band = useBand();
  // Inline, the host owns the address: nothing is read from it.
  const [carried] = useState(() => (inline ? [] : carriedFrom(location.search, location.state)));
  // A link's `enterAt` is for the run it reopens (R9): with no `?run=` to reopen, it doesn't hold from the start.
  const [ctxIn, setCtxIn] = useState(() => {
    if (inline) return {};
    const c = contextFrom(skill, location.search, location.state, band.current()?.value ?? null);
    return UUID.test(new URLSearchParams(location.search).get('run') ?? '') ? c : ctxAfterResume(c, false);
  });
  const profile = useProfileContext(skill.toolId as ClientProfileConsumer, { enabled: needsProfile(skill.toolId) });
  const slices = profile.slices as Record<string, unknown> | null;
  const ctx = useMemo<RunContext>(() => ({
    skill, shared: { parentOf: content.parentOf, fitsWhen: content.fitsWhen }, carried, gridIds: GRID, emotionLabel, ctxIn,
    embedOutputs: EMBED_OUTPUTS, profile: slices,
  }), [skill, content, carried, ctxIn, slices]);
  const [safetyOpen, setSafetyOpen] = useState(false);
  // P2 (This is too much right now) over the step: an embed hears it as `covered`, with safety.open.
  const [p2Open, setP2Open] = useState(false);
  const [st, setSt] = useState<RunState>(() => initialRun(skill, inline?.enterAt));
  // A new step starts uncovered (P2 left open by a path that didn't say so never stops a later clock).
  useEffect(() => { setP2Open(false); }, [st.stepId]);
  // Resume (R9): `?run=<sessionId>&at=<stepId>` reopens the person's own run of this tool, or starts fresh.
  const [resumeFrom] = useState(() => {
    if (inline) return null;
    const q = new URLSearchParams(location.search);
    const run = q.get('run');
    return run && UUID.test(run) ? { run, at: q.get('at') } : null;
  });
  const [resuming, setResuming] = useState(!!resumeFrom);
  // A run with kept items among its options reopens once the profile has answered (ready, error or signed
  // out), so those picks aren't read as options it no longer offers and dropped.
  const profileSettled = !needsProfile(skill.toolId) || profile.status !== 'loading';
  const resumed = useRef(false);
  const reopenedRef = useRef(false);
  useEffect(() => {
    if (!resumeFrom || !profileSettled || resumed.current) return;
    resumed.current = true;
    getSkillRun(resumeFrom.run, skill.toolId)
      .then((rec) => {
        const r = resumeRun(ctx, rec, resumeFrom.at, { keepFresh: !!resumeKeepsFresh });
        if (r) { reopenedRef.current = !!stepOf(skill, r.stepId).reopens; setSt(r); }
        else setCtxIn((c) => ctxAfterResume(c, false));
      })
      // Nothing to reopen: a fresh run, and a whole first visit (the link's enterAt was for the run it named).
      .catch(() => setCtxIn((c) => ctxAfterResume(c, false)))
      .finally(() => setResuming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileSettled]);
  const [busy, setBusy] = useState(false);
  const [saveNote, setSaveNote] = useState(false);
  const [leaving, setLeaving] = useState<ExitDef | null>(null);
  const [quietLeave, setQuietLeave] = useState(false);
  // Answered: stay on the close so its tag row ("Was this a part you know?") can show, then go on a tap.
  const [answered, setAnswered] = useState(false);
  const handoffs = useRef<HandoffResult[]>([]);
  const leavingRef = useRef(false);
  useEffect(() => { if (!leaving) leavingRef.current = false; }, [leaving, st.stepId]);
  const send = useCallback((e: RunEvent) => setSt((s) => runNext(ctx, s, e)), [ctx]);
  const step = stepOf(skill, st.stepId);

  // Persist-nothing (R15): a deferred visit starts only when there is something to keep (the run reaches its end, or
  // a step schedules a check-in) and the run says it may; it closes bare if an answer changed after that.
  const persist = persistence(ctx, st);
  useEffect(() => {
    if (persist === 'save' && step.complete) toolSession.begin();
    // Bare unless the run may save: going back to the first question after the visit began keeps it bare until the
    // answer is given again.
    toolSession.setBare(persist !== 'save');
  }, [persist, step.complete, toolSession]);

  // The session always carries what the run has said so far, so whichever close happens sends it.
  useEffect(() => {
    toolSession.setStep(st.stepId);
    toolSession.setExt({ run: runRecord(ctx, st) });
    // A run reopened at a `reopens` step (a review afterwards) is a new visit about the same plan: the feeling
    // was the first visit's, so it isn't counted again here.
    toolSession.setEmotionIds(reopenedRef.current ? [] : runEmotionIds(ctx, st));
    const fresh = askFresh(ctx, st);
    toolSession.setFitsFacts((fresh.fitsFacts as Parameters<typeof toolSession.setFitsFacts>[0]) ?? null);
    if (stepOf(skill, st.stepId).complete) toolSession.markComplete();
  }, [st, ctx, skill, toolSession]);

  /** Go: after the close question (answered or skipped), or at once when there is none to ask. */
  const go = useCallback((exit: ExitDef) => {
    if (exit.done || !exit.toolId) return;
    const to = toolSession.linkTo(exit.toolId, { checkinEmotions: carriedOf(exit, st) });
    const q = new URLSearchParams(exit.query).toString();
    navigate({ pathname: to.pathname, search: q ? `?${q}` : '' }, { state: to.state });
  }, [toolSession, navigate, st]);

  /**
   * The step's follow-up (R5), when it has one to schedule now: its time from the type's window and the chip
   * picked. False when it didn't save (the person goes on regardless).
   */
  const scheduleStep = useCallback(async (): Promise<boolean> => {
    const f = followUpFor(ctx, step, st);
    if (!f) return true;
    try {
      // A deferred session (R15) begins here: the follow-up hangs off it.
      toolSession.begin();
      if (!(await toolSession.ready())) throw new Error('no session');
      const spine = await getSpineContent();
      const type = spine.followUpTypes.find((t) => t.id === f.type && t.enabled);
      const due = type ? dueAtFor(type.window, new Date(), f.chip ?? undefined) : null;
      if (!type || !due) throw new Error('no window');
      const id = newId();
      await scheduleFollowUps([{ id, type: f.type, dueAt: due.toISOString(), ...(f.chip ? { window: f.chip } : {}) }],
        { sourceSessionId: toolSession.id, sourceToolId: skill.toolId });
      send({ type: 'scheduled', stepId: step.id, followUpType: f.type, id });
      return true;
    } catch { return false; }
  }, [ctx, step, st, send, toolSession, skill.toolId]);

  const leave = useCallback(async (exit: ExitDef) => {
    if (exit.planned) return;
    if (exit.safety) {
      // Not a way out: the resources open over the skill, and the run stays where it was.
      send({ type: 'shown', record: 'safety_open' });
      setSafetyOpen(true);
      return;
    }
    // A hand-off's reminder chip (R5 on a hand-off): scheduled as the person leaves the card, by its move or by
    // Done, before anything navigates. No chip picked, nothing scheduled.
    // `leavingRef`, not `busy`: two taps in one frame both see busy false, and would schedule twice. It stays set
    // while this card is being left, and clears when the run is on another step or back on the card.
    if (leavingRef.current) return;
    if (step.kind === 'handoff' && followUpFor(ctx, step, st)) {
      leavingRef.current = true;
      setBusy(true);
      const ok = await scheduleStep();
      setBusy(false);
      if (!ok) setSaveNote(true);
    }
    send({ type: 'exit', exitId: exit.id });
    setLeaving(exit);
    // A hand-off that asks no close (`noClose`: after a danger route) leaves at once, the session closed completed.
    // So does a run that writes nothing (R15): there is nothing to ask the close for.
    if (stepOf(skill, st.stepId).noClose || persistence(ctx, st) !== 'save') {
      setQuietLeave(true);
      void toolSession.close({ status: 'completed' });
      go(exit);
      return;
    }
    // With no close question to ask (none for this tool, or its copy can't load), leave at once.
    getSpineContent().then((c) => {
      if (!closeQuestion(c.closeFlow, skill.toolId, closeKindFor(skill.toolId))) throw new Error('no close');
    }).catch(() => {
      void toolSession.close({ status: 'completed' });
      go(exit);
    });
  }, [send, skill, st, step, ctx, scheduleStep, toolSession, go]);

  const onShown = useCallback((record: string) => send({ type: 'shown', record }), [send]);

  /**
   * The step's primary tap: its keep (R4) and follow-up (R5) first, then on. The tap is the yes. A failed save
   * never holds the person here: the run goes on and a quiet line says it didn't save.
   */
  const primary = useCallback(async () => {
    const k = keepFor(ctx, step, st);
    const f = followUpFor(ctx, step, st);
    if (k || f) {
      setBusy(true);
      let failed = false;
      if (k) {
        try {
          // A deferred session (R15) begins here: the keep links to it.
          toolSession.begin();
          const id = k.id ?? (step.keep?.many ? newId() : undefined);
          const r = await keepProfileItem({ kind: k.kind, ...(id ? { id } : {}), value: k.value, sourceSessionId: toolSession.id });
          profileCache.clear();
          send({ type: 'kept', stepId: step.id, kind: k.kind, id: r.id });
        } catch { failed = true; }
      }
      if (f && !(await scheduleStep())) failed = true;
      setSaveNote(failed);
      setBusy(false);
    }
    send({ type: 'next' });
  }, [ctx, step, st, send, toolSession, scheduleStep]);

  // Inline: the hand-off is the way back to the host (R8). The sub-run asks no close of its own; its change
  // check, if it has one, is its then-vs-now (C1 rule 5).
  const returned = useRef(false);
  const giveBack = useCallback((finished: boolean) => {
    if (!inline || returned.current) return;
    returned.current = true;
    const r = inlineResult(ctx, st);
    const tvn = r?.thenVsNow as ThenVsNow | null | undefined;
    void toolSession.close({ status: finished ? 'completed' : 'exited_early', ...(tvn ? { thenVsNow: tvn } : {}) });
    inline.onReturn?.({ answers: r?.answers ?? {}, finished });
  }, [inline, ctx, st, toolSession]);
  useEffect(() => { if (inline && step.kind === 'handoff') giveBack(true); }, [inline, step.kind, giveBack]);

  let body: ReactNode;
  if (resuming) {
    body = (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  } else if (inline && step.kind === 'handoff') {
    body = null;
  } else if (leaving) {
    body = (
      <div className="space-y-4">
        {!quietLeave && <SessionClose onAnswered={() => setAnswered(true)} onSkipped={() => go(leaving)} />}
        {!leaving.done && leaving.toolId && answered && (
          <button type="button" className={primaryButton} onClick={() => go(leaving)}>
            {getToolById(leaving.toolId)?.name ?? 'Continue'} →
          </button>
        )}
        {leaving.done && (
          <div className="flex justify-center"><Link to="/tools" className={linkButton}>All tools</Link></div>
        )}
      </div>
    );
  } else if (step.kind === 'handoff') {
    body = <HandoffCard ctx={ctx} step={step} st={st} send={send} onExit={leave} busy={busy} />;
  } else if (step.kind === 'embed') {
    body = <EmbedStep ctx={ctx} step={step} st={st} send={send} onShown={onShown} onExit={leave} covered={safetyOpen || p2Open} />;
  } else {
    body = <AskStep ctx={ctx} step={step} st={st} send={send} onExit={leave} onShown={onShown} onPrimary={primary} busy={busy} />;
  }

  return (
    <div className="space-y-5" data-testid="skill-player" data-skill={skill.id} data-step={st.stepId}>
      {skill.quickExit && !inline && <QuickExit />}
      {/* safety.open sits over the step, which stays mounted (a hold keeps its time) and comes back as it was. P2 is
          modal too: under it the step is inert, so a step that moves on underneath can't take focus from the dialog. */}
      {safetyOpen && <SafetyOpen onBack={() => setSafetyOpen(false)} />}
      <div key={leaving ? 'leaving' : st.stepId} hidden={safetyOpen} inert={safetyOpen || p2Open} className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]">{body}</div>
      {saveNote && <p role="status" className={`${secondaryText} text-center`}>{skill.copy.save_failed ?? "That didn't save just now. You can carry on."}</p>}
      {inline && !safetyOpen && (
        <div className="flex justify-center">
          <button type="button" className={linkButton} onClick={() => giveBack(false)}>{skill.copy.inline_back ?? 'Back to where I was'}</button>
        </div>
      )}
      {!inline && !leaving && !safetyOpen && (
        <div className="flex justify-center">
          <TooMuchLink host={skill.toolId} onOpen={() => setP2Open(true)} onClose={() => setP2Open(false)} onResult={(r) => {
            handoffs.current.push(r);
            toolSession.setExt({ run: { handoffs: handoffExt(handoffs.current) } });
          }} />
        </div>
      )}
    </div>
  );
}

function AskStep({ ctx, step, st, send, onExit, onShown, onPrimary, busy }: {
  ctx: RunContext; step: StepDef; st: RunState; send: (e: RunEvent) => void; onExit: (x: ExitDef) => void; onShown: (record: string) => void;
  onPrimary: () => void; busy: boolean;
}) {
  const c = ctx.skill.copy;
  const sc = scope(ctx, st);
  const fields = shownFields(ctx, step, st, sc);
  const title = copyText(ctx, step.title, st, titleSlots(ctx, step, st));
  const [picker, setPicker] = useState<string | null>(null);
  if (picker) {
    const f = fields.find((x) => x.id === picker);
    return (
      <EmotionPicker prompt={title ?? undefined} selectionMode="single" selectedIds={st.answers[picker]?.ids ?? []}
        onChange={(ids) => { if (ids[0] && f) send({ type: 'pick', fieldId: f.id, value: ids[0] }); }}
        onContinue={() => setPicker(null)} />
    );
  }
  const crisis = crisisFor(ctx, step, st);
  return (<>
    {title && <Prompt>{title}</Prompt>}
    {step.hint && c[step.hint] && <Line>{c[step.hint]}</Line>}
    {fields.map((f, i) => {
      const slots = (step.slots ?? []).filter((s) => s.after === f.id);
      return (
        <div key={f.id} className="space-y-3" aria-live={i > 0 ? 'polite' : undefined}>
          <FieldView ctx={ctx} field={f} st={st} send={send} onMore={() => setPicker(f.id)} onExit={onExit} />
          {slots.map((s) => {
            const Embed = EMBEDS[s.embed];
            const show = holds(s.showWhen, sc);
            return (
              <div key={`${s.embed}:${s.record}`} className="min-h-6">
                {Embed && show ? <Embed props={embedProps(ctx, s.embed, s.props)} ctx={ctx.ctxIn ?? {}} picked={pickedLabels(ctx, st)} answerIds={answerIds(st)} onShown={() => onShown(s.record)} /> : null}
              </div>
            );
          })}
        </div>
      );
    })}
    {/* Under the question, so the chip that raised it stays where it was tapped. */}
    {crisis && <div aria-live="polite"><CrisisBanner compact variant={crisis.variant} /></div>}
    {step.note && c[step.note] && <p className={secondaryText}>{c[step.note]}</p>}
    <button type="button" className={primaryButton} disabled={busy || !canGoOn(ctx, st)} aria-busy={busy} onClick={onPrimary}>
      {(step.primary && c[step.primary]) || c.next || 'Next'}
    </button>
  </>);
}

/** An embed's props as it receives them: only what EMBED_PROPS declares, copy keys swapped for the skill's text. */
function embedProps(ctx: RunContext, name: string, props: Record<string, unknown> | undefined) {
  return resolveEmbedProps(EMBED_PROPS[name], props, ctx.skill.copy);
}

/** The run's answers as ids, for an embed that asks the server about them (the witness beat's emotions). */
function answerIds(st: RunState): Record<string, readonly string[]> {
  return Object.fromEntries(Object.entries(st.answers).map(([k, a]) => [k, a.ids]));
}

/** A whole-screen embed step: the embed owns the screen; its `onDone` output moves the run on. */
function EmbedStep({ ctx, step, st, send, onShown, onExit, covered }: {
  ctx: RunContext; step: StepDef; st: RunState; send: (e: RunEvent) => void; onShown: (record: string) => void; onExit: (x: ExitDef) => void;
  covered: boolean;
}) {
  const Embed = step.embed ? EMBEDS[step.embed] : undefined;
  const title = copyText(ctx, step.title, st, titleSlots(ctx, step, st));
  const crisis = crisisFor(ctx, step, st);
  const shown = useCallback(() => onShown(step.embed ?? step.id), [onShown, step.embed, step.id]);
  if (!Embed) return null;
  return (<>
    {crisis && <CrisisBanner compact variant={crisis.variant} />}
    {title && <Prompt>{title}</Prompt>}
    <Embed props={embedProps(ctx, step.embed ?? '', step.props)} ctx={ctx.ctxIn ?? {}} picked={pickedLabels(ctx, st)} answerIds={answerIds(st)}
      onShown={shown} onDone={(output) => send({ type: 'embedDone', output })} covered={covered} />
    <StepLinks ctx={ctx} step={step} st={st} onExit={onExit} />
  </>);
}

/** An embed or hand-off screen's quiet links (an ask step's are on its fields). Never held while something saves. */
function StepLinks({ ctx, step, st, onExit }: { ctx: RunContext; step: StepDef; st: RunState; onExit: (x: ExitDef) => void }) {
  const links = stepLinks(ctx, step, st);
  if (!links.length) return null;
  return (<>
    {links.map((l) => (
      <div key={l.exit.id} className="flex justify-center" data-step-link={l.exit.id}>
        <button type="button" className={linkButton} onClick={() => onExit(l.exit)}>{l.label}</button>
      </div>
    ))}
  </>);
}

function FieldView({ ctx, field, st, send, onMore, onExit }: {
  ctx: RunContext; field: FieldDef; st: RunState; send: (e: RunEvent) => void; onMore: () => void; onExit: (x: ExitDef) => void;
}) {
  const c = ctx.skill.copy;
  const a = st.answers[field.id];
  // A seed field (own.seed): a chip is pressed while the box holds its words unchanged; once the words are the
  // person's own, the chips step aside, so a tap can never erase what they wrote.
  const seeded = field.own?.seed ? seededFrom(ctx, field, a) : null;
  const picked = (v: string) => (field.own?.seed ? seeded === v : !!a?.ids.includes(v));
  const startersHidden = !!field.own?.seed && !!a?.own?.trim() && seeded === null;
  const [ownOpen, setOwnOpen] = useState(!!field.own?.open || !!a?.own);
  const list = fieldList(ctx, field, st);
  const label = field.label ? c[field.label] : null;
  const pick = (value: string) => send({ type: 'pick', fieldId: field.id, value });

  let chips: ReactNode;
  if (field.options.emotions) {
    chips = (
      <div className="flex flex-wrap gap-2.5">
        {emotionChoices(ctx, field, st.answers).map((id) => (
          <Chip key={id} label={getEmotionById(id)?.name ?? id} pressed={picked(id)} onClick={() => pick(id)} />
        ))}
        {field.options.moreKey && c[field.options.moreKey] && <Chip label={c[field.options.moreKey]} onClick={onMore} />}
      </div>
    );
  } else {
    const groups = optionGroups(ctx, field, st.answers);
    chips = groups.map((g) => (
      <div key={g.key ?? 'all'} className="space-y-2">
        {g.label && <p className={`font-serif text-lg text-[var(--color-text-primary)] ${g.own ? 'italic' : ''}`}>{g.label}</p>}
        <div className="flex flex-wrap gap-2.5">
          {g.options.map((o) => <Chip key={o.value} label={o.label} pressed={picked(o.value)} onClick={() => pick(o.value)} />)}
          {field.own && !field.own.open && g === groups[groups.length - 1] && (
            <Chip label={c[field.own.hint] ?? c.own_hint} pressed={ownOpen} own onClick={() => setOwnOpen((x) => !x)} />
          )}
        </div>
      </div>
    ));
  }

  return (
    <section aria-label={label ?? undefined} className="space-y-3">
      {label && <h3 className="font-medium text-[var(--color-text-primary)]">{label}</h3>}
      {list && (
        <ul className="space-y-2 font-serif text-lg text-[var(--color-text-secondary)] list-disc pl-5">
          {list.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
      {!field.own?.seed && chips}
      {field.own && ownOpen && (
        <textarea rows={2} maxLength={ownMaxOf(ctx, field)} value={a?.own ?? ''}
          aria-label={c[field.own.hint] ?? c.own_hint} placeholder={field.own.open ? c[field.own.hint] : undefined}
          onChange={(e) => send({ type: 'own', fieldId: field.id, text: e.target.value })}
          className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-serif text-lg focus:ring-2 focus:ring-[var(--color-accent)]" />
      )}
      {field.own?.seed && !startersHidden && chips}
      {fieldLinks(ctx, field, st).map((l) => (
        <div key={l.exit.id} className="flex justify-center">
          <button type="button" className={linkButton} onClick={() => onExit(l.exit)}>{l.label}</button>
        </div>
      ))}
    </section>
  );
}

/**
 * One card: the line, the offers named from tools.ts (the first primary), and a quiet Done. A `safety.open` exit
 * has no tool: it is named by the skill's `safety_open` copy and opens SafetyOpen through `onExit`.
 */
function HandoffCard({ ctx, step, st, send, onExit, busy }: {
  ctx: RunContext; step: StepDef; st: RunState; send: (e: RunEvent) => void; onExit: (x: ExitDef) => void; busy: boolean;
}) {
  const c = ctx.skill.copy;
  // The reminder chips (R5 on a hand-off; build.py allows a hand-off no other field). A tap picks or changes
  // them; leaving the card schedules the reminder.
  const chips = (step.fields ?? []).filter((f) => f.id === step.followUp?.whenFrom);
  const line = handoffLine(ctx, step, st);
  const offers = st.offered
    .map((id) => ctx.skill.exits.find((x) => x.id === id))
    .filter((x): x is ExitDef => !!x && (!!x.safety || (!!x.toolId && !!getToolById(x.toolId))));
  const done = step.done ? ctx.skill.exits.find((x) => x.id === step.done) : undefined;
  const crisis = crisisFor(ctx, step, st);
  // A hand-off's title (Problem Solve's *Your next step: …*) heads the card, as an ask step's does.
  const title = copyText(ctx, step.title, st, titleSlots(ctx, step, st));
  return (<>
    {crisis && <CrisisBanner compact variant={crisis.variant} />}
    {title && <Prompt>{title}</Prompt>}
    <section className="space-y-4 p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]" data-testid="skill-handoff">
      {/* Under a title the line is read after it, not focused or announced as a second heading. */}
      {line && (title ? <Line serif>{line}</Line> : <Prompt serif>{line}</Prompt>)}
      {chips.map((f) => (
        // Held while the reminder saves, so the chip shown is the one that was scheduled.
        <fieldset key={f.id} data-testid="handoff-reminder" disabled={busy} className="m-0 p-0 border-0 min-w-0">
          <FieldView ctx={ctx} field={f} st={st} send={send} onMore={() => {}} onExit={onExit} />
        </fieldset>
      ))}
      <div className="space-y-2">
        {offers.map((x, i) => (
          <button key={x.id} type="button" className={i === 0 ? primaryButton : choiceButton} data-exit={x.id}
            // Someone to talk to is never held back, not even for the moment a reminder takes to save.
            disabled={busy && !x.safety} aria-busy={busy && !x.safety} onClick={() => onExit(x)}>
            {x.safety ? (c.safety_open ?? 'Talk to someone now') : getToolById(x.toolId!)?.name}
          </button>
        ))}
      </div>
      {done && (
        <div className="flex justify-center">
          <button type="button" className={linkButton} disabled={busy} aria-busy={busy} onClick={() => onExit(done)}>{c.done ?? 'Done'}</button>
        </div>
      )}
      <StepLinks ctx={ctx} step={step} st={st} onExit={onExit} />
    </section>
  </>);
}
