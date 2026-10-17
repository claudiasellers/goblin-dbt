import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PartsContent } from '../../data/partsContentTypes';
import type { GetTrailOfferEvidenceResponse, TrailOfferAnswer } from '../../data/partsTypes';
import type { TodayItem } from '../../services/spine';
import { answerTrailOffer, getTrailOfferEvidence } from '../../services/parts';
import { trailOfferReady } from '../../lib/trailOffer';
import {
  evidenceAnswers, evidenceRows, offerMeetLink, splitChips, splitCopy, trailCardCopy, trailStatement,
} from '../../lib/trailOfferCard';

const chip = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors';
const chipOn = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-[var(--color-border-accent)] text-[var(--color-text-primary)] bg-[var(--color-bg-subtle)] disabled:opacity-50 transition-colors';

/**
 * A trail offer on Today (docs/design/parts.md, "The offer card"): "Something keeps showing up", the
 * statement in the serif (it's about the person), "Want to take a look?", then Show me / Not now / No
 * (No is Not me). Show me opens the evidence: one row per moment (date, tool, context, what was picked,
 * all ids rendered as labels), "Does this feel like a part of you?" and the four answers. Yes opens Meet a
 * part on the offer; More than one asks which feels like its own thing, the offer's moves as chips, and
 * keeps each as a part to come back to. Every word is signed-off content; without all of it the card is
 * nothing. A failed call keeps the card as it was.
 */
export function TrailOfferCard({ item, content, onDone }: {
  item: TodayItem;
  content: PartsContent | null;
  onDone: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState<GetTrailOfferEvidenceResponse | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [kept, setKept] = useState<string[]>([]);
  const statement = trailStatement(item.trail);
  if (!content || !trailOfferReady(content) || !statement) return null;
  const copy = trailCardCopy(content);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch { /* the card stays as it was */ } finally { setBusy(false); }
  };
  const show = () => run(async () => { setEvidence(await getTrailOfferEvidence({ offerId: item.id })); });
  const answer = (a: TrailOfferAnswer) => run(async () => {
    if (a === 'more_than_one') { setSplitting(true); return; }
    const res = await answerTrailOffer({ offerId: item.id, answer: a });
    onDone(item.id);
    if (res.next === 'meet') {
      const link = offerMeetLink(content, item.id, res.moveIds ?? evidence?.moveIds ?? []);
      navigate(link.pathname, { state: link.state });
    }
  });
  const keep = () => run(async () => {
    await answerTrailOffer({ offerId: item.id, answer: 'more_than_one', split: kept, candidateIds: kept.map(() => crypto.randomUUID()) });
    onDone(item.id);
  });

  const frame = 'p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]';

  if (evidence && splitting) {
    const s = splitCopy(content);
    const chips = splitChips(content, evidence.moveIds);
    return (
      <section aria-label={s.question} data-testid="trail-offer-split" className={frame}>
        <p className="font-medium text-[var(--color-text-primary)]">{s.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((m) => {
            const on = kept.includes(m.id);
            return (
              <button key={m.id} type="button" aria-pressed={on} disabled={busy} className={on ? chipOn : chip}
                onClick={() => setKept((k) => (on ? k.filter((x) => x !== m.id) : [...k, m.id]))}>
                {m.label}
              </button>
            );
          })}
        </div>
        <button type="button" disabled={busy || kept.length === 0} className={`${chip} mt-3`} onClick={() => void keep()}>{s.keep}</button>
      </section>
    );
  }

  if (evidence) {
    const rows = evidenceRows(evidence.rows);
    // "More than one" needs every move as a chip.
    const canSplit = splitChips(content, evidence.moveIds).length > 0;
    const heading = content.prompts.offer_evidence.copy;
    return (
      <section aria-label={heading} data-testid="trail-offer-evidence" className={frame}>
        <p className="text-sm text-[var(--color-text-secondary)]">{heading}</p>
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-2 gap-x-3 text-sm text-[var(--color-text-primary)] sm:grid-cols-4">
              <span>{r.date}</span>
              <span>{r.tool ?? ''}</span>
              <span className="text-[var(--color-text-secondary)]">{r.context ?? ''}</span>
              <span>{r.source ?? ''}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-medium text-[var(--color-text-primary)]">{content.prompts.offer_question.copy}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {evidenceAnswers(content).filter((o) => o.answer !== 'more_than_one' || canSplit).map((o) => (
            <button key={o.id} type="button" disabled={busy} className={chip} onClick={() => void answer(o.answer)}>{o.label}</button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={copy.eyebrow} data-testid="trail-offer" className={frame}>
      <p className="text-sm text-[var(--color-text-secondary)]">{copy.eyebrow}</p>
      <p className="mt-1 font-serif text-lg leading-snug text-[var(--color-text-primary)]">{statement}</p>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{copy.ask}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" disabled={busy} className={chip} onClick={() => void show()}>{copy.show}</button>
        <button type="button" disabled={busy} className={chip} onClick={() => void answer('not_now')}>{copy.notNow}</button>
        <button type="button" disabled={busy} className={chip} onClick={() => void answer('not_me')}>{copy.no}</button>
      </div>
    </section>
  );
}
