import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PartsContent } from '../../data/partsContentTypes';
import { RATHER_IDS_MAX, type PartRevisitAnswer, type PartWriteResponse } from '../../data/partsTypes';
import type { MeItem, MePartCandidate } from '../../services/profile';
import { answerPartRevisit, renamePart, restorePart, restPart, setAsidePart, setPartTender } from '../../services/parts';
import {
  PART_NAME_MAX, meetAPartLink, partCandidateCopy, partRevisitCopy,
  type PartCandidatePromptId, type PartRevisitCopy, type PartsOfMePromptId,
} from '../../lib/partsOfMe';
import {
  candidateLine, candidateMeetLink, partActions, partAsksBack, partCardRows, renameCall, restoreCall,
  revisitCall, revisitChoices, revisitQuestion, revisitRatherOptions, sortPartItems, toggleRather, type PartWriteCall,
} from '../../lib/partCard';
import { newId } from '../../lib/spine/ids';
import { CrisisBanner } from '../safety/CrisisBanner';
import { PartFigure } from '../parts/PartFigure';
import { getToolById } from '../../data/tools';
import { monthName, partStatLines, statsReady, type PartStatLines } from '../../lib/partStats';

type Copy = Record<PartsOfMePromptId, string>;
/** Sends one part write and refreshes Me from getMe (MeSection's `after`); rejects when the write fails. */
export type PartWrite = (p: Promise<PartWriteResponse>) => Promise<void>;

/**
 * Me → Parts of me (docs/design/parts.md, "The part card"): the parts a person has kept, each with
 * its readout once computed and signed off (when it shows up, what's helped it settle, how they've felt
 * toward it; Reflect's lines and gate, src/lib/partStats.ts). Rendered by MeSection only with parts on
 * and all its copy signed off. Each card has one row of quiet actions (lane 2's part writers) and,
 * past its revisit date, the 30-day check-back above them (only once that copy is signed off too).
 * Set-aside parts sit below as rows with "Bring it back", then "To come back to": the open candidates
 * (at most 3, its own copy gate), each with Get to know it (Meet a part, candidate trailhead) and Not
 * any more.
 *
 * Writes are not optimistic, as elsewhere in Me: the card is disabled while saving, Me reloads after,
 * and a failed write leaves things as they were with no message (StillTrue's rule).
 */
export function PartsOfMe({ items, candidates, content, copy, onWrite, onDismiss }: {
  items: MeItem[];
  candidates: MePartCandidate[];
  content: PartsContent;
  copy: Copy;
  onWrite: PartWrite;
  /** "Not any more" on a candidate, then Me reloads; rejects when the write fails. */
  onDismiss: (candidateId: string) => Promise<void>;
}) {
  const parts = sortPartItems(items.filter((i) => i.part));
  const live = parts.filter((i) => i.meta.status !== 'set_aside');
  const setAside = parts.filter((i) => i.meta.status === 'set_aside');
  const revisit = partRevisitCopy(content);
  const candidateCopy = partCandidateCopy(content);
  const showStats = statsReady(content);
  const getToKnow = meetAPartLink();

  return (
    <div className="mt-1 space-y-3">
      <Link to={getToKnow.pathname} state={getToKnow.state}
        className="inline-flex items-center min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
        {copy.me_get_to_know}
      </Link>
      {live.length > 0 && (
        <ul className="space-y-3">
          {live.map((i) => <PartCard key={i.meta.id} item={i} content={content} copy={copy} revisit={revisit} showStats={showStats} onWrite={onWrite} />)}
        </ul>
      )}
      {setAside.length > 0 && (
        <ul>{setAside.map((i) => <SetAsideRow key={i.meta.id} item={i} copy={copy} onWrite={onWrite} />)}</ul>
      )}
      {candidateCopy && candidates.length > 0 && (
        <div>
          <h4 className="text-xs text-[var(--color-text-secondary)]">{candidateCopy.candidate_title}</h4>
          <ul>
            {candidates.map((c) => (
              <CandidateRow key={c.id} candidate={c} content={content} copy={candidateCopy} onDismiss={onDismiss} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A part to come back to: a neutral figure, the line, Get to know it, Not any more. */
function CandidateRow({ candidate, content, copy, onDismiss }: {
  candidate: MePartCandidate; content: PartsContent; copy: Record<PartCandidatePromptId, string>;
  onDismiss: (candidateId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const go = candidateMeetLink(content, candidate);
  const dismiss = async () => {
    if (busy) return;
    setBusy(true);
    try { await onDismiss(candidate.id); } catch { /* unchanged; Me reloads on the next visit */ } finally { setBusy(false); }
  };
  return (
    <li className="py-2 border-t border-[var(--color-border-subtle)] first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <PartFigure shapeSig={null} size={40} />
        </div>
        <p className="min-w-0 flex-1 text-sm text-[var(--color-text-primary)]">{candidateLine(copy, content, candidate)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 pl-[52px]">
        <Link to={go.pathname} state={go.state} className={plain}>{copy.candidate_go}</Link>
        <button type="button" disabled={busy} onClick={dismiss} className={quiet}>{copy.candidate_dismiss}</button>
      </div>
    </li>
  );
}

/** The writer a call names (lane 2's, src/services/parts.ts). */
function send(c: PartWriteCall): Promise<PartWriteResponse> {
  switch (c.fn) {
    case 'renamePart': return renamePart(c.req);
    case 'restPart': return restPart(c.req);
    case 'setAsidePart': return setAsidePart(c.req);
    case 'restorePart': return restorePart(c.req);
    case 'setPartTender': return setPartTender(c.req);
    case 'answerPartRevisit': return answerPartRevisit(c.req);
  }
}

/** One write at a time per card: disabled while it runs, unchanged if it fails. */
function useWrite(onWrite: PartWrite) {
  const [busy, setBusy] = useState(false);
  const run = async (c: PartWriteCall, done?: () => void) => {
    if (busy) return;
    setBusy(true);
    try { await onWrite(send(c)); done?.(); } catch { /* unchanged; Me reloads on the next visit */ } finally { setBusy(false); }
  };
  return { busy, run };
}

/** Tool names from src/data/tools.ts; the month in the locale's words. */
const statDeps = { toolName: (id: string) => getToolById(id)?.name ?? null, monthName: (m: string) => monthName(m) };

const link = 'inline-flex items-center justify-center min-h-11 min-w-11 text-sm underline underline-offset-2 disabled:opacity-50';
const quiet = `${link} text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`;
const plain = `${link} text-[var(--color-text-secondary)]`;
const chip = 'min-h-11 px-3 rounded-lg border text-sm text-left disabled:opacity-50';
const choice = `${chip} border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)]`;
const chosen = `${chip} border-[var(--color-border-accent)] text-[var(--color-text-primary)]`;
const box = 'mt-2 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]';

function PartCard({ item, content, copy, revisit, showStats, onWrite }: {
  item: MeItem; content: PartsContent; copy: Copy; revisit: PartRevisitCopy | null; showStats: boolean; onWrite: PartWrite;
}) {
  const part = item.part!;
  const partId = item.meta.id;
  const resting = item.meta.status === 'resting';
  const rows = partCardRows(part, content);
  // The readout (tender parts too: it's about the relationship), only when computed and its copy ships.
  const stats: PartStatLines | null = showStats && part.stats ? partStatLines(part.stats, content, statDeps) : null;
  const visit = meetAPartLink(partId);
  const { busy, run } = useWrite(onWrite);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [answered, setAnswered] = useState(false);

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    run(renameCall(partId, draft), () => setRenaming(false));
  };
  const answer = (a: PartRevisitAnswer, ratherIds?: string[]) => {
    const c = revisitCall(newId(), partId, a, ratherIds);
    if (c) run(c, () => setAnswered(true));
  };
  // Every row stacked: the label a small quiet line (secondary: tertiary on the card is under 4.5:1 in
  // dusk), the value under it in the body style.
  const row = (label: string, value: ReactNode) => (
    <div>
      <dt className="text-xs text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="text-sm text-[var(--color-text-primary)] break-words">{value}</dd>
    </div>
  );
  return (
    <li className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <PartFigure shapeSig={part.shapeSig} size={64} />
        </div>
        <div className="min-w-0 flex-1">
          {renaming ? (
            // The person's words, in the serif, never linted; an empty save clears the name.
            <form onSubmit={saveName}>
              <input type="text" value={draft} maxLength={PART_NAME_MAX} autoFocus disabled={busy}
                aria-label={copy.card_rename}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(false); }}
                className="w-full min-h-11 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] font-serif text-xl text-[var(--color-text-primary)]" />
              <div className="flex flex-wrap gap-x-4">
                <button type="submit" disabled={busy} className={plain}>{copy.card_rename_save}</button>
                <button type="button" disabled={busy} onClick={() => setRenaming(false)} className={quiet}>{copy.card_cancel}</button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2">
              {/* The person's own name for it, in the serif; unnamed, the kind's label ("A part"). */}
              <h4 className={part.name
                ? 'font-serif text-xl leading-tight text-[var(--color-text-primary)] break-words'
                : 'text-sm font-medium text-[var(--color-text-primary)]'}>
                {part.name ?? item.title}
              </h4>
              {resting && <span className="text-xs text-[var(--color-text-secondary)]">{copy.card_resting}</span>}
            </div>
          )}
          {stats?.when && <p className="text-sm text-[var(--color-text-secondary)]">{stats.when}</p>}
          <dl className="mt-2 space-y-2">
            {rows.where.length > 0 && row(copy.card_where, rows.where.join(', '))}
            {rows.job && ('own' in rows.job
              // The person's own words: the serif, at body size (text-base sets it level with the sans).
              ? row(copy.card_job_own, <span className="font-serif text-base leading-snug">{rows.job.own}</span>)
              : row(copy.card_job, rows.job.labels.join(', ')))}
            {rows.fears.length > 0 && row(copy.card_fear, rows.fears.join(', '))}
            {rows.rather.length > 0 && row(copy.card_rather, rows.rather.join(', '))}
            {stats?.helped && row(stats.helped.title, (
              <ul>{stats.helped.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            ))}
            {stats?.felt && row(stats.felt.title, stats.felt.line)}
          </dl>
        </div>
      </div>
      {revisit && partAsksBack(item) && !answered && (
        <CheckBack item={item} content={content} copy={copy} revisit={revisit} busy={busy} answer={answer} />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4">
        <Link to={visit.pathname} state={visit.state} className={plain}>{copy.card_visit}</Link>
        {partActions(item, copy).filter((a) => !(renaming && a.id === 'rename')).map((a) => (
          <button key={a.id} type="button" disabled={busy} className={quiet}
            onClick={() => { if (a.call) run(a.call); else { setDraft(part.name ?? ''); setRenaming(true); } }}>
            {a.label}
          </button>
        ))}
      </div>
      {/* A safety-line or danger part (functions/src/safety/partSafetyFlag.ts): crisis resources under the
          actions, quiet, alongside the card and its 30-day check-back above, never instead. */}
      {part.safety === true && <div className="mt-3"><CrisisBanner compact /></div>}
    </li>
  );
}

/**
 * The 30-day check-back, in Me's still-true style. Active: four answers; "It's doing something new"
 * opens the would-rather chips (1 to 3) and a Save. Resting: Still quiet / It's back. Folds away after.
 */
function CheckBack({ item, content, copy, revisit, busy, answer }: {
  item: MeItem; content: PartsContent; copy: Copy; revisit: PartRevisitCopy; busy: boolean;
  answer: (answer: PartRevisitAnswer, ratherIds?: string[]) => void;
}) {
  const part = item.part!;
  const resting = item.meta.status === 'resting';
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  if (picking) {
    return (
      <div className={box}>
        <p className="text-sm text-[var(--color-text-primary)] mb-2">{revisit.prompts.revisit_new_title}</p>
        <div className="flex flex-wrap gap-2">
          {revisitRatherOptions(content, part).map((o) => {
            const on = picked.includes(o.id);
            return (
              <button key={o.id} type="button" aria-pressed={on} disabled={busy || (!on && picked.length >= RATHER_IDS_MAX)}
                onClick={() => setPicked((p) => toggleRather(p, o.id))} className={on ? chosen : choice}>
                {o.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4">
          <button type="button" disabled={busy || picked.length === 0} onClick={() => answer('new', picked)} className={plain}>
            {copy.card_rename_save}
          </button>
          <button type="button" disabled={busy} onClick={() => { setPicking(false); setPicked([]); }} className={quiet}>
            {copy.card_cancel}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={box}>
      <p className="text-sm text-[var(--color-text-primary)] mb-2 break-words">{revisitQuestion(revisit, part, resting)}</p>
      <div className="flex flex-wrap gap-2">
        {revisitChoices(revisit, content, part, resting).map((c) => (
          <button key={c.id} type="button" disabled={busy} className={choice}
            onClick={() => (c.answer === 'new' ? setPicking(true) : answer(c.answer))}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A set-aside part, in Me's set-aside style, with "Bring it back" (restorePart). */
function SetAsideRow({ item, copy, onWrite }: { item: MeItem; copy: Copy; onWrite: PartWrite }) {
  const { busy, run } = useWrite(onWrite);
  return (
    <li className="py-3 border-t border-[var(--color-border-subtle)] first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={item.part?.name
            ? 'font-serif text-base text-[var(--color-text-primary)] break-words'
            : 'text-sm font-medium text-[var(--color-text-primary)]'}>
            {item.part?.name ?? item.title}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">{copy.card_set_aside}</p>
        </div>
        <button type="button" disabled={busy} onClick={() => run(restoreCall(item.meta.id))}
          className={`shrink-0 ${plain}`}>
          {copy.card_restore}
        </button>
      </div>
    </li>
  );
}
