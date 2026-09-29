import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Breathing as direct manipulation: press and hold to breathe in (the shape fills),
 * let go to breathe out (it empties). Three rounds. No counting, no numbers.
 */
export function HoldBreath({ onDone, tone = 'var(--accent)', size = 200, rounds = 3 }: {
  onDone: () => void; tone?: string; size?: number; rounds?: number;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle');
  const [done, setDone] = useState(0);
  const outTimer = useRef<number | undefined>(undefined);
  const inStart = useRef(0);
  const cb = useRef(onDone); cb.current = onDone;

  useEffect(() => () => window.clearTimeout(outTimer.current), []);
  useEffect(() => { if (done >= rounds) { const t = window.setTimeout(() => cb.current(), 700); return () => window.clearTimeout(t); } }, [done, rounds]);

  const press = () => {
    if (done >= rounds) return;
    window.clearTimeout(outTimer.current);
    inStart.current = performance.now();
    setPhase('in');
    try { navigator.vibrate?.(10); } catch { /* optional */ }
  };
  const release = () => {
    if (phase !== 'in') return;
    const held = performance.now() - inStart.current;
    setPhase('out');
    // A real breath in takes a moment; a quick tap doesn't count as a round.
    outTimer.current = window.setTimeout(() => {
      setPhase('idle');
      if (held > 1500) setDone(d => d + 1);
    }, 5000);
  };

  const label = done >= rounds ? 'That’s it.' : phase === 'in' ? 'Breathe in… keep holding' : phase === 'out' ? 'Let go… slow breath out' : done === 0 ? 'Press and hold to breathe in' : 'Again: press and hold';
  const scale = phase === 'in' ? 1 : phase === 'out' ? 0.45 : 0.5;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <button type="button" aria-label="Hold to breathe in, release to breathe out"
        onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
        onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } }}
        onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') release(); }}
        className="relative grid place-items-center rounded-full touch-none"
        style={{ width: size, height: size }}>
        <span className="absolute inset-0 rounded-full border-2 border-dashed" style={{ borderColor: 'var(--line-strong)' }} />
        <motion.span className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${tone} 45%, white), ${tone})` }}
          animate={{ scale: reduce ? (phase === 'in' ? 0.9 : 0.6) : scale }}
          transition={{ duration: phase === 'in' ? 4 : phase === 'out' ? 5 : 0.6, ease: [0.4, 0, 0.2, 1] }} />
      </button>
      <p className="text-[17px] font-semibold min-h-7 text-center" aria-live="polite">{label}</p>
      <div className="flex gap-2" aria-label={`${done} of ${rounds} breaths`}>
        {Array.from({ length: rounds }, (_, i) => (
          <span key={i} className="size-2.5 rounded-full transition-colors" style={{ background: i < done ? tone : 'var(--line-strong)' }} />
        ))}
      </div>
      <button type="button" className="text-[14px] underline underline-offset-4" style={{ color: 'var(--ink-2)' }} onClick={() => cb.current()}>
        I’m calmer, skip
      </button>
    </div>
  );
}
