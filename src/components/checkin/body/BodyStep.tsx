import { useEffect, useMemo, useRef, useState } from 'react';
import { HeatFigure, type FigureGhost, type FigureMark } from './HeatFigure';
import { StrengthBar } from './StrengthBar';
import { MirrorPanel, MirrorTabs, type MirrorView } from './BodyMirror';
import { MORE_PLACES, REGIONS, glowFor, isRegionId, regionLabel, type RegionId, type Side } from '../../../data/bodyFigure';
import { getBodyMapContent } from '../../../services/bodyMap';
import type { BodyMirrorMap, PadWord, PadZone } from '../../../data/bodyMapTypes';
import { getEmotionById } from '../../../data/emotions';
import { HEAT, markColour, zoneColour } from '../../../lib/bodyMark';
import { entryWords, mirrorTabs, prefillFrom, sharedPlaces, type Ghost, type MirrorTab } from '../../../lib/bodyMirror';

/** One marked place, as the check-in saves it. */
export interface BodyMark {
  x: number;
  y: number;
  region: string;
  side: Side;
  /** Kept for the record's shape; the body step no longer sets it (the pad is gone). */
  intensity: { x: number; y: number };
  tags: string[];
  sensationIds: string[];
  /** 0–1 from the optional strength bar; null when it wasn't used for this place. */
  strength: number | null;
  /** The place came from the body mirror: the user tapped a typical place (or "Add all of these"). */
  fromMirror?: boolean;
}

interface BodyStepProps {
  marks: BodyMark[];
  onChange: (marks: BodyMark[]) => void;
  /** Continue with the marks. */
  onComplete: () => void;
  /** Leave the step without marks. */
  onSkip: () => void;
  isSomaticEntry?: boolean;
  /** The check-in's grid word ids, in check-in order: the body mirror's maps follow them. None (the
   *  "Start with my body" path) means no mirror. */
  emotionIds?: string[];
}

const NO_INTENSITY = { x: 0.5, y: 0.5 };

/** Whether the strength bar shows: on by default; hiding it is a per-device preference. (A new
 *  key: the first version stored "off unless turned on" under goblin.body.strengthBar.) */
const BAR_HIDDEN_KEY = 'goblin.body.strengthBarHidden';
function readBarPref(): boolean {
  try { return localStorage.getItem(BAR_HIDDEN_KEY) !== '1'; } catch { return true; }
}
function writeBarPref(on: boolean) {
  try { localStorage.setItem(BAR_HIDDEN_KEY, on ? '0' : '1'); } catch { /* private mode: in memory only */ }
}

/** The panel's unsaved state, shown live on the figure. */
interface Draft { side: Side; strength: number | null; sensationIds: string[] }

/** Centre of a mark on the figure, normalised to the viewBox, for the record's x / y. */
function centre(region: RegionId, side: Side) {
  const g = glowFor(region, side);
  const cx = g.reduce((s, e) => s + e.cx, 0) / g.length;
  const cy = g.reduce((s, e) => s + e.cy, 0) / g.length;
  return { x: Math.round(((cx + 10) / 220) * 1000) / 1000, y: Math.round(((cy + 6) / 432) * 1000) / 1000 };
}

/**
 * The body step (docs/design/body-map.md, step 3; canvas row AA). One screen, nothing to scroll
 * to: the heat figure (drag to a place and lift, or tap), a strength bar beside it (shown by default;
 * the "Strength" toggle hides it, remembered on this device), and under it either the chosen place's words in
 * one swipeable row or your marks and the places the figure can't show. A mark glows in its words' square colour
 * from its words and as strong as the bar says. Both sides by default; paired places offer your
 * left / your right. Marks belong to the whole check-in, never to a feeling.
 */
export function BodyStep({ marks, onChange, onComplete, onSkip, isSomaticEntry = false, emotionIds = [] }: BodyStepProps) {
  const [words, setWords] = useState<PadWord[] | null>(null);
  const [maps, setMaps] = useState<BodyMirrorMap[]>([]);
  const [view, setView] = useState<MirrorView | null>(null);
  /** The word a pre-filled place came from ("Filled in from how anxious often feels"); null otherwise. */
  const [prefilled, setPrefilled] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<RegionId | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState<{ region: RegionId | null } | null>(null);
  const [barOn, setBarOn] = useState(readBarPref);
  const [morePlaces, setMorePlaces] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const idsKey = isSomaticEntry ? '' : emotionIds.join(',');
  useEffect(() => {
    let live = true;
    getBodyMapContent(idsKey ? idsKey.split(',') : [])
      .then((c) => { if (live) { setWords(c.padWords); setMaps(c.maps); } })
      .catch(() => { if (live) { setWords([]); setFailed(true); } });
    return () => { live = false; };
  }, [idsKey]);

  const tabs = useMemo(() => mirrorTabs(maps, (id) => {
    const e = getEmotionById(id);
    return e ? { name: e.name, quadrant: e.quadrant } : undefined;
  }), [maps]);
  const shared = useMemo(() => sharedPlaces(tabs), [tabs]);
  const mirrorOn = view !== null && tabs.length > 0;
  const tabView: MirrorView = view === 'together' && shared.length === 0 ? 0 : view ?? 0;

  // On a short phone the card can sit below the fold; bring it into view when a place is chosen.
  useEffect(() => {
    if (editing) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [editing]);

  // A word's home quarter on the feeling square (its first zone) sets the mark's colour.
  const homeOf = useMemo(() => new Map((words ?? []).map((w) => [w.id, w.zones[0]])), [words]);
  const colourFor = (ids: string[]) => markColour(ids.map((id) => homeOf.get(id)).filter((z): z is PadZone => Boolean(z)));

  const existing = editing ? marks.find((m) => m.region === editing) ?? null : null;
  const figureMarks: FigureMark[] = marks
    .filter((m) => isRegionId(m.region) && m.region !== editing)
    .map((m) => ({ region: m.region as RegionId, side: m.side, colour: colourFor(m.sensationIds), strength: m.strength }));
  if (editing && draft) {
    figureMarks.push({ region: editing, side: draft.side, colour: colourFor(draft.sensationIds), strength: draft.strength });
  }

  // The mirror's typical places in the current view, minus places that are already yours (solid wins).
  const marked = new Set(marks.map((m) => m.region));
  const viewGhosts: Array<{ ghost: Ghost; tab: MirrorTab }> = !mirrorOn ? [] : tabView === 'together'
    ? tabs.flatMap((tab) => tab.ghosts.map((ghost) => ({ ghost, tab })))
    : tabs[tabView]?.ghosts.map((ghost) => ({ ghost, tab: tabs[tabView] })) ?? [];
  const figureGhosts: FigureGhost[] = [];
  for (const { ghost, tab } of viewGhosts) {
    // The whole body would hatch over everything else: it stays a chip, not a shape.
    if (marked.has(ghost.region) || ghost.region === editing || ghost.region === 'body') continue;
    const at = figureGhosts.find((g) => g.region === ghost.region);
    if (at) { if (!at.colours.includes(zoneColour(tab.zone))) at.colours.push(zoneColour(tab.zone)); }
    else figureGhosts.push({ region: ghost.region, colours: [zoneColour(tab.zone)] });
  }

  function choose(region: RegionId) {
    const m = marks.find((x) => x.region === region);
    // In the mirror, lifting on a typical place that isn't yours yet opens it pre-filled.
    const hint = !m ? viewGhosts.find((v) => v.ghost.region === region) : undefined;
    if (hint) { pickGhost(hint.ghost, hint.tab); return; }
    setDraft({ side: m?.side ?? 'both', strength: m?.strength ?? null, sensationIds: m?.sensationIds ?? [] });
    setPrefilled(null);
    setEditing(region);
  }

  /** A typical place tapped (on the figure or its chip): yours already → open it with the word added;
   *  otherwise open it pre-filled from the map. */
  function pickGhost(ghost: Ghost, tab: MirrorTab) {
    const m = marks.find((x) => x.region === ghost.region);
    if (m) {
      const ids = m.sensationIds.includes(ghost.sensationId) ? m.sensationIds : [...m.sensationIds, ghost.sensationId];
      setDraft({ side: m.side, strength: m.strength, sensationIds: ids });
      setPrefilled(m.sensationIds.includes(ghost.sensationId) ? null : tab.words[0]);
    } else {
      setDraft(prefillFrom(ghost, barOn));
      setPrefilled(tab.words[0]);
    }
    setEditing(ghost.region);
  }

  /** "Add all of these": every typical place in the tab that isn't yours yet, as the map has it. */
  function addAll(tab: MirrorTab) {
    const label = new Map((words ?? []).map((w) => [w.id, w.label]));
    const added: BodyMark[] = tab.ghosts.filter((g) => !marked.has(g.region)).map((g) => {
      const fill = prefillFrom(g, barOn);
      return {
        ...centre(g.region, fill.side), region: g.region, side: fill.side, intensity: NO_INTENSITY,
        tags: [label.get(g.sensationId) ?? g.label], sensationIds: fill.sensationIds, strength: fill.strength, fromMirror: true,
      };
    });
    if (added.length) onChange([...marks, ...added]);
  }

  function close() {
    setEditing(null);
    setDraft(null);
    setPrefilled(null);
  }

  function done() {
    if (!editing || !draft) return;
    const byId = new Map((words ?? []).map((w) => [w.id, w]));
    const ids = draft.sensationIds.filter((id) => byId.has(id) || existing?.sensationIds.includes(id));
    const tags = ids.map((id) => byId.get(id)?.label ?? existing?.tags[existing.sensationIds.indexOf(id)] ?? ghostLabel(id) ?? id);
    const mark: BodyMark = {
      ...centre(editing, draft.side), region: editing, side: draft.side, intensity: existing?.intensity ?? NO_INTENSITY,
      tags, sensationIds: ids, strength: draft.strength,
      ...(existing?.fromMirror || prefilled ? { fromMirror: true } : {}),
    };
    onChange([...marks.filter((m) => m.region !== editing), mark]);
    close();
  }

  /** A typical place's own label, for a pre-filled word the pad doesn't list. */
  function ghostLabel(id: string): string | undefined {
    return tabs.flatMap((t) => t.ghosts).find((g) => g.sensationId === id)?.label;
  }

  function remove() {
    if (!editing) return;
    onChange(marks.filter((m) => m.region !== editing));
    close();
  }

  function toggleBar() {
    writeBarPref(!barOn);
    setBarOn(!barOn);
  }

  const readback = hover ? (hover.region ? REGIONS[hover.region].label : 'Not on the body') : editing ? REGIONS[editing].label : ' ';

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <h1 className="text-[2rem] leading-[1.08] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">
        {isSomaticEntry ? 'Let’s start with your body' : 'Where do you feel it?'}
      </h1>
      <p className="mt-1.5 mb-0 text-[15px] text-[var(--color-text-secondary)]">
        {isSomaticEntry ? 'Touch and drag to where you feel something, then lift.' : 'Touch and drag to a place, then lift.'}
      </p>

      {mirrorOn && !editing && (
        <div className="mt-3">
          <MirrorTabs tabs={tabs} shared={shared} view={tabView} onView={setView} />
        </div>
      )}

      <div className="body-stage mt-2">
        <p className="body-stage__readback" aria-live="polite">{readback}</p>
        <button type="button" className="body-stage__toggle strength-toggle" aria-pressed={barOn} onClick={toggleBar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="3" x2="12" y2="21" /><circle cx="12" cy="9" r="3.2" fill="currentColor" stroke="none" />
          </svg>
          Strength
        </button>
        <div className="body-stage__figure">
          <HeatFigure marks={figureMarks} ghosts={figureGhosts} selected={editing} onPick={choose} onHover={setHover} fingerColour={HEAT} />
        </div>
        <div className="body-stage__bar">
          {barOn && (
            <StrengthBar value={editing ? draft?.strength ?? null : null} disabled={!editing}
              label={editing ? `How strong in your ${REGIONS[editing].label.toLowerCase()}` : 'How strong. Choose a place first.'}
              onChange={(v) => setDraft((d) => (d ? { ...d, strength: v } : d))} />
          )}
        </div>
      </div>

      {editing && draft ? (
        <div ref={cardRef}>
          <PlaceCard region={editing} words={words} failed={failed} draft={draft} existing={existing}
            colour={colourFor(draft.sensationIds)} onChange={setDraft} prefilled={prefilled} labelFor={ghostLabel} />
          <div className="action-dock flex gap-3">
            <button type="button" onClick={existing ? remove : close} className="den-chip min-h-[56px] px-5">
              {existing ? 'Remove' : 'Cancel'}
            </button>
            <button type="button" onClick={done}
              className="flex-1 min-h-[56px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
              {existing ? 'Done' : prefilled ? 'Keep this place' : 'Add this place'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* One group so the screen doesn't scroll: your marks, then the places the figure can't
              show (behind "More places" once something is marked). */}
          <div className={`mt-3 flex flex-wrap gap-2${marks.length ? '' : ' justify-center'}`}>
            {marks.map((m) => (
              <button key={m.region} type="button" className="den-chip den-chip--small is-marked"
                style={{ ['--mark' as string]: colourFor(m.sensationIds) }}
                onClick={() => isRegionId(m.region) && choose(m.region)}>
                {[regionLabel(m.region, m.side), m.tags.join(', ').toLowerCase()].filter(Boolean).join(' · ')}
              </button>
            ))}
            {(marks.length > 0 || mirrorOn) && !morePlaces ? (
              <button type="button" className="den-chip den-chip--small" aria-expanded={false} onClick={() => setMorePlaces(true)}>
                + More places
              </button>
            ) : (
              MORE_PLACES.filter((id) => !marks.some((m) => m.region === id)).map((id) => (
                <button key={id} type="button" className="den-chip den-chip--small" onClick={() => choose(id)}>
                  {REGIONS[id].label}
                </button>
              ))
            )}
          </div>
          {mirrorOn ? (
            <MirrorPanel tabs={tabs} shared={shared} view={tabView} marks={marks} onPick={pickGhost} onAddAll={addAll}
              onClose={() => setView(null)} />
          ) : tabs.length > 0 && (
            <button type="button" className="body-mirror__entry" onClick={() => setView(0)}>
              + Not sure? See where <MirrorEntryWords tabs={tabs} /> often {tabs.length === 1 && tabs[0].words.length === 1 ? 'shows' : 'show'} up
            </button>
          )}
          <div className="action-dock">
            {marks.length > 0 ? (
              <button type="button" onClick={onComplete}
                className="w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
                {isSomaticEntry ? 'Help me find the words' : 'Continue'}
              </button>
            ) : (
              <button type="button" onClick={onSkip} className="den-chip w-full min-h-[56px]">
                {isSomaticEntry ? 'Pick feelings instead' : 'Skip this step'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** The entry's words: "anxious", "anxious and excited", or "your feelings" for more. */
function MirrorEntryWords({ tabs }: { tabs: MirrorTab[] }) {
  const named = entryWords(tabs);
  if (!named) return <>your feelings</>;
  return named.length === 1
    ? <em className="body-mirror__word">{named[0]}</em>
    : <><em className="body-mirror__word">{named[0]}</em> and <em className="body-mirror__word">{named[1]}</em></>;
}

interface PlaceCardProps {
  region: RegionId;
  words: PadWord[] | null;
  failed: boolean;
  draft: Draft;
  existing: BodyMark | null;
  /** The mark's colour, for picked chips. */
  colour: string;
  onChange: (d: Draft) => void;
  /** Filled in from the body mirror: the word it came from. */
  prefilled?: string | null;
  /** Labels for words the pad doesn't list (a typical place's word). */
  labelFor?: (id: string) => string | undefined;
}

/** The chosen place: both sides or one, and the graph's words for it in one swipeable row. */
function PlaceCard({ region, words, failed, draft, existing, colour, onChange, prefilled = null, labelFor }: PlaceCardProps) {
  const def = REGIONS[region];
  const picked = draft.sensationIds;
  const here = useMemo(() => {
    const all = words ?? [];
    const list = all.filter((w) => w.regions.length === 0 || w.regions.includes(region));
    // A word saved on this mark that's no longer served still shows, so it can be taken off; so does a
    // pre-filled word the pad doesn't list for this place.
    const extra = [...new Set([...(existing?.sensationIds ?? []), ...picked])]
      .filter((id) => !list.some((w) => w.id === id))
      .map((id) => ({
        id,
        label: all.find((w) => w.id === id)?.label ?? existing?.tags[existing.sensationIds.indexOf(id)] ?? labelFor?.(id) ?? id,
      }));
    return [...extra, ...list.map((w) => ({ id: w.id, label: w.label }))];
    // `picked` only adds words; recomputing on every toggle would reorder the row under the finger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, region, existing, labelFor]);

  function toggle(id: string) {
    const ids = draft.sensationIds.includes(id) ? draft.sensationIds.filter((x) => x !== id) : [...draft.sensationIds, id];
    onChange({ ...draft, sensationIds: ids });
  }

  return (
    <section className="body-card mt-3" aria-label={def.label}>
      <div className="body-card__top">
        <h2 className="m-0 text-[1.3rem] leading-[1.15] text-[var(--color-text-primary)]">
          My {def.label.toLowerCase()} {def.plural ? 'feel' : 'feels'}…
        </h2>
        {def.paired && (
          <div className="seg seg--small" role="radiogroup" aria-label="Which side">
            {([['both', 'Both'], ['left', 'Your left'], ['right', 'Your right']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={draft.side === v} className={draft.side === v ? 'is-on' : ''}
                onClick={() => onChange({ ...draft, side: v })}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {prefilled && (
        <p className="body-card__note">
          Filled in from how <em className="body-mirror__word">{prefilled}</em> often feels. Change anything that isn’t true for you.
        </p>
      )}
      {words === null ? (
        <p className="mt-2 mb-0 text-[15px] text-[var(--color-text-secondary)]">Loading words…</p>
      ) : here.length === 0 ? (
        <p className="mt-2 mb-0 text-[15px] text-[var(--color-text-secondary)]">
          {failed ? 'Couldn’t load the words. ' : ''}You can still mark the place.
        </p>
      ) : (
        <div className="body-card__words" role="group" aria-label="Words for it" style={{ ['--chip-on' as string]: colour }}>
          {here.map((w) => (
            <button key={w.id} type="button" className="den-chip den-chip--small" aria-pressed={draft.sensationIds.includes(w.id)}
              onClick={() => toggle(w.id)}>
              {w.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
