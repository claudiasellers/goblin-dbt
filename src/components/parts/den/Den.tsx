import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DenLink, DenSnapshotPart, GetDenResponse } from '../../../data/partsTypes';
import { getDen, getDenSnapshot, linkParts, unlinkParts, updatePartLayout } from '../../../services/parts';
import {
  NO_SELECTION, coversForRequest, denName, pastMonths, placeParts, tapFigure, thenLabel, twoPullsLink,
  type DenCopy, type Selection, type Spot,
} from '../../../lib/den';
import { monthName } from '../../../lib/partStats';
import { CrisisBanner } from '../../safety/CrisisBanner';
import { DenRoom, type RoomPart } from './DenRoom';

const link = 'inline-flex items-center min-h-11 text-sm underline underline-offset-2 disabled:opacity-50';
const quiet = `${link} text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`;
const chip = 'min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm text-left text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] disabled:opacity-50 aria-pressed:border-[var(--color-border-accent)] aria-pressed:font-medium';

/**
 * The den (docs/design/parts.md, "The den"), once its gate holds (PartsDenPage): the room, the person's
 * own arrangement saved on each drop, threads only on a yes, then and now, and the plain list one tap away.
 * Writes are quiet: a failed one leaves the room as it was, with no message (Me's rule).
 */
export function Den({ copy, initial, twoPullsAvailable, now = new Date() }: {
  copy: DenCopy;
  initial: GetDenResponse;
  /** Two pulls is built (src/data/tools.ts): only then is "These two pull against each other" offered. */
  twoPullsAvailable: boolean;
  now?: Date;
}) {
  const [den, setDen] = useState(initial);
  const [spots, setSpots] = useState<Map<string, Spot>>(() => placeParts(initial.parts));
  const [sel, setSel] = useState<Selection>(NO_SELECTION);
  const [asking, setAsking] = useState<'choose' | 'front'>('choose');
  const [busy, setBusy] = useState(false);
  const [then, setThen] = useState<{ id: string; month: string; parts: DenSnapshotPart[] } | null>(null);
  const [view, setView] = useState<'now' | 'then'>('now');
  const sheetRef = useRef<HTMLDivElement>(null);

  // A part that joined since the room was laid out arrives at the edge of the light; nobody else moves.
  useEffect(() => {
    setSpots((cur) => {
      if (den.parts.every((p) => cur.has(p.id))) return cur;
      const placed = placeParts(den.parts.map((p) => {
        const s = cur.get(p.id);
        return s ? { id: p.id, mapX: s.x, mapY: s.y } : p;
      }));
      return placed;
    });
  }, [den.parts]);

  useEffect(() => { if (sel.pair) sheetRef.current?.focus({ preventScroll: true }); }, [sel.pair, asking]);

  const names = useMemo(() => new Map(den.parts.map((p) => [p.id, denName(p, copy)])), [den.parts, copy]);
  const roomParts: RoomPart[] = den.parts.map((p) => ({
    id: p.id, name: names.get(p.id)!, tender: p.tender, resting: p.status === 'resting', shapeSig: p.shapeSig, recency: p.recency,
  }));

  const reload = async () => { try { setDen(await getDen()); } catch { /* the room stays as it is */ } };

  const move = async (id: string, at: Spot) => {
    const before = spots.get(id);
    setSpots((m) => new Map(m).set(id, at));
    try {
      await updatePartLayout({ positions: [{ partId: id, mapX: at.x, mapY: at.y }] });
    } catch {
      if (before) setSpots((m) => new Map(m).set(id, before));
    }
  };

  const closeSheet = () => { setSel(NO_SELECTION); setAsking('choose'); };
  const tap = (id: string) => { setAsking('choose'); setSel((s) => tapFigure(s, id)); };

  const standsInFront = async (frontId: string) => {
    if (!sel.pair || busy) return;
    setBusy(true);
    try {
      await linkParts(coversForRequest(frontId, sel.pair));
      closeSheet();
      await reload();
    } catch { /* unchanged */ } finally { setBusy(false); }
  };

  const unlink = async (l: DenLink) => {
    if (busy) return;
    setBusy(true);
    try {
      await unlinkParts({ linkId: l.id });
      setDen((d) => ({ ...d, links: d.links.filter((x) => x.id !== l.id) }));
    } catch { /* unchanged */ } finally { setBusy(false); }
  };

  const openThen = async (id: string, month: string) => {
    if (then?.id === id) { setThen(null); return; }
    try {
      const snap = await getDenSnapshot({ id });
      setThen({ id, month, parts: snap.parts });
      setView('then');
    } catch { /* nothing to show */ }
  };

  const months = pastMonths(den.snapshots, now);
  const safety = den.parts.some((p) => p.safety);
  const pair = sel.pair;

  const nowRoom = (
    <DenRoom parts={roomParts} spots={spots} links={den.links} copy={copy} label={copy.den_link}
      selected={pair ?? (sel.first ? [sel.first] : [])} onMove={move} onTap={tap} onUnlink={unlink} />
  );

  // A past layout: the parts that still exist, as they stood and rested then; drawn as they are drawn now.
  const thenRoom = then && (() => {
    const current = new Map(den.parts.map((p) => [p.id, p]));
    const past = then.parts.filter((p) => current.has(p.id));
    const parts: RoomPart[] = past.map((p) => ({
      id: p.id, name: names.get(p.id)!, tender: p.tender || current.get(p.id)!.tender, resting: p.status === 'resting',
      shapeSig: current.get(p.id)!.shapeSig, recency: null,
    }));
    const ids = new Set(past.map((p) => p.id));
    return (
      <DenRoom parts={parts} spots={placeParts(past)} copy={copy} label={thenLabel(copy, monthName(then.month))}
        links={den.links.filter((l) => ids.has(l.aId) && ids.has(l.bId))} />
    );
  })();

  return (
    <section className="max-w-3xl mx-auto px-4 py-6 space-y-4" data-den="">
      <Link to="/profile" className={quiet}>{copy.den_list}</Link>

      {thenRoom ? (
        <>
          {/* On a phone one room at a time; side by side on wide screens. */}
          <div className="flex gap-2 md:hidden" role="group">
            <button type="button" aria-pressed={view === 'now'} onClick={() => setView('now')} className={chip}>{copy.den_now}</button>
            <button type="button" aria-pressed={view === 'then'} onClick={() => setView('then')} className={chip}>
              {thenLabel(copy, monthName(then!.month))}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={view === 'now' ? '' : 'hidden md:block'}>
              <h2 className="mb-2 text-sm text-[var(--color-text-secondary)]">{copy.den_now}</h2>
              {nowRoom}
            </div>
            <div className={view === 'then' ? '' : 'hidden md:block'}>
              <h2 className="mb-2 text-sm text-[var(--color-text-secondary)]">{thenLabel(copy, monthName(then!.month))}</h2>
              {thenRoom}
            </div>
          </div>
        </>
      ) : nowRoom}

      <p className="text-center font-serif text-base text-[var(--color-text-primary)]">{copy.den_room}</p>
      {den.parts.length < 2 && <p className="text-center text-sm text-[var(--color-text-secondary)]">{copy.den_one_part}</p>}

      {pair && (
        <div ref={sheetRef} tabIndex={-1} role="group" aria-label={`${names.get(pair[0])}, ${names.get(pair[1])}`}
          className="max-w-md mx-auto p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] outline-none" data-den-sheet="">
          {asking === 'choose' ? (
            <div className="flex flex-col items-start gap-2">
              {twoPullsAvailable && (() => {
                const to = twoPullsLink(pair);
                return <Link to={to} className={chip + ' inline-flex items-center'}>{copy.den_pull_against}</Link>;
              })()}
              <button type="button" className={chip} onClick={() => setAsking('front')}>{copy.den_stands_front}</button>
              <button type="button" className={quiet} onClick={closeSheet}>{copy.den_thread_cancel}</button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-[var(--color-text-primary)]">{copy.den_which_front}</p>
              <div className="flex flex-wrap gap-2">
                {pair.map((id) => (
                  <button key={id} type="button" disabled={busy} className={`${chip} font-serif`} onClick={() => standsInFront(id)}>
                    {names.get(id)}
                  </button>
                ))}
              </div>
              <button type="button" disabled={busy} className={quiet} onClick={closeSheet}>{copy.den_thread_cancel}</button>
            </div>
          )}
        </div>
      )}

      {months.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4">
          {months.map((m) => (
            <button key={m.id} type="button" aria-pressed={then?.id === m.id} className={quiet} onClick={() => openThen(m.id, m.month)}>
              {thenLabel(copy, monthName(m.month))}
            </button>
          ))}
        </div>
      )}

      {/* A safety-line or danger part: crisis resources under the room, alongside, never instead. */}
      {safety && <div className="max-w-md mx-auto"><CrisisBanner compact /></div>}
    </section>
  );
}
