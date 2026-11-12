import { useEffect, useMemo, useRef, useState } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import {
  finished, isLast, moved, movesFrom, said, scriptFor, startStage, stageOutput, stopped,
  type StageOption, type StageState,
} from '../../lib/rehearsal';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';
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
 * `tier`, `line`, and the copy `aloud`, `inHead`, `yourMove`, `stop`, `you`, `them`, `endLine`, `next`. Reports the
 * moves used, `aloud`, how it ended (finished · stopped · lost_it · left) and the exchanges (`doneCount`).
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
    <g style={{ transform: gone ? 'translate(-40px, 0)' : p.move, opacity: gone ? 0.25 : p.dim ? 0.55 : 1 }}
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

function Bubble({ who, words, side, live }: { who: string; words: string; side: 'left' | 'right'; live?: boolean }) {
  const direction = words.startsWith('(');
  return (
    <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <p aria-live={live ? 'polite' : undefined}
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-snug [overflow-wrap:anywhere] ${
          side === 'right' ? 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-tr-sm' : 'bg-[var(--color-accent-subtle)] rounded-tl-sm'
        } ${direction ? 'italic text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
        <span className="sr-only">{who}: </span>{words}
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

  const [s, setS] = useState<StageState>(() => startStage(line));
  const shown = useRef(false);
  const ready = !!skill && turns.length > 0 && !!line;
  useEffect(() => { if (ready && !shown.current) { shown.current = true; onShown(); } }, [ready, onShown]);
  const done = (st: StageState) => onDone?.(stageOutput(st));

  // Content drift (no script, no line): never strand the person on a whole-screen embed.
  if (skill && !ready) return <div className="flex justify-center"><button type="button" className={primaryButton} onClick={() => done(stopped(s))}>{text(props, 'next')}</button></div>;
  if (!skill) {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const reply = s.phase === 'their' || (s.phase === 'end' && s.end !== 'left' && s.seen > 0) ? turns[Math.min(s.at, turns.length - 1)] : null;
  const pose = s.phase === 'their' ? turns[s.at]?.pose : s.phase === 'end' && s.end === 'finished' ? turns[turns.length - 1]?.pose : 'neutral';
  const offered = s.phase === 'their' && !isLast(s, turns)
    ? moves.filter((m) => turns[s.at].moves.includes(m.value))
    : [];

  return (
    <div className="space-y-4" data-testid="rehearsal-stage">
      <div className="flex justify-end">
        {s.phase !== 'end' && (
          <button type="button" className={linkButton} onClick={() => done(stopped(s))}>{text(props, 'stop')}</button>
        )}
      </div>
      <svg viewBox="0 0 240 112" className="w-full max-w-sm mx-auto block" role="img" aria-label={`${you}, ${them}`}>
        <line x1={8} y1={106} x2={232} y2={106} stroke="var(--color-border)" strokeWidth={2} strokeLinecap="round" />
        <Figure x={64} tone="var(--color-accent)" gone={s.end === 'left'} />
        <Figure x={176} tone="var(--color-text-secondary)" pose={pose} />
      </svg>
      <div className="flex justify-between text-sm text-[var(--color-text-secondary)] px-1" aria-hidden="true">
        <span>{you}</span><span>{them}</span>
      </div>
      <div className="space-y-3">
        {(s.phase === 'say' || s.end === 'left') && <Bubble who={you} words={s.yours} side="left" />}
        {reply && s.phase !== 'say' && s.end !== 'left' && <Bubble who={them} words={reply.line} side="right" live />}
      </div>

      {s.phase === 'say' && (
        <div className="space-y-2">
          <button type="button" className={primaryButton} onClick={() => setS(said(s, turns, true))}>{text(props, 'aloud')}</button>
          <button type="button" className={linkButton} onClick={() => setS(said(s, turns, false))}>{text(props, 'inHead')}</button>
        </div>
      )}
      {s.phase === 'their' && offered.length > 0 && (
        <div className="space-y-2" role="group" aria-label={text(props, 'yourMove')}>
          <p className="text-sm text-[var(--color-text-secondary)]">{text(props, 'yourMove')}</p>
          {offered.map((m) => (
            <button key={m.value} type="button" className={choiceButton} onClick={() => {
              const next = moved(s, m, line);
              // *I'd lose it here* ends the stage at once: the if-then comes next.
              if (next.end === 'lost_it') done(next); else setS(next);
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
          <p className="text-base text-[var(--color-text-primary)]">{text(props, 'endLine')}</p>
          <button type="button" className={primaryButton} onClick={() => done(s)}>{text(props, 'next')}</button>
        </div>
      )}
    </div>
  );
}
