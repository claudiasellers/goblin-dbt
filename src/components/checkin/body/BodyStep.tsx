import { useEffect, useMemo, useRef, useState } from 'react';
import { HeatFigure, type FigureMark } from './HeatFigure';
import { MORE_PLACES, REGIONS, glowFor, isRegionId, type RegionId, type Side } from '../../../data/bodyFigure';
import { getBodyMapContent } from '../../../services/bodyMap';
import type { PadWord } from '../../../data/bodyMapTypes';

/** One marked place, as the check-in saves it (`intensity` is the pad point from step 3). */
export interface BodyMark {
  x: number;
  y: number;
  region: string;
  side: Side;
  intensity: { x: number; y: number };
  tags: string[];
  sensationIds: string[];
}

interface BodyStepProps {
  marks: BodyMark[];
  onChange: (marks: BodyMark[]) => void;
  /** Continue with the marks. */
  onComplete: () => void;
  /** Leave the step without marks. */
  onSkip: () => void;
  isSomaticEntry?: boolean;
}

/** Until the sensation pad (step 3) gives each mark its own colour, marks glow a warm mid-tone. */
const HEAT = 'color-mix(in oklab, var(--color-q-hu-fill), var(--color-q-hp-fill))';

const UNCOMFORTABLE = ['hu', 'lu'];

/** Centre of a mark on the figure, normalised to the viewBox, for the record's x / y. */
function centre(region: RegionId, side: Side) {
  const g = glowFor(region, side);
  const cx = g.reduce((s, e) => s + e.cx, 0) / g.length;
  const cy = g.reduce((s, e) => s + e.cy, 0) / g.length;
  return { x: Math.round(((cx + 10) / 220) * 1000) / 1000, y: Math.round(((cy + 6) / 432) * 1000) / 1000 };
}

/**
 * The body step (docs/design/body-map.md, step 2): the heat figure, the places it can't show as
 * chips, and a panel for the place you tapped with the graph's words for it. Both sides by default;
 * paired places offer your left / your right. Marks belong to the whole check-in, never to a feeling.
 */
export function BodyStep({ marks, onChange, onComplete, onSkip, isSomaticEntry = false }: BodyStepProps) {
  const [words, setWords] = useState<PadWord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<RegionId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    getBodyMapContent()
      .then((c) => { if (live) setWords(c.padWords); })
      .catch(() => { if (live) { setWords([]); setFailed(true); } });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (editing) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [editing]);

  const figureMarks: FigureMark[] = marks
    .filter((m) => isRegionId(m.region))
    .map((m) => ({ region: m.region as RegionId, side: m.side, colour: HEAT }));
  const marked = new Set(marks.map((m) => m.region));

  function save(mark: BodyMark | null, region: RegionId) {
    const rest = marks.filter((m) => m.region !== region);
    onChange(mark ? [...rest, mark] : rest);
    setEditing(null);
  }

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <h1 className="text-[2rem] leading-[1.08] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">
        {isSomaticEntry ? 'Let’s start with your body' : 'Where do you feel it?'}
      </h1>
      <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
        {isSomaticEntry ? 'Tap where you feel something. I’ll help with the words after.' : 'Tap a place. Skip if nothing stands out.'}
      </p>

      <div className="mt-3 self-center w-full max-w-[190px]">
        <HeatFigure marks={figureMarks} selected={editing} onPick={setEditing} />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="More places">
        {MORE_PLACES.map((id) => (
          <button key={id} type="button" className={`den-chip den-chip--small${marked.has(id) ? ' is-marked' : ''}`}
            aria-pressed={editing === id} onClick={() => setEditing(id)}>
            {REGIONS[id].label}
          </button>
        ))}
      </div>

      {editing ? (
        <div ref={panelRef}>
          <PlacePanel key={editing} region={editing} words={words} failed={failed}
            existing={marks.find((m) => m.region === editing) ?? null}
            onDone={(m) => save(m, editing)} onRemove={() => save(null, editing)} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <>
          {marks.length > 0 && (
            <ul className="mt-5 m-0 p-0 list-none flex flex-col gap-2" aria-label="Your marks">
              {marks.map((m) => (
                <li key={m.region}>
                  <button type="button" className="body-mark-row" onClick={() => isRegionId(m.region) && setEditing(m.region)}>
                    <span className="body-mark-row__dot" aria-hidden="true" />
                    <span className="font-semibold text-[var(--color-text-primary)]">{placeName(m)}</span>
                    {m.tags.length > 0 && <span className="text-[var(--color-text-secondary)]">{m.tags.join(', ').toLowerCase()}</span>}
                  </button>
                </li>
              ))}
            </ul>
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

function placeName(m: BodyMark) {
  if (!isRegionId(m.region)) return m.region;
  const def = REGIONS[m.region];
  if (def.paired && m.side === 'left') return `${def.label}, your left`;
  if (def.paired && m.side === 'right') return `${def.label}, your right`;
  return def.label;
}

interface PlacePanelProps {
  region: RegionId;
  words: PadWord[] | null;
  failed: boolean;
  existing: BodyMark | null;
  onDone: (mark: BodyMark) => void;
  onRemove: () => void;
  onCancel: () => void;
}

/** The place you tapped: both sides or one, and the graph's words for it. */
function PlacePanel({ region, words, failed, existing, onDone, onRemove, onCancel }: PlacePanelProps) {
  const def = REGIONS[region];
  const [side, setSide] = useState<Side>(existing?.side ?? 'both');
  const [picked, setPicked] = useState<string[]>(existing?.sensationIds ?? []);

  const groups = useMemo(() => {
    const here = (words ?? []).filter((w) => w.regions.length === 0 || w.regions.includes(region));
    const hard = here.filter((w) => w.zones.some((z) => UNCOMFORTABLE.includes(z)));
    const easy = here.filter((w) => !hard.includes(w));
    return [
      { title: 'Uncomfortable', words: hard },
      { title: 'Comfortable', words: easy },
    ].filter((g) => g.words.length > 0);
  }, [words, region]);

  const byId = new Map((words ?? []).map((w) => [w.id, w]));

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function done() {
    const ids = picked.filter((id) => byId.has(id) || existing?.sensationIds.includes(id));
    const tags = ids.map((id) => byId.get(id)?.label ?? existing?.tags[existing.sensationIds.indexOf(id)] ?? id);
    onDone({
      ...centre(region, side), region, side, intensity: existing?.intensity ?? { x: 0.5, y: 0.5 },
      tags, sensationIds: ids,
    });
  }

  return (
    <section className="mt-5 body-panel" aria-label={def.label}>
      <h2 className="m-0 text-[1.6rem] leading-[1.1] text-[var(--color-text-primary)]">
        My {def.label.toLowerCase()} {def.plural ? 'feel' : 'feels'}…
      </h2>

      {def.paired && (
        <div className="mt-3 seg" role="radiogroup" aria-label="Which side">
          {([['both', 'Both sides'], ['left', 'Your left'], ['right', 'Your right']] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={side === v} className={side === v ? 'is-on' : ''}
              onClick={() => setSide(v)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {words === null ? (
        <p className="mt-4 text-[15px] text-[var(--color-text-secondary)]">Loading words…</p>
      ) : groups.length === 0 ? (
        <p className="mt-4 text-[15px] text-[var(--color-text-secondary)]">
          {failed ? 'Couldn’t load the words. ' : ''}You can still mark the place.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.title} className="mt-4">
            <p className="m-0 mb-2 text-[13px] font-bold text-[var(--color-text-secondary)]">{g.title}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={g.title}>
              {g.words.map((w) => (
                <button key={w.id} type="button" className="den-chip den-chip--small" aria-pressed={picked.includes(w.id)}
                  onClick={() => toggle(w.id)}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={done}
          className="w-full min-h-[56px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
          {existing ? 'Done' : 'Add this place'}
        </button>
        <div className="flex justify-center gap-6">
          <button type="button" onClick={onCancel}
            className="min-h-11 px-2 text-[15px] text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer">
            Cancel
          </button>
          {existing && (
            <button type="button" onClick={onRemove}
              className="min-h-11 px-2 text-[15px] text-[var(--color-text-secondary)] underline underline-offset-4 bg-transparent border-none cursor-pointer">
              Remove
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
