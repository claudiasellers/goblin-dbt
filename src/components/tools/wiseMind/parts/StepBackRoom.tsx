import { useEffect, useId, useRef, useState } from 'react';
import { focusLine, focusLost } from '../../../../lib/focusStart';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { CrisisBanner } from '../../../safety/CrisisBanner';
import { PartFigure } from '../../../parts/PartFigure';
import { TenderCover } from '../../../parts/den/DenRoom';
import { HoldButton, LIGHT_HOLD_MS } from '../../../parts/LightHold';
import { linkButton, primaryButton } from '../../oppositeAction/styles';
import {
  EDGE, NEAR, UNMET, placedSpots, showSafety, stepBackMeetLink,
  type StepBackPart, type StepBackState, type WiseMindPartsCopy,
} from '../../../../lib/wiseMindParts';

const FIGURE = 44;
const PANEL = '\u0000panel';
const SHELF_FIGURE = 36;

/**
 * Wise mind's step back (docs/design/wise-mind.md, 2p), drawn: the den's room, small, the light in the
 * middle (the person: never labelled, never tappable). The person's parts wait on a shelf under it; a
 * tap places one near the light (tender ones covered, named as kept). One hold asks everyone to take a
 * step back: as it fills the figures move to the room's edge and the light widens (reduced motion: in
 * one move when it's held). After it, a tap on a figure offers *It won't step back*; that figure stays
 * near, and *Meet it another time* is a link to Meet a part (a kept part) or the host's candidate (*A
 * part I haven't met*). A placed part with the safety flag shows CrisisBanner compact under the room.
 *
 * Presentational: the state comes in (src/lib/wiseMindParts.ts stepBackReducer), every tap goes out.
 */
export function StepBackRoom({ parts, copy, state, onToggle, onNoOne, onHeld, onOpen, onWont, onUnmetLater, onDone, onUseMinds }: {
  parts: readonly StepBackPart[];
  copy: WiseMindPartsCopy;
  state: StepBackState;
  /** Place a figure near the light, or take it back (before the step back). */
  onToggle: (id: string) => void;
  /** *No one in particular*: go on with nobody placed. */
  onNoOne: () => void;
  /** The hold filled. */
  onHeld: () => void;
  /** A placed figure tapped after the step back (null closes it). */
  onOpen: (id: string | null) => void;
  /** *It won't step back*. */
  onWont: (id: string) => void;
  /** *Meet it another time* on *A part I haven't met*: the host queues the candidate. */
  onUnmetLater: () => void;
  /** Next: `held` false when the person went past the hold without filling it. */
  onDone: (held: boolean) => void;
  onUseMinds: () => void;
}) {
  const reduce = useReducedMotion();
  const uid = `wm${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const [progress, setProgress] = useState(0);
  const [tried, setTried] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const heldRef = useRef<HTMLParagraphElement>(null);
  /** The figure a tap just moved (shelf ↔ room): its button there takes focus, never <body>. */
  const moved = useRef<string | null>(null);
  const wasHeld = useRef(state.held);
  useEffect(() => {
    const id = moved.current;
    const justHeld = state.held && !wasHeld.current;
    wasHeld.current = state.held;
    // The panel's swap can come a render later (the candidate is queued first): it waits for it.
    if (!focusLost()) { if (id !== PANEL) moved.current = null; return; }
    moved.current = null;
    if (justHeld) { focusLine(heldRef.current); return; }
    if (id === PANEL) {
      // *It won't step back* / *Meet it another time* gave way to their lines: the panel's last line.
      const lines = rootRef.current?.querySelectorAll<HTMLElement>('[data-testid="wont-step-back"] p');
      focusLine(lines && lines.length ? lines[lines.length - 1] : null);
      return;
    }
    if (id) {
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-step-back-figure="${id}"], [data-shelf-figure="${id}"]`);
      focusLine(el ?? null);
    }
  });
  const toggle = (id: string) => { moved.current = id; onToggle(id); };
  const inPanel = (f: () => void) => () => { moved.current = PANEL; f(); };

  const t = state.held ? 1 : reduce ? 0 : progress;
  const spots = placedSpots(state, t);
  // Reading order follows where they stand (top to bottom, then left to right), not the order placed.
  const at = placedSpots(state, 0);
  const inOrder = [...state.placed].sort((a, b) => {
    const pa = at.get(a)!, pb = at.get(b)!;
    return Math.abs(pa.y - pb.y) > 0.02 ? pa.y - pb.y : pa.x - pb.x;
  });
  const byId = new Map(parts.map((p) => [p.id, p]));
  const shelf = parts.filter((p) => !state.placed.includes(p.id));
  const open = state.open ? byId.get(state.open) ?? null : null;
  const openWont = open ? state.stillClose.includes(open.id) : false;
  // The light: about the near ring at rest, out to the edge once everyone has stepped back.
  const light = (NEAR + (EDGE - NEAR) * t) * 100 + 6;

  const figure = (p: StepBackPart, size: number) => (p.tender
    ? <TenderCover size={size} />
    : <span style={{ opacity: p.id === UNMET ? 0.6 : p.resting ? 0.8 : 1 }} className="block"><PartFigure shapeSig={p.shapeSig} size={size} still /></span>);

  return (
    <section ref={rootRef} className="space-y-4" data-testid="step-back">
      <h2 className="text-lg font-medium text-[var(--color-text-primary)]">{copy.wm_who}</h2>

      <div role="group" aria-label={copy.wm_room}
        className="relative w-full max-w-[320px] mx-auto aspect-square rounded-2xl overflow-hidden border border-[var(--color-border-subtle)]"
        style={{ background: 'var(--color-wall)' }} data-step-back-room="" data-held={state.held ? '' : undefined}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id={`${uid}-lamp`}>
              <stop offset="0%" stopColor="var(--color-accent-glow)" stopOpacity={0.5} />
              <stop offset="55%" stopColor="var(--color-accent-glow)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-accent-glow)" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${uid}-dusk`} cx="50%" cy="50%" r="72%">
              <stop offset="45%" stopColor="#000" stopOpacity={0} />
              <stop offset="100%" stopColor="#000" stopOpacity={0.32} />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-dusk)`} />
          {/* The light is the person: no label, no node, nothing to tap. */}
          <circle cx="50" cy="50" r={light} fill={`url(#${uid}-lamp)`} data-step-back-light={light.toFixed(1)} />
        </svg>
        {inOrder.map((id) => {
          const p = byId.get(id);
          const s = spots.get(id);
          if (!p || !s) return null;
          const still = state.stillClose.includes(id);
          return (
            <button key={id} type="button" data-step-back-figure={id} data-still-close={still ? '' : undefined}
              aria-pressed={state.held ? state.open === id : true}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center min-w-11 min-h-11 p-1 rounded-xl
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-border-accent)]"
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              onClick={() => (state.held ? onOpen(state.open === id ? null : id) : toggle(id))}>
              <span className="block mx-auto" style={{ width: FIGURE, height: FIGURE }}>{figure(p, FIGURE)}</span>
              <span className="block max-w-[5.5rem] mx-auto font-serif text-[12px] leading-tight text-[var(--color-text-primary)] break-words line-clamp-2">{p.name}</span>
            </button>
          );
        })}
      </div>

      {showSafety(state, parts) && <CrisisBanner compact />}

      {!state.held && (
        <>
          <p className="text-sm text-[var(--color-text-secondary)]">{copy.wm_who_help}</p>
          <ul className="flex flex-wrap gap-2" aria-label={copy.wm_who}>
            {shelf.map((p) => (
              <li key={p.id}>
                <button type="button" aria-pressed={false} data-shelf-figure={p.id} onClick={() => toggle(p.id)}
                  className="flex items-center gap-2 min-h-11 pl-1 pr-3 rounded-xl border border-[var(--color-border)] text-sm text-left text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]">
                  <span className="shrink-0" style={{ width: SHELF_FIGURE, height: SHELF_FIGURE }}>{figure(p, SHELF_FIGURE)}</span>
                  <span className={p.id === UNMET ? '' : 'font-serif'}>{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {state.placed.length === 0
            ? <button type="button" className={linkButton} onClick={onNoOne}>{copy.wm_no_one}</button>
            : (
              <div className="space-y-3">
                <p className="text-base text-[var(--color-text-primary)]">{copy.wm_step_back}</p>
                <HoldButton label={copy.wm_hold} hint={copy.hold_hint} ms={LIGHT_HOLD_MS}
                  onProgress={setProgress} onLetGo={() => setTried(true)} onComplete={onHeld} />
                {tried && <button type="button" className={linkButton} onClick={() => onDone(false)}>{copy.wm_next}</button>}
              </div>
            )}
        </>
      )}

      {state.held && (
        <div className="space-y-3">
          <p ref={heldRef} role="status" className="text-base text-[var(--color-text-primary)]">{copy.wm_held}</p>
          {!open && <p className="text-sm text-[var(--color-text-secondary)]">{copy.wm_tap_one}</p>}
          {open && (
            <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] space-y-2" data-testid="wont-step-back">
              <p className="font-serif text-[var(--color-text-primary)]">{open.name}</p>
              {!openWont
                ? <button type="button" className={linkButton} onClick={inPanel(() => onWont(open.id))}>{copy.wm_wont}</button>
                : (
                  <>
                    <p className="text-sm text-[var(--color-text-secondary)]">{copy.wm_wont_line}</p>
                    {open.id !== UNMET
                      ? <Link {...linkTo(open.id)} className={linkButton}>{copy.wm_meet_later}</Link>
                      : state.unmetLater
                        ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">{copy.wm_later_done}</p>
                        : <button type="button" className={linkButton} onClick={inPanel(onUnmetLater)}>{copy.wm_meet_later}</button>}
                  </>
                )}
            </div>
          )}
          <button type="button" className={primaryButton} onClick={() => onDone(true)}>{copy.wm_next}</button>
        </div>
      )}

      <button type="button" className={linkButton} onClick={onUseMinds}>{copy.wm_use_minds}</button>
    </section>
  );
}

const linkTo = (partId: string) => {
  const l = stepBackMeetLink(partId);
  return { to: l.pathname, state: l.state };
};
