import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export function Chip({ children, onClick, tone = 'surface' }: { children: ReactNode; onClick: () => void; tone?: 'surface' | 'accent' }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => { try { navigator.vibrate?.(8); } catch { /* */ } onClick(); }}
      className="min-h-11 px-4 rounded-full border text-[15px] font-medium"
      style={tone === 'accent'
        ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--on-accent)' }
        : { background: 'var(--surface)', borderColor: 'var(--line-strong)' }}>
      {children}
    </motion.button>
  );
}

/** A mock incoming text: makes the capacity question concrete instead of introspective. */
export function IncomingText({ from = 'Them', text }: { from?: string; text: string }) {
  return (
    <div className="rounded-2xl p-3 flex items-center gap-3 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <span className="size-9 rounded-full grid place-items-center text-[13px] font-semibold shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>{from[0]}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--ink-2)' }}>{from} · now</span>
        <span className="text-[15px] truncate">{text}</span>
      </span>
    </div>
  );
}

export function WordJar({ words, fresh }: { words: string[]; fresh: string | null }) {
  return (
    <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>Words you’ve found</span>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{words.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map(w => (
          <motion.span key={w} layout
            initial={w === fresh ? { scale: 0.3, opacity: 0, y: -20 } : false}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: w === fresh ? 0.4 : 0 }}
            className="px-3 py-1.5 rounded-full text-[14px] font-medium"
            style={w === fresh
              ? { background: 'var(--accent)', color: 'var(--on-accent)' }
              : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
            {w}
          </motion.span>
        ))}
      </div>
      <p className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
        {fresh ? `New: “${fresh}.” Naming a feeling is a skill, and you just used it.` : 'Not sure what to call it this time. That counts too.'}
      </p>
    </div>
  );
}
