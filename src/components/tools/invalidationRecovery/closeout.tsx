import { m, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { primaryButton, secondaryText } from '../oppositeAction/styles';
import { masteryOf } from '../../../lib/invalidationRecovery';
import type { PracticeSkill } from '../../../data/invalidationRecoveryTypes';
import { ProgressRing } from '../regulation/ProgressRing';

const FAMILY_TONE: Record<PracticeSkill['family'], string> = {
  body: 'var(--color-q-lp-fill)',
  mind: 'var(--color-q-lu-fill)',
  people: 'var(--color-q-hp-fill)',
};

/** Intensity through the session, drawn to one scale (0–10). */
export function UrgeWave({ readings, labels, caption }: { readings: number[]; labels: string[]; caption: string }) {
  const reduce = useReducedMotion();
  const W = 320, H = 150, L = 26, R = 14, T = 12, B = 26;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, readings.length - 1);
  const y = (v: number) => T + ((10 - v) * (H - T - B)) / 10;
  const pts = readings.map((v, i) => [x(i), y(v)] as const);
  const path = pts.reduce((d, [px, py], i) => {
    if (i === 0) return `M ${px} ${py}`;
    const [qx, qy] = pts[i - 1];
    const mx = (qx + px) / 2;
    return `${d} C ${mx} ${qy}, ${mx} ${py}, ${px} ${py}`;
  }, '');
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs text-[var(--color-text-secondary)]">{caption}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px]" role="img"
        aria-label={`${caption}: ${readings.join(', ')}`}>
        {[0, 5, 10].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeDasharray={v === 5 ? '3 4' : undefined} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-text-secondary)">{v}</text>
          </g>
        ))}
        <path d={`${path} L ${pts[pts.length - 1][0]} ${y(0)} L ${pts[0][0]} ${y(0)} Z`} fill="var(--color-accent-fill)" opacity="0.12" />
        <m.path d={path} fill="none" stroke="var(--color-text-primary)" strokeWidth="2.2" strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
        {pts.map(([px, py], i) => (
          <g key={i}>
            <circle cx={px} cy={py} r={i === pts.length - 1 ? 6 : 4} fill="var(--color-accent-fill)" stroke="var(--color-bg-elevated)" strokeWidth="2" />
            {/* Only the ends are labelled: mid-session re-rates are dots, so labels never collide. */}
            {(i === 0 || i === pts.length - 1) && (
              <text x={px} y={H - 8} fontSize="12" fill="var(--color-text-secondary)"
                textAnchor={i === 0 ? 'start' : 'end'}>{labels[i]}</text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function SkillCard({ skill, uses, fresh, levelLabel, lockedLabel, masteredLabel }: {
  skill: PracticeSkill; uses: number; fresh?: boolean;
  levelLabel: (level: number, toNext: number) => string; lockedLabel: string; masteredLabel: string;
}) {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const { level, toNext, frac } = masteryOf(uses);
  const tone = FAMILY_TONE[skill.family];
  const locked = uses === 0;
  return (
    <m.button type="button" onClick={() => setFlipped(f => !f)} aria-expanded={flipped}
      initial={fresh && !reduce ? { rotateY: 90, scale: 0.85 } : false} animate={{ rotateY: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative w-full h-full min-h-32 text-left p-3.5 rounded-2xl border flex flex-col gap-2 overflow-hidden"
      style={{
        background: locked ? 'var(--color-bg-secondary)' : 'var(--color-bg-elevated)',
        borderColor: locked ? 'var(--color-border)' : `color-mix(in oklab, ${tone} 45%, var(--color-border))`,
      }}>
      {!locked && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />}
      {flipped && !locked ? (
        <>
          <span className="self-start text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">
            {skill.evidenceGrade}{skill.evidenceBasis ? ` · ${skill.evidenceBasis}` : ''}
          </span>
          <span className="text-[13px] leading-snug text-[var(--color-text-secondary)]">{skill.why}</span>
        </>
      ) : (
        <>
          <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-secondary)]">{skill.family}</span>
          <span className={`font-semibold leading-tight ${locked ? 'text-[var(--color-text-tertiary)]' : ''}`}>{skill.name}</span>
          <span className="mt-auto flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(n => (
              <span key={n} className="h-1.5 flex-1 rounded-full"
                style={{ background: n < level ? tone : n === level ? `color-mix(in oklab, ${tone} ${Math.round(frac * 60)}%, var(--color-border))` : 'var(--color-border)' }} />
            ))}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
            {locked ? lockedLabel : level >= 5 ? masteredLabel : levelLabel(level, toNext)}
          </span>
        </>
      )}
    </m.button>
  );
}

export function RepsRing({ reps, goal, label }: { reps: number; goal: number; label: string }) {
  return (
    <ProgressRing value={reps / goal} size={72} stroke={8} label={label}>
      <span className="text-lg font-semibold tabular-nums">{reps}<span className="text-xs text-[var(--color-text-tertiary)]">/{goal}</span></span>
    </ProgressRing>
  );
}

export function FollowUps({ options, submitLabel, finishLabel, onDone }: {
  options: { id: string; title: string; sub: string }[]; submitLabel: string; finishLabel: string; onDone: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {options.map(o => {
        const on = picked.includes(o.id);
        return (
          <label key={o.id} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer ${on ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]' : 'border-[var(--color-border)]'} bg-[var(--color-bg-elevated)]`}>
            <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]" checked={on}
              onChange={() => setPicked(p => (on ? p.filter(x => x !== o.id) : [...p, o.id]))} />
            <span><span className="font-medium block">{o.title}</span><span className={secondaryText}>{o.sub}</span></span>
          </label>
        );
      })}
      <button type="button" className={primaryButton} onClick={() => onDone(picked)}>{picked.length ? submitLabel : finishLabel}</button>
    </div>
  );
}
