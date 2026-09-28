import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { DirectionProps, SessionRecord } from '../../record';
import { askUnlocked } from '../../record';
import { CAPACITY, CLOSE, EXITS, PULLS, SCENARIOS, STARTING_WORDS, VALIDATION_FOLLOW, validationFor, type Band, type Pull, type Scenario } from '../../script';
import { NEUTRAL, Search, WordWalk, soundFrom, type Sound, type Vec4 } from './model';
import { TuneAudio, baseFreq } from './audio';
import { InstState, Instrument, useReducedMotion } from './Instrument';
import { MiniString } from './Mini';
import { Harp } from './Harp';

type Step = 'intro' | 'find' | 'capacity' | 'pull' | 'breathe' | 'wake' | 'word' | 'scenario' | 'validate' | 'exits' | 'close' | 'collection';
type ExitId = SessionRecord['exitId'];
type CloseId = SessionRecord['close'];

const CSS = `
.tune{--t-dark:0;--t-bg:#EFE8DC;--t-bg-2:#E2D6C4;--t-ink:#231F1B;--t-ink-2:#6A6054;--t-str-a:#2B2521;--t-str-b:#2E4A7A;--t-warm:#C0532A;--t-gold:#B7862F;--t-accent:#C9502A;--t-key:rgba(255,251,244,.5);--t-key-line:rgba(35,31,27,.2);--t-card:rgba(255,251,244,.66);--t-engrave:0 1px 0 rgba(255,255,255,.75),0 -1px 0 rgba(60,40,20,.18);background:var(--t-bg);color:var(--t-ink)}
.tune-dark{--t-dark:1;--t-bg:#100F0D;--t-bg-2:#060605;--t-ink:#F1EADF;--t-ink-2:#A89F92;--t-str-a:#F6E7CB;--t-str-b:#9ED6E6;--t-warm:#FFAE6B;--t-gold:#FFD27A;--t-accent:#FF7A3D;--t-key:rgba(255,245,230,.045);--t-key-line:rgba(241,234,223,.2);--t-card:rgba(24,22,19,.72);--t-engrave:0 0 22px rgba(255,190,120,.35)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .tune{--t-dark:1;--t-bg:#100F0D;--t-bg-2:#060605;--t-ink:#F1EADF;--t-ink-2:#A89F92;--t-str-a:#F6E7CB;--t-str-b:#9ED6E6;--t-warm:#FFAE6B;--t-gold:#FFD27A;--t-accent:#FF7A3D;--t-key:rgba(255,245,230,.045);--t-key-line:rgba(241,234,223,.2);--t-card:rgba(24,22,19,.72);--t-engrave:0 0 22px rgba(255,190,120,.35)}}
:root[data-theme="dark"] .tune{--t-dark:1;--t-bg:#100F0D;--t-bg-2:#060605;--t-ink:#F1EADF;--t-ink-2:#A89F92;--t-str-a:#F6E7CB;--t-str-b:#9ED6E6;--t-warm:#FFAE6B;--t-gold:#FFD27A;--t-accent:#FF7A3D;--t-key:rgba(255,245,230,.045);--t-key-line:rgba(241,234,223,.2);--t-card:rgba(24,22,19,.72);--t-engrave:0 0 22px rgba(255,190,120,.35)}
.tune .key{backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.tune .led{width:6px;height:6px;border-radius:99px;background:var(--t-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--t-accent) 18%,transparent),0 0 10px var(--t-accent)}
`;

/** Where the strings sit for each step (fraction of height), how far apart, how big. */
const LAYOUT: Record<Step, { cy: number; gap: number; amp: number }> = {
  intro: { cy: 0.47, gap: 96, amp: 1 },
  find: { cy: 0.45, gap: 100, amp: 1 },
  capacity: { cy: 0.37, gap: 64, amp: 0.75 },
  pull: { cy: 0.285, gap: 46, amp: 0.5 },
  breathe: { cy: 0.45, gap: 100, amp: 1 },
  wake: { cy: 0.45, gap: 100, amp: 1 },
  word: { cy: 0.43, gap: 70, amp: 0.8 },
  scenario: { cy: 0.3, gap: 40, amp: 0.4 },
  validate: { cy: 0.37, gap: 70, amp: 0.85 },
  exits: { cy: 0.33, gap: 44, amp: 0.45 },
  close: { cy: 0.36, gap: 64, amp: 0.8 },
  collection: { cy: 0.3, gap: 60, amp: 0.6 },
};

const THEY: Record<string, string> = {
  brushed: 'Brushed off something you said',
  mocked: 'Laughed at you or twisted your words',
  'left-out': 'Left you out or ignored you',
  'pulled-away': 'Went quiet or pulled away',
  small: 'Made you feel small or stupid',
};

const ease = [0.22, 1, 0.36, 1] as const;
const buzz = () => { try { navigator.vibrate?.(6); } catch { /* */ } };

function Key({ children, onClick, primary, led, className = '', disabled, ariaLabel }: {
  children: ReactNode; onClick: () => void; primary?: boolean; led?: boolean; className?: string; disabled?: boolean; ariaLabel?: string;
}) {
  return (
    <motion.button type="button" data-ui whileTap={disabled ? undefined : { scale: 0.96, y: 1 }} disabled={disabled} aria-label={ariaLabel}
      onClick={() => { buzz(); onClick(); }}
      className={`key relative min-h-12 px-4 rounded-[14px] border text-[15px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${className}`}
      style={primary
        ? { background: 'var(--t-ink)', color: 'var(--t-bg)', borderColor: 'var(--t-ink)' }
        : { background: 'var(--t-key)', borderColor: 'var(--t-key-line)', color: 'var(--t-ink)' }}>
      {led && <span className="led shrink-0" aria-hidden />}
      {children}
    </motion.button>
  );
}

function Quiet({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" data-ui onClick={onClick} className="min-h-11 px-3 text-[14px] underline underline-offset-4 decoration-1"
      style={{ color: 'var(--t-ink-2)', textDecorationColor: 'var(--t-key-line)' }}>{children}</button>
  );
}

function Head({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-6 pt-2">
      <h2 className="text-[25px] leading-[1.18] font-medium tracking-[-0.015em]">{title}</h2>
      {sub && <p className="mt-2 text-[15px] leading-snug" style={{ color: 'var(--t-ink-2)' }}>{sub}</p>}
    </div>
  );
}

function SoundGlyph({ on }: { on: boolean }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 5v4h3l4 3V2L4 5H1z" fill="currentColor" stroke="none" />
      {on ? <><path d="M11 4.5c1 1.4 1 3.6 0 5" /><path d="M13.5 2.5c2 2.6 2 6.4 0 9" /></> : <path d="M11.5 4.5l5 5M16.5 4.5l-5 5" />}
    </svg>
  );
}

export function Tune({ onRecord }: DirectionProps) {
  const reduced = useReducedMotion();
  const inst = useMemo(() => new InstState(), []);
  const audio = useRef<TuneAudio | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [step, setStep] = useState<Step>('intro');

  // session
  const search = useRef(new Search());
  const [taps, setTaps] = useState(0);
  const [lastMove, setLastMove] = useState<'closer' | 'further' | null>(null);
  const [found, setFound] = useState<Vec4 | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [pullSel, setPullSel] = useState<Pull | null>(null);
  const [pull, setPull] = useState<Pull | null>(null);
  const [notif, setNotif] = useState(false);
  // regulation
  const [breaths, setBreaths] = useState(0);
  const [hint, setHint] = useState<string>('');
  const [holding, setHolding] = useState(false);
  const [plucks, setPlucks] = useState(0);
  const regDone = useRef(false);
  const holdT = useRef(0);
  const lastPluck = useRef(0);
  const hintTimer = useRef<number | undefined>(undefined);
  // word
  const walk = useRef<WordWalk | null>(null);
  const [offer, setOffer] = useState<string | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [wordDone, setWordDone] = useState(false);
  // rest
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [exitId, setExitId] = useState<ExitId | null>(null);
  const [cmp, setCmp] = useState<'then' | 'now'>('now');
  const nowSound = useRef<Sound>(NEUTRAL);
  const [collection, setCollection] = useState<string[]>(STARTING_WORDS);
  const recorded = useRef(false);

  const apply = useCallback((s: Sound, glideTc?: number) => {
    inst.target = { ...s };
    audio.current?.set(inst.target, 0.3, glideTc);
  }, [inst]);

  useEffect(() => { inst.layout = { ...LAYOUT[step] }; }, [step, inst]);
  useEffect(() => () => { audio.current?.dispose(); audio.current = null; window.clearTimeout(hintTimer.current); }, []);

  const toggleSound = () => {
    if (soundOn) { audio.current?.dispose(); audio.current = null; setSoundOn(false); return; }
    try {
      const a = new TuneAudio(); audio.current = a; a.ctx.resume?.();
      a.set(inst.target, 0.5); setSoundOn(true);
    } catch { setSoundOn(false); }
  };

  const go = (s: Step) => setStep(s);
  const thenSound = () => soundFrom(found ?? search.current.cand);

  // --- 1 intro -> 2 find
  const begin = () => { apply(soundFrom(search.current.cand)); go('find'); };
  const move = (dir: 'closer' | 'further') => {
    dir === 'closer' ? search.current.closer() : search.current.further();
    setTaps(t => t + 1); setLastMove(dir);
    apply(soundFrom(search.current.cand));
  };
  const thatsIt = () => { setFound([...search.current.cand] as Vec4); go('capacity'); };

  // --- 3 capacity: the text lands, the strings flinch
  useEffect(() => {
    if (step !== 'capacity') return;
    setNotif(false);
    const t1 = window.setTimeout(() => {
      setNotif(true); inst.twitch(); audio.current?.twitch(); buzz();
      const base = inst.target;
      apply({ ...base, rough: Math.min(1, base.rough + 0.25), loud: Math.min(1, base.loud + 0.2) });
      window.setTimeout(() => apply(base), 700);
    }, 650);
    return () => window.clearTimeout(t1);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 4 pull
  const previewPull = (p: Pull) => {
    setPullSel(p);
    audio.current?.gesture(p, baseFreq(found?.[2] ?? 0.5) * 2);
    inst.pluck(p === 'hide' || p === 'blank' ? 1 : 0, 0.5, p === 'blank' ? 0.15 : p === 'fight' ? 1.4 : 0.7);
  };
  const confirmPull = () => {
    if (!pullSel || !found) return;
    setPull(pullSel);
    regDone.current = false; setHint('');
    if (pullSel === 'blank') {
      setPlucks(0);
      apply({ ...NEUTRAL, register: found[2] * 0.7, loud: 0.05, warm: 0, rough: 0.03, grit: 0, pulse: 0 });
      go('wake');
    } else if (band === 'flooded') {
      setBreaths(0);
      const s = soundFrom(found);
      apply({ ...s, rough: Math.max(0.6, s.rough), loud: Math.max(0.55, s.loud) });
      setHint('Press and hold anywhere on the strings as you breathe in.');
      go('breathe');
    } else startWord();
  };

  // --- 5a breathe (flooded)
  const breathSound = (n: number): Sound => {
    const s = soundFrom(found!);
    const r0 = Math.max(0.6, s.rough);
    const k = Math.pow(0.6, n);
    const done = n >= 5;
    return { ...s, rough: done ? 0.02 : r0 * k, grit: s.grit * Math.pow(0.72, n), pulse: s.pulse * Math.pow(0.7, n), loud: Math.max(0.35, Math.max(0.55, s.loud) - n * 0.04), bloom: done ? 1 : 0, warm: 0.35 + n * 0.1 };
  };
  const setHintLater = (msg: string, ms: number) => { window.clearTimeout(hintTimer.current); hintTimer.current = window.setTimeout(() => setHint(msg), ms); };
  const holdStart = () => {
    if (regDone.current) return;
    window.clearTimeout(hintTimer.current);
    holdT.current = performance.now();
    inst.holding = true; inst.holdStart = holdT.current / 1000;
    setHolding(true); setHint('Breathe in, slowly…');
    apply({ ...breathSound(breaths), glide: 1 }, 1.3);
  };
  const holdEnd = () => {
    if (!inst.holding) return;
    const dur = performance.now() - holdT.current;
    inst.holding = false; inst.holdEnd = performance.now() / 1000; setHolding(false);
    if (dur >= 3000) {
      const n = breaths + 1; setBreaths(n);
      apply({ ...breathSound(n), glide: 0 }, 1.8);
      if (n >= 5) {
        regDone.current = true;
        audio.current?.pluck(baseFreq(found![2]) * 3, { bright: 0.3, gain: 0.12, decay: 3 });
        setHint('Hear it? The throb is slow and soft now. They’re in tune.');
      } else {
        setHint('And out, just as slowly.');
        setHintLater(n >= 3 ? 'Almost there. Again, when you’re ready.' : 'Again, when you’re ready.', 4500);
      }
    } else {
      apply({ ...breathSound(breaths), glide: 0 }, 1.8);
      setHint('A little slower. Keep holding the whole way in, about four seconds.');
    }
  };

  // --- 5b wake (blank)
  const onPluck = (i: number) => {
    const now = performance.now();
    if (now - lastPluck.current < 140 || regDone.current) { if (!regDone.current) audio.current?.pluck(baseFreq(inst.target.register) * (i ? 1.5 : 1), { bright: 0.2, gain: 0.05, decay: 0.6 }); return; }
    lastPluck.current = now;
    const n = plucks + 1; setPlucks(n);
    const k = Math.min(1, n / 6);
    const f = baseFreq(found![2] * 0.7 + k * 0.35) * (i ? 1.5 : 1) * 2;
    audio.current?.pluck(f, { bright: 0.15 + k * 0.7, gain: 0.08 + k * 0.22, decay: 0.8 + k * 1.2 });
    apply({ ...NEUTRAL, register: found![2] * 0.7 + k * 0.3, loud: 0.05 + k * 0.6, warm: k, rough: 0.03, grit: 0, pulse: k * 0.15 });
    if (n >= 6) { regDone.current = true; setHint('There. Awake, and warmer.'); }
    else setHint(['Again.', 'And again. A bit harder.', 'Brighter.', 'Keep going.', 'One more.'][n - 1]);
  };
  const pluckButton = () => { const i = plucks % 2; inst.pluck(i, 0.3 + Math.random() * 0.4, 1); onPluck(i); };

  // --- 6 word as hypothesis
  const regSound = useRef<Sound>(NEUTRAL);
  function startWord() {
    const v = found ?? search.current.cand;
    // "Sounds like this": bring back the sound you found (a little softer), then return to where you are after.
    regSound.current = { ...inst.target, glide: 0 };
    apply({ ...soundFrom(v), loud: soundFrom(v).loud * 0.8 });
    walk.current = new WordWalk(v);
    setOffer(walk.current.current()); setWord(null); setWordDone(false);
    go('word');
  }
  const afterReg = () => startWord();
  const skipReg = () => { inst.holding = false; setHolding(false); startWord(); };
  const answerWord = (a: 'yes' | 'close' | 'not') => {
    if (a === 'yes') {
      setWord(offer); setWordDone(true);
      inst.pluck(0, 0.35, 1.2); inst.pluck(1, 0.62, 0.8);
      audio.current?.pluck(baseFreq(inst.target.register) * 2, { bright: 0.45, gain: 0.25, decay: 2.2 });
      return;
    }
    const next = walk.current!.next(a);
    if (!next) { setOffer(null); setWordDone(true); } else setOffer(next);
  };

  // --- 7 what happened + validation
  const pickScenario = (s: Scenario) => {
    setScenario(s);
    // the strings loosen a little as you're met (only if we didn't already tune them)
    if (!(pull === 'blank' || band === 'flooded')) {
      const t = inst.target; apply({ ...t, rough: t.rough * 0.7, grit: t.grit * 0.8, pulse: t.pulse * 0.8, loud: t.loud * 0.9 });
    }
    go('validate');
  };

  // --- 8 exits
  const unlocked = band && pull ? askUnlocked(band, pull) : false;
  const best: ExitId = unlocked ? 'ask' : (pull === 'blank' || band === 'flooded') ? 'opposite' : 'land';
  const pickExit = (e: ExitId) => { setExitId(e); nowSound.current = { ...inst.target }; setCmp('now'); go('close'); };

  // --- 9 close: then vs now
  const listen = (which: 'then' | 'now') => {
    setCmp(which);
    apply(which === 'then' ? thenSound() : nowSound.current);
    inst.pluck(0, 0.4, 0.5);
  };
  const CLOSE_MAP: { id: CloseId; label: string }[] = [
    { id: 'louder', label: 'Then' }, { id: 'same', label: 'In between' }, { id: 'quieter', label: 'Now' }, { id: 'much', label: 'Now, and softer' },
  ];
  const finish = (c: CloseId) => {
    if (!scenario || !band || !pull || !exitId) return;
    const rec: SessionRecord = { scenarioId: scenario.id as SessionRecord['scenarioId'], band, pull, word, exitId, close: c };
    if (!recorded.current) { recorded.current = true; onRecord?.(rec); }
    if (word && !collection.includes(word)) setCollection(cs => [...cs, word]);
    apply({ ...nowSound.current, hush: 1 });
    go('collection');
  };
  const strumHarp = () => {
    const words = word && !collection.includes(word) ? [...collection, word] : collection;
    const pent = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    audio.current?.strum(words.map((_, i) => 196 * Math.pow(2, pent[(words.length - 1 - i) % pent.length] / 12)));
  };

  const restart = () => {
    search.current = new Search();
    setTaps(0); setLastMove(null); setFound(null); setBand(null); setPullSel(null); setPull(null); setNotif(false);
    setBreaths(0); setHint(''); setPlucks(0); regDone.current = false;
    setOffer(null); setWord(null); setWordDone(false); setScenario(null); setExitId(null); recorded.current = false;
    apply(NEUTRAL); go('intro');
  };

  useEffect(() => { apply(NEUTRAL); }, [apply]);

  const interact = step === 'breathe' && !regDone.current ? 'hold' : step === 'wake' ? 'pluck' : 'none';
  const regComplete = (step === 'breathe' && breaths >= 5) || (step === 'wake' && plucks >= 6);

  const fade = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.5, ease } };

  const body = (): ReactNode => {
    switch (step) {
      case 'intro': return (
        <>
          <Head title={<>Something happened with someone.<br />Let’s find how it sounds in there.</>}
            sub="No words needed yet. You’ll steer by ear, or by eye." />
          <div className="flex-1" />
          <div className="px-6 pb-6 flex flex-col gap-3">
            {!soundOn && (
              <button type="button" data-ui onClick={toggleSound} className="key min-h-14 rounded-[14px] border px-4 flex items-center gap-3 text-left"
                style={{ background: 'var(--t-key)', borderColor: 'var(--t-key-line)' }}>
                <SoundGlyph on={false} />
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">Sound on</span>
                  <span className="text-[13px]" style={{ color: 'var(--t-ink-2)' }}>Headphones help. It all works silently too.</span>
                </span>
              </button>
            )}
            <Key primary onClick={begin} className="min-h-14 text-[16px]">Begin</Key>
          </div>
        </>
      );
      case 'find': return (
        <>
          <Head title="Is this closer to how it feels, or further?"
            sub={taps === 0 ? 'Listen, or just watch the strings. Nothing has to be exact.' : taps >= 9 ? 'Near enough is plenty. Tap “That’s it” whenever it fits.' : lastMove === 'closer' ? 'Keeping on in that direction…' : 'Trying a different direction…'} />
          <div className="flex-1" />
          <div className="px-5 pb-6 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Key onClick={() => move('further')} ariaLabel="Further from how it feels">
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M1 5h14M1 5l3-3M1 5l3 3" strokeLinecap="round" /></svg>Further
              </Key>
              <Key onClick={() => move('closer')} ariaLabel="Closer to how it feels">
                Closer<svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M1 5h14M15 5l-3-3M15 5l-3 3" strokeLinecap="round" /></svg>
              </Key>
            </div>
            <Key primary led={taps >= 6} onClick={thatsIt} className="min-h-14 text-[16px]">That’s it</Key>
          </div>
        </>
      );
      case 'capacity': return (
        <>
          <div className="px-5 pt-1 h-[76px]">
            <AnimatePresence>
              {notif && (
                <motion.div initial={reduced ? { opacity: 0 } : { y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="key rounded-[18px] border px-4 py-3 flex items-center gap-3 shadow-[0_12px_30px_-14px_rgba(0,0,0,.35)]"
                  style={{ background: 'var(--t-card)', borderColor: 'var(--t-key-line)' }} role="status">
                  <span className="size-9 rounded-full grid place-items-center text-[13px] font-semibold shrink-0 border" style={{ borderColor: 'var(--t-key-line)', color: 'var(--t-ink-2)' }}>T</span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-[12px] font-medium" style={{ color: 'var(--t-ink-2)' }}>Them · now</span>
                    <span className="text-[15px] truncate">{CAPACITY.incoming}</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1" />
          <motion.div className="px-5 pb-6 flex flex-col gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: notif ? 1 : 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <p className="px-1 pb-1 text-[20px] font-medium tracking-[-0.01em]">{CAPACITY.prompt}</p>
            {CAPACITY.options.map(o => (
              <button key={o.band} type="button" data-ui disabled={!notif} onClick={() => { buzz(); setBand(o.band); go('pull'); }}
                className="key min-h-[60px] rounded-[14px] border px-4 py-2.5 text-left flex flex-col justify-center"
                style={{ background: 'var(--t-key)', borderColor: 'var(--t-key-line)' }}>
                <span className="text-[15px] font-medium">{o.reply}</span>
                <span className="text-[13px]" style={{ color: 'var(--t-ink-2)' }}>{o.example}</span>
              </button>
            ))}
          </motion.div>
        </>
      );
      case 'pull': return (
        <>
          <Head title="What does it want to do?" sub="Tap one to hear it. Pick the one that pulls." />
          <div className="flex-1" />
          <div className="px-5 pb-6 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="What it wants to do">
              {PULLS.map(p => {
                const on = pullSel === p.id;
                return (
                  <motion.button key={p.id} type="button" data-ui role="radio" aria-checked={on} whileTap={{ scale: 0.97 }} onClick={() => { buzz(); previewPull(p.id); }}
                    className="key rounded-[16px] border px-3 pt-2 pb-3 text-left flex flex-col"
                    style={{ background: 'var(--t-key)', borderColor: on ? 'var(--t-accent)' : 'var(--t-key-line)', boxShadow: on ? '0 0 0 1px var(--t-accent)' : undefined }}>
                    <MiniString kind={p.id} active={on} />
                    <span className="text-[15px] font-medium leading-tight mt-1">{p.label}</span>
                    <span className="text-[12.5px] leading-snug" style={{ color: 'var(--t-ink-2)' }}>{p.detail}</span>
                  </motion.button>
                );
              })}
            </div>
            <Key primary disabled={!pullSel} onClick={confirmPull} className="min-h-14 text-[16px]">That’s the pull</Key>
          </div>
        </>
      );
      case 'breathe': return (
        <>
          <Head title="Breathe them back into tune." sub="Hold anywhere on the instrument while you breathe in. The low string climbs to meet the other. Let go to breathe out." />
          <div className="flex-1" />
          <div className="px-6 pb-5 flex flex-col items-center gap-2 text-center">
            <p aria-live="polite" className="min-h-[44px] text-[15px] leading-snug max-w-[300px]" style={{ color: holding ? 'var(--t-ink)' : 'var(--t-ink-2)' }}>{hint}</p>
            {regComplete
              ? <Key primary led onClick={afterReg} className="w-full min-h-14 text-[16px]">Continue</Key>
              : <Quiet onClick={skipReg}>Skip this</Quiet>}
          </div>
        </>
      );
      case 'wake': return (
        <>
          <Head title="Wake the strings." sub="Tap them, or strum across. Each one a little harder than the last." />
          <div className="flex-1" />
          <div className="px-6 pb-5 flex flex-col items-center gap-2 text-center">
            <p aria-live="polite" className="min-h-[24px] text-[15px]" style={{ color: 'var(--t-ink-2)' }}>{hint}</p>
            {regComplete
              ? <Key primary led onClick={afterReg} className="w-full min-h-14 text-[16px]">Continue</Key>
              : <div className="flex items-center gap-2"><Key onClick={pluckButton} className="px-6">Pluck</Key><Quiet onClick={skipReg}>Skip this</Quiet></div>}
          </div>
        </>
      );
      case 'word': return (
        <>
          <Head title="Sounds like this often get called…" sub="The sound you found, once more." />
          <div className="flex-1 flex flex-col items-center justify-end pb-6 px-6 text-center">
            <AnimatePresence mode="wait">
              {!wordDone && offer && (
                <motion.div key={offer} {...fade} className="flex flex-col items-center">
                  <span className="text-[44px] leading-none font-light italic tracking-[-0.01em]" style={{ color: 'var(--t-ink)' }}>{offer}?</span>
                  <span className="mt-3 text-[14px]" style={{ color: 'var(--t-ink-2)' }}>Only a guess. You know better.</span>
                </motion.div>
              )}
              {wordDone && word && (
                <motion.div key="yes" initial={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease }} className="flex flex-col items-center">
                  <span className="text-[48px] leading-none font-medium tracking-[0.02em]" style={{ textShadow: 'var(--t-engrave)', color: 'var(--t-ink)' }}>{word}</span>
                  <span className="mt-3 h-px w-24" style={{ background: 'var(--t-accent)' }} />
                  <span className="mt-3 text-[14px]" style={{ color: 'var(--t-ink-2)' }}>Kept. You found that by ear.</span>
                </motion.div>
              )}
              {wordDone && !word && (
                <motion.p key="none" {...fade} className="text-[17px] leading-snug max-w-[290px]" style={{ color: 'var(--t-ink-2)' }}>
                  No word fits yet. That’s fine. You found the sound, and that’s the hard part.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="px-5 pb-6">
            {!wordDone ? (
              <div className="grid grid-cols-3 gap-2.5">
                <Key onClick={() => answerWord('not')}>Not that</Key>
                <Key onClick={() => answerWord('close')}>Close</Key>
                <Key primary onClick={() => answerWord('yes')}>Yes</Key>
              </div>
            ) : <Key primary onClick={() => { apply(regSound.current); go('scenario'); }} className="w-full min-h-14 text-[16px]">Continue</Key>}
          </div>
        </>
      );
      case 'scenario': return (
        <>
          <Head title="What did they do?" sub="The closest one is enough." />
          <div className="flex-1" />
          <div className="px-5 pb-6 flex flex-col gap-2">
            {SCENARIOS.map(s => (
              <button key={s.id} type="button" data-ui onClick={() => { buzz(); pickScenario(s); }}
                className="key min-h-[54px] rounded-[14px] border px-4 text-left text-[15px] leading-snug"
                style={{ background: 'var(--t-key)', borderColor: 'var(--t-key-line)' }}>{THEY[s.id] ?? s.question}</button>
            ))}
          </div>
        </>
      );
      case 'validate': return (
        <>
          <div className="flex-1" />
          <div className="px-6 pb-6 flex flex-col gap-4">
            <p className="text-[24px] leading-[1.22] font-medium tracking-[-0.015em]">{scenario && validationFor(scenario)}</p>
            <p className="text-[16px] leading-snug" style={{ color: 'var(--t-ink-2)' }}>{VALIDATION_FOLLOW}</p>
            <Key primary onClick={() => go('exits')} className="mt-2 min-h-14 text-[16px]">Continue</Key>
          </div>
        </>
      );
      case 'exits': return (
        <>
          <Head title="What would help next?" />
          <div className="flex-1" />
          <div className="px-5 pb-6 flex flex-col gap-2.5">
            {([
              { id: 'ask' as ExitId, ...EXITS.steady, locked: !unlocked },
              { id: 'land' as ExitId, ...EXITS.land, locked: false },
              { id: 'opposite' as ExitId, ...EXITS.opposite[pull ?? 'hide'], locked: false },
            ]).map(x => (
              <button key={x.id} type="button" data-ui disabled={x.locked} onClick={() => { buzz(); pickExit(x.id); }}
                className="key rounded-[16px] border px-4 py-3.5 text-left flex flex-col gap-0.5"
                style={{ background: x.id === best ? 'var(--t-card)' : 'var(--t-key)', borderColor: x.id === best ? 'var(--t-accent)' : 'var(--t-key-line)', opacity: x.locked ? 0.55 : 1 }}>
                {x.id === best && <span className="flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--t-accent)' }}><span className="led" aria-hidden />Best fit now</span>}
                <span className="flex items-center gap-2 text-[16px] font-medium">
                  {x.locked && <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><rect x="1.5" y="6" width="9" height="7" rx="1.5" /><path d="M3.5 6V4a2.5 2.5 0 015 0v2" /></svg>}
                  {x.title}
                </span>
                <span className="text-[14px] leading-snug" style={{ color: 'var(--t-ink-2)' }}>{x.locked ? 'Opens once it’s quieter.' : x.body}</span>
              </button>
            ))}
          </div>
        </>
      );
      case 'close': return (
        <>
          <Head title="Listen back." sub="How it sounded then, and how it sounds now." />
          <div className="flex-1 flex items-end justify-center gap-3 px-6 pb-5">
            {(['then', 'now'] as const).map(w => (
              <button key={w} type="button" data-ui onClick={() => { buzz(); listen(w); }} aria-pressed={cmp === w}
                className="key min-h-12 min-w-[120px] rounded-full border px-5 text-[15px] font-medium flex items-center justify-center gap-2"
                style={{ background: cmp === w ? 'var(--t-card)' : 'transparent', borderColor: cmp === w ? 'var(--t-ink)' : 'var(--t-key-line)' }}>
                <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden><path d="M1 1l8 5-8 5z" fill="currentColor" /></svg>
                {w === 'then' ? 'Then' : 'Now'}
              </button>
            ))}
          </div>
          <div className="px-5 pb-6 flex flex-col gap-2.5">
            <p className="px-1 pb-1 text-[19px] font-medium tracking-[-0.01em]">Which is closer to you right now?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {CLOSE_MAP.map(c => <Key key={c.id} onClick={() => finish(c.id)} className="min-h-[52px]">{c.label}</Key>)}
            </div>
          </div>
        </>
      );
      case 'collection': {
        const fresh = word;
        const already = word ? STARTING_WORDS.includes(word) : false;
        return (
          <>
            <Head title="Your strings" sub={fresh ? (already ? `“${fresh}” again. You know this one now.` : `New: “${fresh}.” Finding a feeling by ear is a skill, and you just used it.`) : 'No new word this time. The sound counts too.'} />
            <div className="flex-1 flex flex-col justify-center px-5">
              <Harp words={collection} fresh={fresh} isNew={!already} onStrum={strumHarp} />
            </div>
            <div className="px-5 pb-6 flex flex-col gap-2">
              <Key onClick={restart} className="min-h-14 text-[16px]">Start again</Key>
            </div>
          </>
        );
      }
    }
  };

  const dark = typeof window !== 'undefined' && document.documentElement.dataset.theme === 'dark';

  return (
    <div className={`tune ${dark ? 'tune-dark' : ''} relative h-full w-full overflow-hidden select-none`} style={{ fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif' }}>
      <style>{CSS}</style>
      <Instrument inst={inst} interact={interact} onHoldStart={holdStart} onHoldEnd={holdEnd} onPluck={onPluck}
        label={interact === 'hold' ? 'Hold to breathe in, release to breathe out' : interact === 'pluck' ? 'Pluck the strings' : undefined} />
      <div className="absolute inset-0 flex flex-col pointer-events-none [&_button]:pointer-events-auto">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-[12px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--t-ink-2)' }}>Tune</span>
          <button type="button" data-ui onClick={toggleSound} aria-pressed={soundOn}
            className="min-h-11 -mr-2 px-3 rounded-full flex items-center gap-2 text-[13px] font-medium" style={{ color: soundOn ? 'var(--t-ink)' : 'var(--t-ink-2)' }}>
            {soundOn && <span className="led" aria-hidden />}<SoundGlyph on={soundOn} />{soundOn ? 'Sound on' : 'Sound off'}
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} {...fade} className="flex-1 min-h-0 flex flex-col">
            {body()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
