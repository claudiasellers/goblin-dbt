import { useState, type ReactNode } from 'react';
import type { CopeAheadContent, CopePull } from '../../../data/copeAheadTypes';
import { getEmotionById } from '../../../data/emotions';
import {
  activeMoves, canGoOn, canPlanForPull, feelChoices, momentChoices, movesFor, newMomentChoices, offersAdd, orderedSituations,
  OWN_SITUATION, type CopeEvent, type CopeState,
} from '../../../lib/copeAheadTool';
import type { PullChoice } from '../../../lib/urgeSurfing';
import { EmotionPicker } from '../EmotionPicker';
import { Chip, ChipRow, Line, Prompt } from '../wiseMind/bits';
import { primaryButton } from '../oppositeAction/styles';

/**
 * Cope Ahead's screens 1-4 and the *once more* screens (docs/design/cope-ahead.md, "The flow").
 * Presentation only: every line is cope-ahead.json's copy, a chip label from it, a grid word's name, Find
 * the feeling's pull chips, or the person's own words. The page owns the state (src/lib/copeAheadTool.ts)
 * and everything that is saved.
 */
type Send = (e: CopeEvent) => void;
interface ScreenProps { content: CopeAheadContent; s: CopeState; send: Send }

/** A sub-question inside a screen. */
function Sub({ id, children }: { id: string; children: ReactNode }) {
  return <h3 id={id} className="font-medium text-[var(--color-text-primary)]">{children}</h3>;
}

/** Next: shown once the screen can go on. */
function NextButton({ content, s, send }: ScreenProps) {
  if (!canGoOn(s)) return null;
  return <button type="button" className={primaryButton} onClick={() => send({ type: 'next' })}>{content.copy.rehearse_next}</button>;
}

/**
 * Own words in a slot: a plain field under the chips (never linted, parsed, or shown back outside this visit,
 * My words and its Today card). Every change is reported (empty clears the slot); the machine caps it.
 */
function OwnField({ label, max, initial, onSave, testId }: {
  label: string; max: number; initial: string | null; onSave: (text: string) => void; testId: string;
}) {
  const [text, setText] = useState((initial ?? '').slice(0, max));
  return (
    <div className="space-y-2">
      <textarea value={text} maxLength={max} rows={2} aria-label={label} data-testid={testId}
        onChange={(e) => { const t = e.target.value.slice(0, max); setText(t); onSave(t); }}
        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-serif text-lg focus:ring-2 focus:ring-[var(--color-accent)]" />
    </div>
  );
}

/** Screen 1: what's coming, and when. */
export function WhatScreen({ content, s, send, firstSituationId }: ScreenProps & { firstSituationId: string | null }) {
  const c = content.copy;
  const [own, setOwn] = useState(s.situationId === OWN_SITUATION && !!s.situationOwn);
  return (<>
    <Prompt>{c.what_title}</Prompt>
    <ChipRow options={orderedSituations(content, firstSituationId).map((x) => ({ id: x.id, label: x.label }))} picked={s.situationId}
      onPick={(id) => { send({ type: 'situation', id }); setOwn(id === OWN_SITUATION); }} />
    {own && <OwnField label={c.what_own_hint} max={content.ownMax} initial={s.situationOwn} testId="ca-situation-own"
      onSave={(text) => send({ type: 'situationOwn', text })} />}
    <section aria-labelledby="ca-when" className="space-y-3">
      <Sub id="ca-when">{c.when_title}</Sub>
      <ChipRow options={content.when.map((w) => ({ id: w.id, label: c[w.key] ?? w.id }))} picked={s.when}
        onPick={(id) => send({ type: 'when', when: id as CopeState['when'] & string })} />
    </section>
    <NextButton content={content} s={s} send={send} />
  </>);
}

/** Screen 2: what you might feel, what you might want to do, and (parts on) who might show up. */
export function FeelScreen({ content, s, send, pulls, partsStep }: ScreenProps & {
  /** Find the feeling's pull chips (empty while its content loads, or if it can't: the question is left out). */
  pulls: PullChoice[];
  /** DEAR MAN's CopeAheadStep, when its gate holds; null otherwise. */
  partsStep: ReactNode;
}) {
  const c = content.copy;
  const [more, setMore] = useState(false);
  const [feelUnsure, setFeelUnsure] = useState(false);
  if (more) {
    return (
      <EmotionPicker prompt={c.feel_title} selectedIds={s.feelIds}
        onChange={(ids) => { setFeelUnsure(false); send({ type: 'feelIds', ids }); }} onContinue={() => setMore(false)} />
    );
  }
  const words = feelChoices(s, content).map((id) => ({ id, label: getEmotionById(id)?.name ?? id }));
  return (<>
    <Prompt>{c.feel_title}</Prompt>
    <Line>{c.feel_hint}</Line>
    <div className="flex flex-wrap gap-2.5" data-testid="ca-feel">
      {words.map((w) => (
        <Chip key={w.id} label={w.label} pressed={s.feelIds.includes(w.id)}
          onClick={() => { setFeelUnsure(false); send({ type: 'feel', id: w.id }); }} />
      ))}
      <Chip label={c.feel_more} onClick={() => setMore(true)} />
      <Chip label={c.not_sure} pressed={feelUnsure && !s.feelIds.length}
        onClick={() => { setFeelUnsure(true); send({ type: 'feelIds', ids: [] }); }} />
    </div>
    {pulls.length > 0 && (
      <section aria-labelledby="ca-pull" className="space-y-3">
        <Sub id="ca-pull">{c.pull_title}</Sub>
        <div className="flex flex-wrap gap-2.5" data-testid="ca-pull-chips">
          {pulls.map((p) => (
            <Chip key={p.id} label={p.label} pressed={s.pull === p.id} onClick={() => send({ type: 'pull', pull: p.id as CopePull })} />
          ))}
          <Chip label={c.not_sure} pressed={s.pull === 'not_sure'} onClick={() => send({ type: 'pull', pull: 'not_sure' })} />
        </div>
      </section>
    )}
    {partsStep}
    <NextButton content={content} s={s} send={send} />
  </>);
}

/** Screen 3: the hardest moment (one, never a list). `danger`: CrisisBanner compact, alongside. */
export function MomentScreen({ content, s, send, danger }: ScreenProps & { danger: ReactNode }) {
  const c = content.copy;
  const [own, setOwn] = useState(!!s.hardMomentOwn);
  return (<>
    <Prompt>{c.moment_title}</Prompt>
    <div className="flex flex-wrap gap-2.5" data-testid="ca-moments">
      {momentChoices(s, content).map((m) => (
        <Chip key={m.id} label={m.label} pressed={s.hardMomentId === m.id} onClick={() => { setOwn(false); send({ type: 'moment', id: m.id }); }} />
      ))}
      <Chip label={c.moment_own_hint} pressed={own} onClick={() => setOwn(true)} />
    </div>
    {own && <OwnField label={c.moment_own_hint} max={content.ownMax} initial={s.hardMomentOwn} testId="ca-moment-own"
      onSave={(text) => send({ type: 'momentOwn', text })} />}
    {danger}
    <NextButton content={content} s={s} send={send} />
  </>);
}

/** The move chips for screen 4 or *Change what I'll do*: one plan, up to two moves, own words in a slot. */
function MoveChips({ content, s, send, momentId }: ScreenProps & { momentId: string | null }) {
  const c = content.copy;
  const m = activeMoves(s);
  const [own, setOwn] = useState(!!m.own);
  return (<>
    <div className="flex flex-wrap gap-2.5" data-testid="ca-moves">
      {movesFor(s, content, momentId).map((x) => (
        <Chip key={x.id} label={x.label} pressed={m.ids.includes(x.id)} onClick={() => send({ type: 'move', id: x.id })} />
      ))}
      <Chip label={c.plan_own_hint} pressed={own} onClick={() => { if (own) send({ type: 'moveOwn', text: null }); setOwn(!own); }} />
      {offersAdd(s, m) && <Chip label={c.plan_add} onClick={() => send({ type: 'add' })} />}
    </div>
    {own && <OwnField label={c.plan_own_hint} max={content.moveOwnMax} initial={m.own} testId="ca-move-own"
      onSave={(text) => send({ type: 'moveOwn', text })} />}
  </>);
}

/**
 * Screen 4: "If it happens, I'll…". The line reads back in the serif as it is built (`plan`, from
 * copeAheadPlan's planLine); the part's anchor sits under it (`anchor`); `danger`: CrisisBanner compact.
 */
export function PlanScreen({ content, s, send, plan, anchor, danger }: ScreenProps & { plan: string | null; anchor: ReactNode; danger: ReactNode }) {
  const c = content.copy;
  return (<>
    <Prompt>{c.plan_title}</Prompt>
    {plan && <p className="font-serif text-xl leading-snug text-[var(--color-text-primary)] break-words" data-testid="ca-plan-line" aria-live="polite">{plan}</p>}
    {canPlanForPull(s) && (
      <div className="flex flex-wrap gap-2.5">
        {s.ifFrom === 'moment'
          ? <Chip label={c.plan_use_pull} onClick={() => send({ type: 'ifFrom', from: 'pull' })} />
          : <Chip label={c.plan_use_moment} onClick={() => send({ type: 'ifFrom', from: 'moment' })} />}
      </div>
    )}
    <MoveChips content={content} s={s} send={send} momentId={s.hardMomentId} />
    {anchor}
    {danger}
    <NextButton content={content} s={s} send={send} />
  </>);
}

/** After the first pass: "Once more, with something you didn't expect?" (offered once). */
export function AgainScreen({ content, send }: Omit<ScreenProps, 's'>) {
  const c = content.copy;
  return (<>
    <Prompt>{c.rehearse_again_q}</Prompt>
    <div className="flex flex-wrap gap-2.5">
      <Chip label={c.rehearse_again_yes} onClick={() => send({ type: 'again', yes: true })} />
      <Chip label={c.rehearse_again_no} onClick={() => send({ type: 'again', yes: false })} />
    </div>
  </>);
}

/** *Once more*: something you didn't plan for (two other moments, or your own), and keep or change the move. */
export function NewMomentScreen({ content, s, send }: ScreenProps) {
  const c = content.copy;
  const [own, setOwn] = useState(!!s.newMomentOwn);
  return (<>
    <Prompt serif>{c.rehearse_new_problem}</Prompt>
    <div className="flex flex-wrap gap-2.5" data-testid="ca-new-moments">
      {newMomentChoices(s, content).map((m) => (
        <Chip key={m.id} label={m.label} pressed={s.newMomentId === m.id} onClick={() => { setOwn(false); send({ type: 'newMoment', id: m.id }); }} />
      ))}
      <Chip label={c.feel_more} pressed={own} onClick={() => setOwn(true)} />
    </div>
    {own && <OwnField label={c.moment_own_hint} max={content.ownMax} initial={s.newMomentOwn} testId="ca-new-moment-own"
      onSave={(text) => send({ type: 'newMomentOwn', text })} />}
    {(s.newMomentId || s.newMomentOwn) && (
      <div className="flex flex-wrap gap-2.5">
        <Chip label={c.rehearse_keep_move} pressed={s.changeMove === false} onClick={() => send({ type: 'changeMove', change: false })} />
        <Chip label={c.rehearse_change_move} pressed={s.changeMove === true} onClick={() => send({ type: 'changeMove', change: true })} />
      </div>
    )}
    {s.changeMove && <MoveChips content={content} s={s} send={send} momentId={s.newMomentId} />}
    <NextButton content={content} s={s} send={send} />
  </>);
}
