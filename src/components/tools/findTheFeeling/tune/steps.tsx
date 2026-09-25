/**
 * Step bodies for the Tune room. Each is keyed by step in TuneRoom, so its local state resets when
 * the flow moves (including Back). They move the flow only through room.dispatch.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { Band, SetOff, SoundVec } from '../../../../data/findTheFeelingTypes';
import { answerOffer, rankFamilies } from '../../../../lib/findTheFeeling';
import { wordOnOffer } from '../../../../lib/findTheFeelingFlow';
import { MiniString } from './MiniString';
import { Harp, type HarpString } from './Harp';
import { useLater } from './hooks';
import { SLOW, type Kit } from './kit';
import { Search, baseFreq, breathSound, detuned, harpFreq, soundFrom, wakeSound } from './sound';
import { Beads, Choice, Head, Key, Quiet, SlotCard, SoundGlyph, SwitchTrack } from './ui';

const ease = [0.22, 1, 0.36, 1] as const;
const BANDS: Band[] = ['steady', 'stirred', 'flooded'];
const SET_OFFS: SetOff[] = ['someone', 'situation', 'body', 'nothing', 'not_sure'];

/** Bottom block: controls sit low, over the lower part of the body. */
function Bottom({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 pb-6 pt-3 flex flex-col gap-3 ${className}`}>{children}</div>;
}

// ─── intro ───────────────────────────────────────────────────────────────

export function IntroStep({ kit, soundOn, toggleSound }: { kit: Kit; soundOn: boolean; toggleSound: () => void }) {
  const { copy, room, t } = kit;
  return (
    <>
      <Head eyebrow={copy.entry.title} title={t(copy.tune.intro)} sub={t(copy.entry.sub)} />
      <div className="flex-1" />
      <Bottom>
        <button type="button" role="switch" aria-checked={soundOn} onClick={toggleSound}
          className="tune-key min-h-14 rounded-[14px] border px-4 flex items-center gap-3 text-left"
          style={{ background: 'var(--t-key)', borderColor: soundOn ? 'var(--t-accent)' : 'var(--t-key-line)', color: 'var(--t-ink)' }}>
          <SoundGlyph on={soundOn} />
          <span className="flex-1 text-[14px] leading-snug">{copy.entry.tuneHint}</span>
          <SwitchTrack on={soundOn} />
        </button>
        <Key primary onClick={() => room.dispatch({ t: 'begin' })} className="min-h-14 text-[16px]">{copy.tune.begin}</Key>
        <div className="flex justify-center">
          <Quiet onClick={() => room.dispatch({ t: 'switchWay', way: 'shape' })}>{copy.entry.switchToShape}</Quiet>
        </div>
      </Bottom>
    </>
  );
}

// ─── find: closer / further ──────────────────────────────────────────────

export function FindStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, searchRef, t } = kit;
  const [taps, setTaps] = useState(0);

  useEffect(() => {
    if (!searchRef.current) searchRef.current = new Search();
    apply(soundFrom(searchRef.current.cand), 0.4);
  }, [apply, searchRef]);

  const move = (dir: 'closer' | 'further') => {
    const s = searchRef.current ?? (searchRef.current = new Search());
    if (dir === 'closer') s.closer(); else s.further();
    setTaps(n => n + 1);
    apply(soundFrom(s.cand), 0.3);
  };
  const thatsIt = () => {
    const s = searchRef.current ?? (searchRef.current = new Search());
    room.dispatch({ t: 'found', found: { way: 'tune', vec: [...s.cand] as SoundVec } });
  };

  return (
    <>
      <Head title={t(copy.tune.search)} />
      <div className="flex-1" />
      <Bottom>
        <div className="grid grid-cols-2 gap-3">
          <Key onClick={() => move('further')}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M1 5h14M1 5l3-3M1 5l3 3" strokeLinecap="round" /></svg>
            {copy.tune.further}
          </Key>
          <Key onClick={() => move('closer')}>
            {copy.tune.closer}
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M1 5h14M15 5l-3-3M15 5l-3 3" strokeLinecap="round" /></svg>
          </Key>
        </div>
        <Key primary led={taps >= 6} onClick={thatsIt} className="min-h-14 text-[16px]">{copy.tune.thatsIt}</Key>
        <div className="flex justify-center -mb-2">
          <Quiet onClick={() => room.dispatch({ t: 'switchWay', way: 'shape' })}>{copy.entry.switchToShape}</Quiet>
        </div>
      </Bottom>
    </>
  );
}

// ─── capacity: the message lands, the strings flinch ─────────────────────

export function CapacityStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, instRef, audioRef, base, reduced, t } = kit;
  const [notif, setNotif] = useState(false);
  const later = useLater();
  const baseAtStart = useRef(base);

  useEffect(() => {
    const b = baseAtStart.current;
    later(() => {
      setNotif(true);
      instRef.current.twitch(); audioRef.current?.twitch();
      try { navigator.vibrate?.(8); } catch { /* not supported */ }
      apply({ ...b, rough: Math.min(1, b.rough + 0.25), loud: Math.min(1, b.loud + 0.2) }, 0.2);
      later(() => apply(b, SLOW), 700);
    }, reduced ? 120 : 650);
  }, [later, apply, instRef, audioRef, reduced]);

  return (
    <>
      <div className="px-5 pt-1 min-h-[76px]">
        <AnimatePresence>
          {notif && (
            <m.div initial={reduced ? { opacity: 0 } : { y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 320, damping: 26 }}
              className="tune-key rounded-[18px] border px-4 py-3 flex items-center gap-3 shadow-[0_12px_30px_-14px_rgba(0,0,0,.35)]"
              style={{ background: 'var(--t-card)', borderColor: 'var(--t-key-line)' }} role="status">
              <span className="size-9 rounded-full grid place-items-center shrink-0 border" style={{ borderColor: 'var(--t-key-line)' }} aria-hidden>
                <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ color: 'var(--t-ink-2)' }}>
                  <path d="M2 2h12v8H6l-3 2.5V10H2z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[15px] leading-snug">{copy.capacity.incoming}</span>
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1" />
      <m.div className="px-5 pb-6 flex flex-col gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: notif ? 1 : 0 }}
        transition={{ delay: reduced ? 0 : 0.5, duration: reduced ? 0.2 : 0.5 }}>
        <p className="px-1 pb-1 text-[20px] leading-snug font-medium tracking-[-0.01em]" style={{ textWrap: 'balance' }}>{t(copy.capacity.prompt)}</p>
        {BANDS.map(b => (
          <Choice key={b} label={copy.capacity.options[b]} disabled={!notif} onClick={() => room.dispatch({ t: 'band', band: b })} />
        ))}
      </m.div>
    </>
  );
}

// ─── pull: four urges, each a little gesture ─────────────────────────────

export function PullStep({ kit }: { kit: Kit }) {
  const { copy, room, instRef, audioRef, found, reduced, t } = kit;
  const [sel, setSel] = useState<string | null>(null);
  const later = useLater();
  const urges = [...room.content.urges].sort((a, b) => a.order - b.order);

  const pick = (id: typeof urges[number]['id']) => {
    if (sel) return;
    setSel(id);
    audioRef.current?.gesture(id, baseFreq(found?.[2] ?? 0.5) * 2);
    instRef.current.pluck(id === 'hide' || id === 'blank' ? 1 : 0, 0.5, id === 'blank' ? 0.15 : id === 'fight' ? 1.4 : 0.7);
    later(() => room.dispatch({ t: 'pull', pull: id }), reduced ? 150 : 520);
  };

  return (
    <>
      <Head title={t(copy.pull.title)} />
      <div className="flex-1" />
      <Bottom>
        <div className="grid grid-cols-2 gap-2.5">
          {urges.map(u => (
            <m.button key={u.id} type="button" whileTap={{ scale: 0.97 }} onClick={() => pick(u.id)} aria-pressed={sel === u.id}
              className="tune-key rounded-[16px] border px-3 pt-2 pb-3 text-left flex flex-col min-h-[120px]"
              style={{
                background: 'var(--t-key)', color: 'var(--t-ink)',
                borderColor: sel === u.id ? 'var(--t-accent)' : 'var(--t-key-line)', boxShadow: sel === u.id ? '0 0 0 1px var(--t-accent)' : undefined,
              }}>
              <MiniString kind={u.id} active={sel === u.id} reduced={reduced} />
              <span className="text-[15px] font-medium leading-tight mt-1">{u.label}</span>
              <span className="text-[13px] leading-snug mt-0.5" style={{ color: 'var(--t-ink-2)' }}>{u.sub}</span>
            </m.button>
          ))}
        </div>
      </Bottom>
    </>
  );
}

// ─── regulate ────────────────────────────────────────────────────────────

/** The escape hatch shows after the graph's regulationEscapeSeconds. */
function useEscape(kit: Kit) {
  const [show, setShow] = useState(false);
  const later = useLater();
  const secs = kit.room.content.flow.gates.regulationEscapeSeconds;
  useEffect(() => { later(() => setShow(true), Math.max(0, secs) * 1000); }, [later, secs]);
  return show;
}

/** Flooded: press and hold while breathing in; each full breath pulls the detuned string toward tune. */
export function BreatheStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, instRef, audioRef, regHandlersRef, t } = kit;
  const g = room.content.flow.gates;
  const total = Math.max(1, g.breathsToSettle);
  const [start] = useState(() => detuned(kit.base));
  const [breaths, setBreaths] = useState(0);
  const [hint, setHint] = useState<'' | 'tooQuick' | 'done'>('');
  const [holding, setHolding] = useState(false);
  const holdT = useRef(0);
  const done = breaths >= total;
  const later = useLater();
  const showEscape = useEscape(kit);

  useEffect(() => {
    const I = instRef.current;
    I.holdSecs = g.breathHoldMs / 1000; I.holdStart = 0; I.holding = false;
    apply(breathSound(start, 0, total), SLOW);
    return () => { I.holding = false; I.holdStart = 0; };
  }, [apply, instRef, start, total, g.breathHoldMs]);

  useLayoutEffect(() => {
    regHandlersRef.current = {
      onHoldStart: () => {
        if (done) return;
        const I = instRef.current;
        holdT.current = performance.now();
        I.holding = true; I.holdStart = holdT.current / 1000;
        setHolding(true); setHint('');
        apply({ ...breathSound(start, breaths, total), glide: 1 }, 0.3, 1.3);
      },
      onHoldEnd: () => {
        const I = instRef.current;
        if (!I.holding) return;
        const dur = performance.now() - holdT.current;
        I.holding = false; I.holdEnd = performance.now() / 1000; setHolding(false);
        if (dur >= g.breathHoldMs) {
          const n = breaths + 1; setBreaths(n);
          apply({ ...breathSound(start, n, total), glide: 0 }, 0.3, 1.8);
          if (n >= total) {
            setHint('done');
            audioRef.current?.pluck(baseFreq(start.register) * 3, { bright: 0.3, gain: 0.12, decay: 3 });
            later(() => room.dispatch({ t: 'regulated', skipped: false }), 3400);
          }
        } else {
          apply({ ...breathSound(start, breaths, total), glide: 0 }, 0.3, 1.8);
          setHint('tooQuick');
        }
      },
    };
  });
  useEffect(() => () => { regHandlersRef.current = {}; }, [regHandlersRef]);

  const skip = () => { instRef.current.holding = false; room.dispatch({ t: 'regulated', skipped: true }); };

  return (
    <>
      <Head title={t(copy.tune.breathe.title)} sub={t(copy.tune.breathe.sub)} />
      <div className="flex-1" />
      <div className="px-6 pb-5 flex flex-col items-center gap-2 text-center">
        <Beads n={breaths} of={total} label={copy.tune.breathe.title} />
        <p aria-live="polite" className="min-h-[44px] text-[15px] leading-snug max-w-[300px]"
          style={{ color: hint === 'done' ? 'var(--t-ink)' : 'var(--t-ink-2)', opacity: holding ? 0.5 : 1 }}>
          {hint === 'tooQuick' ? copy.tune.breathe.tooQuick : hint === 'done' ? copy.tune.breathe.done : ''}
        </p>
        <div className="min-h-11">{showEscape && !done && <Quiet onClick={skip}>{copy.nav.skip}</Quiet>}</div>
      </div>
    </>
  );
}

/** Blank: pluck (or strum across) the strings; each pluck a little brighter and warmer. */
export function WakeStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, audioRef, regHandlersRef, t } = kit;
  const total = Math.max(1, room.content.flow.gates.plucksToWake);
  const [start] = useState(() => kit.base);
  const [plucks, setPlucks] = useState(0);
  const lastPluck = useRef(0);
  const done = plucks >= total;
  const later = useLater();
  const showEscape = useEscape(kit);

  useEffect(() => { apply(wakeSound(start, 0, total), SLOW); }, [apply, start, total]);

  useLayoutEffect(() => {
    regHandlersRef.current = {
      onPluck: (i: number) => {
        const now = performance.now();
        const reg = wakeSound(start, plucks, total).register;
        if (done || now - lastPluck.current < 140) {
          if (!done) audioRef.current?.pluck(baseFreq(reg) * (i ? 1.5 : 1), { bright: 0.2, gain: 0.05, decay: 0.6 });
          return;
        }
        lastPluck.current = now;
        const n = plucks + 1; setPlucks(n);
        const k = Math.min(1, n / total);
        const s = wakeSound(start, n, total);
        audioRef.current?.pluck(baseFreq(s.register) * (i ? 1.5 : 1) * 2, { bright: 0.15 + k * 0.7, gain: 0.08 + k * 0.22, decay: 0.8 + k * 1.2 });
        apply(s, 0.3);
        if (n >= total) later(() => room.dispatch({ t: 'regulated', skipped: false }), 2400);
      },
    };
  });
  useEffect(() => () => { regHandlersRef.current = {}; }, [regHandlersRef]);

  return (
    <>
      <Head title={t(copy.tune.wake.title)} sub={t(copy.tune.wake.sub)} />
      <div className="flex-1" />
      <div className="px-6 pb-5 flex flex-col items-center gap-2 text-center">
        <Beads n={plucks} of={total} label={copy.tune.wake.title} />
        <div className="min-h-11">{showEscape && !done && <Quiet onClick={() => room.dispatch({ t: 'regulated', skipped: true })}>{copy.nav.skip}</Quiet>}</div>
      </div>
    </>
  );
}

// ─── orient (flooded + blank) ────────────────────────────────────────────

export function OrientStep({ kit }: { kit: Kit }) {
  const { copy, room, t } = kit;
  return (
    <>
      <Head title={t(copy.orient.title)} sub={t(copy.orient.sub)} />
      <div className="flex-1 min-h-[120px]" />
      <div className="px-5 pb-6"><SlotCard>{room.slots.orient}</SlotCard></div>
    </>
  );
}

// ─── word: an offer, not a verdict ───────────────────────────────────────

type Pending = { kind: 'kept'; name: string } | { kind: 'none' } | null;

export function WordStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, instRef, audioRef, found, reduced, t } = kit;
  const { content, state } = room;
  const word = wordOnOffer(content, state);
  const [pending, setPending] = useState<Pending>(null);
  const later = useLater();

  // Replay the FOUND sound (the snapshot), a little softer: never the drifted one.
  useEffect(() => {
    if (!found) return;
    const s = soundFrom(found);
    apply({ ...s, loud: s.loud * 0.8 }, SLOW);
  }, [apply, found]);

  // Nothing left to offer at all: say so, then move on.
  const empty = !word && !pending;
  const dispatch = room.dispatch;
  useEffect(() => {
    if (!empty) return;
    later(() => dispatch({ t: 'word', answer: 'no' }), 2600);
  }, [empty, later, dispatch]);

  const answer = (a: 'yes' | 'close' | 'no') => {
    if (pending || !state.found) return;
    const ranked = rankFamilies(content.families, state.found);
    const r = answerOffer(ranked, state.offer, a, content.flow.gates.maxWordsOffered);
    if (!r.done) {
      instRef.current.pluck(1, 0.6, 0.4);
      room.dispatch({ t: 'word', answer: a });
      return;
    }
    if (r.word && word) {
      setPending({ kind: 'kept', name: word.name.toLowerCase() });
      instRef.current.pluck(0, 0.35, 1.2); instRef.current.pluck(1, 0.62, 0.8);
      audioRef.current?.pluck(baseFreq(found?.[2] ?? 0.45) * 2, { bright: 0.45, gain: 0.25, decay: 2.2 });
    } else setPending({ kind: 'none' });
    later(() => room.dispatch({ t: 'word', answer: a }), reduced ? 1400 : 1900);
  };

  const fade = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.45, ease } };

  return (
    <>
      <Head title={t(copy.tune.wordLead)} />
      <div className="flex-1 flex flex-col items-center justify-end pb-4 px-6 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {!pending && word && (
            <m.div key={word.emotionId} {...fade} className="flex flex-col items-center">
              <span className="text-[44px] leading-none font-light italic tracking-[-0.01em] pb-1">{word.name.toLowerCase()}?</span>
            </m.div>
          )}
          {pending?.kind === 'kept' && (
            <m.div key="kept" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: reduced ? 0.2 : 0.9, ease }}
              className="flex flex-col items-center">
              <span className="text-[48px] leading-none font-medium tracking-[0.02em] pb-1" style={{ textShadow: 'var(--t-engrave)' }}>{pending.name}</span>
              <span className="mt-3 h-px w-24" style={{ background: 'var(--t-accent)' }} aria-hidden />
            </m.div>
          )}
          {(pending?.kind === 'none' || empty) && (
            <m.p key="none" {...fade} className="text-[17px] leading-snug max-w-[300px]" style={{ color: 'var(--t-ink-2)' }}>
              {t(copy.word.none)}
            </m.p>
          )}
        </AnimatePresence>
      </div>
      <Bottom>
        <div className="grid grid-cols-3 gap-2.5">
          <Key onClick={() => answer('no')} disabled={!!pending || !word}>{copy.word.no}</Key>
          <Key onClick={() => answer('close')} disabled={!!pending || !word}>{copy.word.close}</Key>
          <Key primary onClick={() => answer('yes')} disabled={!!pending || !word}>{copy.word.yes}</Key>
        </div>
      </Bottom>
    </>
  );
}

// ─── set off (optional) ──────────────────────────────────────────────────

export function SetOffStep({ kit }: { kit: Kit }) {
  const { copy, room, t } = kit;
  const label = (k: SetOff) => copy.setOff[k];
  return (
    <>
      <Head title={t(copy.setOff.title)} />
      <div className="flex-1 min-h-[96px]" />
      <div className="px-5 pb-5 flex flex-col gap-2">
        {SET_OFFS.map(k => (
          <Choice key={k} label={label(k)} onClick={() => room.dispatch({ t: 'setOff', value: k })} />
        ))}
        {copy.setOff.optional !== false && (
          <div className="flex justify-center">
            <Quiet onClick={() => room.dispatch({ t: 'setOff', value: null })}>{copy.setOff.skip}</Quiet>
          </div>
        )}
      </div>
    </>
  );
}

// ─── close: then / now ───────────────────────────────────────────────────

const Play = () => <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden><path d="M1 1l8 5-8 5z" fill="currentColor" /></svg>;

export function CloseStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, instRef, base, found, t } = kit;
  const [cmp, setCmp] = useState<'then' | 'now'>('now');
  const opts = copy.close.options;

  useEffect(() => { apply(base, SLOW); }, [apply, base]);

  const listen = (which: 'then' | 'now') => {
    setCmp(which);
    apply(which === 'then' && found ? soundFrom(found) : base, 0.35);
    instRef.current.pluck(0, 0.4, 0.5);
  };

  return (
    <>
      <Head title={t(copy.close.prompt)} />
      <div className="flex-1 flex items-end justify-center gap-3 px-6 pb-2">
        {(['then', 'now'] as const).map(w => (
          <button key={w} type="button" onClick={() => listen(w)} aria-pressed={cmp === w}
            className="tune-key min-h-12 min-w-[124px] rounded-full border px-5 text-[15px] font-medium flex items-center justify-center gap-2"
            style={{ background: cmp === w ? 'var(--t-card)' : 'var(--t-key)', borderColor: cmp === w ? 'var(--t-ink)' : 'var(--t-key-line)', color: 'var(--t-ink)' }}>
            <Play />{w === 'then' ? copy.close.then : copy.close.now}
          </button>
        ))}
      </div>
      <Bottom>
        <div className="grid grid-cols-2 gap-2.5">
          {(['louder', 'same', 'quieter', 'much'] as const).map(c => (
            <Key key={c} onClick={() => room.dispatch({ t: 'close', value: c })} className="min-h-[52px] leading-snug text-center">{opts[c]}</Key>
          ))}
        </div>
      </Bottom>
    </>
  );
}

// ─── next ────────────────────────────────────────────────────────────────

export function NextStep({ kit }: { kit: Kit }) {
  const { copy, room, t } = kit;
  return (
    <>
      <Head title={t(copy.next.title)} sub={t(copy.next.sub)} />
      <div className="flex-1 min-h-[110px]" />
      <div className="px-5 pb-6"><SlotCard>{room.slots.next}</SlotCard></div>
    </>
  );
}

// ─── collection: the harp ────────────────────────────────────────────────

export function CollectionStep({ kit }: { kit: Kit }) {
  const { copy, room, apply, audioRef, base, reduced, t } = kit;
  const { state, content, collection } = room;

  useEffect(() => { apply({ ...base, hush: 1 }, SLOW); }, [apply, base]);

  const strings: (HarpString & { sound: SoundVec | null })[] = collection.map(w => ({ id: w.emotionId, name: w.name.toLowerCase(), sound: w.sound }));
  const fresh = state.wordAccepted ? state.word : null;
  const freshWord = fresh ? content.families.flatMap(f => f.words).find(w => w.emotionId === fresh) ?? null : null;
  if (freshWord && !strings.some(s => s.id === freshWord.emotionId)) {
    strings.push({ id: freshWord.emotionId, name: freshWord.name.toLowerCase(), sound: freshWord.sound });
  }
  const strum = () => audioRef.current?.strum(strings.map((s, i) => harpFreq(s.sound, i)).reverse());
  const sub = freshWord ? t(copy.collection.new, { word: freshWord.name.toLowerCase() }) : t(copy.collection.noWord);

  return (
    <>
      <Head title={t(copy.tune.harp)} sub={sub} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col justify-center">
        {strings.length
          ? <Harp words={strings} fresh={freshWord?.emotionId ?? null} reduced={reduced} label={copy.tune.harp} onStrum={strum} />
          : <p className="text-center text-[15px]" style={{ color: 'var(--t-ink-2)' }}>{t(copy.collection.empty)}</p>}
      </div>
      <div className="px-5 pb-6"><SlotCard>{room.slots.saveStatus}</SlotCard></div>
    </>
  );
}

// ─── handoff (check-in entry): done ──────────────────────────────────────

export function HandoffStep({ kit }: { kit: Kit }) {
  const { copy, room, reduced, t } = kit;
  const { state, content } = room;
  const w = state.word ? content.families.flatMap(f => f.words).find(x => x.emotionId === state.word) ?? null : null;
  return (
    <>
      <div className="flex-1" />
      <div className="px-6 pb-10 flex flex-col items-center text-center gap-3" role="status">
        {w ? (
          <m.div initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0.2 : 0.8, ease }}
            className="flex flex-col items-center">
            <span className="text-[48px] leading-none font-medium tracking-[0.02em] pb-1" style={{ textShadow: 'var(--t-engrave)' }}>{w.name.toLowerCase()}</span>
            <span className="mt-3 h-px w-24" style={{ background: 'var(--t-accent)' }} aria-hidden />
          </m.div>
        ) : (
          <p className="text-[17px] leading-snug max-w-[300px]" style={{ color: 'var(--t-ink-2)' }}>{t(copy.word.none)}</p>
        )}
      </div>
    </>
  );
}
