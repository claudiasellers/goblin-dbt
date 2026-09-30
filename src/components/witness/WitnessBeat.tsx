import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Band } from '../../data/capacityTypes';
import type { GetWitnessLinesResponse, Landed, WitnessLine, WitnessMoment } from '../../data/witnessTypes';
import { getWitnessLines } from '../../services/witness';
import { newId } from '../../lib/spine/ids';
import {
  afterNo, beatQuestion, beatResult, echoText, fillWitnessLine, tentativeLanded,
  type BeatAnswers, type VoicePref, type WitnessResult,
} from '../../lib/witness';

export interface WitnessBeatProps {
  hostToolId: string;
  moment: WitnessMoment;
  band: Band;
  /** The user's word(s) for the echo (display names). */
  words: string[];
  emotionIds?: string[];
  situationId?: string;
  urgeId?: string;
  phrase?: string;
  need?: string;
  /** header = flooded: one short line merged into the result's header, no question. */
  variant?: 'standalone' | 'header';
  /** Default "you" (D-04); Recover keeps its name default until WMP-02. */
  voice?: VoicePref;
  /** A line is on screen (nothing answered yet): the host logs it right away. */
  onShown?: (result: WitnessResult, lines: WitnessLine[]) => void;
  /** Every answer (landed, keep, skip, none fit, say it my way): the host logs the beat again. */
  onDone(result: WitnessResult, lines: WitnessLine[]): void;
}

const PACE_MS = 600;
const OWN_MAX = 140;
/** Shown after a second "no" (a third ask would be rumination, WMP-01 C.5). */
const POSTPONE = "That's okay. It doesn't need the right words right now.";

const linkBtn = 'min-h-11 px-1 text-sm text-[var(--color-text-tertiary)] underline underline-offset-2 hover:text-[var(--color-text-secondary)] disabled:opacity-50';
const chip = 'min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] disabled:opacity-50';

/**
 * The receive beat (WMP-01 C; plan A5-3): the user's word(s) alone for a moment, then one witness
 * line in a different weight. Optional "Did that land?" (never at flooded); No → a line at another
 * level, at most two, then a postponement line. Always there: skip · none of these fit · say it
 * my way; keep this line while a line shows. It never blocks the host: the result's tools stay
 * interactive below it. No confetti, no colour change, no emoji. Reduced motion: no fade, no wait.
 * With no line to serve (corpus not live, offline), it is the echo alone.
 */
export function WitnessBeat(props: WitnessBeatProps) {
  const { hostToolId, moment, band, words, emotionIds, situationId, urgeId, phrase, need, variant = 'standalone', voice = 'you', onShown, onDone } = props;
  const reduce = useReducedMotion() ?? false;
  const [waited, setWaited] = useState(false);
  const [data, setData] = useState<GetWitnessLinesResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [postponed, setPostponed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<BeatAnswers>({ landed: {}, skipped: false, noneFit: false });
  const shownOnce = useRef(false);

  const header = variant === 'header' || band === 'flooded';
  const emotionKey = (emotionIds ?? []).join(',');

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), PACE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let live = true;
    getWitnessLines({
      hostToolId, moment, band, emotionIds: emotionKey ? emotionKey.split(',') : [],
      ...(situationId ? { situationId } : {}), ...(urgeId ? { urgeId } : {}), max: header ? 1 : 2,
    }).then((r) => { if (live) setData(r); }).catch(() => { /* echo only */ });
    return () => { live = false; };
  }, [hostToolId, moment, band, emotionKey, situationId, urgeId, header]);

  const lines = useMemo(() => data?.lines ?? [], [data]);
  const paced = reduce || waited;
  const line: WitnessLine | null = paced && !postponed && !answers.skipped && !answers.noneFit ? lines[index] ?? null : null;

  // Log the first line as soon as it is on screen (the host queues it until the check-in is saved).
  useEffect(() => {
    if (!line || shownOnce.current) return;
    shownOnce.current = true;
    onShown?.(beatResult(lines, 0, { landed: {}, skipped: false, noneFit: false }), lines);
  }, [line, lines, onShown]);

  const emit = (next: BeatAnswers, ix: number = index) => {
    setAnswers(next);
    onDone(beatResult(lines, ix, next), lines);
  };

  const answer = (landed: Landed) => {
    if (!line) return;
    const next = { ...answers, landed: { ...answers.landed, [line.id]: landed } };
    if (landed === 'no') {
      const step = afterNo(lines, index);
      if ('next' in step) {
        setIndex(step.next);
        emit(next, step.next);
        return;
      }
      setPostponed(true);
    } else {
      setAnswered(true);
    }
    emit(next);
  };

  const saveOwn = () => {
    const text = draft.trim().slice(0, OWN_MAX);
    if (!text) return;
    setWriting(false);
    emit({ ...answers, ownLine: { id: newId(), text } });
  };

  const echo = echoText(words);
  const fade = reduce ? '' : 'animate-fade-in';
  const question = beatQuestion({ band, askLanded: data?.askLanded ?? false, line, answered });
  const slots = { name: data?.firstName ?? null, word: words[0]?.toLowerCase() ?? null, phrase: phrase ?? null, need: need ?? null };
  const kept = !!line && answers.keepLineId === line.id;
  const own = answers.ownLine?.text;
  const controls = !answers.skipped && !own && (line || postponed || answers.noneFit);

  if (!echo && !line && !own && !postponed) return null;

  return (
    <section aria-label="What you told us" aria-live="polite" data-witness-beat={header ? 'header' : 'standalone'}
      className={header ? 'mb-6 text-center' : 'mb-8 text-center'}>
      {echo && <p className="text-base text-[var(--color-text-secondary)]">{echo}</p>}

      {own ? (
        <p className={`mt-2 text-lg text-[var(--color-text-primary)] ${fade}`}>{own}</p>
      ) : line ? (
        <p className={`mt-2 ${header ? 'text-base' : 'text-lg'} font-light italic text-[var(--color-text-primary)] leading-relaxed ${fade}`}>
          {fillWitnessLine(line, slots, voice)}
        </p>
      ) : postponed ? (
        <p className={`mt-2 text-base text-[var(--color-text-secondary)] ${fade}`}>{POSTPONE}</p>
      ) : null}

      {question === 'landed' && (
        <div className="mt-3" role="group" aria-label="Did that land?">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Did that land?</p>
          <div className="flex justify-center gap-2">
            <button type="button" className={chip} onClick={() => answer('yes')}>Yes</button>
            <button type="button" className={chip} onClick={() => answer('sort_of')}>Sort of</button>
            <button type="button" className={chip} onClick={() => answer('no')}>No</button>
          </div>
        </div>
      )}
      {question === 'tentative' && (
        <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Is that it?">
          <button type="button" className={chip} onClick={() => answer(tentativeLanded('close'))}>Close</button>
          <button type="button" className={chip} onClick={() => answer(tentativeLanded('not_that'))}>Not that</button>
        </div>
      )}

      {writing && (
        <div className="mt-3 text-left max-w-sm mx-auto">
          <label className="block text-xs text-[var(--color-text-tertiary)] mb-1" htmlFor="witness-own">In your own words</label>
          <textarea id="witness-own" value={draft} maxLength={OWN_MAX} rows={2} onChange={(e) => setDraft(e.target.value)}
            className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text-primary)]" />
          <div className="flex justify-end gap-2 mt-1">
            <button type="button" className={linkBtn} onClick={() => setWriting(false)}>Cancel</button>
            <button type="button" className={chip} disabled={!draft.trim()} onClick={saveOwn}>Save</button>
          </div>
        </div>
      )}

      {!writing && controls && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-3">
          {line && line.source === 'graph' && (
            <button type="button" data-witness="keep" className={linkBtn} disabled={kept}
              onClick={() => emit({ ...answers, keepLineId: line.id })}>
              {kept ? 'Kept' : 'Keep this line'}
            </button>
          )}
          {!answers.noneFit && (
            <button type="button" data-witness="none-fit" className={linkBtn} onClick={() => emit({ ...answers, noneFit: true })}>None of these fit</button>
          )}
          <button type="button" data-witness="say-it-my-way" className={linkBtn} onClick={() => setWriting(true)}>Say it my way</button>
          <button type="button" data-witness="skip" className={linkBtn} onClick={() => emit({ ...answers, skipped: true })}>Skip</button>
        </div>
      )}
    </section>
  );
}
