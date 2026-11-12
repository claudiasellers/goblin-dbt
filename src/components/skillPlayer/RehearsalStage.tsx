import { useEffect, useId, useMemo, useRef, useState, type Ref } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import {
  finished, isLast, moved, movesFrom, said, scriptFor, startStage, stageOutput, stopped,
  type StageOption, type StageState,
} from '../../lib/rehearsal';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';
import { focusLine, focusLost } from '../../lib/focusStart';
import { choiceButton, linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * Rehearse it's stage (IE-02, plan C3b `rehearsalStage`, IE-owned; 2D first, D12; docs/design/rehearse.md): two
 * figures, you on the left and them on the right (named with the person's own label when they're kept), your words
 * in your bubble, their scripted reply in theirs with a pose (open, closer, arms folded, turned away, still), and your
 * move from that reply's chips. Stop is always on screen and always counts. Nothing is recorded but taps: no mic, no
 * recording. Motion only with `motion-safe`.
 *
 * Props (EMBED_PROPS): `fromSkill` (the skill whose `turn` and `move` options are the script), the fields `kind`,
 * `tier`, `line`, and the copy `aloud`, `inHead`, `yourMove`, `stop`, `you`, `them`, `endLine`, `next`, plus the optional
 * pose words (`poseCloser`, `poseArms`, `poseTurnAway`, `poseStill`) read with their line, since a pose is otherwise
 * visual only. Reports the moves used, `aloud`, how it ended (finished · stopped · lost_it · stepped_out) and the
 * exchanges (`doneCount`). Practising leaving starts from the step-out line, not the kind's line.
 *
 * Focus (Gate 3): each tap that moves the phase sends focus to what is new (their reply, your line, the end line),
 * so a screen reader hears "Them, arms folded: …" and the chips follow in reading order; no live region.
 */
const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

function useSkill(id: string): SkillDef | null {
  const [skill, setSkill] = useState<SkillDef | null>(() => peekSkillsContent()?.skills.find((s) => s.id === id) ?? null);
  useEffect(() => {
    if (!id || skill) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setSkill(c.skills.find((s) => s.id === id) ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [id, skill]);
  return skill;
}

/** Their figure's pose as a transform and a look (eyes hidden when turned away). */
const POSE: Record<string, { move: string; dim?: boolean; away?: boolean; arms?: boolean }> = {
  open: { move: 'translate(-6px, 0)' },
  neutral: { move: 'none' },
  closer: { move: 'translate(-26px, 0)' },
  arms: { move: 'none', arms: true },
  turn_away: { move: 'translate(8px, 0)', away: true },
  still: { move: 'none', dim: true },
};

function Figure({ x, tone, pose = 'neutral', gone = false }: { x: number; tone: string; pose?: string; gone?: boolean }) {
  const p = POSE[pose] ?? POSE.neutral;
  return (
    <g style={{ transform: gone ? 'translate(-40px, 0)' : p.move, opacity: gone ? 0.45 : p.dim ? 0.7 : 1 }}
      className="motion-safe:transition-[transform,opacity] motion-safe:duration-500">
      <circle cx={x} cy={34} r={14} fill={tone} />
      <rect x={x - 18} y={52} width={36} height={52} rx={16} fill={tone} />
      {!p.away && (
        <g fill="var(--color-bg-primary)">
          <circle cx={x - 5} cy={32} r={1.8} />
          <circle cx={x + 5} cy={32} r={1.8} />
        </g>
      )}
      {p.arms && <path d={`M${x - 16} 72 L${x + 16} 82 M${x + 16} 72 L${x - 16} 82`} stroke="var(--color-bg-primary)" strokeWidth={4} strokeLinecap="round" />}
    </g>
  );
}

function Bubble({ who, words, side, lineRef }: { who: string; words: string; side: 'left' | 'right'; lineRef?: Ref<HTMLParagraphElement> }) {
  const direction = words.startsWith('(');
  return (
    <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <p ref={lineRef}
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-snug [overflow-wrap:anywhere] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
          side === 'right' ? 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-tr-sm' : 'bg-[var(--color-accent-subtle)] rounded-tl-sm'
        } ${direction ? 'italic text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
        <span className="sr-only">{who}: </span>{direction ? <><span aria-hidden="true">(</span>{words.slice(1, -1)}<span aria-hidden="true">)</span></> : words}
      </p>
    </div>
  );
}

export function RehearsalStage({ props, picked, answerIds, ctx, profile, onShown, onDone }: EmbedProps) {
  const skill = useSkill(text(props, 'fromSkill'));
  const field = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const kind = answerIds?.[field('kind')]?.[0] ?? '';
  const tier = answerIds?.[field('tier')]?.[0] ?? '';
  const line = (picked?.[field('line')] ?? []).filter((l) => l.trim()).join(' ');
  const turns = useMemo(() => scriptFor((skill?.options.turn ?? []) as StageOption[], kind, tier), [skill, kind, tier]);
  const moves = useMemo(() => movesFrom((skill?.options.move ?? []) as StageOption[]), [skill]);
  // Their name: the person's own label when they're kept (the people slice), else the copy's.
  const people = Array.isArray(profile?.people) ? (profile!.people as Array<{ id: string; label?: string | null }>) : [];
  const them = people.find((p) => p.id === ctx?.personId)?.label || text(props, 'them');
  const you = text(props, 'you');

  // Practising leaving starts from the step-out line (*Say it again* holds it while they push).
  const stageLine = tier === 'leave' ? (moves.find((m) => m.value === 'break')?.says ?? line) : line;
  const poseWord: Record<string, string> = {
    closer: text(props, 'poseCloser'), arms: text(props, 'poseArms'), turn_away: text(props, 'poseTurnAway'), still: text(props, 'poseStill'),
  };

  const [s, setS] = useState<StageState>(() => startStage(stageLine));
  const shown = useRef(false);
  const ready = !!skill && turns.length > 0 && !!line;
  useEffect(() => { if (ready && !shown.current) { shown.current = true; onShown(); } }, [ready, onShown]);
  const done = (st: StageState) => onDone?.(stageOutput(st));

  // Focus follows the new thing after each tap (the tapped control is gone by then).
  const replyRef = useRef<HTMLParagraphElement>(null);
  const yoursRef = useRef<HTMLParagraphElement>(null);
  const endRef = useRef<HTMLParagraphElement>(null);
  const tapped = useRef(false);
  useEffect(() => {
    if (!tapped.current) return;
    tapped.current = false;
    if (!focusLost()) return;
    const el = s.phase === 'their' ? replyRef.current : s.phase === 'say' ? yoursRef.current : endRef.current;
    focusLine(el);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [s.phase, s.at]);
  const go = (next: StageState) => { tapped.current = true; setS(next); };
  const movesLabel = useId();

  // Content drift (no script, no line): never strand the person on a whole-screen embed, and claim nothing happened.
  if (skill && !ready) return <div className="flex justify-center"><button type="button" className={primaryButton} onClick={() => onDone?.({ ids: [], doneCount: 0 })}>{text(props, 'next')}</button></div>;
  if (!skill) {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }

  // Their reply now (`their`), or the one you're answering (`say` after a move).
  const reply = s.phase === 'their' ? turns[s.at] : s.phase === 'say' && s.at > 0 ? turns[s.at - 1] : null;
  const pose = reply?.pose ?? 'neutral';
  const replyWho = poseWord[pose] ? `${them}, ${poseWord[pose]}` : them;
  // Before any move your words are the opening line (the skill can load after the first render).
  const yours = s.at === 0 && s.used.length === 0 ? stageLine : s.yours;
  const offered = s.phase === 'their' && !isLast(s, turns)
    ? moves.filter((m) => turns[s.at].moves.includes(m.value))
    : [];

  return (
    <div className="space-y-4" data-testid="rehearsal-stage">
      <div className="flex justify-end">
        {s.phase !== 'end' && (
          // Stop always counts; on their last reply it is the same as Next (the conversation was had).
          <button type="button" className={linkButton} onClick={() => done(isLast(s, turns) ? finished(s, turns) : stopped(s))}>{text(props, 'stop')}</button>
        )}
      </div>
      <svg viewBox="0 0 240 128" className="w-full max-w-sm max-h-36 mx-auto block" aria-hidden="true">
        <line x1={8} y1={106} x2={232} y2={106} stroke="var(--color-border)" strokeWidth={2} strokeLinecap="round" />
        <Figure x={64} tone="var(--color-accent)" gone={s.end === 'stepped_out'} />
        <Figure x={176} tone="var(--color-text-secondary)" pose={s.phase === 'end' ? 'neutral' : pose} />
        <text x={64} y={124} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">{you}</text>
        <text x={176} y={124} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">{them.length > 18 ? `${them.slice(0, 17)}…` : them}</text>
      </svg>
      <div className="space-y-3">
        {s.phase === 'their' && <Bubble who={you} words={yours} side="left" />}
        {reply && <Bubble who={replyWho} words={reply.line} side="right" lineRef={s.phase === 'their' ? replyRef : undefined} />}
        {(s.phase === 'say' || s.end === 'stepped_out') && <Bubble who={you} words={yours} side="left" lineRef={s.phase === 'say' ? yoursRef : undefined} />}
      </div>

      {s.phase === 'say' && (
        <div className="space-y-2">
          <button type="button" className={primaryButton} onClick={() => go(said(s, turns, true))}>{text(props, 'aloud')}</button>
          <div className="flex justify-center">
            <button type="button" className={linkButton} onClick={() => go(said(s, turns, false))}>{text(props, 'inHead')}</button>
          </div>
        </div>
      )}
      {s.phase === 'their' && offered.length > 0 && (
        <div className="space-y-2" role="group" aria-labelledby={movesLabel}>
          <p id={movesLabel} className="text-sm text-[var(--color-text-secondary)]">{text(props, 'yourMove')}</p>
          {offered.map((m) => (
            <button key={m.value} type="button" className={choiceButton} onClick={() => {
              const next = moved(s, m, stageLine);
              // *I'd lose it here* ends the stage at once: the if-then comes next.
              if (next.end === 'lost_it') done(next); else go(next);
            }}>{m.label}</button>
          ))}
        </div>
      )}
      {s.phase === 'their' && isLast(s, turns) && (
        <div className="space-y-2">
          <p className="text-base text-[var(--color-text-primary)]">{text(props, 'endLine')}</p>
          <button type="button" className={primaryButton} onClick={() => done(finished(s, turns))}>{text(props, 'next')}</button>
        </div>
      )}
      {s.phase === 'end' && (
        <div className="space-y-2">
          <p ref={endRef} className="text-base text-[var(--color-text-primary)] focus:outline-none">{text(props, 'endLine')}</p>
          <button type="button" className={primaryButton} onClick={() => done(s)}>{text(props, 'next')}</button>
        </div>
      )}
    </div>
  );
}
