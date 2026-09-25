import { motion, useReducedMotion } from 'motion/react';

export type Mood = 'neutral' | 'concerned' | 'calm' | 'glad' | 'listening';

/** Original Goblin mascot: a small leaf-sprout creature. Mood drives brows, eyes and mouth. */
export function Goblin({ mood = 'neutral', size = 72, breathing = false }: { mood?: Mood; size?: number; breathing?: boolean }) {
  const reduce = useReducedMotion();
  const brow = mood === 'concerned' ? 'M31 37 L39 35 M57 35 L65 37' : mood === 'glad' ? 'M31 34 L39 33 M57 33 L65 34' : 'M31 35 L39 35 M57 35 L65 35';
  const mouth =
    mood === 'glad' ? 'M40 60 Q48 68 56 60'
      : mood === 'concerned' ? 'M41 63 Q48 59 55 63'
        : mood === 'calm' ? 'M42 61 Q48 64 54 61'
          : mood === 'listening' ? 'M44 61 Q48 63 52 61'
            : 'M42 61 Q48 63 54 61';
  const eyesClosed = mood === 'calm';
  return (
    <motion.svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true"
      animate={breathing && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={breathing ? { duration: 5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}>
      {/* sprout */}
      <motion.path d="M48 22 C48 14 44 9 37 8 C39 15 43 19 48 22 Z" fill="var(--leaf)"
        animate={reduce ? {} : { rotate: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '48px', originY: '22px' }} />
      <path d="M48 22 C49 15 54 11 60 11 C58 17 54 21 48 22 Z" fill="var(--leaf-2)" />
      {/* body */}
      <path d="M48 22 C70 22 82 38 82 56 C82 74 67 86 48 86 C29 86 14 74 14 56 C14 38 26 22 48 22 Z" fill="var(--goblin)" />
      <ellipse cx="48" cy="70" rx="22" ry="11" fill="var(--goblin-belly)" />
      {/* cheeks */}
      <circle cx="30" cy="56" r="4.5" fill="var(--cheek)" opacity={mood === 'glad' ? 0.9 : 0.5} />
      <circle cx="66" cy="56" r="4.5" fill="var(--cheek)" opacity={mood === 'glad' ? 0.9 : 0.5} />
      {/* eyes */}
      {eyesClosed ? (
        <>
          <path d="M31 46 Q35 49 39 46" stroke="var(--ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M57 46 Q61 49 65 46" stroke="var(--ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <motion.g animate={reduce ? {} : { scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
          style={{ originY: '46px' }}>
          <circle cx="35" cy="46" r="4.2" fill="var(--ink)" />
          <circle cx="61" cy="46" r="4.2" fill="var(--ink)" />
          <circle cx="36.4" cy="44.6" r="1.3" fill="var(--goblin-belly)" />
          <circle cx="62.4" cy="44.6" r="1.3" fill="var(--goblin-belly)" />
        </motion.g>
      )}
      <path d={brow} stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d={mouth} stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </motion.svg>
  );
}
