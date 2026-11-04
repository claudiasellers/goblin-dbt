import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { HandoffResult } from '../../data/capacityTypes';
import { emotions, getEmotionById } from '../../data/emotions';
import type { ExitDef, FieldDef, SkillDef, SkillsContent, StepDef } from '../../data/skillTypes';
import { getToolById } from '../../data/tools';
import { useToolSession } from '../../hooks/useToolSession';
import { handoffExt } from '../../lib/bandStore';
import { closeQuestion, closeKindFor } from '../../lib/spine/close';
import { emotionIdsFromLink } from '../../lib/spine/toolLink';
import {
  askFresh, canGoOn, carried as carriedOf, copyText, emotionChoices, fieldLinks, fieldList, handoffLine, initialRun,
  optionGroups, runEmotionIds, runNext, runRecord, scope, shownFields, stepOf, titleSlots,
  type RunContext, type RunEvent, type RunState,
} from '../../lib/skillRuntime/machine';
import { holds } from '../../lib/skillRuntime/conditions';
import { getSkillsContent } from '../../services/skills';
import { getSpineContent } from '../../services/spine';
import { TooMuchLink } from '../capacity/TooMuchLink';
import { SessionClose } from '../spine/SessionClose';
import { EmotionPicker } from '../tools/EmotionPicker';
import { Chip, Line, Prompt } from '../tools/wiseMind/bits';
import { choiceButton, linkButton, primaryButton, secondaryText } from '../tools/oppositeAction/styles';
import { EMBEDS } from './embeds';

/**
 * The skill player (docs/design/skill-runtime.md): runs any skill from skills.json inside the page's
 * ToolSessionProvider. The step machine (src/lib/skillRuntime/machine.ts) decides; this renders it and keeps
 * the visit's ToolSession current (`setStep`, `ext.run`, the feeling, the ask-fresh answer).
 *
 * Safety and overwhelm, as every tool without a band gate: TooMuchLink (P2) under every screen, its
 * hand-offs recorded in `ext.run.handoffs`; no band gate and no capacity question. Leaving (an offer, a
 * quiet link, Done) asks the tool's close question first, then goes through `linkTo` with the exit's
 * emotions and query, so the next tool's session is linked to this one.
 */
export function SkillPlayer({ skillId }: { skillId: string }) {
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
  return <SkillRun skill={skill} content={content} />;
}

const GRID = new Set(emotions.map((e) => e.id));
const emotionLabel = (id: string) => (getEmotionById(id)?.name ?? id.replace(/_/g, ' ')).toLowerCase();

/** Emotions the visit was opened with: `?feel=<grid id>` first, then a hand-off's or check-in's words. */
function carriedFrom(search: string, state: unknown): string[] {
  const feel = new URLSearchParams(search).get('feel');
  return [...new Set([...(feel ? [feel] : []), ...emotionIdsFromLink(state)])].filter((id) => GRID.has(id));
}

function SkillRun({ skill, content }: { skill: SkillDef; content: SkillsContent }) {
  const toolSession = useToolSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [carried] = useState(() => carriedFrom(location.search, location.state));
  const ctx = useMemo<RunContext>(() => ({
    skill, shared: { parentOf: content.parentOf, fitsWhen: content.fitsWhen }, carried, gridIds: GRID, emotionLabel,
  }), [skill, content, carried]);
  const [st, setSt] = useState<RunState>(() => initialRun(skill));
  const [leaving, setLeaving] = useState<ExitDef | null>(null);
  const handoffs = useRef<HandoffResult[]>([]);
  const send = useCallback((e: RunEvent) => setSt((s) => runNext(ctx, s, e)), [ctx]);
  const step = stepOf(skill, st.stepId);

  // The session always carries what the run has said so far, so whichever close happens sends it.
  useEffect(() => {
    toolSession.setStep(st.stepId);
    toolSession.setExt({ run: runRecord(ctx, st) });
    toolSession.setEmotionIds(runEmotionIds(ctx, st));
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

  const leave = useCallback((exit: ExitDef) => {
    send({ type: 'exit', exitId: exit.id });
    setLeaving(exit);
    // With no close question to ask (none for this tool, or its copy can't load), leave at once.
    getSpineContent().then((c) => {
      if (!closeQuestion(c.closeFlow, skill.toolId, closeKindFor(skill.toolId))) throw new Error('no close');
    }).catch(() => {
      void toolSession.close({ status: 'completed' });
      go(exit);
    });
  }, [send, skill.toolId, toolSession, go]);

  const onShown = useCallback((record: string) => send({ type: 'shown', record }), [send]);

  let body: ReactNode;
  if (leaving) {
    body = (
      <div className="space-y-4">
        <SessionClose onAnswered={() => go(leaving)} onSkipped={() => go(leaving)} />
        {leaving.done && (
          <div className="flex justify-center"><Link to="/tools" className={linkButton}>All tools</Link></div>
        )}
      </div>
    );
  } else if (step.kind === 'handoff') {
    body = <HandoffCard ctx={ctx} step={step} st={st} onExit={leave} />;
  } else {
    body = <AskStep ctx={ctx} step={step} st={st} send={send} onExit={leave} onShown={onShown} />;
  }

  return (
    <div className="space-y-5" data-testid="skill-player" data-skill={skill.id} data-step={st.stepId}>
      <div key={leaving ? 'leaving' : st.stepId} className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]">{body}</div>
      {!leaving && (
        <div className="flex justify-center">
          <TooMuchLink host={skill.toolId} onResult={(r) => {
            handoffs.current.push(r);
            toolSession.setExt({ run: { handoffs: handoffExt(handoffs.current) } });
          }} />
        </div>
      )}
    </div>
  );
}

function AskStep({ ctx, step, st, send, onExit, onShown }: {
  ctx: RunContext; step: StepDef; st: RunState; send: (e: RunEvent) => void; onExit: (x: ExitDef) => void; onShown: (record: string) => void;
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
                {Embed && show ? <Embed props={s.props ?? {}} onShown={() => onShown(s.record)} /> : null}
              </div>
            );
          })}
        </div>
      );
    })}
    {step.note && c[step.note] && <p className={secondaryText}>{c[step.note]}</p>}
    <button type="button" className={primaryButton} disabled={!canGoOn(ctx, st)} onClick={() => send({ type: 'next' })}>
      {c.next ?? 'Next'}
    </button>
  </>);
}

function FieldView({ ctx, field, st, send, onMore, onExit }: {
  ctx: RunContext; field: FieldDef; st: RunState; send: (e: RunEvent) => void; onMore: () => void; onExit: (x: ExitDef) => void;
}) {
  const c = ctx.skill.copy;
  const a = st.answers[field.id];
  const picked = (v: string) => !!a?.ids.includes(v);
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
      {chips}
      {field.own && ownOpen && (
        <textarea rows={2} maxLength={ctx.skill.ownMax} defaultValue={a?.own ?? ''}
          aria-label={c[field.own.hint] ?? c.own_hint} placeholder={field.own.open ? c[field.own.hint] : undefined}
          onChange={(e) => send({ type: 'own', fieldId: field.id, text: e.target.value })}
          className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-serif text-lg focus:ring-2 focus:ring-[var(--color-accent)]" />
      )}
      {fieldLinks(ctx, field, st).map((l) => (
        <div key={l.exit.id} className="flex justify-center">
          <button type="button" className={linkButton} onClick={() => onExit(l.exit)}>{l.label}</button>
        </div>
      ))}
    </section>
  );
}

/** One card: the line, the offers named from tools.ts (the first primary), and a quiet Done. */
function HandoffCard({ ctx, step, st, onExit }: { ctx: RunContext; step: StepDef; st: RunState; onExit: (x: ExitDef) => void }) {
  const c = ctx.skill.copy;
  const line = handoffLine(ctx, step, st);
  const offers = st.offered
    .map((id) => ctx.skill.exits.find((x) => x.id === id))
    .filter((x): x is ExitDef => !!x && !!x.toolId && !!getToolById(x.toolId));
  const done = step.done ? ctx.skill.exits.find((x) => x.id === step.done) : undefined;
  return (
    <section className="space-y-4 p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]" data-testid="skill-handoff">
      {line && <Prompt serif>{line}</Prompt>}
      <div className="space-y-2">
        {offers.map((x, i) => (
          <button key={x.id} type="button" className={i === 0 ? primaryButton : choiceButton} data-exit={x.id} onClick={() => onExit(x)}>
            {getToolById(x.toolId!)?.name}
          </button>
        ))}
      </div>
      {done && (
        <div className="flex justify-center">
          <button type="button" className={linkButton} onClick={() => onExit(done)}>{c.done ?? 'Done'}</button>
        </div>
      )}
    </section>
  );
}
