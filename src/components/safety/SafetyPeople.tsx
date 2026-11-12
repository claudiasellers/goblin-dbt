import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSafetyCountry } from '../../hooks/useSafetyCountry';
import { getSafetyContent } from '../../services/safety';
import type { SafetyContent, SafetyCountry } from '../../data/safetyTypes';
import { cleanPhone, pinnedPeople, type SafetyPlan } from '../../lib/safetyPlan';
import { fill, smsHref, telHref } from '../../lib/safetyRoute';

/**
 * People you can talk to (CORE-01): the emergency number, then the country's checked lines (call · text · chat),
 * Find A Helpline, and *Not in {country}?* to pick another. A tap on a line tells the route `contacted: line`.
 * The only numbers here come from the generated content (safety.json), never this file.
 */
export function SafetyPeople({ content, country, onCountry, onContact, heading = true }: {
  content: SafetyContent;
  country: string | null;
  onCountry: (id: string) => void;
  onContact?: () => void;
  heading?: boolean;
}) {
  const p = content.flow.people;
  const c = content.countries.find((x) => x.id === country) ?? null;
  // Poison lines show on the medical screen (PoisonLines), not here.
  const lines = c ? c.lines.filter((l) => l.kind !== 'poison') : [];
  const [picking, setPicking] = useState(false);
  const link = 'inline-flex items-center justify-center min-h-11 px-3 rounded-lg border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)] font-medium underline-offset-2 hover:underline';
  const emergency = c
    ? (c.emergencyAlt ? fill(p.emergencyOr, { number: c.emergency, alt: c.emergencyAlt }) : fill(p.emergency, { number: c.emergency }))
    : p.unknownCountry;
  return (
    <section aria-label={p.heading} data-testid="safety-people"
      className="p-4 rounded-xl border border-[var(--color-q-hu-border)] bg-[var(--color-q-hu-bg)] text-[var(--color-q-hu-text)] space-y-3">
      {heading && <h2 className="text-base font-semibold m-0">{p.heading}</h2>}
      {c ? (
        <a href={telHref(c.emergency)} onClick={onContact} className={`${link} w-full`} data-testid="safety-emergency">{emergency}</a>
      ) : (
        <p className="m-0 font-medium">{emergency}</p>
      )}
      {c && lines.length === 0 && <p className="m-0 text-sm">{fill(p.noLine, { country: c.name })}</p>}
      {c && lines.length > 0 && (
        <ul className="m-0 p-0 list-none space-y-3">
          {lines.map((l) => (
            <li key={l.id} className="space-y-1">
              <p className="m-0 font-medium">{l.name}{l.hours === '24/7' ? <span className="font-normal text-sm"> · {p.allDay}</span> : null}</p>
              <div className="flex flex-wrap gap-2">
                {l.phone && <a href={telHref(l.phone)} onClick={onContact} className={link} aria-label={`${p.call} ${l.name}, ${l.phone}`}>{p.call} {l.phone}</a>}
                {l.sms && (
                  <a href={smsHref(l.sms, l.smsBody)} onClick={onContact} className={link}
                    aria-label={l.smsBody ? fill(p.textBody, { body: l.smsBody, number: l.sms }) : `${p.text} ${l.name}, ${l.sms}`}>
                    {l.smsBody ? fill(p.textBody, { body: l.smsBody, number: l.sms }) : `${p.text} ${l.sms}`}
                  </a>
                )}
                {l.chatUrl && <a href={l.chatUrl} target="_blank" rel="noreferrer" onClick={onContact} className={link} aria-label={`${p.chat}: ${l.name}`}>{p.chat}</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <a href={content.flow.findAHelpline.url} target="_blank" rel="noreferrer" onClick={onContact} className="inline-flex items-center min-h-11 underline text-sm">
        {c ? p.findLine : content.flow.findAHelpline.label}
      </a>
      <div>
        {picking ? (
          <label className="block text-sm">
            <span className="block mb-1">{p.pickCountry}</span>
            <select className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] px-2"
              value={country ?? ''} onChange={(e) => { onCountry(e.target.value); setPicking(false); }} autoFocus>
              <option value="" disabled>{p.pickCountry}</option>
              {content.countries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        ) : (
          <button type="button" onClick={() => setPicking(true)} className="min-h-11 text-sm underline bg-transparent border-none p-0 text-[var(--color-q-hu-text)] cursor-pointer">
            {c ? fill(p.notIn, { country: c.name }) : p.pickCountry}
          </button>
        )}
      </div>
      <p className="m-0 text-xs">{content.flow.cantTell}</p>
    </section>
  );
}

/**
 * The plan's people (CORE-02), pinned: the emergency number (when a country is given) and each person with a number,
 * Call and Text (with the message they wrote). `full` (use mode's step 4) lists everyone with their message.
 */
export function PlanPeopleRow({ content, country, plan, onContact, full = false }: {
  content: SafetyContent; country: SafetyCountry | null; plan: SafetyPlan | null;
  onContact?: (how: 'line' | 'person') => void; full?: boolean;
}) {
  const p = content.flow.people;
  const u = content.flow.plan.use;
  const people = full ? (plan?.people ?? []).filter((x) => x.name || x.phone) : pinnedPeople(plan);
  if (!country && people.length === 0) return null;
  const btn = 'inline-flex items-center justify-center min-h-12 px-4 rounded-lg border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)] font-medium';
  return (
    <section aria-label={p.fromPlan} data-testid="plan-people"
      className="p-3 rounded-xl border border-[var(--color-q-hu-border)] bg-[var(--color-q-hu-bg)] text-[var(--color-q-hu-text)] space-y-2">
      {country && <a href={telHref(country.emergency)} onClick={() => onContact?.('line')} className={`${btn} w-full`}>{fill(p.emergency, { number: country.emergency })}</a>}
      {people.length > 0 && <p className="m-0 text-sm font-medium">{p.fromPlan}</p>}
      {people.map((x, i) => {
        const phone = cleanPhone(x.phone);
        return (
          <div key={i} className="space-y-1">
            <p className="m-0 font-medium">{x.name || phone}</p>
            {full && x.text && <p className="m-0 text-sm">{x.text}</p>}
            {phone && (
              <div className="flex flex-wrap gap-2">
                <a href={telHref(phone)} onClick={() => onContact?.('person')} className={btn} aria-label={`${u.call} ${x.name || phone}`}>{u.call}</a>
                <a href={smsHref(phone, x.text || null)} onClick={() => onContact?.('person')} className={btn} aria-label={`${u.text} ${x.name || phone}`}>{u.text}</a>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** The country's poison information line(s), under the emergency number on the medical screen. */
export function PoisonLines({ content, country, onContact }: { content: SafetyContent; country: string | null; onContact?: () => void }) {
  const c = content.countries.find((x) => x.id === country);
  const lines = (c?.lines ?? []).filter((l) => l.kind === 'poison' && l.phone);
  if (!lines.length) return null;
  return (
    <div className="space-y-1" data-testid="safety-poison">
      <p className="m-0 text-sm font-medium">{content.flow.act.poison}</p>
      {lines.map((l) => (
        <a key={l.id} href={telHref(l.phone as string)} onClick={onContact}
          className="inline-flex items-center min-h-11 underline mr-4">{l.name} · {l.phone}</a>
      ))}
    </div>
  );
}

/**
 * People above a check-in result whose safety question was already asked earlier in this browser session
 * (CORE-01): the route is on, so the old crisis banner never shows, and the people and *Help & safety* do instead.
 */
export function SafetyPeopleCard() {
  const [content, setContent] = useState<SafetyContent | null>(null);
  const [country, setCountry] = useSafetyCountry(content);
  useEffect(() => { void getSafetyContent().then(setContent).catch(() => { /* the fallback line below */ }); }, []);
  const box = 'mb-6 p-4 rounded-xl border border-[var(--color-q-hu-border)] bg-[var(--color-bg-card)] space-y-3';
  if (!content) return <div className={box}><p className="m-0">If you're in danger, call your local emergency number now.</p></div>;
  return (
    <div className={box} data-testid="safety-people-card">
      <SafetyPeople content={content} country={country} onCountry={setCountry} />
      <Link to="/safety" className="inline-flex min-h-11 items-center text-sm underline underline-offset-2 text-[var(--color-text-secondary)]">
        {content.flow.header.label}
      </Link>
    </div>
  );
}
