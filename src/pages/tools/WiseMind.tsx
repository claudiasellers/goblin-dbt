import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { HandoffResult } from '../../data/capacityTypes';
import type { WiseMindContent } from '../../data/wiseMindTypes';
import { getToolById } from '../../data/tools';
import { useToolSession } from '../../hooks/useToolSession';
import { useProfileContext } from '../../hooks/useProfileContext';
import { handoffExt } from '../../lib/bandStore';
import { newId } from '../../lib/spine/ids';
import {
  WISE_EXIT_STEP, WISE_FEELS, canKeep, defaultPracticeId, feelLine, initialWise, keptLine, mindsHeard, nextToolIdsFor, offersOnceMore,
  mindWords, orderedQuestions, parseWiseEntry, voicesFor, wiseCopy, wiseCopyReady, wiseExt, wiseMindAnswerOf, wiseNext,
  type MindSide, type StepBackSlot, type WiseCopy, type WiseEvent, type WiseState,
} from '../../lib/wiseMind';
import { getWiseMindContent } from '../../services/wiseMind';
import { recordWitnessBeat } from '../../services/witness';
import { TooMuchLink } from '../../components/capacity/TooMuchLink';
import { SessionClose } from '../../components/spine/SessionClose';
import { ChipRow, Chip, Line, OwnWords, Prompt, QuietLink, SubPrompt } from '../../components/tools/wiseMind/bits';
import { TwoMinds } from '../../components/tools/wiseMind/TwoMinds';
import { AskListen, PracticePicker, StoneLake, WiseBreath } from '../../components/tools/wiseMind/Practices';
import { primaryButton } from '../../components/tools/oppositeAction/styles';

const HOST = 'wise-mind';

/** A screen with no question of its own (the close): its first content takes focus as it opens. */
function FocusHere({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <div ref={ref} tabIndex={-1} className="focus:outline-none">{children}</div>;
}

/**
 * Wise mind (docs/design/wise-mind.md): the question, both minds, drop in, what comes, is this wise mind,
 * one next step. The step machine (src/lib/wiseMind.ts) decides; this page renders, keeps the visit's
 * ToolSession up to date (`ext.wm`, the ask-fresh `wiseMindAnswer`), saves *Keep what wise mind said* as
 * an own line on that tap only, and hands off through `linkTo`. TooMuchLink on every screen; no band gate.
 */
export function WiseMind({ stepBack = null }: {
  /** The parts form (screen 2p) when its gate holds; without it the default form runs. */
  stepBack?: StepBackSlot | null;
} = {}) {
  const [content, setContent] = useState<WiseMindContent | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    getWiseMindContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  const copy = useMemo(() => (content ? wiseCopy(content.copy) : null), [content]);
  if (failed || (copy && !wiseCopyReady(copy))) return null;
  if (!content || !copy) {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }
  return <WiseVisit content={content} copy={copy} stepBack={stepBack} />;
}

type OwnFor = 'question' | MindSide | 'answer' | null;

function WiseVisit({ content: shipped, copy, stepBack }: { content: WiseMindContent; copy: WiseCopy; stepBack: StepBackSlot | null }) {
  // MF-02: the Practice home's breath answer (only a kept *No* / *Not sure* changes anything).
  const breath = useProfileContext('wise-mind').slices?.practicePrefs?.breath;
  const content = useMemo(() => ({ ...shipped, breathOk: breath ? breath === 'yes' : undefined }), [shipped, breath]);
  const toolSession = useToolSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [entry] = useState(() => parseWiseEntry(location.search, content));
  const [st, setSt] = useState<WiseState>(() => initialWise(stepBack ? 'parts' : 'minds'));
  const [own, setOwn] = useState<OwnFor>(null);
  const [practiceEnded, setPracticeEnded] = useState(false);
  const [keep, setKeep] = useState<'idle' | 'saving' | 'failed'>('idle');
  const handoffs = useRef<HandoffResult[]>([]);
  const hereRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLAnchorElement>(null);
  const focusDone = () => { setTimeout(() => doneRef.current?.focus({ preventScroll: true }), 0); };

  /** The session always carries what the visit has said so far, so whichever close happens sends it. */
  const sync = useCallback((s: WiseState) => {
    toolSession.setStep(WISE_EXIT_STEP[s.step]);
    toolSession.setExt({ wm: wiseExt(s) });
    toolSession.setWiseMindAnswer(wiseMindAnswerOf(s));
    if (s.dropped) toolSession.markPracticed();
    if (s.step === 'next' || s.step === 'quiet' || s.step === 'close' || s.step === 'handoff') toolSession.markComplete();
  }, [toolSession]);
  useEffect(() => { sync(st); }, [st, sync]);

  const send = (e: WiseEvent) => {
    setOwn(null);
    setSt((x) => wiseNext(x, e, content));
  };

  const s = st;
  const question = content.questions.find((q) => q.id === s.questionId);
  const questionText = question?.label ?? s.questionOwn;
  const max = content.ownMax;
  const ownWords = (label: string, fieldLabel: string, done: (text: string) => void, initial?: string) => (
    <OwnWords label={label} fieldLabel={fieldLabel} backLabel={copy.chrome.back} nextLabel={copy.chrome.next} max={max}
      onDone={done} onBack={() => setOwn(null)} initial={initial} />
  );

  const handOff = (toolId: string) => {
    const next = wiseNext(s, { type: 'handoff', toolId }, content);
    if (next.step !== 'handoff') return;
    // Set before leaving: the page's unmount closes the session (completed), with no close question.
    sync(next);
    setSt(next);
    const to = toolSession.linkTo(toolId);
    navigate(to.pathname, { state: to.state });
  };

  const keepIt = async () => {
    const text = keptLine(s, content, copy.next.kept);
    if (!text || keep === 'saving' || !toolSession.persisted) return;
    setKeep('saving');
    try {
      await recordWitnessBeat({
        hostKind: 'tool_session', hostId: toolSession.id, moment: 'wise_mind', shown: [], skipped: false, noneFit: false,
        ownLine: { id: newId(), text, emotionIds: [] },
      });
      setKeep('idle');
      send({ type: 'keep' });
    } catch {
      setKeep('failed');
    }
  };

  let body: ReactNode = null;
  switch (s.step) {
    case 'question':
      body = own === 'question'
        ? ownWords(copy.question.prompt, copy.question.ownLabel, (text) => send({ type: 'questionOwn', text }))
        : (<>
          <Prompt>{copy.question.prompt}</Prompt>
          <ChipRow options={orderedQuestions(content, entry)} onPick={(id) => send({ type: 'question', id })}
            ownLabel={copy.question.own} onOwn={() => setOwn('question')} />
          <QuietLink label={copy.chrome.skip} onClick={() => send({ type: 'skip', toStepBack: entry.presetPartIds.length > 0 })} />
        </>);
      break;
    case 'minds': {
      const side = s.side;
      if (side && own === side) {
        body = ownWords(side === 'emotion' ? copy.minds.emotionSays : copy.minds.reasonSays, copy.minds.ownLabel,
          (text) => send({ type: 'saysOwn', side, text }), s[side]?.own ?? undefined);
        break;
      }
      const heard = mindsHeard(s);
      body = (<>
        <Prompt>{questionText ?? copy.minds.prompt}</Prompt>
        {questionText && <Line>{copy.minds.prompt}</Line>}
        <TwoMinds labels={{ emotion: copy.minds.emotion, reason: copy.minds.reason }} open={side}
          said={{ emotion: mindWords(s, content, 'emotion'), reason: mindWords(s, content, 'reason') }} onSide={(x) => send({ type: 'side', side: x })} />
        {side && (
          <section key={side} aria-labelledby={`wm-says-${side}`} className="space-y-3">
            <SubPrompt id={`wm-says-${side}`}>{side === 'emotion' ? copy.minds.emotionSays : copy.minds.reasonSays}</SubPrompt>
            <ChipRow options={voicesFor(s, content, side)} picked={s[side]?.id ?? null} onPick={(id) => send({ type: 'says', side, id })}
              ownLabel={copy.minds.own} onOwn={() => setOwn(side)} ownPressed={!!s[side]?.own}>
              <Chip label={copy.minds.nothingComes} pressed={s[side]?.nothing} onClick={() => send({ type: 'nothing', side })} />
            </ChipRow>
          </section>
        )}
        {heard && !side && (<>
          <Line serif status focus>{copy.minds.witness}</Line>
          <button type="button" className={primaryButton} onClick={() => send({ type: 'continue' })}>{copy.chrome.next}</button>
        </>)}
        {!heard && <QuietLink label={copy.chrome.skip} onClick={() => send({ type: 'skip' })} />}
      </>);
      break;
    }
    case 'stepBack': {
      // Screen 2p: the room comes with the slot (the parts form only starts with one).
      const Room = stepBack?.Room;
      body = Room
        ? <Room question={questionText} presetPartIds={entry.presetPartIds} sessionId={toolSession.persisted ? toolSession.id : ''}
            onDone={(r) => send({ type: 'steppedBack', ...r })} onUseMinds={() => send({ type: 'useMinds' })} />
        : <QuietLink label={copy.chrome.next} onClick={() => send({ type: 'continue' })} />;
      break;
    }
    case 'dropIn': {
      const picked = s.practiceId ?? defaultPracticeId(s, content);
      body = (<>
        <Prompt>{copy.dropIn.prompt}</Prompt>
        <PracticePicker practices={[...content.practices].sort((a, b) => a.order - b.order)} picked={picked}
          onPick={(id) => send({ type: 'practice', id })} />
        <button type="button" className={primaryButton} onClick={() => { setPracticeEnded(false); send({ type: 'start' }); }}>{copy.dropIn.start}</button>
      </>);
      break;
    }
    case 'practice': {
      const p = content.practices.find((x) => x.id === s.practiceId);
      const ended = () => { setPracticeEnded(true); hereRef.current?.focus({ preventScroll: true }); };
      body = (<>
        <h2 className="sr-only">{p?.name}</h2>
        {p?.kind === 'drift' && <StoneLake practice={p} onEnd={ended} />}
        {p?.kind === 'hold' && <WiseBreath practice={p} holdLabel={copy.dropIn.hold} holdHint={copy.dropIn.holdHint} letGo={copy.dropIn.letGo} onEnd={ended} />}
        {p?.kind === 'ask' && <AskListen practice={p} question={questionText} onEnd={ended} />}
        <button ref={hereRef} type="button" className={practiceEnded ? primaryButton : `${primaryButton} !bg-transparent !text-[var(--color-text-primary)] border border-[var(--color-border)]`}
          onClick={() => send({ type: 'here' })}>{copy.dropIn.here}</button>
      </>);
      break;
    }
    case 'comes':
      body = own === 'answer'
        ? ownWords(copy.comes.prompt, copy.comes.ownLabel, (text) => send({ type: 'answerOwn', text }))
        : (<>
          <Prompt>{copy.comes.prompt}</Prompt>
          <ChipRow options={[...content.answers].sort((a, b) => a.order - b.order)} onPick={(id) => send({ type: 'answer', id })}
            ownLabel={copy.comes.own} onOwn={() => setOwn('answer')} />
          <QuietLink label={copy.chrome.skip} onClick={() => send({ type: 'skip' })} />
        </>);
      break;
    case 'quiet':
      body = (<>
        <Prompt serif>{copy.comes.quiet}</Prompt>
        <button type="button" className={primaryButton} onClick={() => send({ type: 'continue' })}>{copy.chrome.next}</button>
      </>);
      break;
    case 'feel':
      body = (<>
        {s.answerOwn ? <p className="font-serif text-xl text-[var(--color-text-primary)]">{s.answerOwn}</p>
          : <p className="font-serif text-xl text-[var(--color-text-primary)]">{content.answers.find((a) => a.id === s.answerId)?.label}</p>}
        <Prompt>{copy.feel.prompt}</Prompt>
        <ChipRow options={WISE_FEELS.map((f) => ({ id: f, label: copy.feel.options[f] }))} picked={s.feel}
          onPick={(id) => send({ type: 'feel', feel: id as (typeof WISE_FEELS)[number] })} />
        {s.feel && <Line serif status>{feelLine(s, copy, stepBack?.pushedLine ?? null)}</Line>}
        {s.feel === 'pushed' && (
          <div className="flex flex-wrap gap-2.5">
            {offersOnceMore(s) && <Chip label={copy.feel.onceMore} onClick={() => send({ type: 'onceMore' })} />}
            <Chip label={copy.feel.keepAnyway} onClick={() => send({ type: 'keepAnyway' })} />
          </div>
        )}
        {s.feel && s.feel !== 'pushed' && <button type="button" className={primaryButton} onClick={() => send({ type: 'continue' })}>{copy.chrome.next}</button>}
        {!s.feel && <QuietLink label={copy.chrome.skip} onClick={() => send({ type: 'skip' })} />}
      </>);
      break;
    case 'next': {
      const tools = nextToolIdsFor(s, content).map((id) => getToolById(id)).filter((t) => t !== undefined);
      body = (<>
        <Prompt>{copy.next.prompt}</Prompt>
        <div className="flex flex-wrap gap-2.5">
          {tools.map((t) => (
            <Chip key={t.id} label={<><span aria-hidden="true">{t.emoji}</span> {t.name}</>} onClick={() => handOff(t.id)} />
          ))}
          <Chip label={copy.next.enough} onClick={() => send({ type: 'enough' })} />
        </div>
        {toolSession.persisted && (s.kept
          ? <Line status focus>{copy.next.keptDone}</Line>
          : canKeep(s, content) && (
            <button type="button" disabled={keep === 'saving'} onClick={() => { void keepIt(); }}
              className="min-h-12 w-full p-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] lift-secondary disabled:opacity-50">
              {copy.next.keep}
            </button>
          ))}
      </>);
      break;
    }
    case 'close':
    case 'handoff':
      // The close takes focus as it opens (the control that led here has gone); once answered or
      // skipped, Done does.
      body = (<>
        <FocusHere>{s.step === 'close' && <SessionClose kind="orienting" onAnswered={focusDone} onSkipped={focusDone} />}</FocusHere>
        <Link ref={doneRef} to="/tools" className={`${primaryButton} inline-flex items-center justify-center`}>{copy.next.done}</Link>
      </>);
      break;
  }

  return (
    <div className="space-y-5">
      <div key={`${s.step}:${own ?? ''}`} className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]">{body}</div>
      <div className="flex justify-center">
        <TooMuchLink host={HOST} onResult={(r) => { handoffs.current.push(r); toolSession.setExt({ er: { handoffs: handoffExt(handoffs.current) } }); }} />
      </div>
    </div>
  );
}
