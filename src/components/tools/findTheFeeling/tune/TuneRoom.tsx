/**
 * Tune it: find the feeling by ear. Two strings whose standing waves carry the sound; a
 * closer/further search; the rest of the flow played on the same instrument, which drifts calmer
 * (or, for blank alone, a little brighter) as the session goes on: the ambient descent.
 *
 * All copy, words, urges and gates come from the graph payload (props.content). The flow moves
 * only through props.dispatch. Web Audio stays off until the person turns it on.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'motion/react';
import type { SoundVec } from '../../../../data/findTheFeelingTypes';
import { ambientDescent, driftSound, fill } from '../../../../lib/findTheFeeling';
import { STEP_ORDER, type FlowState } from '../../../../lib/findTheFeelingFlow';
import type { RoomProps } from '../roomTypes';
import { TuneAudio } from './audio';
import { Instrument, type Interact } from './Instrument';
import { InstState } from './instState';
import { LAYOUT, type Kit, type RegHandlers, SLOW } from './kit';
import { NEUTRAL, settled, soundFrom, woken, type Search, type Sound } from './sound';
import {
  BreatheStep, CapacityStep, CloseStep, CollectionStep, FindStep, HandoffStep, IntroStep, NextStep, OrientStep,
  PullStep, SetOffStep, WakeStep, WordStep,
} from './steps';
import { SoundGlyph, SwitchTrack } from './ui';
import './tune.css';

const ease = [0.22, 1, 0.36, 1] as const;

/** Steps whose sound the room sets from the scene; the others set their own on entry. */
const SCENE_STEPS = new Set<FlowState['step']>(['intro', 'capacity', 'pull', 'orient', 'setOff', 'next', 'handoff']);

/**
 * The scene sound: the found sound with ambient descent applied (display/playback only; the
 * snapshot in state.found is never touched), then any completed regulation layered on top.
 */
function sceneSound(state: FlowState, content: RoomProps['content'], found: SoundVec | null): Sound {
  if (!found) return { ...NEUTRAL };
  const { level, direction } = ambientDescent({
    stepsSinceStart: state.stepsSinceStart, band: state.band, pull: state.pull,
    gates: content.flow.gates, enabled: state.ambientDescent,
  });
  let s = soundFrom(driftSound(found, level, direction));
  const pastRegulate = STEP_ORDER.indexOf(state.step) > STEP_ORDER.indexOf('regulate') || state.step === 'handoff';
  if (pastRegulate && state.regulation === 'tune') s = settled(s);
  if (pastRegulate && state.regulation === 'wake') s = woken(s);
  return s;
}

export default function TuneRoom(room: RoomProps) {
  const { content, state, reducedMotion: reduced, slots, name } = room;
  const copy = content.flow.copy;
  const step = state.step;

  const [inst0] = useState(() => new InstState());
  const instRef = useRef(inst0);
  const audioRef = useRef<TuneAudio | null>(null);
  const searchRef = useRef<Search | null>(null);
  const regHandlersRef = useRef<RegHandlers>({});
  const [soundOn, setSoundOn] = useState(false);

  const apply = useCallback((s: Sound, tau = 0.3, glideTc?: number) => {
    const I = instRef.current;
    I.target = { ...s }; I.tau = tau;
    audioRef.current?.set(I.target, tau, glideTc);
  }, []);

  const found: SoundVec | null = state.found?.way === 'tune' ? state.found.vec : null;
  const base = useMemo(() => sceneSound(state, content, found), [state, content, found]);

  // Where the strings sit for this step (they glide there).
  useLayoutEffect(() => { instRef.current.layout = { ...LAYOUT[step] }; }, [step]);

  // Scene sound for steps that don't set their own. Slow glide: the descent should never be noticed.
  useEffect(() => {
    if (step === 'intro') { searchRef.current = null; apply(NEUTRAL, SLOW); return; }
    if (SCENE_STEPS.has(step)) apply(base, SLOW);
  }, [step, base, apply]);

  // Web Audio: only from the switch; faded out and closed on unmount.
  useEffect(() => () => { void audioRef.current?.dispose(); audioRef.current = null; }, []);
  const toggleSound = useCallback(() => {
    if (audioRef.current) { void audioRef.current.dispose(); audioRef.current = null; setSoundOn(false); return; }
    try {
      const a = new TuneAudio();
      audioRef.current = a;
      void a.ctx.resume?.();
      a.set(instRef.current.target, 0.5);
      setSoundOn(true);
    } catch { audioRef.current = null; setSoundOn(false); }
  }, []);

  const t = useCallback((s: string, vars: Record<string, string | number> = {}) => fill(s ?? '', { name: name ?? '', ...vars }), [name]);

  const kit: Kit = { room, copy, instRef, audioRef, searchRef, regHandlersRef, apply, base, found, reduced, t };

  const interact: Interact = step === 'regulate'
    ? state.regulation === 'tune' ? 'hold' : state.regulation === 'wake' ? 'pluck' : 'none'
    : 'none';
  const instLabel = interact === 'hold' ? copy.tune.breathe.title : interact === 'pluck' ? copy.tune.wake.title : undefined;

  const fade = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.45, ease } };

  let body: ReactNode;
  switch (step) {
    case 'intro': body = <IntroStep kit={kit} soundOn={soundOn} toggleSound={toggleSound} />; break;
    case 'find': body = <FindStep kit={kit} />; break;
    case 'capacity': body = <CapacityStep kit={kit} />; break;
    case 'pull': body = <PullStep kit={kit} />; break;
    case 'regulate': body = state.regulation === 'wake' ? <WakeStep kit={kit} /> : <BreatheStep kit={kit} />; break;
    case 'orient': body = <OrientStep kit={kit} />; break;
    case 'word': body = <WordStep kit={kit} />; break;
    case 'setOff': body = <SetOffStep kit={kit} />; break;
    case 'close': body = <CloseStep kit={kit} />; break;
    case 'next': body = <NextStep kit={kit} />; break;
    case 'collection': body = <CollectionStep kit={kit} />; break;
    case 'handoff': body = <HandoffStep kit={kit} />; break;
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="ftf-tune relative h-full w-full overflow-hidden select-none" data-step={step}>
        <Instrument instRef={instRef} interact={interact} reduced={reduced} label={instLabel}
          onHoldStart={() => regHandlersRef.current.onHoldStart?.()}
          onHoldEnd={() => regHandlersRef.current.onHoldEnd?.()}
          onPluck={i => regHandlersRef.current.onPluck?.(i)} />
        <div className={`absolute inset-0 flex flex-col ${interact !== 'none' ? 'pointer-events-none [&_button]:pointer-events-auto' : ''}`}>
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1 min-h-14">
            <div className="min-h-11 flex items-center">{slots.back}</div>
            {step !== 'intro' && (
              <button type="button" role="switch" aria-checked={soundOn} aria-label={copy.tune.sound} title={copy.entry.tuneHint}
                onClick={toggleSound}
                className="min-h-11 min-w-11 -mr-1 px-2.5 rounded-full flex items-center gap-2"
                style={{ color: soundOn ? 'var(--t-ink)' : 'var(--t-ink-2)' }}>
                <SoundGlyph on={soundOn} /><SwitchTrack on={soundOn} />
              </button>
            )}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={step === 'regulate' ? `regulate-${state.regulation}` : step} {...fade}
              className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">
              {body}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </LazyMotion>
  );
}
