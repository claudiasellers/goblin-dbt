import { useEffect, useMemo, useRef, useState } from 'react';
import { LazyMotion, domAnimation } from 'motion/react';
import type { Band, HandoffPrimitive, HandoffResult, ThenVsNow } from '../../data/capacityTypes';
import { THEN_VS_NOW } from '../../data/capacityTypes';
import { useBand } from '../../hooks/useBand';
import { afterReread, planHandoff } from '../../lib/band';
import { saveResumeToken, RESUME_TTL_MS } from '../../lib/resumeToken';
import { fill } from '../../lib/invalidationRecovery';
import { BreathOrb, Orient, type BreathPhase } from '../tools/regulation/body';
import { focusStepStart } from '../../lib/focusStart';
import { choiceButton, linkButton, primaryButton, secondaryText } from '../tools/oppositeAction/styles';

/** What the host hands P2 so it can resume the same step (kept in memory; device-local if saved). */
export interface HandoffResumeDraft {
  hostSessionId: string;
  stepId: string;
  draft: unknown;
}

export type LaterChip = '1h' | 'evening' | 'tomorrow';

type Stage =
  | { k: 'card' }
  | { k: 'primitive'; i: number; startedAt: number }
  | { k: 'reread'; attempt: 1 | 2 }
  | { k: 'later'; scheduled: boolean };

/**
 * P2, the breakdown hand-off (ER-01, E3 §A4.2.6). In-page only: the host stays mounted and resumes
 * the same step. card → primitive → reread → (resume | second primitive → reread → come back later).
 * Never a third primitive, never a lock: "Keep going anyway" is always there.
 *
 * Interim for DT-01: the two body primitives built into Recover / Find the feeling (the sigh on
 * BreathOrb, orient on Orient). DT-01 adds `dt.regulate` rows; this contract doesn't change.
 * `onSafety` renders the "I'm not safe" link when the safety batch passes `safety.open`.
 */
export function BreakdownHandoff({
  host, band: bandValue, blank = false, resume, dismissedRef, startWithPrimitive, startLater = false, onResume, onLater, onScheduleLater, onSafety, safetyLabel,
}: {
  host: string;
  band: Band;
  blank?: boolean;
  resume?: HandoffResumeDraft;
  /**
   * Set to true by a host that closes P2 in place (the too-much overlay's close button): the user
   * is back on the same step, not leaving, so the draft is not written to this device.
   */
  dismissedRef?: { current: boolean };
  /** Skip the card (the user asked for this via "too much"). */
  startWithPrimitive?: boolean;
  /**
   * Open on the last two choices (come back later, keep going anyway): P2 already ran this visit (Meet a
   * part after a P2 on entry), so a second "running things" offers no new primitive.
   */
  startLater?: boolean;
  onResume: (r: HandoffResult) => void;
  onLater?: (r: HandoffResult) => void;
  /** Schedules the `resume_skill` follow-up; resolves its id, or null. Absent → no "later" chips. */
  onScheduleLater?: (chip: LaterChip) => Promise<string | null>;
  onSafety?: () => void;
  safetyLabel?: string;
}) {
  const b = useBand();
  useEffect(() => { b.load(); }, [b]);
  const content = b.content;
  const plan = useMemo(() => (content ? planHandoff({ band: bandValue, blank }, content.primitives) : []), [content, bandValue, blank]);

  const [stage, setStage] = useState<Stage>(() => (startLater ? { k: 'later', scheduled: false }
    : startWithPrimitive ? { k: 'primitive', i: 0, startedAt: Date.now() } : { k: 'card' }));
  const [scheduling, setScheduling] = useState(false);
  const runs = useRef<HandoffResult['primitivesRun']>([]);
  const lastReread = useRef<ThenVsNow | null>(null);
  const resolved = useRef(false);
  const deferredId = useRef<string | undefined>(undefined);

  // Each stage replaces the control that moved it on (Start, a reread answer, a later chip): focus goes to
  // the new stage's heading or first line, never to the page. Not on the first render.
  const root = useRef<HTMLElement>(null);
  const stageKey = stage.k === 'primitive' ? `primitive:${stage.i}` : stage.k === 'later' ? `later:${stage.scheduled}` : stage.k;
  const lastStage = useRef(stageKey);
  useEffect(() => {
    if (lastStage.current === stageKey) return;
    lastStage.current = stageKey;
    focusStepStart(root.current);
  }, [stageKey]);

  const result = (resumed: boolean, overridden: boolean): HandoffResult => ({
    resumed, overridden, thenVsNow: lastReread.current, primitivesRun: [...runs.current],
    ...(deferredId.current ? { deferredFollowUpId: deferredId.current } : {}),
  });
  const persist = () => {
    if (!resume) return false;
    const now = Date.now();
    return saveResumeToken({
      v: 1, toolId: host, hostSessionId: resume.hostSessionId, stepId: resume.stepId, draft: resume.draft,
      band: bandValue, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + RESUME_TTL_MS).toISOString(),
    });
  };
  const finish = (resumed: boolean, overridden: boolean) => {
    if (resolved.current) return;
    resolved.current = true;
    onResume(result(resumed, overridden));
  };

  // Leaving mid hand-off (navigation): keep the host's draft on this device. Deferred a tick so
  // StrictMode's dev-only unmount/remount doesn't save it.
  const alive = useRef(false);
  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      setTimeout(() => { if (!alive.current && !resolved.current && !dismissedRef?.current) persistRef.current(); }, 0);
    };
  }, []);

  if (!content) {
    return (
      <div className="py-8 space-y-3 text-center" aria-busy={b.status !== 'error'}>
        {b.status === 'error'
          ? <button type="button" className={linkButton} onClick={() => finish(true, true)}>Continue</button>
          : <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />}
      </div>
    );
  }
  const h = content.handoff;
  const keepGoing = (
    <button type="button" className={linkButton} data-testid="keep-going" onClick={() => finish(true, true)}>{h.card.keepGoing}</button>
  );
  const safety = onSafety && safetyLabel
    ? <button type="button" className={linkButton} onClick={onSafety}>{safetyLabel}</button>
    : null;

  let body: React.ReactNode = null;
  if (stage.k === 'card') {
    body = (
      <div className="space-y-5" data-testid="handoff-card">
        <p className="text-lg leading-relaxed text-[var(--color-text-primary)]">{h.card.body}</p>
        <button type="button" className={primaryButton} onClick={() => setStage({ k: 'primitive', i: 0, startedAt: Date.now() })}>
          {h.card.start}
        </button>
        <div>
          {keepGoing}
          <p className={`${secondaryText} px-2`}>{h.card.keepGoingHeadsUp}</p>
        </div>
      </div>
    );
  } else if (stage.k === 'primitive') {
    const p = plan[stage.i];
    if (!p) {
      body = <div className="space-y-4"><p className={secondaryText}>{h.later.holding}</p>{keepGoing}</div>;
    } else {
      const done = (completed: boolean) => {
        runs.current.push({ id: p.id, completed, durationSec: Math.round((Date.now() - stage.startedAt) / 1000) });
        setStage({ k: 'reread', attempt: stage.i === 0 ? 1 : 2 });
      };
      body = (
        <div className="space-y-4" data-testid={`primitive-${p.id}`}>
          {stage.i > 0 && <p className={secondaryText}>{h.secondLead}</p>}
          <Primitive p={p} onDone={done} />
          {/* Never a lock: the breath shows no skip until it starts, so the way out stays here too. */}
          <div className="text-center">{keepGoing}</div>
        </div>
      );
    }
  } else if (stage.k === 'reread') {
    body = (
      <div className="space-y-4" data-testid="handoff-reread">
        <p className="text-lg font-medium text-[var(--color-text-primary)] focus:outline-none">{h.reread.prompt}</p>
        <div className="space-y-2" role="group" aria-label={h.reread.prompt}>
          {THEN_VS_NOW.map((v) => (
            <button key={v} type="button" className={choiceButton} data-then={v} onClick={() => {
              lastReread.current = v;
              const next = afterReread(v, stage.attempt);
              if (next === 'resume') finish(true, false);
              else if (next === 'second' && plan[1]) setStage({ k: 'primitive', i: 1, startedAt: Date.now() });
              else setStage({ k: 'later', scheduled: false });
            }}>{h.reread.options[v]}</button>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4" data-testid="handoff-later">
        {stage.scheduled ? (
          <p className="text-[var(--color-text-primary)] focus:outline-none">{h.later.scheduled}</p>
        ) : (
          <>
            <p className="text-[var(--color-text-primary)] focus:outline-none">{h.later.holding}</p>
            {onScheduleLater && resume && (
              <div className="space-y-2">
                <p className={secondaryText}>{h.later.offer}</p>
                <div className="flex flex-wrap gap-2">
                  {h.later.options.map((o) => (
                    <button key={o.id} type="button" className="min-h-11 px-4 rounded-full border border-[var(--color-border)] text-sm lift-secondary"
                      disabled={scheduling}
                      onClick={() => {
                        if (scheduling) return; // one follow-up per tap, however slow (Codex, #20)
                        setScheduling(true);
                        persist();
                        void onScheduleLater(o.id).then((id) => {
                          if (id) deferredId.current = id;
                          resolved.current = true;
                          setStage({ k: 'later', scheduled: true });
                          onLater?.(result(false, false));
                        }).catch(() => { setScheduling(false); /* the draft is saved on the device either way */ });
                      }}>{o.label}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {!stage.scheduled && keepGoing}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <section ref={root} className="space-y-4" aria-label="Body first" data-host={host}>
        {body}
        {safety}
      </section>
    </LazyMotion>
  );
}

function Primitive({ p, onDone }: { p: HandoffPrimitive; onDone: (completed: boolean) => void }) {
  const c = p.copy as Record<string, unknown>;
  const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '');
  if (p.component === 'breath_orb') {
    const phases = (c.phases as BreathPhase[]) ?? [];
    const cycles = typeof c.cycles === 'number' ? c.cycles : 3;
    const seconds = Math.round(cycles * phases.reduce((t, x) => t + x.ms, 0) / 1000);
    return (
      <>
        <Title title={s('title')} sub={s('sub')} />
        <BreathOrb phases={phases} cycles={cycles} startLabel={fill(s('start'), { seconds })}
          skipLabel={s('skip')} doneLabel={s('done')} onDone={onDone} compact />
      </>
    );
  }
  return (
    <>
      <Title title={s('title')} sub={s('sub')} />
      <Orient look={s('look')} move={s('move')} moveSeconds={typeof c.moveSeconds === 'number' ? c.moveSeconds : 20}
        startMoveLabel={s('startMove')} skipLabel={s('skip')} seenLabel={(n) => fill(s('seen'), { n })} onDone={onDone} />
    </>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] focus:outline-none">{title}</h2>
      {sub && <p className={`${secondaryText} mt-1`}>{sub}</p>}
    </div>
  );
}
